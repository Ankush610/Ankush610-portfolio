/* ---- Lorehall: the Library (publications as open books on lecterns) ---- */
import { THREE, V3, ZN, reduce, touch, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { keyL } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, panel, rr, para, wrap, clip, fitFont, pills, eyebrow, shortUrl, openLink } from '../panels.js';
import { view, item } from './kit.js';

// book geometry (world units; 1 unit = 100 canvas px on the pages)
const PW = 2.3, PH = 3.1, BW = PW*2 + 0.16, BH = PH + 0.12, TILT = 0.4, BY = 2.7, BZ = 0.3, S = 5.7;

// soft radial sprite used for candle halos and the warm light pools on the floor
function glowTex(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
// how many rows pills() will need, so the description can leave room for them
function pillRows(ctx, tags, maxW, size){
  ctx.font = `600 ${size}px ${FM}`; let cx = 0, rows = 1;
  tags.forEach(t => { const tw = ctx.measureText(t).width + 16; if(cx + tw > maxW && cx > 0){ cx = 0; rows++; } cx += tw + 6; });
  return tags.length ? rows : 0;
}

export default function build(){
  const g = new THREE.Group(), items = [], pubs = DATA.publications || [], N = pubs.length;
  const W = Math.max(18, N*S + 6), bx = k => (k - (N - 1)/2)*S;
  const add = (o, shadow = true) => { if(!shadow) o.castShadow = false; g.add(o); return o; };

  /* shell: floor, back wall, picture rail */
  add(mesh(box(W, 0.3, 11), mat(0x4a382d), 0, -0.15, 0.5));
  add(mesh(box(W, 12, 0.4), mat(0x2e2420), 0, 6, -4.6));
  add(mesh(box(W, 0.12, 0.08), mat(0x9a7a3e, {metalness:0.5, roughness:0.4}), 0, 8.35, -4.36));
  const rug = add(mesh(cyl(4.2, 4.2, 0.03, 32), mat(0x6b2f2a), 0, 0.02, 0.9)); rug.scale.set(Math.max(1, N*S/8.4), 1, 0.6);

  /* bookcases (one InstancedMesh of spines per case) */
  const pal = [0x7a2e2a, 0x2e4a6b, 0x3d5c3a, 0x6b4a2a, 0x5a3a6b, 0x8a6a3a, 0x2a5a5a, 0x9a4a2a, 0x4a4a52];
  const wood = mat(0x5a3a26), dark = mat(0x3a2618);
  function bookcase(w, h, shelves){
    const c = new THREE.Group();
    c.add(mesh(box(w, h, 0.12), dark, 0, h/2, -0.3));
    c.add(mesh(box(0.14, h, 0.7), wood, -w/2, h/2, 0)); c.add(mesh(box(0.14, h, 0.7), wood, w/2, h/2, 0));
    c.add(mesh(box(w + 0.3, 0.2, 0.85), dark, 0, h + 0.1, 0.03)); // crown moulding
    const sh = h/shelves; for(let k=0;k<=shelves;k++) c.add(mesh(box(w, 0.1, 0.7), wood, 0, k*sh + 0.05, 0));
    const list = [];
    for(let k=0;k<shelves;k++){ let x = -w/2 + 0.12; while(x < w/2 - 0.3){ const bw = 0.1 + rnd()*0.12, bh = sh*(0.55 + rnd()*0.3); if(rnd() < 0.07){ x += 0.3; continue; } list.push([x + bw/2, k*sh + 0.1 + bh/2, bw, bh]); x += bw + 0.012; } }
    const im = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    list.forEach(([x, y, bw, bh], i) => { m4.compose(new V3(x, y, 0.02), q, new V3(bw, bh, 0.5)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setHex(pal[Math.floor(rnd()*pal.length)])); });
    im.castShadow = true; im.receiveShadow = true; c.add(im);
    return c;
  }
  const nb = Math.max(3, Math.round((W - 7)/5.4));
  for(let k=0;k<nb;k++){ const c = bookcase(5, 6.4, 6); c.position.set((k - (nb - 1)/2)*5.4, 0, -4.0); g.add(c); }
  [-1, 1].forEach(s => { const c = bookcase(4.4, 6.4, 6); c.position.set(s*(W/2 - 0.6), 0, -0.8); c.rotation.y = -s*1.05; g.add(c); });

  /* rolling ladder on a brass rail along the back shelves */
  const brass = mat(0xb08a48, {metalness:0.6, roughness:0.35});
  add(mesh(cyl(0.035, 0.035, nb*5.4, 8), brass, 0, 5.9, -3.45)).rotation.z = Math.PI/2;
  const lad = new THREE.Group(); lad.position.set(-(nb - 1)/2*5.4 + 1.3, 0, -2.45); lad.rotation.x = -0.17; g.add(lad);
  [-0.38, 0.38].forEach(x => lad.add(mesh(box(0.08, 6.1, 0.1), wood, x, 3.05, 0)));
  const side = (o) => { o.rotation.z = Math.PI/2; lad.add(o); };
  for(let y = 0.45; y < 5.9; y += 0.5) side(mesh(cyl(0.03, 0.03, 0.76, 6), wood, 0, y, 0));
  [-0.38, 0.38].forEach(x => side(mesh(cyl(0.07, 0.07, 0.06, 10), brass, x, 0.07, 0.08)));

  /* candle stands between and beside the lecterns: flame + halo + a warm pool on the floor */
  const gt = glowTex(), flames = [], halos = [];
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

  /* the books */
  const paper = (ctx, W, H, st, right) => {
    const gr = ctx.createLinearGradient(right ? 0 : W, 0, right ? 36 : W - 36, 0);
    gr.addColorStop(0, '#d6c8a6'); gr.addColorStop(1, '#f3ebd4');
    rr(ctx, 2, 2, W - 4, H - 4, 4); ctx.fillStyle = gr; ctx.fill();
    if(st.focus){ ctx.lineWidth = 4; ctx.strokeStyle = COL.ember; ctx.stroke(); }
  };
  const covers = [0x6b2a24, 0x2e4a6b, 0x3d5c3a, 0x5a3a6b, 0x6b4a2a];
  pubs.forEach((b, k) => {
    const x = bx(k), plat = b.platform || 'the web';
    // lectern: base, post and a slanted desk under the book
    add(mesh(box(1.5, 0.14, 1.1), mat(0x3a2618), x, 0.07, BZ - 0.2));
    add(mesh(box(0.5, 2.3, 0.5), mat(0x4a3020), x, 1.2, BZ - 0.25));
    const bk = new THREE.Group(); bk.position.set(x, BY, BZ); bk.rotation.x = -TILT; g.add(bk);
    bk.add(mesh(box(2.4, PH*0.8, 0.14), mat(0x4a3020), 0, 0, -0.2));
    bk.add(mesh(box(BW + 0.2, 0.12, 0.26), mat(0x4a3020), 0, -BH/2 - 0.04, 0.02)); // ledge the book rests on
    bk.add(mesh(box(BW, BH, 0.1), mat(covers[k % covers.length]), 0, 0, -0.08));
    [-1, 1].forEach(s => bk.add(mesh(box(PW, PH, 0.1), mat(0xe6dabd), s*(PW/2 + 0.02), 0, -0.01)));
    const rib = mesh(box(0.08, 0.9, 0.02), mat(0x9a2a24), 0.05, -BH/2 - 0.35, 0.06); rib.castShadow = false; bk.add(rib);

    const left = panel(PW, PH, (ctx, W, H, st) => {
      paper(ctx, W, H, st, false);
      const x0 = 22, mw = W - 44; let y = 24;
      eyebrow(ctx, [plat, b.date].filter(Boolean).join(' · '), x0, y, COL.brown, 13); y += 30;
      // largest title size whose lines (and longest word) fit above the read time and folio
      const longest = b.title.split(/\s+/).reduce((a, w) => w.length > a.length ? w : a, ''), room = H - y - 100;
      let fs = 28; const fits = () => { ctx.font = `400 ${fs}px ${FD}`; return ctx.measureText(longest).width <= mw && wrap(ctx, b.title, mw).length*fs*1.22 <= room; };
      while(fs > 15 && !fits()) fs--;
      ctx.fillStyle = COL.paperInk; y = para(ctx, b.title, x0, y, mw, Math.round(fs*1.22), Math.floor(room/(fs*1.22))) + 14;
      ctx.fillStyle = '#b89a6a'; ctx.fillRect(x0, y, 44, 2); y += 14;
      if(b.readTime){ ctx.font = `600 14px ${FM}`; ctx.fillStyle = '#7a6550'; ctx.fillText(b.readTime.toUpperCase(), x0, y); }
      ctx.textAlign = 'center'; ctx.font = `400 13px ${FD}`; ctx.fillStyle = '#9a8468'; ctx.fillText(`— ${k + 1} of ${N} —`, W/2, H - 34);
    });
    const right = panel(PW, PH, (ctx, W, H, st) => {
      paper(ctx, W, H, st, true);
      const x0 = 20, mw = W - 40, foot = H - 52, tags = b.tags || [];
      const pr = pillRows(ctx, tags, mw, 12), ph = pr ? pr*23 + (pr - 1)*6 + 14 : 0;
      // biggest body size (16 → 13px) that fits the whole description above the tags
      let fs = 16, lh, max; const desc = b.description || '';
      do { ctx.font = `400 ${fs}px ${FB}`; lh = Math.round(fs*1.36); max = Math.floor((foot - 22 - ph)/lh); } while(fs-- > 13 && wrap(ctx, desc, mw).length > max);
      ctx.fillStyle = '#3a3026'; let y = para(ctx, desc, x0, 22, mw, lh, Math.max(2, max)) + 12;
      if(pr) pills(ctx, tags, x0, y, mw, '#7a4f2a', 12);
      ctx.fillStyle = 'rgba(122,101,80,.45)'; ctx.fillRect(x0, foot + 6, mw, 1.5);
      const cta = `READ ON ${plat.toUpperCase()} ↗`;
      ctx.font = `700 13px ${FM}`; ctx.fillStyle = st.focus ? '#a8540c' : '#7a6550';
      ctx.fillText(clip(ctx, st.focus ? `${touch ? 'TAP' : '⏎'} ${cta}` : cta, mw), x0, foot + 18);
    });
    left.position.set(-(PW/2 + 0.02), 0, 0.05); bk.add(left);
    right.position.set(PW/2 + 0.02, 0, 0.05); bk.add(right);
    items.push(item({obj:bk, panels:[left, right], bx:x,
      view:view(new V3(x, BY, BZ), BW + 0.25, BH + 0.7, new V3(0, Math.sin(TILT), Math.cos(TILT))),
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
  return {group:g, items, start:0, follow:true,
    light:{key:[0, 4.6, 3.4, 0xffc580, 1.7], fill:[0, 4, -2, 0xffa060, 0.6]},
    heroSpot:new V3(bx(0) - 4.2, 0, 0.4),
    onFocus(i, snap){ const it = items[i]; lx = it.bx ?? 0; if(snap) keyL.position.x = g.position.x + lx; },
    update(t, dt){
      keyL.position.x += (g.position.x + lx - keyL.position.x) * (reduce ? 1 : Math.min(1, dt*4));
      if(reduce) return;
      keyL.intensity = 1.7 + Math.sin(t*7.3)*0.06 + Math.sin(t*17)*0.04;
      flames.forEach((f, k) => { const s = 1 + Math.sin(t*13 + k*2)*0.15; f.scale.y = s; halos[k].scale.setScalar(0.7 + s*0.08); });
      for(let i=0;i<DM;i++){ const d = dseed[i]; dpos[i*3] = d[0] + Math.sin(t*0.13 + d[3])*0.6; dpos[i*3+1] = d[1] + Math.sin(t*0.21 + d[3]*2)*0.35; dpos[i*3+2] = d[2] + Math.cos(t*0.11 + d[3])*0.4; }
      dgeo.attributes.position.needsUpdate = true;
    }};
}
