#!/usr/bin/env python3
"""Extract a small, faithful monomer display model (Python standard library).

Run from any directory: python3 scripts/prepare-protein.py
To refresh the original coordinates: python3 scripts/prepare-protein.py --download
To rebuild the earlier 6CUN option: python3 scripts/prepare-protein.py --pdb 6CUN
The browser loads the generated JSON only, never the full archival PDB file.
"""

import argparse
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
MODELS = {
    "5UCW": {
        "name": "Cytochrome P411 P-4 A82L A78V F263L amination catalyst, monomer A",
        "ligands": ("HEM",), "residues": 453,
        "segments": [(1, 381), (384, 455)], "ligandCounts": [("HEM", 43)],
    },
    "6CUN": {
        "name": "Engineered Rhodothermus marinus cytochrome c (Rma TDE)",
        "ligands": ("HEC", "CA1"), "residues": 112,
        "segments": [(9, 99), (103, 123)], "ligandCounts": [("HEC", 43), ("CA1", 7)],
    },
}


def parse_atom(line):
    return {
        "serial": int(line[6:11]),
        "name": line[12:16].strip(),
        "alt": line[16].strip(),
        "residue": line[17:20].strip(),
        "chain": line[21].strip(),
        "n": int(line[22:26]),
        "i": line[26].strip(),
        "p": [float(line[start:start + 8]) for start in (30, 38, 46)],
        "occupancy": float(line[54:60]),
        "e": line[76:78].strip().upper(),
    }


def select_conformer(atoms):
    """Keep shared atoms and one consistent altloc per residue.

    Prefer A if present, else the altloc with the largest total occupancy.
    Resolve duplicate atom names by occupancy. Apply the choice consistently to
    the C-alpha and carbonyl atoms needed by the flat ribbon renderer.
    """
    totals = defaultdict(float)
    for atom in atoms:
        if atom["alt"]:
            totals[atom["alt"]] += atom["occupancy"]
    alt = "A" if "A" in totals else max(totals, key=totals.get, default="")
    by_name = {}
    for atom in atoms:
        if atom["alt"] not in ("", alt):
            continue
        previous = by_name.get(atom["name"])
        if previous is None or atom["occupancy"] > previous["occupancy"]:
            by_name[atom["name"]] = atom
    return sorted(by_name.values(), key=lambda atom: atom["serial"])


def write_svg(model, destination):
    """Orthographic flat ribbon fallback, oriented by deposited carbonyl atoms."""
    def project(point):
        x, y, z = point
        # Fixed, rigid rotations; the scientific coordinates are not deformed.
        for axis, angle in (("y", 0.62), ("x", -0.38), ("z", 0.12)):
            c, s = math.cos(angle), math.sin(angle)
            if axis == "y":
                x, z = x * c + z * s, -x * s + z * c
            elif axis == "x":
                y, z = y * c - z * s, y * s + z * c
            else:
                x, y = x * c - y * s, x * s + y * c
        return x, -y, z

    def subtract(a, b):
        return [x - y for x, y in zip(a, b)]

    def dot(a, b):
        return sum(x * y for x, y in zip(a, b))

    def unit(a):
        magnitude = math.sqrt(dot(a, a))
        return [v / magnitude for v in a] if magnitude > 1e-8 else [1, 0, 0]

    ribbons = []
    for chain in model["chains"]:
        residues = chain["residues"]
        edges = []
        previous_side = None
        for index, residue in enumerate(residues):
            tangent = unit(subtract(residues[min(index + 1, len(residues) - 1)]["p"], residues[max(0, index - 1)]["p"]))
            carbonyl = subtract(residue.get("o", residue["p"]), residue.get("c", residue["p"]))
            # Project C→O into the plane perpendicular to the backbone tangent.
            side = unit([carbonyl[i] - dot(carbonyl, tangent) * tangent[i] for i in range(3)])
            if previous_side is not None and dot(side, previous_side) < 0:
                side = [-v for v in side]
            previous_side = side
            half_width = 1.75 if residue["ss"] == "H" else 2.1 if residue["ss"] == "E" else .35
            edges.append([
                [residue["p"][i] - side[i] * half_width for i in range(3)],
                [residue["p"][i] + side[i] * half_width for i in range(3)],
            ])
        for (left1, right1), (left2, right2) in zip(edges, edges[1:]):
            ribbons.append([project(point) for point in (left1, right1, right2, left2)])
    ligands = [[project(atom["p"]) for atom in ligand["atoms"]] for ligand in model["ligands"]]
    points = [point for trace in ribbons + ligands for point in trace]
    lo = [min(point[axis] for point in points) for axis in range(3)]
    hi = [max(point[axis] for point in points) for axis in range(3)]
    scale = min(528 / (hi[0] - lo[0]), 388 / (hi[1] - lo[1]))

    def xy(point):
        return [(point[0] - (lo[0] + hi[0]) / 2) * scale + 280,
                (point[1] - (lo[1] + hi[1]) / 2) * scale + 210]

    elements = []

    def line(a, b, color, width, opacity):
        x1, y1 = xy(a)
        x2, y2 = xy(b)
        markup = f'<path d="M{x1:.2f},{y1:.2f}L{x2:.2f},{y2:.2f}" stroke="{color}" stroke-width="{width}" opacity="{opacity:.2f}"/>'
        elements.append(((a[2] + b[2]) / 2, markup))

    for corners in ribbons:
        depth = sum(point[2] for point in corners) / len(corners)
        lightness = round(58 + (depth - lo[2]) / (hi[2] - lo[2]) * 20)
        polygon = " ".join(f"{xy(point)[0]:.2f},{xy(point)[1]:.2f}" for point in corners)
        elements.append((depth, f'<polygon points="{polygon}" fill="hsl(191,17%,{lightness}%)"/>'))
    for ligand, projected in zip(model["ligands"], ligands):
        for a, b in ligand["bonds"]:
            line(projected[a], projected[b], "#9c755c", 3.6, 1)
        for atom, point in zip(ligand["atoms"], projected):
            if atom["e"] in ("FE", "O", "N"):
                x, y = xy(point)
                radius = 4.2 if atom["e"] == "FE" else 1.7
                color = {"FE": "#ad6535", "O": "#bd8770", "N": "#876e77"}[atom["e"]]
                elements.append((point[2], f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{radius}" fill="{color}"/>'))
    body = "".join(element for _, element in sorted(elements, key=lambda item: item[0]))
    destination.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="560" height="420" viewBox="0 0 560 420" fill="none" stroke-linecap="round" stroke-linejoin="round">'
                           f'<title>{model["id"]}, monomer A, flat backbone ribbon and heme</title>' + body + '</svg>\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--pdb", choices=MODELS, default="5UCW")
    args = parser.parse_args()
    config = MODELS[args.pdb]
    source = ROOT / f"assets/protein/source/{args.pdb}.pdb"
    output = ROOT / f"assets/protein/{args.pdb.lower()}.json"
    fallback = ROOT / f"assets/protein/{args.pdb.lower()}.svg"
    url = f"https://files.rcsb.org/download/{args.pdb}.pdb"
    if args.download or not source.exists():
        source.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(url, timeout=30) as response:
            source.write_bytes(response.read())
    raw = source.read_bytes()
    lines = raw.decode("ascii").splitlines()
    groups = defaultdict(list)
    ranges = []
    connections = set()
    for line in lines:
        record = line[:6].strip()
        if record in ("ATOM", "HETATM"):
            atom = parse_atom(line)
            if atom["chain"] == "A" and (
                record == "ATOM" or atom["residue"] in config["ligands"]
            ):
                groups[(record, atom["chain"], atom["n"], atom["i"], atom["residue"])].append(atom)
        elif record == "HELIX":
            assert line[19] == line[31], "Multi-chain HELIX record"
            ranges.append((line[19], int(line[21:25]), int(line[33:37]), "H"))
        elif record == "SHEET":
            assert line[21] == line[32], "Multi-chain SHEET record"
            ranges.append((line[21], int(line[22:26]), int(line[33:37]), "E"))
        elif record == "CONECT":
            serials = [int(line[i:i + 5]) for i in range(6, len(line), 5) if line[i:i + 5].strip()]
            for target in serials[1:]:
                connections.add(tuple(sorted((serials[0], target))))

    selected = {key: select_conformer(atoms) for key, atoms in groups.items()}
    backbone = []
    backbone_atoms = {}
    for (record, _, _, _, _), atoms in selected.items():
        if record == "ATOM":
            backbone.extend(atom for atom in atoms if atom["name"] == "CA")
            for atom in atoms:
                backbone_atoms[(atom["chain"], atom["n"], atom["i"], atom["name"])] = atom
    backbone.sort(key=lambda atom: (atom["chain"], atom["n"], atom["i"]))
    assert len(backbone) == config["residues"], "Unexpected modeled residue count; review updated source"
    center = [sum(atom["p"][axis] for atom in backbone) / len(backbone) for axis in range(3)]

    def centered(atom):
        return [round(value - center[axis], 3) for axis, value in enumerate(atom["p"])]

    chains = []
    previous = None
    for atom in backbone:
        # Split at sequence-number gaps and any anomalously long C-alpha step.
        # Preserve unmodeled internal loops instead of inventing connecting bonds.
        split = previous is None or atom["chain"] != previous["chain"]
        if previous and not split:
            consecutive = atom["n"] == previous["n"] + 1 or (
                atom["n"] == previous["n"] and atom["i"] > previous["i"]
            )
            split = not consecutive or math.dist(atom["p"], previous["p"]) > 4.5
        if split:
            chains.append({"id": atom["chain"], "segment": len(chains), "residues": []})
        ss = next((ss for chain, start, end, ss in ranges
                   if atom["chain"] == chain and start <= atom["n"] <= end), "C")
        residue = {"n": atom["n"], "p": centered(atom), "ss": ss}
        for field, atom_name in (("c", "C"), ("o", "O")):
            carbonyl = backbone_atoms.get((atom["chain"], atom["n"], atom["i"], atom_name))
            if carbonyl:
                residue[field] = centered(carbonyl)
        if atom["i"]:
            residue["i"] = atom["i"]
        chains[-1]["residues"].append(residue)
        previous = atom

    ligands = []
    for (record, chain, number, insertion, name), atoms in selected.items():
        if record != "HETATM":
            continue
        serial_indices = {atom["serial"]: index for index, atom in enumerate(atoms)}
        bonds = sorted([serial_indices[a], serial_indices[b]] for a, b in connections
                       if a in serial_indices and b in serial_indices)
        ligands.append({
            "name": name,
            "chain": chain,
            "n": number,
            "atoms": [{"p": centered(atom), "e": atom["e"], "name": atom["name"]} for atom in atoms],
            "bonds": bonds,
        })
    assert [(ligand["name"], len(ligand["atoms"])) for ligand in ligands] == config["ligandCounts"]
    assert [(segment["residues"][0]["n"], segment["residues"][-1]["n"]) for segment in chains] == config["segments"]
    points = [residue["p"] for segment in chains for residue in segment["residues"]]
    points.extend(atom["p"] for ligand in ligands for atom in ligand["atoms"])
    model = {
        "id": args.pdb,
        "source": f"https://www.rcsb.org/structure/{args.pdb}",
        "name": config["name"],
        "units": "angstrom",
        "origin": [round(value, 6) for value in center],
        "radius": round(max(math.sqrt(sum(value * value for value in point)) for point in points), 3),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "chains": chains,
        "ligands": ligands,
    }
    output.write_text(json.dumps(model, separators=(",", ":")) + "\n")
    if args.pdb == "6CUN":
        write_svg(model, fallback)
    else:
        print("Run node scripts/build-protein.mjs to rebuild the shared-camera SVG fallback.")
    print(f"Wrote {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)")
    print(f"{len(backbone)} C-alpha atoms, {len(chains)} trace segments")
    for ligand in ligands:
        print(f"{ligand['name']}: {len(ligand['atoms'])} atoms, {len(ligand['bonds'])} CONECT bonds")


if __name__ == "__main__":
    main()
