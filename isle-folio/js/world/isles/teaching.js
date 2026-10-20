/* Lyceum (teaching): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';

const V2 = THREE.Vector2, PI = Math.PI;
const STONE = 0xc9bfa6, MARBLE = 0xe8e1cf, WOOD = 0x5a3d28, GOLD = 0xf0b54a;
const side2 = c => mat(c, {side:THREE.DoubleSide});

/* a curved slab: `prof` (r, y) points swept round the y axis from phi0 over len (phi 0 = +z), with both cut ends capped */
function arc(prof, phi0, len, segs, m){
  const g = new THREE.Group(), pts = prof.map(p => new V2(p[0], p[1]));
  g.add(mesh(new THREE.LatheGeometry(pts, segs, phi0, len), m));
  const capGeo = new THREE.ShapeGeometry(new THREE.Shape(pts));
  [phi0, phi0 + len].forEach(phi => { const c = mesh(capGeo, m); c.rotation.y = phi - PI/2; g.add(c); });
  return g;
}

/* chalk strokes on one face of the board (local board coords, z = which face) */
function chalk(g, z){
  const m = glow(0xf2efe6, 0.35);
  [[-0.22, 0.2, 0.5], [-0.27, 0.08, 0.4], [-0.2, -0.04, 0.54], [-0.3, -0.16, 0.34]].forEach(([x, y, w]) => g.add(mesh(box(w, 0.025, 0.01), m, x, y, z)));
  [[0.3, -0.12, 0.3, 0], [0.22, -0.02, 0.24, 1.05], [0.38, -0.02, 0.24, -1.05]].forEach(([x, y, w, r]) => { const s = mesh(box(w, 0.025, 0.01), m, x, y, z); s.rotation.z = r; g.add(s); });
}

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on). */
export function building(animated){
  const g = new THREE.Group(), marble = mat(MARBLE);
  const SPAN = 3.84, P0 = PI - SPAN/2;           // seating wraps the back; the front (+z) stays open

  // cavea: four stepped seating tiers rising to a walkway, all one swept profile
  g.add(arc([[1.42,0],[1.42,0.28],[1.8,0.28],[1.8,0.56],[2.18,0.56],[2.18,0.84],[2.56,0.84],[2.56,1.12],[3.05,1.12],[3.05,0]], P0, SPAN, 22, side2(STONE)));

  // colonnade crowning the top walkway, carrying a curved architrave
  const CN = 11, cGap = (SPAN - 0.12)/(CN - 1), shaft = cyl(0.09, 0.11, 1.5, 7), cap = box(0.3, 0.12, 0.3), base = box(0.28, 0.1, 0.28);
  for(let k = 0; k < CN; k++){
    const a = P0 + 0.06 + k*cGap, x = Math.sin(a)*2.8, z = Math.cos(a)*2.8;
    g.add(mesh(base, marble, x, 1.17, z), mesh(shaft, marble, x, 1.97, z), mesh(cap, marble, x, 2.78, z));
  }
  g.add(arc([[2.62,2.84],[2.98,2.84],[2.98,3.08],[2.62,3.08]], P0, SPAN, 22, side2(0xd8cfb8)));

  // banners hang between the back columns and sway a little
  const banners = [];
  [-2.5, -0.5, 0.5, 2.5].forEach((k, i) => {
    const a = PI + k*cGap, p = new THREE.Group();
    p.position.set(Math.sin(a)*2.8, 2.84, Math.cos(a)*2.8); p.rotation.y = a;
    p.add(mesh(box(0.5, 0.95, 0.03), mat(i % 3 ? 0x2f4f8c : 0x8c2f2a), 0, -0.5, 0));
    p.add(mesh(box(0.5, 0.06, 0.05), mat(GOLD), 0, -0.98, 0));
    const em = mesh(new THREE.OctahedronGeometry(0.11, 0), glow(GOLD, 1.2), 0, -0.45, 0); em.scale.z = 0.4; p.add(em);
    g.add(p); banners.push(p);
  });

  // orchestra: a pale stone disc with an inlaid ring, paved walk out to the front gate
  g.add(mesh(cyl(1.32, 1.4, 0.12, 24), mat(0xd6cdb6), 0, 0.06, 0));
  const inlay = mesh(new THREE.RingGeometry(0.92, 1.04, 24), mat(0xa89a7c), 0, 0.125, 0); inlay.rotation.x = -PI/2; g.add(inlay);
  g.add(mesh(box(1.7, 0.08, 1.1), mat(0xb3a88f), 0, 0.04, 1.85));

  // lectern facing the seats, an open book on its sloped top
  const lec = new THREE.Group(); lec.position.set(0.42, 0.12, 0.5); lec.rotation.y = PI + 0.25;
  lec.add(mesh(box(0.42, 0.06, 0.32), mat(WOOD), 0, 0.03, 0), mesh(box(0.14, 0.85, 0.14), mat(WOOD), 0, 0.48, 0));
  const top = mesh(box(0.52, 0.05, 0.4), mat(0x6b4a30), 0, 0.92, 0); top.rotation.x = 0.35; lec.add(top);
  [-0.11, 0.11].forEach((x, i) => { const pg = mesh(box(0.2, 0.02, 0.28), mat(0xf4ecd8), x, 0.96, 0.01); pg.rotation.set(0.35, 0, i ? -0.12 : 0.12); lec.add(pg); });
  g.add(lec);

  // chalkboard on an easel, chalked on both faces
  const ez = new THREE.Group(); ez.position.set(-0.7, 0.12, 0.15); ez.rotation.y = 0.45;
  [-0.45, 0.45].forEach(x => { const l = mesh(box(0.06, 1.7, 0.06), mat(WOOD), x, 0.82, 0); l.rotation.x = -0.12; ez.add(l); });
  const back = mesh(box(0.06, 1.5, 0.06), mat(WOOD), 0, 0.72, -0.32); back.rotation.x = 0.3; ez.add(back);
  const board = new THREE.Group(); board.position.set(0, 1.12, 0.06); board.rotation.x = -0.12;
  board.add(mesh(box(1.22, 0.86, 0.04), mat(WOOD)), mesh(box(1.1, 0.74, 0.07), glow(0x2f5a44, 0.6)));
  chalk(board, 0.04); chalk(board, -0.04);
  board.add(mesh(box(1.1, 0.04, 0.12), mat(WOOD), 0, -0.45, 0.04));
  ez.add(board); g.add(ez);

  // front gate: two columns, a lintel and a pediment with a gilded lamp-of-learning disc
  [-1.15, 1.15].forEach(x => g.add(mesh(box(0.46, 0.14, 0.46), marble, x, 0.07, 2.35), mesh(cyl(0.15, 0.18, 2.36, 8), marble, x, 1.32, 2.35), mesh(box(0.44, 0.12, 0.44), marble, x, 2.56, 2.35)));
  g.add(mesh(box(2.9, 0.26, 0.42), mat(0xd8cfb8), 0, 2.75, 2.35));
  g.add(mesh(box(2.7, 0.08, 0.44), mat(0xa8553a), 0, 2.69, 2.35));
  const pedGeo = cyl(1, 1, 0.36, 3); pedGeo.rotateX(-PI/2); pedGeo.scale(1.73, 0.4, 1); pedGeo.translate(0, 0.2, 0);
  g.add(mesh(pedGeo, marble, 0, 2.88, 2.35));
  const disc = mesh(cyl(0.13, 0.13, 0.04, 10), glow(GOLD, 1.6), 0, 3.07, 2.54); disc.rotation.x = PI/2; g.add(disc);

  // braziers flanking the gate, flames flicker
  const flames = [];
  [-1.85, 1.85].forEach((x, i) => {
    g.add(mesh(cyl(0.22, 0.27, 0.1, 6), mat(0x4e525b), x, 0.05, 2.0), mesh(cyl(0.05, 0.08, 0.85, 6), mat(0x4e525b), x, 0.52, 2.0));
    g.add(mesh(cyl(0.34, 0.16, 0.24, 8), mat(0x8a6a3a), x, 1.05, 2.0));
    const coal = mesh(cyl(0.29, 0.29, 0.04, 8), glow(0xd2541f, 1.4), x, 1.16, 2.0); coal.castShadow = false; g.add(coal);
    const f = new THREE.Group(); f.position.set(x, 1.18, 2.0);
    const o = mesh(new THREE.ConeGeometry(0.21, 0.55, 5), glow(0xff8a3a, 2.2), 0, 0.27, 0);
    const n = mesh(new THREE.ConeGeometry(0.11, 0.36, 5), glow(0xffd27a, 2.6), 0, 0.2, 0);
    o.castShadow = n.castShadow = false; f.add(o, n); g.add(f); flames.push([f, i*2.3]);
  });

  animated.push({fn:t => {
    for(const [f, p] of flames){ f.scale.set(1, 1 + Math.sin(t*9 + p)*0.14 + Math.sin(t*13.7 + p)*0.07, 1); f.rotation.y = t*1.4 + p; }
    banners.forEach((b, i) => { b.rotation.x = Math.sin(t*1.3 + i*1.7)*0.06; });
  }});
  return g;
}

/* ---------- island scenery: olive trees, busts, a statue, scroll racks, stone benches ---------- */
function olive(rand){
  const g = new THREE.Group(), lean = (rand() - 0.5)*0.3;
  const tr = mesh(cyl(0.08, 0.15, 0.95, 5), mat(0x6b5440), 0, 0.45, 0); tr.rotation.z = lean; g.add(tr);
  const leaf = [mat(0x7f8f5a), mat(0x6c7e4c), mat(0x93a06a)];
  for(let k = 0; k < 3; k++){
    const a = k*2.1 + rand(), b = mesh(new THREE.DodecahedronGeometry(0.42 + rand()*0.14, 0), leaf[k], Math.cos(a)*0.32 - lean*0.9, 1.15 + rand()*0.3, Math.sin(a)*0.32);
    b.scale.y = 0.62; b.rotation.y = rand()*6; g.add(b);
  }
  return g;
}
function bust(){
  const g = new THREE.Group(), m = mat(MARBLE);
  g.add(mesh(box(0.42, 0.9, 0.42), mat(0xd6cdb6), 0, 0.45, 0), mesh(box(0.5, 0.08, 0.5), m, 0, 0.94, 0));
  const sh = mesh(cyl(0.12, 0.22, 0.28, 6), m, 0, 1.12, 0); sh.scale.z = 0.6; g.add(sh);
  g.add(mesh(new THREE.IcosahedronGeometry(0.15, 0), m, 0, 1.38, 0));
  return g;
}
function statue(){
  const g = new THREE.Group(), m = mat(MARBLE);
  g.add(mesh(box(0.7, 0.4, 0.7), mat(0xbdb39b), 0, 0.2, 0));
  g.add(mesh(new THREE.ConeGeometry(0.32, 1.25, 6), m, 0, 1.02, 0));
  g.add(mesh(new THREE.IcosahedronGeometry(0.15, 0), m, 0, 1.72, 0));
  const arm = mesh(box(0.08, 0.42, 0.08), m, 0.2, 1.3, 0.12); arm.rotation.x = -0.9; g.add(arm);
  const scr = mesh(cyl(0.05, 0.05, 0.3, 6), mat(0xf4ecd8), 0.2, 1.42, 0.32); scr.rotation.z = PI/2; g.add(scr);
  return g;
}
function rack(){
  const g = new THREE.Group(), w = mat(WOOD), paper = mat(0xf4ecd8), seal = mat(0x8c2f2a);
  [-0.5, 0.5].forEach(x => g.add(mesh(box(0.08, 1.0, 0.36), w, x, 0.5, 0)));
  [0.08, 0.48, 0.92].forEach(y => g.add(mesh(box(1.08, 0.05, 0.36), w, 0, y, 0)));
  const sc = cyl(0.07, 0.07, 0.34, 6);
  for(let k = 0; k < 10; k++){ const s = mesh(sc, k % 4 === 1 ? seal : paper, -0.36 + (k % 5)*0.18, k < 5 ? 0.17 : 0.57, 0); s.rotation.x = PI/2; g.add(s); }
  return g;
}
function bench(){
  const g = new THREE.Group(), m = mat(0xbdb39b);
  g.add(mesh(box(1.2, 0.1, 0.4), m, 0, 0.42, 0));
  [-0.45, 0.45].forEach(x => g.add(mesh(box(0.16, 0.38, 0.32), m, x, 0.19, 0)));
  return g;
}

export function decorate(isl, grp, animated){
  let s = 0x6c79 ^ 2024;   // own LCG: never touch the shared rnd() sequence
  const rand = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0)/4294967296;
  const items = [['statue', 0.45], ['bust', 0.35], ['rack', 0.6], ['olive', 0.4], ['bust', 0.35], ['olive', 0.4], ['bench', 0.62], ['rack', 0.6], ['olive', 0.4], ['olive', 0.4], ['bench', 0.62], ['olive', 0.4]];
  const placed = [], minR = isl.obs + 2.2;
  for(const [kind, r] of items){
    for(let tries = 0; tries < 80; tries++){
      const a = rand()*PI*2, e = isl.edgeR(a)*0.8;
      if(e < minR + r) continue;
      const d = minR + r + (e - minR - r)*Math.sqrt(rand()), x = Math.sin(a)*d, z = Math.cos(a)*d;
      if(isl.pathDist(x, z) < 1.2 + r*0.6) continue;
      if(isl.paths.some(p => Math.hypot(x - p[2], z - p[3]) < 2.6 + r)) continue;                  // bridge-end lanterns
      if(obstacles.some(o => Math.hypot(isl.x + x - o.x, isl.z + z - o.z) < o.r + r + 0.15)) continue;
      if(placed.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + r + 0.3)) continue;
      const o = kind === 'olive' ? olive(rand) : kind === 'bust' ? bust() : kind === 'statue' ? statue() : kind === 'rack' ? rack() : bench();
      o.position.set(x, isl.topY(x, z) - 0.03, z);
      o.rotation.y = kind === 'olive' ? rand()*6 : Math.atan2(-x, -z);   // furniture faces the amphitheatre
      grp.add(o); placed.push([x, z, r]);
      obstacles.push({x:isl.x + x, z:isl.z + z, r});
      break;
    }
  }
}
