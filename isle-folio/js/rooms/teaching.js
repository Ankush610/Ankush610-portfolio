/* ---- Lyceum: the Amphitheatre (workshops, talks, recognition) ----
   Stage at the back with a chalkboard of talks (grouped by year, flowed into columns — each column is one
   focusable "page"), workshop easels in the wings, recognition on spotlit pedestals in the orchestra,
   seating tiers curving up on both sides. Every count comes from DATA. */
import { THREE, V3, reduce, touch, mat, mesh, glow, box, cyl } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, panel, setPanel, rr, wrap, para, clip, fitFont, pills, card, eyebrow, shortUrl, openLink } from '../panels.js';
import { view, faceY, item } from './kit.js';

const pad2 = n => String(n).padStart(2, '0');
const yearOf = t => (String(t.date || '').match(/\d{4}/) || [''])[0];
// narrowest wrap width that keeps the same line count → no one-word orphan lines
function balanced(ctx, text, maxW){
  const n = wrap(ctx, text, maxW).length; let w = maxW;
  while(w > 60 && wrap(ctx, text, w - 8).length === n) w -= 8;
  return wrap(ctx, text, w);
}
function hitPlane(w, h){ return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({visible:false})); }
const fx = (geo, m, x=0, y=0, z=0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
// one draw call for many copies: each entry [x, y, z, rx, ry, rz, sx, sy, sz, color?]
const _o = new THREE.Object3D(), _c = new THREE.Color();
function inst(geo, m, list, shadow = true){
  const im = new THREE.InstancedMesh(geo, m, list.length);
  list.forEach((p, i) => {
    _o.position.set(p[0], p[1], p[2]); _o.rotation.set(p[3] || 0, p[4] || 0, p[5] || 0);
    const s = p[6] || 1; _o.scale.set(s, p[7] || s, p[8] || s); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix);
    if(p[9] !== undefined) im.setColorAt(i, _c.set(p[9]));
  });
  im.castShadow = shadow; im.receiveShadow = true; return im;
}
// a laurel wreath (open at the bottom, tied with a ribbon) as one instanced mesh of leaves
const leafGeo = new THREE.OctahedronGeometry(1, 0);
function laurel(r, m, tie){
  const w = new THREE.Group(), leaves = [];
  [-1, 1].forEach(s => { for(let i = 0; i < 9; i++){
    const f = 0.42 + i*0.29, x = s*Math.sin(f)*r, y = -Math.cos(f)*r, out = i % 2 ? 1.18 : 0.84;
    leaves.push([x*out, y*out, 0, 0, 0, s*(f - Math.PI/2 + (i % 2 ? 0.45 : -0.45)), r*0.13, r*0.32, r*0.06]);
  }});
  w.add(inst(leafGeo, m, leaves, false));
  if(tie) w.add(fx(box(r*0.34, r*0.22, r*0.12), tie, 0, -r*0.98, 0.02));
  return w;
}
// soft additive glow card (no new lights)
let haloTex;
function halo(color, size){
  if(!haloTex){ const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex, color, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false}));
  s.scale.set(size, size, 1); s.raycast = () => {}; return s;
}

export default function build(){
  const g = new THREE.Group(), talks = DATA.talks || [], works = DATA.workshops || [], honours = DATA.achievements || [];
  const stoneM = mat(0xb7ad95), stoneD = mat(0x9a8f78), stoneL = mat(0xd8cfb8), woodM = mat(0x6b4a30);
  const gold = mat(0xd8a640, {metalness:0.6, roughness:0.35, emissive:0x5a3a00, emissiveIntensity:0.5});

  /* ---------- chalkboard layout (measured once; fonts are loaded before rooms are built) ---------- */
  const CW = 440, GAP = 44, PX = 36, TOP = 104, BH = 540, BOT = 20, AV = BH - TOP - BOT, TLH = 23, OLH = 19, HDR = 34, EG = 11;
  const groups = [];
  talks.forEach(t => { const y = yearOf(t); let gr = groups.find(o => o.y === y); if(!gr) groups.push(gr = {y, list:[]}); gr.list.push(t); });
  groups.sort((a, b) => (b.y || 0) - (a.y || 0));   // newest first, undated last
  const mctx = document.createElement('canvas').getContext('2d'), cols = [[]];
  let cy = 0;
  groups.forEach(gr => gr.list.forEach((t, i) => {
    mctx.font = `600 19px ${FB}`; const tl = wrap(mctx, t.title, CW);
    mctx.font = `400 15.5px ${FB}`; const ol = t.org ? wrap(mctx, t.org, CW) : [];
    const h = tl.length*TLH + ol.length*OLH + EG;
    if(cy && cy + h + (i ? 0 : HDR) > AV){ cols.push([]); cy = 0; }
    const col = cols[cols.length - 1];
    if(!i || !cy){ col.push({head:gr.y || 'Also', cont:!!i, y:cy}); cy += HDR; }
    col.push({tl, ol, t, y:cy}); cy += h;
  }));
  // the board shows VC columns at a time and pages to whichever column is focused → fixed width, the camera never backs into the seats
  const VC = 2, pages = Math.ceil(cols.length/VC), vis = Math.min(VC, cols.length);
  const BWpx = vis*CW + (vis - 1)*GAP + 2*PX, bw = BWpx/100, bh = BH/100, half = bw/2;
  const spanOf = list => { const ys = list.map(t => +yearOf(t)).filter(Boolean), lo = Math.min(...ys), hi = Math.max(...ys); return !ys.length ? '' : lo === hi ? `${lo}` : `${lo}–${hi}`; };
  const span = spanOf(talks);

  /* ---------- the place: orchestra, stage, colonnade, banners, seating ---------- */
  const SH = 0.6, SZ = -5.8, SD = 3.6, stageHalf = Math.max(8, half + 2.9), BZ = SZ - 0.35, BY = SH + 0.45 + bh/2;
  g.add(mesh(new THREE.CylinderGeometry(13, 13.3, 0.4, 40), mat(0x6a604f), 0, -0.2, -1));
  g.add(mesh(cyl(4.8, 4.8, 0.05, 48), mat(0x8a7f68), 0, 0.025, 0.9));
  const inlay = mesh(new THREE.TorusGeometry(4.8, 0.07, 4, 72), stoneL, 0, 0.05, 0.9); inlay.rotation.x = Math.PI/2; g.add(inlay);
  g.add(mesh(box(stageHalf*2, SH, SD), stoneD, 0, SH/2, SZ));
  g.add(mesh(box(stageHalf*2 + 0.3, 0.1, SD + 0.2), stoneL, 0, SH + 0.05, SZ));
  g.add(mesh(box(6, SH/2, 0.7), stoneD, 0, SH/4, SZ + SD/2 + 0.35));
  const CZ = SZ - SD/2 + 0.5, CH = 6.6;
  for(let x = -Math.floor(stageHalf - 0.6); x <= stageHalf - 0.6; x += 2){
    g.add(mesh(cyl(0.3, 0.34, CH, 10), stoneL, x, SH + CH/2, CZ));
    g.add(mesh(box(0.8, 0.22, 0.8), stoneM, x, SH + 0.11, CZ));
  }
  const ET = SH + CH;
  g.add(mesh(box(stageHalf*2 - 0.4, 0.55, 1.0), stoneM, 0, ET + 0.27, CZ));
  g.add(mesh(box(stageHalf*2, 0.18, 1.2), stoneL, 0, ET + 0.62, CZ));
  const ped = mesh(new THREE.CylinderGeometry(1, 1, 1.1, 3).rotateX(-Math.PI/2), stoneM, 0, ET + 0.71 + 0.45, CZ);   // pediment: triangular prism
  ped.scale.set(stageHalf/0.866, 0.9, 1); g.add(ped);

  // banners hanging from the entablature, flanking the board: counts drawn from DATA
  const bannerSpec = [[talks.length, talks.length === 1 ? 'Talk' : 'Talks', span, '#7a2430'], [honours.length, honours.length === 1 ? 'Honour' : 'Honours', spanOf(honours), '#24406e']];
  const banners = bannerSpec.map(([num, word, sub, bg], k) => {
    const s = k ? 1 : -1, b = panel(1.5, 3.6, (ctx, W, H) => {
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(W - 6, 0); ctx.lineTo(W - 6, H - 8); ctx.lineTo(W/2, H - 46); ctx.lineTo(6, H - 8); ctx.closePath();
      ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#d8b46a'; ctx.stroke();
      ctx.fillStyle = '#d8b46a'; ctx.fillRect(6, 0, W - 12, 14);
      ctx.textAlign = 'center';
      ctx.font = `400 64px ${FD}`; ctx.fillStyle = '#f6e3b0'; ctx.fillText(String(num), W/2, 52);
      ctx.font = `700 15px ${FM}`; ctx.fillStyle = '#f6e3b0'; ctx.fillText(word.toUpperCase(), W/2, 132);
      ctx.fillStyle = 'rgba(246,227,176,.5)'; ctx.fillRect(W/2 - 22, 162, 44, 2);
      ctx.font = `600 13px ${FM}`; ctx.fillStyle = 'rgba(246,227,176,.8)'; ctx.fillText(sub, W/2, 178);
      ctx.textAlign = 'left';
    });
    const pivot = new THREE.Group(); pivot.position.set(s*(half + 1.55), ET - 0.05, CZ + 0.55); b.position.y = -1.8; pivot.add(b); g.add(pivot);
    pivot.add(mesh(cyl(0.04, 0.04, 1.8, 6), gold, 0, 0, 0).rotateZ(Math.PI/2));
    return pivot;
  });

  // seating: stepped tiers revolved around the orchestra, rising on both sides (one mesh per side)
  const prof = [new THREE.Vector2(9.6, 0)];
  for(let t = 0; t < 6; t++) prof.push(new THREE.Vector2(9.6 + t*0.95, (t + 1)*0.5), new THREE.Vector2(9.6 + (t + 1)*0.95, (t + 1)*0.5));
  prof.push(new THREE.Vector2(9.6 + 6*0.95, 0));
  const seatM = mat(0xc4b99f, {side:THREE.DoubleSide});
  [[0.9, 1.45], [Math.PI*2 - 2.35, 1.45]].forEach(([st, len]) => { const m = mesh(new THREE.LatheGeometry(prof, 18, st, len), seatM, 0, 0, -1); g.add(m); });
  // a few cushions so the stands read as seats from afar
  const cush = [mat(0x7a2430), mat(0x24406e), mat(0x8a6a2a)];
  for(let t = 0; t < 6; t++) for(let k = 0; k < 7; k++) [-1, 1].forEach(s => {
    if((t*7 + k + (s > 0 ? 3 : 0)) % 3) return;
    const a = 0.98 + k*0.19, r = 9.6 + t*0.95 + 0.5;
    g.add(mesh(box(0.55, 0.1, 0.4), cush[(t + k) % 3], s*Math.sin(a)*r, (t + 1)*0.5 + 0.05, Math.cos(a)*r - 1).rotateY(s*a));
  });

  /* ---------- set dressing: stage wall, capitals, garlands, frieze, paving, aisles, parapet, braziers ---------- */
  const colX = []; for(let x = -Math.floor(stageHalf - 0.6); x <= stageHalf - 0.6; x += 2) colX.push(x);
  const jointM = mat(0x7d725d), leafM = mat(0x4f7a3a), wallM = mat(0x958a73), whiteM = mat(0xffffff);
  // scaenae frons: a wall behind the colonnade with pilasters and string courses (only its top and flanks show around the board)
  g.add(mesh(box(stageHalf*2 + 0.4, ET + 0.5, 0.4), wallM, 0, (ET + 0.5)/2, CZ - 0.75));
  g.add(inst(box(0.55, ET - SH, 0.14), stoneD, colX.slice(1).map(x => [x - 1, SH + (ET - SH)/2, CZ - 0.5])));
  g.add(inst(box(stageHalf*2 + 0.4, 0.14, 0.22), stoneL, [[0, SH + 2.6, CZ - 0.48], [0, SH + 5.0, CZ - 0.48]]));
  // column capitals (abacus + echinus), base tori and the dentil course under the cornice
  g.add(inst(box(0.86, 0.16, 0.86), stoneL, colX.map(x => [x, ET - 0.08, CZ])));
  g.add(inst(cyl(0.44, 0.31, 0.24, 10), stoneL, colX.map(x => [x, ET - 0.28, CZ])));
  g.add(inst(new THREE.TorusGeometry(0.34, 0.06, 4, 12), stoneL, colX.map(x => [x, SH + 0.27, CZ, Math.PI/2])));
  const dent = []; for(let x = -stageHalf + 0.35; x < stageHalf - 0.2; x += 0.4) dent.push([x, ET + 0.47, CZ + 0.55]);
  g.add(inst(box(0.18, 0.12, 0.12), stoneL, dent, false));
  // laurel garlands swagged between the columns above the board, gold rosettes where they're pinned
  const swag = colX.slice(1).map(x => x - 1).filter(x => Math.abs(x) < half);
  g.add(inst(new THREE.TorusGeometry(0.78, 0.09, 4, 12, Math.PI), leafM, swag.map(x => [x, ET - 0.12, CZ + 0.62, 0, 0, Math.PI, 1, 0.5, 1]), false));
  g.add(inst(cyl(0.11, 0.11, 0.06, 8), gold, [...new Set(swag.flatMap(x => [x - 0.8, x + 0.8]))].map(x => [x, ET - 0.12, CZ + 0.66, Math.PI/2]), false));
  // gold laurel in the pediment, with a star that slowly glints
  const crest = laurel(0.42, gold); crest.position.set(0, ET + 1.08, CZ + 0.6); g.add(crest);
  const starM = new THREE.MeshStandardMaterial({color:0xffe08a, emissive:0xffd27a, emissiveIntensity:1.2, flatShading:true});
  const star = fx(new THREE.OctahedronGeometry(0.13), starM, 0, ET + 1.1, CZ + 0.62); star.scale.set(1, 1.4, 0.5); g.add(star);
  // stage: slab joints on the deck, relief panels on the front, a second step
  const deck = [], SF = SZ + SD/2;
  for(let k = 1; k < 4; k++) deck.push([0, SH + 0.105, SZ - SD/2 + k*SD/4, 0, 0, 0, 1, 1, 1]);
  for(let k = 0; k < 4; k++) for(let x = -stageHalf + 1.1 + (k % 2)*0.8; x < stageHalf; x += 1.6) deck.push([x, SH + 0.105, SZ - SD/2 + (k + 0.5)*SD/4, 0, Math.PI/2, 0, SD/4/(stageHalf*2), 1, 1]);
  g.add(inst(box(stageHalf*2, 0.012, 0.035), stoneD, deck, false));
  const relief = []; for(let x = 3.75; x < stageHalf - 0.4; x += 1.3) relief.push([x, SH*0.5, SF + 0.03], [-x, SH*0.5, SF + 0.03]);
  g.add(inst(box(1.0, 0.3, 0.07), stoneL, relief, false));
  g.add(inst(new THREE.TorusGeometry(0.09, 0.025, 4, 8), gold, relief.map(p => [p[0], p[1], p[2] + 0.05]), false));
  g.add(mesh(box(6.8, SH/4, 0.5), stoneL, 0, SH/8, SF + 0.95));
  // orchestra: flagstone joints, a drain channel at the foot of the stands, a tiled ring inside the inlay
  const flags = [];
  for(let k = 0; k < 40; k++){ const a = k/40*Math.PI*2, r = 8.15; if(Math.cos(a)*r - 1 < SF + 0.3 && Math.abs(Math.sin(a)*r) < stageHalf) continue; flags.push([Math.sin(a)*r, 0.006, Math.cos(a)*r - 1, 0, a]); }
  g.add(inst(box(0.05, 0.012, 2.5), jointM, flags, false));
  const gut = mesh(new THREE.TorusGeometry(9.45, 0.12, 3, 64), mat(0x4a4236), 0, 0.0, -1); gut.rotation.x = Math.PI/2; gut.scale.z = 0.4; g.add(gut);
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.85, 6.95, 64), jointM); ring.rotation.x = -Math.PI/2; ring.position.set(0, 0.007, -1); g.add(ring);
  const tiles = []; for(let k = 0; k < 36; k++){ const a = k/36*Math.PI*2; tiles.push([Math.sin(a)*4.45, 0.055, Math.cos(a)*4.45 + 0.9, 0, a, 0, 1, 1, 1, [0x8a4a3a, 0xc9bc9c, 0x5a6a7a, 0xc9bc9c][k % 4]]); }
  g.add(inst(box(0.74, 0.012, 0.16), whiteM, tiles, false));
  // aisle stairs: half-steps up each stand, and a parapet with coping along the top tier
  const steps = [], wallB = [], cope = [], TOPR = 9.6 + 6*0.95;
  [-1, 1].forEach(s => {
    [1.265, 1.835].forEach(a => { for(let t = 0; t < 6; t++){ const r = 9.6 + t*0.95 - 0.24; steps.push([s*Math.sin(a)*r, t*0.5 + 0.125, Math.cos(a)*r - 1, 0, s*a]); } });
    for(let k = 0; k < 16; k++){ const a = 0.9 + (k + 0.5)*1.45/16, r = TOPR - 0.17; wallB.push([s*Math.sin(a)*r, 3.35, Math.cos(a)*r - 1, 0, s*a]); cope.push([s*Math.sin(a)*r, 3.74, Math.cos(a)*r - 1, 0, s*a]); }
  });
  g.add(inst(box(0.9, 0.25, 0.48), stoneL, steps));
  g.add(inst(box(1.4, 0.7, 0.32), stoneD, wallB));
  g.add(inst(box(1.46, 0.1, 0.46), stoneL, cope, false));
  // notebooks and handouts left on the benches (deterministic scatter, clear of the aisles)
  const left = [];
  for(let i = 0; i < 16; i++){
    const s = i % 2 ? 1 : -1, t = Math.floor(((i*0.618) % 1)*6), a = 1.0 + ((i*0.377) % 1)*1.1; if(Math.abs(a - 1.265) < 0.08 || Math.abs(a - 1.835) < 0.08) continue;
    const r = 9.6 + t*0.95 + 0.3 + ((i*0.29) % 1)*0.3;
    left.push([s*Math.sin(a)*r, (t + 1)*0.5 + 0.03, Math.cos(a)*r - 1, 0, s*a + (i % 3 - 1)*0.4, 0, 1, 1, 1, [0xefe6cf, 0x2f6a8a, 0xa8382a, 0xd8a640][i % 4]]);
  }
  g.add(inst(box(0.36, 0.06, 0.26), whiteM, left, false));
  // braziers on the parapet: bronze bowls on short stands, flickering flames + soft halos (light without lights)
  const brz = [[-1, 1.05], [1, 1.05]].map(([s, a]) => [s*Math.sin(a)*(TOPR - 0.17), 3.79, Math.cos(a)*(TOPR - 0.17) - 1]);
  const bronze = mat(0x6a4a2a, {metalness:0.5, roughness:0.5});
  g.add(inst(cyl(0.08, 0.18, 0.7, 6), bronze, brz.map(p => [p[0], p[1] + 0.35, p[2]])));
  g.add(inst(cyl(0.42, 0.22, 0.3, 8), bronze, brz.map(p => [p[0], p[1] + 0.82, p[2]])));
  const flameO = glow(0xff8a2a, 1.8), flameI = glow(0xffe08a, 2.4), flames = brz.map(p => {
    const f = new THREE.Group(); f.position.set(p[0], p[1] + 0.97, p[2]); g.add(f);
    f.add(fx(new THREE.ConeGeometry(0.3, 0.75, 6), flameO, 0, 0.37, 0), fx(new THREE.ConeGeometry(0.16, 0.5, 5), flameI, 0, 0.27, 0.02));
    const h = halo(0xffa040, 2.6); h.position.set(p[0], p[1] + 1.35, p[2]); g.add(h); f.userData.h = h;
    f.children.forEach(c => { c.raycast = () => {}; }); return f;
  });

  /* ---------- chalkboard ---------- */
  const chalk = new THREE.Group(); g.add(chalk);
  chalk.add(mesh(box(bw + 0.4, bh + 0.4, 0.2), mat(0x5a3a26), 0, BY, BZ - 0.12));
  const sub = [`${talks.length} session${talks.length === 1 ? '' : 's'}`, span].filter(Boolean).join(' · ');
  const board = panel(bw, bh, (ctx, W, H, st) => {
    ctx.fillStyle = '#21392e'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.06; ctx.fillStyle = '#ffffff'; for(let k=0;k<30;k++){ ctx.beginPath(); ctx.ellipse((k*137)%W, (k*61)%H, 60, 14, (k%5)*0.6, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.font = `400 36px ${FD}`; ctx.fillStyle = '#eef2ea'; ctx.fillText('Talks & Sessions', PX, 28);
    const pg = st.page || 0;
    ctx.textAlign = 'right'; ctx.font = `600 15px ${FM}`; ctx.fillStyle = '#b9c9bd'; ctx.fillText(sub.toUpperCase(), W - PX, pages > 1 ? 24 : 44);
    if(pages > 1){ ctx.font = `700 14px ${FM}`; ctx.fillStyle = '#f3d58a'; ctx.fillText(`PAGE ${pg + 1} / ${pages}`, W - PX, 52); }
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(238,242,234,.35)'; ctx.fillRect(PX, 84, W - 2*PX, 1.5);
    for(let sl = 0; sl < vis; sl++){
      const c = pg*VC + sl, col = cols[c]; if(!col) break;
      const x = PX + sl*(CW + GAP);
      if(st.col === c){ ctx.save(); ctx.shadowColor = 'rgba(240,181,74,.8)'; ctx.shadowBlur = 10; ctx.lineWidth = 3.5; ctx.strokeStyle = COL.ember; rr(ctx, x - 16, TOP - 14, CW + 32, H - TOP + 2, 10); ctx.stroke(); ctx.restore(); }
      col.forEach(b => {
        const y = TOP + b.y;
        if(b.head !== undefined){
          eyebrow(ctx, b.head + (b.cont ? ' · cont.' : ''), x, y + 2, '#f3d58a', 16);
          const tw = ctx.measureText(String(b.head + (b.cont ? ' · cont.' : '')).toUpperCase()).width;
          ctx.fillStyle = 'rgba(243,213,138,.3)'; ctx.fillRect(x + tw + 12, y + 11, CW - tw - 12, 1.5); return;
        }
        ctx.font = `600 19px ${FB}`; ctx.fillStyle = '#eef2ea'; b.tl.forEach((l, i) => ctx.fillText(l, x, y + i*TLH));
        ctx.font = `400 15.5px ${FB}`; ctx.fillStyle = '#b9c9bd'; b.ol.forEach((l, i) => ctx.fillText(l, x, y + 1 + b.tl.length*TLH + i*OLH));
      });
    }
  });
  board.position.set(0, BY, BZ); chalk.add(board);
  chalk.add(mesh(box(bw, 0.08, 0.25), mat(0x5a3a26), 0, BY - bh/2 - 0.2, BZ + 0.1));
  // on the tray: chalk sticks and a felt eraser
  const TY = BY - bh/2 - 0.16 + 0.025;
  chalk.add(inst(cyl(0.025, 0.025, 0.24, 5), whiteM, [-half + 1.9, -half + 2.2, -1.1, 0.4, half - 2.6, half - 2.25, half - 1.4].map((x, i) =>
    [x, TY, BZ + 0.12 + (i % 2)*0.06, 0, (i % 3)*0.3, Math.PI/2, 1, 1, 1, [0xf4f1ea, 0xf3d58a, 0xf4f1ea, 0xe8a0a0, 0xf4f1ea, 0xa8d0e8, 0xf4f1ea][i]]), false));
  chalk.add(mesh(box(0.42, 0.06, 0.15), mat(0x3a3a3a), -half + 1.05, TY + 0.005, BZ + 0.13), mesh(box(0.42, 0.05, 0.15), woodM, -half + 1.05, TY + 0.06, BZ + 0.13));
  const slotX = sl => -half + (PX + sl*(CW + GAP) + CW/2)/100;
  const hits = Array.from({length:vis}, (_, sl) => { const h = hitPlane(CW/100 + 0.3, bh); h.position.set(slotX(sl), BY, BZ + 0.02); chalk.add(h); return h; });
  const turnTo = pg => hits.forEach((h, sl) => { h.userData.item = chalkItems[pg*VC + sl] || null; });
  const chalkItems = cols.map((col, c) => {
    const list = col.filter(b => b.t).map(b => [b.t.title, b.t.org, yearOf(b.t)].filter(Boolean).join(', '));
    return item({obj:chalk, hits:[], panels:[board], view:view(new V3(slotX(c % VC), BY, BZ), CW/100 + 0.8, bh + 0.6, new V3(0, 0.36, 1).normalize()),   // from above: clears the trophies in front
      label:`Talks and sessions${cols.length > 1 ? `, board column ${c + 1} of ${cols.length}` : ''}: ${list.join('; ') || 'none yet'}`,
      setFocus:on => {
        const st = board.userData.panel.state, pg = Math.floor(c/VC);
        if(on){ setPanel(board, {col:c, page:pg}); turnTo(pg); } else if(st.col === c) setPanel(board, {col:-1});
      }});
  });
  turnTo(0);

  /* ---------- workshop easels: one per wing; each wing pages through its half of the workshops as focus moves ---------- */
  const EW = 3.6, EH = 4.8, EY = 0.65 + EH/2, nl = Math.ceil(works.length/2);
  const wingOf = k => k < nl ? 0 : 1, wings = [];
  [[-1, works.slice(0, nl)], [1, works.slice(nl)]].forEach(([side, list]) => {
    if(!list.length) return;
    const ry = -side*0.26, grp = new THREE.Group(), wing = {grp, side, cur:side < 0 ? 0 : nl};
    grp.position.set(side*(half*0.72 + 2.3), 0, -2.0); grp.rotation.y = ry; g.add(grp);
    [-1.35, 1.35].forEach(x => { const l = mesh(box(0.1, EH + 0.9, 0.1), woodM, x, (EH + 0.9)/2, 0); l.rotation.z = -x*0.05; grp.add(l); });
    const bl = mesh(box(0.1, EH + 0.6, 0.1), woodM, 0, (EH + 0.6)/2 - 0.1, -0.7); bl.rotation.x = 0.22; grp.add(bl);
    grp.add(mesh(box(EW - 0.2, 0.12, 0.34), woodM, 0, 0.6, 0.12));
    wing.p = panel(EW, EH, (ctx, W, H, st) => {
      const k = wing.cur, w = works[k];
      card(ctx, W, H, st, {bg:'#f4f1ea', border:'rgba(40,40,40,.3)', r:8});
      const x = 26, mw = W - 52; let y = 26;
      eyebrow(ctx, `Workshop ${pad2(k + 1)}${works.length > 1 ? ' / ' + pad2(works.length) : ''}`, x, y, '#2f6a8a', 14);
      if(list.length > 1) list.forEach((_, i) => { const on = (side < 0 ? i : nl + i) === k; ctx.beginPath(); ctx.arc(W - x - (list.length - 1 - i)*14 - 4, y + 7, on ? 4.5 : 3, 0, 6.3); ctx.fillStyle = on ? '#2f6a8a' : 'rgba(47,106,138,.35)'; ctx.fill(); });
      y += 32;
      let fs = 32; do { ctx.font = `400 ${fs}px ${FD}`; } while(wrap(ctx, w.title, mw).length > 3 && --fs > 20);
      const longest = w.title.split(/\s+/).reduce((a, b) => b.length > a.length ? b : a, '');
      fitFont(ctx, longest, mw, fs, 400, FD, 16); fs = parseFloat(ctx.font.match(/([\d.]+)px/)[1]);
      const tl = balanced(ctx, w.title, mw); ctx.fillStyle = '#1f2328'; tl.forEach((l, i) => ctx.fillText(l, x, y + i*fs*1.16)); y += tl.length*fs*1.16 + 12;
      const topics = w.topics || [];
      ctx.save(); ctx.globalAlpha = 0; const ph = topics.length ? pills(ctx, topics, x, 0, mw, '#2f6a8a', 12.5) + 14 : 0; ctx.restore();
      const linkY = H - 40, lines = Math.max(1, Math.floor((linkY - 12 - ph - y)/22));
      ctx.font = `400 16px ${FB}`; ctx.fillStyle = '#3b4048'; y = para(ctx, w.description || '', x, y, mw, 22, lines) + 14;
      if(topics.length) pills(ctx, topics, x, y, mw, '#2f6a8a', 12.5);
      if(w.link){
        ctx.fillStyle = 'rgba(40,40,40,.15)'; ctx.fillRect(x, linkY - 10, mw, 1.5);
        const lt = `${st.focus ? (touch ? 'TAP · ' : '⏎ ') : ''}OPEN REPO ↗ ${shortUrl(w.link)}`;
        fitFont(ctx, lt, mw, 13, 700, FM, 10); ctx.fillStyle = st.focus ? '#b4610f' : '#6a707a'; ctx.fillText(clip(ctx, lt, mw), x, linkY);
      }
    });
    wing.p.position.set(0, EY, 0.2); wing.p.rotation.x = -0.04; grp.add(wing.p);
    wing.view = view(new V3(0, EY, 0.2).applyAxisAngle(new V3(0, 1, 0), ry).add(grp.position), EW + 0.5, EH + 0.7, faceY(ry));
    wings[side < 0 ? 0 : 1] = wing;
  });
  const easels = works.map((w, k) => {
    const wing = wings[wingOf(k)];
    const it = item({obj:wing.grp, hits:[], panels:[wing.p], view:wing.view,
      label:`Workshop ${k + 1} of ${works.length}: ${w.title}. ${w.description || ''}${w.topics && w.topics.length ? ' Topics: ' + w.topics.join(', ') + '.' : ''}${w.link ? ' Press Enter to open the repository.' : ''}`,
      activate:w.link ? () => openLink(w.link) : null, side:wing.side, x:wing.side*100 + k,
      setFocus:on => { if(on && wing.cur !== k){ wing.cur = k; bindWing(wing); } if(wing.cur === k) setPanel(wing.p, {focus:on}); }});
    return it;
  });
  // clicks on a wing go to whichever workshop it is showing
  const bindWing = wing => wing.grp.traverse(m => { m.userData.item = easels[wing.cur]; });
  wings.forEach(w => w && bindWing(w));

  /* ---------- recognition: spotlit pedestals with trophy or scroll + brass plaque ---------- */
  const beamTex = (() => { const c = document.createElement('canvas'); c.width = 2; c.height = 64; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, '#000'); gr.addColorStop(0.35, '#4a3c20'); gr.addColorStop(1, '#8a7038'); x.fillStyle = gr; x.fillRect(0, 0, 2, 64); return new THREE.CanvasTexture(c); })();
  const beamM = new THREE.MeshBasicMaterial({map:beamTex, transparent:true, opacity:0.28, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
  // up to AC pedestals; with more honours they page (like the board) to whichever one is focused
  const PW = 2.8, PH = 1.6, AS = 3.5, AZ = 1.1, AC = 3, spin = [], NA = honours.length, nSlots = Math.min(AC, NA);
  const isScroll = a => /letter|certif|scroll|diploma/i.test(a.title);   // ponytail: keyword guess for the prop; add a `kind` field to data.json if it ever guesses wrong
  const slots = Array.from({length:nSlots}, (_, sl) => {
    const x = (sl - (nSlots - 1)/2)*AS, grp = new THREE.Group(), slot = {grp, x, cur:sl}; grp.position.set(x, 0, AZ); g.add(grp);
    grp.add(mesh(box(PW + 0.5, 0.22, 1.7), stoneD, 0, 0.11, 0));
    grp.add(mesh(box(PW, PH, 1.2), mat(0x8a8172), 0, 0.22 + PH/2, 0));
    grp.add(mesh(box(PW + 0.12, 0.1, 1.32), glow(0xd8a640, 0.45), 0, 0.22 + PH + 0.05, 0));
    grp.add(mesh(box(PW + 0.2, 0.12, 1.3), stoneL, 0, 0.3, 0), mesh(box(PW + 0.2, 0.12, 1.28), stoneL, 0, 0.22 + PH - 0.1, 0));   // base and cap mouldings
    grp.add(inst(cyl(0.07, 0.07, PH - 0.3, 6), stoneL, [-1, 1].flatMap(sx => [-1, 1].map(sz => [sx*(PW/2 + 0.02), 0.22 + PH/2, sz*0.52])), false));   // corner colonnettes
    const top = 0.22 + PH + 0.1, scroll = new THREE.Group(), trophy = new THREE.Group(); scroll.position.y = trophy.position.y = top; grp.add(scroll, trophy);
    scroll.add(mesh(box(1.5, 0.12, 0.7), mat(0x5a3a26), 0, 0.06, 0));
    const sc = mesh(cyl(0.2, 0.2, 1.4, 14), mat(0xefe6cf), 0, 0.34, 0); sc.rotation.z = Math.PI/2; scroll.add(sc);
    [-0.72, 0.72].forEach(e => { const cap = mesh(cyl(0.23, 0.23, 0.06, 14), gold, e, 0.34, 0); cap.rotation.z = Math.PI/2; scroll.add(cap); });
    const rb = mesh(cyl(0.215, 0.215, 0.16, 14), mat(0xa8382a), 0, 0.34, 0); rb.rotation.z = Math.PI/2; scroll.add(rb);
    scroll.add(mesh(cyl(0.13, 0.13, 0.04, 12), glow(0xd8a640, 0.8), 0, 0.34, 0.22).rotateX(Math.PI/2));
    scroll.rotation.y = 0.25;
    trophy.add(mesh(box(0.7, 0.2, 0.7), mat(0x3a2a1a), 0, 0.1, 0));
    trophy.add(mesh(cyl(0.3, 0.38, 0.14, 14), gold, 0, 0.27, 0));
    trophy.add(mesh(cyl(0.07, 0.1, 0.42, 10), gold, 0, 0.55, 0));
    trophy.add(mesh(cyl(0.52, 0.2, 0.66, 16), gold, 0, 1.08, 0));
    trophy.add(mesh(new THREE.TorusGeometry(0.52, 0.04, 6, 20), gold, 0, 1.41, 0).rotateX(Math.PI/2));
    [-1, 1].forEach(h => trophy.add(mesh(new THREE.TorusGeometry(0.19, 0.045, 6, 14), gold, h*0.54, 1.1, 0)));
    trophy.add(fx(new THREE.OctahedronGeometry(0.11), glow(0xffe08a, 1.4), 0, 1.62, 0));
    spin.push(trophy); Object.assign(slot, {scroll, trophy});
    const beam = fx(new THREE.CylinderGeometry(0.3, 1.05, 3.6, 24, 1, true), beamM, 0, top + 1.8, 0); beam.raycast = () => {}; grp.add(beam);   // light, not a click target
    slot.p = panel(2.6, 1.55, (ctx, W, H, st) => {
      const a = honours[slot.cur];
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e2c27a'); gr.addColorStop(1, '#a8823e');
      rr(ctx, 4, 4, W - 8, H - 8, 9); ctx.fillStyle = gr; ctx.fill();
      if(st.focus){ ctx.save(); ctx.shadowColor = 'rgba(255,226,140,.95)'; ctx.shadowBlur = 12; ctx.lineWidth = 4.5; ctx.strokeStyle = '#fff2c8'; ctx.stroke(); ctx.restore(); }
      else { ctx.lineWidth = 2; ctx.strokeStyle = '#6b4f20'; ctx.stroke(); }
      rr(ctx, 11, 11, W - 22, H - 22, 5); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(90,58,0,.45)'; ctx.stroke();
      const x = 20, mw = W - 40;
      let fs = 17; do { ctx.font = `700 ${fs}px ${FB}`; } while(wrap(ctx, a.title, mw).length > 3 && --fs > 12);
      ctx.fillStyle = '#2a1d08'; const y = para(ctx, a.title, x, 18, mw, fs*1.2, 3) + 4, dy = H - 32;
      ctx.font = `500 13.5px ${FB}`; ctx.fillStyle = '#3a2a10'; para(ctx, a.org || '', x, y, mw, 16, Math.max(1, Math.floor((dy - 2 - y)/16)));
      if(a.date) eyebrow(ctx, '★ ' + a.date, x, dy, '#5a3a00', 11.5);
      if(NA > nSlots){ ctx.textAlign = 'right'; eyebrow(ctx, `${pad2(slot.cur + 1)} / ${pad2(NA)}`, W - x, dy, '#5a3a00', 11.5); ctx.textAlign = 'left'; }
    });
    slot.p.position.set(0, 0.22 + PH*0.5 - 0.04, 0.78); slot.p.rotation.x = -0.12; grp.add(slot.p);
    return slot;
  });
  const awards = honours.map((a, k) => {
    const slot = slots[k % AC];
    return item({obj:slot.grp, hits:[], panels:[slot.p], view:view(new V3(slot.x, 1.25, AZ + 0.6), PW + 0.9, 3.6, new V3(0, 0.3, 1).normalize()),
      label:`Recognition${NA > 1 ? ` ${k + 1} of ${NA}` : ''}: ${[a.title, a.org, a.date].filter(Boolean).join(', ')}`, x:slot.x,
      setFocus:on => { if(on) showAwards(Math.floor(k/AC)); if(slot.cur === k) setPanel(slot.p, {focus:on}); }});
  });
  // show a page of honours; a slot with nothing to show moves to layer 1 (not drawn, not clickable)
  function showAwards(pg){
    slots.forEach((slot, sl) => {
      const k = pg*AC + sl, on = k < NA;
      slot.grp.traverse(o => { o.layers.set(on ? 0 : 1); o.userData.item = on ? awards[k] : null; });
      if(!on || slot.cur === k) return;
      slot.cur = k; slot.trophy.visible = !(slot.scroll.visible = isScroll(honours[k])); setPanel(slot.p, {focus:false});
    });
  }
  slots.forEach(slot => { slot.trophy.visible = !(slot.scroll.visible = isScroll(honours[slot.cur])); });
  showAwards(0);

  // gold motes drifting up through the spotlights
  const M = 18*Math.max(1, nSlots), mPos = new Float32Array(M*3), seeds = [];
  for(let i = 0; i < M; i++){ const s = [((i*0.618) % 1 - 0.5)*Math.max(3, nSlots*AS), ((i*0.371) % 1)*5, ((i*0.233) % 1 - 0.5)*1.6, i*1.7]; seeds.push(s); mPos.set([s[0], 1.7 + s[1], AZ + s[2]], i*3); }
  const mGeo = new THREE.BufferGeometry(); mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  const motes = new THREE.Points(mGeo, new THREE.PointsMaterial({color:0xffd27a, size:0.07, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false}));
  motes.raycast = () => {}; if(honours.length) g.add(motes);

  /* ---------- the speaker's lectern, off to the side of the orchestra ---------- */
  const lect = new THREE.Group(); lect.position.set(Math.max(1, nSlots)*AS/2 + 2.1, 0, AZ + 2.5); lect.rotation.y = -0.45; g.add(lect);
  lect.add(mesh(box(0.9, 0.14, 0.75), stoneD, 0, 0.07, 0), mesh(cyl(0.16, 0.22, 1.05, 8), woodM, 0, 0.66, 0));
  const desk = new THREE.Group(); desk.position.set(0, 1.25, 0); desk.rotation.x = 0.38; lect.add(desk);
  desk.add(mesh(box(0.95, 0.08, 0.7), woodM, 0, 0, 0), mesh(box(0.95, 0.1, 0.05), gold, 0, 0.04, 0.36));
  desk.add(mesh(box(0.36, 0.03, 0.5), mat(0xefe6cf), -0.19, 0.06, 0).rotateZ(0.06), mesh(box(0.36, 0.03, 0.5), mat(0xefe6cf), 0.19, 0.06, 0).rotateZ(-0.06));
  desk.add(mesh(box(0.03, 0.01, 0.4), mat(0xa8382a), 0.05, 0.08, 0.1));   // ribbon marker
  lect.add(mesh(cyl(0.04, 0.04, 0.4, 5), gold, 0.36, 1.4, -0.3), mesh(new THREE.SphereGeometry(0.07, 6, 4), glow(0xffe08a, 1.6), 0.36, 1.62, -0.3));   // reading lamp
  const lh = halo(0xffd27a, 0.9); lh.position.set(0.36, 1.62, -0.3); lect.add(lh);
  // a potted bay laurel on each side of the orchestra mouth
  const laurelPot = [-1, 1].map(s => [s*6.7, 0, 5.7]);
  g.add(inst(cyl(0.3, 0.22, 0.42, 8), mat(0xa0583a), laurelPot.map(p => [p[0], 0.21, p[2]])));
  g.add(inst(cyl(0.33, 0.33, 0.06, 8), mat(0x7a4028), laurelPot.map(p => [p[0], 0.42, p[2]]), false));
  g.add(inst(cyl(0.04, 0.06, 0.6, 5), woodM, laurelPot.map(p => [p[0], 0.7, p[2]])));
  g.add(inst(new THREE.IcosahedronGeometry(0.42, 0), leafM, laurelPot.flatMap((p, k) => [[p[0], 1.12, p[2], 0.3, k, 0, 1, 0.9], [p[0] + 0.17, 1.42, p[2] - 0.07, 0, k + 1, 0, 0.7], [p[0] - 0.14, 1.55, p[2] + 0.1, 0.5, k, 0, 0.5]])));

  /* ---------- order: left to right as seen ---------- */
  const L = easels.filter(e => e.side < 0).sort((a, b) => a.x - b.x), R = easels.filter(e => e.side > 0).sort((a, b) => a.x - b.x);
  const paged = NA > AC, AL = awards.filter(a => paged || a.x < 0), AR = awards.filter(a => !paged && a.x >= 0);   // paged honours stay together, before the board
  const items = [...L, ...AL, ...chalkItems, ...AR, ...R];

  const frame = view(new V3(0, 2.6, -2.0), Math.max(15, bw + 5), 6.6, new V3(0, 0.42, 1).normalize());   // looks down over the trophies so they never cover the board
  // desktop: lean the camera toward the focused thing (half-way), keeping its neighbours in shot; the (fixed-width) board uses the full frame
  const soft = items.map(it => chalkItems.includes(it) ? frame
    : view(frame.c.clone().lerp(it.view.c, 0.55), 11.5, 5.4, frame.n.clone().lerp(it.view.n, 0.35).normalize()));
  const room = {group:g, items, start:items.indexOf(chalkItems[0]),
    view:narrow => narrow ? room.items[room.focus].view : soft[room.focus],
    light:{key:[0, 8, 5, 0xfff0d0, 1.5], fill:[0, 4, -3, 0xffd28a, 0.6]},
    heroSpot:new V3(-(Math.max(1, nSlots)*AS/2 + 4.1), 0.05, AZ + 1.7)};
  if(!reduce) room.update = t => {
    spin.forEach((s, k) => { s.rotation.y = t*0.5 + k; });
    banners.forEach((b, k) => { b.rotation.x = Math.sin(t*0.7 + k*2)*0.035; });
    for(let i = 0; i < M; i++){ const s = seeds[i], u = (t*0.25 + s[1]/5) % 1; mPos[i*3] = s[0] + Math.sin(t*0.8 + s[3])*0.15; mPos[i*3 + 1] = 1.7 + u*5; mPos[i*3 + 2] = AZ + s[2]; }
    mGeo.attributes.position.needsUpdate = true;
    flames.forEach((f, k) => { const q = 1 + Math.sin(t*9 + k*2.1)*0.08 + Math.sin(t*23 + k)*0.05; f.scale.set(2 - q, q*1.08, 2 - q); f.userData.h.material.opacity = 0.42 + (q - 1)*1.5; });
    starM.emissiveIntensity = 1.1 + Math.max(0, Math.sin(t*0.9))**8*1.6; star.rotation.y = t*0.6;
  };
  return room;
}
