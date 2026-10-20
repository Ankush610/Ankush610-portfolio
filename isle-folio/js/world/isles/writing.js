/* Lorehall (writing): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';

const STONE = 0xd9cfb6, TRIM = 0xeee6d2, BASE = 0x9b937f, ROOF = 0xbfb59c, DOME = 0x56708f, IRON = 0x2f3238;
const gold = () => mat(0xd9a441, {metalness:0.4, roughness:0.5});
const lit = () => glow(0xffd28a, 1.7);
const COVERS = [0xa8382a, 0x2e5e8a, 0x5d8746, 0x6b4a8a, 0xb07a2a];
const noShadow = m => { m.castShadow = false; return m; };

// triangular prism (pediment): base width w on y=0, apex height h, extruded `d` along +z
function prism(w, h, d, m){
  const s = new THREE.Shape([new THREE.Vector2(-w/2, 0), new THREE.Vector2(w/2, 0), new THREE.Vector2(0, h)]);
  return mesh(new THREE.ExtrudeGeometry(s, {depth:d, bevelEnabled:false}), m);
}
// lit arched window: glowing pane + round top; `axis` 'x' for side walls, 'z' for front/back
function arch(g, x, y, z, w, h, axis, m = lit()){
  const pane = axis === 'x' ? box(0.05, h, w) : box(w, h, 0.05);
  g.add(noShadow(mesh(pane, m, x, y, z)));
  const top = noShadow(mesh(cyl(w/2, w/2, 0.05, 10), m, x, y + h/2, z));
  if(axis === 'x') top.rotation.z = Math.PI/2; else top.rotation.x = Math.PI/2;
  g.add(top);
}
// an open book: two hinged halves (cover + pages) that can flap
function openBook(color){
  const b = new THREE.Group(), halves = [];
  [-1, 1].forEach(sd => {
    const h = new THREE.Group();
    h.add(noShadow(mesh(box(0.3, 0.025, 0.4), mat(color), sd*0.15, 0, 0)));
    h.add(noShadow(mesh(box(0.27, 0.04, 0.36), mat(0xf3ead2), sd*0.14, 0.03, 0)));
    b.add(h); halves.push(h);
  });
  b.userData.halves = halves;
  return b;
}

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on). */
export function building(animated){
  const g = new THREE.Group();
  // stepped plinth
  [[3.5, 3.2], [3.2, 2.9], [2.9, 2.6]].forEach(([w, d], k) => g.add(mesh(box(w, 0.16, d), mat(k === 2 ? ROOF : BASE), 0, 0.08 + k*0.16, 0.05)));
  const top = 0.48;
  // hall
  g.add(mesh(box(2.3, 1.55, 1.7), mat(STONE), 0, top + 0.775, -0.4));
  [-1.16, 1.16].forEach(x => [-0.85, 0.0].forEach(z => arch(g, x, 1.2, z, 0.32, 0.7, 'x')));
  [-0.55, 0.55].forEach(x => arch(g, x, 1.2, -1.26, 0.32, 0.7, 'z'));
  arch(g, 0, 0.95, 0.46, 0.56, 0.94, 'z', glow(0xf0a850, 1.1));                       // the great door
  // portico: four columns with bases and capitals
  [-1.08, -0.36, 0.36, 1.08].forEach(x => {
    g.add(mesh(box(0.3, 0.1, 0.3), mat(TRIM), x, top + 0.05, 1.0));
    g.add(mesh(cyl(0.11, 0.13, 1.35, 8), mat(TRIM), x, top + 0.775, 1.0));
    g.add(mesh(box(0.32, 0.1, 0.32), mat(TRIM), x, top + 1.5, 1.0));
  });
  // purple banners hanging in the outer bays of the portico
  const banners = [-0.72, 0.72].map(x => {
    const c = new THREE.Group(); c.position.set(x, 2.02, 0.72);
    c.add(mesh(box(0.42, 0.9, 0.03), mat(0x7a52a6), 0, -0.45, 0));
    c.add(noShadow(mesh(box(0.42, 0.06, 0.035), gold(), 0, -0.84, 0)));
    c.add(noShadow(mesh(box(0.12, 0.16, 0.035), gold(), 0, -0.42, 0)));
    g.add(c); return c;
  });
  // entablature, gold frieze line, cornice
  g.add(mesh(box(2.8, 0.24, 2.75), mat(ROOF), 0, 2.15, -0.1));
  g.add(noShadow(mesh(box(2.82, 0.05, 0.02), gold(), 0, 2.12, 1.28)));
  g.add(mesh(box(2.95, 0.08, 2.9), mat(TRIM), 0, 2.31, -0.1));
  // pediment with a glowing open-book emblem
  const ped = prism(3.0, 0.62, 1.15, mat(ROOF)); ped.position.set(0, 2.35, 0.25); g.add(ped);
  const tym = prism(2.5, 0.46, 0.04, mat(STONE)); tym.position.set(0, 2.4, 1.39); g.add(tym);
  [-1, 1].forEach(sd => { const p = noShadow(mesh(box(0.2, 0.14, 0.02), glow(0xffd28a, 2), sd*0.1, 2.57, 1.44)); p.rotation.z = sd*0.25; g.add(p); });
  // drum with lit slits, dome, gold ring, lantern cupola
  g.add(mesh(cyl(0.95, 0.95, 0.5, 12), mat(STONE), 0, 2.6, -0.4));
  for(let k = 0; k < 8; k++){
    const a = k/8*Math.PI*2 + Math.PI/8, w = noShadow(mesh(box(0.14, 0.3, 0.04), lit(), Math.sin(a)*0.95, 2.6, -0.4 + Math.cos(a)*0.95));
    w.rotation.y = a; g.add(w);
  }
  g.add(mesh(cyl(1.02, 1.02, 0.08, 12), gold(), 0, 2.88, -0.4));
  g.add(mesh(new THREE.SphereGeometry(0.98, 12, 6, 0, Math.PI*2, 0, Math.PI/2), mat(DOME), 0, 2.86, -0.4));
  g.add(noShadow(mesh(cyl(0.18, 0.18, 0.32, 8), glow(0xffd28a, 2.2), 0, 3.96, -0.4)));
  for(let k = 0; k < 4; k++){ const a = k*Math.PI/2 + Math.PI/4; g.add(mesh(box(0.05, 0.34, 0.05), mat(TRIM), Math.cos(a)*0.2, 3.96, -0.4 + Math.sin(a)*0.2)); }
  g.add(mesh(new THREE.ConeGeometry(0.3, 0.3, 8), mat(DOME), 0, 4.27, -0.4));
  g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), gold(), 0, 4.47, -0.4));

  // open books orbiting the dome, flapping their pages
  const books = COVERS.map(c => { const b = openBook(c); g.add(b); return b; });
  // loose pages swirling in a wider, lower ring (above head height)
  const pageMat = mat(0xf3ead2, {side:THREE.DoubleSide}), pageGeo = new THREE.PlaneGeometry(0.2, 0.27);
  const pages = Array.from({length:10}, () => { const p = noShadow(new THREE.Mesh(pageGeo, pageMat)); g.add(p); return p; });
  animated.push({fn:t => {
    books.forEach((b, k) => {
      const a = t*0.35 + k*Math.PI*2/books.length, r = 1.55 + (k % 2)*0.35;
      b.position.set(Math.cos(a)*r, 3.35 + (k % 3)*0.22 + Math.sin(t*1.2 + k)*0.12, -0.4 + Math.sin(a)*r);
      b.rotation.set(0.35, -a + Math.PI/2, Math.sin(t*0.8 + k)*0.15);
      const f = 0.32 + Math.sin(t*2.6 + k*1.7)*0.18;
      b.userData.halves[0].rotation.z = -f; b.userData.halves[1].rotation.z = f;
    });
    pages.forEach((p, k) => {
      const a = -t*0.5 + k*0.63 + Math.sin(t*0.7 + k)*0.2, r = 2.6 + (k % 3)*0.35;
      p.position.set(Math.cos(a)*r, 2.5 + (k % 4)*0.25 + Math.sin(t*1.5 + k*2.1)*0.18, -0.2 + Math.sin(a)*r);
      p.rotation.set(Math.sin(t*2 + k)*0.6, -a, Math.cos(t*1.7 + k)*0.5);
    });
    banners.forEach((c, k) => { c.rotation.x = Math.sin(t*1.3 + k*1.9)*0.06; });
  }});
  return g;
}

/* ---------- reading-garden props (local origin at ground, built facing +z) ---------- */
function statue(){
  const g = new THREE.Group(), marble = mat(0xe6e0d2);
  g.add(mesh(box(0.8, 0.6, 0.8), mat(BASE), 0, 0.3, 0));
  g.add(mesh(box(0.92, 0.1, 0.92), mat(TRIM), 0, 0.65, 0));
  g.add(mesh(cyl(0.15, 0.3, 0.95, 7), marble, 0, 1.17, 0));            // robe
  g.add(mesh(cyl(0.2, 0.16, 0.22, 7), marble, 0, 1.75, 0));            // shoulders
  g.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), marble, 0, 1.98, 0));
  const bk = openBook(0x6b4a8a); bk.position.set(0, 1.55, 0.24); bk.rotation.x = 0.6; bk.scale.setScalar(0.8);
  bk.userData.halves[0].rotation.z = -0.25; bk.userData.halves[1].rotation.z = 0.25; g.add(bk);
  return g;
}
function bench(){
  const g = new THREE.Group(), wood = mat(0x7a5236);
  g.add(mesh(box(1.1, 0.07, 0.38), wood, 0, 0.42, 0));
  g.add(mesh(box(1.1, 0.3, 0.06), wood, 0, 0.66, -0.18));
  [-0.45, 0.45].forEach(x => g.add(mesh(box(0.1, 0.42, 0.36), mat(BASE), x, 0.21, 0)));
  return g;
}
function lampPost(){
  const g = new THREE.Group(), iron = mat(IRON);
  g.add(mesh(cyl(0.13, 0.17, 0.2, 6), iron, 0, 0.1, 0));
  g.add(mesh(cyl(0.045, 0.06, 2.1, 6), iron, 0, 1.15, 0));
  g.add(noShadow(mesh(cyl(0.13, 0.1, 0.28, 6), glow(0xffd28a, 2.2), 0, 2.32, 0)));
  g.add(mesh(new THREE.ConeGeometry(0.2, 0.18, 6), iron, 0, 2.55, 0));
  return g;
}
function bookStack(){
  const g = new THREE.Group();
  [[0x2e5e8a, 1.1, 0.0], [0xa8382a, 0.95, 0.4], [0x5d8746, 0.85, -0.3], [0xb07a2a, 0.7, 0.2]].reduce((y, [c, s, rot]) => {
    const b = new THREE.Group(); b.position.y = y; b.rotation.y = rot;
    b.add(mesh(box(0.9*s, 0.22*s, 0.65*s), mat(c), 0, 0.11*s, 0));
    b.add(mesh(box(0.86*s, 0.18*s, 0.6*s), mat(0xf3ead2), 0.04*s, 0.11*s, 0));
    g.add(b); return y + 0.22*s;
  }, 0);
  g.add(mesh(cyl(0.06, 0.06, 0.16, 6), mat(0xf3ead2), 0.05, 0.86, 0));      // candle
  g.add(noShadow(mesh(new THREE.ConeGeometry(0.04, 0.1, 5), glow(0xffb04a, 2.6), 0.05, 0.99, 0)));
  return g;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}. */
export function decorate(isl, grp){
  const ends = isl.paths.map(p => [p[2], p[3]]);   // bridge heads get lanterns later: keep away
  const ok = (x, z, r) => {
    const d = Math.hypot(x, z);
    return d > isl.obs + 2.2 + r && d + r < 0.85*isl.edgeR(Math.atan2(z, x)) && isl.pathDist(x, z) > 1.2 + r
      && !ends.some(e => Math.hypot(x - e[0], z - e[1]) < 2.4)
      && !obstacles.some(o => Math.hypot(isl.x + x - o.x, isl.z + z - o.z) < o.r + r + 0.1);
  };
  // deterministic search outward from a preferred angle/radius (no shared rnd())
  const place = (obj, a0, r0, r, face) => {
    for(let k = 0; k < 17; k++){                       // up to ±~1 rad from the preferred angle
      const a = a0 + (k % 2 ? 1 : -1)*Math.ceil(k/2)*0.12;
      for(const r1 of [r0, r0 - 0.35, r0 + 0.35, r0 - 0.7, r0 + 0.7]){
        const x = Math.cos(a)*r1, z = Math.sin(a)*r1;
        if(!ok(x, z, r)) continue;
        obj.position.set(x, isl.topY(x, z) - 0.04, z);
        const [fx, fz] = face || [0, 0];
        obj.rotation.y = Math.atan2(fx - x, fz - z);
        grp.add(obj); obstacles.push({x:isl.x + x, z:isl.z + z, r});
        return [x, z];
      }
    }
    return null;
  };
  // the island ring between plaza and coast is mostly trees: a small reading garden fits in the gaps
  place(statue(), 0.3, 4.95, 0.5);
  place(lampPost(), -0.15, 5.2, 0.25);
  place(bookStack(), -0.8, 5.2, 0.5);
  place(bench(), 3.7, 5.2, 0.5);
  place(lampPost(), 3.25, 5.2, 0.25);
  place(lampPost(), 2.6, 5.2, 0.25);
}
