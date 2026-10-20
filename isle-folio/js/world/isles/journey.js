/* Oakreach (journey): the Chronicle hall, a timber-framed hall near a great old oak, with a garden, a well and milestones along the paths. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';

// local seeded random (never touch engine rnd(): it's a shared sequence)
let seed = 4242;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const WOOD = 0x4a3222, PLANK = 0x7a5434, DOOR = 0x6b4026, PLASTER = 0xe8dfc6, STONE = 0x857f74, ROOF = 0x8c3b2b, ROOF_D = 0x6e2c20, GREEN = 0x3f6b4a, LIT = 0xffcf7a;

/* (x, y) outline extruded along z, centred on z = 0: gables, roofs */
function prism(pts, depth){
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1]));
  return new THREE.ExtrudeGeometry(s, {depth, bevelEnabled:false}).translate(0, 0, -depth/2);
}
/* a lit window on a group facing +z: glowing pane, cross mullions, sill */
function windowOn(g, x, y, z, ry, w = 0.46){
  const o = new THREE.Group(); o.position.set(x, y, z); o.rotation.y = ry; g.add(o);
  const pane = mesh(box(w, w, 0.04), glow(LIT, 1.8)); pane.castShadow = false; o.add(pane);
  o.add(mesh(box(w + 0.08, 0.05, 0.06), mat(WOOD), 0, 0, 0.02), mesh(box(0.05, w + 0.08, 0.06), mat(WOOD), 0, 0, 0.02));
  o.add(mesh(box(w + 0.14, 0.06, 0.14), mat(WOOD), 0, -w/2 - 0.04, 0.05));
  return o;
}

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on).
   Inside (rooms/journey.js) is the Chronicle hall: oak posts on plinths, a plank
   wainscot under a chair rail, a truss with a carved tree-ring medallion in every bay, arched windows at both ends and
   lanterns on the posts. The hall outside wears the same timbers. */
export function building(animated){
  const g = new THREE.Group(), wood = mat(WOOD), oak = mat(0x6b4a30), oakLt = mat(0x8a6440), add = (...a) => g.add(mesh(...a));
  const HX = 1.9, HZ = 1.3, FT = 0.35, EH = 2.3;                       // half length (x), half depth (z), footing top, eaves
  // stone footing laid in courses
  add(box(2*HX + 0.24, FT, 2*HZ + 0.24), mat(STONE), 0, FT/2, 0);
  const D = new THREE.Object3D(), col = new THREE.Color(), STONES = [0x857f74, 0x7a746a, 0x908a7f, 0x6f6a61], rows = [];
  [[0, HZ + 0.12, HX + 0.12], [Math.PI/2, HX + 0.12, HZ + 0.12], [Math.PI, HZ + 0.12, HX + 0.12], [-Math.PI/2, HX + 0.12, HZ + 0.12]].forEach(([a, d, half], f) =>
    [0.09, 0.26].forEach((y, r) => { for(let u = -half + (r % 2)*0.2, j = 0; u < half - 0.05; u += 0.42, j++) rows.push([a, Math.min(u + 0.2, half - 0.2), y, d, STONES[(f + r + j) % 4]]); }));
  const stones = new THREE.InstancedMesh(box(0.38, 0.15, 0.04), new THREE.MeshStandardMaterial({flatShading:true, roughness:0.95}), rows.length);
  rows.forEach(([a, u, y, d, c], i) => { D.position.set(Math.sin(a)*d + Math.cos(a)*u, y, Math.cos(a)*d - Math.sin(a)*u); D.rotation.set(0, a, 0); D.updateMatrix(); stones.setMatrixAt(i, D.matrix); stones.setColorAt(i, col.setHex(c)); });
  stones.castShadow = stones.receiveShadow = true; g.add(stones);

  // walls: a dark plank wainscot under a chair rail, plaster above, a gable fill under the roof (ridge along x)
  add(box(2*HX, EH - FT, 2*HZ), mat(PLASTER), 0, (EH + FT)/2, 0);
  add(box(2*HX + 0.04, 0.62, 2*HZ + 0.04), mat(0x4a3222), 0, FT + 0.31, 0);
  const batt = [];
  for(let x = -HX + 0.2; x < HX; x += 0.28) [-1, 1].forEach(s => batt.push([x, s*(HZ + 0.03)]));
  for(let z = -HZ + 0.2; z < HZ; z += 0.28) [-1, 1].forEach(s => batt.push([s*(HX + 0.03), z, true]));
  const battIM = new THREE.InstancedMesh(box(0.04, 0.6, 0.04), mat(0x3a2618), batt.length);
  batt.forEach(([x, z], i) => { D.position.set(x, FT + 0.31, z); D.rotation.set(0, 0, 0); D.updateMatrix(); battIM.setMatrixAt(i, D.matrix); });
  battIM.castShadow = battIM.receiveShadow = true; g.add(battIM);
  add(box(2*HX + 0.12, 0.07, 2*HZ + 0.12), oakLt, 0, FT + 0.65, 0);                                      // chair rail
  add(prism([[-HZ, EH], [HZ, EH], [0, EH + 1.15]], 2*HX).rotateY(Math.PI/2), mat(PLASTER));               // gable fill

  // timber frame: posts on oak plinths with carved bands, top plate, knee braces at the posts
  const posts = [[-HX, HZ], [-0.72, HZ], [0.72, HZ], [HX, HZ], [-HX, -HZ], [-0.6, -HZ], [0.6, -HZ], [HX, -HZ], [-HX, 0], [HX, 0]];
  posts.forEach(([x, z]) => {
    add(box(0.16, EH - FT, 0.16), wood, x, (EH + FT)/2, z);
    add(box(0.24, 0.16, 0.24), oak, x, FT + 0.08, z);
    [1.6, 1.68].forEach(y => add(box(0.2, 0.03, 0.2), oakLt, x, y, z));
  });
  add(box(2*HX + 0.14, 0.14, 0.14), wood, 0, EH - 0.07, HZ + 0.02); add(box(2*HX + 0.14, 0.14, 0.14), wood, 0, EH - 0.07, -HZ - 0.02);
  [-1, 1].forEach(s => add(box(0.14, 0.14, 2*HZ + 0.14), wood, s*(HX + 0.02), EH - 0.07, 0));
  [[-0.72, 1], [0.72, -1], [-HX, 1], [HX, -1]].forEach(([x, d]) => { const b = mesh(box(0.42, 0.07, 0.06), oak, x + d*0.18, EH - 0.27, HZ + 0.06); b.rotation.z = d*Math.PI/4; g.add(b); });
  [[-0.6, 1], [0.6, -1]].forEach(([x, d]) => { const b = mesh(box(0.42, 0.07, 0.06), oak, x + d*0.18, EH - 0.27, -HZ - 0.06); b.rotation.z = d*Math.PI/4; g.add(b); });

  // roof: ridge along x, shingle courses, ridge cap, barge boards
  add(prism([[-1.62, 2.16], [0, 3.5], [1.62, 2.16], [1.62, 2.32], [0, 3.66], [-1.62, 2.32]], 2*HX + 0.5).rotateY(Math.PI/2), mat(ROOF));
  add(box(2*HX + 0.56, 0.12, 0.22), mat(ROOF_D), 0, 3.66, 0);
  const pitch = Math.atan(1.34/1.62);
  [0.4, 0.8, 1.2].forEach(d => [-1, 1].forEach(s => { const c = mesh(box(2*HX + 0.48, 0.035, 0.05), mat(ROOF_D), 0, 3.66 - d*1.34/1.62 + 0.02, s*d); c.rotation.x = s*pitch; g.add(c); }));
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => { const b = mesh(box(0.06, 0.16, 2.12), wood, sx*(HX + 0.26), 2.92, sz*0.81); b.rotation.x = sz*pitch; g.add(b); }));

  // gable ends: a truss (collar beam, king post, struts), a carved tree-ring medallion, a tall arched window under it
  const litM = glow(LIT, 1.4).clone();
  [-1, 1].forEach(s => {
    const x = s*(HX + 0.02), f = s*(HX + 0.05);
    add(box(0.08, 0.12, 2.0), wood, f, 2.55, 0);
    add(box(0.08, 0.5, 0.12), wood, f, 3.2, 0);
    [-1, 1].forEach(d => { const st = mesh(box(0.07, 0.46, 0.08), oak, f, 2.78, d*0.42); st.rotation.x = -d*0.75; g.add(st); });
    [[0.27, oak], [0.22, wood], [0.17, oakLt], [0.12, wood], [0.07, oak]].forEach(([r, m], k) => { const d = mesh(cyl(r, r, 0.04, 14), m, f + s*(0.03 + k*0.012), 2.98, 0); d.rotation.z = Math.PI/2; g.add(d); });
    const eye = mesh(cyl(0.035, 0.035, 0.04, 8), glow(0xf0a23a, 1.4), f + s*0.1, 2.98, 0); eye.rotation.z = Math.PI/2; eye.castShadow = false; g.add(eye);
    // the arched window: frame, lit panes, mullion and two transoms, keystone, sill
    const wg = new THREE.Group(); wg.position.set(x, 0, 0); wg.rotation.y = s*Math.PI/2; g.add(wg);
    wg.add(mesh(box(0.68, 0.8, 0.06), wood, 0, 1.42, 0.01));                                // between the chair rail and the top plate
    const pane = mesh(box(0.54, 0.7, 0.03), litM, 0, 1.42, 0.03); pane.castShadow = false; wg.add(pane);
    const ah = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 12, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2), litM, 0, 1.77, 0.03); ah.castShadow = false; wg.add(ah);
    wg.add(mesh(new THREE.TorusGeometry(0.31, 0.05, 4, 12, Math.PI), wood, 0, 1.77, 0.04));
    wg.add(mesh(box(0.04, 1.0, 0.03), wood, 0, 1.55, 0.06));
    [1.3, 1.55, 1.77].forEach(y => wg.add(mesh(box(0.54, 0.035, 0.03), wood, 0, y, 0.06)));
    wg.add(mesh(box(0.12, 0.14, 0.08), oakLt, 0, 2.1, 0.07), mesh(box(0.8, 0.06, 0.16), oak, 0, 1.06, 0.08));
  });

  // front: an arched oak door in a moulded frame, windows with shutters and flower boxes, lanterns on the posts
  const petals = [0xe891bd, 0xf2c14e, 0xf6efe0, 0xd85a5a];
  [-1.32, 1.32].forEach(x => {
    windowOn(g, x, 1.55, HZ, 0);
    [-1, 1].forEach(s => add(box(0.14, 0.5, 0.04), mat(GREEN), x + s*0.31, 1.55, HZ + 0.02));
    add(box(0.52, 0.13, 0.16), mat(DOOR), x, 1.19, HZ + 0.08);
    for(let k = 0; k < 4; k++) add(new THREE.OctahedronGeometry(0.06, 0), mat(petals[(k + (x > 0 ? 1 : 0)) % 4]), x - 0.18 + k*0.12, 1.29, HZ + 0.09 + (k % 2)*0.03);
  });
  [-0.6, 0.6].forEach(x => windowOn(g, x, 1.55, -HZ, Math.PI));
  add(box(0.66, 1.1, 0.06), mat(DOOR), 0, FT + 0.55, HZ + 0.01);
  const dtop = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 12, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2), mat(DOOR), 0, FT + 1.1, HZ + 0.01); g.add(dtop);
  [-0.16, 0, 0.16].forEach(x => add(box(0.015, 1.3, 0.01), mat(0x4a2e1c), x, FT + 0.7, HZ + 0.045));
  [0.7, 1.15].forEach(y => add(box(0.6, 0.05, 0.02), mat(0x2a2522), 0, y, HZ + 0.05));
  [-1, 1].forEach(s => add(box(0.1, 1.15, 0.1), oak, s*0.39, FT + 0.57, HZ + 0.05));
  add(new THREE.TorusGeometry(0.41, 0.05, 4, 12, Math.PI), oak, 0, FT + 1.12, HZ + 0.05);
  add(box(0.1, 0.14, 0.08), oakLt, 0, FT + 1.56, HZ + 0.08);
  add(box(0.06, 0.06, 0.05), mat(0xd8b04a, {metalness:0.5, roughness:0.4}), 0.2, 0.95, HZ + 0.07);
  const lampM = glow(0xffd27a, 2.0).clone();
  [-0.72, 0.72].forEach(x => {
    add(box(0.04, 0.04, 0.2), mat(0x2a2522), x, 1.95, HZ + 0.18);
    const lm = mesh(box(0.15, 0.2, 0.15), lampM, x, 1.82, HZ + 0.3); lm.castShadow = false; g.add(lm);
    const cap = mesh(new THREE.ConeGeometry(0.14, 0.1, 4), mat(0x2a2522), x, 1.97, HZ + 0.3); cap.rotation.y = Math.PI/4; g.add(cap);
  });

  // porch: a plank deck and step, carved posts on stone pads, a small gabled canopy with a hanging lantern
  add(box(1.5, 0.12, 0.72), mat(PLANK), 0, 0.3, HZ + 0.4);
  add(box(1.0, 0.14, 0.3), mat(STONE), 0, 0.07, HZ + 0.92);
  [-1, 1].forEach(s => { add(box(0.18, 0.12, 0.18), mat(STONE), s*0.62, 0.42, HZ + 0.68); add(cyl(0.06, 0.07, 1.45, 6), wood, s*0.62, 1.2, HZ + 0.68); add(box(0.16, 0.08, 0.16), oakLt, s*0.62, 1.9, HZ + 0.68); });
  add(box(1.42, 0.1, 0.1), wood, 0, 1.97, HZ + 0.68);
  add(prism([[-0.8, 1.96], [0, 2.38], [0.8, 1.96], [0.8, 2.08], [0, 2.5], [-0.8, 2.08]], 0.9), mat(ROOF), 0, 0, HZ + 0.5);
  add(cyl(0.012, 0.012, 0.2, 4), wood, 0, 1.86, HZ + 0.68);
  const lamp = mesh(box(0.13, 0.17, 0.13), lampM, 0, 1.68, HZ + 0.68); lamp.castShadow = false; g.add(lamp);
  const lcap = mesh(new THREE.ConeGeometry(0.12, 0.09, 4), wood, 0, 1.8, HZ + 0.68); lcap.rotation.y = Math.PI/4; g.add(lcap);

  // ivy climbing the front-left corner and along the eave
  const ivy = [0x3f6b3a, 0x4f7f3a, 0x35602f], leafGeo = new THREE.IcosahedronGeometry(0.11, 0);
  [[-HX - 0.06, 0.6, HZ + 0.04], [-HX - 0.04, 0.95, HZ + 0.08], [-HX - 0.08, 1.3, HZ + 0.02], [-HX, 1.65, HZ + 0.08], [-HX + 0.1, 2.0, HZ + 0.09], [-HX + 0.35, 2.22, HZ + 0.1], [-HX + 0.65, 2.25, HZ + 0.12], [-HX - 0.07, 1.1, HZ - 0.25], [-HX - 0.08, 1.75, HZ - 0.4]]
    .forEach(([x, y, z], k) => { const l = mesh(leafGeo, mat(ivy[k % 3]), x, y, z); l.scale.setScalar(0.8 + rand()*0.6); l.rotation.set(rand()*3, rand()*3, 0); g.add(l); });

  // woodpile against the back wall, stone chimney up the right gable, smoke puffs
  [[-1.0, 0.1], [-1.21, 0.1], [-1.105, 0.28]].forEach(([x, y]) => add(cyl(0.1, 0.1, 0.8, 6).rotateZ(Math.PI/2), mat(PLANK), x, y, -HZ - 0.24));
  // the chimney: a wide breast with sloped shoulders, a stack laid in coursed stone, a string course, a stepped cap and two clay pots
  const CX = HX + 0.26, CZ = -0.85, chim = mat(0x6f685e), capM = mat(0x5f5952), potM = mat(0xa0522d);
  add(box(0.6, 1.5, 0.78), chim, CX + 0.04, 0.75, CZ);
  [-1, 1].forEach(s => { const sh = mesh(box(0.62, 0.08, 0.26), capM, CX + 0.04, 1.58, CZ + s*0.3); sh.rotation.x = s*0.6; g.add(sh); });
  add(box(0.62, 0.08, 0.5), capM, CX + 0.04, 1.54, CZ);
  add(box(0.44, 2.3, 0.5), chim, CX, 2.7, CZ);
  const CS = [0x9a9286, 0x8d8579, 0xa39b8f, 0x857d72, 0x948c80], cs = [];
  const course = (y0, y1, hw, hd, x) => { for(let y = y0 + 0.09, r = 0; y < y1 - 0.06; y += 0.18, r++){
    for(let u = -hd + (r % 2)*0.12, j = 0; u < hd - 0.04; j++){ const w = Math.min(0.2 + ((r*3 + j*7) % 4)*0.04, hd - u); cs.push([x + hw + 0.012, y, CZ + u + w/2, 0.02, 0.15, w - 0.03, CS[(r + j) % 5]]); u += w; }
    [-1, 1].forEach(sd => { for(let u = -hw + (r % 2)*0.1, j = 0; u < hw - 0.04; j++){ const w = Math.min(0.2 + ((r*5 + j*3) % 4)*0.04, hw - u); cs.push([x + u + w/2, y, CZ + sd*(hd + 0.012), w - 0.03, 0.15, 0.02, CS[(r + j + 2) % 5]]); u += w; } });
  } };
  course(0.02, 1.48, 0.3, 0.39, CX + 0.04); course(1.62, 3.85, 0.22, 0.25, CX);
  const csIM = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshStandardMaterial({flatShading:true, roughness:0.95}), cs.length);
  cs.forEach(([x, y, z, sx, sy, sz, c], i) => { D.position.set(x, y, z); D.rotation.set(0, 0, 0); D.scale.set(sx, sy, sz); D.updateMatrix(); csIM.setMatrixAt(i, D.matrix); csIM.setColorAt(i, col.setHex(c)); });
  csIM.castShadow = csIM.receiveShadow = true; g.add(csIM);
  add(box(0.5, 0.07, 0.56), capM, CX, 3.2, CZ);                                                 // string course
  add(box(0.52, 0.08, 0.58), capM, CX, 3.88, CZ); add(box(0.58, 0.08, 0.64), capM, CX, 3.96, CZ);   // stepped cap
  [-0.12, 0.12].forEach(z => { add(cyl(0.08, 0.1, 0.26, 8), potM, CX, 4.13, CZ + z); add(cyl(0.095, 0.095, 0.04, 8), potM, CX, 4.27, CZ + z); });
  const smoke = [], puffGeo = new THREE.DodecahedronGeometry(0.17);
  for(let k = 0; k < 3; k++){ const p = new THREE.Mesh(puffGeo, new THREE.MeshStandardMaterial({color:0xb9bcc6, flatShading:true, transparent:true, opacity:0.5, depthWrite:false})); g.add(p); smoke.push(p); }
  animated.push({fn:t => {
    smoke.forEach((p, k) => { const u = (t*0.35 + k/3) % 1; p.position.set(HX + 0.26 + Math.sin(u*6 + k)*0.15, 4.35 + u*1.35, -0.85 - u*0.2); p.scale.setScalar(0.6 + u*1.3); p.material.opacity = 0.5*(1 - u); });
    lampM.emissiveIntensity = 1.9 + Math.sin(t*7.3)*0.15 + Math.sin(t*13.1)*0.1;
  }});
  return g;
}

/* the island's namesake: a broad old oak with a rope swing */
function oak(animated){
  const g = new THREE.Group(), bark = mat(0x4e3523);
  g.add(mesh(cyl(0.5, 0.78, 0.35, 7), bark, 0, 0.12, 0));
  g.add(mesh(cyl(0.3, 0.5, 2.7, 7), bark, 0, 1.4, 0));
  const limb = (len, y, ry, rz) => { const b = new THREE.Group(); b.position.y = y; b.rotation.set(0, ry, rz); b.add(mesh(cyl(0.08, 0.16, len, 5), bark, 0, len/2, 0)); g.add(b); };
  limb(1.5, 2.1, 0.4, 1.0); limb(1.4, 2.3, 2.6, 0.9); limb(1.3, 2.4, 4.4, 0.8);
  const arm = mesh(cyl(0.08, 0.15, 1.7, 5), bark, 0.85, 2.15, 0); arm.rotation.z = -Math.PI/2; g.add(arm);
  const blob = new THREE.IcosahedronGeometry(1, 0), leaves = [0x4f7f3a, 0x5e8f43, 0x44703a];
  [[0, 3.55, 0, 1.55], [1.15, 3.1, 0.35, 1.1], [-1.05, 3.2, -0.4, 1.2], [0.2, 3.1, -1.15, 1.05], [-0.35, 3.15, 1.1, 1.05], [0.35, 4.3, 0.2, 1.0], [1.35, 3.0, -0.75, 0.8], [-0.9, 3.9, 0.7, 0.8]]
    .forEach(([x, y, z, s], k) => { const m = mesh(blob, mat(leaves[k % 3]), x, y, z); m.scale.set(s, s*0.78, s); m.rotation.set(rand()*3, rand()*3, 0); g.add(m); });
  // rope swing hanging from the low arm
  const swing = new THREE.Group(); swing.position.set(1.15, 2.1, 0); g.add(swing);
  [-0.24, 0.24].forEach(x => swing.add(mesh(cyl(0.015, 0.015, 1.45, 4), mat(0xb8a27a), x, -0.72, 0)));
  swing.add(mesh(box(0.62, 0.05, 0.22), mat(PLANK), 0, -1.45, 0));
  animated.push({fn:t => { swing.rotation.x = Math.sin(t*1.3)*0.16; }});
  return g;
}

function well(){
  const g = new THREE.Group(), wood = mat(WOOD);
  g.add(mesh(cyl(0.55, 0.6, 0.55, 10), mat(STONE), 0, 0.27, 0));
  g.add(mesh(cyl(0.62, 0.62, 0.1, 10), mat(0x9a9488), 0, 0.58, 0));
  g.add(mesh(cyl(0.45, 0.45, 0.02, 10), mat(0x23415e, {roughness:0.3}), 0, 0.64, 0));
  [-1, 1].forEach(s => g.add(mesh(box(0.09, 1.15, 0.09), wood, s*0.52, 1.18, 0)));
  const roof = mesh(prism([[-0.58, 1.62], [0, 2.02], [0.58, 1.62], [0.58, 1.72], [0, 2.12], [-0.58, 1.72]], 1.45), mat(ROOF)); roof.rotation.y = Math.PI/2; g.add(roof);
  g.add(mesh(cyl(0.04, 0.04, 1.2, 6).rotateZ(Math.PI/2), wood, 0, 1.45, 0));
  g.add(mesh(box(0.05, 0.22, 0.05), wood, 0.64, 1.36, 0));
  g.add(mesh(cyl(0.01, 0.01, 0.3, 4), mat(0xb8a27a), 0, 1.3, 0));
  g.add(mesh(cyl(0.12, 0.1, 0.18, 7), mat(DOOR), 0, 1.08, 0));
  return g;
}

function mailbox(){
  const g = new THREE.Group();
  g.add(mesh(box(0.08, 0.85, 0.08), mat(WOOD), 0, 0.42, 0));
  g.add(mesh(box(0.24, 0.2, 0.38), mat(GREEN), 0, 0.94, 0));
  g.add(mesh(cyl(0.12, 0.12, 0.38, 8).rotateX(Math.PI/2), mat(GREEN), 0, 1.04, 0));
  g.add(mesh(box(0.03, 0.24, 0.04), mat(0xc0392b), 0.14, 1.04, -0.08), mesh(box(0.03, 0.08, 0.12), mat(0xc0392b), 0.14, 1.12, -0.02));
  g.add(mesh(box(0.16, 0.02, 0.1), mat(0xf6efe0), 0, 0.98, 0.21));   // a letter poking out
  return g;
}

/* waymarker stone with a glowing notch */
function milestone(m){
  const g = new THREE.Group(), stone = mat(0x8a857b);
  g.add(mesh(box(0.34, 0.5, 0.17), stone, 0, 0.25, 0));
  g.add(mesh(cyl(0.17, 0.17, 0.17, 8).rotateX(Math.PI/2), stone, 0, 0.5, 0));
  const n = mesh(box(0.14, 0.14, 0.02), m, 0, 0.42, 0.09); n.rotation.z = Math.PI/4; n.castShadow = false; g.add(n);
  return g;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}. */
export function decorate(isl, grp, animated){
  seed = 4242;
  const plaza = isl.obs + 2.2;
  // free spot? clear of plaza, coast, paths, and everything solid placed so far (build.js trees/rocks included)
  const clear = (x, z, r, gap = 1.2, solid = true) => {
    const d = Math.hypot(x, z);
    return d - r > plaza && d + r < 0.85*isl.edgeR(Math.atan2(z, x)) && isl.pathDist(x, z) > gap + r
      && (!solid || obstacles.every(o => Math.hypot(o.x - isl.x - x, o.z - isl.z - z) > o.r + r));
  };
  // search outward from a preferred angle (radians, local x/z), nearest-to-house first (or from d0 out)
  const find = (a0, r, gap = 1.2, solid = true, d0 = plaza + r + 0.1) => {
    for(let k = 0; k < 30; k++){
      const a = a0 + (k % 2 ? 1 : -1)*Math.ceil(k/2)*0.12;
      for(let d = d0; d < 0.85*isl.edgeR(a); d += 0.25){ const x = Math.cos(a)*d, z = Math.sin(a)*d; if(clear(x, z, r, gap, solid)) return [x, z]; }
    }
    return null;
  };
  const place = (o, p, r, ry = Math.atan2(-p[0], -p[1])) => {
    o.position.set(p[0], isl.topY(p[0], p[1]) - 0.03, p[1]); o.rotation.y = ry; grp.add(o);
    obstacles.push({x:isl.x + p[0], z:isl.z + p[1], r});
  };

  // the great oak behind the cottage (search with a wide berth so its canopy doesn't swallow other trees)
  // preferred angles below are in the building frame; atan2(z, x) angles turn by -face into the island frame
  const F = isl.face;
  let p = find(-2.36 - F, 1.0, 0.6, false, 6.0) || find(-2.36 - F, 1.0, 0.6, false);
  if(p){ place(oak(animated), p, 0.62, Math.atan2(p[1], -p[0])); obstacles[obstacles.length - 1].clear = 2.3; }   // keep the random scatter out from under the canopy

  // fenced vegetable garden: white pickets round a 2 x 1.5 bed of cabbages and pumpkins
  p = find(-0.8 - F, 1.0, 1.2, false);
  if(p){
    const [cx, cz] = p, ry = Math.atan2(-cx, -cz), cs = Math.cos(ry), sn = Math.sin(ry), W = 0.85, D = 0.58;
    const loc = (u, v) => [cx + u*cs + v*sn, cz - u*sn + v*cs];   // garden frame → island frame (matches rotation.y = ry)
    const dummy = new THREE.Object3D(), pk = [], rails = [], corners = [[-W, -D], [W, -D], [W, D], [-W, D]];
    corners.forEach((c0, i) => {
      const c1 = corners[(i + 1) % 4], len = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]), n = Math.round(len/0.24);
      for(let j = 0; j < n; j++){ const f = j/n; pk.push(loc(c0[0] + (c1[0] - c0[0])*f, c0[1] + (c1[1] - c0[1])*f)); }
      const a = loc(...c0), b = loc(...c1); rails.push([a, b, 0.16], [a, b, 0.34]);
    });
    const white = new THREE.MeshStandardMaterial({color:0xefe9dc, flatShading:true, roughness:0.9});
    const pickets = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.5, 4).translate(0, 0.25, 0), white, pk.length);
    pk.forEach(([x, z], i) => { dummy.position.set(x, isl.topY(x, z) - 0.04, z); dummy.rotation.set(0, ry + Math.PI/4, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); pickets.setMatrixAt(i, dummy.matrix); });
    const railIM = new THREE.InstancedMesh(box(0.04, 0.05, 1), white, rails.length), q = new THREE.Vector3();
    rails.forEach(([a, b, h], i) => {
      dummy.position.set((a[0] + b[0])/2, (isl.topY(...a) + isl.topY(...b))/2 + h, (a[1] + b[1])/2);
      dummy.lookAt(q.set(b[0], isl.topY(...b) + h, b[1])); dummy.scale.set(1, 1, Math.hypot(b[0] - a[0], b[1] - a[1])); dummy.updateMatrix(); railIM.setMatrixAt(i, dummy.matrix);
    });
    const veg = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), 12), col = new THREE.Color();
    for(let i = 0; i < 12; i++){
      const u = -0.54 + (i % 4)*0.36, v = -0.3 + Math.floor(i/4)*0.3, [x, z] = loc(u, v), pump = i >= 8;
      dummy.position.set(x, isl.topY(x, z) + 0.08, z); dummy.rotation.set(rand(), rand()*6, 0); dummy.scale.set(1, pump ? 0.7 : 0.85, 1).multiplyScalar(0.8 + rand()*0.4); dummy.updateMatrix();
      veg.setMatrixAt(i, dummy.matrix); veg.setColorAt(i, col.setHex(pump ? 0xe0862d : [0x7fb55a, 0x6aa04a][i % 2]));
    }
    [pickets, railIM, veg].forEach(m => { m.castShadow = m.receiveShadow = true; grp.add(m); });
    obstacles.push({x:isl.x + cx, z:isl.z + cz, r:0.95, clear:1.4});
  }

  // stone well off to the side
  p = find(2.6 - F, 0.75);
  if(p) place(well(), p, 0.72, rand()*6);

  // mailbox by the front path, its slot facing the path
  p = find(1.2 - F, 0.2, 1.0);
  if(p) place(mailbox(), p, 0.22, Math.atan2(-(p[0]*Math.cos(F) - p[1]*Math.sin(F)), 0) + F);   // building-frame x decides the side

  // milestones along each bridge path, alternating sides, glowing notch facing the walker
  const notch = glow(0xf0b54a, 1.5), door = isl.rot(0, isl.obs + 3.2);
  isl.paths.forEach(([, , ex, ez]) => {
    const L = Math.hypot(ex, ez); if(ex === door[0] && ez === door[1]) return;   // skip the short door path (same rot() call as terrain.js, so exact)
    const dx = ex/L, dz = ez/L;
    let side = 1;
    for(let d = plaza + 0.8; d < L - 1.6; d += 2.2, side = -side){
      for(const s of [side, -side]){
        const x = dx*d - dz*1.45*s, z = dz*d + dx*1.45*s;
        if(!clear(x, z, 0.2, 1.2)) continue;
        place(milestone(notch), [x, z], 0.24, Math.atan2(dz*s, -dx*s)); break;
      }
    }
  });
}
