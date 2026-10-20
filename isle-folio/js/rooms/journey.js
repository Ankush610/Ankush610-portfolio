/* ---- Oakreach: the Chronicle hall (experience + education) ----
   Stations run oldest → newest, left → right, along a glowing timeline on the wainscot.
   Entering shows the whole hall for a moment, then the camera settles on the newest role.
   Each highlight note on a corkboard is its own stop, so it can be read up close. */
import { THREE, V3, reduce, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { keyL } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, panel, para, clip, fitFont, pills, card, eyebrow } from '../panels.js';
import { view, item } from './kit.js';

const NOTE_W = 2.35, NOTE_H = 2.0, GX = 0.15, GY = 0.25, COLS = 3, GAP = 1.5;
const WALLZ = -3.6, BOT = 1.15, LINE_Y = 0.55, H = 8.8;
const N = new V3(0, 0.12, 1);
const yearOf = p => +(String(p).match(/\d{4}/) || [9999])[0];
const T1 = 12.4, T2 = 16.2, TOP = 19.6;            // upper tiers of the hall wall (seen above the boards in portrait framing)

/* Set dressing is baked into one mesh per material: parts are [geometry, x, y, z, rx, ry, rz, sx, sy, sz]. */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3();
function baker(){
  const bins = new Map();
  const add = (m, geo, x=0, y=0, z=0, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1) => {
    if(!bins.has(m)) bins.set(m, []);
    bins.get(m).push([geo, x, y, z, rx, ry, rz, sx, sy, sz]);
  };
  const bake = (g, shadow = true) => bins.forEach((parts, m) => {
    const gs = parts.map(([geo, x, y, z, rx, ry, rz, sx, sy, sz]) => {
      const gg = geo.index ? geo.toNonIndexed() : geo.clone();
      gg.applyMatrix4(_m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
      return gg;
    });
    const n = gs.reduce((a, gg) => a + gg.attributes.position.count, 0), pos = new Float32Array(n*3), nor = new Float32Array(n*3);
    let o = 0;
    gs.forEach(gg => { pos.set(gg.attributes.position.array, o*3); nor.set(gg.attributes.normal.array, o*3); o += gg.attributes.position.count; gg.dispose(); });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    const me = mesh(out, m); me.castShadow = shadow && !m.emissiveIntensity; g.add(me);
  });
  return {add, bake};
}
// soft round glow for additive halos and motes, drawn locally (no texture download)
let haloTex = null;
function halo(){
  if(haloTex) return haloTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return haloTex = new THREE.CanvasTexture(c);
}
const noRay = () => {};

export default function build(){
  const g = new THREE.Group(), items = [];

  /* ---- layout: every education + experience entry, sorted by start year ---- */
  const stations = [
    ...DATA.education.map(e => ({e, edu:true, w:3.4, h:3.1})),
    ...DATA.experience.map(e => {
      const n = (e.highlights || []).length, rows = Math.ceil(n / COLS);
      const w = Math.max(7.6, Math.min(n, COLS)*(NOTE_W + GX) - GX + 0.5);
      return {e, rows, w, h: 0.25 + 1.5 + 0.3 + (rows ? rows*NOTE_H + (rows - 1)*GY : 0) + 0.3};
    }),
  ].map((s, i) => Object.assign(s, {i})).sort((a, b) => yearOf(a.e.period) - yearOf(b.e.period) || a.i - b.i);
  let cur = 0; stations.forEach(s => { s.x = cur + s.w/2; cur += s.w + GAP; });
  const span = cur - GAP; stations.forEach(s => s.x -= span/2);
  const x0 = -span/2, x1 = span/2, hl = x0 - 3.4, hr = x1 + 3.6, L = hr - hl, hc = (hl + hr)/2;

  /* ---- the hall ---- */
  const B = baker(), add = B.add, PI = Math.PI;
  const wood = mat(0x2a1d16), iron = mat(0x3a3530), oak = mat(0x6b4a30), oakLt = mat(0x8a6440), seam = mat(0x3e2c20);
  const root = mat(0x5a3d28), paper = mat(0xe3d5ad), brass = mat(0xc9a24a), chestW = mat(0x7a4e2c);
  // lantern glass and candle flames share one room-local material so they can flicker without touching the global glow() cache
  const lampMat = new THREE.MeshStandardMaterial({color:0xffb456, emissive:0xffa040, emissiveIntensity:1.3, flatShading:true});
  const unit = box(1, 1, 1), disc = cyl(1, 1, 1, 14), flameGeo = new THREE.ConeGeometry(0.045, 0.13, 5);

  // floor: base deck, staggered planks in two extra tones with butt joints, long seams
  g.add(mesh(box(L, 0.3, 9.5), mat(0x5b4331), hc, -0.15, 0.6));
  const plankA = mat(0x634936), plankB = mat(0x523b2b);
  for(let k = -1; k < 7; k++){
    const z = -2.65 + k*1.1;
    for(let x = hl - rnd()*1.5; x < hr - 0.2;){
      const len = Math.min(2.2 + rnd()*2.4, hr - x), r = rnd(), xa = Math.max(x, hl), xb = x + len;
      if(r < 0.7 && xb - xa > 0.3) add(r < 0.35 ? plankA : plankB, unit, (xa + xb)/2, 0.006, z, 0, 0, 0, xb - xa - 0.03, 0.012, 1.04);
      if(x > hl) add(seam, unit, x, 0.007, z, 0, 0, 0, 0.03, 0.014, 1.04);
      x = xb;
    }
  }
  for(let k = 0; k < 9; k++) add(seam, unit, hc, 0.01, -3.2 + k*1.1, 0, 0, 0, L, 0.02, 0.04);
  // a long runner rug down the hall, gold borders, diamond pattern, fringed ends
  const ra = x0 - 1.2, rb = x1 + 0.9, rl = rb - ra, rc = (ra + rb)/2, RZ = -1.0, rugGold = mat(0xc28a3c), rugDark = mat(0x3f1915);
  add(mat(0x6e2a22), unit, rc, 0.012, RZ, 0, 0, 0, rl, 0.02, 1.8);
  [-0.72, 0.72].forEach(dz => add(rugGold, unit, rc, 0.014, RZ + dz, 0, 0, 0, rl - 0.3, 0.024, 0.07));
  [-0.6, 0.6].forEach(dz => add(rugDark, unit, rc, 0.014, RZ + dz, 0, 0, 0, rl - 0.5, 0.024, 0.05));
  for(let x = ra + 0.75; x < rb - 0.5; x += 1.3){ add(rugDark, unit, x, 0.015, RZ, 0, PI/4, 0, 0.5, 0.026, 0.5); add(rugGold, unit, x, 0.016, RZ, 0, PI/4, 0, 0.2, 0.03, 0.2); }
  [ra, rb].forEach(fx => { for(let dz = -0.8; dz < 0.81; dz += 0.16) add(mat(0xd8c49a), unit, fx + Math.sign(fx - rc)*0.07, 0.008, RZ + dz, 0, 0, 0, 0.14, 0.01, 0.035); });

  // walls: panelled lower wall, taller upper wall with two carved tiers
  g.add(mesh(box(L, H, 0.4), mat(0x3b2b22), hc, H/2, WALLZ));
  [hl - 0.2, hr + 0.2].forEach(x => add(mat(0x33251c), unit, x, TOP/2, WALLZ + 2.7, 0, 0, 0, 0.4, TOP, 5.8));   // end walls
  add(mat(0x33251c), unit, hc, (H + TOP)/2, WALLZ, 0, 0, 0, L, TOP - H, 0.4);
  add(wood, unit, hc, 0.5, WALLZ + 0.25, 0, 0, 0, L, 1.0, 0.1);                 // wainscot
  add(oak, unit, hc, 1.02, WALLZ + 0.28, 0, 0, 0, L, 0.08, 0.18);               // chair rail
  add(mat(0x1f150f), unit, hc, 0.07, WALLZ + 0.32, 0, 0, 0, L, 0.14, 0.08);     // baseboard
  add(wood, unit, hc, H - 0.1, WALLZ + 0.4, 0, 0, 0, L, 0.5, 0.7);              // top beam
  add(oakLt, unit, hc, H - 0.38, WALLZ + 0.46, 0, 0, 0, L, 0.07, 0.64);         // its moulding
  [T1, T2].forEach(y => { add(wood, unit, hc, y, WALLZ + 0.35, 0, 0, 0, L, 0.42, 0.5); add(oak, unit, hc, y - 0.25, WALLZ + 0.38, 0, 0, 0, L, 0.08, 0.5); });

  // timber posts: plinth, carved bands, capital and knee braces; roots spill out of the plinths
  const posts = [hl + 0.2, ...stations.slice(1).map((s, k) => (stations[k].x + stations[k].w/2 + s.x - s.w/2)/2), hr - 0.2];
  const rootGeo = new THREE.ConeGeometry(0.2, 1.3, 6), tendril = new THREE.ConeGeometry(0.05, 1, 4);
  const haloMat = new THREE.SpriteMaterial({map:halo(), color:0xffa850, transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, depthWrite:false, fog:false});
  const halos = [];
  posts.forEach((px, k) => {
    const end = k === 0 ? 1 : k === posts.length - 1 ? -1 : 0;
    add(wood, unit, px, (TOP + 0.4)/2, WALLZ + 0.36, 0, 0, 0, 0.38, TOP + 0.4, 0.32);
    add(wood, unit, px, H - 0.25, WALLZ + 3.2, 0, 0, 0, 0.3, 0.4, 6);
    add(oak, unit, px, 0.21, WALLZ + 0.42, 0, 0, 0, 0.62, 0.42, 0.5);
    add(oakLt, unit, px, 0.45, WALLZ + 0.42, 0, 0, 0, 0.7, 0.07, 0.56);
    [2.05, 2.2, 6.6].forEach(y => add(oakLt, unit, px, y, WALLZ + 0.36, 0, 0, 0, 0.44, 0.05, 0.38));
    add(oakLt, unit, px, H - 0.46, WALLZ + 0.4, 0, 0, 0, 0.56, 0.22, 0.44);
    [-1, 1].forEach(sd => { if(sd !== -end || !end) add(oak, unit, px + sd*0.36, H - 0.62, WALLZ + 0.42, 0, 0, sd*PI/4, 0.62, 0.14, 0.16); });
    // roots creeping along the floor (kept low so they never cover the timeline)
    [-0.15, -0.55, -1.0].forEach((a, r) => [-1, 1].forEach(sd => {
      if(end && sd !== end) return;
      const ang = sd > 0 ? a : PI - a, dx = Math.cos(ang), dz = -Math.sin(ang), len = 0.9 + rnd()*0.5;
      add(root, rootGeo, px + sd*0.22 + dx*len*0.45, 0.1, WALLZ + 0.45 + dz*len*0.45, 0, ang, -PI/2 - 0.1, 1, len/1.3, 0.75);
    }));
    // root tendrils hanging from the top beam beside the post
    [-0.27, 0.27].forEach(dx => { if(end && Math.sign(dx) !== end) return; const len = 0.7 + rnd()*0.8; add(root, tendril, px + dx, H - 0.35 - len/2, WALLZ + 0.66, PI, 0, (rnd() - 0.5)*0.1, 1, len, 1); });
    if(end) return;
    add(iron, unit, px, 5.0, WALLZ + 0.65, 0, 0, 0, 0.06, 0.06, 0.45);           // sconce arm
    add(lampMat, unit, px, 4.78, WALLZ + 0.86, 0, 0, 0, 0.24, 0.34, 0.24);
    add(iron, unit, px, 4.59, WALLZ + 0.86, 0, 0, 0, 0.3, 0.05, 0.3);
    add(iron, new THREE.ConeGeometry(0.22, 0.2, 4), px, 5.04, WALLZ + 0.86, 0, PI/4, 0);
    const h = new THREE.Sprite(haloMat); h.position.set(px, 4.8, WALLZ + 1.0); h.scale.setScalar(1.25); h.raycast = noRay; halos.push(h); g.add(h);
  });

  // upper tiers: a truss with a carved tree-ring medallion in every bay, studs and diamonds above it
  const MX = hc, MY = (T1 + T2)/2, MW = 5.4, MH = 2.9;
  for(let k = 0; k < posts.length - 1; k++){
    const a = posts[k], b = posts[k + 1], mid = (a + b)/2, y0 = H + 0.2, y1 = T1 - 0.25, zz = WALLZ + 0.3;
    const dx = (b - a)/2 - 0.2, dy = y1 - y0, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    add(oak, unit, a + 0.2 + dx/2, y0 + dy/2, zz, 0, 0, ang, len, 0.24, 0.2);
    add(oak, unit, b - 0.2 - dx/2, y0 + dy/2, zz, 0, 0, -ang, len, 0.24, 0.2);
    const r = Math.min((b - a)*0.11, 1.1, dy*0.28), my = y0 + dy*0.34;
    add(oak, unit, mid, (my + r + y1)/2, zz, 0, 0, 0, 0.2, y1 - my - r, 0.18);       // king post above the medallion
    [[1, oak], [0.8, wood], [0.62, oakLt], [0.44, wood], [0.26, oak]].forEach(([f, m], i) => add(m, disc, mid, my, zz + 0.04 + i*0.025, PI/2, 0, 0, r*f, 0.08, r*f));
    add(glow(0xf0a23a, 1.1), disc, mid, my, zz + 0.2, PI/2, 0, 0, r*0.1, 0.04, r*0.1);
    // tier 2: studs every ~1.3 with a carved diamond between each pair, leaving room for the map
    const n = Math.max(1, Math.round((b - a)/1.3)), st = (b - a)/n;
    for(let i = 0; i < n; i++){
      const cx = a + st*(i + 0.5), clear = Math.abs(cx - MX) < MW/2 + 0.45;
      if(i && !(Math.abs(a + st*i - MX) < MW/2 + 0.3)) add(oak, unit, a + st*i, (T1 + T2)/2, WALLZ + 0.28, 0, 0, 0, 0.16, T2 - T1 - 0.4, 0.12);
      if(!clear) add(oakLt, unit, cx, (T1 + T2)/2, WALLZ + 0.27, 0, 0, PI/4, 0.42, 0.42, 0.08);
    }
  }
  // the journey map: parchment with lands, a dotted route and one pin per station
  add(wood, unit, MX, MY, WALLZ + 0.25, 0, 0, 0, MW + 0.36, MH + 0.36, 0.1);
  add(mat(0xd9c9a0), unit, MX, MY, WALLZ + 0.31, 0, 0, 0, MW, MH, 0.06);
  [-1, 1].forEach(sd => add(paper, disc, MX, MY + sd*MH/2, WALLZ + 0.36, 0, 0, PI/2, 0.08, MW + 0.1, 0.08));
  const land = new THREE.DodecahedronGeometry(1, 0), landM = mat(0x8f9f63), sea = mat(0xa9bfb4);
  [[-1.7, 0.45, 0.9], [0.2, -0.35, 1.05], [1.75, 0.5, 0.7], [-0.6, 0.85, 0.42], [2.0, -0.8, 0.4]].forEach(([lx, ly, s]) => add(landM, land, MX + lx, MY + ly, WALLZ + 0.34, 0, 0, rnd()*3, s*1.3, s*0.75, 0.03));
  add(sea, unit, MX - 1.9, MY - 0.85, WALLZ + 0.34, 0, 0, 0, 1.0, 0.5, 0.01);
  const ns = Math.max(stations.length + 1, 2), pin = glow(0xd2402a, 0.9), dot = glow(0xf0a23a, 1.2), sph = new THREE.SphereGeometry(1, 8, 6);
  const route = u => [MX - MW/2 + 0.5 + u*(MW - 1), MY + Math.sin(u*PI*2.2 + 0.4)*0.75];
  for(let u = 0; u <= 1.0001; u += 0.025) add(dot, unit, ...route(u), WALLZ + 0.36, 0, 0, 0, 0.06, 0.06, 0.02);
  for(let i = 0; i < ns; i++){ const last = i === ns - 1; add(last ? dot : pin, sph, ...route(i/(ns - 1)), WALLZ + 0.38, 0, 0, 0, ...Array(3).fill(last ? 0.13 : 0.085)); }
  [0, PI/2].forEach(a => add(rugDark, unit, MX + MW/2 - 0.45, MY - MH/2 + 0.45, WALLZ + 0.35, 0, 0, a + PI/4, 0.07, 0.5, 0.02));
  // the great tree's crown: branches rising from every post into a leafy canopy along the top
  posts.forEach(px => [-1, 1].forEach(sd => add(root, cyl(0.1, 0.17, 1, 6), px + sd*0.75, T2 + 1.7, WALLZ + 0.45, 0, 0, -sd*0.45, 1, 3.8, 1)));
  const leaf = new THREE.DodecahedronGeometry(1, 0), leafA = mat(0x2f6b3a), leafB = mat(0x3b7d3f);
  for(let x = hl - 0.4; x < hr + 0.6; x += 1.25 + rnd()*0.4){
    add(rnd() > 0.5 ? leafA : leafB, leaf, x, TOP - 0.2 + rnd()*0.9, WALLZ + 0.55 + rnd()*0.3, rnd(), rnd()*3, rnd(), 1.2 + rnd()*0.5, 0.85 + rnd()*0.3, 0.55);
    if(rnd() > 0.4) add(rnd() > 0.5 ? leafA : leafB, leaf, x + 0.6, TOP + 1.1 + rnd()*0.6, WALLZ + 0.3, rnd(), rnd()*3, rnd(), 1.0, 0.8, 0.5);
  }

  // moonlit arched windows at both ends of the hall, a candle on each sill
  const pane = glow(0x7d9ad6, 0.55);
  const archF = new THREE.CylinderGeometry(0.85, 0.85, 0.12, 12, 1, false, PI/2, PI), archP = new THREE.CylinderGeometry(0.7, 0.7, 0.05, 12, 1, false, PI/2, PI);
  [hl + 1.7, hr - 1.8].forEach(wx => {
    add(wood, unit, wx, 4.0, WALLZ + 0.22, 0, 0, 0, 1.7, 3.0, 0.12);
    add(wood, archF, wx, 5.35, WALLZ + 0.22, PI/2, 0, 0);
    add(pane, unit, wx, 4.0, WALLZ + 0.28, 0, 0, 0, 1.4, 2.7, 0.05);
    add(pane, archP, wx, 5.35, WALLZ + 0.28, PI/2, 0, 0);
    add(wood, unit, wx, 4.35, WALLZ + 0.31, 0, 0, 0, 0.07, 3.4, 0.08);
    [4.5, 5.35].forEach(y => add(wood, unit, wx, y, WALLZ + 0.31, 0, 0, 0, 1.4, 0.07, 0.08));
    add(oakLt, unit, wx, 6.22, WALLZ + 0.3, 0, 0, 0, 0.24, 0.32, 0.16);           // keystone
    add(oak, unit, wx, 2.45, WALLZ + 0.3, 0, 0, 0, 1.9, 0.12, 0.3);                // sill
    add(oak, unit, wx, 2.32, WALLZ + 0.26, 0, 0, 0, 1.6, 0.14, 0.18);
    add(mat(0xe8dcc0), cyl(0.06, 0.065, 0.26, 6), wx + 0.6, 2.64, WALLZ + 0.38);
    add(lampMat, flameGeo, wx + 0.6, 2.84, WALLZ + 0.38);
    [[0x5a3a5e, 0.06], [0x2f5560, 0.0], [0x7a3b2a, 0.03]].forEach(([c, o], i) => add(mat(c), unit, wx - 0.5 + o, 2.56 + i*0.09, WALLZ + 0.38, 0, (i - 1)*0.25, 0, 0.42, 0.08, 0.26));
  });

  /* ---- props at the two ends: wayposts and a chest where the road starts, maps and a globe where it arrives ---- */
  const at = (cx, cz, ry) => (m, geo, dx, y, dz, rx = 0, rry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    add(m, geo, cx + dx*Math.cos(ry) + dz*Math.sin(ry), y, cz - dx*Math.sin(ry) + dz*Math.cos(ry), rx, ry + rry, rz, sx, sy, sz);
  // signpost with three arms pointing every which way
  const sx = hl + 0.85, sz = -1.5;
  add(oak, cyl(0.08, 0.1, 2.7, 6), sx, 1.35, sz);
  add(oakLt, new THREE.ConeGeometry(0.13, 0.22, 6), sx, 2.81, sz);
  [[2.35, 0.35, 1], [1.95, -0.45, -1], [1.55, 0.8, 1]].forEach(([y, a, d]) => {
    const s = at(sx, sz, a);
    s(oakLt, unit, d*0.45, y, 0, 0, 0, 0, 0.8, 0.22, 0.05);
    s(oakLt, unit, d*0.85, y, 0, 0, 0, PI/4, 0.155, 0.155, 0.05);
    s(wood, unit, d*0.42, y, 0.03, 0, 0, 0, 0.5, 0.035, 0.02);
  });
  // travel chest under the left window, a rolled map on its lid
  const c = at(hl + 1.75, -2.85, 0.08), lidGeo = new THREE.CylinderGeometry(0.31, 0.31, 1.1, 8, 1, false, 0, PI), bandGeo = new THREE.CylinderGeometry(0.325, 0.325, 0.07, 8, 1, false, 0, PI);
  c(chestW, unit, 0, 0.25, 0, 0, 0, 0, 1.1, 0.5, 0.62);
  c(chestW, lidGeo, 0, 0.5, 0, 0, 0, PI/2);
  [-0.36, 0.36].forEach(dx => { c(iron, unit, dx, 0.25, 0, 0, 0, 0, 0.07, 0.52, 0.64); c(iron, bandGeo, dx, 0.5, 0, 0, 0, PI/2); });
  c(brass, unit, 0, 0.47, 0.32, 0, 0, 0, 0.14, 0.17, 0.04);
  c(paper, disc, 0.05, 0.86, 0, 0, 0.3, PI/2, 0.065, 0.75, 0.065);
  c(mat(0x9a2f22), disc, 0.05, 0.86, 0, 0, 0.3, PI/2, 0.07, 0.05, 0.07);
  // the first milestone: a standing stone with a glowing rune where the timeline begins
  add(mat(0x6d717a), cyl(0.26, 0.33, 1.0, 6), x0 - 0.55, 0.5, -1.75, 0, 0.3, 0, 1, 1, 0.6);
  add(mat(0x6d717a), new THREE.ConeGeometry(0.27, 0.22, 6), x0 - 0.55, 1.11, -1.75, 0, 0.3, 0, 1, 1, 0.6);
  add(glow(0xf0a23a, 1.2), unit, x0 - 0.55 + 0.06, 0.76, -1.58, 0, 0.3, PI/4, 0.13, 0.13, 0.02);
  add(glow(0xf0a23a, 1.2), unit, x0 - 0.55 + 0.06, 0.5, -1.58, 0, 0.3, 0, 0.05, 0.26, 0.02);
  [[-0.4, 0.1], [0.35, 0.2], [0.1, -0.35]].forEach(([dx, dz]) => add(mat(0x5b5f68), land, x0 - 0.55 + dx, 0.05, -1.75 + dz, rnd(), rnd()*3, 0, 0.13, 0.09, 0.12));
  // barrel of rolled maps
  const bx = hr - 0.62, bz = -2.85, stave = mat(0x6e4528);
  add(stave, cyl(0.32, 0.39, 0.45, 10), bx, 0.225, bz); add(stave, cyl(0.39, 0.33, 0.45, 10), bx, 0.675, bz);
  [0.12, 0.45, 0.8].forEach(y => add(iron, cyl(0.395, 0.395, 0.05, 10), bx, y, bz, 0, 0, 0, y === 0.45 ? 1.0 : 0.96, 1, y === 0.45 ? 1.0 : 0.96));
  [[0.1, 0.18, 0.12, paper], [-0.12, -0.15, -0.1, mat(0xd2bf8a)], [0.05, -0.05, 0.22, paper], [-0.15, 0.12, -0.25, mat(0xd2bf8a)]].forEach(([dx, rx, rz, m]) => {
    add(m, disc, bx + dx, 1.05, bz + dx*0.5, rx, 0, rz, 0.06, 0.95, 0.06);
    add(mat(0x9a2f22), disc, bx + dx, 1.05, bz + dx*0.5, rx, 0, rz, 0.065, 0.04, 0.065);
  });
  // books stacked under the right window
  [[0x2f5560, 0.0], [0x7a3b2a, 0.25], [0x4f6e34, -0.15], [0x5a3a5e, 0.4]].forEach(([col, ry], i) => add(mat(col), unit, hr - 1.55, 0.06 + i*0.12, -3.0, 0, ry, 0, 0.55, 0.11, 0.4));
  add(paper, unit, hr - 1.55, 0.06 + 4*0.12 - 0.05, -3.0, 0, 0.4, 0, 0.5, 0.01, 0.36);
  // crate with a slowly turning globe
  const cr = at(hr - 0.75, -1.65, -0.2), crate = mat(0x8a6440);
  cr(crate, unit, 0, 0.33, 0, 0, 0, 0, 0.66, 0.66, 0.66);
  [-0.29, 0.29].forEach(d => { cr(chestW, unit, d, 0.33, 0, 0, 0, 0, 0.09, 0.68, 0.68); cr(chestW, unit, 0, 0.33, d, 0, 0, 0, 0.68, 0.68, 0.09); });
  cr(chestW, unit, 0, 0.33, 0.34, 0, 0, PI/4, 0.9, 0.08, 0.02);
  add(brass, cyl(0.16, 0.2, 0.06, 8), hr - 0.75, 0.69, -1.65);
  add(brass, cyl(0.03, 0.03, 0.3, 5), hr - 0.75, 0.82, -1.65);
  const globe = new THREE.Group(); globe.position.set(hr - 0.75, 1.16, -1.65); globe.rotation.z = 0.41; g.add(globe);
  const ball = mesh(new THREE.IcosahedronGeometry(0.26, 1), mat(0x3f6f9e)); globe.add(ball);
  [[0.4, 0.3], [2.2, -0.2], [3.9, 0.5], [5.2, -0.45]].forEach(([lo, la]) => {
    const p = mesh(land, landM, Math.cos(lo)*Math.cos(la)*0.24, Math.sin(la)*0.24, Math.sin(lo)*Math.cos(la)*0.24);
    p.scale.set(0.11, 0.08, 0.11); p.lookAt(0, 0, 0); ball.add(p);
  });
  const ring = mesh(new THREE.TorusGeometry(0.31, 0.018, 4, 20), brass); ring.rotation.y = PI/2; globe.add(ring);

  B.bake(g);

  // fireflies drifting up among the beams and leaves (above the boards, so they never cross the text)
  const FN = 70, fpos = new Float32Array(FN*3), fbase = [];
  for(let i = 0; i < FN; i++){ const p = [hl + rnd()*L, H + 0.6 + rnd()*(TOP - H), WALLZ + 0.7 + rnd()*0.8]; fbase.push(p); fpos.set(p, i*3); }
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flies = new THREE.Points(fgeo, new THREE.PointsMaterial({map:halo(), color:0xffc870, size:0.22, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false, fog:false}));
  flies.raycast = noRay; g.add(flies);

  /* ---- the timeline: a glowing line along the wainscot with a year plaque per station ---- */
  const lineZ = WALLZ + 0.31, lineMat = glow(0xf0a23a, 1.25);
  const line = mesh(box(x1 - x0 + 3, 0.07, 0.04), lineMat, (x0 + x1)/2, LINE_Y, lineZ); line.castShadow = false; g.add(line);
  const tip = mesh(new THREE.ConeGeometry(0.16, 0.42, 4), lineMat, x1 + 1.7, LINE_Y, lineZ); tip.rotation.z = -Math.PI/2; tip.castShadow = false; g.add(tip);
  const floorLine = mesh(box(x1 - x0 + 3, 0.03, 0.12), glow(0xf0a23a, 0.9), (x0 + x1)/2, 0.02, -2.4); floorLine.castShadow = false; g.add(floorLine);
  // arrows that drift toward "now" (static when motion is reduced)
  const chevGeo = new THREE.CircleGeometry(0.11, 3), chevMat = glow(0xffd27a, 1.4), chevs = [], CH = 0.9;
  for(let cx = x0 - 1.5; cx < x1 + 1.5 - CH; cx += CH){ const c = mesh(chevGeo, chevMat, cx, LINE_Y, lineZ + 0.03); c.castShadow = false; c.userData.x = cx; chevs.push(c); g.add(c); }
  const nodeGeo = cyl(0.3, 0.3, 0.06, 16), nodeMat = glow(0xf0a23a, 1.1);
  const plaque = (text, x) => {
    const p = panel(1.3, 0.48, (ctx, W, Hh) => {
      card(ctx, W, Hh, {}, {bg:'#20160f', border:COL.ember, lw:2.5, r:10});
      ctx.textAlign = 'center'; ctx.font = `700 24px ${FM}`; ctx.fillStyle = COL.ember; ctx.fillText(clip(ctx, text, W - 24), W/2, 11); ctx.textAlign = 'left';
    });
    p.position.set(x, LINE_Y, lineZ + 0.05); g.add(p);
  };
  stations.forEach(s => {
    plaque(String(yearOf(s.e.period) === 9999 ? s.e.period : yearOf(s.e.period)), s.x);
    const n = mesh(nodeGeo, nodeMat, s.x, 0.04, -2.4); n.castShadow = false; g.add(n);
  });
  const last = stations[stations.length - 1];
  if(last){ const p = String(last.e.period); plaque(/present|now/i.test(p) ? 'NOW' : String((p.match(/\d{4}/g) || [p]).pop()), x1 + 0.9); }

  /* ---- station boards ---- */
  const paperDraw = e => (ctx, W, Hh, st) => {
    card(ctx, W, Hh, st, {bg:'#efe6cf', border:'rgba(60,40,20,.35)', r:6});
    const x = 22, mw = W - 44; let y = 22;
    eyebrow(ctx, e.period, x, y, COL.brown, 14); y += 28;
    ctx.font = `400 25px ${FD}`; ctx.fillStyle = COL.paperInk; y = para(ctx, e.title, x, y, mw, 30, 3) + 4;
    ctx.font = `600 16px ${FB}`; ctx.fillStyle = '#6b5640'; y = para(ctx, e.company, x, y, mw, 21, 2) + 10;
    ctx.font = `400 15px ${FB}`; ctx.fillStyle = '#3a3026'; y = para(ctx, e.description, x, y, mw, 21, 4) + 12;
    pills(ctx, e.skills || [], x, y, mw, '#4f6e34', 12);
  };
  const noteCols = ['#f3e9cf', '#e6efd6', '#f5dfcd', '#dfe8f0', '#efe2f2'], pinGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const stop = k => `Timeline stop ${k + 1} of ${stations.length}`;
  let start = 0;

  stations.forEach((s, k) => {
    const e = s.e, grp = new THREE.Group(), top = BOT + s.h; g.add(grp);
    // station view: wide frames show the neighbours; narrow (portrait) frames the board alone
    const lo = 0.1, hi = top + (s.edu ? 0.9 : 0.3), c = new V3(s.x, (lo + hi)/2, -3.2);
    s.wide = view(c, s.w + (s.edu ? 3.2 : 1.8), hi - lo, N);
    if(s.edu){
      grp.add(mesh(box(3.4, 3.1, 0.12), mat(0x6b4a30), s.x, BOT + 1.55, -3.3));
      const p = panel(3.2, 2.9, paperDraw(e)); p.position.set(s.x, BOT + 1.55, -3.2); grp.add(p);
      const lamp = mesh(box(0.6, 0.12, 0.22), glow(0xffb35a, 0.9), s.x, top + 0.3, -3.25); lamp.castShadow = false; grp.add(lamp);
      items.push(item({obj:grp, panels:[p], wide:s.wide, narrow:view(new V3(s.x, BOT + 1.4, -3.2), 3.7, 3.6, N),
        label:`${stop(k)}. Education: ${e.title}, ${e.company}, ${e.period}. ${e.description}${(e.skills || []).length ? ' Topics: ' + e.skills.join(', ') + '.' : ''}`}));
      return;
    }
    const hls = e.highlights || [], cy = BOT + s.h/2, headY = top - 0.25 - 0.75;
    grp.add(mesh(box(s.w, s.h, 0.1), mat(0x6b4a30), s.x, cy, -3.32));
    grp.add(mesh(box(s.w - 0.2, s.h - 0.2, 0.14), mat(0xa47a4c), s.x, cy, -3.25));
    const head = panel(s.w - 0.5, 1.5, (ctx, W, Hh, st) => {
      card(ctx, W, Hh, st, {bg:'#f6efdc', border:'rgba(60,40,20,.35)', r:6});
      eyebrow(ctx, e.period, 24, 20, COL.brown, 13);
      fitFont(ctx, e.title, 250, 30, 400, FD, 18); ctx.fillStyle = COL.paperInk; ctx.fillText(e.title, 24, 44);
      ctx.font = `600 17px ${FB}`; ctx.fillStyle = '#6b5640'; ctx.fillText(clip(ctx, e.company, 250), 24, 88);
      ctx.font = `400 16px ${FB}`; ctx.fillStyle = '#3a3026'; const y = para(ctx, e.description, 290, 20, W - 314, 21, 2);
      pills(ctx, e.skills || [], 290, y + 10, W - 314, '#4f6e34', 12);
    });
    head.position.set(s.x, headY, -3.15); head.rotation.z = 0.006; grp.add(head);
    if(e === DATA.experience[0]) start = items.length;
    items.push(item({obj:grp, panels:[head], wide:s.wide, narrow:view(new V3(s.x, headY, -3.15), s.w - 0.1, 2.0, N),
      label:`${stop(k)}. Experience: ${e.title}, ${e.company}, ${e.period}. ${e.description}${(e.skills || []).length ? ' Tools: ' + e.skills.join(', ') + '.' : ''}${hls.length ? ` ${hls.length} highlight notes follow.` : ''}`}));

    hls.forEach((hl, j) => {
      const m = hl.match(/^(.*?)\s*\(([^)]*)\):\s*(.*)$/) || [0, '', '', hl];
      const row = Math.floor(j / COLS), col = j % COLS, inRow = Math.min(COLS, hls.length - row*COLS);
      const nx = s.x + (col - (inRow - 1)/2)*(NOTE_W + GX), ny = headY - 0.75 - 0.3 - NOTE_H/2 - row*(NOTE_H + GY);
      const p = panel(NOTE_W, NOTE_H, (ctx, W, Hh, st) => {
        card(ctx, W, Hh, st, {bg:noteCols[j % noteCols.length], border:'rgba(60,40,20,.25)', r:4});
        let y = 20; ctx.font = `700 17px ${FB}`; ctx.fillStyle = COL.paperInk; y = para(ctx, m[1], 18, y, W - 36, 21, 2);
        if(m[2]){ eyebrow(ctx, m[2], 18, y + 3, COL.brown, 12); y += 22; }
        ctx.font = `400 14.5px ${FB}`; ctx.fillStyle = '#3a3026'; para(ctx, m[3], 18, y + 6, W - 36, 19.5, 6);
      });
      p.position.set(nx, ny, -3.13 + j*0.002); p.rotation.z = (rnd() - 0.5)*0.04; grp.add(p);
      const pin = mesh(pinGeo, glow(0xd2402a, 0.8), nx, ny + NOTE_H/2 - 0.12, -3.07); pin.castShadow = false; grp.add(pin);
      items.push(item({obj:p, hits:[p, pin], panels:[p],
        wide:view(new V3(nx, ny, -3.13), NOTE_W*3, NOTE_H + 2.4, N), narrow:view(new V3(nx, ny, -3.13), NOTE_W + 0.35, NOTE_H + 0.4, N),
        label:`Highlight ${j + 1} of ${hls.length} at ${e.company}: ${hl}`}));
    });
  });
  if(!DATA.experience.length) start = items.length - 1;

  /* ---- camera: brief establishing shot of the whole hall on entry, then one stop at a time ---- */
  const overview = view(new V3(hc, 4.3, -3.2), L - 1, H, N);
  let introUntil = 0, keyX = items[start] ? items[start].wide.c.x : 0;
  const R = {group:g, items, start, follow:true,
    view(narrow){
      const it = items[R.focus];
      return performance.now() < introUntil || !it ? overview : narrow ? it.narrow : it.wide;
    },
    light:{key:[keyX, 5.5, 2.5, 0xffcf8a, 1.6], fill:[hc, 5, 3, 0xffb070, 0.9]},
    heroSpot:new V3(x1 + 1.6, 0, -1.4),
    onEnter(narrow){ introUntil = reduce || narrow ? 0 : performance.now() + 1400; },   // establishing shot on every entry
    onFocus(i, snap){ if(!snap) introUntil = 0; },
    update(t, dt){
      const it = items[R.focus];
      if(it){ keyX += (it.wide.c.x - keyX) * (reduce ? 1 : Math.min(1, dt*3)); keyL.position.x = g.position.x + keyX; }
      if(reduce) return;
      const fl = Math.sin(t*7.3)*0.12 + Math.sin(t*13.1)*0.08;
      lampMat.emissiveIntensity = 1.25 + fl; haloMat.opacity = 0.5 + fl*0.8;
      globe.rotation.y = t*0.35;
      for(let i = 0; i < FN; i++){ const b = fbase[i]; fpos[i*3] = b[0] + Math.sin(t*0.3 + i)*0.4; fpos[i*3 + 1] = b[1] + Math.sin(t*0.45 + i*1.7)*0.35; }
      fgeo.attributes.position.needsUpdate = true;
      const off = (t*0.45) % CH;
      chevs.forEach(c => { c.position.x = c.userData.x + off; });
    }};
  return R;
}
