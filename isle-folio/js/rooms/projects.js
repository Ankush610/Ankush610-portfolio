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
  g.add(mesh(box(6.4, 3.2, 2.2), mat(0x4a433d), 0, 1.6, -12.2));
  const mouth = mesh(box(3.2, 1.5, 0.1), glow(0xd2440e, 1.0).clone(), 0, 1.1, -11.06); mouth.castShadow = false; g.add(mouth);
  g.add(mesh(box(2.6, 7, 1.8), mat(0x3d3732), 0, 6.6, -12.4));
  // heat halo: an additive radial glow behind the board gives the hall depth (no extra lights)
  const haloT = canvasTex(4, 4, (ctx, W, H) => { const gr = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2); gr.addColorStop(0, 'rgba(255,110,40,.4)'); gr.addColorStop(0.45, 'rgba(255,80,20,.18)'); gr.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(17, 12), new THREE.MeshBasicMaterial({map:haloT.tex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
  halo.position.set(0, 5.6, -9.5); g.add(halo);
  // side workshop: anvil with a glowing ingot (spark source) on the left, crates + quench barrel on the right
  const an = anvil(); an.scale.setScalar(1.4); an.position.set(-6.4, 0, -6.6); an.rotation.y = 0.5; g.add(an);
  const ingot = mesh(box(0.5, 0.12, 0.2), glow(0xff4a12, 1.2).clone(), 0.1, 0.83, 0); ingot.castShadow = false; an.add(ingot);
  [[6.4,-7.2,0],[7.2,-6.2,0],[6.8,-6.7,0.84]].forEach(([x,z,y],k) => { const c = mesh(box(0.85,0.85,0.85), mat(0x8a6542), x, 0.42 + y, z); c.rotation.y = k*0.7; g.add(c); });
  g.add(mesh(cyl(0.55, 0.5, 0.9, 10), mat(0x4a3a2c), 5.6, 0.45, -8.4));

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
    }};
}
