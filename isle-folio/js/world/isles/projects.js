/* Forgewell (projects): the foundry hall seen from outside, plus an ore cart, ore heap and quench trough. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { anvil, instanced } from '../props.js';
import { obstacles } from '../terrain.js';

// local seeded random: never touch engine rnd() (shared sequence for every island)
let seed = 4242;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const STONE = 0x6f6a64, DARK = 0x4f4b47, BRICK = 0x8a4f3a, TIMBER = 0x4a3424, PLASTER = 0xcdb58c,
      ROOF = 0x7d3b2b, WOOD = 0x7a5536, IRON = 0x3a3d44, WATER = 0x3d6f8a, DEEP = 0x231a14, LEATHER = 0x7a4630;
const BRICKS = [0x8a4f3a, 0x7d4433, 0x955a42, 0x6f3e30, 0x84503e], STONES = [0x6f6a64, 0x67625c, 0x77716a, 0x5f5a55];
// the hall: half width, apse centre z (the back is a half-round, like the hall's curved wall inside), front wall z, eaves;
// roof run past the wall, rise, pitch, ridge
const W = 1.8, ZB = -0.65, ZF = 1.4, EH = 2.6, RR = W + 0.3, RH = 1.45, RK = RH/RR, RY = EH - 0.2 + RH;

const add = (g, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = mesh(geo, m, x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
const halfDisc = (r, t = 0.04) => new THREE.CylinderGeometry(r, r, t, 14, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2);   // upper half, facing +z

function barrel(){
  const g = new THREE.Group();
  add(g, cyl(0.3, 0.27, 0.7, 10), mat(WOOD), 0, 0.35, 0);
  [0.12, 0.58].forEach(y => add(g, cyl(0.31, 0.31, 0.06, 10), mat(IRON), 0, y, 0));
  add(g, cyl(0.27, 0.27, 0.02, 10), mat(WATER, {roughness:0.3}), 0, 0.66, 0);
  return g;
}

/* The building: centred on the origin at ground level, front door facing +z, inside radius obs (3.1).
   The foundry inside (rooms/projects.js) is a hall with a curved back wall of stone plinth blocks, timber pilasters and
   protruding bricks under a timber wall-plate, a furnace with a banded chimney, and mine tunnels the carts run into;
   outside it is the same hall: brick on a stone footing, a half-round apse, the chimney, a tunnel mouth and a smelter. */
export function building(animated){
  const g = new THREE.Group(), flat = o => { o.castShadow = false; return o; };
  const tim = mat(TIMBER), iron = mat(IRON, {roughness:0.6, metalness:0.4}), unit = box(1, 1, 1), tinted = mat(0xffffff, {roughness:0.95});
  // a point on a wall: a = its outward angle (0 front, ±π/2 sides, π back), u across it, d out from the axis through (0, cz)
  const at = (a, u, d, cz = 0) => [Math.sin(a)*d + Math.cos(a)*u, cz + Math.cos(a)*d - Math.sin(a)*u];
  const row = (a, u, y, d, sx, sy, sz, c, cz = 0, rz = 0) => { const [x, z] = at(a, u, d, cz); return [x, y, z, sx, sy, sz, a, c, 0, rz]; };
  const side = (s, z) => [s*Math.PI/2, -s*z];                                   // a side wall's (a, u) for a point at z
  const APSE = [Math.PI/2, Math.PI];                                             // CylinderGeometry thetaStart/Length for the back half

  // plinth and steps, then the walls: a box for the nave and a half-cylinder for the apse
  add(g, box(2*W + 0.3, 0.3, ZF - ZB + 0.15), mat(DARK), 0, 0.15, (ZF + 0.15 + ZB)/2);
  add(g, cyl(W + 0.15, W + 0.2, 0.3, 18, 1, false, ...APSE), mat(DARK), 0, 0.15, ZB);
  add(g, box(1.7, 0.15, 0.32), mat(DARK), 0, 0.075, ZF + 0.31);
  add(g, box(2*W, EH - 0.3, ZF - ZB), mat(BRICK), 0, (EH + 0.3)/2, (ZF + ZB)/2);
  add(g, cyl(W, W, EH - 0.3, 18, 1, false, ...APSE), mat(BRICK), 0, (EH + 0.3)/2, ZB);

  // openings, so masonry steers round them: [a, u0, u1, y0, y1] (apse: u is the angle)
  const WZ = -0.15, FZ = 0.85, SLITS = [Math.PI - 0.75, Math.PI + 0.75];       // side window z, side feature z (tunnel / smelter)
  const holes = [[0, -0.82, 0.82, 0, 2.35]];
  [-1, 1].forEach(s => { const [a, u] = side(s, WZ), [, f] = side(s, FZ); holes.push([a, u - 0.28, u + 0.28, 1.0, 2.25], [a, f - 0.62, f + 0.62, 0, 2.05]); });
  const clear = (a, u, y, w) => !holes.some(([ha, u0, u1, y0, y1]) => ha === a && u + w/2 > u0 && u - w/2 < u1 && y > y0 && y < y1);
  const apseClear = (a, y) => Math.abs(a - Math.PI) > 0.36 && !SLITS.some(s => Math.abs(a - s) < 0.14 && y > 1.25 && y < 2.2);

  // stone footing: two courses of blocks all round (as the hall's plinth blocks)
  const stones = [], lay = (u0, u1, r, fn) => { for(let u = u0 - (r % 2)*0.22; u < u1;){ const w = 0.38 + rand()*0.3, p = Math.max(u, u0), q = Math.min(u + w, u1); if(q - p > 0.08) fn((p + q)/2, q - p - 0.05); u += w; } };
  const SC = () => STONES[Math.floor(rand()*STONES.length)];
  [0.47, 0.79].forEach((y, r) => {
    [-1, 1].forEach(s => lay(ZB, ZF, r, (z, w) => { const [a, u] = side(s, z); stones.push(row(a, u, y, W + 0.04, w, 0.3, 0.08, SC())); }));
    [[-W, -0.84], [0.84, W]].forEach(([u0, u1]) => lay(u0, u1, r, (u, w) => stones.push(row(0, u, y, ZF + 0.04, w, 0.3, 0.08, SC()))));
    for(let k = 0, N = 15; k < N; k++){ const a = Math.PI/2 + (k + 0.5 + (r % 2)*0.5)*Math.PI/N; if(a < 1.5*Math.PI && Math.abs(a - Math.PI) > 0.36) stones.push(row(a, 0, y, W + 0.04, 0.34, 0.3, 0.08, SC(), ZB)); }
  });
  g.add(instanced(unit, tinted, stones));

  // protruding bricks scattered over the walls above the footing
  const bricks = [], BC = () => BRICKS[Math.floor(rand()*BRICKS.length)];
  for(let k = 0; k < 260; k++){
    const y = 1.08 + rand()*1.35, w = 0.26 + rand()*0.12, pick = rand();
    if(pick < 0.5){ const s = rand() < 0.5 ? -1 : 1, z = ZB + rand()*(ZF - ZB), [a, u] = side(s, z); if(clear(a, u, y, w)) bricks.push(row(a, u, y, W + 0.02, w, 0.12, 0.05, BC())); }
    else if(pick < 0.75){ const u = (rand()*2 - 1)*(W - 0.15); if(clear(0, u, y, w)) bricks.push(row(0, u, y, ZF + 0.02, w, 0.12, 0.05, BC())); }
    else { const a = Math.PI/2 + rand()*Math.PI; if(apseClear(a, y)) bricks.push(row(a, 0, y, W + 0.02, w, 0.12, 0.05, BC(), ZB)); }
  }
  g.add(instanced(unit, tinted, bricks));

  // timber pilasters, a sill rail on the footing and a wall-plate under the eaves
  const posts = [], PY = (EH + 0.95)/2, PH = EH - 0.95;
  [-1, 1].forEach(s => [ZB + 0.06, 0.28, ZF - 0.07].forEach(z => { const [a, u] = side(s, z); posts.push(row(a, u, PY, W + 0.05, 0.16, PH, 0.12)); }));
  [-W + 0.07, -1.02, 1.02, W - 0.07].forEach(x => posts.push(row(0, x, PY, ZF + 0.05, 0.16, PH, 0.12)));
  [-1.15, -0.4, 0.4, 1.15].forEach(o => posts.push(row(Math.PI + o, 0, PY, W + 0.05, 0.16, PH, 0.12, undefined, ZB)));
  g.add(instanced(unit, tim, posts));
  [[0.97, 0.08], [EH - 0.06, 0.14]].forEach(([y, h], k) => {
    [-1, 1].forEach(s => add(g, box(0.12, h, ZF - ZB + 0.12), tim, s*(W + 0.06), y, (ZF + ZB)/2 + 0.06));
    if(k) add(g, box(2*W + 0.24, h, 0.12), tim, 0, y, ZF + 0.06);
    else [-1, 1].forEach(s => add(g, box(W - 0.82 + 0.12, h, 0.12), tim, s*(W + 0.82 + 0.12)/2, y, ZF + 0.06));
    add(g, cyl(W + 0.06, W + 0.06, h, 18, 1, true, ...APSE), tim, 0, y, ZB);
  });

  // roof: gable over the nave, a half cone over the apse (same pitch, so they meet), tile courses, ridge
  const roofM = mat(ROOF), roofD = mat(ROOF, {side:THREE.DoubleSide}), ridgeM = mat(0x5a2a1f), LZ = ZF + 0.32 - ZB, L = Math.hypot(RR, RH), ang = Math.atan(RK);
  [-1, 1].forEach(s => {
    const r = new THREE.Group(); r.position.set(s*RR/2, EH - 0.2 + RH/2, ZB + LZ/2); r.rotation.z = -s*ang; g.add(r);
    add(r, box(L, 0.1, LZ), roofM, 0, 0.05, 0);
    for(let u = -L/2 + 0.22; u < L/2 - 0.1; u += 0.3) add(r, box(0.05, 0.04, LZ), ridgeM, u, 0.11, 0);
    add(r, box(L, 0.16, 0.07), tim, 0, 0.02, LZ/2 + 0.02);                      // barge board on the gable
  });
  add(g, new THREE.ConeGeometry(RR, RH, 18, 1, true, ...APSE), roofD, 0, EH - 0.2 + RH/2 + 0.1, ZB);
  for(let r = 0.5; r < RR; r += 0.3) add(g, new THREE.TorusGeometry(r, 0.025, 3, 14, Math.PI).rotateX(-Math.PI/2), ridgeM, 0, RY + 0.13 - r*RK, ZB);
  add(g, box(0.18, 0.14, LZ + 0.06), ridgeM, 0, RY + 0.14, ZB + LZ/2);

  // front gable: plaster in a timber frame, an iron plate with crossed gold hammers, a small glowing vent
  const tri = new THREE.Shape(); tri.moveTo(-W, 0); tri.lineTo(W, 0); tri.lineTo(0, W*RK); tri.closePath();
  const gab = new THREE.ExtrudeGeometry(tri, {depth:0.2, bevelEnabled:false}); gab.translate(0, 0, -0.2);
  add(g, gab, mat(PLASTER), 0, EH, ZF);
  [-0.75, 0.75].forEach(x => add(g, box(0.1, (W - 0.75)*RK, 0.06), tim, x, EH + (W - 0.75)*RK/2, ZF + 0.03));
  add(g, box(1.5, 0.1, 0.06), tim, 0, EH + (W - 0.75)*RK, ZF + 0.03);
  [-1, 1].forEach(s => add(g, box(0.06, 0.62, 0.05), tim, s*0.42, EH + 0.36, ZF + 0.02, 0, 0, s*0.75));
  add(g, cyl(0.24, 0.24, 0.04, 12), iron, 0, EH + 0.38, ZF + 0.05, Math.PI/2);
  const gold = mat(0xc9a24a, {metalness:0.6, roughness:0.4});
  [-1, 1].forEach(s => {
    add(g, box(0.035, 0.36, 0.02), mat(WOOD), 0, EH + 0.38, ZF + 0.08, 0, 0, s*0.7);
    add(g, box(0.14, 0.06, 0.04), gold, -s*0.12, EH + 0.5, ZF + 0.09, 0, 0, s*0.7);
  });
  const ventM = glow(0xff9a40, 1.4).clone();
  flat(add(g, cyl(0.11, 0.11, 0.02, 10), ventM, 0, EH + 1.0, ZF + 0.01, Math.PI/2));
  [0, 1].forEach(k => add(g, box(0.22, 0.025, 0.03), iron, 0, EH + 1.0, ZF + 0.03, 0, 0, k*Math.PI/2));

  // the door: a stone arch (quoins, voussoirs), a glowing fanlight, one plank leaf shut and one swung open on the forge
  const DW = 1.2, DS = 1.45, AR = DW/2, doorMat = glow(0xff7a2a, 1.2).clone();
  flat(add(g, box(DW, DS - 0.3, 0.02), doorMat, 0, (DS + 0.3)/2, ZF + 0.01));
  flat(add(g, halfDisc(AR, 0.02), doorMat, 0, DS, ZF + 0.01));
  add(g, box(DW, 0.06, 0.05), iron, 0, DS, ZF + 0.03);
  for(let k = 1; k < 6; k++) add(g, box(0.025, AR, 0.03), iron, Math.cos(k*Math.PI/6)*AR/2, DS + Math.sin(k*Math.PI/6)*AR/2, ZF + 0.03, 0, 0, k*Math.PI/6 - Math.PI/2);
  const wood = mat(0x5e3d25), leaf = (x, z, ry, dx) => {                       // a plank leaf hung at (x, z), swung ry
    const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
    add(p, box(DW/2 - 0.02, DS - 0.32, 0.05), wood, dx, (DS + 0.3)/2, 0);
    [0.62, 1.2].forEach(y => add(p, box(DW/2 - 0.08, 0.05, 0.02), iron, dx, y, 0.035));
  };
  leaf(-DW/4, ZF + 0.035, 0, 0); leaf(DW/2 - 0.01, ZF + 0.035, 1.15, -DW/4 + 0.01);
  const dress = [];
  for(let j = 0; j < 5; j++){ const w = j % 2 ? 0.16 : 0.24; [-1, 1].forEach(s => dress.push([s*(AR + w/2), 0.42 + j*0.23, ZF + 0.05, w, 0.21, 0.1, 0, STONES[j % 4]])); }
  for(let i = 0; i < 11; i++){ const th = (i + 0.5)*Math.PI/11, key = i === 5, r = AR + 0.12; dress.push([Math.cos(th)*r, DS + Math.sin(th)*r, ZF + 0.05, key ? 0.17 : 0.13, key ? 0.3 : 0.24, key ? 0.14 : 0.1, 0, key ? 0x8a837a : STONES[i % 4], 0, th - Math.PI/2]); }
  g.add(instanced(unit, tinted, dress));
  // wall torches on the pilasters either side
  const flameMat = glow(0xffc04a, 2.6).clone(), flames = [];
  [-1, 1].forEach(s => {
    add(g, box(0.04, 0.04, 0.22), iron, s*1.02, 1.7, ZF + 0.2); add(g, cyl(0.08, 0.04, 0.1, 6), iron, s*1.02, 1.74, ZF + 0.3);
    const f = flat(add(g, new THREE.ConeGeometry(0.065, 0.22, 5), flameMat, s*1.02, 1.9, ZF + 0.3)); flames.push(f);
  });

  // windows: an arched one on each side, slits in the apse, all lit by the forge inside
  const winMat = glow(0xffa24a, 1.3).clone(), panes = [], frames = [];
  [-1, 1].forEach(s => {
    const [a, u] = side(s, WZ);
    panes.push(row(a, u, 1.5, W + 0.005, 0.34, 0.7, 0.02));
    const [wx, wz] = at(a, u, W + 0.005); flat(add(g, halfDisc(0.17, 0.02), winMat, wx, 1.85, wz, 0, a));
    [-1, 1].forEach(t => frames.push(row(a, u + t*0.21, 1.55, W + 0.05, 0.08, 0.8, 0.1, STONES[1])));
    for(let i = 0; i < 7; i++){ const th = (i + 0.5)*Math.PI/7, [x, z] = at(a, u + Math.cos(th)*0.23, W + 0.05); frames.push([x, 1.85 + Math.sin(th)*0.23, z, 0.09, 0.12, 0.1, a, BRICKS[i % 5], 0, th - Math.PI/2]); }
    frames.push(row(a, u, 1.12, W + 0.07, 0.56, 0.07, 0.16, STONES[2]));
    [-0.06, 0.06].forEach(t => frames.push(row(a, u + t, 1.6, W + 0.025, 0.025, 0.95, 0.025, IRON)));
    frames.push(row(a, u, 1.55, W + 0.025, 0.34, 0.025, 0.025, IRON));
  });
  SLITS.forEach(a => {
    panes.push(row(a, 0, 1.72, W + 0.005, 0.1, 0.6, 0.02, undefined, ZB));
    [-1, 1].forEach(t => frames.push(row(a, t*0.08, 1.72, W + 0.04, 0.06, 0.66, 0.08, STONES[0], ZB)));
    frames.push(row(a, 0, 2.06, W + 0.05, 0.28, 0.08, 0.1, STONES[1], ZB), row(a, 0, 1.39, W + 0.05, 0.26, 0.06, 0.12, STONES[2], ZB));
  });
  g.add(instanced(unit, winMat, panes, false), instanced(unit, tinted, frames));

  // the furnace chimney at the back of the apse (the hall's furnace stands against that wall inside): a stone-footed
  // breast with a glowing ash door, a tall stack with iron bands, a corbelled cap and the flue glowing at the top
  const CZ = ZB - W - 0.15;
  add(g, box(1.24, 0.5, 0.82), mat(STONE), 0, 0.55, CZ);
  add(g, box(1.1, 2.6, 0.7), mat(0x7d4433), 0, 1.6, CZ);
  add(g, box(1.18, 0.1, 0.78), mat(DARK), 0, 2.92, CZ);
  add(g, box(0.72, 3.4, 0.56), mat(BRICK), 0, 4.6, CZ);
  [3.5, 4.5, 5.5].forEach(y => add(g, box(0.8, 0.08, 0.64), iron, 0, y, CZ));
  add(g, box(0.86, 0.1, 0.7), mat(DARK), 0, 6.25, CZ); add(g, box(0.94, 0.14, 0.78), mat(DARK), 0, 6.37, CZ);
  const chimTop = 6.45, flueM = glow(0xff6a20, 1.6).clone();
  flat(add(g, box(0.42, 0.02, 0.3), flueM, 0, chimTop, CZ));
  const ashM = glow(0xff5a14, 1.4).clone(), back = CZ - 0.42;
  flat(add(g, box(0.36, 0.22, 0.02), ashM, 0, 0.71, back)); flat(add(g, halfDisc(0.18, 0.02), ashM, 0, 0.82, back, 0, Math.PI));
  add(g, box(0.5, 0.06, 0.06), iron, 0, 0.58, back - 0.02);

  // a ridge louvre: glowing core behind slats, a pyramid cap, an iron vane
  const LZC = 0.35, louvreM = glow(0xff9a40, 1.2).clone();
  add(g, box(0.56, 0.2, 0.56), tim, 0, RY + 0.1, LZC);
  flat(add(g, box(0.42, 0.28, 0.42), louvreM, 0, RY + 0.34, LZC));
  const slats = [];
  [-1, 1].forEach(x => [-1, 1].forEach(z => slats.push([x*0.24, RY + 0.34, LZC + z*0.24, 0.07, 0.32, 0.07, 0])));
  [0, 1, 2, 3].forEach(k => [0.25, 0.34, 0.43].forEach(y => slats.push(row(k*Math.PI/2, 0, RY + y, 0.24, 0.44, 0.03, 0.04, undefined, LZC))));
  g.add(instanced(unit, tim, slats));
  add(g, new THREE.ConeGeometry(0.46, 0.34, 4), roofM, 0, RY + 0.66, LZC, 0, Math.PI/4);
  add(g, cyl(0.015, 0.015, 0.4, 4), iron, 0, RY + 0.98, LZC);
  const vane = new THREE.Group(); vane.position.set(0, RY + 1.08, LZC); g.add(vane); add(vane, box(0.34, 0.06, 0.015), iron, 0.12, 0, 0);

  // right: a mine tunnel through the wall (the carts inside run into tunnels like it), rails and a cart with a chest
  const TX = W + 0.25;
  add(g, box(0.5, 1.6, 1.0), mat(STONE), TX, 1.1, FZ);
  add(g, box(0.62, 0.1, 1.12), mat(DARK), TX, 1.95, FZ);
  add(g, box(0.02, 0.95, 0.66), mat(DEEP), TX + 0.26, 0.775, FZ);
  [-1, 1].forEach(s => add(g, box(0.1, 1.0, 0.1), tim, TX + 0.29, 0.8, FZ + s*0.38));
  add(g, box(0.14, 0.14, 0.98), tim, TX + 0.3, 1.33, FZ);
  const quoin = [];
  for(let j = 0; j < 4; j++) [-1, 1].forEach(s => quoin.push([TX + 0.26, 0.42 + j*0.36, FZ + s*0.47, 0.06, 0.32, j % 2 ? 0.12 : 0.18, 0, STONES[(j + 2) % 4]]));
  for(let i = 0; i < 5; i++) quoin.push([TX + 0.26, 1.55 + (i % 2)*0.04, FZ + (i - 2)*0.2, 0.07, 0.22, 0.18, 0, STONES[i % 4]]);
  g.add(instanced(unit, tinted, quoin));
  const lampM = glow(0xffd27a, 2.0);
  flat(add(g, box(0.1, 0.14, 0.1), lampM, TX + 0.4, 1.55, FZ + 0.52)); add(g, new THREE.ConeGeometry(0.1, 0.08, 4), iron, TX + 0.4, 1.66, FZ + 0.52, 0, Math.PI/4);
  [-1, 1].forEach(s => add(g, box(0.65, 0.05, 0.05), iron, TX + 0.3 + 0.325, 0.04, FZ + s*0.22));
  [2.42, 2.68, 2.94].forEach(x => add(g, box(0.12, 0.04, 0.62), tim, x, 0.02, FZ));
  const cart = new THREE.Group(); cart.position.set(2.62, 0, FZ); g.add(cart);
  add(cart, cyl(0.42, 0.32, 0.36, 4).rotateY(Math.PI/4), mat(0x6a4b32), 0, 0.42, 0).scale.set(1.15, 1, 0.85);
  [-1, 1].forEach(x => [-1, 1].forEach(z => add(cart, cyl(0.1, 0.1, 0.05, 8), iron, x*0.2, 0.12, z*0.24, Math.PI/2)));
  add(cart, box(0.36, 0.2, 0.26), mat(0x7a5536), 0, 0.7, 0);
  add(cart, new THREE.CylinderGeometry(0.13, 0.13, 0.36, 8, 1, false, 0, Math.PI), mat(0x7a5536), 0, 0.84, 0, 0, 0, Math.PI/2);   // lid, propped a crack open
  [-0.12, 0.12].forEach(x => add(cart, box(0.03, 0.3, 0.28), iron, x, 0.76, 0));
  const chestM = glow(0xf0b54a, 1.6).clone();
  flat(add(cart, box(0.34, 0.04, 0.24), chestM, 0, 0.82, 0));
  add(cart, box(0.06, 0.07, 0.02), gold, 0, 0.72, 0.135);

  // left: a squat brick smelter with a glowing mouth, a bellows, a molten runnel into ingot moulds
  const SX = -2.2, sm = new THREE.Group(); sm.position.set(SX, 0, FZ); g.add(sm);
  add(sm, box(1.0, 0.25, 1.0), mat(STONE), 0, 0.125, 0);
  add(sm, cyl(0.4, 0.54, 1.45, 8), mat(BRICK), 0, 0.97, 0, 0, Math.PI/8);
  [[0.6, 0.53], [1.35, 0.46]].forEach(([y, r]) => add(sm, cyl(r, r, 0.06, 8), iron, 0, y, 0, 0, Math.PI/8));
  add(sm, cyl(0.46, 0.42, 0.12, 8), mat(DARK), 0, 1.76, 0, 0, Math.PI/8);
  add(sm, cyl(0.17, 0.2, 0.9, 8), mat(BRICK), 0, 2.27, 0); add(sm, cyl(0.24, 0.24, 0.06, 8), mat(DARK), 0, 2.75, 0);
  const fireMat = glow(0xff7a2a, 2.4).clone(), coalMat = glow(0xff3d12, 2.0).clone();
  flat(add(sm, box(0.3, 0.24, 0.04), fireMat, 0, 0.48, 0.5)); flat(add(sm, halfDisc(0.15), fireMat, 0, 0.6, 0.5));
  add(sm, box(0.42, 0.06, 0.1), iron, 0, 0.35, 0.52);
  flat(add(sm, box(0.1, 0.02, 0.42), coalMat, 0, 0.03, 0.78));
  [-0.2, 0, 0.2].forEach(x => { add(sm, box(0.18, 0.06, 0.12), iron, x, 0.03, 1.05); flat(add(sm, box(0.14, 0.01, 0.08), coalMat, x, 0.065, 1.05)); });
  const bel = new THREE.Group(); bel.position.set(-0.45, 0.32, -0.45); bel.rotation.y = -Math.PI/4; sm.add(bel);
  add(bel, box(0.5, 0.04, 0.3), mat(WOOD), 0, -0.08, 0);
  const belTop = add(bel, box(0.5, 0.04, 0.3), mat(WOOD), 0, 0.08, 0);
  add(bel, box(0.42, 0.14, 0.26), mat(LEATHER), 0.02, 0, 0);
  add(bel, cyl(0.03, 0.045, 0.22, 6), iron, 0.32, 0, 0, 0, 0, Math.PI/2);

  // front yard: anvil on a stump with a hot bar, quench barrel, crate with ingots; back: coal pile, firewood
  const fy = new THREE.Group(); fy.position.set(-0.95, 0, 2.2); fy.rotation.y = 1.75; g.add(fy);
  fy.add(anvil());
  flat(add(fy, box(0.28, 0.05, 0.1), glow(0xff8a3a, 2.2), 0.15, 0.8, 0));
  add(fy, box(0.4, 0.05, 0.05), mat(WOOD), -0.15, 0.79, 0.15, 0, 0.5);
  add(fy, box(0.1, 0.1, 0.16), iron, 0.03, 0.81, 0.06, 0, 0.5);
  const qb = barrel(); qb.position.set(1.2, 0, 2.05); g.add(qb);
  add(g, box(0.62, 0.62, 0.62), mat(0x8a6542), 1.8, 0.31, 1.75, 0, 0.3);
  const steel = mat(0x9aa3ad, {metalness:0.6, roughness:0.4});
  [[0, 0, gold], [0.17, 0, steel], [-0.17, 0, gold], [0.08, 1, steel], [-0.09, 1, gold]].forEach(([dx, r, m]) =>
    add(g, box(0.13, 0.08, 0.36), m, 1.8 + Math.cos(0.3)*dx, 0.66 + r*0.08, 1.75 - Math.sin(0.3)*dx, 0, 0.3 + r*Math.PI/2));
  const coal = mat(0x2a2a2e);
  [[-1.95, -1.45, 0.3], [-2.15, -1.1, 0.22], [-1.75, -1.8, 0.2], [-2.2, -1.6, 0.18]].forEach(([x, z, s]) =>
    add(g, new THREE.DodecahedronGeometry(s, 0), coal, x, s*0.5, z, rand(), rand()*6, rand()));
  const wood2 = new THREE.Group(); wood2.position.set(1.95, 0, -1.65); wood2.rotation.y = Math.atan2(-1.95, -1.65 - ZB); g.add(wood2);   // logs along the apse
  const logGeo = cyl(0.11, 0.11, 1.0, 6), logM = mat(0x6b4a30);
  [[-0.23, 0], [0, 0], [0.23, 0], [-0.12, 1], [0.12, 1], [0, 2]].forEach(([dx, r]) => add(wood2, logGeo, logM, 0, 0.11 + r*0.19, dx, 0, 0, Math.PI/2));

  // embers rising from the chimney (one Points object, buffer reused every frame)
  const N = 30, pos = new Float32Array(N*3), ph = [];
  for(let i = 0; i < N; i++) ph.push([rand(), rand()*6.28, 0.5 + rand()*0.6]);
  const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({color:0xffa040, size:0.13, transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false}));
  embers.frustumCulled = false; g.add(embers);
  // smoke puffs: one private material, puffs swell then shrink as they rise
  const smokeM = new THREE.MeshStandardMaterial({color:0xb3ada6, emissive:0x3a302a, flatShading:true, roughness:1, transparent:true, opacity:0.42, depthWrite:false});
  const puffs = [0, 1, 2, 3].map(() => { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), smokeM); g.add(p); return p; });

  const pl = new THREE.PointLight(0xff7a2a, 1.3, 10, 2); pl.position.set(0, 1.0, ZF + 0.9); g.add(pl);
  animated.push({fn:t => {
    const f = Math.sin(t*9)*0.5 + Math.sin(t*23)*0.3;
    pl.intensity = 1.2 + f*0.3;
    fireMat.emissiveIntensity = 2.3 + f*0.6;
    doorMat.emissiveIntensity = 1.15 + f*0.25;
    winMat.emissiveIntensity = louvreM.emissiveIntensity = 1.2 + f*0.15;
    ventM.emissiveIntensity = flueM.emissiveIntensity = ashM.emissiveIntensity = 1.4 + f*0.3;
    coalMat.emissiveIntensity = 1.9 + Math.sin(t*3.1)*0.4;
    chestM.emissiveIntensity = 1.5 + Math.sin(t*2.2)*0.4;
    flameMat.emissiveIntensity = 2.4 + Math.sin(t*17)*0.4;
    flames.forEach((fl, k) => fl.scale.set(1, 1 + Math.sin(t*(9 + k*1.7) + k)*0.16 + Math.sin(t*23 + k)*0.05, 1));
    belTop.rotation.z = (Math.sin(t*1.6) + 1)*0.12; belTop.position.y = 0.08 + (Math.sin(t*1.6) + 1)*0.02;
    vane.rotation.y = Math.sin(t*0.3)*0.8;
    for(let i = 0; i < N; i++){
      const [o, w, sp] = ph[i], k = (o + t*sp*0.45) % 1;
      pos[i*3] = Math.sin(w + t*2 + k*5)*0.25*k - k*0.35;
      pos[i*3 + 1] = chimTop + k*1.4;
      pos[i*3 + 2] = CZ + Math.cos(w + t*1.7)*0.2*k - k*0.3;
    }
    eGeo.attributes.position.needsUpdate = true;
    puffs.forEach((p, i) => {
      const k = (i/4 + t*0.12) % 1;
      p.position.set(-k*0.9, chimTop + 0.2 + k*1.2, CZ - k*0.7);
      p.scale.setScalar(Math.max(0.01, Math.sin(Math.PI*Math.min(1, k*1.15))*(0.8 + k)));
      p.rotation.set(k*2, i + k*3, 0);
    });
  }});
  return g;
}

/* ---------- island scenery: ore cart on a short rail, ore heap, water trough ---------- */
function oreCart(){
  const g = new THREE.Group();
  [-0.32, 0.32].forEach(x => add(g, box(0.05, 0.05, 1.9), mat(IRON), x, 0.03, 0));
  [-0.7, 0, 0.7].forEach(z => add(g, box(0.85, 0.05, 0.14), mat(TIMBER), 0, 0.02, z));
  add(g, cyl(0.62, 0.45, 0.5, 4, 1), mat(0x6a4b32), 0, 0.55, 0, 0, Math.PI/4).scale.set(0.85, 1, 1.15);
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(g, cyl(0.15, 0.15, 0.06, 8), mat(IRON), sx*0.34, 0.18, sz*0.33, 0, 0, Math.PI/2)));
  const ore = mat(0xb0643a, {metalness:0.4, roughness:0.6});
  [[0, 0.12], [0.15, -0.15], [-0.18, -0.05], [0.05, 0.25]].forEach(([x, z], i) =>
    add(g, new THREE.DodecahedronGeometry(0.17, 0), i % 2 ? mat(0x5b5f68) : ore, x, 0.82, z, i, i*2, 0));
  return g;
}
function oreHeap(){
  const g = new THREE.Group(), ore = mat(0xb0643a, {metalness:0.4, roughness:0.6}), crystal = glow(0x6fd3e6, 0.9);
  for(let i = 0; i < 8; i++){
    const a = i*2.4, r = i ? 0.25 + rand()*0.35 : 0, s = 0.22 + rand()*0.18;
    add(g, new THREE.DodecahedronGeometry(s, 0), i % 3 === 1 ? ore : mat(i % 2 ? 0x5b5f68 : 0x4e4a46), Math.cos(a)*r, s*0.6 + (i ? 0 : 0.18), Math.sin(a)*r, rand(), rand()*6, rand());
  }
  add(g, new THREE.OctahedronGeometry(0.12, 0), crystal, 0.1, 0.55, 0.05, 0, 0, 0.2);
  add(g, new THREE.OctahedronGeometry(0.09, 0), crystal, -0.2, 0.42, 0.18, 0.3, 0, 0);
  // a pickaxe leaning on the heap
  add(g, box(0.05, 0.9, 0.05), mat(WOOD), 0.55, 0.42, 0.2, 0, 0, 0.35);
  add(g, box(0.5, 0.06, 0.06), mat(IRON), 0.4, 0.85, 0.2, 0, 0, 0.25);
  return g;
}
function trough(){
  const g = new THREE.Group();
  add(g, box(1.2, 0.4, 0.55), mat(WOOD), 0, 0.3, 0);
  add(g, box(1.08, 0.04, 0.43), mat(WATER, {roughness:0.3}), 0, 0.49, 0);
  [-0.5, 0.5].forEach(x => add(g, box(0.1, 0.2, 0.6), mat(TIMBER), x, 0.1, 0));
  return g;
}

/* Place each piece on open ground: off paths, out of the plaza, inland of the coast, clear of trees/rocks already placed. */
export function decorate(isl, grp, animated){
  seed = 777;
  const placed = [];
  const spot = (r0, rad) => {
    for(let tries = 0; tries < 300; tries++){
      const ang = rand()*Math.PI*2, e = isl.edgeR(ang), r = r0 + rand()*Math.max(0, e*0.76 - r0);
      const x = Math.cos(ang)*r, z = Math.sin(ang)*r;
      if(r > e*0.78 || isl.pathDist(x, z) < 1.2 + rad) continue;
      if(placed.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + rad + 0.6)) continue;
      if(obstacles.some(o => Math.hypot(o.x - isl.x - x, o.z - isl.z - z) < o.r + rad + 0.25)) continue;
      placed.push([x, z, rad]); return [x, z];
    }
    return null;
  };
  const put = (obj, r0, rad, face) => {
    const p = spot(r0, rad); if(!p) return;
    obj.position.set(p[0], isl.topY(p[0], p[1]) - 0.03, p[1]);
    obj.rotation.y = face ? Math.atan2(p[0], p[1]) + face : rand()*6;
    grp.add(obj);
    obstacles.push({x:isl.x + p[0], z:isl.z + p[1], r:rad});
  };
  const minR = isl.obs + 2.6;
  put(oreCart(), minR, 0.75, Math.PI/2);
  put(oreHeap(), minR, 0.75);
  put(trough(), minR, 0.65, Math.PI/2);
}
