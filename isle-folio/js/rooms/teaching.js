/* ---- Lyceum: the Hall of the Lyceum (talks & events, workshops, awards, extracurriculars) ----
   A long colonnaded stone hall under a timber roof. Every kind of entry in KINDS that has data gets a section: a carved
   header board on the wall and one bay per entry beneath it (a stone tablet, an easel, a pedestal or a gilt frame).
   Sections go to whichever wall is shorter, so the hall simply grows longer with the data: nothing pages or hides.
   Entering looks down the nave for a moment; then each stop turns the camera to face its exhibit. A lamp of learning
   in a gilded laurel crowns the far end. Every count comes from DATA. */
import { THREE, V3, reduce, touch, mat, mesh, box, cyl } from '../engine.js';
import { keyL } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FP, INK, RED, SEP, panel, wrap, para, clip, shortUrl, openLink, paper, rules, fleuron, caps, gilt } from '../panels.js';
import { view, item } from './kit.js';

/* The sections, in order. To show a new kind of entry: add its list to data.json and a line here.
   style: how each entry is shown · emblem: carved on its header and exhibits · board: the header's colour */
const KINDS = [
  {key:'talks',           label:'Talks & Events',   one:'Talk',      style:'tablet',   emblem:'lamp',    board:'#22325a'},
  {key:'workshops',       label:'Workshops',        one:'Workshop',  style:'easel',    emblem:'compass', board:'#24503a'},
  {key:'achievements',    label:'Awards',           one:'Award',     style:'pedestal', emblem:'laurel',  board:'#5a1f28'},
  {key:'extracurricular', label:'Extracurriculars', one:'Activity',  style:'frame',    emblem:'star',    board:'#3e2a55'},
];
// width of one bay along the wall, per style
const BAY = {tablet:1.95, easel:2.9, pedestal:2.5, frame:2.35};
const HX = 5.4, WH = 7.2, RIDGE = 9.6, GAPZ = 1.2;   // nave half width, wall height, ridge, gap between sections (a pilaster stands in it)

const pad2 = n => String(n).padStart(2, '0');
const yearOf = d => (String(d || '').match(/\d{4}/) || [''])[0];
// one entry, whatever its list calls the fields
const norm = e => ({title:e.title || e.name || '', org:e.org || e.role || e.company || '', date:e.date || e.period || '',
  description:e.description || '', topics:e.topics || e.skills || [], link:e.link || e.url || ''});
// narrowest wrap width that keeps the same line count → no one-word orphan lines
function balanced(ctx, text, maxW){
  const n = wrap(ctx, text, maxW).length; let w = maxW;
  while(w > 60 && wrap(ctx, text, w - 8).length === n) w -= 8;
  return wrap(ctx, text, w);
}
// largest size (hi → lo) at which `text` wraps into ≤ maxLines and its longest word fits
function fitLines(ctx, text, mw, maxLines, hi, lo, weight, fam){
  const longest = String(text).split(/\s+/).reduce((a, b) => b.length > a.length ? b : a, '');
  let fs = hi;
  for(; fs > lo; fs--){ ctx.font = `${weight} ${fs}px ${fam}`; if(ctx.measureText(longest).width <= mw && wrap(ctx, text, mw).length <= maxLines) break; }
  ctx.font = `${weight} ${fs}px ${fam}`; return fs;
}
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
  im.castShadow = shadow; im.receiveShadow = true; im.raycast = () => {}; return im;
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

/* ---- canvas: carved emblems, marble, cut letters ---- */
function emblem(ctx, kind, cx, cy, s, fill){
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = ctx.strokeStyle = fill; ctx.lineWidth = Math.max(1.2, s*0.07); ctx.lineCap = 'round';
  if(kind === 'lamp'){   // an oil lamp with its flame: the lamp of learning
    ctx.beginPath(); ctx.ellipse(0, s*0.18, s*0.42, s*0.16, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s*0.3, s*0.1); ctx.lineTo(s*0.6, s*0.02); ctx.lineTo(s*0.32, s*0.26); ctx.fill();
    ctx.beginPath(); ctx.arc(-s*0.46, s*0.16, s*0.1, 0, 7); ctx.stroke();
    ctx.fillRect(-s*0.12, s*0.32, s*0.24, s*0.1);
    ctx.beginPath(); ctx.moveTo(s*0.56, s*0.02); ctx.quadraticCurveTo(s*0.4, -s*0.2, s*0.56, -s*0.5); ctx.quadraticCurveTo(s*0.72, -s*0.2, s*0.56, s*0.02); ctx.fill();
  } else if(kind === 'compass'){   // dividers over a square: the craft of teaching it
    ctx.beginPath(); ctx.moveTo(-s*0.32, s*0.45); ctx.lineTo(0, -s*0.38); ctx.lineTo(s*0.32, s*0.45); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s*0.42, s*0.08, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -s*0.38, s*0.55, Math.PI*0.36, Math.PI*0.64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s*0.5, s*0.12); ctx.lineTo(s*0.5, s*0.12); ctx.stroke();
  } else if(kind === 'laurel'){   // a wreath
    [-1, 1].forEach(sd => { for(let i = 0; i < 7; i++){ const f = 0.5 + i*0.36, x = sd*Math.sin(f)*s*0.42, y = -Math.cos(f)*s*0.42;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sd*(f - Math.PI/2) + sd*0.5); ctx.beginPath(); ctx.ellipse(0, 0, s*0.06, s*0.14, 0, 0, 7); ctx.fill(); ctx.restore(); } });
    ctx.beginPath(); ctx.arc(0, s*0.4, s*0.06, 0, 7); ctx.fill();
  } else {   // a five-point star
    ctx.beginPath(); for(let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, r = k % 2 ? s*0.2 : s*0.48; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function marble(ctx, W, H, k){
  ctx.fillStyle = '#ebe5d8'; ctx.fillRect(0, 0, W, H);
  const e = ctx.createRadialGradient(W/2, H*0.4, Math.min(W, H)*0.2, W/2, H/2, Math.max(W, H)*0.75);
  e.addColorStop(0, 'rgba(120,105,80,0)'); e.addColorStop(1, 'rgba(120,105,80,.22)'); ctx.fillStyle = e; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(110,100,85,.16)'; ctx.lineWidth = 1;
  for(let i = 0; i < 5; i++){ const h = n => Math.abs(Math.sin((i + 1)*(k + 3)*n)*43758.5453 % 1); ctx.beginPath(); ctx.moveTo(h(1.3)*W, 0); ctx.bezierCurveTo(h(2.1)*W, H*0.3, h(3.7)*W, H*0.6, h(4.9)*W, H); ctx.stroke(); }
}
// letters cut into stone: a pale lip under a dark cut; gilded when the exhibit has focus
// focused letters are a deep, burnished gilt: bright gold leaf on cream marble can't be read
const cut = (ctx, text, x, y, on, size, dark = '#4a4236') => { ctx.fillStyle = 'rgba(255,250,235,.7)'; ctx.fillText(text, x, y + 1.1); ctx.fillStyle = on ? deepGilt(ctx, y, y + size) : dark; ctx.fillText(text, x, y); };
const deepGilt = (ctx, y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#9a6a1c'); g.addColorStop(1, '#5c3a0c'); return g; };

export default function build(){
  const g = new THREE.Group(), items = [];
  // slate plaster walls behind light stone trim: the cream exhibits and the candlelight need something cool to stand against
  const wallM = mat(0x56606c), stoneD = mat(0xb5aa92), stoneL = mat(0xe6dfcc), woodM = mat(0x6b4a30), woodD = mat(0x4a3222), iron = mat(0x2a2522);
  const gold = mat(0xd8a640, {metalness:0.6, roughness:0.35, emissive:0x5a3a00, emissiveIntensity:0.5});
  const lampM = new THREE.MeshStandardMaterial({color:0xffb860, emissive:0xff9a38, emissiveIntensity:1.8, flatShading:true});

  /* ---------- layout: sections from DATA, each placed on the shorter wall, bays along it ---------- */
  const sections = KINDS.map(k => ({...k, list:(DATA[k.key] || []).map(norm)})).filter(s => s.list.length);
  const wallLen = [0, 0], Z0 = -0.6;                                  // [left, right] wall used so far, from the entrance end
  sections.forEach(s => {
    s.len = s.list.length*BAY[s.style] + 0.6;
    s.side = wallLen[0] <= wallLen[1] ? 0 : 1;
    s.z0 = Z0 - wallLen[s.side]; wallLen[s.side] += s.len + GAPZ;
  });
  const WL = Math.max(8, ...wallLen) - GAPZ, ZB = Z0 - WL - 5.2, FZ = 7.5, NL = FZ - ZB, NC = (FZ + ZB)/2;   // wall run, back wall, front wall, hall length, its centre
  const sideX = s => s ? 1 : -1;

  /* ---------- the hall: floor, walls, dado, coursing, pilasters, cornice ---------- */
  g.add(mesh(box(2*HX + 0.8, 0.4, NL + 0.4), mat(0xb8af9c), 0, -0.2, NC));
  const flags = [], FT = [0xe2dbca, 0xd8d0be, 0xe8e2d3, 0xd0c8b5, 0xdcd5c4];
  for(let z = FZ - 0.6, r = 0; z > ZB; z -= 1.2, r++) for(let x = -HX + 0.6 + (r % 2)*0.3; x < HX - 0.3; x += 1.2) flags.push([x, 0.012, z, 0, 0, 0, 1.17, 0.024, 1.17, FT[((r*3 + Math.round(x*7)) % 5 + 5) % 5]]);
  g.add(inst(box(1, 1, 1), mat(0xffffff, {roughness:0.6}), flags, false));
  [-1, 1].forEach(s => g.add(mesh(box(0.4, RIDGE + 0.5, NL + 0.4), wallM, s*(HX + 0.2), (RIDGE + 0.5)/2, NC)));
  [ZB - 0.2, FZ + 0.2].forEach(z => g.add(mesh(box(2*HX + 0.8, RIDGE + 0.5, 0.4), wallM, 0, (RIDGE + 0.5)/2, z)));
  const course = [];
  [-1, 1].forEach(s => {
    g.add(mesh(box(0.1, 1.0, NL), stoneD, s*(HX - 0.05), 0.5, NC), mesh(box(0.18, 0.12, NL), stoneL, s*(HX - 0.08), 1.04, NC));   // dado and its moulding
    for(let y = 1.7; y < WH - 0.6; y += 0.62) course.push([s*(HX - 0.005), y, NC, 0, 0, 0, 0.012, 0.035, NL]);
  });
  g.add(inst(box(1, 1, 1), mat(0x48515c), course, false));
  g.add(inst(box(1, 1, 1), stoneL, [-1, 1].flatMap(s => [[s*(HX - 0.15), WH - 0.15, NC, 0, 0, 0, 0.32, 0.3, NL], [s*(HX - 0.28), WH + 0.05, NC, 0, 0, 0, 0.6, 0.14, NL]])));   // cornice
  // pilasters: at the ends of every section and every few bays along long ones (they sit behind the exhibits)
  const pil = [];
  [0, 1].forEach(side => {
    const zs = new Set([Z0 + 0.6, ZB + 4.6]);
    sections.filter(s => s.side === side).forEach(s => { zs.add(s.z0 + GAPZ/2); zs.add(s.z0 - s.len - GAPZ/2); for(let z = s.z0 - 4.2; z > s.z0 - s.len + 1.5; z -= 4.2) zs.add(z); });
    for(let z = Z0 + 0.6 - 4.2; z > ZB + 4.6; z -= 4.2) if([...zs].every(o => Math.abs(o - z) > 1.6)) zs.add(z);   // and along empty stretches
    zs.forEach(z => pil.push([sideX(side)*(HX - 0.14), z]));
  });
  g.add(inst(box(0.28, WH - 1.6, 0.6), stoneL, pil.map(([x, z]) => [x, 1.1 + (WH - 1.6)/2, z])));
  g.add(inst(box(0.4, 0.3, 0.8), stoneD, pil.map(([x, z]) => [x, 1.2, z])));
  g.add(inst(box(0.42, 0.34, 0.86), stoneL, pil.map(([x, z]) => [x, WH - 0.62, z])));

  /* ---------- the roof: trusses (tie beam, rafters, king post, struts), purlins, boards ---------- */
  const RA = Math.atan2(RIDGE - WH, HX), RL = Math.hypot(HX, RIDGE - WH) + 0.3, tr = [];
  for(let z = FZ - 1.5; z > ZB + 0.5; z -= 3.0){
    tr.push([0, WH + 0.12, z, 0, 0, 0, 2*HX, 0.34, 0.3]);
    [-1, 1].forEach(s => { tr.push([s*HX/2, (WH + RIDGE)/2 + 0.1, z, 0, 0, -s*RA, RL, 0.3, 0.28]); tr.push([s*HX*0.42, WH + 0.95, z, 0, 0, s*0.9, 1.5, 0.18, 0.2]); });
    tr.push([0, (WH + RIDGE)/2 + 0.1, z, 0, 0, 0, 0.26, RIDGE - WH - 0.1, 0.26]);
  }
  [-1, 1].forEach(s => [0.33, 0.66].forEach(f => tr.push([s*HX*(1 - f), WH + (RIDGE - WH)*f + 0.3, NC, 0, 0, 0, 0.22, 0.22, NL])));
  g.add(inst(box(1, 1, 1), woodM, tr));
  [-1, 1].forEach(s => { const b = mesh(box(RL + 0.4, 0.12, NL + 0.4), mat(0x3a281c), s*HX/2, (WH + RIDGE)/2 + 0.42, NC); b.rotation.z = -s*RA; g.add(b); });

  /* ---------- the runner: a blue rug with gold borders and a lozenge per tile, down the nave ---------- */
  const rc = document.createElement('canvas'); rc.width = 256; rc.height = 512; const rx = rc.getContext('2d');
  rx.fillStyle = '#1f3557'; rx.fillRect(0, 0, 256, 512);
  rx.fillStyle = '#c99a44'; rx.fillRect(14, 0, 10, 512); rx.fillRect(232, 0, 10, 512); rx.fillStyle = '#16263f'; rx.fillRect(30, 0, 4, 512); rx.fillRect(222, 0, 4, 512);
  rx.fillStyle = '#2b4570'; rx.beginPath(); rx.moveTo(128, 70); rx.lineTo(200, 256); rx.lineTo(128, 442); rx.lineTo(56, 256); rx.closePath(); rx.fill();
  rx.strokeStyle = '#c99a44'; rx.lineWidth = 4; rx.stroke();
  rx.fillStyle = '#c99a44'; rx.beginPath(); rx.moveTo(128, 200); rx.lineTo(150, 256); rx.lineTo(128, 312); rx.lineTo(106, 256); rx.closePath(); rx.fill();
  const rt = new THREE.CanvasTexture(rc); rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, (NL - 6)/4.8);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, NL - 6), new THREE.MeshStandardMaterial({map:rt, roughness:1}));
  rug.rotation.x = -Math.PI/2; rug.position.set(0, 0.03, NC - 0.5); rug.receiveShadow = true; rug.raycast = () => {}; g.add(rug);

  /* ---------- section headers: a carved board on the wall, emblem and name in gold leaf, count and years; sconces under it ---------- */
  const sconces = [];
  sections.forEach(s => {
    const sx = sideX(s.side), zc = s.z0 - s.len/2, hw = Math.max(2.4, s.len - 0.4), ys = s.list.map(e => +yearOf(e.date)).filter(Boolean);
    const span = ys.length ? (Math.min(...ys) === Math.max(...ys) ? `${ys[0]}` : `${Math.min(...ys)}–${Math.max(...ys)}`) : '';
    const hg = new THREE.Group(); hg.position.set(sx*(HX - 0.36), 4.75, zc); hg.rotation.y = -sx*Math.PI/2; g.add(hg);   // hung clear of the pilasters behind it
    hg.add(mesh(box(hw + 0.3, 1.05, 0.1), woodD, 0, 0, -0.02), mesh(box(hw + 0.12, 0.9, 0.06), gold, 0, 0, 0.02));
    const p = panel(hw, 0.82, (ctx, W, H) => {
      ctx.fillStyle = s.board; ctx.fillRect(0, 0, W, H);
      const sh = ctx.createLinearGradient(0, 0, 0, H); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(217,183,101,.75)'; ctx.lineWidth = 1.5; ctx.strokeRect(7.5, 7.5, W - 15, H - 15);
      emblem(ctx, s.emblem, 46, H/2, 46, gilt(ctx, H/2 - 23, H/2 + 23));
      ctx.font = `400 36px ${FD}`;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText(clip(ctx, s.label, W - 220), 83, 23); ctx.fillStyle = gilt(ctx, 20, 60); ctx.fillText(clip(ctx, s.label, W - 220), 82, 21);
      ctx.textAlign = 'right'; caps(ctx, [`${s.list.length}`, span].filter(Boolean).join(' · '), W - 24, H/2 - 8, 14, 'rgba(240,222,170,.85)'); ctx.textAlign = 'left';
    });
    p.position.z = 0.06; p.raycast = () => {}; p.material.color.setHex(0xd8c4a4); hg.add(p);
    const ns = Math.max(1, Math.round(s.len/5.2));                                   // a sconce every ~5 along the section, at least one
    for(let i = 0; i < ns; i++) sconces.push([sx, s.z0 - (i + 0.5)*s.len/ns]);
  });
  // sconces: an iron arm out from the wall under the header, a lantern hanging from its end
  const LX = HX - 0.85;
  g.add(inst(box(0.9, 0.05, 0.05), iron, sconces.map(([sx, z]) => [sx*(HX - 0.45), 4.05, z])));
  g.add(inst(box(0.2, 0.26, 0.2), lampM, sconces.map(([sx, z]) => [sx*LX, 3.85, z]), false));
  g.add(inst(new THREE.ConeGeometry(0.17, 0.13, 4), iron, sconces.map(([sx, z]) => [sx*LX, 4.04, z, 0, Math.PI/4])));
  sconces.forEach(([sx, z]) => { const h = halo(0xff9a40, 2.2); h.material.opacity = 0.42; h.position.set(sx*(LX + 0.05), 3.85, z); g.add(h); });

  /* ---------- the exhibits: one bay per entry, built facing +z and turned to face the nave ---------- */
  const beamTex = (() => { const c = document.createElement('canvas'); c.width = 2; c.height = 64; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, '#000'); gr.addColorStop(0.35, '#4a3c20'); gr.addColorStop(1, '#8a7038'); x.fillStyle = gr; x.fillRect(0, 0, 2, 64); return new THREE.CanvasTexture(c); })();
  const beamM = new THREE.MeshBasicMaterial({map:beamTex, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
  const spin = [], marbleM = mat(0xddd5c3);
  const isScroll = e => /letter|certif|scroll|diploma/i.test(e.title);   // ponytail: keyword guess for the award's prop; add a `kind` field to data.json if it ever guesses wrong

  function trophy(){
    const t = new THREE.Group();
    t.add(fx(box(0.6, 0.18, 0.6), mat(0x3a2a1a), 0, 0.09, 0), fx(cyl(0.26, 0.32, 0.12, 14), gold, 0, 0.24, 0), fx(cyl(0.06, 0.09, 0.36, 10), gold, 0, 0.48, 0), fx(cyl(0.45, 0.17, 0.56, 16), gold, 0, 0.94, 0));
    const rim = fx(new THREE.TorusGeometry(0.45, 0.035, 6, 20), gold, 0, 1.22, 0); rim.rotation.x = Math.PI/2; t.add(rim);
    [-1, 1].forEach(h => t.add(fx(new THREE.TorusGeometry(0.16, 0.04, 6, 14), gold, h*0.47, 0.96, 0)));
    return t;
  }
  function scroll(){
    const t = new THREE.Group(); t.add(fx(box(1.3, 0.1, 0.6), mat(0x5a3a26), 0, 0.05, 0));
    const sc = fx(cyl(0.17, 0.17, 1.2, 14), mat(0xefe6cf), 0, 0.28, 0); sc.rotation.z = Math.PI/2; t.add(sc);
    [-0.62, 0.62].forEach(e => { const c = fx(cyl(0.2, 0.2, 0.05, 14), gold, e, 0.28, 0); c.rotation.z = Math.PI/2; t.add(c); });
    const rb = fx(cyl(0.18, 0.18, 0.14, 14), mat(0xa8382a), 0, 0.28, 0); rb.rotation.z = Math.PI/2; t.add(rb);
    t.rotation.y = 0.25; return t;
  }
  function wreathOnStand(){
    const t = new THREE.Group(); t.add(fx(cyl(0.05, 0.08, 0.6, 6), gold, 0, 0.3, 0), fx(box(0.4, 0.06, 0.3), mat(0x3a2a1a), 0, 0.03, 0));
    const w = laurel(0.42, gold, mat(0xa8382a)); w.position.y = 0.95; t.add(w); return t;
  }
  function starOnStand(){
    const t = new THREE.Group(); t.add(fx(cyl(0.05, 0.08, 0.55, 6), gold, 0, 0.27, 0), fx(box(0.4, 0.06, 0.3), mat(0x3a2a1a), 0, 0.03, 0));
    const st = fx(new THREE.OctahedronGeometry(0.4), gold, 0, 0.95, 0); st.scale.set(1, 1.15, 0.35); t.add(st); return t;
  }

  // draw one exhibit face
  const faces = {
    tablet:(s, e, k) => (ctx, W, H, st) => {   // a stone stele: emblem, year, title, organisation, all cut into marble
      marble(ctx, W, H, k*3 + 1);
      ctx.strokeStyle = st.focus ? 'rgba(201,154,68,.9)' : 'rgba(110,100,85,.4)'; ctx.lineWidth = st.focus ? 2.5 : 1.2; ctx.strokeRect(9, 9, W - 18, H - 18);
      ctx.textAlign = 'center';
      emblem(ctx, s.emblem, W/2, 40, 36, st.focus ? gilt(ctx, 22, 58) : '#6b6253');
      const yr = yearOf(e.date) || e.date || '';
      if(yr){ ctx.font = `400 34px ${FD}`; cut(ctx, yr, W/2, 66, st.focus, 34); }
      fleuron(ctx, W/2, 112, 70, st.focus ? '#b07a22' : 'rgba(90,80,65,.6)');
      const mw = W - 30;
      ctx.font = `600 11px ${FP}`; ctx.letterSpacing = '1px'; const ol = e.org ? wrap(ctx, e.org.toUpperCase(), mw).slice(0, 2) : [];
      ol.forEach((l, i) => cut(ctx, l, W/2, H - 22 - (ol.length - i)*14, false, 11, '#6b6253')); ctx.letterSpacing = '0px';
      // the title at the largest size (19 → 11px) whose lines fit between the fleuron and the organisation
      const top = 124, room = H - 30 - ol.length*14 - top, longest = e.title.split(/\s+/).reduce((a, b) => b.length > a.length ? b : a, '');
      let fs = 19; for(; fs > 11; fs--){ ctx.font = `400 ${fs}px ${FD}`; if(ctx.measureText(longest).width <= mw && wrap(ctx, e.title, mw).length*fs*1.18 <= room) break; }
      ctx.font = `400 ${fs}px ${FD}`; const tl = balanced(ctx, e.title, mw).slice(0, Math.max(1, Math.floor(room/(fs*1.18))));
      tl.forEach((l, i) => cut(ctx, l, W/2, top + i*fs*1.18, st.focus, fs, '#3a3328'));
      ctx.textAlign = 'left';
    },
    easel:(s, e, k) => (ctx, W, H, st) => {   // a printed sheet on an easel
      paper(ctx, W, H, 200 + k); rules(ctx, W, H, st.focus);
      const x = 24, mw = W - 48;
      ctx.textAlign = 'center'; caps(ctx, `${s.one} ${pad2(k + 1)}${s.list.length > 1 ? ' of ' + pad2(s.list.length) : ''}`, W/2, 26, 11, st.focus ? RED : SEP, mw); ctx.textAlign = 'left';
      const fs = fitLines(ctx, e.title, mw, 2, 25, 15, 400, FD), tl = balanced(ctx, e.title, mw).slice(0, 3); ctx.fillStyle = INK;
      let y = 48; tl.forEach(l => { ctx.fillText(l, x, y); y += fs*1.16; });
      fleuron(ctx, W/2, y + 8, 90, SEP); y += 22;
      const foot = e.link ? H - 44 : H - 26, kw = e.topics.length ? e.topics.join(' · ') : '';
      ctx.font = `italic 400 13px ${FP}`; const kl = kw ? wrap(ctx, kw, mw).slice(0, 2) : [];
      const room = foot - y - kl.length*16 - 8;
      let bs = 15; do { ctx.font = `400 ${bs}px ${FP}`; } while(wrap(ctx, e.description, mw).length*bs*1.25 > room && (bs -= 0.5) >= 11.5);
      ctx.fillStyle = INK; para(ctx, e.description, x, y, mw, Math.round(bs*1.25), Math.max(1, Math.floor(room/(bs*1.25))));
      ctx.font = `italic 400 13px ${FP}`; ctx.fillStyle = SEP; kl.forEach((l, i) => ctx.fillText(l, x, foot - 6 - (kl.length - i)*16));
      if(e.link){ ctx.textAlign = 'center'; caps(ctx, `${st.focus && !touch ? '⏎ ' : ''}open ${shortUrl(e.link).split('/')[0]} ↗`, W/2, H - 38, 11, st.focus ? RED : SEP, mw); ctx.textAlign = 'left'; }
    },
    pedestal:(s, e) => (ctx, W, H, st) => {   // a dark stone plaque with gilt letters on the pedestal's face
      ctx.fillStyle = '#2d302c'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = st.focus ? '#f0c870' : 'rgba(201,154,68,.7)'; ctx.lineWidth = st.focus ? 3 : 1.5; ctx.strokeRect(6, 6, W - 12, H - 12);
      ctx.textAlign = 'center'; const mw = W - 26;
      if(e.date){ caps(ctx, e.date, W/2, 13, 11, 'rgba(240,210,140,.9)', mw); }
      const fs = fitLines(ctx, e.title, mw, 3, 17, 10, 400, FD), tl = balanced(ctx, e.title, mw);
      const y0 = 30; tl.forEach((l, i) => { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText(l, W/2 + 1, y0 + i*fs*1.15 + 1); ctx.fillStyle = gilt(ctx, y0 + i*fs*1.15, y0 + (i + 1)*fs*1.15); ctx.fillText(l, W/2, y0 + i*fs*1.15); });
      if(e.org){ ctx.font = `italic 400 12px ${FP}`; ctx.fillStyle = 'rgba(236,226,200,.85)'; ctx.fillText(clip(ctx, e.org, mw), W/2, H - 22); }
      ctx.textAlign = 'left';
    },
    frame:(s, e, k) => (ctx, W, H, st) => {   // a framed page: emblem, title, role, date, a few lines
      paper(ctx, W, H, 300 + k); rules(ctx, W, H, st.focus);
      ctx.textAlign = 'center'; const mw = W - 44;
      emblem(ctx, s.emblem, W/2, 40, 34, st.focus ? gilt(ctx, 24, 58) : SEP);
      const fs = fitLines(ctx, e.title, mw, 3, 22, 14, 400, FD), tl = balanced(ctx, e.title, mw); ctx.fillStyle = INK;
      let y = 70; tl.forEach(l => { ctx.fillText(l, W/2, y); y += fs*1.16; });
      if(e.org){ ctx.font = `italic 400 15px ${FP}`; ctx.fillStyle = '#5a4630'; ctx.fillText(clip(ctx, e.org, mw), W/2, y + 2); y += 20; }
      if(e.date){ caps(ctx, e.date, W/2, y + 4, 10, RED, mw); y += 18; }
      fleuron(ctx, W/2, y + 8, 80, SEP); y += 20;
      if(e.description){ ctx.font = `400 14px ${FP}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; para(ctx, e.description, 22, y, mw, 18, Math.max(1, Math.floor((H - 30 - y)/18))); }
      ctx.textAlign = 'left';
    },
  };
  // [display width, height, centre height, distance out from the wall] per style
  const DISP = {tablet:[1.5, 2.3, 1.85, 1.0], easel:[2.3, 2.9, 2.25, 1.05], pedestal:[1.6, 0.98, 0.86, 1.05], frame:[1.75, 2.15, 2.45, 0.12]};

  sections.forEach(s => {
    const sx = sideX(s.side), [DW, DH, DY, OUT] = DISP[s.style], bay = BAY[s.style];
    s.items = s.list.map((e, k) => {
      const z = s.z0 - 0.3 - (k + 0.5)*bay, x = sx*(HX - OUT), ex = new THREE.Group(); ex.position.set(x, 0, z); ex.rotation.y = -sx*Math.PI/2; g.add(ex);
      const p = panel(DW, DH, faces[s.style](s, e, k)); p.material.color.setHex(0xe6d2b2);   // faces are unlit: tint them to the candlelight so they don't glare
      if(s.style === 'tablet'){
        ex.add(mesh(box(1.75, 0.5, 0.62), stoneD, 0, 0.25, 0), mesh(box(1.85, 0.08, 0.7), stoneL, 0, 0.52, 0));
        const lr = laurel(0.16, mat(0x9a8f78)); lr.position.set(0, 0.27, 0.32); ex.add(lr);
        ex.add(mesh(box(1.68, 2.45, 0.24), marbleM, 0, 0.56 + 1.225, -0.02));
        const top = mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.24, 14, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2), marbleM, 0, 0.56 + 2.45, -0.02); top.scale.y = 0.42; ex.add(top);
        p.position.set(0, DY, 0.105);
      } else if(s.style === 'easel'){
        [-1.0, 1.0].forEach(lx => { const l = mesh(box(0.09, 4.0, 0.09), woodM, lx, 2.0, -0.04); l.rotation.z = -lx*0.05; ex.add(l); });
        const bl = mesh(box(0.09, 3.8, 0.09), woodM, 0, 1.8, -0.8); bl.rotation.x = 0.24; ex.add(bl);
        ex.add(mesh(box(DW + 0.25, 0.1, 0.3), woodM, 0, DY - DH/2 - 0.04, 0.1), mesh(box(DW + 0.16, DH + 0.16, 0.05), woodD, 0, DY, -0.02));   // ledge; a board behind the sheet
        p.position.set(0, DY, 0.03);
      } else if(s.style === 'pedestal'){
        ex.add(mesh(box(1.95, 0.2, 1.15), stoneD, 0, 0.1, 0), mesh(box(1.7, 1.3, 0.92), marbleM, 0, 0.85, 0), mesh(box(1.86, 0.12, 1.04), stoneL, 0, 1.56, 0), mesh(box(1.86, 0.1, 1.04), stoneL, 0, 0.25, 0));
        const prop = isScroll(e) ? scroll() : [trophy, wreathOnStand, starOnStand][k % 3](); prop.position.y = 1.62; ex.add(prop);
        if(!isScroll(e)) spin.push(prop);
        const beam = fx(new THREE.CylinderGeometry(0.28, 0.95, 3.2, 20, 1, true), beamM, 0, 1.62 + 1.6, 0); beam.raycast = () => {}; ex.add(beam);
        p.position.set(0, DY, 0.465);
      } else {
        ex.add(mesh(box(DW + 0.32, DH + 0.32, 0.1), gold, 0, DY, -0.04), mesh(box(DW + 0.12, DH + 0.12, 0.12), woodD, 0, DY, -0.02));
        ex.add(mesh(box(1.4, 0.14, 0.4), stoneL, 0, DY - DH/2 - 0.36, 0.12), mesh(box(0.5, 0.36, 0.3), stoneD, 0, DY - DH/2 - 0.6, 0.08));
        p.position.set(0, DY, 0.05);
      }
      ex.add(p);
      // the view faces the exhibit from the nave, a little toward the entrance so the hall recedes behind it
      const c = new V3(x - sx*0.1, DY, z), n = new V3(-sx, 0.14, 0.32).normalize();
      const label = `${s.label}, ${k + 1} of ${s.list.length}: ${[e.title, e.org, e.date].filter(Boolean).join(', ')}.${e.description ? ' ' + e.description : ''}${e.topics.length ? ' Topics: ' + e.topics.join(', ') + '.' : ''}${e.link ? ' Press Enter to open it.' : ''}`;
      return item({obj:ex, panels:[p], label, activate:e.link ? () => openLink(e.link) : null,
        wide:view(c, Math.max(6.0, bay*2.6), Math.max(3.6, DH + 1.6), n), narrow:view(c, DW + 0.5, DH + 0.9, n), z, side:s.side});
    });
  });
  // browse order: down the left wall from the entrance, then back up the right wall (a loop round the hall)
  sections.filter(s => s.side === 0).forEach(s => items.push(...s.items));
  sections.filter(s => s.side === 1).reverse().forEach(s => items.push(...[...s.items].reverse()));

  /* ---------- planters and benches in the gaps between sections ---------- */
  const gaps = [];
  [0, 1].forEach(side => sections.filter(s => s.side === side).forEach(s => gaps.push([sideX(side), s.z0 - s.len - GAPZ/2], [sideX(side), s.z0 + GAPZ/2])));
  const pots = gaps.map(([sx, z]) => [sx*(HX - 0.75), z]);
  g.add(inst(box(0.75, 0.55, 0.75), stoneL, pots.map(([x, z]) => [x, 0.27, z])));
  g.add(inst(new THREE.ConeGeometry(0.12, 0.9, 4), mat(0x4f7a3a), pots.flatMap(([x, z], i) => [0, 1, 2, 3, 4, 5].map(k => { const a = k*1.05 + i; return [x + Math.cos(a)*0.14, 0.95, z + Math.sin(a)*0.14, Math.sin(a)*0.5, a, Math.cos(a)*0.5]; }))));
  g.add(inst(box(0.5, 0.14, 1.6), stoneL, gaps.map(([sx, z]) => [sx*2.3, 0.48, z])));                                   // benches along the nave
  g.add(inst(box(0.42, 0.42, 0.3), stoneD, gaps.flatMap(([sx, z]) => [-0.6, 0.6].map(d => [sx*2.3, 0.21, z + d]))));

  /* ---------- the far end: steps, an arched niche, the lamp of learning in a gilded laurel, two banners ---------- */
  const AZ = ZB + 2.4;
  [[4.6, 0.18, 3.2], [3.8, 0.36, 2.6], [3.0, 0.54, 2.0]].forEach(([w, y, d]) => g.add(mesh(box(w, 0.18, d), stoneL, 0, y - 0.09, AZ)));
  g.add(mesh(box(4.4, 6.2, 0.3), stoneD, 0, 3.1, ZB + 0.15));
  g.add(mesh(new THREE.TorusGeometry(1.75, 0.22, 6, 20, Math.PI), stoneL, 0, 4.7, ZB + 0.35));
  [-1, 1].forEach(s => g.add(mesh(box(0.44, 4.7, 0.44), stoneL, s*1.75, 2.35, ZB + 0.35)));
  g.add(mesh(box(1.3, 1.5, 1.3), marbleM, 0, 0.54 + 0.75, AZ), mesh(box(1.5, 0.14, 1.5), stoneL, 0, 0.54 + 1.55, AZ));
  g.add(mesh(cyl(0.42, 0.5, 0.9, 10), marbleM, 0, 0.54 + 2.07, AZ));
  const lamp = new THREE.Group(); lamp.position.set(0, 3.15, AZ); g.add(lamp);
  const lb = fx(new THREE.SphereGeometry(0.42, 12, 8), gold, 0, 0.2, 0); lb.scale.set(1.25, 0.5, 0.8); lamp.add(lb);
  const sp = fx(new THREE.ConeGeometry(0.12, 0.5, 8), gold, 0.55, 0.26, 0); sp.rotation.z = -Math.PI/2 - 0.3; lamp.add(sp);
  const hd = fx(new THREE.TorusGeometry(0.14, 0.04, 5, 12), gold, -0.58, 0.24, 0); lamp.add(hd);
  const flameM = new THREE.MeshStandardMaterial({color:0xffe08a, emissive:0xffc860, emissiveIntensity:2.2, flatShading:true});
  const flame = fx(new THREE.ConeGeometry(0.14, 0.55, 7), flameM, 0.74, 0.62, 0); lamp.add(flame);
  const wreath = laurel(1.15, gold, mat(0xa8382a)); wreath.position.set(0, 4.1, AZ); g.add(wreath);
  const lh = halo(0xffd27a, 3.4); lh.position.set(0.7, 3.8, AZ + 0.2); g.add(lh);
  [-1, 1].forEach(s => {
    const b = panel(1.1, 3.4, (ctx, W, H) => {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H - 6); ctx.lineTo(W/2, H - 40); ctx.lineTo(0, H - 6); ctx.closePath(); ctx.fillStyle = '#1f3557'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#c99a44'; ctx.stroke(); ctx.fillStyle = '#c99a44'; ctx.fillRect(0, 0, W, 12);
      ctx.beginPath(); ctx.moveTo(W/2, 120); ctx.lineTo(W/2 + 26, 160); ctx.lineTo(W/2, 200); ctx.lineTo(W/2 - 26, 160); ctx.closePath(); ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W/2, 144); ctx.lineTo(W/2 + 10, 160); ctx.lineTo(W/2, 176); ctx.lineTo(W/2 - 10, 160); ctx.closePath(); ctx.fill();
    });
    b.position.set(s*3.2, 4.0, ZB + 0.06); b.raycast = () => {}; g.add(b);
    g.add(mesh(cyl(0.035, 0.035, 1.35, 6), gold, s*3.2, 5.72, ZB + 0.1).rotateZ(Math.PI/2));
  });

  // the entrance end: the inside of the great door, two sconces either side of it
  g.add(mesh(box(2.4, 3.6, 0.12), mat(0x5a3a26), 0, 1.8, FZ - 0.06));
  g.add(mesh(new THREE.TorusGeometry(1.35, 0.18, 5, 16, Math.PI), stoneL, 0, 3.6, FZ - 0.12));

  /* ---------- camera: a look down the nave on entry, then one exhibit at a time ---------- */
  const overview = view(new V3(0, 3.0, Math.max(ZB + 6, Z0 - WL*0.45)), 2*HX + 0.6, 7.2, new V3(0, 0.12, 1).normalize());
  const KEY = 0.75;   // the key light's strength (update() flickers round it)
  let introUntil = 0, kz = items[0] ? items[0].wide.c.z : 0, kx = 0;
  const R = {group:g, items, start:0, follow:true,
    // zoom-out stops 2 short of the wall behind the camera (clear of its sconces and boards), measured per exhibit since they stand at different depths;
    // the overview stops 1.5 short of the entrance wall
    get maxDist(){ const it = items[R.focus]; return performance.now() < introUntil || !it ? (FZ - 1.5 - overview.c.z)/overview.n.z : (Math.abs(it.wide.c.x) + HX - 2)/Math.abs(it.wide.n.x); },
    view(narrow){ const it = items[R.focus]; return performance.now() < introUntil || !it ? overview : narrow ? it.narrow : it.wide; },
    light:{key:[0, 5, kz + 1, 0xffd6a4, KEY], fill:[0, 4.5, AZ + 3, 0xffbc7a, 0.8], ambient:[0.18, 0.05]},   // candlelight, a soft warm white, over a cool moonlit ambient; kept low so cream stone stays cream and doesn't burn out to white
    heroSpot:new V3(1.4, 0, FZ - 2.2),
    onEnter(narrow){ introUntil = reduce || narrow ? 0 : performance.now() + 1600; },   // a look down the hall on every entry
    onFocus(i, snap){ if(!snap) introUntil = 0; },
    update(t, dt){
      const it = items[R.focus];
      if(it){ const f = reduce ? 1 : Math.min(1, dt*3); kz += (it.wide.c.z + 0.8 - kz)*f; kx += (it.wide.c.x*0.35 - kx)*f; keyL.position.set(g.position.x + kx, g.position.y + 5, g.position.z + kz); }
      if(reduce) return;
      spin.forEach((s, k) => { s.rotation.y = t*0.5 + k; });
      flame.scale.set(1, 1 + Math.sin(t*9)*0.12 + Math.sin(t*23)*0.05, 1); flameM.emissiveIntensity = 2.0 + Math.sin(t*13)*0.3;
      lampM.emissiveIntensity = 1.7 + Math.sin(t*7.3)*0.14 + Math.sin(t*13.1)*0.09;
      keyL.intensity = KEY + Math.sin(t*6.1)*0.05 + Math.sin(t*11.7)*0.04;   // the flicker reaches the walls
    }};
  if(!items.length) R.items = [item({obj:g, label:'The Lyceum hall', view:overview, wide:overview, narrow:overview})];
  return R;
}
