import { stripTypeScriptTypes } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

for (const name of ['protein-geometry', 'protein-viewer']) {
  const source = new URL(`../src/${name}.ts`, import.meta.url);
  const output = new URL(`../assets/${name}.js`, import.meta.url);
  const javascript = stripTypeScriptTypes(await readFile(source, 'utf8'), { mode: 'strip' });
  await writeFile(output, `// Generated from src/${name}.ts with node scripts/build-protein.mjs.\n` + javascript);
  console.log(`Built assets/${name}.js`);
}

// The no-JavaScript fallback shares the camera, cartoon geometry, and styling.
const { makeGeometry, scene, PROTEIN_OPACITY, IRON_COLORS } = await import('../assets/protein-geometry.js');
const model = makeGeometry(JSON.parse(await readFile(new URL('../assets/protein/5ucw.json', import.meta.url), 'utf8')));
const width = 1500, height = 1000;
const frame = scene(model, width, height, 0);
const paths = parts => parts.map(part => {
  const d = part.points.map((p,i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + (part.filled ? 'Z' : '');
  return `<path d="${d}" fill="${part.filled ? part.color : 'none'}" stroke="${part.color}" stroke-width="${part.width.toFixed(2)}"/>`;
}).join('\n');
const [x,y] = frame.iron.center, r = frame.iron.radius;
const sphere = `<defs><radialGradient id="iron" cx="50%" cy="50%" r="50%" fx="35%" fy="32.5%"><stop offset="0" stop-color="${IRON_COLORS[0]}"/><stop offset=".52" stop-color="${IRON_COLORS[1]}"/><stop offset="1" stop-color="${IRON_COLORS[2]}"/></radialGradient></defs><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="url(#iron)"/>`;
await writeFile(new URL('../assets/protein/5ucw.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="none" stroke-linecap="round" stroke-linejoin="round">\n<g opacity="${PROTEIN_OPACITY}">${paths(frame.protein)}</g>\n${paths(frame.heme)}\n${sphere}\n</svg>\n`);
console.log('Built assets/protein/5ucw.svg');
