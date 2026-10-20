/* Small reusable meshes: trees, rocks, gates, anvils, star fields, plus an instancing helper. */
import { THREE, V3, ZN, reduce, touch, mat, mesh, glow, box, cyl, rnd, vivid } from '../engine.js';

export function tree(s=1){
  const g = new THREE.Group();
  g.add(mesh(cyl(0.12*s, 0.18*s, 0.7*s, 5), mat(0x5a3d28), 0, 0.35*s, 0));
  const c1 = rnd() > 0.5 ? 0x2f6b3a : 0x3b7d3f;
  g.add(mesh(new THREE.ConeGeometry(0.9*s, 1.6*s, 6), mat(c1), 0, 1.3*s, 0));
  g.add(mesh(new THREE.ConeGeometry(0.65*s, 1.3*s, 6), mat(c1), 0, 2.05*s, 0));
  g.rotation.y = rnd()*6;
  return g;
}
/* Trees are modelled from many small parts, then baked: every non-glowing part is merged into one vertex-coloured
   mesh (one draw call per tree however detailed it is); glowing parts stay separate so they keep their glow. */
const bakedM = new THREE.MeshStandardMaterial({vertexColors:true, flatShading:true, roughness:0.9});
const _bc = new THREE.Color();
function bake(g){
  const ry = g.rotation.y; g.rotation.set(0, 0, 0); g.updateMatrixWorld(true);
  const out = new THREE.Group(), pos = [], nor = [], col = [];
  g.traverse(o => {
    if(!o.isMesh) return;
    if(o.material.emissiveIntensity > 0.5){ const k = o.clone(); o.matrixWorld.decompose(k.position, k.quaternion, k.scale); out.add(k); return; }   // glowing parts stay their own mesh
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    vivid(_bc.copy(o.material.color));
    const n = geo.attributes.position.count;
    pos.push(geo.attributes.position.array); nor.push(geo.attributes.normal.array);
    const c = new Float32Array(n*3); for(let i = 0; i < n; i++) c.set([_bc.r, _bc.g, _bc.b], i*3); col.push(c);
  });
  const cat = arrs => { const a = new Float32Array(arrs.reduce((t, x) => t + x.length, 0)); let o = 0; arrs.forEach(x => { a.set(x, o); o += x.length; }); return a; };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(cat(pos), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(cat(nor), 3)); geo.setAttribute('color', new THREE.BufferAttribute(cat(col), 3));
  const m = new THREE.Mesh(geo, bakedM); m.castShadow = m.receiveShadow = true; out.add(m);
  out.rotation.y = ry; return out;
}
const shade = (c, f) => new THREE.Color(c).multiplyScalar(f).getHex();   // darker for undersides, lighter for crowns' tops
const blob = (geo, c, x, y, z, sx, sy, sz, r) => { const m = mesh(geo, mat(c), x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(r()*3, r()*3, 0); return m; };
const ICO = new THREE.IcosahedronGeometry(1, 0), DOD = new THREE.DodecahedronGeometry(1, 0);
// a trunk: a flared root base and a tapering bole
function trunk(g, s, c, r0, r1, h, x = 0, z = 0, lean = 0){
  g.add(mesh(new THREE.ConeGeometry(r0*1.9*s, 0.28*s, 6), mat(shade(c, 0.85)), x, 0.1*s, z));
  const b = mesh(cyl(r1*s, r0*s, h*s, 6), mat(c), x - Math.sin(lean)*h*s/2, h*s/2, z); b.rotation.z = lean; g.add(b);
  return [x - Math.sin(lean)*h*s, h*s];
}
// a branch from (x, y) out along angle a (around y) and tilt t (from vertical)
function branch(g, s, c, x, y, z, a, t, len, rad){
  const b = new THREE.Group(); b.position.set(x, y, z); b.rotation.set(0, a, -t); g.add(b);
  b.add(mesh(cyl(rad*0.6*s, rad*s, len*s, 5), mat(c), 0, len*s/2, 0));
  const e = new THREE.Vector3(0, len*s, 0).applyEuler(b.rotation).add(b.position); return [e.x, e.y, e.z];
}

// a slim Italian cypress (the Lyceum's grounds); some have twin tops
export function cypress(s=1, r=rnd){
  const g = new THREE.Group(), c = r() > 0.5 ? 0x2f5a34 : 0x355f38;
  trunk(g, s, 0x5a3d28, 0.1, 0.07, 0.45);
  g.add(mesh(new THREE.ConeGeometry(0.36*s, 1.6*s, 7), mat(shade(c, 0.8)), 0, 1.05*s, 0));
  g.add(mesh(new THREE.ConeGeometry(0.32*s, 1.5*s, 7), mat(c), 0.02*s, 1.6*s, 0.02*s));
  const twin = r() < 0.35;
  [[0, 2.25, 0.24, 1.1], ...(twin ? [[0.12, 2.15, 0.16, 0.8]] : [])].forEach(([x, y, k, h]) => g.add(mesh(new THREE.ConeGeometry(k*s, h*s, 7), mat(shade(c, 1.15)), x*s, y*s, 0)));
  g.rotation.y = r()*6; return bake(g);
}
// Hearthstone: an autumn maple, its crown in ember reds and golds, leaves fallen round its foot
export function maple(s=1, r=rnd){
  const g = new THREE.Group(), C = [0xc8642a, 0xd88a2e, 0xb8442a, 0xe0a840], bark = 0x4a3324;
  const [tx, ty] = trunk(g, s, bark, 0.16, 0.09, 1.05);
  [[0.4, 0.75], [2.4, 0.7], [4.3, 0.8]].forEach(([a, t]) => branch(g, s, bark, tx, ty*0.82, 0, a, t, 0.5, 0.06));
  [[0, 1.6, 0, 0.6, 1], [0.38, 1.38, 0.18, 0.46, 0.85], [-0.36, 1.42, -0.14, 0.48, 0.85], [0.14, 1.36, -0.4, 0.42, 0.8], [-0.2, 1.4, 0.38, 0.42, 0.85], [0.05, 2.0, 0.05, 0.42, 1.12], [0.3, 1.82, -0.15, 0.3, 1.1]].forEach(([x, y, z, k, f], i) =>
    g.add(blob(ICO, shade(C[(i + Math.floor(r()*4)) % 4], f), x*s, y*s, z*s, k*s, k*s*0.85, k*s, r)));
  for(let k = 0; k < 9; k++){ const a = r()*6.3, d = (0.35 + r()*0.55)*s, l = mesh(box(0.12*s, 0.015, 0.09*s), mat(C[k % 4]), Math.cos(a)*d, 0.02, Math.sin(a)*d); l.rotation.y = r()*3; g.add(l); }
  g.rotation.y = r()*6; return bake(g);
}
// Oakreach: a broad oak, a short thick trunk, limbs reaching out under a wide low canopy, darker beneath
export function oak(s=1, r=rnd){
  const g = new THREE.Group(), C = [0x4f7f3a, 0x5e8f43, 0x44703a], bark = 0x4e3523;
  const [tx, ty] = trunk(g, s, bark, 0.25, 0.15, 0.9);
  const tips = [[0.3, 1.0], [2.2, 0.95], [4.2, 1.05], [5.4, 0.9]].map(([a, t]) => branch(g, s, bark, tx, ty*0.85, 0, a, t, 0.62, 0.08));
  tips.forEach(([x, y, z], i) => g.add(blob(DOD, shade(C[i % 3], 0.78), x, y + 0.1*s, z, 0.42*s, 0.3*s, 0.42*s, r)));   // under-canopy, in shade
  [[0, 1.55, 0, 0.62, 1], [0.48, 1.42, 0.12, 0.46, 0.95], [-0.46, 1.45, -0.1, 0.48, 0.95], [0.1, 1.45, 0.46, 0.44, 0.95], [-0.08, 1.45, -0.48, 0.44, 0.95], [0.12, 1.9, 0.05, 0.42, 1.12], [-0.25, 1.82, 0.2, 0.32, 1.1]].forEach(([x, y, z, k, f], i) =>
    g.add(blob(DOD, shade(C[i % 3], f), x*s, y*s, z*s, k*s, k*s*0.72, k*s, r)));
  g.rotation.y = r()*6; return bake(g);
}
// Forgewell: an umbrella pine, a tall bare trunk with a kink and a fork, a flat layered crown, cones at its foot
export function umbrella(s=1, r=rnd){
  const g = new THREE.Group(), lean = (r() - 0.5)*0.25, bark = 0x5a4030;
  const [tx, ty] = trunk(g, s, bark, 0.12, 0.07, 1.75, 0, 0, lean);
  const ends = [[-0.6, 0.85], [2.0, 0.9], [3.9, 0.8]].map(([a, t]) => branch(g, s, bark, tx, ty, 0, a, t, 0.42, 0.05));
  ends.forEach(([x, y, z]) => g.add(blob(DOD, 0x40602e, x, y + 0.05*s, z, 0.5*s, 0.16*s, 0.5*s, r)));
  g.add(blob(DOD, 0x4a6a34, tx, ty + 0.3*s, 0, 0.88*s, 0.24*s, 0.82*s, r), blob(DOD, 0x5a7a3e, tx + 0.12*s, ty + 0.46*s, -0.08*s, 0.62*s, 0.18*s, 0.58*s, r));
  for(let k = 0; k < 3; k++){ const a = r()*6.3, d = (0.4 + r()*0.4)*s; g.add(mesh(new THREE.DodecahedronGeometry(0.05*s, 0), mat(0x6b4a30), Math.cos(a)*d, 0.04, Math.sin(a)*d)); }
  g.rotation.y = r()*6; return bake(g);
}
// Lorehall: wisteria, a twisting trunk with a small crown hung all round with long lilac blossom, petals on the ground
export function wisteria(s=1, r=rnd){
  const g = new THREE.Group(), bark = 0x5a4636, P = [0xb48cff, 0x9a6ad8, 0xc9a8ff, 0x8e5cc8, 0xd8c0ff];
  trunk(g, s, bark, 0.13, 0.09, 0.6, 0.04*s, 0, 0.22);
  const [bx, by, bz] = branch(g, s, bark, -0.06*s, 0.58*s, 0, 0, 0.35, 0.65, 0.08);
  branch(g, s, bark, -0.02*s, 0.95*s, 0, 2.8, 0.9, 0.45, 0.05);
  [[0, 0.1, 0, 0.6, 0.38], [0.35, 0, 0.2, 0.4, 0.3], [-0.3, 0.02, -0.2, 0.42, 0.3]].forEach(([x, y, z, k, h], i) => g.add(blob(DOD, i ? 0x4a7236 : 0x557d3c, bx + x*s, by + y*s, bz + z*s, k*s, h*s, k*s, r)));
  const cone = new THREE.ConeGeometry(0.11*s, 0.72*s, 5), tip = new THREE.ConeGeometry(0.06*s, 0.3*s, 5);
  for(let k = 0; k < 16; k++){
    const an = k*0.39 + r()*0.25, d = (0.32 + r()*0.32)*s, x = bx + Math.cos(an)*d, z = bz + Math.sin(an)*d, y = by - 0.1*s - r()*0.18*s;
    const h = mesh(cone, mat(P[k % 4]), x, y - 0.36*s, z); h.rotation.x = Math.PI; g.add(h);
    const t = mesh(tip, mat(P[4]), x, y - 0.78*s, z); t.rotation.x = Math.PI; g.add(t);
  }
  for(let k = 0; k < 10; k++){ const a = r()*6.3, d = (0.2 + r()*0.6)*s, l = mesh(box(0.07*s, 0.012, 0.07*s), mat(P[k % 5]), bx + Math.cos(a)*d, 0.02, bz + Math.sin(a)*d); l.rotation.y = r()*3; g.add(l); }
  g.rotation.y = r()*6; return bake(g);
}
// Beacon Point: a coastal pine bent by the sea wind; flattened pads stream along the lean, all trees lean the same way (local +x, turned by `wind`)
export function windswept(s=1, r=rnd, wind = 0.8){
  const g = new THREE.Group(), bark = 0x4e3a2c, C = [0x2f5f4a, 0x3b6e52, 0x2a5442];
  trunk(g, s, bark, 0.13, 0.09, 0.6, 0.06*s, 0, -0.3);
  const [mx, my, mz] = branch(g, s, bark, 0.24*s, 0.56*s, 0, 0, 1.05, 0.75, 0.07);
  branch(g, s, bark, 0.4*s, 0.75*s, 0, 0.5, 1.2, 0.45, 0.04);
  [[-0.32, 0.12, 0, 0.42, 0.95], [0.02, 0.06, 0.08, 0.5, 1], [0.38, 0.0, -0.06, 0.46, 1.05], [0.68, -0.06, 0.08, 0.34, 1.1], [0.1, 0.2, -0.12, 0.32, 1.15]].forEach(([x, y, z, k, f], i) =>
    g.add(blob(DOD, shade(C[i % 3], f), mx + x*s, my + y*s, mz + z*s, k*s*1.4, k*s*0.42, k*s, r)));
  [-0.5, 0.5].forEach(z => { const root = mesh(new THREE.ConeGeometry(0.05*s, 0.5*s, 4), mat(bark), -0.2*s, 0.06, z*0.3*s); root.rotation.z = Math.PI/2 - 0.2; g.add(root); });   // roots gripping on the windward side
  g.rotation.y = wind + (r() - 0.5)*0.3; return bake(g);
}
// Runespire: a narrow blue-black spruce of drooping tiers; some carry a rune crystal at the tip, and a few small ones at the roots
export function spruce(s=1, r=rnd){
  const g = new THREE.Group(), c = r() > 0.5 ? 0x2c4a52 : 0x33545c;
  trunk(g, s, 0x3a2e28, 0.09, 0.06, 0.55);
  [[0.56, 0.78], [0.5, 1.15], [0.42, 1.52], [0.34, 1.88], [0.26, 2.22], [0.17, 2.52]].forEach(([k, y], i) => {
    g.add(mesh(new THREE.ConeGeometry(k*s, 0.48*s, 8), mat(shade(c, 0.75)), (r() - 0.5)*0.04*s, (y - 0.08)*s, 0));   // the tier's shaded underside
    const t = mesh(new THREE.ConeGeometry(k*0.92*s, 0.5*s, 8), mat(shade(c, 1 + i*0.04)), 0, y*s, 0); t.rotation.y = i*0.4; g.add(t);
  });
  if(r() < 0.45){ const t = mesh(new THREE.OctahedronGeometry(0.08*s, 0), glow(0x6fe3ff, 1.5), 0, 2.88*s, 0); t.scale.y = 1.8; t.castShadow = false; g.add(t); }
  if(r() < 0.35) for(let k = 0; k < 2; k++){ const a = r()*6.3, cr = mesh(new THREE.OctahedronGeometry(0.06*s, 0), glow(k ? 0xb48cff : 0x6fe3ff, 1.3), Math.cos(a)*0.32*s, 0.08*s, Math.sin(a)*0.32*s); cr.scale.y = 2; cr.rotation.z = (r() - 0.5)*0.6; cr.castShadow = false; g.add(cr); }
  g.rotation.y = r()*6; return bake(g);
}
export function rock(s=1){
  const m = mesh(new THREE.DodecahedronGeometry(0.5*s, 0), mat(rnd()>0.5?0x6d717a:0x5b5f68), 0, 0.2*s, 0);
  m.scale.set(1, 0.6, 1); m.rotation.set(rnd(), rnd()*6, rnd());
  return m;
}
export function gate(){
  const g = new THREE.Group(), red = mat(0x9a2f22), dark = mat(0x3a1c18);
  g.add(mesh(cyl(0.16,0.2,2.6,6), red, -1.25, 1.3, 0));
  g.add(mesh(cyl(0.16,0.2,2.6,6), red, 1.25, 1.3, 0));
  g.add(mesh(box(3.4,0.22,0.36), dark, 0, 2.65, 0));
  g.add(mesh(box(3.0,0.16,0.26), red, 0, 2.2, 0));
  return g;
}
export function anvil(){
  const a = new THREE.Group();
  a.add(mesh(box(0.45,0.5,0.35), mat(0x3d4048), 0, 0.25, 0));
  a.add(mesh(box(1.0,0.28,0.45), mat(0x2f3238), 0.1, 0.62, 0));
  return a;
}
export function starField(n, rMin, rMax, yOff, size){
  const pos = new Float32Array(n*3);
  for(let i=0;i<n;i++){ const u = rnd()*2-1, a = rnd()*Math.PI*2, r = rMin + rnd()*(rMax-rMin), s = Math.sqrt(1-u*u); pos.set([Math.cos(a)*s*r, Math.abs(u)*r*0.8 + yOff, Math.sin(a)*s*r], i*3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({color:0xc9d4ff, size, sizeAttenuation:true, fog:false}));
}
/* many copies, one draw call: rows of [x, y, z, sx, sy, sz, ry, color?, rx?, rz?] on a unit geometry */
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), P3 = new V3(), S3 = new V3(), C3 = new THREE.Color();
export function instanced(geo, material, rows, shadow = true){
  const im = new THREE.InstancedMesh(geo, material, rows.length);
  rows.forEach((a, i) => {
    Q.setFromEuler(EU.set(a[8] || 0, a[6] || 0, a[9] || 0));
    im.setMatrixAt(i, M4.compose(P3.set(a[0], a[1], a[2]), Q, S3.set(a[3], a[4], a[5])));
    if(a[7] != null) im.setColorAt(i, C3.setHex(a[7]));
  });
  im.castShadow = shadow; im.receiveShadow = true;
  return im;
}
