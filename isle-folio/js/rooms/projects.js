/* ---- Forgewell: the Foundry (projects carousel) ---- */
import { THREE, V3, reduce, touch, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { camera, keyL } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, canvasTex, panel, rr, wrap, para, clip, pills, card, eyebrow, openLink } from '../panels.js';
import { anvil } from '../world/props.js';
import { view, item, arcWall } from './kit.js';

const pad2 = k => String(k).padStart(2, '0');
const titleOf = p => p.title.split(' — ');
const isPub = p => p.status === 'public' && !!p.link;
const hostOf = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return /github\./.test(h) ? 'GitHub' : h; } catch(e){ return 'the web'; } };
// largest font size (max → min) at which text wraps into ≤ maxLines
function fitLines(ctx, text, maxW, maxLines, size, min, weight, fam){
  let lines;
  for(; size >= min; size--){ ctx.font = `${weight} ${size}px ${fam}`; lines = wrap(ctx, text, maxW); if(lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxW)) break; }
  return {size: Math.max(size, min), lines};
}
function keycap(ctx, x, y, dir){   // outlined key with a drawn arrow (glyph arrows are tiny in these fonts)
  rr(ctx, x, y, 30, 26, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = COL.muted; ctx.stroke();
  const cx = x + 15, cy = y + 13; ctx.beginPath(); ctx.moveTo(cx - 7*dir, cy); ctx.lineTo(cx + 7*dir, cy); ctx.moveTo(cx + 2*dir, cy - 5); ctx.lineTo(cx + 7*dir, cy); ctx.lineTo(cx + 2*dir, cy + 5);
  ctx.lineWidth = 2; ctx.strokeStyle = COL.ink; ctx.stroke();
}

export default function build(){
  const g = new THREE.Group(), items = [], list = DATA.projects, n = list.length, RC = 4.7, CZ = -4.2;
  // Fixed spacing (11 per ring) whatever the count: ≥11 projects wrap round the ring, fewer sit on a front arc.
  // Only a window of ±WIN neighbours is shown; the rest shrink away, so 50 projects read as cleanly as 11.
  const STEP = Math.PI*2/11, WIN = 4.6, wraps = n >= 11;
  let cur = 0, pos = 0, posT = 0;   // pos = animated (fractional) index sitting at the front of the ring

  /* ---------- the forge hall ---------- */
  g.add(mesh(new THREE.CylinderGeometry(12, 12.4, 0.4, 10), mat(0x34302c), 0, -0.2, -3));
  const wall = arcWall(12, 9, 0x2d2926, Math.PI/2 + 0.25, Math.PI - 0.5); wall.position.z = -3; g.add(wall);
  // heat halo: an additive radial glow behind the board gives the hall depth (no extra lights)
  const haloT = canvasTex(4, 4, (ctx, W, H) => { const gr = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2); gr.addColorStop(0, 'rgba(255,110,40,.4)'); gr.addColorStop(0.45, 'rgba(255,80,20,.18)'); gr.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(17, 12), new THREE.MeshBasicMaterial({map:haloT.tex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
  halo.position.set(0, 5.6, -9.5); g.add(halo);
  // Repeated props are InstancedMeshes (one draw call each); per-instance tint via instanceColor.
  const _o = new THREE.Object3D(), _c = new THREE.Color();
  const inst = (geo, m, list, parent = g, shadow = false) => {
    const im = new THREE.InstancedMesh(geo, m, list.length);
    list.forEach(([x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, c], i) => {
      _o.position.set(x, y, z); _o.rotation.set(rx, ry, rz); _o.scale.set(sx, sy, sz); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix);
      if(c !== undefined) im.setColorAt(i, _c.setHex(c));
    });
    im.castShadow = shadow; im.receiveShadow = true; parent.add(im); return im;
  };
  const tint = (base, k) => { _c.setHex(base).offsetHSL(0, 0, (k - 0.5)*0.06); return _c.getHex(); };
  const onWall = (a, r) => [Math.sin(a)*r, -3 + Math.cos(a)*r];   // point on the hall's arc (centre z = -3)
  const IRON = mat(0x2f3238, {metalness:0.3, roughness:0.7}), IRON2 = mat(0x45484f, {metalness:0.3, roughness:0.6}),
        WOOD = mat(0x6b4a30), WOOD2 = mat(0x4f3622), STONE = mat(0x4a433d), LEATHER = mat(0x7a4630),
        TINTED = mat(0xffffff, {roughness:0.92}), BRASS = mat(0xc49a4a, {metalness:0.5, roughness:0.45});
  const put = (p, m) => (p.add(m), m);
  const UB = box(1, 1, 1), UC = cyl(1, 1, 1, 8);

  // floor: flagstones (gaps show the dark mortar disc), skipping the carousel plinth
  const flags = [];
  for(let x = -11.4; x <= 11.4; x += 1.25) for(let z = -14.6; z <= 8.6; z += 1.25){
    const jx = x + (rnd() - 0.5)*0.12, jz = z + (rnd() - 0.5)*0.12;
    if(Math.hypot(jx, jz + 3) > 11.4 || Math.hypot(jx, jz - CZ) < 5.95) continue;
    flags.push([jx, 0.02, jz, 0, (rnd() - 0.5)*0.1, 0, 1.12 + rnd()*0.06, 0.05, 1.1 + rnd()*0.06, tint(0x3e3832, rnd())]);
  }
  inst(UB, TINTED, flags);
  // warm light pools on the floor (additive, no lights)
  const pool = (x, z, s, o) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({map:haloT.tex, transparent:true, opacity:o, blending:THREE.AdditiveBlending, depthWrite:false})); p.rotation.x = -Math.PI/2; p.position.set(x, 0.07, z); g.add(p); return p; };
  const firePool = pool(0, -9.6, 9, 0.9);

  // walls: stone plinth blocks, timber pilasters, protruding bricks, a timber wall-plate on top
  const A0 = Math.PI/2 + 0.25, AL = Math.PI - 0.5, plinth = [], pil = [], bricks = [];
  for(let k = 0, N = 24; k < N; k++){ const a = A0 + (k + 0.5)*AL/N, [x, z] = onWall(a, 11.78); plinth.push([x, 0.5, z, 0, a, 0, 1.5, 1.0 + rnd()*0.12, 0.5, tint(0x4a433d, rnd())]); }
  for(let k = 0; k <= 8; k++){ const a = A0 + 0.12 + k*(AL - 0.24)/8, [x, z] = onWall(a, 11.62); pil.push([x, 4.6, z, 0, a, 0, 0.62, 9.2, 0.6]); }
  for(let k = 0; k < 110; k++){ const a = A0 + 0.05 + rnd()*(AL - 0.1), [x, z] = onWall(a, 11.94); bricks.push([x, 1.3 + rnd()*7, z, 0, a, 0, 0.62 + rnd()*0.2, 0.26, 0.12, tint(0x3b3531, rnd())]); }
  inst(UB, TINTED, plinth); inst(UB, WOOD2, pil); inst(UB, TINTED, bricks);
  const wallPlate = new THREE.Mesh(new THREE.CylinderGeometry(11.55, 11.55, 0.5, 28, 1, true, A0, AL), mat(0x4f3622, {side:THREE.DoubleSide}));
  wallPlate.position.set(0, 8.8, -3); g.add(wallPlate);
  // roof timbers: tie beams across the back of the hall with diagonal braces up to the pilasters
  inst(UB, WOOD2, [[0, 9.2, -9, 0, 0, 0, 20.6, 0.42, 0.42], [0, 9.2, -13, 0, 0, 0, 14.4, 0.42, 0.42],
    [-9.4, 8.2, -9, 0, 0, -0.75, 0.24, 2.4, 0.24], [9.4, 8.2, -9, 0, 0, 0.75, 0.24, 2.4, 0.24]]);

  // the furnace: stone body, block facing, iron lintel + grate, glowing coal bed, iron hood, banded chimney
  g.add(mesh(box(6.4, 3.2, 2.2), STONE, 0, 1.6, -12.2));
  g.add(mesh(box(7.2, 0.32, 2.9), mat(0x37322d), 0, 0.16, -12.1));
  const fb = [];
  for(let r = 0, y = 0.5; y < 3.05; r++, y += 0.34) for(let x = -3.05 + (r % 2)*0.4; x < 3.1; x += 0.8){
    if(Math.abs(x) < 1.95 && y < 2.1) continue;
    fb.push([x, y, -11.08, 0, 0, 0, 0.74, 0.28, 0.1, tint(0x564c44, rnd())]);
  }
  inst(UB, TINTED, fb);
  const mouth = mesh(box(3.2, 1.5, 0.1), glow(0xd2440e, 1.0).clone(), 0, 1.1, -11.06); mouth.castShadow = false; g.add(mouth);
  const coals = mesh(box(3.0, 0.3, 0.3), glow(0xffa040, 1.4).clone(), 0, 0.5, -10.98); coals.castShadow = false; g.add(coals);
  inst(UB, IRON, [[0, 2.02, -10.98, 0, 0, 0, 3.9, 0.3, 0.26], [-1.8, 1.1, -10.98, 0, 0, 0, 0.3, 1.9, 0.26], [1.8, 1.1, -10.98, 0, 0, 0, 0.3, 1.9, 0.26],
    [0, 3.36, -12.15, 0, 0, 0, 6.9, 0.3, 2.5], [-3.45, 1.7, -12.15, 0, 0, 0, 0.5, 3.4, 2.6], [3.45, 1.7, -12.15, 0, 0, 0, 0.5, 3.4, 2.6]], g, true);
  inst(UC, IRON2, [-1.2, -0.6, 0, 0.6, 1.2].map(x => [x, 1.12, -10.9, 0, 0, 0, 0.045, 1.45, 0.045]));
  const hoodG = new THREE.CylinderGeometry(1.95, 4.4, 1.5, 4); hoodG.rotateY(Math.PI/4); hoodG.scale(1, 1, 0.62);
  const hood = mesh(hoodG, mat(0x35322f, {metalness:0.25, roughness:0.7}), 0, 4.25, -12.3); g.add(hood);
  g.add(mesh(box(2.6, 7, 1.8), mat(0x3d3732), 0, 6.6, -12.4));
  inst(UB, IRON, [[0, 6.2, -12.4, 0, 0, 0, 2.8, 0.2, 2.0], [0, 8.1, -12.4, 0, 0, 0, 2.8, 0.2, 2.0], [0, 10.2, -12.4, 0, 0, 0, 3.0, 0.36, 2.2]]);
  // coal heap beside the furnace, a few lumps still glowing
  const lump = new THREE.DodecahedronGeometry(0.22, 0), heap = [], hot = [];
  for(let k = 0; k < 22; k++){ const a = rnd()*6.3, r = rnd()*0.75, s = 0.7 + rnd()*0.7; (k % 6 ? heap : hot).push([3.85 + Math.cos(a)*r, 0.1 + (0.8 - r)*0.45*rnd() + 0.08, -11.2 + Math.sin(a)*r*0.7, rnd()*3, rnd()*3, 0, s, s*0.8, s]); }
  inst(lump, mat(0x1d1c1e), heap); const hotLumps = inst(lump, glow(0xff5a1a, 1.2).clone(), hot);

  // bellows on the furnace's left flank (pumps slowly)
  const bel = new THREE.Group(); bel.position.set(-4.75, 0, -11.9); g.add(bel);
  inst(UB, WOOD2, [[-0.6, 0.35, 0, 0, 0, 0, 0.18, 0.7, 0.8], [0.6, 0.35, 0, 0, 0, 0, 0.18, 0.7, 0.8], [0, 0.74, 0, 0, 0, 0, 1.9, 0.08, 0.95]], bel, true);
  const belTop = new THREE.Group(); belTop.position.set(0.95, 0.8, 0); bel.add(belTop);   // hinged at the nozzle end
  const belLeather = mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.8, 3), LEATHER, -0.95, 0.17, 0); belLeather.rotation.set(Math.PI/2, 0, Math.PI/2); belLeather.scale.set(1, 1, 0.45); belTop.add(belLeather);
  belTop.add(mesh(box(1.9, 0.07, 0.95), WOOD, -0.95, 0.36, 0));
  put(belTop, mesh(cyl(0.03, 0.03, 0.9, 5), WOOD2, -2.1, 0.5, 0)).rotation.z = Math.PI/2.4;
  const nozzle = mesh(new THREE.ConeGeometry(0.12, 0.6, 6), BRASS, 1.2, 0.85, 0); nozzle.rotation.z = -Math.PI/2; bel.add(nozzle);

  // braziers flanking the hall: iron bowl on a tripod, glowing coals, a soft additive halo
  const braziers = [[-6.6, -10.2], [5.5, -10.0]].map(([x, z]) => {
    const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
    inst(UC, IRON, [0, 2.1, 4.2].map(a => [Math.sin(a)*0.32, 0.55, Math.cos(a)*0.32, Math.cos(a)*0.25, 0, -Math.sin(a)*0.25, 0.05, 1.15, 0.05]), b);
    b.add(mesh(new THREE.CylinderGeometry(0.62, 0.32, 0.38, 8), IRON2, 0, 1.25, 0));
    const ember = mesh(new THREE.ConeGeometry(0.55, 0.32, 7), glow(0xff5a14, 1.1).clone(), 0, 1.5, 0); ember.castShadow = false; b.add(ember);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({map:haloT.tex, transparent:true, opacity:0.8, blending:THREE.AdditiveBlending, depthWrite:false})); h.position.y = 1.8; b.add(h);
    return {ember, h, p: pool(x, z, 3.4, 0.6)};
  });

  // side workshop: anvil (horn, hammer, tongs) with a glowing ingot (spark source) on the left
  const an = anvil(); an.scale.setScalar(1.4); an.position.set(-6.4, 0, -6.6); an.rotation.y = 0.5; g.add(an);
  const horn = mesh(new THREE.ConeGeometry(0.15, 0.5, 6), mat(0x2f3238), 0.85, 0.66, 0); horn.rotation.z = -Math.PI/2; an.add(horn);
  an.add(mesh(box(0.75, 0.1, 0.55), WOOD2, 0, 0.05, 0));
  const ingot = mesh(box(0.5, 0.12, 0.2), glow(0xff4a12, 1.2).clone(), 0.1, 0.83, 0); ingot.castShadow = false; an.add(ingot);
  const hammer = new THREE.Group(); hammer.position.set(-0.25, 0.79, 0.14); hammer.rotation.y = 0.6; an.add(hammer);
  put(hammer, mesh(cyl(0.025, 0.03, 0.55, 5), WOOD, 0, 0.02, 0.18)).rotation.x = Math.PI/2;
  hammer.add(mesh(box(0.2, 0.1, 0.1), IRON2, 0, 0.04, -0.12));
  inst(UB, IRON2, [[0.35, 0.8, -0.1, 0, 0.15, 0, 0.6, 0.03, 0.03], [0.35, 0.8, -0.16, 0, -0.1, 0, 0.6, 0.03, 0.03]], an);

  // tool racks hung on the walls: plank board, pegs, hammers and tongs
  function rack(a, y, w){
    const [x, z] = onWall(a, 11.45), r = new THREE.Group(); r.position.set(x, y, z); r.rotation.y = a + Math.PI; g.add(r);
    r.add(mesh(box(w, 1.5, 0.1), WOOD2, 0, 0, 0));
    r.add(mesh(box(w + 0.2, 0.12, 0.3), WOOD, 0, 0.8, 0.12));
    const tools = [], heads = [], n = Math.round(w/0.45);
    for(let k = 0; k < n; k++){
      const tx = -w/2 + 0.3 + k*(w - 0.6)/(n - 1), kind = k % 3;
      if(kind === 2){ tools.push([tx - 0.05, -0.15, 0.1, 0, 0, 0.08, 0.03, 1.0, 0.03], [tx + 0.05, -0.15, 0.1, 0, 0, -0.08, 0.03, 1.0, 0.03]); heads.push([tx, -0.66, 0.1, 0, 0, 0, 0.14, 0.12, 0.05]); }
      else { tools.push([tx, -0.1, 0.12, 0, 0, 0, 0.04, 0.9, 0.04]); heads.push([tx, 0.38, 0.12, 0, 0, 0, kind ? 0.34 : 0.24, 0.14, 0.14]); }
    }
    inst(UB, WOOD, tools, r); inst(UB, IRON2, heads, r);
    return r;
  }
  rack(Math.PI + 0.75, 3.0, 2.6); rack(Math.PI - 0.76, 3.1, 2.2);
  // workbench under the right rack: vise, bar stock, a cooling blade
  const [bx, bz] = onWall(Math.PI - 0.76, 10.6), bench = new THREE.Group(); bench.position.set(bx, 0, bz); bench.rotation.y = Math.PI - 0.76 + Math.PI; g.add(bench);
  bench.add(mesh(box(2.8, 0.14, 1.0), WOOD, 0, 1.0, 0));
  inst(UB, WOOD2, [[-1.25, 0.47, -0.38], [1.25, 0.47, -0.38], [-1.25, 0.47, 0.38], [1.25, 0.47, 0.38], [0, 0.3, 0, 0, 0, 0, 2.5, 0.08, 0.08]].map(p => p.length > 3 ? p : [...p, 0, 0, 0, 0.12, 0.94, 0.12]), bench, true);
  inst(UB, IRON2, [[-0.95, 1.2, 0.3, 0, 0, 0, 0.32, 0.26, 0.26], [-0.95, 1.36, 0.3, 0, 0, 0, 0.08, 0.06, 0.5], [0.3, 1.1, 0.1, 0, 0.2, 0, 0.8, 0.05, 0.05], [0.4, 1.1, -0.15, 0, 0.1, 0, 0.8, 0.05, 0.05]], bench);
  const blade = mesh(box(0.9, 0.025, 0.1), glow(0xff6a20, 0.9).clone(), 0.55, 1.09, 0.32); blade.rotation.y = -0.3; blade.castShadow = false; bench.add(blade);

  // right corner: crates with iron bands, a stack of ingots, quench barrel
  const crates = [[6.4,-7.2,0],[7.2,-6.2,0],[6.8,-6.7,0.84]], bands = [];
  crates.forEach(([x,z,y],k) => { const c = mesh(box(0.85,0.85,0.85), mat(0x8a6542), x, 0.42 + y, z); c.rotation.y = k*0.7; g.add(c);
    [-0.25, 0.25].forEach(dy => bands.push([x, 0.42 + y + dy, z, 0, k*0.7, 0, 0.88, 0.07, 0.88])); });
  inst(UB, mat(0x3a3633), bands);
  const ing = [];
  [[4, 0], [3, 1], [2, 2], [1, 3]].forEach(([cnt, row]) => { for(let k = 0; k < cnt; k++) ing.push([-(cnt - 1)*0.17 + k*0.34, 0.2 + row*0.12, 0, 0, row % 2 ? 0.08 : 0, 0, 0.3, 0.11, 0.52, row === 3 ? 0xd8b25a : tint(0x9a8a72, rnd())]); });
  const pile = new THREE.Group(); pile.position.set(8.9, 0, -7.4); pile.rotation.y = -0.6; g.add(pile);
  pile.add(mesh(box(1.6, 0.14, 0.9), WOOD2, 0, 0.07, 0));
  inst(UB, mat(0xffffff, {metalness:0.45, roughness:0.5}), ing, pile, true);
  g.add(mesh(cyl(0.55, 0.5, 0.9, 10), mat(0x4a3a2c), 5.6, 0.45, -8.4));
  inst(new THREE.TorusGeometry(0.56, 0.035, 4, 12), IRON, [0.18, 0.72].map(y => [5.6, y, -8.4, Math.PI/2, 0, 0]));
  put(g, mesh(new THREE.CircleGeometry(0.48, 10), mat(0x1e2a33, {roughness:0.2, metalness:0.2}), 5.6, 0.86, -8.4)).rotation.x = -Math.PI/2;
  inst(UB, IRON2, [[5.45, 1.1, -8.3, 0, 0, 0.18, 0.03, 0.75, 0.03], [5.55, 1.1, -8.5, 0, 0, 0.12, 0.03, 0.75, 0.03]]);

  // grindstone by the front-right of the ring (slow spin)
  const grind = new THREE.Group(); grind.position.set(7.4, 0, -3.4); grind.rotation.y = -0.4; g.add(grind);
  inst(UB, WOOD2, [[-0.25, 0.4, 0, 0, 0, 0, 0.1, 0.8, 0.5], [0.25, 0.4, 0, 0, 0, 0, 0.1, 0.8, 0.5], [0, 0.12, 0, 0, 0, 0, 0.5, 0.24, 0.6]], grind, true);
  const wheel = mesh(cyl(0.45, 0.45, 0.16, 12), mat(0x8a8478), 0, 0.82, 0); wheel.rotation.z = Math.PI/2; grind.add(wheel);
  put(grind, mesh(cyl(0.03, 0.03, 0.75, 5), IRON2, 0, 0.82, 0)).rotation.z = Math.PI/2;

  // chains and hooks hanging from the tie beams (gentle sway)
  const link = new THREE.TorusGeometry(0.08, 0.022, 4, 8), hookG = new THREE.TorusGeometry(0.16, 0.035, 4, 8, Math.PI*1.4);
  const hangs = [[-7.4, -9, 9.0, 3.4], [7.3, -9, 9.0, 2.6], [-9.2, -9, 9.0, 1.8], [6.7, -13, 9.0, 3.8], [-6.7, -13, 9.0, 3.0]].map(([x, z, top, len], k) => {
    const h = new THREE.Group(); h.position.set(x, top, z); g.add(h);
    const n = Math.round(len/0.13);
    inst(link, IRON2, Array.from({length:n}, (_, i) => [0, -0.07 - i*0.13, 0, 0, i % 2 ? Math.PI/2 : 0, Math.PI/2]), h);
    const hk = mesh(hookG, IRON2, 0, -len - 0.1, 0); hk.rotation.z = Math.PI*0.8; hk.castShadow = false; h.add(hk);
    if(k === 1){ const pail = mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.45, 8), IRON, 0, -len - 0.5, 0); h.add(pail); }
    return h;
  });

  // carousel hub: a flat iron gear turning slowly under the board, rivets round the plinth rim
  const hubG = new THREE.Group(); hubG.position.set(0, 0.3, CZ); g.add(hubG);
  hubG.add(mesh(cyl(1.2, 1.3, 0.22, 12), IRON, 0, 0.11, 0));
  inst(UB, IRON, Array.from({length:12}, (_, i) => { const a = i*Math.PI/6; return [Math.sin(a)*1.3, 0.11, Math.cos(a)*1.3, 0, a, 0, 0.3, 0.2, 0.3]; }), hubG);
  hubG.add(mesh(cyl(0.35, 0.35, 0.36, 6), BRASS, 0, 0.18, 0));

  // particles: sparks burst off the anvil, embers rise from the forge. reduce → frozen in place.
  const points = (m, color, size) => {
    const pos = new Float32Array(m*3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(geo, new THREE.PointsMaterial({color, size, transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false})));
    return {geo, pos, seeds: Array.from({length:m}, () => [rnd(), rnd(), rnd(), rnd()])};
  };
  const sparks = points(36, 0xffb050, 0.08), embers = points(70, 0xff7a30, 0.07);
  const ax = an.position.x, az = an.position.z;
  function particles(t){
    sparks.seeds.forEach(([a, b, c, d], i) => {   // short ballistic arcs every ~1.4s
      const u = (t*0.7 + a*0.35) % 1, ang = b*Math.PI*2, v = 1.2 + c*1.6;
      sparks.pos.set([ax + Math.cos(ang)*v*u, 1.15 + (1.8 + d*1.6)*u - 4.2*u*u, az + Math.sin(ang)*v*u], i*3);
    });
    embers.seeds.forEach(([a, b, c, d], i) => {
      const u = (t*(0.04 + d*0.05) + a) % 1;
      embers.pos.set([(b - 0.5)*14 + Math.sin(t*0.7 + c*9)*0.6, 0.6 + u*10, -11 + c*5 + u*1.5], i*3);
    });
    sparks.geo.attributes.position.needsUpdate = embers.geo.attributes.position.needsUpdate = true;
  }
  particles(0);

  /* ---------- the carousel ---------- */
  const car = new THREE.Group(); car.position.set(0, 0, CZ); g.add(car);
  car.add(mesh(new THREE.CylinderGeometry(RC + 0.9, RC + 1.0, 0.3, 48), mat(0x2b2724), 0, 0.15, 0));
  const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(RC + 0.95, 0.04, 6, 96), glow(0xc8501a, 0.9)); ringGlow.rotation.x = Math.PI/2; ringGlow.position.y = 0.31; car.add(ringGlow);
  inst(cyl(0.07, 0.07, 0.06, 6), BRASS, Array.from({length:40}, (_, i) => { const a = i*Math.PI/20; return [Math.sin(a)*(RC + 0.62), 0.32, Math.cos(a)*(RC + 0.62)]; }), car);
  const stands = [];
  list.forEach((p, i) => {
    const pub = isPub(p), st = new THREE.Group(); car.add(st);   // placed on the ring every frame in update()
    st.add(mesh(cyl(0.16, 0.22, 0.95, 6), mat(0x4a4540), 0, 0.47, 0));
    // status gem on the pole: green = public code, dark iron = private
    const gem = mesh(new THREE.OctahedronGeometry(0.13), pub ? glow(0x6fae5c, 0.7) : mat(0x3a3633), 0, 0.98, 0.2); gem.castShadow = false; st.add(gem);
    const yaw = new THREE.Group(); st.add(yaw);     // turned toward the camera in update() so side tablets stay legible
    const tilt = new THREE.Group(); tilt.position.y = 1.5; tilt.rotation.x = -0.28; yaw.add(tilt);
    tilt.add(mesh(box(2.1, 1.3, 0.06), mat(0x2a2522), 0, 0, -0.04));
    const tab = panel(2.0, 1.2, (ctx, W, H, s) => {
      card(ctx, W, H, s, {bg:'rgba(24,21,18,.96)', border: pub ? 'rgba(143,194,126,.55)' : 'rgba(255,140,60,.3)', r:12});
      ctx.fillStyle = pub ? COL.moss : '#5d5650'; rr(ctx, 14, 12, 4, H - 24, 2); ctx.fill();   // status stripe
      eyebrow(ctx, pub ? '● public' : '◆ private', 26, 14, pub ? COL.moss : COL.muted, 11);
      ctx.textAlign = 'right'; eyebrow(ctx, pad2(i+1), W - 16, 14, COL.muted, 11); ctx.textAlign = 'left';
      const f = fitLines(ctx, titleOf(p)[0], W - 44, 2, 21, 12, 400, FD);
      ctx.fillStyle = s.focus ? '#fff3dc' : COL.ink; f.lines.forEach((l, k) => ctx.fillText(l, 26, 38 + k*(f.size + 4)));
      ctx.font = `600 10px ${FM}`; ctx.fillStyle = pub ? COL.moss : COL.muted;
      ctx.fillText(clip(ctx, pub ? `${hostOf(p.link).toUpperCase()} ↗` : p.technologies.slice(0, 3).join(' · '), W - 44), 26, H - 26);
    });
    tilt.add(tab);
    stands.push({st, yaw, tilt});
    items.push(item({obj:st, panels:[tab],
      label:`Project ${i+1} of ${n}: ${p.title}. ${pub ? 'Public' : 'Private'}. ${p.description} Built with ${p.technologies.join(', ')}. ${pub ? `Press Enter to open it on ${hostOf(p.link)}.` : 'Source is private.'}`,
      activate: pub ? () => openLink(p.link) : null}));
  });

  /* ---------- the detail board: landscape on wide screens, portrait on narrow ones ---------- */
  // The canvas is the board's max size; the card is drawn only as tall as the content needs and the mesh is
  // cropped to match (b.frac), so short descriptions get a compact board instead of empty space.
  function drawBoard(ctx, W, H, b){
    const tall = b === TALL, p = list[cur], pub = isPub(p), [main, sub] = titleOf(p);
    const x = tall ? 28 : 34, mw = W - x*2, FH = tall ? 134 : 74, top = 66, GAP = 16;
    const T = fitLines(ctx, main, mw, 2, tall ? 34 : 40, 22, 400, FD);
    ctx.font = `600 ${tall ? 18 : 20}px ${FB}`; const S = sub ? wrap(ctx, sub, mw).slice(0, 2) : [];
    const ts = d => d < 18 ? 13 : 14, tagH = d => pills(ctx, p.technologies, x, -1e4, mw, '#f2925a', ts(d)) + 1e4;   // measure by drawing off-canvas
    const head = T.lines.length*(T.size + 8) + S.length*(tall ? 24 : 26);
    const need = d => { ctx.font = `400 ${d}px ${FB}`; return top + head + GAP + wrap(ctx, p.description, mw).length*d*1.45 + GAP + 22 + tagH(d) + 18 + FH; };
    let d = tall ? 25 : 23; while(d > 15 && need(d) > H) d--;    // largest description size that fits
    const Hc = Math.min(H, Math.max(need(d), H*0.6)), extra = Math.max(0, (Hc - need(d))/2);
    b.frac = Hc/H;
    card(ctx, W, Hc, {}, {bg:'rgba(14,16,26,.96)', border: pub ? 'rgba(143,194,126,.5)' : 'rgba(255,140,60,.45)', r:18});
    // top row: counter + status badge
    eyebrow(ctx, `Project ${pad2(cur+1)} / ${pad2(n)}`, x, 30, COL.muted, 13);
    const badge = pub ? '● Public · open source' : '◆ Private', bc = pub ? COL.moss : COL.muted;
    ctx.font = `700 12px ${FM}`; const bw = ctx.measureText(badge.toUpperCase()).width + 22;
    rr(ctx, W - x - bw, 22, bw, 26, 13); ctx.fillStyle = pub ? 'rgba(143,194,126,.16)' : 'rgba(154,164,189,.1)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = bc; ctx.stroke();
    eyebrow(ctx, badge, W - x - bw + 11, 29, bc, 12);
    // body
    let y = top;
    ctx.font = `400 ${T.size}px ${FD}`; ctx.fillStyle = COL.ink; T.lines.forEach(l => { ctx.fillText(l, x, y); y += T.size + 8; });
    if(S.length){ ctx.font = `600 ${tall ? 18 : 20}px ${FB}`; ctx.fillStyle = COL.ember; S.forEach(l => { ctx.fillText(l, x, y); y += tall ? 24 : 26; }); }
    y += GAP + extra;
    const tags = tagH(d), lh = d*1.45;
    ctx.font = `400 ${d}px ${FB}`; ctx.fillStyle = '#dcd7cb';
    y = para(ctx, p.description, x, y, mw, lh, Math.max(1, Math.floor((Hc - FH - 18 - tags - 22 - GAP - y)/lh + 0.01))) + GAP + extra;
    eyebrow(ctx, 'Built with', x, y, COL.muted, 12);
    pills(ctx, p.technologies, x, y + 22, mw, '#f2925a', ts(d));

    // footer: call to action + browse affordance
    const fy = Hc - FH; ctx.fillStyle = 'rgba(173,186,222,.16)'; ctx.fillRect(x, fy, mw, 1.5);
    ctx.fillStyle = COL.ember; ctx.fillRect(x + mw*cur/n, fy - 1, Math.max(6, mw/n), 3.5);   // where we are in the list
    const by = fy + 16, bh = 42;
    if(pub){
      const label = `${touch ? 'Tap' : '⏎ Enter'}  ·  Open on ${hostOf(p.link)} ↗`;
      ctx.font = `700 17px ${FB}`; const w = Math.min(mw, ctx.measureText(label).width + 36);
      rr(ctx, x, by, w, bh, 21); ctx.fillStyle = COL.ember; ctx.fill();
      ctx.fillStyle = '#1d1408'; ctx.fillText(clip(ctx, label, w - 36), x + 18, by + 12);
    } else {
      const label = '◆ Private · source not public';
      ctx.font = `600 15px ${FB}`; const w = ctx.measureText(label).width + 36;
      rr(ctx, x, by, w, bh, 21); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(154,164,189,.5)'; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.muted; ctx.fillText(label, x + 18, by + 13);
    }
    // prev / next: one row each, keycap on the right (touch: swipe, so no keycaps)
    const navW = tall ? mw : 300, nx = W - x - navW, kw = touch ? 0 : 40;
    [['‹ prev', -1, cur + n - 1], ['next ›', 1, cur + 1]].forEach(([tag, dir, j], r) => {
      const ry = (tall ? by + bh + 14 : fy + 10) + r*28;
      if(!touch) keycap(ctx, W - x - 30, ry, dir);
      eyebrow(ctx, tag, nx, ry + 7, COL.muted, 11);
      ctx.font = `500 15px ${FB}`; ctx.fillStyle = COL.ink; ctx.fillText(clip(ctx, titleOf(list[j % n])[0], navW - 62 - kw), nx + 58, ry + 4);
    });
  }
  // b.top = y of the board's top edge (it hangs from chains and grows downward)
  const WIDE = {w:7.4, h:4.6, top:7.0}, TALL = {w:4.7, h:6.6, top:8.7};
  const boards = [WIDE, TALL].map(b => Object.assign(b, {frac:1, geo:new THREE.PlaneGeometry(b.w, b.h), rec:canvasTex(b.w, b.h, (ctx, W, H) => drawBoard(ctx, W, H, b))}));
  const sign = new THREE.Group(); g.add(sign);
  const detail = new THREE.Mesh(WIDE.geo, new THREE.MeshBasicMaterial({map:WIDE.rec.tex, transparent:true}));
  detail.userData.focused = true; sign.add(detail);    // clicking the board activates the focused project
  const plate = mesh(box(1, 1, 0.16), mat(0x24211f)); sign.add(plate);
  const chains = [-1, 1].map(() => { const c = mesh(cyl(0.04, 0.04, 6, 5), mat(0x55504a)); sign.add(c); return c; });
  let layout = WIDE;
  function place(){
    const b = layout, h = b.h*b.frac;
    b.rec.tex.repeat.set(1, b.frac); b.rec.tex.offset.set(0, 1 - b.frac);
    detail.geometry = b.geo; detail.material.map = b.rec.tex;
    sign.position.set(0, b.top, CZ - 0.3);
    detail.position.y = -h/2; detail.scale.y = b.frac;
    plate.scale.set(b.w + 0.25, h + 0.25, 1); plate.position.set(0, -h/2, -0.12);
    chains.forEach((c, k) => c.position.set((k ? 1 : -1)*(b.w/2 - 0.5), 3, -0.1));
  }

  return {group:g, items, start:0,
    // framed a little low so the front tablet clears the 2D hint bar at the bottom of the screen
    view: narrow => narrow ? view(new V3(0, 4.3, -3.4), 5.0, 9.0) : view(new V3(0, 3.75, -2.6), 9.8, 7.9),
    light:{key:[0, 2.6, -7.4, 0xff7a2a, 2.2], fill:[0, 7, 6, 0xc4d0ff, 0.75]}, heroSpot:new V3(-5.4, 0, 0.6),
    onFocus(i, snap){
      let tgt = i; if(wraps){ while(tgt - posT > n/2) tgt -= n; while(tgt - posT < -n/2) tgt += n; }
      posT = tgt; cur = i; boards.forEach(b => b.rec.redraw()); place(); sign.scale.setScalar(snap || reduce ? 1 : 0.96);
      if(snap) pos = posT;
    },
    update(t, dt){
      const want = camera.aspect < 1.05 ? TALL : WIDE; if(want !== layout){ layout = want; place(); }
      const k = reduce ? 1 : Math.min(1, dt*5);
      pos += (posT - pos) * k;
      stands.forEach((s, i) => {
        const o = wraps ? ((i - pos) % n + n*1.5) % n - n/2 : i - pos, wa = o*STEP;   // signed offset from the front
        const vis = Math.min(1, Math.max(0, WIN + 0.5 - Math.abs(o)));
        s.st.visible = vis > 0.01; s.st.scale.setScalar(Math.max(vis, 0.001));
        s.st.position.set(Math.sin(wa)*RC, 0.3, Math.cos(wa)*RC); s.st.rotation.y = wa;
        s.yaw.rotation.y = -Math.sin(wa)*0.9;
        s.yaw.scale.setScalar(0.55 + 0.45*Math.max(0, Math.cos(wa)));   // far tablets shrink back, less clutter
        s.tilt.position.y += ((i === cur ? 1.72 : 1.5) - s.tilt.position.y) * k;
      });
      sign.scale.lerp(new V3(1,1,1), reduce ? 1 : Math.min(1, dt*8));
      if(reduce) return;
      keyL.intensity = 2.0 + Math.sin(t*9)*0.25 + Math.sin(t*23)*0.15;
      mouth.material.emissiveIntensity = 0.95 + Math.sin(t*11)*0.2;
      halo.material.opacity = 0.85 + Math.sin(t*3.1)*0.08 + Math.sin(t*7.3)*0.05;
      ingot.material.emissiveIntensity = 1.1 + Math.sin(t*5)*0.3;
      particles(t);
      const f = Math.sin(t*6.3)*0.5 + Math.sin(t*15.1)*0.3;
      coals.material.emissiveIntensity = 1.35 + f*0.3;
      hotLumps.material.emissiveIntensity = 1.0 + Math.sin(t*2.3)*0.35;
      firePool.material.opacity = 0.85 + f*0.08;
      braziers.forEach((b, k) => { const q = Math.sin(t*7.7 + k*2) + Math.sin(t*13.3 + k)*0.5; b.ember.material.emissiveIntensity = 1.05 + q*0.2; b.h.material.opacity = 0.75 + q*0.08; b.p.material.opacity = 0.55 + q*0.05; });
      belTop.rotation.z = -(0.5 + 0.5*Math.sin(t*1.3))*0.14;
      wheel.rotation.x = t*0.9;
      hubG.rotation.y = t*0.12;
      hangs.forEach((h, k) => { h.rotation.z = Math.sin(t*0.55 + k*1.7)*0.025; h.rotation.x = Math.sin(t*0.4 + k)*0.015; });
      blade.material.emissiveIntensity = 0.75 + Math.sin(t*0.9)*0.2;
    }};
}
