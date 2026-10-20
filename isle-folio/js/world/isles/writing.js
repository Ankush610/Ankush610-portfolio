/* Lorehall (writing): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';
import { instanced } from '../props.js';

const STONE = 0xd9cfb6, TRIM = 0xeee6d2, BASE = 0x9b937f, ROOF = 0xbfb59c, DOME = 0x56708f, IRON = 0x2f3238;
const RUST = [0xcfc4a8, 0xd6ccb2, 0xc8bd9f, 0xddd3ba, 0xc2b89c];
const gold = () => mat(0xd9a441, {metalness:0.4, roughness:0.5});
const COVERS = [0xa8382a, 0x2e5e8a, 0x5d8746, 0x6b4a8a, 0xb07a2a];
const noShadow = m => { m.castShadow = false; return m; };

// local seeded random: never touch engine rnd() (shared sequence for every island)
let seed = 9091;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

// triangular prism (pediment): base width w on y=0, apex height h, extruded `d` along +z
function prism(w, h, d, m){
  const s = new THREE.Shape([new THREE.Vector2(-w/2, 0), new THREE.Vector2(w/2, 0), new THREE.Vector2(0, h)]);
  return mesh(new THREE.ExtrudeGeometry(s, {depth:d, bevelEnabled:false}), m);
}
const halfDisc = (r, t = 0.03) => new THREE.CylinderGeometry(r, r, t, 14, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2);   // upper half, facing +z
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
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on).
   The library inside (rooms/writing.js) is a tall hall of bookcases under a gilt picture rail, an upper storey of leaded
   arched windows between pilasters, a cornice and a beamed ceiling; outside, the same hall: arched leaded windows between
   pilasters on a rusticated base, a full entablature, a balustraded roof, a portico and a domed rotunda. */
export function building(animated){
  const g = new THREE.Group();
  const HZ = -0.35, HW = 1.5, HD = 1.2, TOP = 0.48, EY = 2.55;                     // hall centre z, half width, half depth, floor, wall top
  const at = (a, u, d, cz = HZ) => [Math.sin(a)*d + Math.cos(a)*u, cz + Math.cos(a)*d - Math.sin(a)*u];
  const row = (a, u, y, d, sx, sy, sz, c, rz = 0, cz = HZ) => { const [x, z] = at(a, u, d, cz); return [x, y, z, sx, sy, sz, a, c, 0, rz]; };
  const onFace = (o, a, u, y, d, cz = HZ) => { const [x, z] = at(a, u, d, cz); o.position.set(x, y, z); o.rotation.y = a; g.add(o); return o; };
  const unit = box(1, 1, 1), trim = mat(TRIM), tinted = mat(0xffffff, {roughness:0.9}), iron = mat(IRON);

  // stepped plinth, then the hall
  [[4.0, 3.9], [3.7, 3.6], [3.4, 3.4]].forEach(([w, d], k) => g.add(mesh(box(w, 0.16, d), mat(k === 2 ? ROOF : BASE), 0, 0.08 + k*0.16, 0.05)));
  g.add(mesh(box(2*HW, EY - TOP, 2*HD), mat(STONE), 0, (EY + TOP)/2, HZ));
  // the four walls as (a, half length along the wall, distance out): front, right, back, left
  const WALLS = [[0, HW, HD], [Math.PI/2, HD, HW], [Math.PI, HW, HD], [-Math.PI/2, HD, HW]];

  // rusticated base: two courses of proud blocks, the door left clear
  const rust = [];
  [0.6, 0.85].forEach((y, r) => WALLS.forEach(([a, L, d]) => {
    for(let u = -L - (r % 2)*0.2; u < L;){
      const w = 0.42 + rand()*0.22, p = Math.max(u, -L), q = Math.min(u + w, L); u += w;
      [[p, q]].flatMap(([s, e]) => a === 0 ? [[s, Math.min(e, -0.5)], [Math.max(s, 0.5), e]] : [[s, e]]).forEach(([s, e]) => {
        if(e - s > 0.08) rust.push(row(a, (s + e)/2, y, d + 0.03, e - s - 0.04, 0.2, 0.06, RUST[Math.floor(rand()*RUST.length)]));
      });
    }
  }));
  g.add(instanced(unit, tinted, rust));
  g.add(mesh(box(2*HW + 0.1, 0.07, 2*HD + 0.1), trim, 0, 1.0, HZ));                // string course

  // pilasters and tall arched windows, leaded and lit by the candles inside
  const winMat = glow(0xffcf7a, 1.25).clone(), panes = [], stone = [], lead = [];
  const pilaster = (a, u, d) => stone.push(row(a, u, 1.78, d + 0.05, 0.2, 1.52, 0.1, STONE), row(a, u, 1.07, d + 0.06, 0.27, 0.07, 0.13, TRIM), row(a, u, 2.49, d + 0.06, 0.28, 0.08, 0.14, TRIM));
  const window = (a, u, d) => {
    panes.push(row(a, u, 1.55, d + 0.005, 0.42, 1.0, 0.02));
    noShadow(onFace(mesh(halfDisc(0.21), winMat), a, u, 2.05, d + 0.005));
    lead.push(row(a, u, 1.66, d + 0.02, 0.025, 1.2, 0.02), row(a, u, 1.38, d + 0.02, 0.42, 0.025, 0.02), row(a, u, 1.76, d + 0.02, 0.42, 0.025, 0.02), row(a, u, 2.05, d + 0.02, 0.42, 0.025, 0.02));
    [-1, 1].forEach(s => stone.push(row(a, u + s*0.25, 1.55, d + 0.04, 0.08, 1.0, 0.08, TRIM)));
    for(let i = 0; i < 7; i++){ const th = (i + 0.5)*Math.PI/7, key = i === 3; stone.push(row(a, u + Math.cos(th)*0.26, 2.05 + Math.sin(th)*0.26, d + 0.04, key ? 0.12 : 0.09, key ? 0.16 : 0.1, 0.08, TRIM, th - Math.PI/2)); }
    stone.push(row(a, u, 1.03, d + 0.08, 0.62, 0.06, 0.17, TRIM));
    [-0.2, 0.2].forEach(s => stone.push(row(a, u + s, 0.95, d + 0.06, 0.07, 0.1, 0.1, TRIM)));
    stone.push(row(a, u, 2.41, d + 0.06, 0.64, 0.06, 0.13, TRIM));
  };
  [[Math.PI/2, HW], [-Math.PI/2, HW]].forEach(([a, d]) => { [-1.1, 0, 1.1].forEach(u => pilaster(a, u, d)); [-0.55, 0.55].forEach(u => window(a, u, d)); });
  [-1.4, -0.5, 0.5, 1.4].forEach(u => pilaster(Math.PI, u, HD)); [-0.95, 0, 0.95].forEach(u => window(Math.PI, u, HD));
  [-1.4, 1.4].forEach(u => pilaster(0, u, HD));
  g.add(instanced(unit, winMat, panes, false), instanced(unit, tinted, stone), instanced(unit, iron, lead, false));

  // the great door: plank leaves with panels, a leaded fanlight, a moulded arch and a little pedimented aedicule
  const DF = HZ + HD, DW = 0.7, DS = 1.53, AR = DW/2, doorM = glow(0xf0a850, 1.1).clone(), wood = mat(0x5a3a26), woodD = mat(0x4a2e1e);
  noShadow(onFace(mesh(halfDisc(AR, 0.02), doorM), 0, 0, DS, HD + 0.005));
  [-1, 1].forEach(s => {
    g.add(mesh(box(DW/2 - 0.02, DS - TOP, 0.05), wood, s*DW/4, (DS + TOP)/2, DF + 0.03));
    [0.78, 1.25].forEach(y => g.add(mesh(box(DW/2 - 0.12, 0.34, 0.02), woodD, s*DW/4, y, DF + 0.065)));
    const ring = mesh(new THREE.TorusGeometry(0.04, 0.01, 4, 10), gold(), s*0.07, 1.05, DF + 0.07); g.add(ring);
  });
  g.add(mesh(box(DW, 0.05, 0.05), iron, 0, DS, DF + 0.03));
  for(let k = 1; k < 4; k++){ const th = k*Math.PI/4, m = mesh(box(0.02, AR, 0.02), iron, Math.cos(th)*AR/2, DS + Math.sin(th)*AR/2, DF + 0.02); m.rotation.z = th - Math.PI/2; g.add(m); }
  const door = [];
  [-1, 1].forEach(s => door.push([s*(AR + 0.05), (DS + TOP)/2, DF + 0.04, 0.1, DS - TOP, 0.08, 0, TRIM], [s*0.58, 1.27, DF + 0.05, 0.16, 1.55, 0.1, 0, STONE], [s*0.58, 2.07, DF + 0.07, 0.22, 0.08, 0.14, 0, TRIM]));
  for(let i = 0; i < 9; i++){ const th = (i + 0.5)*Math.PI/9, key = i === 4; door.push([Math.cos(th)*(AR + 0.06), DS + Math.sin(th)*(AR + 0.06), DF + 0.045, key ? 0.13 : 0.1, key ? 0.18 : 0.12, 0.09, 0, TRIM, 0, th - Math.PI/2]); }
  door.push([0, 2.15, DF + 0.07, 1.36, 0.1, 0.14, 0, TRIM]);
  g.add(instanced(unit, tinted, door));
  const aed = prism(1.36, 0.24, 0.12, trim); aed.position.set(0, 2.2, DF + 0.01); g.add(aed);
  g.add(noShadow(mesh(new THREE.OctahedronGeometry(0.06), gold(), 0, DS + AR + 0.14, DF + 0.1)));

  // portico: four columns (square plinth, torus base, shaft, echinus and abacus) carrying the entablature forward
  const PZ = 1.45, COLS = [-1.25, -0.42, 0.42, 1.25];
  COLS.forEach(x => {
    g.add(mesh(box(0.34, 0.08, 0.34), trim, x, TOP + 0.04, PZ));
    g.add(mesh(new THREE.TorusGeometry(0.15, 0.04, 4, 12).rotateX(Math.PI/2), trim, x, TOP + 0.11, PZ));
    g.add(mesh(cyl(0.12, 0.14, EY - TOP - 0.3, 12), trim, x, (EY + TOP)/2, PZ));
    g.add(mesh(new THREE.TorusGeometry(0.14, 0.04, 4, 12).rotateX(Math.PI/2), trim, x, EY - 0.19, PZ));
    g.add(mesh(box(0.36, 0.08, 0.36), trim, x, EY - 0.08, PZ));
  });
  // purple banners in the outer bays, a gilt book on each
  const banners = [-0.84, 0.84].map(x => {
    const c = new THREE.Group(); c.position.set(x, EY - 0.05, 1.12);
    c.add(mesh(box(0.42, 1.0, 0.03), mat(0x7a52a6), 0, -0.5, 0));
    c.add(noShadow(mesh(box(0.42, 0.06, 0.035), gold(), 0, -0.94, 0)));
    [-1, 1].forEach(s => { const p = noShadow(mesh(box(0.1, 0.12, 0.035), glow(0xffd28a, 1.8), s*0.055, -0.45, 0.005)); p.rotation.z = s*0.25; c.add(p); });
    g.add(c); return c;
  });

  // entablature over hall and portico: architrave, frieze with gilt rosettes, dentils, cornice
  const FRONT = PZ + 0.25, ED = FRONT - (HZ - HD), EC = (FRONT + HZ - HD)/2;     // front edge, depth and centre of the whole top
  g.add(mesh(box(2*HW + 0.06, 0.2, ED), mat(STONE), 0, EY + 0.1, EC));
  g.add(mesh(box(2*HW + 0.02, 0.22, ED - 0.04), mat(ROOF), 0, EY + 0.31, EC));
  g.add(mesh(box(2*HW + 0.3, 0.1, ED + 0.3), trim, 0, EY + 0.49, EC));
  const ROSE = [], dent = [];
  for(let x = -1.35; x <= 1.36; x += 0.3) ROSE.push([x, EY + 0.31, FRONT - 0.01, 0.07, 0.07, 0.03, 0]);
  [[0, HW + 0.12, EC, ED/2 + 0.1], [Math.PI, HW + 0.12, EC, ED/2 + 0.1], [Math.PI/2, ED/2 + 0.1, EC, HW + 0.1], [-Math.PI/2, ED/2 + 0.1, EC, HW + 0.1]].forEach(([a, L, cz, d]) => {
    for(let u = -L + 0.06; u < L; u += 0.12) dent.push(row(a, u, EY + 0.41, d, 0.06, 0.06, 0.07, undefined, 0, cz));
  });
  g.add(instanced(new THREE.CylinderGeometry(1, 1, 1, 8).rotateX(Math.PI/2), gold(), ROSE), instanced(unit, trim, dent));

  // pediment over the portico: raking cornice, recessed tympanum with a glowing open book and gilt rays, acroteria
  const RY0 = EY + 0.54, PW = 2*HW + 0.2, PH = 0.7, PD = FRONT + 0.1 - (HZ + HD);
  const ped = prism(PW, PH, PD, mat(ROOF)); ped.position.set(0, RY0, HZ + HD); g.add(ped);
  const rake = Math.atan(PH/(PW/2)), RL = Math.hypot(PW/2, PH);
  [-1, 1].forEach(s => { const m = mesh(box(RL + 0.12, 0.09, PD + 0.12), trim, s*PW/4, RY0 + PH/2 + 0.05, HZ + HD + PD/2); m.rotation.z = -s*rake; g.add(m); });
  const tym = prism(PW - 0.5, PH - 0.18, 0.03, mat(0xc8bfa6)); tym.position.set(0, RY0 + 0.06, HZ + HD + PD); g.add(tym);
  const bookM = glow(0xffd28a, 2.0).clone();
  [-1, 1].forEach(sd => { const p = noShadow(mesh(box(0.22, 0.15, 0.02), bookM, sd*0.11, RY0 + 0.24, HZ + HD + PD + 0.04)); p.rotation.z = sd*0.22; g.add(p); });
  for(let k = 0; k < 7; k++){ const th = 0.35 + k*(Math.PI - 0.7)/6, r = noShadow(mesh(box(0.02, 0.16, 0.015), gold(), Math.cos(th)*0.33, RY0 + 0.24 + Math.sin(th)*0.24, HZ + HD + PD + 0.035)); r.rotation.z = th - Math.PI/2; g.add(r); }
  [[0, RY0 + PH + 0.1], [-PW/2 + 0.05, RY0 + 0.1], [PW/2 - 0.05, RY0 + 0.1]].forEach(([x, y]) => { const o = mesh(new THREE.OctahedronGeometry(0.09), gold(), x, y, HZ + HD + PD); o.scale.y = 1.5; g.add(o); });

  // balustrade round the roof (sides and back), lamp-urns on the corner posts
  const RT = EY + 0.54, balus = [], rails = [], urnFlames = [], flameM = glow(0xffc46a, 2.3).clone();
  const runs = [[-HW + 0.08, HZ - HD + 0.08, HW - 0.08, HZ - HD + 0.08], [-HW + 0.08, HZ - HD + 0.08, -HW + 0.08, HZ + HD - 0.1], [HW - 0.08, HZ - HD + 0.08, HW - 0.08, HZ + HD - 0.1]];
  runs.forEach(([x0, z0, x1, z1]) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L/0.15), ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI/2;
    for(let k = 1; k < n; k++){ const f = k/n; balus.push([x0 + (x1 - x0)*f, RT + 0.14, z0 + (z1 - z0)*f, 1, 1, 1, 0]); }
    [RT + 0.03, RT + 0.29].forEach((y, k) => rails.push([(x0 + x1)/2, y, (z0 + z1)/2, L, k ? 0.06 : 0.05, k ? 0.11 : 0.09, ry, TRIM]));
  });
  g.add(instanced(cyl(0.026, 0.038, 0.22, 6), trim, balus), instanced(unit, trim, rails));
  [[-1, HZ - HD + 0.08], [1, HZ - HD + 0.08], [-1, HZ + HD - 0.1], [1, HZ + HD - 0.1]].forEach(([s, z]) => {
    const x = s*(HW - 0.08);
    g.add(mesh(box(0.14, 0.34, 0.14), trim, x, RT + 0.17, z));
    g.add(mesh(cyl(0.05, 0.08, 0.06, 8), gold(), x, RT + 0.37, z), mesh(new THREE.SphereGeometry(0.09, 8, 5), gold(), x, RT + 0.47, z));
    const f = noShadow(mesh(new THREE.ConeGeometry(0.05, 0.16, 5), flameM, x, RT + 0.62, z)); g.add(f); urnFlames.push(f);
  });
  g.add(mesh(box(2*HW - 0.1, 0.06, 2*HD - 0.1), mat(ROOF), 0, RT + 0.03, HZ));      // roof deck

  // the rotunda: pedestal, a drum with lit windows ringed by twelve columns, a ribbed dome, a lit lantern
  const DY = RT + 0.06;
  g.add(mesh(cyl(1.04, 1.08, 0.22, 24), mat(BASE), 0, DY + 0.11, HZ));
  g.add(mesh(cyl(0.98, 1.02, 0.1, 24), trim, 0, DY + 0.27, HZ));
  g.add(mesh(cyl(0.78, 0.78, 0.68, 24), mat(STONE), 0, DY + 0.66, HZ));
  const cols = [], slits = [];
  for(let k = 0; k < 12; k++){
    const a = k*Math.PI/6, [x, z] = at(a, 0, 0.92);
    cols.push([x, DY + 0.65, z, 1, 1, 1, 0]);
    slits.push(row(a + Math.PI/12, 0, DY + 0.66, 0.785, 0.12, 0.38, 0.02));
  }
  g.add(instanced(cyl(0.045, 0.055, 0.66, 8), trim, cols), instanced(unit, winMat, slits, false));
  g.add(mesh(cyl(1.02, 0.98, 0.12, 24), trim, 0, DY + 1.04, HZ));
  const DOMEY = DY + 1.1;
  const dome = mesh(new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI*2, 0, Math.PI/2), mat(DOME), 0, DOMEY, HZ); dome.scale.y = 1.15; g.add(dome);
  for(let k = 0; k < 8; k++){ const rib = mesh(new THREE.TorusGeometry(0.81, 0.026, 4, 10, Math.PI/2), gold(), 0, DOMEY, HZ); rib.rotation.y = k*Math.PI/4; rib.scale.y = 1.15; g.add(rib); }
  const LY = DOMEY + 0.9;
  g.add(mesh(cyl(0.3, 0.34, 0.08, 12), trim, 0, LY, HZ));
  const lanternM = glow(0xffd28a, 2.2).clone();
  g.add(noShadow(mesh(cyl(0.17, 0.17, 0.34, 8), lanternM, 0, LY + 0.21, HZ)));
  for(let k = 0; k < 6; k++){ const a = k*Math.PI/3, [x, z] = at(a, 0, 0.23); g.add(mesh(box(0.045, 0.34, 0.045), trim, x, LY + 0.21, z)); }
  g.add(mesh(cyl(0.3, 0.3, 0.06, 12), trim, 0, LY + 0.41, HZ));
  g.add(mesh(new THREE.ConeGeometry(0.27, 0.32, 12), mat(DOME), 0, LY + 0.6, HZ));
  g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), gold(), 0, LY + 0.81, HZ));

  // bronze lanterns on pedestals either side of the steps
  [-1, 1].forEach(s => {
    g.add(mesh(box(0.3, 0.42, 0.3), trim, s*1.45, 0.21, 2.25), mesh(cyl(0.035, 0.05, 0.8, 6), iron, s*1.45, 0.82, 2.25));
    g.add(noShadow(mesh(box(0.18, 0.24, 0.18), lanternM, s*1.45, 1.32, 2.25)), mesh(new THREE.ConeGeometry(0.17, 0.16, 4), iron, s*1.45, 1.52, 2.25));
  });

  // open books orbiting the dome, flapping their pages
  const books = COVERS.map(c => { const b = openBook(c); g.add(b); return b; });
  // loose pages swirling in a wider, lower ring (above head height)
  const pageMat = mat(0xf3ead2, {side:THREE.DoubleSide}), pageGeo = new THREE.PlaneGeometry(0.2, 0.27);
  const pages = Array.from({length:10}, () => { const p = noShadow(new THREE.Mesh(pageGeo, pageMat)); g.add(p); return p; });
  animated.push({fn:t => {
    books.forEach((b, k) => {
      const a = t*0.35 + k*Math.PI*2/books.length, r = 1.55 + (k % 2)*0.35;
      b.position.set(Math.cos(a)*r, DOMEY + 0.35 + (k % 3)*0.22 + Math.sin(t*1.2 + k)*0.12, HZ + Math.sin(a)*r);
      b.rotation.set(0.35, -a + Math.PI/2, Math.sin(t*0.8 + k)*0.15);
      const f = 0.32 + Math.sin(t*2.6 + k*1.7)*0.18;
      b.userData.halves[0].rotation.z = -f; b.userData.halves[1].rotation.z = f;
    });
    pages.forEach((p, k) => {
      const a = -t*0.5 + k*0.63 + Math.sin(t*0.7 + k)*0.2, r = 2.8 + (k % 3)*0.35;
      p.position.set(Math.cos(a)*r, 3.3 + (k % 4)*0.25 + Math.sin(t*1.5 + k*2.1)*0.18, -0.2 + Math.sin(a)*r);
      p.rotation.set(Math.sin(t*2 + k)*0.6, -a, Math.cos(t*1.7 + k)*0.5);
    });
    banners.forEach((c, k) => { c.rotation.x = Math.sin(t*1.3 + k*1.9)*0.06; });
    urnFlames.forEach((f, k) => f.scale.set(1, 1 + Math.sin(t*(9 + k*1.3) + k)*0.18, 1));
    flameM.emissiveIntensity = 2.2 + Math.sin(t*15)*0.3;
    winMat.emissiveIntensity = 1.2 + Math.sin(t*2.3)*0.08;
    bookM.emissiveIntensity = 1.8 + Math.sin(t*1.4)*0.4;
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
