# Protein display coordinates

## Current model: 5UCW, monomer A

Source: [RCSB PDB 5UCW](https://www.rcsb.org/structure/5UCW),
[original PDB coordinates](https://files.rcsb.org/download/5UCW.pdb),
[structure DOI](https://doi.org/10.2210/pdb5UCW/pdb).

The structure is **cytochrome P411 P-4 A82L A78V F263L amination catalyst**,
determined by X-ray diffraction at 1.70 Å. The primary publication is Prier
et al., 2017, [“Enantioselective, intermolecular benzylic C–H amination catalysed
by an engineered iron-haem enzyme”](https://doi.org/10.1038/nchem.2783).

Only **author chain A** and its **HEM A501** cofactor are exported. Although
the deposited asymmetric unit has chains A and B, this display shows a single
monomer. Its 453 modeled residues are split into A1–381 (381 points) and
A384–455 (72 points), preserving the unresolved A382–383 gap. Missing terminal
residues A0 and A456–471 are not invented. The original sequence has 472
residues per chain.

`5ucw.json` contains 47,510 bytes (about 16 KB gzip):

- `chains` entries both have `id: "A"` and a distinct `segment` value. Render
  them independently without bridging the missing loop.
- Each residue is `{ n, p, ss, c, o }`. `p` is its C-alpha coordinate, `c` its
  backbone carbonyl C, and `o` its carbonyl O. All 453 residues have all three
  coordinates. `o - c` gives the deposited carbonyl direction for orienting a
  flat ribbon. `ss` comes from deposited HELIX/SHEET records: 282 H, 51 E,
  and 120 C residues.
- The single ligand is `{ name: "HEM", chain: "A", n: 501, atoms, bonds }`.
  It includes all 43 modeled heavy atoms, including iron, and 50 internal
  edges from the deposited CONECT records. No connectivity is inferred by
  distance and bond orders are not encoded. The protein–heme coordination
  link to Ser400 is omitted because the protein side chains are omitted.
- Coordinates are in ångströms, translated by the selected A-chain C-alpha
  centroid and rounded to 0.001 Å. The original centroid is saved as `origin`;
  no rotation or deformation is applied. `radius` is 36.745 Å before adding
  the display ribbon's width.
- Alternate conformer A is selected consistently per residue, together with
  shared atoms; if A is absent, the conformer with highest total occupancy is
  selected. Seven A-chain residues have alternate C-alpha positions; only
  one conformer is exported. Waters, chain B, hydrogens, and symmetry mates
  are excluded.

The renderer derives a right-handed camera from HEM A501: the cross product
of the opposing pyrrole nitrogen vectors NC–NA and ND–NB gives the viewing
normal; the projected midpoint of CGA and CGD gives the upward direction.
The iron atom is the pivot, so the heme initially faces the page and remains
centered at the same screen position as scrolling turns the protein around
the camera's vertical axis. The deposited geometry is rotated rigidly, never
deformed. The small real displacement of iron from the heme plane is preserved.

Cartoon ribbons are broad, zero-thickness strips oriented along the deposited
carbonyl direction perpendicular to the backbone tangent. Faint translucent
fills and subtle lighting reveal their shape without internal mesh outlines.
Loops are fine centerlines. The heme's thicker bond sticks are drawn on top of
the ribbons so the cofactor remains visible, with a small shaded sphere at the
iron atom. Ribbon widths, transparency, lighting, and sphere size are display
conventions, not an atomic surface or molecular-motion simulation.

`5ucw.svg` is a transparent 1500 × 1000 static fallback, generated from the same
TypeScript cartoon geometry, styling, and camera as the canvas. Both preserve
residue gaps and use an orthographic projection. The page scales the artwork to
94% of the viewport height and crops its sides in the rightmost 38.2% of the
viewport without stretching it.

`source/5UCW.pdb` is the complete, unmodified archival download (about 1.3 MB).
The browser must **not fetch it**; it uses only the prepared JSON/SVG. Rebuild
from the checked-in source with Python's standard library:

```sh
python3 scripts/prepare-protein.py
node scripts/build-protein.mjs
# Optional: refresh 5UCW from RCSB first.
python3 scripts/prepare-protein.py --download
node scripts/build-protein.mjs
```

## JSON schema

```ts
type Point = [number, number, number];
type Model = {
  id: '5UCW';
  source: string;
  name: string;
  units: 'angstrom';
  origin: Point; // subtract this from the deposited coordinates
  radius: number; // maximum distance from origin after centering
  sourceSha256: string;
  chains: {
    id: 'A';
    segment: number;
    residues: {
      n: number;
      i?: string; // insertion code, when present
      p: Point; // C-alpha
      c?: Point; // carbonyl C; present for all 5UCW residues
      o?: Point; // carbonyl O; present for all 5UCW residues
      ss: 'H' | 'E' | 'C';
    }[];
  }[];
  ligands: {
    name: 'HEM';
    chain: 'A';
    n: number;
    atoms: { p: Point; e: string; name: string }[];
    bonds: [number, number][]; // zero-based atom indices
  }[];
};
```
