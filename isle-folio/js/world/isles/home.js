/* Hearthstone (home): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';
import { ISLANDS } from '../islands.js';
import { FD, canvasTex } from '../../panels.js';

// local seeded random (never touch engine rnd(): it's a shared sequence)
let seed = 1337;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const STONE = 0x686b74, DARK = 0x5f626a, DEEP = 0x2a2420, GOLD = 0xf0b54a, EMBER = 0xff8a3a;

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on). */
export function building(animated){
  const g = new THREE.Group();
  const flat = o => { o.castShadow = false; return o; };
  // stepped octagonal dais
  g.add(mesh(cyl(1.92, 2.0, 0.26, 8), mat(DARK), 0, 0.13, 0));
  g.add(mesh(cyl(1.5, 1.6, 0.26, 8), mat(0x777a82), 0, 0.39, 0));
  const ringMat = glow(GOLD, 2.4).clone();
  const ring = flat(mesh(new THREE.TorusGeometry(1.76, 0.06, 5, 40), ringMat, 0, 0.27, 0));
  ring.rotation.x = Math.PI/2; g.add(ring);

  // the hearthstone: a tapered four-sided monolith, faces aligned to the axes
  const mono = mesh(cyl(0.62, 0.9, 3.4, 4), mat(STONE), 0, 2.22, 0); mono.rotation.y = Math.PI/4; g.add(mono);
  const half = y => (0.9 + (0.62 - 0.9)*(y - 0.52)/3.4)*Math.SQRT1_2;   // face offset at height y
  const cap = mesh(cyl(0.82, 0.6, 0.32, 4), mat(DARK), 0, 4.08, 0); cap.rotation.y = Math.PI/4; g.add(cap);

  // the hearth itself on the front face: stone frame, dark firebox, glowing embers and a small flame
  const fz = half(1.1);
  g.add(mesh(box(1.0, 0.16, 0.16), mat(0xa29a8c), 0, 1.72, fz + 0.04));
  [-1, 1].forEach(s => g.add(mesh(box(0.16, 1.2, 0.14), mat(0xa29a8c), s*0.42, 1.12, fz + 0.03)));
  g.add(mesh(box(0.68, 1.1, 0.04), mat(DEEP), 0, 1.1, fz + 0.01));
  g.add(mesh(box(1.1, 0.08, 0.3), mat(0xa29a8c), 0, 0.56, fz + 0.1));   // hearth sill
  [-0.14, 0.05, 0.18].forEach((x, k) => { const e = flat(mesh(new THREE.DodecahedronGeometry(0.09, 0), glow(EMBER, 2.4), x, 0.68, fz + 0.08 - k*0.02)); g.add(e); });
  const hearthFlame = flat(mesh(new THREE.ConeGeometry(0.17, 0.5, 5), glow(0xffc04a, 2.6).clone(), 0, 0.98, fz + 0.06)); g.add(hearthFlame);

  // glowing runes up each face
  const runeMat = glow(GOLD, 1.8).clone();
  [0, 1, 2, 3].forEach(f => {
    const a = f*Math.PI/2, sx = Math.sin(a), cz = Math.cos(a), rot = a;
    const glyph = (w, h, x, y) => { const off = half(y) + 0.015, m = flat(mesh(box(w, h, 0.03), runeMat, sx*off + cz*x, y, cz*off - sx*x)); m.rotation.y = rot; g.add(m); };
    const y0 = f === 0 ? 2.25 : 1.4;                       // front face: runes sit above the hearth
    glyph(0.05, f === 0 ? 1.15 : 2.0, 0, y0 + (f === 0 ? 0.58 : 1.0));
    for(let k = 0; k < (f === 0 ? 3 : 5); k++) glyph(0.2 - (k % 2)*0.08, 0.05, (k % 2 ? -0.06 : 0.06), y0 + 0.2 + k*0.38);
  });

  // four small obelisks on the dais corners, tipped with glowing shards
  const tipMat = glow(0xffd27a, 2.2).clone();
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, z]) => {
    const o = mesh(cyl(0.08, 0.15, 0.95, 4), mat(DARK), x*0.98, 0.99, z*0.98); o.rotation.y = Math.PI/4; g.add(o);
    g.add(flat(mesh(new THREE.OctahedronGeometry(0.11), tipMat, x*0.98, 1.6, z*0.98)));
  });

  // golden crown holding the floating heart-gem, three motes orbiting it
  [0, 1, 2, 3].forEach(k => { const a = k*Math.PI/2 + Math.PI/4, p = mesh(new THREE.ConeGeometry(0.07, 0.42, 4), mat(0xc8902e, {metalness:0.5, roughness:0.4}), Math.cos(a)*0.46, 4.42, Math.sin(a)*0.46); p.rotation.z = -Math.cos(a)*0.35; p.rotation.x = Math.sin(a)*0.35; g.add(p); });
  const gem = flat(mesh(new THREE.OctahedronGeometry(0.42), glow(GOLD, 2.2), 0, 5.0, 0)); gem.scale.y = 1.35; g.add(gem);
  const orbit = new THREE.Group(); orbit.position.y = 5.0; g.add(orbit);
  for(let k = 0; k < 3; k++){ const a = k*Math.PI*2/3; orbit.add(flat(mesh(new THREE.OctahedronGeometry(0.09), glow(0xffe6a8, 2.4), Math.cos(a)*0.85, Math.sin(a*2)*0.15, Math.sin(a)*0.85))); }

  animated.push({fn:t => {
    gem.position.y = 5.0 + Math.sin(t*1.6)*0.15; gem.rotation.y = t*0.9;
    orbit.position.y = gem.position.y; orbit.rotation.y = -t*1.3;
    ringMat.emissiveIntensity = 2 + Math.sin(t*2)*0.6;
    runeMat.emissiveIntensity = 1.6 + Math.sin(t*1.2)*0.5;
    tipMat.emissiveIntensity = 2 + Math.sin(t*2.6)*0.5;
    hearthFlame.scale.set(1 + Math.sin(t*13)*0.08, 1 + Math.sin(t*9.3)*0.18 + Math.sin(t*21)*0.06, 1);
    hearthFlame.material.emissiveIntensity = 2.4 + Math.sin(t*17)*0.4;
  }});
  const pl = new THREE.PointLight(0xffb04a, 1.0, 14, 2); pl.position.set(0, 0.9, 2.6); g.add(pl);
  return g;
}

/* wayfinding sign arm: a wooden board with the island's name on both faces and a pointed tip */
function signArm(name, len){
  const p = canvasTex(len, 0.3, (ctx, W, H) => {
    ctx.fillStyle = '#6b4a30'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, H - 4, W, 4);
    ctx.font = `400 19px ${FD}`; ctx.fillStyle = '#f3e3c0'; ctx.textAlign = 'center'; ctx.fillText(name, W/2, 5);
  });
  const face = new THREE.MeshStandardMaterial({map:p.tex, roughness:0.9}), wood = mat(0x6b4a30);
  const arm = new THREE.Group();
  arm.add(mesh(box(len, 0.3, 0.06), [wood, wood, wood, wood, face, face], 0.1 + len/2, 0, 0));
  const tip = mesh(cyl(0.21, 0.21, 0.06, 3).rotateX(Math.PI/2).rotateZ(Math.PI/2), wood, 0.1 + len + 0.09, 0, 0);
  arm.add(tip);
  return arm;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}. */
export function decorate(isl, grp, animated){
  seed = 1337;
  // trees/rocks were already scattered by build.js: stay clear of them
  const taken = grp.children.filter(c => Math.hypot(c.position.x, c.position.z) > 1).map(c => [c.position.x, c.position.z, 0.5]);
  const free = (x, z, gap) => isl.pathDist(x, z) > gap && taken.every(([a, b, r]) => Math.hypot(a - x, b - z) > r + 0.5);
  const at = (o, x, z, r, room = 0.5) => {
    o.position.set(x, isl.topY(x, z), z); grp.add(o); taken.push([x, z, room]);
    if(r) obstacles.push({x:isl.x + x, z:isl.z + z, r});
  };
  const polar = (deg, r) => [Math.cos(deg*Math.PI/180)*r, Math.sin(deg*Math.PI/180)*r];

  // braziers flanking the front path
  const flameMat = glow(0xffa53a, 2.6).clone(), coreMat = glow(0xffe08a, 2.8).clone(), flames = [];
  [70, 110].forEach(deg => {
    const [x, z] = polar(deg, 5.0), b = new THREE.Group();
    b.add(mesh(cyl(0.22, 0.3, 0.12, 6), mat(DARK), 0, 0.06, 0));
    b.add(mesh(cyl(0.08, 0.11, 0.85, 6), mat(0x3d4048), 0, 0.5, 0));
    b.add(mesh(cyl(0.36, 0.16, 0.26, 7), mat(0x3d4048), 0, 1.02, 0));
    b.add(mesh(new THREE.TorusGeometry(0.36, 0.035, 4, 14).rotateX(Math.PI/2), mat(0xc8902e, {metalness:0.5, roughness:0.4}), 0, 1.15, 0));
    const f = mesh(new THREE.ConeGeometry(0.26, 0.7, 6), flameMat, 0, 1.45, 0), c = mesh(new THREE.ConeGeometry(0.13, 0.42, 5), coreMat, 0, 1.33, 0);
    f.castShadow = c.castShadow = false; b.add(f, c); flames.push(f, c);
    at(b, x, z, 0.38);
  });

  // two benches facing the hearth
  [196, 262].forEach(deg => {
    const [x, z] = polar(deg, 4.6);
    if(!free(x, z, 1.6)) return;
    const b = new THREE.Group(), wood = mat(0x7a5434);
    b.add(mesh(box(1.4, 0.1, 0.42), wood, 0, 0.44, 0));
    b.add(mesh(box(1.4, 0.32, 0.08), wood, 0, 0.7, -0.2));
    [-0.55, 0.55].forEach(lx => b.add(mesh(box(0.14, 0.42, 0.36), mat(DARK), lx, 0.21, 0)));
    b.rotation.y = Math.atan2(-x, -z);
    at(b, x, z, 0.62, 0.9);
  });

  // wayfinding signpost by the front path: one arm per island, aimed at it
  {
    const [x, z] = [-1.75, 5.7], post = new THREE.Group();
    post.add(mesh(cyl(0.09, 0.11, 3.0, 6), mat(0x5a3d28), 0, 1.5, 0));
    post.add(mesh(new THREE.ConeGeometry(0.16, 0.22, 6), mat(0x5a3d28), 0, 3.1, 0));
    const orb = mesh(new THREE.OctahedronGeometry(0.1), glow(GOLD, 2.2), 0, 3.32, 0); orb.castShadow = false; post.add(orb);
    ISLANDS.filter(i => i.id !== 'home').forEach((i, k) => {
      const arm = signArm(i.name, 1.45);
      arm.position.y = 2.75 - k*0.36;
      arm.rotation.y = -Math.atan2(i.z - (isl.z + z), i.x - (isl.x + x));
      post.add(arm);
    });
    at(post, x, z, 0.25);
  }

  // ring of standing stones just beyond the plaza, each with a rune facing the hearth
  const runeMat = glow(0x9fd8ff, 1.6).clone(), stoneGeo = cyl(0.13, 0.3, 1, 5), runeGeo = new THREE.OctahedronGeometry(0.09);
  for(let deg = 0; deg < 360; deg += 18){
    const [x, z] = polar(deg, 4.5);
    if(!free(x, z, 1.3)) continue;
    const h = 1.3 + rand()*0.8, s = new THREE.Group();
    const m = mesh(stoneGeo, mat(rand() > 0.5 ? 0x7d8088 : 0x6d7078), 0, h/2 - 0.05, 0); m.scale.y = h; m.rotation.y = Math.PI/5; s.add(m);
    const r = mesh(runeGeo, runeMat, 0, h*0.6, 0.19); r.scale.set(1, 1.6, 0.35); r.castShadow = false; s.add(r);
    s.rotation.set((rand() - 0.5)*0.12, Math.atan2(-x, -z), (rand() - 0.5)*0.12);
    at(s, x, z, 0.3);
  }

  animated.push({fn:t => {
    runeMat.emissiveIntensity = 1.3 + Math.sin(t*1.1)*0.6;
    flameMat.emissiveIntensity = 2.4 + Math.sin(t*15)*0.4;
    flames.forEach((f, k) => f.scale.set(1, 1 + Math.sin(t*(9 + k*1.7) + k)*0.16 + Math.sin(t*23 + k)*0.05, 1));
  }});
}
