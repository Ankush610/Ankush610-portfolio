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
  g.add(mesh(box(L, 0.3, 9.5), mat(0x5b4331), hc, -0.15, 0.6));
  for(let k=0;k<9;k++) g.add(mesh(box(L, 0.02, 0.04), mat(0x3e2c20), hc, 0.01, -3.2 + k*1.1));
  g.add(mesh(box(L, H, 0.4), mat(0x3b2b22), hc, H/2, WALLZ));
  g.add(mesh(box(L, 1.0, 0.1), mat(0x2a1d16), hc, 0.5, WALLZ + 0.25));          // wainscot
  g.add(mesh(box(L, 0.08, 0.18), mat(0x6b4a30), hc, 1.02, WALLZ + 0.28));        // chair rail
  g.add(mesh(box(L, 0.5, 0.7), mat(0x2a1d16), hc, H - 0.1, WALLZ + 0.4));        // top beam

  // lantern glass shares one room-local material so it can flicker without touching the global glow() cache
  const lampMat = new THREE.MeshStandardMaterial({color:0xffb456, emissive:0xffa040, emissiveIntensity:1.3, flatShading:true});
  const postGeo = box(0.38, H, 0.32), beamGeo = box(0.3, 0.4, 6), lampGeo = box(0.24, 0.34, 0.24), capGeo = new THREE.ConeGeometry(0.22, 0.2, 4);
  const wood = mat(0x2a1d16), iron = mat(0x3a3530);
  const posts = [hl + 0.2, ...stations.slice(1).map((s, k) => (stations[k].x + stations[k].w/2 + s.x - s.w/2)/2), hr - 0.2];
  posts.forEach((px, k) => {
    g.add(mesh(postGeo, wood, px, H/2, WALLZ + 0.36));
    g.add(mesh(beamGeo, wood, px, H - 0.25, WALLZ + 3.2));
    if(k === 0 || k === posts.length - 1) return;
    g.add(mesh(box(0.06, 0.06, 0.45), iron, px, 5.0, WALLZ + 0.65));             // sconce arm
    const lamp = mesh(lampGeo, lampMat, px, 4.78, WALLZ + 0.86); lamp.castShadow = false; g.add(lamp);
    const cap = mesh(capGeo, iron, px, 5.04, WALLZ + 0.86); cap.rotation.y = Math.PI/4; g.add(cap);
  });
  // moonlit windows at both ends of the hall
  const pane = glow(0x7d9ad6, 0.55);
  [hl + 1.7, hr - 1.8].forEach(wx => {
    g.add(mesh(box(1.7, 3.0, 0.12), wood, wx, 4.0, WALLZ + 0.22));
    const p = mesh(box(1.4, 2.7, 0.05), pane, wx, 4.0, WALLZ + 0.28); p.castShadow = false; g.add(p);
    g.add(mesh(box(0.07, 2.7, 0.08), wood, wx, 4.0, WALLZ + 0.31));
    g.add(mesh(box(1.4, 0.07, 0.08), wood, wx, 4.5, WALLZ + 0.31));
    g.add(mesh(box(1.9, 0.12, 0.3), mat(0x6b4a30), wx, 2.45, WALLZ + 0.3));
  });

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
      lampMat.emissiveIntensity = 1.25 + Math.sin(t*7.3)*0.12 + Math.sin(t*13.1)*0.08;
      const off = (t*0.45) % CH;
      chevs.forEach(c => { c.position.x = c.userData.x + off; });
    }};
  return R;
}
