/* ---- Beacon Point: the Lantern room (contact) ----
   Left: intro board · centre: "Email me" hero console with the lens glowing behind it · right: lit link buttons. */
import { THREE, V3, reduce, mat, mesh, glow, box, cyl } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, COL, panel, setPanel, rr, para, clip, fitFont, card, eyebrow, shortUrl, openLink } from '../panels.js';
import { starField } from '../world/props.js';
import { view, faceY, item, floorDisc, arcWall, hooks } from './kit.js';

const brass = () => mat(0x8a6a3a, {metalness:0.5, roughness:0.5});
// own material per button so its rim can light up on focus (cached mat() would light every button)
const rimMat = base => new THREE.MeshStandardMaterial({color:0x2a2418, emissive:0xf0b54a, emissiveIntensity:base, flatShading:true, roughness:0.6});

export default function build(){
  const g = new THREE.Group(), items = [], K = DATA.contact;
  g.add(floorDisc(7.6, 0x2b2f38, 12));
  const dark = mat(0x1d2129);
  for(let k=0;k<16;k++){ const a = k/16*Math.PI*2; if(Math.cos(a) > 0.45) continue; g.add(mesh(box(0.16, 6.2, 0.16), dark, Math.sin(a)*7.3, 3.1, Math.cos(a)*7.3)); }
  const topRing = mesh(new THREE.TorusGeometry(7.3, 0.12, 6, 48), dark, 0, 6.2, 0); topRing.rotation.x = Math.PI/2; g.add(topRing);
  g.add(arcWall(7.35, 1.1, 0x252a33, Math.PI/2 + 0.45, Math.PI - 0.9));
  const sky = starField(500, 30, 45, -5, 0.35); g.add(sky);

  /* the lens: raised on a pedestal behind the hero console, so it crowns the centre instead of hiding it */
  g.add(mesh(cyl(0.75, 0.95, 2.7, 8), dark, 0, 1.35, -4.4));
  const lens = new THREE.Group(); lens.position.set(0, 2.7, -4.4); lens.scale.setScalar(0.85); g.add(lens);
  lens.add(mesh(cyl(1.0, 1.25, 1.0, 8), brass(), 0, 0.5, 0));
  for(let k=0;k<6;k++){ const t = mesh(new THREE.TorusGeometry(0.95 - Math.abs(k - 2.5)*0.12, 0.09, 6, 24), glow(0xffd98a, 0.55), 0, 1.3 + k*0.32, 0); t.rotation.x = Math.PI/2; t.castShadow = false; lens.add(t); }
  const coreMat = new THREE.MeshStandardMaterial({color:0xfff2c8, emissive:0xfff2c8, emissiveIntensity:2, flatShading:true});
  const core = mesh(new THREE.SphereGeometry(0.42, 14, 10), coreMat, 0, 2.1, 0); core.castShadow = false; lens.add(core);
  lens.add(mesh(new THREE.ConeGeometry(1.0, 0.7, 8), mat(0xa8382a), 0, 3.4, 0));
  const beamMat = new THREE.MeshBasicMaterial({color:0xfff0b8, transparent:true, opacity:0.08, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending});
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 16, 1, true), beamMat);
  beam.geometry.translate(0, -7, 0); beam.rotation.z = Math.PI/2;   // points +x; pivot angle a aims it at (cos a, 0, -sin a)
  const pivot = new THREE.Group(); pivot.position.y = 2.1; pivot.add(beam); lens.add(pivot);
  // beam only shows while it points out the back windows (away from the camera), so it never washes over text
  const aimBeam = a => { pivot.rotation.y = a; beamMat.opacity = 0.1 * Math.max(0, Math.sin(a)) ** 4; };
  aimBeam(Math.PI/2 + 0.55);

  const Y = 2.15;   // shared centre height of the three stations

  /* left: intro board */
  const introG = new THREE.Group(); introG.position.set(-4.3, 0, -1.2); introG.rotation.y = 0.32; g.add(introG);
  introG.add(mesh(cyl(0.06, 0.08, 1.0, 6), dark, 0, 0.5, -0.05));
  const intro = panel(3.3, 2.9, (ctx, W, H, st) => {
    card(ctx, W, H, st, {bg:'rgba(12,18,34,.96)', r:16});
    const x = 24, mw = W - 48; let y = 24;
    eyebrow(ctx, 'Beacon Point · Contact', x, y, COL.ember, 12); y += 26;
    ctx.font = `400 34px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText("Let's connect", x, y); y += 50;
    ctx.font = `400 16px ${FB}`; ctx.fillStyle = '#d8d4c8'; y = para(ctx, K.intro, x, y, mw, 23, 6) + 14;
    if(K.location){ ctx.font = `600 15px ${FB}`; ctx.fillStyle = COL.ember; ctx.fillText(clip(ctx, '⌖  ' + K.location, mw), x, y); }
  });
  intro.position.set(0, Y, 0); introG.add(intro);
  const introC = new V3(0, Y, 0).applyAxisAngle(new V3(0,1,0), 0.32).add(introG.position);
  items.push(item({obj:introG, panels:[intro], view:view(introC, 3.9, 3.3, faceY(0.32)), label:`${K.intro} ${K.location ? 'Based in ' + K.location + '.' : ''}`}));

  // a raised, rimmed button: body box + canvas face; focus lifts it and lights the rim
  function button(parent, w, h, x, y, base, draw){
    const b = new THREE.Group(); b.position.set(x, y, 0); parent.add(b);
    const rim = rimMat(base);
    b.add(mesh(box(w + 0.08, h + 0.08, 0.14), rim, 0, 0, 0));
    const p = panel(w, h, draw); p.position.z = 0.075; b.add(p);
    const setFocus = on => { setPanel(p, {focus:on}); rim.emissiveIntensity = on ? 1.5 : base; b.position.z = on ? 0.1 : 0; };
    return {b, p, setFocus};
  }

  /* centre: the hero "Email me" console */
  if(K.email){
    const heroG = new THREE.Group(); heroG.position.set(0, 0, -1.0); g.add(heroG);
    heroG.add(mesh(box(1.4, Y - 1.25, 0.6), dark, 0, (Y - 1.25)/2, -0.1));
    heroG.add(mesh(box(3.84, 2.64, 0.14), rimMat(0.45), 0, Y, -0.08));
    const board = panel(3.7, 2.5, (ctx, W, H) => {
      rr(ctx, 0, 0, W, H, 14); const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#141b30'); gr.addColorStop(1, '#0d1222'); ctx.fillStyle = gr; ctx.fill();
      const x = 26, mw = W - 52;
      eyebrow(ctx, 'The beacon is lit · say hello', x, 22, COL.ember, 12);
      ctx.font = `400 50px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText('Email me', x, 42);
      fitFont(ctx, K.email, mw, 22, 600, FB, 13); ctx.fillStyle = COL.ember; ctx.fillText(K.email, x, 108);
      ctx.font = `400 14px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText('Copy the address, or open your mail app.', x, 142);
    });
    board.position.set(0, Y, 0); heroG.add(board);
    let tm;
    const copyBtn = button(heroG, 1.62, 0.6, -0.89, Y - 0.82, 0.25, (ctx, W, H, st) => {
      rr(ctx, 3, 3, W - 6, H - 6, 12);
      ctx.fillStyle = st.copied === 'ok' ? COL.moss : st.copied === 'fail' ? '#ec6f66' : COL.ember; ctx.fill();
      if(st.focus){ ctx.lineWidth = 4; ctx.strokeStyle = '#fff6dc'; ctx.stroke(); }
      const t = st.copied === 'ok' ? 'Copied ✓' : st.copied === 'fail' ? "Couldn't copy" : '⧉  Copy address';
      ctx.textAlign = 'center'; fitFont(ctx, t, W - 24, 19, 700, FB, 12); ctx.fillStyle = '#1a1408'; ctx.fillText(t, W/2, H/2 - 10);
    });
    const mailBtn = button(heroG, 1.62, 0.6, 0.89, Y - 0.82, 0.12, (ctx, W, H, st) => {
      rr(ctx, 3, 3, W - 6, H - 6, 12); ctx.fillStyle = '#1b2236'; ctx.fill();
      ctx.lineWidth = st.focus ? 4 : 2; ctx.strokeStyle = st.focus ? '#fff6dc' : COL.ember; ctx.stroke();
      const t = '✉  Write an email ↗';
      ctx.textAlign = 'center'; fitFont(ctx, t, W - 24, 18, 700, FB, 12); ctx.fillStyle = COL.ink; ctx.fillText(t, W/2, H/2 - 10);
    });
    const heroV = view(new V3(0, Y - 0.1, -1.0), 4.3, 3.2);
    items.push(item({obj:copyBtn.b, hits:[copyBtn.b, board], setFocus:copyBtn.setFocus, view:heroV,
      label:`Email me at ${K.email}. Press Enter to copy the address.`,
      activate(){
        const show = s => { setPanel(copyBtn.p, {copied:s}); clearTimeout(tm); tm = setTimeout(() => setPanel(copyBtn.p, {copied:false}), 2200); };
        const ok = () => { show('ok'); hooks.announce(`Email address ${K.email} copied to clipboard`); };
        const fail = () => { show('fail'); hooks.announce(`Couldn't copy. The address is ${K.email}`); };
        try { navigator.clipboard.writeText(K.email).then(ok, fail); } catch(e){ fail(); }
      }}));
    items.push(item({obj:mailBtn.b, setFocus:mailBtn.setFocus, view:heroV,
      label:`Write an email to ${K.email} in your mail app.`, activate(){ location.href = 'mailto:' + K.email; }}));
  }

  /* right: console of lit link buttons */
  const lastSeg = u => u.split('/').filter(Boolean).pop();
  const links = [
    K.linkedin && {glyph:'in', label:'LinkedIn', value:lastSeg(K.linkedin), url:K.linkedin},
    K.github && {glyph:'</>', label:'GitHub', value:shortUrl(K.github), url:K.github},
    K.medium && {glyph:'M', label:'Medium', value:lastSeg(K.medium), url:K.medium},
    DATA.resume && {glyph:'⤓', label:'Résumé', value:'PDF download', url:DATA.resume}
  ].filter(Boolean);
  if(links.length){
    const TW = 1.6, TH = 1.12, GAP = 0.16, cols = links.length > 1 ? 2 : 1, rows = Math.ceil(links.length/cols);
    const gw = cols*TW + (cols - 1)*GAP, gh = rows*TH + (rows - 1)*GAP;
    const gridG = new THREE.Group(); gridG.position.set(4.3, 0, -1.2); gridG.rotation.y = -0.32; g.add(gridG);
    gridG.add(mesh(box(gw + 0.3, gh + 0.3, 0.12), dark, 0, Y, -0.12));
    [-1, 1].forEach(s => gridG.add(mesh(box(0.1, Y - gh/2 - 0.15, 0.1), brass(), s*(gw/2 - 0.1), (Y - gh/2 - 0.15)/2, -0.12)));
    const head = panel(gw + 0.3, 0.36, ctx => { eyebrow(ctx, 'Find me elsewhere', 15, 8, COL.muted, 15); });
    head.position.set(0, Y + gh/2 + 0.36, -0.05); gridG.add(head);
    const gridV = view(new V3(0, Y + 0.1, 0).applyAxisAngle(new V3(0,1,0), -0.32).add(gridG.position), gw + 0.6, gh + 0.9, faceY(-0.32));
    links.forEach((L, k) => {
      const col = k % cols, row = Math.floor(k/cols);
      const x = (col - (cols - 1)/2)*(TW + GAP), y = Y + ((rows - 1)/2 - row)*(TH + GAP);
      const btn = button(gridG, TW, TH, x, y, 0.18, (ctx, W, H, st) => {
        rr(ctx, 3, 3, W - 6, H - 6, 12);
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, st.focus ? '#3a3322' : '#2a2f3c'); gr.addColorStop(1, '#1d212b'); ctx.fillStyle = gr; ctx.fill();
        ctx.lineWidth = st.focus ? 4 : 2; ctx.strokeStyle = st.focus ? COL.ember : 'rgba(216,180,106,.55)'; ctx.stroke();
        ctx.beginPath(); ctx.arc(34, 36, 20, 0, 6.3); ctx.fillStyle = '#d8b46a'; ctx.fill();
        ctx.textAlign = 'center'; fitFont(ctx, L.glyph, 30, 18, 700, FB, 10); ctx.fillStyle = '#1d212b'; ctx.fillText(L.glyph, 34, 26);
        ctx.textAlign = 'right'; ctx.font = `700 18px ${FB}`; ctx.fillStyle = st.focus ? COL.ember : COL.muted; ctx.fillText('↗', W - 14, 14);
        ctx.textAlign = 'left'; fitFont(ctx, L.label, W - 28, 20, 700, FB, 13); ctx.fillStyle = COL.ink; ctx.fillText(L.label, 16, 66);
        ctx.font = `500 13px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(clip(ctx, L.value, W - 30), 16, 92);
      });
      items.push(item({obj:btn.b, setFocus:btn.setFocus, view:gridV, label:`${L.label}: ${L.value}. Opens in a new tab.`, activate:() => openLink(L.url)}));
    });
  }

  return {group:g, items, start:K.email ? 1 : 0, frame:view(new V3(0, 2.75, -1.2), 12.2, 5.4),
    light:{key:[0, 4.2, -2.6, 0xfff0b8, 1.6], fill:[0, 6, 5, 0x8fa3d8, 0.6]}, heroSpot:new V3(-2.75, 0, -3.9),
    update(t){
      if(reduce) return;
      aimBeam(t*0.6);
      coreMat.emissiveIntensity = 1.8 + Math.sin(t*2)*0.3; sky.rotation.y = t*0.01;
    }};
}
