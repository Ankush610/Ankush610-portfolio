/* ---- Lorehall: the Library (publications as open books on lecterns) ---- */
import { THREE, V3, ZN, reduce, touch, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { keyL } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FP, INK, RED, SEP, panel, canvasTex, rr, para, wrap, clip, fitFont, eyebrow, shortUrl, openLink, paper, rules, fleuron, caps } from '../panels.js';
import { view, item } from './kit.js';

// book geometry (world units; 1 unit = 100 canvas px on the pages)
const PW = 2.3, PH = 3.1, BW = PW*2 + 0.16, BH = PH + 0.12, TILT = 0.4, BY = 2.7, BZ = 0.3, S = 5.7;
const FZ = 21, RH = 14.5;   // front wall z, room height (closed all round, so zoom-out never shows the void; deep enough for the portrait view)

// soft radial sprite used for candle halos and the warm light pools on the floor
function glowTex(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
// the top page's height over the board, u = 0 at the gutter to 1 at the fore-edge: dips into the spine, swells, flattens, droops a little at the edge
const LIFT = 0.2, GAP = 0.012, surf = u => 0.015 + LIFT*(1 - Math.pow(1 - u, 2.6)) - 0.045*Math.pow(u, 5);

// body text with a three-line red drop cap; the biggest size (17 → 12px) that fits above maxY, truncated with … at the smallest
function dropCap(ctx, text, x, y, mw, maxY){
  text = String(text).trim(); if(!text) return;
  const cap = text[0], rest = text.slice(1), DL = 3;
  for(let fs = 17; fs >= 12; fs--){
    const lh = Math.round(fs*1.3), cs = Math.round(((DL - 1)*lh + fs*0.68)/0.7);
    ctx.font = `400 ${cs}px ${FD}`; const cw = ctx.measureText(cap).width + 5;
    ctx.font = `400 ${fs}px ${FP}`;
    let lines = [], line = '';
    for(const w of rest.split(/\s+/)){ if(!w) continue; const t = line ? line + ' ' + w : w; if(line && ctx.measureText(t).width > (lines.length < DL ? mw - cw : mw)){ lines.push(line); line = w; } else line = t; }
    if(line) lines.push(line);
    const max = Math.floor((maxY - y)/lh);
    if(lines.length > max && fs > 12) continue;
    if(lines.length > max){ lines = lines.slice(0, max); lines[max - 1] = lines[max - 1].replace(/\s*\S*$/, '') + '…'; }
    ctx.font = `400 ${cs}px ${FD}`; ctx.fillStyle = RED; ctx.fillText(cap, x, y - cs*0.16);
    ctx.font = `400 ${fs}px ${FP}`; ctx.fillStyle = INK;
    lines.forEach((l, i) => ctx.fillText(l, i < DL ? x + cw : x, y + i*lh));
    return;
  }
}
// stripes for the page block's edges (the leaves seen side-on); along v for the head/tail caps, along u for the fore-edge
function leafTex(alongU){
  const c = document.createElement('canvas'); c.width = alongU ? 64 : 4; c.height = alongU ? 4 : 64; const x = c.getContext('2d');
  for(let i=0;i<64;i++){ const v = 222 - ((i*37) % 7)*4 - (i % 3 ? 0 : 20); x.fillStyle = `rgb(${v},${v - 12},${v - 38})`; alongU ? x.fillRect(i, 0, 1, 4) : x.fillRect(0, i, 4, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(alongU ? 2 : 1, alongU ? 1 : 2); return t;
}

export default function build(){
  const g = new THREE.Group(), items = [], pubs = DATA.publications || [], N = pubs.length;
  const W = Math.max(18, N*S + 6), WS = W + 1.6, bx = k => (k - (N - 1)/2)*S;
  const add = (o, shadow = true) => { if(!shadow) o.castShadow = false; g.add(o); return o; };

  const gt = glowTex(), unitBox = box(1, 1, 1), gilt = mat(0x9a7a3e, {metalness:0.5, roughness:0.4});
  const brass = mat(0xb08a48, {metalness:0.6, roughness:0.35});
  const wood = mat(0x5a3a26), dark = mat(0x3a2618), iron = mat(0x2a221c), wax = mat(0xe8e0cc), parch = mat(0xe6dabd);
  // one InstancedMesh of unit boxes from [x, y, z, w, h, d, rotY?, color?] rows
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), c4 = new THREE.Color();
  function boxes(rows, m, colors){
    const im = new THREE.InstancedMesh(unitBox, m, rows.length);
    rows.forEach(([x, y, z, w, h, d, ry = 0, cc], i) => { q4.setFromEuler(e4.set(0, ry, 0)); m4.compose(new V3(x, y, z), q4, new V3(w, h, d)); im.setMatrixAt(i, m4); if(colors) im.setColorAt(i, c4.setHex(cc)); });
    im.castShadow = true; im.receiveShadow = true; return im;
  }

  /* shell: floor with planks, back, side and front walls, picture rail */
  add(mesh(box(WS, 0.3, FZ + 5), mat(0x2e2218), 0, -0.15, (FZ - 5)/2));
  { const rows = [], tones = [0x4a382d, 0x52402f, 0x45342a, 0x4e3a2c];
    for(let z = -4.35, r = 0; z < FZ; z += 0.62, r++){ let x = -WS/2 + (r % 3)*0.9 - 0.9; while(x < WS/2){ const l = 2.4 + rnd()*1.6, x1 = Math.min(x + l, WS/2); if(x1 > -WS/2) { const x0 = Math.max(x, -WS/2); rows.push([(x0 + x1)/2 - 0.015, 0, z, x1 - x0 - 0.03, 0.03, 0.59, 0, tones[Math.floor(rnd()*4)]]); } x += l; } }
    const pl = boxes(rows, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), true); pl.castShadow = false; g.add(pl); }
  const wallM = mat(0x2e2420);
  add(mesh(box(WS, RH, 0.4), wallM, 0, RH/2, -4.6));
  [-1, 1].forEach(s => add(mesh(box(0.4, RH, FZ + 5), wallM, s*(WS/2 + 0.2), RH/2, (FZ - 5)/2)));
  add(mesh(box(WS + 0.8, RH, 0.4), wallM, 0, RH/2, FZ + 0.2));
  [-1, 1].forEach(s => add(mesh(box(0.08, 0.12, FZ + 4.4), gilt, s*(WS/2 - 0.04), 8.35, (FZ - 4.4)/2)));   // picture rail runs on round the side walls
  add(mesh(box(WS, 0.12, 0.08), gilt, 0, 8.35, -4.36));
  // rug: a woven runner under the lecterns (navy guard bands, a gilt-and-diamond border, a lozenge lattice on red, a medallion under each book) with fringed ends
  const RW = N*S + 1.4, RD = 5.4;
  const rugTex = canvasTex(RW, RD, (ctx, W, H) => {
    ctx.fillStyle = '#2a2640'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#b0894a'; ctx.fillRect(18, 18, W - 36, H - 36);
    ctx.fillStyle = '#3a2440'; ctx.fillRect(22, 22, W - 44, H - 44);
    ctx.fillStyle = '#9a7840';   // diamond chain in the border
    const dia = (x, y, r) => { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); };
    for(let x = 36; x < W - 30; x += 22){ dia(x, 35, 7); dia(x, H - 35, 7); }
    for(let y = 58; y < H - 50; y += 22){ dia(35, y, 7); dia(W - 35, y, 7); }
    ctx.fillStyle = '#b0894a'; ctx.fillRect(48, 48, W - 96, H - 96);
    ctx.fillStyle = '#6b2a24'; ctx.fillRect(52, 52, W - 104, H - 104);
    ctx.save(); ctx.beginPath(); ctx.rect(52, 52, W - 104, H - 104); ctx.clip();
    ctx.strokeStyle = 'rgba(30,10,8,.28)'; ctx.lineWidth = 2;   // lattice
    for(let x = -H; x < W + H; x += 46){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
    ctx.fillStyle = 'rgba(210,160,90,.22)';
    for(let x = 0; x < W; x += 46) for(let y = (H/2) % 46; y < H; y += 46){ ctx.beginPath(); ctx.arc(x + 23, y, 3, 0, 7); ctx.fill(); }
    for(let k=0;k<N;k++){   // medallion: layered lozenges with a star
      const cx = (bx(k) + RW/2)*100, cy = H/2;
      [[150, '#b0894a'], [144, '#2a2640'], [118, '#8a3a2a'], [96, '#b0894a'], [92, '#4e2220'], [52, '#2a2640']].forEach(([r, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx, cy - r*0.95); ctx.lineTo(cx + r*1.35, cy); ctx.lineTo(cx, cy + r*0.95); ctx.lineTo(cx - r*1.35, cy); ctx.closePath(); ctx.fill(); });
      ctx.fillStyle = '#d0a860'; ctx.beginPath(); for(let j=0;j<16;j++){ const a = j*Math.PI/8, r = j % 2 ? 12 : 30; ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); } ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }).tex;
  const rug = add(new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshStandardMaterial({map:rugTex, roughness:1})), false);
  rug.rotation.x = -Math.PI/2; rug.position.set(0, 0.025, 0.9); rug.receiveShadow = true;
  { const fr = []; [-1, 1].forEach(s => { for(let z = -RD/2 + 0.06; z < RD/2; z += 0.11) fr.push([s*(RW/2 + 0.11), 0.03, 0.9 + z, 0.22, 0.02, 0.035, (rnd() - 0.5)*0.3]); });
    const f = boxes(fr, mat(0xd8c8a0)); f.castShadow = false; g.add(f); }

  /* upper hall above the picture rail: pilasters, moonlit arched windows, cornice and a beamed ceiling */
  const UW = 2.1, UY = 9.1, UH = 2.0, UZ = -4.38, nw = Math.max(3, Math.round(W/6));
  const paneM = glow(0x34507f, 0.75), winGlow = [];
  const archGeo = new THREE.CylinderGeometry(UW/2, UW/2, 0.06, 12, 1, false, -Math.PI/2, Math.PI);
  const archFrame = new THREE.CylinderGeometry(UW/2 + 0.14, UW/2 + 0.14, 0.1, 12, 1, false, -Math.PI/2, Math.PI);
  const winM = new THREE.SpriteMaterial({map:gt, color:0x5a7ac0, transparent:true, opacity:0.16, blending:THREE.AdditiveBlending, depthWrite:false});
  const wrows = [], prows = [];
  for(let k=0;k<nw;k++){
    const x = (k - (nw - 1)/2)*(W/nw);
    add(mesh(box(UW, UH, 0.06), paneM, x, UY + UH/2, UZ), false);
    add(mesh(archGeo, paneM, x, UY + UH, UZ), false).rotation.x = -Math.PI/2;
    add(mesh(archFrame, dark, x, UY + UH, UZ - 0.03), false).rotation.x = -Math.PI/2;
    wrows.push([x - UW/2 - 0.07, UY + UH/2, UZ + 0.02, 0.14, UH, 0.12], [x + UW/2 + 0.07, UY + UH/2, UZ + 0.02, 0.14, UH, 0.12],   // jambs
      [x, UY - 0.08, UZ + 0.1, UW + 0.5, 0.16, 0.3],                                                                   // sill
      [x, UY + (UH + UW/2)/2, UZ + 0.04, 0.06, UH + UW/2, 0.06], [x, UY + UH, UZ + 0.04, UW, 0.06, 0.06], [x, UY + UH*0.55, UZ + 0.04, UW, 0.06, 0.06], [x, UY + UH*0.15, UZ + 0.04, UW, 0.05, 0.06]);   // leading
    const s = new THREE.Sprite(winM); s.position.set(x, UY + UH*0.8, UZ + 0.3); s.scale.set(UW*2.2, UH*2.6, 1); g.add(s); winGlow.push(s);
    if(k) prows.push([x - W/nw/2, 0]);
  }
  prows.push([-WS/2 + 0.3, 0], [WS/2 - 0.3, 0]);
  prows.forEach(([x]) => wrows.push([x, 10.5, UZ + 0.06, 0.5, 4.2, 0.22], [x, 12.65, UZ + 0.1, 0.7, 0.3, 0.32], [x, 8.6, UZ + 0.1, 0.66, 0.3, 0.3]));   // pilaster, capital, base
  wrows.push([0, 13.0, UZ + 0.14, WS, 0.35, 0.45], [0, 13.3, UZ + 0.24, WS, 0.2, 0.6]);   // cornice
  g.add(boxes(wrows, dark));
  add(mesh(box(WS, 0.4, FZ + 5), mat(0x251c18), 0, 14.7, (FZ - 5)/2));   // ceiling
  { const br = []; for(let x = -WS/2 + 1.5; x < WS/2; x += 3) br.push([x, 14.3, (FZ - 5)/2, 0.35, 0.45, FZ + 5]); for(let z = -1.5; z < FZ; z += 4) br.push([0, 14.25, z, WS, 0.35, 0.3]); g.add(boxes(br, wood)); }

  /* bookcases (one InstancedMesh of spines per case) */
  const pal = [0x7a2e2a, 0x2e4a6b, 0x3d5c3a, 0x6b4a2a, 0x5a3a6b, 0x8a6a3a, 0x2a5a5a, 0x9a4a2a, 0x4a4a52];
  // a shelf curio standing among the books: a stoppered glass jar, a brass hourglass or a small iron-banded box
  const glass = mat(0x3f6a5e, {roughness:0.25, metalness:0.1}), cork = mat(0x8a6a44);
  function curio(c, x, y, kind){
    if(kind === 0){ c.add(mesh(cyl(0.1, 0.12, 0.26, 8), glass, x, y + 0.13, 0.05), mesh(cyl(0.05, 0.05, 0.07, 6), cork, x, y + 0.3, 0.05)); return; }
    if(kind === 1){ [0.07, 0.4].forEach(dy => c.add(mesh(cyl(0.13, 0.13, 0.04, 8), brass, x, y + dy - 0.05, 0.05)));
      const top = mesh(new THREE.ConeGeometry(0.1, 0.16, 8), glass, x, y + 0.27, 0.05); top.rotation.x = Math.PI;   // the two bulbs meet at their tips
      c.add(top, mesh(new THREE.ConeGeometry(0.1, 0.16, 8), glass, x, y + 0.11, 0.05)); return; }
    c.add(mesh(box(0.34, 0.2, 0.26), wood, x, y + 0.1, 0.05), mesh(box(0.36, 0.035, 0.28), iron, x, y + 0.17, 0.05), mesh(box(0.06, 0.08, 0.02), brass, x, y + 0.12, 0.19));
  }
  const PL = 0.3;
  function bookcase(w, h, shelves){
    const c = new THREE.Group();
    c.add(mesh(box(w, h, 0.12), dark, 0, h/2, -0.3));
    c.add(mesh(box(0.14, h, 0.7), wood, -w/2, h/2, 0)); c.add(mesh(box(0.14, h, 0.7), wood, w/2, h/2, 0));
    c.add(mesh(box(w + 0.3, 0.2, 0.85), dark, 0, h + 0.1, 0.03), mesh(box(w + 0.5, 0.12, 0.97), wood, 0, h + 0.26, 0.05));   // stepped cornice
    c.add(mesh(box(w + 0.22, PL, 0.8), dark, 0, PL/2, 0.04));   // plinth under the bottom shelf
    const sh = (h - PL)/shelves; for(let k=0;k<=shelves;k++) c.add(mesh(box(w, 0.1, 0.7), wood, 0, PL + k*sh + 0.05, 0));
    // [x, y, z, width, height, depth, roll]: upright runs, the odd leaning volume and flat stacks in the gaps
    const list = [];
    for(let k=0;k<shelves;k++){
      const base = PL + k*sh + 0.1; let x = -w/2 + 0.12;
      while(x < w/2 - 0.3){
        const bw = 0.08 + rnd()*0.14, bh = sh*(0.5 + rnd()*0.38), r = rnd();
        if(r > 0.975 && x < w/2 - 0.6){ curio(c, x + 0.22, base, Math.floor(rnd()*3)); x += 0.48; continue; }
        if(r < 0.06){   // a flat stack of 2-4 books
          let y = base; const n = 2 + Math.floor(rnd()*3);
          for(let j=0;j<n;j++){ const t = 0.06 + rnd()*0.04, l = 0.42 + rnd()*0.14; list.push([x + 0.3 + (rnd() - 0.5)*0.05, y + t/2, 0.02, l, t, 0.4 + rnd()*0.08, 0]); y += t; }
          x += 0.66; continue;
        }
        if(r < 0.1){ x += 0.22; list.push([x - 0.1 + Math.sin(0.32)*bh/2, base + Math.cos(0.32)*bh/2 - 0.01, 0.02, bw, bh, 0.48, -0.32]); x += bw + 0.06; continue; }   // leaning into a gap
        list.push([x + bw/2, base + bh/2, 0.02 + rnd()*0.06, bw, bh, 0.42 + rnd()*0.12, 0]); x += bw + 0.012;
      }
    }
    const im = new THREE.InstancedMesh(unitBox, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), ez = new THREE.Euler();
    list.forEach(([x, y, z, bw, bh, bd, roll], i) => { q.setFromEuler(ez.set(0, 0, roll)); m4.compose(new V3(x, y, z), q, new V3(bw, bh, bd)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setHex(pal[Math.floor(rnd()*pal.length)])); });
    im.castShadow = true; im.receiveShadow = true; c.add(im);
    // gilt bands on the spines: a thin brass strip near the top of a few tall books
    const bands = list.filter(b => !b[6] && b[4] > sh*0.7 && rnd() < 0.35);
    const ib = new THREE.InstancedMesh(unitBox, gilt, bands.length);
    bands.forEach(([x, y, z, bw, bh, bd], i) => { q.identity(); m4.compose(new V3(x, y + bh*0.32, z + bd/2), q, new V3(bw*1.02, 0.03, 0.02)); ib.setMatrixAt(i, m4); });
    c.add(ib);
    return c;
  }
  const nb = Math.max(3, Math.round((W - 7)/5.4));
  const pedGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.16, 10, 1, false, -Math.PI/2, Math.PI);
  for(let k=0;k<nb;k++){
    const x = (k - (nb - 1)/2)*5.4, c = bookcase(5, 6.4, 6); c.position.set(x, 0, -4.0); g.add(c);
    if(Math.abs(x) > 2){   // carved pediment with a brass boss (not on the centre case: the plaque hangs there)
      const p = mesh(pedGeo, dark, 0, 6.82, -0.05); p.rotation.x = -Math.PI/2; p.scale.set(1, 1, 0.55); c.add(p);
      c.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), brass, 0, 7.1, 0.06));
    }
  }
  [-1, 1].forEach(s => { const c = bookcase(4.4, 6.4, 6); c.position.set(s*(W/2 - 0.6), 0, -0.8); c.rotation.y = -s*1.05; g.add(c); });
  // more cases along the side walls, seen when zoomed out
  [-1, 1].forEach(s => [4.2, 9.6].forEach(z => { const c = bookcase(5, 6.4, 6); c.position.set(s*(WS/2 - 0.42), 0, z); c.rotation.y = -s*Math.PI/2; g.add(c); }));

  /* rolling ladder on a brass rail along the back shelves */
  add(mesh(cyl(0.035, 0.035, nb*5.4, 8), brass, 0, 5.9, -3.45)).rotation.z = Math.PI/2;
  const lad = new THREE.Group(); lad.position.set(-(nb - 1)/2*5.4 + 1.3, 0, -2.45); lad.rotation.x = -0.17; g.add(lad);
  [-0.38, 0.38].forEach(x => lad.add(mesh(box(0.08, 6.1, 0.1), wood, x, 3.05, 0)));
  const side = (o) => { o.rotation.z = Math.PI/2; lad.add(o); };
  for(let y = 0.45; y < 5.9; y += 0.5) side(mesh(cyl(0.03, 0.03, 0.76, 6), wood, 0, y, 0));
  [-0.38, 0.38].forEach(x => side(mesh(cyl(0.07, 0.07, 0.06, 10), brass, x, 0.07, 0.08)));

  /* candle stands between and beside the lecterns: flame + halo + a warm pool on the floor */
  const flames = [], halos = [];
  const haloM = new THREE.SpriteMaterial({map:gt, color:0xffb060, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false});
  const poolM = new THREE.MeshBasicMaterial({map:gt, color:0x8a5420, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false});
  for(let k=0;k<=N;k++){
    const x = (k - N/2)*S;
    add(mesh(cyl(0.28, 0.34, 0.08, 10), mat(0x2a221c), x, 0.04, 0.9));
    add(mesh(cyl(0.035, 0.035, 1.75, 6), mat(0x2a221c), x, 0.9, 0.9));
    add(mesh(cyl(0.16, 0.1, 0.06, 10), brass, x, 1.8, 0.9));
    add(mesh(cyl(0.065, 0.07, 0.34, 8), mat(0xe8e0cc), x, 2.0, 0.9));
    flames.push(add(mesh(new THREE.ConeGeometry(0.055, 0.16, 6), glow(0xffb84a, 2.6), x, 2.25, 0.9), false));
    const h = new THREE.Sprite(haloM); h.position.set(x, 2.25, 0.9); h.scale.setScalar(0.75); g.add(h); halos.push(h);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), poolM); pool.rotation.x = -Math.PI/2; pool.position.set(x, 0.045, 0.9); g.add(pool);
  }

  /* dust motes drifting in the candlelight */
  const DM = 90, dpos = new Float32Array(DM*3), dseed = [];
  for(let i=0;i<DM;i++){ dseed.push([(rnd() - 0.5)*(W - 3), 0.6 + rnd()*5.5, -3 + rnd()*5, rnd()*6.28]); dpos.set(dseed[i].slice(0, 3), i*3); }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  g.add(new THREE.Points(dgeo, new THREE.PointsMaterial({color:0xffd9a0, size:0.045, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending, depthWrite:false})));

  /* set dressing: chandelier, globe, reading table and chair, scroll basket, floor stacks */
  const xFlames = [], flameGeo = new THREE.ConeGeometry(0.045, 0.13, 6), flameM = glow(0xffb84a, 2.6);
  const candle = (o, x, y, z, h = 0.26) => {   // small wax candle + flame (+ halo) on a surface
    o.add(mesh(cyl(0.05, 0.055, h, 7), wax, x, y + h/2, z));
    const f = mesh(flameGeo, flameM, x, y + h + 0.06, z); f.castShadow = false; o.add(f); xFlames.push(f); return f;
  };
  // wrought-iron chandelier hanging from the ceiling between the books
  const chand = new THREE.Group(); chand.position.set(0, 14.5, -1.2); g.add(chand);
  chand.add(mesh(cyl(0.03, 0.03, 3.3, 4), iron, 0, -1.65, 0));
  const ring = mesh(new THREE.TorusGeometry(1.0, 0.05, 5, 16), iron, 0, -3.5, 0); ring.rotation.x = Math.PI/2; chand.add(ring);
  chand.add(mesh(new THREE.OctahedronGeometry(0.22, 0), brass, 0, -3.5, 0));
  for(let k=0;k<6;k++){ const a = k*Math.PI/3, cx = Math.cos(a), cz = Math.sin(a);
    const arm = mesh(cyl(0.02, 0.02, 1.0, 4), iron, cx*0.5, -3.5, cz*0.5); arm.rotation.set(0, -a, Math.PI/2); chand.add(arm);
    chand.add(mesh(cyl(0.09, 0.06, 0.05, 7), brass, cx, -3.45, cz)); candle(chand, cx, -3.43, cz, 0.22); }
  const ch = new THREE.Sprite(haloM); ch.position.set(0, -3.1, 0); ch.scale.setScalar(2.6); chand.add(ch);

  // globe on a tripod stand, back left (spins slowly)
  const gl = new THREE.Group(); gl.position.set(-6.5, 0, -2.4); g.add(gl);
  let globe;
  { const sg = new THREE.IcosahedronGeometry(0.5, 1).toNonIndexed(), cols = [], n = sg.attributes.position.count/3, c = new THREE.Color();
    for(let i=0;i<n;i++){ c.setHex(rnd() < 0.38 ? 0xb89a62 : 0x2e4a6b); for(let j=0;j<3;j++) cols.push(c.r, c.g, c.b); }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    globe = mesh(sg, new THREE.MeshStandardMaterial({vertexColors:true, flatShading:true, roughness:0.7}), 0, 1.45, 0); }
  const tiltG = new THREE.Group(); tiltG.position.y = 1.45; tiltG.rotation.z = 0.41; gl.add(tiltG); globe.position.set(0, 0, 0); tiltG.add(globe);
  const mer = mesh(new THREE.TorusGeometry(0.6, 0.025, 4, 20), brass); mer.rotation.y = Math.PI/2; tiltG.add(mer);
  const hor = mesh(new THREE.TorusGeometry(0.64, 0.04, 4, 20), wood, 0, 1.45, 0); hor.rotation.x = Math.PI/2; gl.add(hor);
  gl.add(mesh(cyl(0.05, 0.08, 0.85, 6), wood, 0, 0.62, 0), mesh(cyl(0.12, 0.1, 0.2, 8), brass, 0, 1.08, 0));
  for(let k=0;k<3;k++){ const a = k*2.094, l = mesh(box(0.07, 0.7, 0.07), wood, Math.cos(a)*0.32, 0.3, Math.sin(a)*0.32); l.rotation.set(Math.sin(a)*0.55, 0, -Math.cos(a)*0.55); gl.add(l); }

  // scroll basket by the ladder
  const bas = new THREE.Group(); bas.position.set(-5.6, 0, -1.6); g.add(bas);
  bas.add(mesh(cyl(0.34, 0.27, 0.62, 9), mat(0x7a5a32), 0, 0.31, 0), mesh(new THREE.TorusGeometry(0.34, 0.035, 4, 9), mat(0x5a4024), 0, 0.62, 0));
  bas.children[1].rotation.x = Math.PI/2;
  const scrollGeo = cyl(0.06, 0.06, 1.0, 7);
  [[0.1, 0.12, 0.15, -0.1], [-0.12, 0.05, -0.2, 0.15], [0.05, -0.13, 0.05, 0.25], [-0.08, -0.08, -0.12, -0.25], [0.15, -0.02, 0.28, 0.05]].forEach(([x, z, rx, rz]) => {
    const s = mesh(scrollGeo, parch, x, 0.62, z); s.rotation.set(rx, 0, rz); bas.add(s); });

  // reading table with an open book, a stack, an unrolled scroll, inkwell, quill and a candle; chair pulled out
  const tb = new THREE.Group(); tb.position.set(6.1, 0, -2.25); g.add(tb);
  tb.add(mesh(box(2.0, 0.1, 1.0), wood, 0, 0.95, 0), mesh(box(1.8, 0.12, 0.85), dark, 0, 0.84, 0));
  [[-0.88, -0.4], [0.88, -0.4], [-0.88, 0.4], [0.88, 0.4]].forEach(([x, z]) => tb.add(mesh(cyl(0.06, 0.045, 0.9, 6), dark, x, 0.45, z)));
  tb.add(boxes([[-0.65, 1.04, -0.1, 0.55, 0.08, 0.4, 0.1, 0x2e4a6b], [-0.63, 1.12, -0.1, 0.5, 0.08, 0.36, -0.15, 0x7a2e2a], [-0.66, 1.19, -0.12, 0.44, 0.06, 0.32, 0.3, 0x3d5c3a],
    [0.05, 1.02, 0.08, 0.36, 0.03, 0.46, -0.08, 0xe6dabd], [0.42, 1.02, 0.08, 0.36, 0.03, 0.46, -0.08, 0xe6dabd], [0.23, 1.005, 0.07, 0.78, 0.02, 0.5, -0.08, 0x5a3a6b]], new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), true));
  const sc = mesh(box(0.5, 0.01, 0.34), parch, 0.6, 1.006, -0.33); sc.rotation.y = 0.5; tb.add(sc);
  [-1, 1].forEach(s => { const r = mesh(cyl(0.035, 0.035, 0.42, 6), parch, 0.6 + Math.cos(0.5)*0.25*s, 1.035, -0.33 - Math.sin(0.5)*0.25*s); r.rotation.set(Math.PI/2, 0, 0); r.rotation.order = 'YXZ'; r.rotation.y = 0.5; tb.add(r); });
  tb.add(mesh(cyl(0.07, 0.08, 0.1, 7), mat(0x1e2430), 0.82, 1.05, 0.25));
  const quill = mesh(new THREE.ConeGeometry(0.035, 0.55, 4), mat(0xf2ead8), 0.86, 1.3, 0.22); quill.rotation.z = -0.35; tb.add(quill);
  tb.add(mesh(cyl(0.12, 0.14, 0.04, 8), brass, -0.25, 1.02, -0.32)); candle(tb, -0.25, 1.04, -0.32, 0.3);
  const th = new THREE.Sprite(haloM); th.position.set(-0.25, 1.42, -0.32); th.scale.setScalar(0.7); tb.add(th);
  const chair = new THREE.Group(); chair.position.set(6.3, 0, -1.25); chair.rotation.y = 0.35; g.add(chair);
  chair.add(mesh(box(0.62, 0.08, 0.6), wood, 0, 0.6, 0));
  [[-0.26, -0.25], [0.26, -0.25], [-0.26, 0.25], [0.26, 0.25]].forEach(([x, z]) => chair.add(mesh(box(0.06, 0.6, 0.06), dark, x, 0.3, z)));
  [-0.26, 0.26].forEach(x => chair.add(mesh(box(0.07, 0.9, 0.07), dark, x, 1.05, 0.27)));
  chair.add(mesh(box(0.6, 0.32, 0.05), mat(0x6b2f2a), 0, 1.2, 0.27), mesh(box(0.66, 0.08, 0.1), dark, 0, 1.52, 0.27));

  // stacks of books on the floor beside the outer lecterns
  { const rows = []; [[6.6, -0.7], [-6.2, 2.6]].forEach(([x, z]) => { let y = 0; const n = 4 + Math.floor(rnd()*3);
      for(let j=0;j<n;j++){ const t = 0.1 + rnd()*0.06; rows.push([x + (rnd() - 0.5)*0.08, y + t/2, z, 0.6 - j*0.03, t, 0.45 - j*0.02, (rnd() - 0.5)*0.6, pal[Math.floor(rnd()*pal.length)]]); y += t; } });
    g.add(boxes(rows, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), true)); }

  /* the books: a leather-bound volume lying open on a turned lectern. The pages curve up out of the gutter over a page
     block whose edges show the leaves; the text is set like a printed page (running head, fleurons, drop cap, folio). */
  const pageGeo = s => {   // s = -1 left page, +1 right; the curve, plus a gutter shadow in vertex colours (pages are unlit)
    const geo = new THREE.PlaneGeometry(PW, PH, 28, 1), p = geo.attributes.position, col = [];
    for(let i=0;i<p.count;i++){ const u = s > 0 ? p.getX(i)/PW + 0.5 : 0.5 - p.getX(i)/PW, c = 0.5 + 0.5*Math.min(1, Math.pow(u*3, 0.6)) - 0.06*Math.pow(u, 6); p.setZ(i, surf(u) + 0.004); col.push(c, c*0.98, c*0.94); }   // dark in the gutter, a touch darker at the drooping edge
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return geo;
  };
  const blockGeo = s => {   // the stack of leaves under each page: the page curve on top, flat on the board, PH tall
    const sh = new THREE.Shape(); sh.moveTo(s*GAP, 0);
    for(let k=0;k<=24;k++) sh.lineTo(s*(GAP + k/24*PW), surf(k/24));
    sh.lineTo(s*(GAP + PW), 0); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, {depth:PH, bevelEnabled:false, curveSegments:1});
    geo.rotateX(Math.PI/2); geo.translate(0, PH/2, 0); return geo;
  };
  const pageG = [pageGeo(-1), pageGeo(1)], blockG = [blockGeo(-1), blockGeo(1)];
  const leafM = [new THREE.MeshStandardMaterial({map:leafTex(false), roughness:0.9}), new THREE.MeshStandardMaterial({map:leafTex(true), roughness:0.9})];   // head/tail, fore-edge
  const boardG = box(PW + 0.16, PH + 0.2, 0.06), spineG = new THREE.CylinderGeometry(0.13, 0.13, PH + 0.2, 10, 1, false, Math.PI/2, Math.PI);
  const cornerG = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.26, 0), new THREE.Vector2(0, -0.26)]), {depth:0.075, bevelEnabled:false});
  cornerG.translate(0, 0, -0.068);
  const turnedG = new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.3, 0.1], [0.2, 0.16], [0.17, 0.4], [0.25, 0.62], [0.27, 0.78], [0.19, 0.98], [0.12, 1.3], [0.13, 1.55], [0.2, 1.7], [0.13, 1.82], [0.13, 1.9], [0.32, 1.98], [0.32, 2.06], [0, 2.06]].map(([r, y]) => new THREE.Vector2(r, y)), 10);
  const footG = box(0.75, 0.16, 0.24), bunG = new THREE.SphereGeometry(0.11, 8, 6);
  // bookmark: a thin satin ribbon lying in the gutter, out of the foot of the book, over the ledge's lip and hanging a little,
  // with a swallowtail end. A strip of (left, centre, right) vertices along a curve in the book's y-z plane.
  const ribbonG = (() => {
    const path = new THREE.CatmullRomCurve3([[0, -0.85, 0.032], [0, -1.4, 0.034], [0, -1.56, 0.06], [0, -1.58, 0.2], [0, -1.555, 0.268], [0.005, -1.6, 0.292], [0.03, -1.8, 0.3], [0.075, -2.0, 0.296]].map(([x, y, z]) => new V3(x, y, z)));
    const n = 48, w = 0.032, pos = [], idx = [];
    for(let i=0;i<=n;i++){ const p = path.getPointAt(i/n), c = i === n ? path.getPointAt(1 - 0.05/path.getLength()) : p;   // the centre of the last row sits higher: the notch
      pos.push(p.x - w, p.y, p.z, c.x, c.y, c.z, p.x + w, p.y, p.z); }
    for(let i=0;i<n;i++){ const a = i*3, b = a + 3; idx.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  })();
  const creaseG = box(0.05, PH, 0.012), crease = mat(0x3a2a1a);
  const ribbon = new THREE.Mesh(ribbonG, new THREE.MeshStandardMaterial({color:0x8e1c22, roughness:0.45, side:THREE.DoubleSide}));
  const covers = [0x6b2a24, 0x2e4a6b, 0x3d5c3a, 0x5a3a6b, 0x6b4a2a];
  pubs.forEach((b, k) => {
    const x = bx(k), plat = b.platform || 'the web', LZ = BZ - 0.25;
    // lectern: four scrolled feet, a turned column with a brass collar, a bracket under the desk
    for(let j=0;j<4;j++){ const a = j*Math.PI/2 + Math.PI/4, f = add(mesh(footG, dark, x + Math.cos(a)*0.42, 0.08, LZ + Math.sin(a)*0.42)); f.rotation.y = -a;
      add(mesh(bunG, dark, x + Math.cos(a)*0.78, 0.09, LZ + Math.sin(a)*0.78)); }
    add(mesh(box(0.62, 0.12, 0.62), wood, x, 0.2, LZ));
    add(mesh(turnedG, wood, x, 0.26, LZ));
    add(mesh(cyl(0.2, 0.2, 0.07, 10), brass, x, 1.26, LZ));
    const bk = new THREE.Group(); bk.position.set(x, BY, BZ); bk.rotation.x = -TILT; g.add(bk);
    // slanted desk with a moulded edge, and the ledge the book rests on
    bk.add(mesh(box(1.2, 1.3, 0.3), dark, 0, -0.45, -0.32));
    bk.add(mesh(box(BW + 0.4, BH*0.9, 0.12), wood, 0, -0.05, -0.12));
    [-1, 1].forEach(s => bk.add(mesh(box(0.08, BH*0.9, 0.16), dark, s*(BW/2 + 0.2), -0.05, -0.12)));
    bk.add(mesh(box(BW + 0.56, 0.1, 0.36), dark, 0, -PH/2 - 0.15, 0.06), mesh(box(BW + 0.56, 0.16, 0.05), dark, 0, -PH/2 - 0.1, 0.25));
    // the volume: leather boards and a rounded spine, gilt corners, the two page blocks, a ribbon down from the gutter
    const leather = mat(covers[k % covers.length], {roughness:0.7});
    [-1, 1].forEach(s => {
      bk.add(mesh(boardG, leather, s*(PW/2 + 0.06), 0, -0.03));
      [-1, 1].forEach(t => { const c = mesh(cornerG, gilt, s*(PW + 0.14), t*(PH/2 + 0.1), 0); c.scale.set(s, t, 1); bk.add(c); });
      bk.add(mesh(blockG[(s + 1)/2], leafM));
    });
    const sp = mesh(spineG, leather, 0, 0, -0.06); bk.add(sp);
    bk.add(ribbon.clone(), mesh(creaseG, crease, 0, 0, 0.012));   // a dark crease where the pages meet, so the spine doesn't show through

    const left = panel(PW, PH, (ctx, W, H, st) => {
      paper(ctx, W, H, k*2); rules(ctx, W, H, st.focus);
      ctx.textAlign = 'center';
      caps(ctx, [plat, b.date].filter(Boolean).join(' · '), W/2, 28, 11, SEP, W - 50);
      fleuron(ctx, W/2, 50, 90, SEP);
      // largest title size whose lines (and longest word) fit, centred in the space above the read time and folio
      const mw = W - 50, top = 66, room = H - top - 92;
      const longest = b.title.split(/\s+/).reduce((a, w) => w.length > a.length ? w : a, '');
      let fs = 27; const fits = () => { ctx.font = `400 ${fs}px ${FD}`; return ctx.measureText(longest).width <= mw && wrap(ctx, b.title, mw).length*fs*1.2 <= room; };
      while(fs > 14 && !fits()) fs--;
      const n = Math.min(wrap(ctx, b.title, mw).length, Math.floor(room/(fs*1.2))), lh = Math.round(fs*1.2);
      ctx.fillStyle = INK; let y = para(ctx, b.title, W/2, top + Math.max(0, (room - n*lh)/2), mw, lh, n);
      fleuron(ctx, W/2, y + 14, 60, SEP);
      if(b.readTime){ ctx.font = `italic 400 15px ${FP}`; ctx.fillStyle = SEP; ctx.fillText(b.readTime.toLowerCase(), W/2, y + 26); }
      ctx.font = `400 13px ${FP}`; ctx.fillStyle = SEP; ctx.fillText(`— ${k + 1} of ${N} —`, W/2, H - 40);
    });
    const right = panel(PW, PH, (ctx, W, H, st) => {
      paper(ctx, W, H, k*2 + 1); rules(ctx, W, H, st.focus);
      const x0 = 30, mw = W - 60, tags = b.tags || [];
      ctx.textAlign = 'center';
      // keywords in italic above the call to read on, then the description fills what's left
      ctx.font = `italic 400 13px ${FP}`;
      const kw = tags.reduce((ls, t) => { const l = ls[ls.length - 1]; if(l && ctx.measureText(l + ' · ' + t).width <= mw) ls[ls.length - 1] += ' · ' + t; else ls.push(t); return ls; }, []).slice(0, 2), kwY = H - 66 - kw.length*16;
      ctx.fillStyle = SEP; kw.forEach((l, i) => ctx.fillText(l, W/2, kwY + i*16));
      if(kw.length) fleuron(ctx, W/2, kwY - 10, 50, SEP);
      const cta = `${st.focus && !touch ? '⏎ ' : ''}read on ${plat} ↗`;   // touch: the hint bar already says tap to open
      caps(ctx, cta, W/2, H - 44, 11, st.focus ? RED : SEP, mw);
      ctx.textAlign = 'left'; dropCap(ctx, b.description || '', x0, 38, mw, kwY - (kw.length ? 20 : 4));
    });
    [left, right].forEach((p, s) => { p.geometry.dispose(); p.geometry = pageG[s]; p.material.vertexColors = true; p.material.transparent = false; p.position.x = (s ? 1 : -1)*(PW/2 + GAP); bk.add(p); });
    items.push(item({obj:bk, panels:[left, right], bx:x,
      view:view(new V3(x, BY, BZ + 0.1), BW + 0.6, BH + 0.7, new V3(0, Math.sin(TILT), Math.cos(TILT))),
      label:`Book ${k + 1} of ${N}: ${b.title}. ${[plat, b.date, b.readTime].filter(Boolean).join(', ')}. ${b.description || ''} Press Enter to read it on ${plat}.`,
      activate:() => openLink(b.link)}));
  });

  /* brass plaque, framed and hung from the picture rail above the centre bookcase */
  const med = DATA.contact && DATA.contact.medium;
  if(med){
    const SY = 7.4, SZ = -4.27;
    const sign = panel(3.4, 0.95, (ctx, W, H, st) => {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#dcb86c'); gr.addColorStop(1, '#a8823e');
      rr(ctx, 4, 4, W - 8, H - 8, 8); ctx.fillStyle = gr; ctx.fill();
      ctx.lineWidth = st.focus ? 4 : 2; ctx.strokeStyle = st.focus ? '#fff2c8' : '#6b4f20'; ctx.stroke();
      ctx.textAlign = 'center'; eyebrow(ctx, st.focus ? `More essays · ${touch ? 'tap' : '⏎'} to open` : 'More essays', W/2, 16, '#3a2a10', 12);
      const u = shortUrl(med) + ' ↗'; fitFont(ctx, u, W - 36, 26, 400, FD, 12); ctx.fillStyle = '#2a1d08'; ctx.fillText(u, W/2, 42);
    });
    sign.position.set(0, SY, SZ); g.add(sign);
    add(mesh(box(3.7, 1.25, 0.1), mat(0x3a2618), 0, SY, SZ - 0.07));
    [-1.3, 1.3].forEach(x => { add(mesh(cyl(0.015, 0.015, 8.3 - SY - 0.6, 4), brass, x, (8.3 + SY + 0.6)/2, SZ - 0.06)); add(mesh(cyl(0.05, 0.05, 0.05, 8), brass, x, SY + 0.58, SZ)).rotation.x = Math.PI/2; });
    items.push(item({obj:sign, panels:[sign], view:view(new V3(0, SY - 0.6, SZ), 6.6, 3.4), label:`More essays: ${shortUrl(med)}. Press Enter to open.`, activate:() => openLink(med)}));
  }

  let lx = 0;
  return {group:g, items, start:0, follow:true, maxDist:FZ - 1.5,   // the camera stays inside the hall (front wall at z = FZ, ceiling at RH)
    light:{key:[0, 4.6, 3.4, 0xffc580, 1.7], fill:[0, 4, -2, 0xffa060, 0.6]},
    heroSpot:new V3(bx(0) - 4.2, 0, 0.4),
    onFocus(i, snap){ const it = items[i]; lx = it.bx ?? 0; if(snap) keyL.position.x = g.position.x + lx; },
    update(t, dt){
      keyL.position.x += (g.position.x + lx - keyL.position.x) * (reduce ? 1 : Math.min(1, dt*4));
      if(reduce) return;
      keyL.intensity = 1.7 + Math.sin(t*7.3)*0.06 + Math.sin(t*17)*0.04;
      flames.forEach((f, k) => { const s = 1 + Math.sin(t*13 + k*2)*0.15; f.scale.y = s; halos[k].scale.setScalar(0.7 + s*0.08); });
      xFlames.forEach((f, k) => { f.scale.y = 1 + Math.sin(t*11 + k*1.7)*0.18; });
      chand.rotation.z = Math.sin(t*0.5)*0.012; chand.rotation.x = Math.sin(t*0.37)*0.01;
      globe.rotation.y = t*0.15;
      winM.opacity = 0.15 + Math.sin(t*0.3)*0.025;
      for(let i=0;i<DM;i++){ const d = dseed[i]; dpos[i*3] = d[0] + Math.sin(t*0.13 + d[3])*0.6; dpos[i*3+1] = d[1] + Math.sin(t*0.21 + d[3]*2)*0.35; dpos[i*3+2] = d[2] + Math.cos(t*0.11 + d[3])*0.4; }
      dgeo.attributes.position.needsUpdate = true;
    }};
}
