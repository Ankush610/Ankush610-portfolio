/* Lyceum (teaching): the Hall of the Lyceum seen from outside, plus olive trees, busts, a statue, scroll racks and benches. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';
import { instanced, cypress } from '../props.js';

const PI = Math.PI;
const STONE = 0xd6cdb8, STONE_D = 0xb5aa92, STONE_L = 0xe6dfcc, MARBLE = 0xe8e1cf, WOOD = 0x5a3d28, GOLD = 0xd8a640,
      SLATE = 0x2c3f66, SLATE_D = 0x1f2d4c, NAVY = 0x1f3557, LIT = 0xffc070;

// a prism: the (x, y) outline extruded `d` along z, centred on z = 0 (gables, roofs)
function prism(pts, d){
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => sh.lineTo(p[0], p[1]));
  return new THREE.ExtrudeGeometry(sh, {depth:d, bevelEnabled:false}).translate(0, 0, -d/2);
}
// a swallow-tailed banner hanging from y = 0
function bannerGeo(w, h, n){ const sh = new THREE.Shape(); sh.moveTo(-w/2, 0); sh.lineTo(w/2, 0); sh.lineTo(w/2, -h); sh.lineTo(0, -h + n); sh.lineTo(-w/2, -h); sh.closePath(); return new THREE.ShapeGeometry(sh); }
// a laurel wreath of gold leaves (open at the bottom)
function laurel(r, m){
  const rows = [];
  [-1, 1].forEach(s => { for(let i = 0; i < 9; i++){ const f = 0.42 + i*0.29, out = i % 2 ? 1.16 : 0.86; rows.push([s*Math.sin(f)*r*out, -Math.cos(f)*r*out, 0, r*0.13, r*0.3, r*0.06, 0, undefined, 0, s*(f - PI/2 + (i % 2 ? 0.45 : -0.45))]); } });
  return instanced(new THREE.OctahedronGeometry(1, 0), m, rows, false);
}
// a seated lion on a plinth, facing +z
function lion(){
  const g = new THREE.Group(), m = mat(MARBLE), add = (geo, x, y, z, rx = 0) => { const o = mesh(geo, m, x, y, z); o.rotation.x = rx; g.add(o); return o; };
  g.add(mesh(box(0.66, 0.72, 0.92), mat(STONE_D), 0, 0.36, 0), mesh(box(0.76, 0.08, 1.0), mat(STONE_L), 0, 0.76, 0));
  add(box(0.46, 0.34, 0.52), 0, 0.96, -0.12);                       // haunches
  add(box(0.38, 0.5, 0.34), 0, 1.06, 0.16, 0.25);                    // chest
  [-0.11, 0.11].forEach(x => add(box(0.1, 0.42, 0.11), x, 0.99, 0.32));   // forelegs
  const mane = add(new THREE.DodecahedronGeometry(0.25, 0), 0, 1.36, 0.2); mane.scale.set(1.1, 1.05, 0.9);
  add(box(0.26, 0.24, 0.26), 0, 1.36, 0.33);                         // face
  add(box(0.15, 0.11, 0.12), 0, 1.3, 0.48);                          // muzzle
  [-0.09, 0.09].forEach(x => add(box(0.06, 0.07, 0.05), x, 1.5, 0.28));   // ears
  const tail = add(cyl(0.025, 0.035, 0.45, 5), 0.2, 0.86, -0.36); tail.rotation.z = 0.9;
  return g;
}

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on).
   Inside (rooms/teaching.js) is the Hall of the Lyceum: a long stone nave under a timber roof, exhibits down both walls
   under navy and gold banners, a lamp of learning in a gilded laurel at the far end. Outside, that nave is the tall
   gabled centre block (its door open on the warm hall), with a colonnaded wing either side under blue slate. */
export function building(animated){
  const g = new THREE.Group(), stone = mat(STONE), stoneD = mat(STONE_D), stoneL = mat(STONE_L), marble = mat(MARBLE), slate = mat(SLATE), slateD = mat(SLATE_D);
  const gold = mat(GOLD, {metalness:0.6, roughness:0.35, emissive:0x5a3a00, emissiveIntensity:0.45}), wood = mat(WOOD), iron = mat(0x2a2522), unit = box(1, 1, 1);
  const litM = glow(LIT, 1.5).clone(), lampM = glow(0xffc870, 2.0).clone();
  const CX = 1.45, CF = 1.45, CB = -2.3, CW = 4.2, RY = 5.35;           // centre block: half width, front, back, wall top (tall enough for a clerestory over the wings), ridge
  const WX = 3.25, WF = 1.0, WB = -1.4, WT = 2.55, P = 0.3;             // wings: outer x, front, back, column top; podium height

  // podiums and the steps up to the door
  g.add(mesh(box(2*CX + 0.3, P + 0.05, CF - CB + 0.2), stoneD, 0, (P + 0.05)/2, (CF + CB)/2));
  [-1, 1].forEach(s => g.add(mesh(box(WX - CX + 0.2, P, WF - WB + 0.3), stoneD, s*(CX + WX)/2, P/2, (WF + WB)/2)));
  for(let k = 0; k < 3; k++) g.add(mesh(box(2.7 + k*0.15, 0.12, 0.3), stoneL, 0, P - 0.06 - k*0.11, CF + 0.17 + k*0.28));

  // the centre block: walls with coursing, corner pilasters, entablature with a gilt line, a pediment, a blue slate roof
  g.add(mesh(box(2*CX, CW - P, CF - CB), stone, 0, (CW + P)/2, (CF + CB)/2));
  const course = [];
  for(let y = P + 0.42; y < CW - 0.1; y += 0.42){ course.push([0, y, CF + 0.006, 2*CX, 0.025, 0.012]); [-1, 1].forEach(s => course.push([s*(CX + 0.006), y, (CF + CB)/2, 0.012, 0.025, CF - CB])); }
  g.add(instanced(unit, mat(0xbfb59e), course, false));
  [-1, 1].forEach(s => {
    g.add(mesh(box(0.38, CW - P - 0.3, 0.22), stoneL, s*(CX - 0.19), (CW + P)/2, CF + 0.11));
    g.add(mesh(box(0.52, 0.18, 0.32), stoneL, s*(CX - 0.19), CW - 0.09, CF + 0.12), mesh(box(0.5, 0.16, 0.3), stoneD, s*(CX - 0.19), P + 0.08, CF + 0.12));
  });
  g.add(mesh(box(2*CX + 0.3, 0.34, CF - CB + 0.3), stoneL, 0, CW + 0.17, (CF + CB)/2));
  g.add(mesh(box(2*CX + 0.32, 0.05, 0.02), gold, 0, CW + 0.1, CF + 0.16));
  g.add(mesh(box(2*CX + 0.5, 0.1, CF - CB + 0.5), stoneL, 0, CW + 0.39, (CF + CB)/2));
  const E = CW + 0.44, HW = CX + 0.3;                                    // eaves height, half span of the roof
  g.add(mesh(prism([[-CX, E], [CX, E], [0, RY - 0.12]], CF - CB), stone, 0, 0, (CF + CB)/2));   // gable fill
  g.add(mesh(prism([[-CX + 0.22, E + 0.06], [CX - 0.22, E + 0.06], [0, RY - 0.3]], 0.04), stoneD, 0, 0, CF + 0.02));   // recessed tympanum
  const rake = Math.atan2(RY - E, HW), RL = Math.hypot(HW, RY - E);
  [-1, 1].forEach(s => { const c = mesh(box(RL + 0.1, 0.12, 0.34), stoneL, s*HW/2, (E + RY)/2 + 0.04, CF + 0.12); c.rotation.z = -s*rake; g.add(c); });
  g.add(mesh(prism([[-HW, E], [0, RY], [HW, E], [HW, E + 0.16], [0, RY + 0.16], [-HW, E + 0.16]], CF - CB + 0.4), slate, 0, 0, (CF + CB)/2));
  g.add(mesh(box(0.2, 0.12, CF - CB + 0.45), slateD, 0, RY + 0.17, (CF + CB)/2));
  [0.35, 0.7, 1.05].forEach(d => [-1, 1].forEach(s => { const l = mesh(box(0.04, 0.03, CF - CB + 0.38), slateD, s*d, RY + 0.17 - d*(RY - E)/HW, (CF + CB)/2); l.rotation.z = -s*rake; g.add(l); }));
  // the pediment's carving: the lamp of learning in a gilded laurel (as at the far end of the hall)
  const wreath = laurel(0.34, gold); wreath.position.set(0, E + 0.5, CF + 0.08); g.add(wreath);
  const lampBody = mesh(new THREE.SphereGeometry(0.13, 10, 6), gold, 0, E + 0.4, CF + 0.1); lampBody.scale.set(1.3, 0.5, 0.7); g.add(lampBody);
  const flameM = glow(0xffd27a, 2.2).clone(), flame = mesh(new THREE.ConeGeometry(0.05, 0.2, 6), flameM, 0.16, E + 0.52, CF + 0.1); flame.castShadow = false; g.add(flame);

  // the great door: an arch of voussoirs with a gilt keystone, open double doors on the lit hall, a plaque above
  const DW = 1.1, DS = P + 1.65, AR = DW/2;
  [mesh(box(DW, DS - P, 0.02), litM, 0, (DS + P)/2, CF + 0.01), mesh(new THREE.CylinderGeometry(AR, AR, 0.02, 14, 1, false, -PI/2, PI).rotateX(-PI/2), litM, 0, DS, CF + 0.01)]
    .forEach(o => { o.castShadow = false; g.add(o); });   // the lit hall seen through the open door
  const dress = [];
  [-1, 1].forEach(s => { for(let j = 0; j < 6; j++){ const w = j % 2 ? 0.16 : 0.24; dress.push([s*(AR + w/2), P + 0.14 + j*0.28, CF + 0.05, w, 0.26, 0.1, 0, j % 2 ? STONE_L : MARBLE]); } });
  for(let i = 0; i < 11; i++){ const th = (i + 0.5)*PI/11, key = i === 5; dress.push([Math.cos(th)*(AR + 0.13), DS + Math.sin(th)*(AR + 0.13), CF + 0.05, key ? 0.16 : 0.13, key ? 0.3 : 0.24, key ? 0.13 : 0.1, 0, key ? GOLD : STONE_L, 0, th - PI/2]); }
  g.add(instanced(unit, mat(0xffffff), dress));
  [-1, 1].forEach(s => {   // the leaves, hung at the jambs and swung open outward
    const h = new THREE.Group(); h.position.set(s*AR, 0, CF + 0.04); h.rotation.y = s*1.15; g.add(h);
    h.add(mesh(box(DW/2 - 0.02, DS - P - 0.02, 0.06), wood, -s*DW/4, (DS + P)/2, 0));
    [0.7, 1.35].forEach(y => h.add(mesh(box(DW/2 - 0.08, 0.05, 0.02), iron, -s*DW/4, P + y, 0.04)));
    h.add(mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 10), gold, -s*(DW/2 - 0.1), P + 1.0, 0.05));
  });
  const PY = DS + AR + 0.42, OY = CW - 0.5;                              // the emblem plaque over the arch; a round window above it
  g.add(mesh(box(0.86, 0.36, 0.06), mat(NAVY), 0, PY, CF + 0.04), mesh(box(0.92, 0.42, 0.04), gold, 0, PY, CF + 0.02));
  const dia = mesh(new THREE.OctahedronGeometry(0.11), gold, 0, PY, CF + 0.09); dia.scale.z = 0.3; g.add(dia);
  const ocu = mesh(cyl(0.24, 0.24, 0.02, 16).rotateX(PI/2), litM, 0, OY, CF + 0.01); ocu.castShadow = false; g.add(ocu);
  g.add(mesh(new THREE.TorusGeometry(0.27, 0.05, 5, 18), stoneL, 0, OY, CF + 0.04));
  [0, 1, 2, 3].forEach(k => { const b = mesh(box(0.46, 0.025, 0.02), mat(0x2a2522), 0, OY, CF + 0.03); b.rotation.z = k*PI/4; g.add(b); });
  // navy banners either side of the door, a gold diamond on each
  const banners = [-1, 1].map(s => {
    const b = new THREE.Group(); b.position.set(s*0.98, CW - 0.06, CF + 0.08); g.add(b);
    b.add(mesh(bannerGeo(0.5, 2.1, 0.22), mat(GOLD, {side:THREE.DoubleSide}), 0, 0.02, -0.005), mesh(bannerGeo(0.42, 2.02, 0.2), mat(NAVY, {side:THREE.DoubleSide}), 0, 0, 0));
    const d = mesh(new THREE.OctahedronGeometry(0.1), gold, 0, -0.85, 0.01); d.scale.set(1, 1.4, 0.2); b.add(d);
    b.add(mesh(cyl(0.02, 0.02, 0.6, 6).rotateZ(PI/2), gold, 0, 0.02, 0.01));
    return b;
  });

  // more of the centre block: a rusticated base course, dentils under the cornices, rosettes in the frieze, gilt acroteria,
  // a clerestory of lit arched windows above the wings with pilasters between, and an open lantern on the ridge
  const rust = [], RS = [0xcfc5ae, 0xc6bca4, 0xd8cfba, 0xbfb59d];
  [0.5, 0.82].forEach((y, r) => {
    for(let x = -CX + (r % 2)*0.25, j = 0; x < CX - 0.05; j++){ const w = 0.48, a0 = Math.max(x, -CX), b0 = Math.min(x + w, CX); x += w; if(Math.abs((a0 + b0)/2) < AR + 0.3) continue; if(b0 - a0 > 0.1) rust.push([(a0 + b0)/2, y, CF + 0.025, b0 - a0 - 0.05, 0.28, 0.05, 0, RS[(j + r) % 4]]); }
    [-1, 1].forEach(sd => { for(let z = CB + (r % 2)*0.25, j = 0; z < CF - 0.05; j++){ const a0 = Math.max(z, CB), b0 = Math.min(z + 0.48, CF); z += 0.48; if(b0 - a0 > 0.1) rust.push([sd*(CX + 0.025), y, (a0 + b0)/2, 0.05, 0.28, b0 - a0 - 0.05, 0, RS[(j + r + 1) % 4]]); } });
  });
  g.add(instanced(unit, mat(0xffffff), rust));
  const dent = [];
  for(let x = -CX - 0.1; x <= CX + 0.1; x += 0.16) dent.push([x, CW + 0.29, CF + 0.29, 0.07, 0.08, 0.06, 0]);
  [-1, 1].forEach(sd => { for(let z = CB - 0.1; z <= CF + 0.1; z += 0.16) dent.push([sd*(CX + 0.17), CW + 0.29, z, 0.06, 0.08, 0.07, 0]); });
  g.add(instanced(unit, stoneL, dent, false));
  g.add(instanced(cyl(0.07, 0.07, 0.03, 8).rotateX(PI/2), gold, [-1.1, -0.55, 0, 0.55, 1.1].map(x => [x, CW + 0.2, CF + 0.165, 1, 1, 1, 0]), false));
  [[0, RY + 0.22], [-HW + 0.08, E + 0.12], [HW - 0.08, E + 0.12]].forEach(([x, y]) => { const a = mesh(new THREE.OctahedronGeometry(0.12), gold, x, y, CF + 0.12); a.scale.set(1, 1.6, 0.35); g.add(a); });
  const clr = [], clrPanes = [];
  [-1, 1].forEach(sd => {
    for(let z = CB + 0.55; z < CF - 0.4; z += 0.75){
      clrPanes.push([sd*(CX + 0.005), 3.85, z, 0.02, 0.4, 0.28, 0]);
      clr.push([sd*(CX + 0.03), 3.85, z - 0.19, 0.06, 0.52, 0.07, 0], [sd*(CX + 0.03), 3.85, z + 0.19, 0.06, 0.52, 0.07, 0], [sd*(CX + 0.05), 3.58, z, 0.1, 0.06, 0.44, 0]);
      clr.push([sd*(CX + 0.04), 3.85, z + 0.375, 0.08, 0.7, 0.16, 0]);   // pilaster strip
    }
  });
  g.add(instanced(unit, litM, clrPanes, false), instanced(unit, stoneL, clr));
  [-1, 1].forEach(sd => { for(let z = CB + 0.55; z < CF - 0.4; z += 0.75){ const h = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 10, 1, false, -PI/2, PI).rotateX(-PI/2), litM, sd*(CX + 0.005), 4.05, z); h.rotation.y = sd*PI/2; h.castShadow = false; g.add(h); } });
  // the ridge lantern: a little open cupola at the back of the roof, a flame burning in it
  const LZ = CB + 0.9, LB = RY - 0.15;
  g.add(mesh(box(0.7, 0.3, 0.7), stoneL, 0, LB + 0.15, LZ));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(mesh(cyl(0.035, 0.035, 0.55, 6), stoneL, a*0.26, LB + 0.57, LZ + b*0.26)));
  g.add(mesh(box(0.74, 0.08, 0.74), stoneL, 0, LB + 0.88, LZ), mesh(new THREE.ConeGeometry(0.5, 0.42, 4).rotateY(PI/4), slate, 0, LB + 1.13, LZ), mesh(new THREE.SphereGeometry(0.07, 6, 4), gold, 0, LB + 1.4, LZ));
  const cupFlame = mesh(new THREE.ConeGeometry(0.1, 0.3, 6), flameM, 0, LB + 0.5, LZ); cupFlame.castShadow = false; g.add(cupFlame);
  g.add(mesh(cyl(0.14, 0.09, 0.08, 8), gold, 0, LB + 0.33, LZ));
  // cheek walls along the steps, an urn on each
  [-1, 1].forEach(sd => {
    const cw = mesh(box(0.18, 0.42, 0.95), stoneL, sd*1.6, 0.21, CF + 0.48); g.add(cw);
    g.add(mesh(cyl(0.12, 0.08, 0.18, 8), stoneD, sd*1.6, 0.51, CF + 0.85), mesh(new THREE.SphereGeometry(0.11, 8, 6), mat(0x4f7a3a), sd*1.6, 0.66, CF + 0.85));
  });

  // the wings: a back wall with lit doors, a colonnade with banners between the columns, hanging lanterns, a slate roof
  const half = (WF - WB)/2 + 0.28, rise = 0.6, ZC = (WF + WB)/2, cols = [], bans = [];
  [-1, 1].forEach(s => {
    const xm = s*(CX + WX)/2, len = WX - CX;
    g.add(mesh(box(len, WT - P + 0.25, 0.24), stone, xm, (WT + P + 0.25)/2, WB + 0.12));
    g.add(mesh(box(0.24, WT - P + 0.25, WF - WB), stone, s*(WX - 0.12), (WT + P + 0.25)/2, ZC));
    [-0.45, 0.45].forEach(dx => {
      const lit = mesh(box(0.46, 1.15, 0.03), litM, xm + dx, P + 0.62, WB + 0.255); lit.castShadow = false; g.add(lit);
      g.add(mesh(box(0.58, 0.08, 0.06), stoneL, xm + dx, P + 1.24, WB + 0.27));
      [-1, 1].forEach(e => g.add(mesh(box(0.06, 1.2, 0.06), stoneL, xm + dx + e*0.26, P + 0.62, WB + 0.27)));
    });
    for(let k = 0; k < 4; k++) cols.push([s*(CX + 0.27 + k*0.5), WF - 0.12]);
    for(let k = 0; k < 3; k++) bans.push([s*(CX + 0.52 + k*0.5), WF - 0.12]);
    g.add(mesh(box(len + 0.12, 0.28, 0.34), stoneL, xm, WT + 0.12, WF - 0.12), mesh(box(len + 0.14, 0.04, 0.02), gold, xm, WT + 0.06, WF + 0.06));
    g.add(mesh(box(len, 0.08, WF - WB), stoneD, xm, WT + 0.02, ZC));                            // the colonnade's ceiling
    g.add(mesh(prism([[-half, 0], [0, rise], [half, 0], [half, 0.14], [0, rise + 0.14], [-half, 0.14]], len + 0.3).rotateY(PI/2), slate, xm + s*0.15, WT + 0.26, ZC));
    g.add(mesh(box(len + 0.32, 0.1, 0.16), slateD, xm + s*0.15, WT + 0.26 + rise + 0.15, ZC));
    g.add(mesh(prism([[-half + 0.3, 0], [half - 0.3, 0], [0, rise - 0.06]], 0.24).rotateY(PI/2), stone, s*(WX - 0.12), WT + 0.26, ZC));   // the wing's end gable
    [-0.42, 0.42].forEach(dz => { const l = mesh(box(len + 0.28, 0.03, 0.04), slateD, xm + s*0.15, WT + 0.4 + rise*(1 - Math.abs(dz)/half) - 0.02, ZC + dz); g.add(l); });
    [-0.9, 0, 0.9].forEach(dx => g.add(mesh(box(0.2, WT - P, 0.08), stoneL, xm + dx, (WT + P)/2, WB + 0.28)));   // pilasters on the back wall
    // a tall arched window in the wing's end wall, lit from inside, in a stone frame with a keystone and sill
    const ew = new THREE.Group(); ew.position.set(s*(WX + 0.005), 0, ZC); ew.rotation.y = s*PI/2; g.add(ew);
    [mesh(box(0.5, 1.1, 0.02), litM, 0, P + 0.95, 0), mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 12, 1, false, -PI/2, PI).rotateX(-PI/2), litM, 0, P + 1.5, 0)].forEach(o => { o.castShadow = false; ew.add(o); });
    [-1, 1].forEach(e => ew.add(mesh(box(0.1, 1.2, 0.08), stoneL, e*0.3, P + 0.95, 0.04)));
    ew.add(mesh(new THREE.TorusGeometry(0.3, 0.06, 4, 12, PI), stoneL, 0, P + 1.5, 0.04), mesh(box(0.12, 0.16, 0.1), gold, 0, P + 1.82, 0.05), mesh(box(0.72, 0.07, 0.16), stoneL, 0, P + 0.36, 0.06));
    ew.add(mesh(box(0.02, 1.4, 0.03), mat(0x2a2522), 0, P + 1.05, 0.02), mesh(box(0.5, 0.02, 0.03), mat(0x2a2522), 0, P + 1.1, 0.02));
    for(let k = 0; k < 6; k++) g.add(mesh(new THREE.ConeGeometry(0.06, 0.16, 4), stoneL, s*(CX + 0.18 + k*0.33), WT + 0.4, WF + 0.26));   // antefixes along the eave
    const acro = mesh(new THREE.OctahedronGeometry(0.09), gold, s*(WX + 0.02), WT + 0.26 + rise + 0.2, ZC); acro.scale.set(0.35, 1.5, 1); g.add(acro);
    // lanterns hanging in the colonnade
    [-0.45, 0.45].forEach(dx => {
      g.add(mesh(cyl(0.01, 0.01, 0.4, 3), iron, xm + dx, WT - 0.2, WF - 0.5));
      const L = mesh(box(0.14, 0.18, 0.14), lampM, xm + dx, WT - 0.5, WF - 0.5); L.castShadow = false; g.add(L);
      g.add(mesh(new THREE.ConeGeometry(0.12, 0.09, 4).rotateY(PI/4), iron, xm + dx, WT - 0.38, WF - 0.5));
    });
    // planters along the front of the wing
    [-0.4, 0.4].forEach(dx => { g.add(mesh(box(0.66, 0.3, 0.34), stoneL, xm + dx, 0.15, WF + 0.3)); for(let k = 0; k < 3; k++) g.add(mesh(new THREE.DodecahedronGeometry(0.15, 0), mat(k % 2 ? 0x4f7a3a : 0x5e8f43), xm + dx - 0.2 + k*0.2, 0.38, WF + 0.3)); });
  });
  g.add(instanced(cyl(0.085, 0.105, WT - P - 0.26, 8), marble, cols.map(([x, z]) => [x, (WT + P)/2, z, 1, 1, 1, 0])));
  g.add(instanced(unit, stoneL, cols.flatMap(([x, z]) => [[x, P + 0.07, z, 0.28, 0.14, 0.28, 0], [x, WT - 0.07, z, 0.3, 0.14, 0.3, 0]])));
  const bannerRows = bans.map(([x, z]) => [x, WT - 0.02, z, 1, 1, 1, 0]);
  g.add(instanced(bannerGeo(0.3, 0.8, 0.12), mat(NAVY, {side:THREE.DoubleSide}), bannerRows, false));
  g.add(instanced(new THREE.OctahedronGeometry(0.06), gold, bans.map(([x, z]) => [x, WT - 0.4, z + 0.01, 1, 1.4, 0.25, 0]), false));

  // guardian lions either side of the steps, lanterns on posts, slim cypresses at the corners
  [-1, 1].forEach(s => { const l = lion(); l.position.set(s*1.9, 0, CF + 0.55); l.rotation.y = s*0.15; g.add(l); });
  [-1, 1].forEach(s => {
    g.add(mesh(box(0.22, 0.2, 0.22), stoneD, s*1.2, 0.1, CF + 0.95), mesh(cyl(0.035, 0.045, 0.85, 5), iron, s*1.2, 0.62, CF + 0.95));
    const L = mesh(box(0.17, 0.22, 0.17), lampM, s*1.2, 1.15, CF + 0.95); L.castShadow = false; g.add(L);
    g.add(mesh(new THREE.ConeGeometry(0.15, 0.12, 4).rotateY(PI/4), iron, s*1.2, 1.33, CF + 0.95));
    g.add(mesh(cyl(0.07, 0.09, 0.4, 5), mat(0x5a3d28), s*3.0, 0.2, WF + 0.75), mesh(new THREE.ConeGeometry(0.3, 2.1, 7), mat(0x2f5a34), s*3.0, 1.35, WF + 0.75));
  });

  const pl = new THREE.PointLight(0xffb060, 0.9, 9, 2); pl.position.set(0, 1.4, CF + 1.0); g.add(pl);
  animated.push({fn:t => {
    banners.forEach((b, k) => { b.rotation.x = Math.sin(t*1.2 + k*1.9)*0.05; });
    const f = Math.sin(t*7.3)*0.12 + Math.sin(t*13.1)*0.08;
    lampM.emissiveIntensity = 1.9 + f; flameM.emissiveIntensity = 2.1 + f*2; flame.scale.y = 1 + Math.sin(t*9)*0.15; cupFlame.scale.y = 1 + Math.sin(t*8.3 + 1)*0.18;
    litM.emissiveIntensity = 1.45 + f*0.5;
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
  const placed = [], walk = isl.obs + 1.4 + 0.65;                     // keep clear of the circle the wizard walks round the building
  const free = (x, z, r, pathGap = 1.0) => Math.hypot(x, z) - r > walk && Math.hypot(x, z) + r < 0.84*isl.edgeR(Math.atan2(z, x))
    && isl.pathDist(x, z) > pathGap + r && !placed.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + r + 0.25)
    && !obstacles.some(o => Math.hypot(isl.x + x - o.x, isl.z + z - o.z) < o.r + r + 0.1);
  const put = (o, x, z, r, ry = Math.atan2(-x, -z)) => { o.position.set(x, isl.topY(x, z) - 0.03, z); o.rotation.y = ry; grp.add(o); placed.push([x, z, r]); obstacles.push({x:isl.x + x, z:isl.z + z, r}); };

  // the forecourt: a crescent round the front of the court — banner poles either side of the way in, then cypresses,
  // iron lanterns and scholars' busts. Angles are in the building's frame (0 = straight out of the door).
  const at = (a, R) => isl.rot(Math.sin(a)*R, Math.cos(a)*R), lamps = [], banners = [], FR = walk + 0.45;
  [-1, 1].forEach(sd => {
    [[0.42, 'banner'], [0.66, 'cypress'], [0.86, 'lamp'], [1.06, 'cypress'], [1.27, 'bust'], [1.48, 'cypress']].forEach(([a, kind]) => {
      const [x, z] = at(sd*a, FR); if(!free(x, z, 0.3, 0.7)) return;
      if(kind === 'banner'){
        const pole = new THREE.Group();
        pole.add(mesh(box(0.34, 0.3, 0.34), mat(STONE_D), 0, 0.15, 0), mesh(cyl(0.04, 0.05, 3.4, 6), mat(0x2a2522), 0, 1.9, 0), mesh(new THREE.SphereGeometry(0.08, 6, 4), mat(GOLD, {metalness:0.6, roughness:0.35}), 0, 3.65, 0));
        const b = new THREE.Group(); b.position.set(0, 3.45, 0.06); pole.add(b);
        b.add(mesh(cyl(0.02, 0.02, 0.7, 5).rotateZ(PI/2), mat(0x2a2522), 0, 0, 0));
        b.add(mesh(bannerGeo(0.56, 1.5, 0.2), mat(NAVY, {side:THREE.DoubleSide}), 0, -0.03, 0), mesh(bannerGeo(0.62, 1.56, 0.2), mat(GOLD, {side:THREE.DoubleSide}), 0, 0, -0.01));
        const d = mesh(new THREE.OctahedronGeometry(0.09), mat(GOLD, {metalness:0.6, roughness:0.35}), 0, -0.6, 0.01); d.scale.set(1, 1.4, 0.2); b.add(d);
        put(pole, x, z, 0.2, isl.face); banners.push(b);
      }
      else if(kind === 'lamp'){ const ln = lampPost(); put(ln, x, z, 0.18); lamps.push(ln.userData.lamp); }
      else if(kind === 'bust') put(bust(), x, z, 0.3);
      else put(cypress(0.95 + rand()*0.2, rand), x, z, 0.3, rand()*6);
    });
  });
  // clipped box hedges framing the sides and back of the hall (a ring of short runs, broken by the paths)
  const hedge = [];
  for(let k = 0; k < 40; k++){
    const a = k/40*PI*2, bx = Math.sin(a), bz = Math.cos(a);           // building frame: a = 0 is straight out of the door
    if(Math.min(a, 2*PI - a) < 1.62) continue;                         // the front belongs to the forecourt
    const R = walk + 0.55, [x, z] = isl.rot(bx*R, bz*R);
    if(!free(x, z, 0.3, 0.75)) continue;
    hedge.push([x, isl.topY(x, z) + 0.26, z, Math.atan2(x, z)]); placed.push([x, z, 0.32]);
  }
  const hM = new THREE.InstancedMesh(box(1.02, 0.52, 0.42), mat(0x3a6236), hedge.length), D = new THREE.Object3D();
  hedge.forEach(([x, y, z, a], i) => { D.position.set(x, y, z); D.rotation.set(0, a + PI/2, 0); D.updateMatrix(); hM.setMatrixAt(i, D.matrix); });
  hM.castShadow = hM.receiveShadow = true; grp.add(hM);
  hedge.forEach(([x, , z]) => obstacles.push({x:isl.x + x, z:isl.z + z, r:0.3}));

  // the rest of the grounds: a statue, scroll racks, benches and a few olive trees, wherever there's room
  const items = [['statue', 0.45], ['rack', 0.6], ['bench', 0.62], ['olive', 0.4], ['rack', 0.6], ['bench', 0.62], ['olive', 0.4], ['olive', 0.4], ['bust', 0.35]];
  for(const [kind, r] of items){
    for(let tries = 0; tries < 80; tries++){
      const a = rand()*PI*2, e = isl.edgeR(a)*0.8, d = walk + r + (e - walk - r)*Math.sqrt(rand()), x = Math.sin(a)*d, z = Math.cos(a)*d;
      if(e < walk + r || !free(x, z, r, 1.2 + r*0.6)) continue;
      const o = kind === 'olive' ? olive(rand) : kind === 'bust' ? bust() : kind === 'statue' ? statue() : kind === 'rack' ? rack() : bench();
      put(o, x, z, r, kind === 'olive' ? rand()*6 : Math.atan2(-x, -z));   // furniture faces the hall
      break;
    }
  }
  animated.push({fn:t => {
    banners.forEach((b, k) => { b.rotation.x = Math.sin(t*1.1 + k*2.1)*0.06; });
    lamps.forEach((m, k) => { m.emissiveIntensity = 1.8 + Math.sin(t*7.3 + k)*0.12 + Math.sin(t*13.1 + k*2)*0.08; });
  }});
}
// an iron lamp post with a glowing lantern (its own material, so it can flicker)
function lampPost(){
  const g = new THREE.Group(), iron = mat(0x2a2522), m = glow(0xffc070, 1.8).clone();
  g.add(mesh(box(0.26, 0.22, 0.26), mat(STONE_D), 0, 0.11, 0), mesh(cyl(0.035, 0.05, 1.7, 6), iron, 0, 1.0, 0));
  const l = mesh(box(0.2, 0.26, 0.2), m, 0, 1.97, 0); l.castShadow = false; g.add(l);
  g.add(mesh(new THREE.ConeGeometry(0.18, 0.14, 4).rotateY(PI/4), iron, 0, 2.17, 0));
  g.userData.lamp = m; return g;
}
