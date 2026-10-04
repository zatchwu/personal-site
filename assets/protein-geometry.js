// Generated from src/protein-geometry.ts with node scripts/build-protein.mjs.
// Coordinate-derived flat cartoon ribbons shared by canvas and static SVG.
                                            
                                                                               
                         
                                                
                                                                                                        
  
                                                   
                        
                                               
                                
               
               
  
                                                                                      
export const PROTEIN_OPACITY = .42;
export const IRON_COLORS = ['#f4e5c9', '#b99c78', '#786148'];
const add = (a      , b      )       => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const sub = (a      , b      )       => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const mul = (a      , n        )       => [a[0]*n, a[1]*n, a[2]*n];
const dot = (a      , b      )         => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a      , b      )       => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = (a      )       => mul(a, 1/(Math.hypot(...a)||1));
const mix = (a      , b      , t        )       => add(mul(a, 1-t), mul(b, t));
function spline(a      , b      , c      , d      , t        )       {
  return [0,1,2].map(i => .5*((2*b[i])+(-a[i]+c[i])*t+(2*a[i]-5*b[i]+4*c[i]-d[i])*t*t+(-a[i]+3*b[i]-3*c[i]+d[i])*t*t*t))        ;
}

export function hemeCamera(data           )                                             {
  const heme = data.ligands.find(ligand => ligand.name === 'HEM');
  if (!heme) throw new Error('Heme coordinates missing');
  const atom = (name        )       => {
    const match = heme.atoms.find(atom => atom.name === name);
    if (!match) throw new Error(`Heme atom ${name} missing`);
    return match.p;
  };
  const pivot = atom('FE');
  // Opposing pyrrole nitrogens define the heme plane; propionates point up.
  // This right-handed, rigid rotation preserves the deposited coordinates.
  const forward = unit(cross(sub(atom('NC'), atom('NA')), sub(atom('ND'), atom('NB'))));
  const upHint = sub(mul(add(atom('CGA'), atom('CGD')), .5), pivot);
  const up = unit(sub(upHint, mul(forward, dot(upHint, forward))));
  const right = unit(cross(up, forward));
  return { pivot, toView: p => {
    const relative = sub(p, pivot);
    return [dot(relative, right), dot(relative, up), dot(relative, forward)];
  }};
}

export function makeGeometry(data           )           {
  const { toView } = hemeCamera(data);
  const outlines            = [], bonds                    = [];
  for (const chain of data.chains) {
    const residues = chain.residues, directions         = [];
    for (let i=0; i<residues.length; i++) {
      const tangent = unit(sub(residues[Math.min(residues.length-1,i+1)].p, residues[Math.max(0,i-1)].p));
      const residue = residues[i];
      let direction = residue.c && residue.o ? sub(residue.o,residue.c) : cross(tangent,[0,0,1]);
      direction = sub(direction, mul(tangent, dot(direction,tangent)));
      if (Math.hypot(...direction)<.05) direction = cross(tangent,[0,1,0]);
      direction = unit(direction);
      if (i && dot(direction,directions[i-1])<0) direction = mul(direction,-1);
      directions.push(direction);
    }
    const smooth = directions.map((direction,i) => unit(add(add(directions[Math.max(0,i-1)],mul(direction,2)),directions[Math.min(directions.length-1,i+1)])));
    let kind = '', left         = [], right         = [];
    function flush()       {
      if (left.length > 1) outlines.push({ points: [...left,...right.reverse()].map(toView), closed: kind !== 'C' });
      left = []; right = []; kind = '';
    }
    for (let i=0; i<residues.length-1; i++) {
      const b = residues[i].p, c = residues[i+1].p;
      if (residues[i+1].n !== residues[i].n+1 || Math.hypot(...sub(c,b))>4.5) { flush(); continue; }
      const ss = residues[i].ss;
      if (kind !== ss) { flush(); kind = ss; }
      const a = residues[Math.max(0,i-1)].p, d = residues[Math.min(residues.length-1,i+2)].p;
      const halfWidth = ss === 'E' ? 2.15 : 1.65;
      // Build continuous edges, then tessellate each flat strip for gentle lighting.
      // Width follows deposited peptide geometry; there is no ribbon extrusion.
      for (let step=left.length ? 1 : 0; step<=5; step++) {
        const t = step/5, p = spline(a,b,c,d,t);
        if (ss === 'C') { left.push(p); continue; }
        let width = halfWidth;
        if (ss === 'E' && residues[i+1].ss !== 'E') width *= 1.35*(1-t)+.05;
        const side = mul(unit(mix(smooth[i],smooth[i+1],t)),width);
        left.push(add(p,side)); right.push(sub(p,side));
      }
    }
    flush();
  }
  for (const ligand of data.ligands) {
    if (ligand.name !== 'HEM') continue;
    for (const [a,b] of ligand.bonds) bonds.push({ a: toView(ligand.atoms[a].p), b: toView(ligand.atoms[b].p) });
  }
  const points = [...outlines.flatMap(outline => outline.points), ...bonds.flatMap(bond => [bond.a,bond.b])];
  const cartoon                      = [];
  for (const outline of outlines) {
    const points = outline.points, count = outline.closed ? points.length/2 : points.length;
    for (let i=0; i<count-1; i++) {
      if (outline.closed) {
        const face = [points[i],points[i+1],points[points.length-2-i],points[points.length-1-i]];
        cartoon.push({ points: face, normal: unit(cross(sub(face[1],face[0]),sub(face[3],face[0]))) });
      } else cartoon.push({ points: [points[i],points[i+1]] });
    }
  }
  return { cartoon, bonds, minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])) };
}

export function projection(model          , width        , height        , progress        )                                              {
  // Height sets the scale. The narrow CSS frame crops the sides, never stretches.
  // A vertical-axis turn keeps the vertical extent and iron pivot fixed at all scroll positions.
  const scale = height*.94/(model.maxY-model.minY);
  const centerX = width*.55, centerY = height*.03+model.maxY*scale;
  const angle = progress*Math.PI*1.8, cos = Math.cos(angle), sin = Math.sin(angle);
  return { scale, point: p => [centerX+(p[0]*cos+p[2]*sin)*scale, centerY-p[1]*scale, -p[0]*sin+p[2]*cos] };
}

export function scene(model          , width        , height        , progress        )                                                                              {
  const { point, scale } = projection(model,width,height,progress);
  const angle = progress*Math.PI*1.8, cos = Math.cos(angle), sin = Math.sin(angle);
  const protein = model.cartoon.map(part => {
    const points = part.points.map(point), normal = part.normal;
    let light = .6;
    if (normal) {
      const facing       = [normal[0]*cos+normal[2]*sin,normal[1],-normal[0]*sin+normal[2]*cos];
      light = Math.abs(dot(facing,[.3,.45,.84]));
    }
    return { points, filled: !!normal, width: normal ? .45 : scale*.28, color: `hsl(205 19% ${(45+light*24).toFixed(1)}%)`, depth: points.reduce((sum,p) => sum+p[2],0)/points.length };
  }).sort((a,b) => a.depth-b.depth);
  // Composite the translucent protein separately: it can never occlude the heme.
  const heme = model.bonds.map(bond => ({ points: [point(bond.a),point(bond.b)], filled: false, width: scale*.65, color: '#85664c' }));
  return { protein, heme, iron: { center: point([0,0,0]), radius: scale*.85 } };
}
