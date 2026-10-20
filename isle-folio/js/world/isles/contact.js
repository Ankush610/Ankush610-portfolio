/* Beacon Point (contact): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';

const WHITE = 0xf0ebe0, RED = 0xb8372b, SLATE = 0x2b2f38, WOOD = 0x6b4a30, DARKWOOD = 0x4a3222, STONE = 0x8a877f, BRASS = 0xb08a48;
const WHITES = [0xf0ebe0, 0xe6e0d2, 0xf4f0e6, 0xe9e3d5, 0xdcd6c8], REDS = [0xb8372b, 0xa83226, 0xc23e30, 0x9e2f25], STONES = [0x8a877f, 0x807d75, 0x94918a, 0x7a776f];
const N = 10, TB = 0.5, TT = 5.55, R0 = 1.25, R1 = 0.82;   // tower sides; tower foot and top heights; radius at foot and top
const TAPER = Math.atan((R0 - R1)/(TT - TB));                // lean of each face (rad)
const rAt = y => R0 - (y - TB)/(TT - TB)*(R0 - R1);          // tower radius at height y
const apo = y => rAt(y)*Math.cos(Math.PI/N);                 // distance to the middle of a face
const prism = (r0, r1, h, n = N) => { const g = cyl(r0, r1, h, n); g.rotateY(Math.PI/n); return g; }; // a face (not an edge) points at +z
const FACE = k => k*2*Math.PI/N;                              // face k's outward angle (0 = the door)

// many copies on the tower's faces, one draw call: rows [a, u, y, d, sx, sy, sz, color?, tilt?] (u across the face, d out from the axis)
const D = new THREE.Object3D(); D.rotation.order = 'YXZ';
function onFaces(geo, m, rows, shadow = true){
  const im = new THREE.InstancedMesh(geo, m, rows.length), c = new THREE.Color();
  rows.forEach(([a, u, y, d, sx, sy, sz, col, tilt = TAPER], i) => {
    D.position.set(Math.sin(a)*d + Math.cos(a)*u, y, Math.cos(a)*d - Math.sin(a)*u); D.rotation.set(-tilt, a, 0); D.scale.set(sx, sy, sz); D.updateMatrix();
    im.setMatrixAt(i, D.matrix); if(col != null) im.setColorAt(i, c.setHex(col));
  });
  im.castShadow = shadow; im.receiveShadow = true; return im;
}
/* thing stuck flat on the tower face that points at angle `a` (0 = +z) */
function onFace(g, obj, a, y, dz = 0){
  const h = new THREE.Group(); h.rotation.y = a; g.add(h);
  obj.position.set(0, y, apo(y) + dz); obj.rotation.x = -TAPER; h.add(obj);
  return obj;
}
// a soft round glow for the lantern's halo
function haloTex(){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.35, 'rgba(255,214,130,.4)'); gr.addColorStop(1, 'rgba(255,200,110,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on).
   Inside (rooms/contact.js) is the lantern: glazing with mullions and two transoms over a red parapet with a brass cap
   rail, a lens of glowing prism rings in a turning brass cage under a ribbed roof, and the watch room's whitewashed
   brick, red frieze, brass portholes and storm lanterns. The tower outside is built from the same parts. */
export function building(animated){
  const g = new THREE.Group(), slate = mat(SLATE), brass = mat(BRASS, {metalness:0.5, roughness:0.45}), tinted = mat(0xffffff, {roughness:0.9});
  const noShadow = o => { o.castShadow = false; return o; };

  // stepped stone plinth, laid in courses, and front steps
  g.add(mesh(prism(1.8, 1.88, 0.3), mat(0x6f6c65), 0, 0.15, 0), mesh(prism(1.5, 1.56, 0.2), mat(STONE), 0, 0.4, 0));
  const stones = [];
  [[0.15, 1.88*Math.cos(Math.PI/N) + 0.01, 0.13], [0.4, 1.56*Math.cos(Math.PI/N) + 0.01, 0.09]].forEach(([y, d, h]) => {
    for(let k = 0; k < N; k++){ const fw = 2*d*Math.tan(Math.PI/N); for(let u = -fw/2 + (k % 2)*0.12, j = 0; u < fw/2 - 0.1; u += 0.4, j++) stones.push([FACE(k), u + 0.2, y, d, 0.36, h*1.6, 0.03, STONES[(k + j) % 4], 0]); }
  });
  g.add(onFaces(box(1, 1, 1), tinted, stones));
  g.add(mesh(box(0.9, 0.12, 0.3), mat(STONE), 0, 0.06, 1.95));

  // the tower: red and white bands of painted brick (the watch room's whitewashed brick, seen from outside)
  const BANDS = 6, BH = (5.0 - TB)/BANDS;
  for(let k = 0; k < BANDS; k++){ const y0 = TB + k*BH, y1 = y0 + BH; g.add(mesh(prism(rAt(y1), rAt(y0), BH), mat(k % 2 ? RED : WHITE), 0, (y0 + y1)/2, 0)); }
  g.add(mesh(prism(rAt(TT), rAt(5.0), TT - 5.0), mat(WHITE), 0, (5.0 + TT)/2, 0));
  const WINS = [[0, 3.05], [4, 1.8], [6, 3.2], [2, 3.6], [8, 2.3], [1, 4.3], [7, 4.1], [3, 2.6], [5, 3.9], [9, 1.6]];   // [face, height]
  const holes = k => [...(k === 0 ? [[-0.56, 0.56, 0, 2.45]] : []), ...WINS.filter(([f]) => f === k).map(([, y]) => [-0.2, 0.2, y - 0.33, y + 0.38])];
  const bricks = [];
  for(let y = TB + 0.1, r = 0; y < 5.0 - 0.05; y += 0.2, r++){
    const band = Math.min(BANDS - 1, Math.floor((y - TB)/BH)), pal = band % 2 ? REDS : WHITES, d = apo(y) + 0.008, fw = 2*apo(y)*Math.tan(Math.PI/N);
    for(let k = 0; k < N; k++){
      let spans = [[-fw/2, fw/2]];
      holes(k).forEach(([u0, u1, h0, h1]) => { if(y + 0.09 > h0 && y - 0.09 < h1) spans = spans.flatMap(([p, q]) => [[p, Math.min(q, u0)], [Math.max(p, u1), q]].filter(([s, e]) => e - s > 0.05)); });
      spans.forEach(([s0, s1]) => { for(let u = s0 - (r % 2)*0.16, j = 0; u < s1; j++){ const w = 0.26 + ((k*7 + r*3 + j*5) % 5)*0.03, p = Math.max(u, s0), q = Math.min(u + w, s1); if(q - p > 0.05) bricks.push([FACE(k), (p + q)/2, y, d, q - p - 0.03, 0.17, 0.02, pal[(k + r + j) % pal.length]]); u += w; } });
    }
  }
  g.add(onFaces(box(1, 1, 1), tinted, bricks));

  // windows up the tower: a lit pane under a round head, a mullion, a stone surround and sill
  const winM = glow(0xffd27a, 1.0).clone(), frames = [], panes = [];
  WINS.forEach(([k, y]) => {
    if(k === 0 && y < 2.6) return;
    const a = FACE(k), d = apo(y);
    panes.push([a, 0, y, d - 0.005, 0.26, 0.42, 0.02]);
    onFace(g, noShadow(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 10, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2), winM)), a, y + 0.21, -0.005);
    frames.push([a, -0.17, y + 0.02, d + 0.02, 0.07, 0.56, 0.05, STONE], [a, 0.17, y + 0.02, d + 0.02, 0.07, 0.56, 0.05, STONE], [a, 0, y - 0.25, d + 0.04, 0.42, 0.05, 0.1, STONE],
      [a, 0, y + 0.37, d + 0.025, 0.36, 0.06, 0.05, STONE], [a, 0, y + 0.05, d + 0.005, 0.02, 0.5, 0.02, SLATE]);
  });
  g.add(onFaces(box(1, 1, 1), winM, panes, false), onFaces(box(1, 1, 1), tinted, frames));

  // the keeper's porch: a gabled entry with a red roof, a planked door under a stone arch, storm lanterns either side
  const PZ = 1.3, PF = PZ + 0.3;
  g.add(mesh(box(1.0, 1.75, 0.6), mat(WHITE), 0, 0.3 + 0.875, PZ));
  g.add(mesh(cyl(0.58, 0.58, 0.6, 3).rotateX(-Math.PI/2).scale(1, 0.4, 1), mat(WHITE), 0, 2.05 + 0.116, PZ));
  [-1, 1].forEach(s => { const sl = mesh(box(0.68, 0.06, 0.72), mat(RED), s*0.28, 2.22, PZ); sl.rotation.z = -s*0.43; g.add(sl); });
  g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), brass, 0, 2.42, PF + 0.02));
  const DW = 0.5, DS = 1.22;
  g.add(mesh(box(DW, DS - 0.3, 0.03), mat(DARKWOOD), 0, (DS + 0.3)/2, PF + 0.01));
  g.add(mesh(new THREE.CylinderGeometry(DW/2, DW/2, 0.03, 10, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2), mat(DARKWOOD), 0, DS, PF + 0.01));
  const dr = [];
  [0.55, 1.0].forEach(y => dr.push([0, y, PF + 0.035, DW - 0.04, 0.04, 0.02, 0, SLATE]));
  [-0.12, 0.12].forEach(x => dr.push([x, 0.8, PF + 0.03, 0.012, 0.95, 0.01, 0, 0x2e2018]));
  [-1, 1].forEach(s => [0, 1, 2, 3].forEach(j => dr.push([s*(DW/2 + 0.06), 0.4 + j*0.21, PF + 0.03, j % 2 ? 0.1 : 0.14, 0.19, 0.06, 0, STONES[j]])));
  for(let i = 0; i < 7; i++){ const th = (i + 0.5)*Math.PI/7, key = i === 3; dr.push([Math.cos(th)*(DW/2 + 0.07), DS + Math.sin(th)*(DW/2 + 0.07), PF + 0.03, key ? 0.1 : 0.08, key ? 0.15 : 0.11, 0.06, 0, key ? RED : STONES[i % 4], 0, th - Math.PI/2]); }
  dr.push([0, 0.33, PF + 0.12, 0.8, 0.06, 0.26, 0, STONES[2]]);
  const drIM = new THREE.InstancedMesh(box(1, 1, 1), tinted, dr.length), cc = new THREE.Color(), O = new THREE.Object3D();
  dr.forEach(([x, y, z, sx, sy, sz, ry, col, rx = 0, rz = 0], i) => { O.position.set(x, y, z); O.rotation.set(rx, ry, rz); O.scale.set(sx, sy, sz); O.updateMatrix(); drIM.setMatrixAt(i, O.matrix); drIM.setColorAt(i, cc.setHex(col)); });
  drIM.castShadow = drIM.receiveShadow = true; g.add(drIM);
  g.add(mesh(new THREE.TorusGeometry(0.035, 0.01, 4, 8), brass, 0.12, 0.85, PF + 0.04));
  const lampM = glow(0xffd27a, 1.8).clone();
  [-1, 1].forEach(s => {
    g.add(mesh(box(0.03, 0.03, 0.14), slate, s*0.38, 1.62, PF + 0.07));
    g.add(mesh(cyl(0.07, 0.09, 0.04, 6), slate, s*0.38, 1.6, PF + 0.14), mesh(cyl(0.08, 0.08, 0.03, 6), slate, s*0.38, 1.38, PF + 0.14));
    g.add(noShadow(mesh(cyl(0.06, 0.06, 0.18, 6), lampM, s*0.38, 1.49, PF + 0.14)));
  });

  // the watch room at the top of the shaft: whitewash, brass portholes lit from inside, a red frieze under the gallery
  g.add(mesh(prism(rAt(TT) + 0.015, rAt(TT - 0.18) + 0.015, 0.18), mat(RED), 0, TT - 0.09, 0));
  const portM = glow(0xffd28a, 0.9).clone(), portRows = [], bolts = [];
  for(let k = 0; k < N; k++){
    const a = FACE(k), y = 5.18, d = apo(y);
    portRows.push([a, 0, y, d + 0.02, 1, 1, 1]);
    for(let j = 0; j < 6; j++){ const b = j*Math.PI/3; bolts.push([a, Math.cos(b)*0.16, y + Math.sin(b)*0.16, d + 0.035, 1, 1, 1]); }
  }
  g.add(onFaces(new THREE.TorusGeometry(0.12, 0.03, 5, 14), brass, portRows), onFaces(new THREE.CircleGeometry(0.11, 12), portM, portRows.map(r => [r[0], r[1], r[2], r[3] - 0.012, 1, 1, 1]), false));
  g.add(onFaces(new THREE.SphereGeometry(0.018, 4, 3), brass, bolts, false));

  // the gallery: corbel brackets, a slate deck, an iron railing (posts and two rails)
  const brk = [];
  for(let k = 0; k < N; k++){ const a = FACE(k) + Math.PI/N; brk.push([a, 0, TT - 0.12, R1 + 0.12, 0.08, 0.24, 0.3, SLATE, 0]); }
  g.add(onFaces(box(1, 1, 1), tinted, brk));
  g.add(mesh(prism(1.36, 1.0, 0.1, N), slate, 0, TT + 0.04, 0), mesh(prism(1.38, 1.38, 0.06, N), slate, 0, TT + 0.12, 0));
  const DECK = TT + 0.15, posts = [];
  for(let k = 0; k < 20; k++){ const a = k/20*Math.PI*2; posts.push([a, 0, DECK + 0.21, 1.3, 1, 1, 1, undefined, 0]); }
  g.add(onFaces(cyl(0.018, 0.018, 0.42, 4), slate, posts));
  [DECK + 0.22, DECK + 0.42].forEach(y => { const r = mesh(new THREE.TorusGeometry(1.3, 0.025, 4, 30), slate, 0, y, 0); r.rotation.x = Math.PI/2; g.add(r); });

  // the lantern: red parapet with a brass cap rail, glazing (mullions and two transoms), and the lens inside it
  const LB = DECK + 0.32, LH = 0.9, LC = LB + LH/2;
  g.add(mesh(prism(0.74, 0.74, 0.32), mat(RED), 0, DECK + 0.16, 0), mesh(prism(0.78, 0.78, 0.04), brass, 0, LB, 0));
  const glassM = new THREE.MeshStandardMaterial({color:0xfff2c8, emissive:0xffe6a0, emissiveIntensity:0.35, transparent:true, opacity:0.22, depthWrite:false, side:THREE.DoubleSide, flatShading:true});
  g.add(noShadow(mesh(prism(0.7, 0.7, LH, N), glassM, 0, LC, 0)));
  for(let k = 0; k < N; k++){ const a = FACE(k) + Math.PI/N; g.add(mesh(box(0.035, LH, 0.035), slate, Math.sin(a)*0.71, LC, Math.cos(a)*0.71)); }
  [LB + LH*0.32, LB + LH*0.68].forEach(y => { const t = mesh(new THREE.TorusGeometry(0.7, 0.014, 3, N), slate, 0, y, 0); t.rotation.x = Math.PI/2; g.add(t); });
  const lens = new THREE.Group(); lens.position.y = LB; g.add(lens);
  lens.add(mesh(cyl(0.3, 0.38, 0.14, 8), brass, 0, 0.07, 0), mesh(cyl(0.3, 0.3, 0.05, 8), brass, 0, 0.78, 0));
  const ringM = glow(0xffd98a, 0.9).clone();
  for(let k = 0; k < 5; k++){ const t = noShadow(mesh(new THREE.TorusGeometry(0.3 - Math.abs(k - 2)*0.035, 0.03, 5, 16), ringM, 0, 0.22 + k*0.12, 0)); t.rotation.x = Math.PI/2; lens.add(t); }
  const coreM = new THREE.MeshStandardMaterial({color:0xfff2c8, emissive:0xfff2c8, emissiveIntensity:2.2, flatShading:true});
  lens.add(noShadow(mesh(new THREE.SphereGeometry(0.13, 10, 8), coreM, 0, 0.46, 0)));
  const cage = new THREE.Group(); cage.position.y = 0.46; lens.add(cage);
  for(let k = 0; k < 8; k++){ const a = k/8*Math.PI*2; cage.add(mesh(box(0.02, 0.62, 0.02), brass, Math.cos(a)*0.33, 0, Math.sin(a)*0.33)); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex(), color:0xfff0c0, transparent:true, opacity:0.55, depthWrite:false, blending:THREE.AdditiveBlending}));
  halo.scale.setScalar(2.0); halo.position.y = 0.46; halo.raycast = () => {}; lens.add(halo);   // sprites can't take the camera's occlusion raycast (it has no raycaster.camera)

  // roof: slate eave, a red dome with slate ribs (the rafters inside), the vent ball, a lightning rod and a weather vane
  const RF = LB + LH;
  g.add(mesh(prism(0.86, 0.8, 0.08), slate, 0, RF + 0.04, 0));
  const dome = mesh(new THREE.SphereGeometry(0.76, N*2, 6, 0, Math.PI*2, 0, Math.PI/2), mat(RED), 0, RF + 0.08, 0); dome.scale.y = 0.8; g.add(dome);
  for(let k = 0; k < N; k++){ const rib = mesh(new THREE.TorusGeometry(0.765, 0.022, 3, 8, Math.PI/2), slate, 0, RF + 0.08, 0); rib.rotation.y = FACE(k) + Math.PI/N; rib.scale.y = 0.8; g.add(rib); }
  const top = RF + 0.08 + 0.76*0.8;
  g.add(mesh(cyl(0.12, 0.14, 0.08, 10), brass, 0, top, 0), mesh(new THREE.SphereGeometry(0.12, 8, 6), slate, 0, top + 0.13, 0));
  g.add(mesh(cyl(0.014, 0.02, 0.6, 4), slate, 0, top + 0.5, 0));
  const vane = new THREE.Group(); vane.position.y = top + 0.5; g.add(vane);
  vane.add(mesh(box(0.5, 0.025, 0.025), slate));
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.12, 4), slate, 0.29, 0, 0); tip.rotation.z = -Math.PI/2; vane.add(tip);
  vane.add(mesh(box(0.1, 0.12, 0.015), mat(RED), -0.22, 0.03, 0));
  [[1, 0, 0], [0, 0, 1]].forEach(([x, , z]) => g.add(mesh(box(x ? 0.3 : 0.02, 0.02, z ? 0.3 : 0.02), slate, 0, top + 0.36, 0)));   // compass arms under the vane

  // two faint opposed beams sweeping round (kept dim so they never wash out the view)
  const beamGeo = new THREE.ConeGeometry(0.9, 8, 12, 1, true); beamGeo.translate(0, -4, 0); beamGeo.rotateZ(Math.PI/2);
  const beamMat = new THREE.MeshBasicMaterial({color:0xfff0b8, transparent:true, opacity:0.06, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending});
  const pivot = new THREE.Group(); pivot.position.y = LB + 0.46; g.add(pivot);
  const b1 = new THREE.Mesh(beamGeo, beamMat), b2 = new THREE.Mesh(beamGeo, beamMat); b2.rotation.y = Math.PI; pivot.add(b1, b2);
  const pl = new THREE.PointLight(0xfff0b8, 1.0, 14, 2); pl.position.set(0, LB + 0.46, 0); g.add(pl);
  pivot.rotation.y = 0.6; vane.rotation.y = 0.8;
  animated.push({fn:t => {
    pivot.rotation.y = 0.6 + t*0.6; cage.rotation.y = t*0.6;
    vane.rotation.y = 0.8 + Math.sin(t*0.3)*0.5 + Math.sin(t*1.7)*0.08;
    coreM.emissiveIntensity = 2.0 + Math.sin(t*2)*0.3; halo.material.opacity = 0.5 + Math.sin(t*2)*0.08;
    lampM.emissiveIntensity = 1.6 + Math.sin(t*9)*0.12 + Math.sin(t*23)*0.08;
    winM.emissiveIntensity = portM.emissiveIntensity = 0.9 + Math.sin(t*1.7)*0.08;
  }});
  return g;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}.
   Spots were picked to sit in the gaps between the trees/rocks build.js scatters on this island. */
export function decorate(isl, grp, animated){
  const put = (o, x, z, rotY = 0, dy = 0) => { o.position.set(x, isl.topY(x, z) + dy, z); o.rotation.y = rotY; grp.add(o); return o; };
  const solid = (x, z, r) => obstacles.push({x:isl.x + x, z:isl.z + z, r});
  const facing = (x, z) => Math.atan2(-x, -z);       // rotY that turns local +z towards the tower

  /* keeper's cottage: whitewashed walls, hip roof, chimney, lit window */
  const c = new THREE.Group();
  c.add(mesh(box(1.7, 0.3, 1.3), mat(STONE), 0, 0, 0));
  c.add(mesh(box(1.6, 1.0, 1.2), mat(WHITE), 0, 0.6, 0));
  const roofGeo = new THREE.ConeGeometry(1, 0.8, 4); roofGeo.rotateY(Math.PI/4); roofGeo.scale(1.35, 1, 1.03);
  c.add(mesh(roofGeo, mat(RED), 0, 1.5, 0));
  c.add(mesh(box(0.22, 0.6, 0.22), mat(STONE), 0.45, 1.65, -0.2));
  c.add(mesh(box(0.42, 0.72, 0.06), mat(DARKWOOD), -0.3, 0.46, 0.61));
  c.add(mesh(box(0.36, 0.3, 0.06), glow(0xffd27a, 1.2), 0.38, 0.65, 0.61));
  c.add(mesh(box(0.42, 0.04, 0.08), mat(SLATE), 0.38, 0.49, 0.63));
  c.add(mesh(box(0.06, 0.3, 0.36), glow(0xffd27a, 1.2), 0.81, 0.65, 0));
  c.add(mesh(box(0.4, 0.4, 0.4), mat(WOOD), -0.65, 0.2, 0.85));     // crate by the door
  c.add(mesh(cyl(0.18, 0.18, 0.46, 8), mat(DARKWOOD), -1.05, 0.23, 0.6));
  const cx = 4.0, cz = 2.75, ca = facing(cx, cz), co = Math.cos(ca), si = Math.sin(ca);
  put(c, cx, cz, ca, -0.05);
  [[0, 0, 1.0], [-0.75, 0.75, 0.38]].forEach(([x, z, r]) => solid(cx + x*co + z*si, cz - x*si + z*co, r));   // walls, crate + barrel

  /* mailbox by the front path (the contact theme), door facing the path */
  const mb = new THREE.Group();
  mb.add(mesh(box(0.1, 1.0, 0.1), mat(WOOD), 0, 0.5, 0));
  mb.add(mesh(box(0.36, 0.26, 0.6), mat(0x2e5e8a), 0, 1.13, 0));
  const topGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8, 1, false, 0, Math.PI); topGeo.rotateX(Math.PI/2); topGeo.rotateZ(Math.PI/2);
  mb.add(mesh(topGeo, mat(0x2e5e8a), 0, 1.26, 0));
  mb.add(mesh(box(0.34, 0.36, 0.03), mat(0x24496b), 0, 1.17, 0.31));
  mb.add(mesh(box(0.03, 0.34, 0.05), mat(RED), 0.2, 1.38, -0.1));
  mb.add(mesh(box(0.03, 0.12, 0.14), mat(RED), 0.2, 1.5, -0.03));
  const [mx, mz] = isl.rot(1.55, 3.75);             // building frame → island-local
  put(mb, mx, mz, isl.face - Math.PI/2);
  solid(mx, mz, 0.25);

  /* signal mast with a hoist of code flags fluttering */
  const fm = new THREE.Group();
  fm.add(mesh(cyl(0.22, 0.3, 0.25, 6), mat(STONE), 0, 0.12, 0));
  fm.add(mesh(cyl(0.04, 0.06, 3.2, 6), mat(WHITE), 0, 1.6, 0));
  fm.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), mat(0xd9b34a), 0, 3.24, 0));
  fm.add(mesh(box(1.0, 0.04, 0.04), mat(WHITE), 0, 2.85, 0));
  const flags = [];
  [[0xf2c14e, 0x2e5e8a], [WHITE, RED], [0x2e5e8a, WHITE]].forEach(([a, b], k) => {
    const f = new THREE.Group(); f.position.set(0.48, 2.65 - k*0.42, 0); fm.add(f);
    const ma = mesh(box(0.18, 0.32, 0.015), mat(a), 0.09, 0, 0), mbb = mesh(box(0.18, 0.32, 0.015), mat(b), 0.27, 0, 0);
    f.add(ma, mbb); flags.push(f);
  });
  fm.add(mesh(cyl(0.008, 0.008, 1.0, 3), mat(SLATE), 0.48, 2.3, 0));
  put(fm, 4.5, -1.0, -0.6);
  solid(4.5, -1.0, 0.3);

  /* rowboat pulled up on the grass with its oars */
  const bt = new THREE.Group();
  const hullGeo = new THREE.SphereGeometry(1, 8, 3, 0, Math.PI*2, Math.PI/2, Math.PI/2); hullGeo.scale(0.5, 0.36, 1.1);
  bt.add(mesh(hullGeo, mat(0x3f6f8a), 0, 0.34, 0));
  const inner = mesh(hullGeo, mat(WOOD, {side:THREE.BackSide}), 0, 0.35, 0); inner.scale.setScalar(0.94); bt.add(inner);
  const rim = mesh(new THREE.TorusGeometry(1, 0.05, 3, 16), mat(WHITE), 0, 0.34, 0); rim.rotation.x = Math.PI/2; rim.scale.set(0.5, 1.1, 1); bt.add(rim);
  bt.add(mesh(box(0.86, 0.05, 0.22), mat(WOOD), 0, 0.26, 0.1));
  bt.add(mesh(box(0.6, 0.05, 0.2), mat(WOOD), 0, 0.24, -0.6));
  [-1, 1].forEach(s => { const o = mesh(box(0.05, 0.04, 1.5), mat(WOOD), s*0.18, 0.33, 0.05); o.rotation.y = s*0.12; bt.add(o); });
  bt.rotation.z = 0.08;
  const bx = -4.5, bz = 1.5, ba = 0.35; put(bt, bx, bz, ba, 0.02);
  [-0.55, 0.55].forEach(d => solid(bx + Math.sin(ba)*d, bz + Math.cos(ba)*d, 0.55));

  /* bench on the south side between the two bridge paths, looking out to sea */
  const bn = new THREE.Group();
  bn.add(mesh(box(1.1, 0.07, 0.34), mat(WOOD), 0, 0.42, 0));
  bn.add(mesh(box(1.1, 0.26, 0.05), mat(WOOD), 0, 0.66, -0.16));
  [-0.45, 0.45].forEach(x => bn.add(mesh(box(0.07, 0.42, 0.3), mat(DARKWOOD), x, 0.21, 0)));
  put(bn, -0.25, -4.7, Math.PI);
  solid(-0.25, -4.7, 0.5);

  /* gulls circling the light */
  const gulls = [], wingGeo = box(0.42, 0.02, 0.14); wingGeo.translate(0.21, 0, 0);
  for(let k = 0; k < 3; k++){
    const pv = new THREE.Group(); pv.position.y = isl.h + 5.0 + k*0.55; grp.add(pv);
    const gl = new THREE.Group(); gl.position.x = 2.6 + k*0.7; gl.rotation.z = 0.25; pv.add(gl);
    gl.add(mesh(box(0.11, 0.1, 0.38), mat(0xf4f1ea)));
    const beak = mesh(new THREE.ConeGeometry(0.03, 0.1, 4), mat(0xe0a030), 0, 0, -0.23); beak.rotation.x = -Math.PI/2; gl.add(beak);
    const wl = mesh(wingGeo, mat(0xdcdcd6)), wr = mesh(wingGeo, mat(0xdcdcd6)); wr.rotation.y = Math.PI; gl.add(wl, wr);
    wl.castShadow = wr.castShadow = false;
    pv.rotation.y = k*2.2; wl.rotation.z = wr.rotation.z = 0.25;
    gulls.push([pv, wl, wr, 0.35 + k*0.07, k*2.2]);
  }
  animated.push({fn:t => {
    flags.forEach((f, k) => { f.rotation.y = Math.sin(t*3.1 + k*1.3)*0.35 + 0.2; });
    gulls.forEach(([pv, wl, wr, w, p]) => { pv.rotation.y = p + t*w; const fl = Math.sin(t*5 + p*3)*0.45; wl.rotation.z = wr.rotation.z = fl; });
  }});
}
