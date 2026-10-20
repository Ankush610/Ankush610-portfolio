/* ---- Beacon Point: the Lantern room (contact) ----
   Left: intro board · centre: "Email me" hero console with the lens glowing behind it · right: lit link buttons. */
import { THREE, V3, reduce, mat, mesh, glow, box, cyl } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, COL, panel, setPanel, rr, para, clip, fitFont, card, eyebrow, shortUrl, openLink } from '../panels.js';
import { starField } from '../world/props.js';
import { view, faceY, item, floorDisc, arcWall, hooks } from './kit.js';

const brass = () => mat(0x8a6a3a, {metalness:0.5, roughness:0.5});
// own material per button so its rim can light up on focus (cached mat() would light every button)
const rimMat = base => new THREE.MeshStandardMaterial({color:0x2a2418, emissive:0xf0b54a, emissiveIntensity:base, flatShading:true, roughness:0.6});

/* ---- set dressing helpers (local: a seeded PRNG of our own so we never shift the shared rnd() sequence) ---- */
let sd = 91; const r01 = () => { sd = (sd*16807) % 2147483647; return (sd - 1)/2147483646; };
const D = new THREE.Object3D();
// one InstancedMesh from [x, y, z, rx, ry, rz, sx, sy, sz, color?] rows
function inst(geo, m, rows){
  const im = new THREE.InstancedMesh(geo, m, rows.length), c = new THREE.Color();
  rows.forEach(([x, y, z, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1, col], i) => {
    D.position.set(x, y, z); D.rotation.set(rx, ry, rz); D.scale.set(sx, sy, sz); D.updateMatrix(); im.setMatrixAt(i, D.matrix);
    if(col !== undefined) im.setColorAt(i, c.setHex(col));
  });
  im.castShadow = im.receiveShadow = true; return im;
}
// a point on the tower's circle; theta follows CylinderGeometry (x = sin, z = cos), so PI is straight at the back
const onRing = (r, th, y) => [Math.sin(th)*r, y, Math.cos(th)*r];
// a torus arc lying flat on the tower's circle from theta th0 over len radians
function ringArc(r, tube, th0, len, y, m, seg=24){
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 5, seg, len), m); t.rotation.x = Math.PI/2;
  const p = new THREE.Group(); p.rotation.y = th0 + len - Math.PI/2; p.position.y = y; p.add(t); return p;
}
// a small parchment sea chart, drawn locally (no network textures)
function chartTex(){
  const c = document.createElement('canvas'); c.width = 256; c.height = 180; const x = c.getContext('2d');
  x.fillStyle = '#d9c79b'; x.fillRect(0, 0, 256, 180);
  x.strokeStyle = 'rgba(90,60,30,.35)'; x.lineWidth = 1;
  for(let k=0;k<16;k++){ const a = k/16*Math.PI*2; x.beginPath(); x.moveTo(150, 92); x.lineTo(150 + Math.cos(a)*300, 92 + Math.sin(a)*300); x.stroke(); }
  x.fillStyle = '#a99363'; x.strokeStyle = '#6b4a2e'; x.lineWidth = 2;
  [[40, 50, 34, 26], [70, 140, 46, 22], [210, 40, 30, 20], [200, 150, 22, 14]].forEach(([cx, cy, rx, ry]) => {
    x.beginPath(); for(let k=0;k<=14;k++){ const a = k/14*Math.PI*2, w = 0.75 + r01()*0.4; x.lineTo(cx + Math.cos(a)*rx*w, cy + Math.sin(a)*ry*w); } x.fill(); x.stroke();
  });
  x.setLineDash([5, 5]); x.strokeStyle = '#a8382a'; x.lineWidth = 2; x.beginPath(); x.moveTo(60, 70); x.quadraticCurveTo(130, 30, 150, 92); x.quadraticCurveTo(170, 140, 205, 148); x.stroke();
  x.setLineDash([]); x.strokeStyle = '#6b4a2e'; x.strokeRect(4, 4, 248, 172);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
// a soft round glow for additive sprites
function haloTex(){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.35, 'rgba(255,214,130,.45)'); gr.addColorStop(1, 'rgba(255,200,110,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

/* Everything that makes the lantern room feel lived in. Returns the bits update() animates.
   Kept out of every station's sight line: the front of the room (+z) stays open, and anything low at the
   front sits flat on the floor below the panels. */
function dress(g, dark, brassM){
  const d = new THREE.Group(); g.add(d);
  const wall = mat(0x252a33), wood = mat(0x5a3d28), woodD = mat(0x3e2a1c), rope = mat(0xb89a68), red = mat(0xa8382a),
    cream = mat(0xe8e2d4), iron = mat(0x3a3f4a, {metalness:0.4, roughness:0.6}), parch = mat(0xd9c79b);
  const TH0 = Math.PI/2 + 0.45, TLEN = Math.PI - 0.9;   // the parapet's arc (matches arcWall above)

  /* --- architecture: parapet panelling + brass cap rail, window transoms, a tiled floor ring --- */
  d.add(ringArc(7.22, 0.07, TH0, TLEN, 1.12, brassM, 32));
  d.add(ringArc(7.2, 0.1, TH0, TLEN, 0.08, dark, 32));
  const ribs = [];
  for(let th = TH0 + 0.08; th < TH0 + TLEN; th += 0.13) ribs.push([...onRing(7.2, th, 0.58), 0, th, 0]);
  d.add(inst(box(0.07, 0.92, 0.06), wall, ribs));
  // horizontal transoms between the window mullions (two rows)
  const trans = [];
  for(let k=0;k<16;k++){
    const a = k/16*Math.PI*2, b = (k + 1)/16*Math.PI*2;
    if(Math.cos(a) > 0.45 || Math.cos(b) > 0.45) continue;
    const m = (a + b)/2, len = 2*7.3*Math.sin(Math.PI/16);
    [2.0, 4.85].forEach(y => trans.push([...onRing(7.3*Math.cos(Math.PI/16), m, y), 0, m, 0, len, 1, 1]));
  }
  d.add(inst(box(1, 0.09, 0.09), dark, trans));
  // tiled floor: a brass inlay ring and a ring of darker flagstones under the walls
  const inlay = mesh(new THREE.RingGeometry(5.55, 5.68, 48), brassM, 0, 0.012, 0); inlay.rotation.x = -Math.PI/2; d.add(inlay);
  const flags = mesh(new THREE.RingGeometry(5.68, 7.55, 24, 1), mat(0x23262e), 0, 0.008, 0); flags.rotation.x = -Math.PI/2; d.add(flags);

  /* --- the roof: a cone of rafters over the lantern, with a vent cap --- */
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 2.6, 16, 1, true), mat(0x181b22, {side:THREE.BackSide}));
  roof.position.y = 6.2 + 1.3; d.add(roof);
  const raf = [];
  for(let k=0;k<16;k++){
    const a = (k + 0.5)/16*Math.PI*2, p0 = new V3(...onRing(7.25, a, 6.25)), p1 = new V3(...onRing(0.35, a, 8.6));
    D.position.copy(p0).add(p1).multiplyScalar(0.5); D.lookAt(p1);
    raf.push([D.position.x, D.position.y, D.position.z, D.rotation.x, D.rotation.y, D.rotation.z, 1, 1, p0.distanceTo(p1)]);
  }
  d.add(inst(box(0.13, 0.13, 1), mat(0x3a2a1e), raf));
  d.add(mesh(cyl(0.45, 0.45, 0.25, 10), brassM, 0, 8.55, 0));

  /* --- signal flags strung across the back windows --- */
  const pts = [];
  for(let k=0;k<=24;k++){ const th = 2.15 + k/24*2.0, s = Math.sin(((k % 8)/8)*Math.PI); pts.push(new V3(...onRing(6.95, th, 5.75 - s*0.32))); }
  const curve = new THREE.CatmullRomCurve3(pts);
  d.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.018, 3), rope));
  const fcols = [0xa8382a, 0xe8e2d4, 0xf0b54a, 0x3d5a9a, 0x8fc27e, 0xe8e2d4, 0xa8382a, 0x3d5a9a, 0xf0b54a];
  const fl = [];
  for(let k=1;k<24;k++){ if(k % 8 === 0) continue; const p = curve.getPoint(k/24), th = Math.atan2(p.x, p.z);
    fl.push([p.x, p.y - 0.2, p.z, 0, th, Math.PI, 1, 1, 0.12, fcols[k % fcols.length]]); }
  d.add(inst(new THREE.ConeGeometry(0.17, 0.4, 3), mat(0xffffff), fl));

  /* --- life rings hung on two back mullions --- */
  const ring = new THREE.TorusGeometry(0.36, 0.11, 6, 16), band = box(0.12, 0.26, 0.26), bands = [];
  [[9, 4.15], [7, 4.0]].forEach(([k, y]) => {
    const th = k/16*Math.PI*2, [x, , z] = onRing(7.0, th, 0);
    const b = mesh(ring, red, x, y, z); b.rotation.y = th; d.add(b);
    for(let q=0;q<4;q++){ const a = q*Math.PI/2 + Math.PI/4; const off = new V3(Math.cos(a)*0.36, Math.sin(a)*0.36, 0).applyAxisAngle(new V3(0,1,0), th);
      bands.push([x + off.x, y + off.y, z + off.z, 0, th, a]); }
    d.add(mesh(cyl(0.035, 0.035, 0.35, 5), rope, x, y + 0.5, z));
  });
  d.add(inst(band, cream, bands));

  /* --- a ship's wheel mounted on the back-left wall --- */
  const wheel = new THREE.Group(); { const [x, , z] = onRing(6.65, 4.05, 0); wheel.position.set(x, 4.35, z); wheel.rotation.y = 4.05; }
  wheel.add(mesh(new THREE.TorusGeometry(0.62, 0.06, 5, 20), wood, 0, 0, 0));
  wheel.add(mesh(cyl(0.13, 0.13, 0.16, 8), brassM, 0, 0, 0)); wheel.children[1].rotation.x = Math.PI/2;
  const spokes = [], grips = [];
  for(let k=0;k<8;k++){ const a = k/8*Math.PI*2; spokes.push([Math.cos(a)*0.4, Math.sin(a)*0.4, 0, 0, 0, a + Math.PI/2]); grips.push([Math.cos(a)*0.82, Math.sin(a)*0.82, 0, 0, 0, a + Math.PI/2]); }
  wheel.add(inst(cyl(0.035, 0.035, 0.8, 5), woodD, spokes), inst(cyl(0.05, 0.035, 0.26, 6), woodD, grips));
  d.add(wheel);

  /* --- brass telescope on a tripod, aimed out of the back-left windows --- */
  const scope = new THREE.Group(); scope.position.set(-3.25, 0, -5.7); scope.scale.setScalar(1.2); d.add(scope);
  const legs = [0, 2.1, 4.2].map(a => { const lx = Math.cos(a)*0.38, lz = Math.sin(a)*0.38; return [lx, 0.72, lz, Math.sin(a)*0.25, 0, -Math.cos(a)*0.25]; });
  scope.add(inst(cyl(0.03, 0.04, 1.5, 5), woodD, legs));
  scope.add(mesh(cyl(0.09, 0.09, 0.14, 8), brassM, 0, 1.47, 0));
  const tube = new THREE.Group(); tube.position.y = 1.56; tube.rotation.set(0, 2.7, 0); scope.add(tube);
  const tubeInner = new THREE.Group(); tubeInner.rotation.x = -0.55; tube.add(tubeInner);   // tip the barrel up toward the sky
  [[0.11, 0.13, 1.0, -0.35], [0.14, 0.14, 0.12, -0.88], [0.085, 0.1, 0.55, 0.38], [0.05, 0.05, 0.18, 0.72]].forEach(([a, b, h, z], i) => {
    const c = mesh(cyl(a, b, h, 8), i === 1 ? dark : brassM, 0, 0, z); c.rotation.x = Math.PI/2; tubeInner.add(c);
  });

  /* --- spiral stair to the lamp gallery, back right --- */
  const st = new THREE.Group(); st.position.set(3.95, 0, -4.85); d.add(st);
  st.add(mesh(cyl(0.1, 0.12, 6.2, 8), iron, 0, 3.1, 0));
  const steps = [], posts = [], rail = [];
  for(let k=0;k<19;k++){
    const a = 0.3 + k*0.42, y = 0.32 + k*0.31;
    steps.push([Math.cos(a)*0.55, y, -Math.sin(a)*0.55, 0, a, 0]);
    posts.push([Math.cos(a)*0.98, y + 0.42, -Math.sin(a)*0.98]);
    rail.push(new V3(Math.cos(a)*0.98, y + 0.84, -Math.sin(a)*0.98));
  }
  st.add(inst(box(0.92, 0.07, 0.34), iron, steps), inst(cyl(0.022, 0.022, 0.8, 4), iron, posts));
  st.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 64, 0.035, 4), brassM));
  st.add(mesh(box(1.5, 0.12, 1.5), dark, 0, 6.15, 0));   // trapdoor frame into the gallery above

  /* --- crates, a barrel and rope at the back, between the console and the links --- */
  const crate = box(0.7, 0.7, 0.7), crRows = [], trim = [];
  [[2.35, 0.35, -3.55, 0.3, 1], [2.25, 1.05, -3.6, 0.65, 0.8], [3.05, 0.3, -2.95, -0.2, 0.85], [-5.3, 0.35, -3.75, -0.5, 1]].forEach(([x, y, z, ry, s]) => {
    crRows.push([x, y + (s - 1)*0.35, z, 0, ry, 0, s, s, s]);
    [-1, 1].forEach(e => trim.push([x, y + (s - 1)*0.35 + e*0.27*s, z, 0, ry, 0, s*1.04, s*0.12, s*1.04]));
  });
  d.add(inst(crate, mat(0x6b4a2e), crRows), inst(crate, woodD, trim));
  const barrel = new THREE.Group(); barrel.position.set(1.55, 0, -3.85); d.add(barrel);
  barrel.add(mesh(cyl(0.34, 0.3, 0.9, 10), mat(0x6b4a2e), 0, 0.45, 0));
  [0.15, 0.75].forEach(y => barrel.add(mesh(cyl(0.355, 0.355, 0.07, 10), iron, 0, y, 0)));
  // rolled charts poking out of the barrel
  [[0.08, 0.1, 0.12], [-0.1, -0.05, -0.15], [0.02, -0.12, 0.05]].forEach(([x, z, r]) => { const c = mesh(cyl(0.05, 0.05, 0.75, 6), parch, x, 1.05, z); c.rotation.set(r, 0, -r); barrel.add(c); });
  // rope coils: two low on the floor either side of the console's foot, one on the back crate
  const coil = new THREE.TorusGeometry(0.32, 0.07, 5, 14), coils = [];
  [[1.5, -0.35], [-1.55, -0.2]].forEach(([x, z]) => [0, 1, 2].forEach(k => coils.push([x, 0.07 + k*0.11, z, Math.PI/2, 0, 0, 1 - k*0.13, 1 - k*0.13, 1])));
  coils.push([3.05, 0.67 + 0.07, -2.95, Math.PI/2, 0, 0, 0.8, 0.8, 1]);
  d.add(inst(coil, rope, coils));

  /* --- chart table at the front left, low enough to sit under every panel's sight line --- */
  const tbl = new THREE.Group(); tbl.position.set(-5.3, 0, 0.9); tbl.rotation.y = 0.5; d.add(tbl);
  tbl.add(mesh(box(1.5, 0.08, 0.95), wood, 0, 0.62, 0));
  tbl.add(inst(box(0.08, 0.6, 0.08), woodD, [[-0.66, 0.3, -0.4], [0.66, 0.3, -0.4], [-0.66, 0.3, 0.4], [0.66, 0.3, 0.4]]));
  const map = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), new THREE.MeshStandardMaterial({map:chartTex(), roughness:1}));
  map.rotation.set(-Math.PI/2, 0, 0.06); map.position.y = 0.665; map.receiveShadow = true; tbl.add(map);
  tbl.add(mesh(cyl(0.05, 0.05, 0.5, 6), parch, -0.35, 0.72, 0.38)); tbl.children[3].rotation.z = Math.PI/2;
  // brass dividers lying open on the chart
  const dv = mesh(box(0.025, 0.02, 0.42), brassM, 0.25, 0.68, -0.05); dv.rotation.y = 0.35; tbl.add(dv);
  const dv2 = mesh(box(0.025, 0.02, 0.42), brassM, 0.33, 0.68, -0.05); dv2.rotation.y = -0.1; tbl.add(dv2);

  /* --- a compass rose set into the floor in front of the console --- */
  const rose = new THREE.Group(); rose.position.set(0, 0.015, 0.95); rose.rotation.x = -Math.PI/2; d.add(rose);
  rose.add(new THREE.Mesh(new THREE.RingGeometry(1.0, 1.1, 32), brassM));
  rose.add(new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), mat(0x262a33)));
  const star = (R, r, n) => { const s = new THREE.Shape(); for(let k=0;k<n*2;k++){ const a = k/(n*2)*Math.PI*2 + Math.PI/2, q = k % 2 ? r : R; k ? s.lineTo(Math.cos(a)*q, Math.sin(a)*q) : s.moveTo(Math.cos(a)*q, Math.sin(a)*q); } return new THREE.ShapeGeometry(s); };
  const s8 = new THREE.Mesh(star(0.72, 0.2, 8), mat(0x8a6a3a, {metalness:0.5, roughness:0.5})); s8.rotation.z = Math.PI/8; s8.position.z = 0.003; rose.add(s8);
  const s4 = new THREE.Mesh(star(0.95, 0.16, 4), mat(0xa8382a)); s4.position.z = 0.006; rose.add(s4);
  rose.add(mesh(new THREE.CircleGeometry(0.1, 10), cream, 0, 0, 0.009));

  /* --- lantern glints: hanging storm lanterns on the side walls (emissive, no lights) --- */
  const lamps = [];
  [4.65, 1.8].forEach(th => {
    const [x, , z] = onRing(6.75, th, 0), L = new THREE.Group(); L.position.set(x, 3.15, z); d.add(L);
    L.add(mesh(cyl(0.02, 0.02, 0.6, 4), iron, 0, 0.55, 0));
    L.add(mesh(cyl(0.16, 0.2, 0.08, 6), iron, 0, 0.24, 0), mesh(cyl(0.18, 0.18, 0.06, 6), iron, 0, -0.24, 0));
    const lm = new THREE.MeshStandardMaterial({color:0xffd27a, emissive:0xffc860, emissiveIntensity:1.8, flatShading:true});
    L.add(mesh(cyl(0.13, 0.13, 0.42, 6), lm, 0, 0, 0)); lamps.push(lm);
  });

  // decor never steals a click from the stations
  d.traverse(o => { o.raycast = () => {}; });
  return {wheel, lamps};
}

export default function build(){
  const g = new THREE.Group(), items = [], K = DATA.contact;
  g.add(floorDisc(7.6, 0x2b2f38, 12));
  const dark = mat(0x1d2129);
  for(let k=0;k<16;k++){ const a = k/16*Math.PI*2; if(Math.cos(a) > 0.45) continue; g.add(mesh(box(0.16, 6.2, 0.16), dark, Math.sin(a)*7.3, 3.1, Math.cos(a)*7.3)); }
  const topRing = mesh(new THREE.TorusGeometry(7.3, 0.12, 6, 48), dark, 0, 6.2, 0); topRing.rotation.x = Math.PI/2; g.add(topRing);
  g.add(arcWall(7.35, 1.1, 0x252a33, Math.PI/2 + 0.45, Math.PI - 0.9));
  const sky = starField(500, 30, 45, -5, 0.35); g.add(sky);

  /* the lens: raised on a pedestal behind the hero console, so it crowns the centre instead of hiding it */
  g.add(mesh(cyl(0.75, 0.95, 2.7, 8), dark, 0, 1.35, -4.4));
  const lens = new THREE.Group(); lens.position.set(0, 2.7, -4.4); lens.scale.setScalar(0.85); g.add(lens);
  lens.add(mesh(cyl(1.0, 1.25, 1.0, 8), brass(), 0, 0.5, 0));
  for(let k=0;k<6;k++){ const t = mesh(new THREE.TorusGeometry(0.95 - Math.abs(k - 2.5)*0.12, 0.09, 6, 24), glow(0xffd98a, 0.55), 0, 1.3 + k*0.32, 0); t.rotation.x = Math.PI/2; t.castShadow = false; lens.add(t); }
  const coreMat = new THREE.MeshStandardMaterial({color:0xfff2c8, emissive:0xfff2c8, emissiveIntensity:2, flatShading:true});
  const core = mesh(new THREE.SphereGeometry(0.42, 14, 10), coreMat, 0, 2.1, 0); core.castShadow = false; lens.add(core);
  lens.add(mesh(new THREE.ConeGeometry(1.0, 0.7, 8), mat(0xa8382a), 0, 3.4, 0));
  lens.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), brass(), 0, 3.85, 0));
  lens.add(mesh(cyl(1.12, 1.12, 0.1, 8), brass(), 0, 1.02, 0), mesh(cyl(1.08, 1.0, 0.12, 8), brass(), 0, 3.06, 0));
  // brass astragals caging the prism rings; the cage turns slowly
  const cage = new THREE.Group(); cage.position.y = 2.05; lens.add(cage);
  const astr = [];
  for(let k=0;k<8;k++){ const a = k/8*Math.PI*2; astr.push([Math.cos(a)*1.0, 0, Math.sin(a)*1.0, 0, -a, 0]); }
  cage.add(inst(box(0.06, 2.0, 0.06), brass(), astr));
  // a soft additive halo round the core: behind the console, so the board's own pixels always sit on top of it
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex(), color:0xfff0c0, transparent:true, opacity:0.55, depthWrite:false, blending:THREE.AdditiveBlending}));
  halo.scale.setScalar(3.2); halo.position.y = 2.1; halo.raycast = () => {}; lens.add(halo);
  // pedestal: stepped plinth and brass bands
  g.add(mesh(cyl(1.15, 1.25, 0.3, 8), dark, 0, 0.15, -4.4));
  [0.9, 1.9, 2.62].forEach(y => g.add(mesh(cyl(0.83 - y*0.03, 0.85 - y*0.03, 0.1, 8), brass(), 0, y, -4.4)));
  const beamMat = new THREE.MeshBasicMaterial({color:0xfff0b8, transparent:true, opacity:0.08, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending});
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 16, 1, true), beamMat);
  beam.geometry.translate(0, -7, 0); beam.rotation.z = Math.PI/2;   // points +x; pivot angle a aims it at (cos a, 0, -sin a)
  const pivot = new THREE.Group(); pivot.position.y = 2.1; pivot.add(beam); lens.add(pivot);
  // beam only shows while it points out the back windows (away from the camera), so it never washes over text
  const aimBeam = a => { pivot.rotation.y = a; beamMat.opacity = 0.1 * Math.max(0, Math.sin(a)) ** 4; };
  aimBeam(Math.PI/2 + 0.55);

  const props = dress(g, dark, brass());
  // dust motes drifting up through the lantern light
  const NM = 46, motePos = new Float32Array(NM*3), moteSeed = [];
  for(let k=0;k<NM;k++){ const a = r01()*Math.PI*2, r = 0.4 + r01()*2.6; moteSeed.push([a, r, r01()*6, 0.15 + r01()*0.25]); }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({color:0xffe2a0, size:0.06, transparent:true, opacity:0.7, depthWrite:false, blending:THREE.AdditiveBlending}));
  motes.position.set(0, 0, -4.6); motes.raycast = () => {}; g.add(motes);
  const placeMotes = t => { moteSeed.forEach(([a, r, y0, v], k) => { const y = (y0 + t*v) % 6.0; motePos.set([Math.cos(a + t*0.05)*r, y, Math.sin(a + t*0.05)*r*0.6], k*3); }); moteGeo.attributes.position.needsUpdate = true; };
  placeMotes(0);

  const Y = 2.15;   // shared centre height of the three stations

  /* left: intro board */
  const introG = new THREE.Group(); introG.position.set(-4.3, 0, -1.2); introG.rotation.y = 0.32; g.add(introG);
  introG.add(mesh(cyl(0.06, 0.08, 1.0, 6), dark, 0, 0.5, -0.05));
  const intro = panel(3.3, 2.9, (ctx, W, H, st) => {
    card(ctx, W, H, st, {bg:'rgba(12,18,34,.96)', r:16});
    const x = 24, mw = W - 48; let y = 24;
    eyebrow(ctx, 'Beacon Point · Contact', x, y, COL.ember, 12); y += 26;
    ctx.font = `400 34px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText("Let's connect", x, y); y += 50;
    ctx.font = `400 16px ${FB}`; ctx.fillStyle = '#d8d4c8'; y = para(ctx, K.intro, x, y, mw, 23, 6) + 14;
    if(K.location){ ctx.font = `600 15px ${FB}`; ctx.fillStyle = COL.ember; ctx.fillText(clip(ctx, '⌖  ' + K.location, mw), x, y); }
  });
  intro.position.set(0, Y, 0); introG.add(intro);
  const introC = new V3(0, Y, 0).applyAxisAngle(new V3(0,1,0), 0.32).add(introG.position);
  items.push(item({obj:introG, panels:[intro], view:view(introC, 3.9, 3.3, faceY(0.32)), label:`${K.intro} ${K.location ? 'Based in ' + K.location + '.' : ''}`}));

  // a raised, rimmed button: body box + canvas face; focus lifts it and lights the rim
  function button(parent, w, h, x, y, base, draw){
    const b = new THREE.Group(); b.position.set(x, y, 0); parent.add(b);
    const rim = rimMat(base);
    b.add(mesh(box(w + 0.08, h + 0.08, 0.14), rim, 0, 0, 0));
    const p = panel(w, h, draw); p.position.z = 0.075; b.add(p);
    const setFocus = on => { setPanel(p, {focus:on}); rim.emissiveIntensity = on ? 1.5 : base; b.position.z = on ? 0.1 : 0; };
    return {b, p, setFocus};
  }

  /* centre: the hero "Email me" console */
  if(K.email){
    const heroG = new THREE.Group(); heroG.position.set(0, 0, -1.0); g.add(heroG);
    heroG.add(mesh(box(1.4, Y - 1.25, 0.6), dark, 0, (Y - 1.25)/2, -0.1));
    heroG.add(mesh(box(3.84, 2.64, 0.14), rimMat(0.45), 0, Y, -0.08));
    const board = panel(3.7, 2.5, (ctx, W, H) => {
      rr(ctx, 0, 0, W, H, 14); const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#141b30'); gr.addColorStop(1, '#0d1222'); ctx.fillStyle = gr; ctx.fill();
      const x = 26, mw = W - 52;
      eyebrow(ctx, 'The beacon is lit · say hello', x, 22, COL.ember, 12);
      ctx.font = `400 50px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText('Email me', x, 42);
      fitFont(ctx, K.email, mw, 22, 600, FB, 13); ctx.fillStyle = COL.ember; ctx.fillText(K.email, x, 108);
      ctx.font = `400 14px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText('Copy the address, or open your mail app.', x, 142);
    });
    board.position.set(0, Y, 0); heroG.add(board);
    let tm;
    const copyBtn = button(heroG, 1.62, 0.6, -0.89, Y - 0.82, 0.25, (ctx, W, H, st) => {
      rr(ctx, 3, 3, W - 6, H - 6, 12);
      ctx.fillStyle = st.copied === 'ok' ? COL.moss : st.copied === 'fail' ? '#ec6f66' : COL.ember; ctx.fill();
      if(st.focus){ ctx.lineWidth = 4; ctx.strokeStyle = '#fff6dc'; ctx.stroke(); }
      const t = st.copied === 'ok' ? 'Copied ✓' : st.copied === 'fail' ? "Couldn't copy" : '⧉  Copy address';
      ctx.textAlign = 'center'; fitFont(ctx, t, W - 24, 19, 700, FB, 12); ctx.fillStyle = '#1a1408'; ctx.fillText(t, W/2, H/2 - 10);
    });
    const mailBtn = button(heroG, 1.62, 0.6, 0.89, Y - 0.82, 0.12, (ctx, W, H, st) => {
      rr(ctx, 3, 3, W - 6, H - 6, 12); ctx.fillStyle = '#1b2236'; ctx.fill();
      ctx.lineWidth = st.focus ? 4 : 2; ctx.strokeStyle = st.focus ? '#fff6dc' : COL.ember; ctx.stroke();
      const t = '✉  Write an email ↗';
      ctx.textAlign = 'center'; fitFont(ctx, t, W - 24, 18, 700, FB, 12); ctx.fillStyle = COL.ink; ctx.fillText(t, W/2, H/2 - 10);
    });
    const heroV = view(new V3(0, Y - 0.1, -1.0), 4.3, 3.2);
    items.push(item({obj:copyBtn.b, hits:[copyBtn.b, board], setFocus:copyBtn.setFocus, view:heroV,
      label:`Email me at ${K.email}. Press Enter to copy the address.`,
      activate(){
        const show = s => { setPanel(copyBtn.p, {copied:s}); clearTimeout(tm); tm = setTimeout(() => setPanel(copyBtn.p, {copied:false}), 2200); };
        const ok = () => { show('ok'); hooks.announce(`Email address ${K.email} copied to clipboard`); };
        const fail = () => { show('fail'); hooks.announce(`Couldn't copy. The address is ${K.email}`); };
        try { navigator.clipboard.writeText(K.email).then(ok, fail); } catch(e){ fail(); }
      }}));
    items.push(item({obj:mailBtn.b, setFocus:mailBtn.setFocus, view:heroV,
      label:`Write an email to ${K.email} in your mail app.`, activate(){ location.href = 'mailto:' + K.email; }}));
  }

  /* right: console of lit link buttons */
  const lastSeg = u => u.split('/').filter(Boolean).pop();
  const links = [
    K.linkedin && {glyph:'in', label:'LinkedIn', value:lastSeg(K.linkedin), url:K.linkedin},
    K.github && {glyph:'</>', label:'GitHub', value:shortUrl(K.github), url:K.github},
    K.medium && {glyph:'M', label:'Medium', value:lastSeg(K.medium), url:K.medium},
    DATA.resume && {glyph:'⤓', label:'Résumé', value:'PDF download', url:DATA.resume}
  ].filter(Boolean);
  if(links.length){
    const TW = 1.6, TH = 1.12, GAP = 0.16, cols = links.length > 1 ? 2 : 1, rows = Math.ceil(links.length/cols);
    const gw = cols*TW + (cols - 1)*GAP, gh = rows*TH + (rows - 1)*GAP;
    const gridG = new THREE.Group(); gridG.position.set(4.3, 0, -1.2); gridG.rotation.y = -0.32; g.add(gridG);
    gridG.add(mesh(box(gw + 0.3, gh + 0.3, 0.12), dark, 0, Y, -0.12));
    [-1, 1].forEach(s => gridG.add(mesh(box(0.1, Y - gh/2 - 0.15, 0.1), brass(), s*(gw/2 - 0.1), (Y - gh/2 - 0.15)/2, -0.12)));
    // a dark backing plate keeps the heading legible over the stair and windows behind it
    const head = panel(gw + 0.3, 0.36, (ctx, W, H) => {
      eyebrow(ctx, 'Find me elsewhere', 15, 8, 'rgba(0,0,0,0)', 15);   // sets the font so the plate can be measured
      rr(ctx, 0, 0, Math.min(W, ctx.measureText('FIND ME ELSEWHERE').width + 30), H, 8); ctx.fillStyle = 'rgba(12,18,34,.9)'; ctx.fill();
      eyebrow(ctx, 'Find me elsewhere', 15, 8, COL.muted, 15);
    });
    head.position.set(0, Y + gh/2 + 0.36, -0.05); gridG.add(head);
    const gridV = view(new V3(0, Y + 0.1, 0).applyAxisAngle(new V3(0,1,0), -0.32).add(gridG.position), gw + 0.6, gh + 0.9, faceY(-0.32));
    links.forEach((L, k) => {
      const col = k % cols, row = Math.floor(k/cols);
      const x = (col - (cols - 1)/2)*(TW + GAP), y = Y + ((rows - 1)/2 - row)*(TH + GAP);
      const btn = button(gridG, TW, TH, x, y, 0.18, (ctx, W, H, st) => {
        rr(ctx, 3, 3, W - 6, H - 6, 12);
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, st.focus ? '#3a3322' : '#2a2f3c'); gr.addColorStop(1, '#1d212b'); ctx.fillStyle = gr; ctx.fill();
        ctx.lineWidth = st.focus ? 4 : 2; ctx.strokeStyle = st.focus ? COL.ember : 'rgba(216,180,106,.55)'; ctx.stroke();
        ctx.beginPath(); ctx.arc(34, 36, 20, 0, 6.3); ctx.fillStyle = '#d8b46a'; ctx.fill();
        ctx.textAlign = 'center'; fitFont(ctx, L.glyph, 30, 18, 700, FB, 10); ctx.fillStyle = '#1d212b'; ctx.fillText(L.glyph, 34, 26);
        ctx.textAlign = 'right'; ctx.font = `700 18px ${FB}`; ctx.fillStyle = st.focus ? COL.ember : COL.muted; ctx.fillText('↗', W - 14, 14);
        ctx.textAlign = 'left'; fitFont(ctx, L.label, W - 28, 20, 700, FB, 13); ctx.fillStyle = COL.ink; ctx.fillText(L.label, 16, 66);
        ctx.font = `500 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(clip(ctx, L.value, W - 30), 16, 92);
      });
      items.push(item({obj:btn.b, setFocus:btn.setFocus, view:gridV, label:`${L.label}: ${L.value}. Opens in a new tab.`, activate:() => openLink(L.url)}));
    });
  }

  return {group:g, items, start:K.email ? 1 : 0, frame:view(new V3(0, 2.75, -1.2), 12.2, 5.4),
    light:{key:[0, 4.2, -2.6, 0xfff0b8, 1.6], fill:[0, 6, 5, 0x8fa3d8, 0.6]}, heroSpot:new V3(-2.75, 0, -3.9),
    update(t){
      if(reduce) return;
      aimBeam(t*0.6); cage.rotation.y = t*0.15;
      coreMat.emissiveIntensity = 1.8 + Math.sin(t*2)*0.3; sky.rotation.y = t*0.01;
      halo.material.opacity = 0.48 + Math.sin(t*2)*0.08;
      props.lamps.forEach((m, k) => { m.emissiveIntensity = 1.6 + Math.sin(t*9 + k*2)*0.12 + Math.sin(t*23 + k)*0.08; });
      props.wheel.rotation.z = Math.sin(t*0.4)*0.06;
      placeMotes(t);
    }};
}
