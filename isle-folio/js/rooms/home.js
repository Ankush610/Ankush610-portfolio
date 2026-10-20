/* ---- Hearthstone: the Sanctum (inside the glowing monolith) ---- */
import { THREE, V3, reduce, mat, mesh, glow, box, rnd } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, panel, setPanel, rr, para, fitFont, card, eyebrow } from '../panels.js';
import { byId } from '../world/islands.js';
import { view, faceY, item, hooks } from './kit.js';

const EMBER = 0xf0b54a;
const additive = (color, opacity) => new THREE.MeshBasicMaterial({color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});

export default function build(){
  const g = new THREE.Group(), P = DATA.personal, items = [];
  const company = DATA.experience[0] ? DATA.experience[0].company : '';
  const months = (() => { const [y, m] = P.careerStart.split('-').map(Number), n = new Date(); return (n.getFullYear() - y)*12 + n.getMonth() + 1 - m; })();
  const tabTo = {PROJECTS:'projects', WORKSHOPS:'teaching', SKILLS:'skills', WRITING:'writing', CONTACT:'contact'};
  const stats = [
    {big: String(Math.max(0.5, Math.floor(months/6)/2)), label: 'Years at ' + (company.split(',')[0] || 'work'), to:'journey'},
    {big: DATA.contact.location.split(',')[0], label: DATA.contact.location.split(',').slice(1).join(',').trim(), to:'contact'},
    ...P.stats.map(s => ({big:s.number, label:s.label, to: tabTo[s.tab] || (byId[String(s.tab).toLowerCase()] ? String(s.tab).toLowerCase() : 'projects')}))
  ];

  /* ---- layout: scales with however many focus areas / stats data.json has ----
     lecterns: rows of up to 4, back rows raised on stone tiers; hero board rises above them;
     stats: split into a left and right column of portals, pushed outward past the widest lectern row */
  const nF = P.focusAreas.length, rows = Math.max(1, Math.ceil(nF/4)), cols = Math.max(1, Math.ceil(nF/rows)), TIER = 2.35, LX = 2.85;
  const HY = 4.75 + (rows - 1)*TIER, HZ = -3.7;
  const nLeft = Math.ceil(stats.length/2), m = Math.max(nLeft, 1), SG = 2.1;
  const SX = Math.max(5.25, (cols - 1)*LX/2 + 2.4 + (rows - 1)*0.6), SY = Math.max((HY + 3.8)/2, 1.25 + (m - 1)*SG/2);
  const TOP = Math.max(HY + 2.0, SY + (m - 1)*SG/2 + 1.0);

  /* ---- the chamber: a square stone shaft (the monolith, seen from inside) ---- */
  const CZ = -2, HW = Math.max(7.8, SX + 2.2), BZ = CZ - HW, WH = 14;               // shaft centre z, half width, back wall z, wall height
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(HW*Math.SQRT2, HW*Math.SQRT2, WH, 4, 1, true), mat(0x23262e, {side:THREE.BackSide}));
  shell.rotation.y = Math.PI/4; shell.position.set(0, WH/2, CZ); shell.receiveShadow = true; g.add(shell);   // BackSide: only the far walls draw, never the one between us and the camera
  g.add(mesh(box(HW*2, 0.4, HW*2), mat(0x2e313a), 0, -0.2, CZ));
  // floor: stepped dais under the hero board + a glowing inlay ring
  g.add(mesh(box(9.4, 0.22, 4.2), mat(0x3a3e48), 0, 0.11, -4.6));
  g.add(mesh(box(8.4, 0.22, 3.2), mat(0x434752), 0, 0.33, -4.9));
  const inlay = mesh(new THREE.TorusGeometry(2.4, 0.05, 6, 48), glow(EMBER, 1.4), 0, 0.02, 2.4); inlay.rotation.x = Math.PI/2; inlay.castShadow = false; g.add(inlay);

  // back wall: pilasters, glowing seams with light running up them, a rune band
  const seamMat = glow(EMBER, 0.35), pulseMat = glow(EMBER, 1.5), pilGeo = box(0.8, WH, 0.5), seamGeo = box(0.05, WH, 0.05), pulseGeo = box(0.07, 1.2, 0.07);
  const pulses = [];
  [-6.2, -2.6, 2.6, 6.2].map(x => x*HW/7.8).forEach((x, k) => {
    g.add(mesh(pilGeo, mat(0x2c2f38), x, WH/2, BZ + 0.25));
    const sx = x + (x < 0 ? 0.6 : -0.6);
    const seam = mesh(seamGeo, seamMat, sx, WH/2, BZ + 0.03); seam.castShadow = false; g.add(seam);
    const p = mesh(pulseGeo, pulseMat, sx, 2 + k*2.6, BZ + 0.05); p.castShadow = false; g.add(p); pulses.push(p);
  });
  [[0, BZ + 0.05, HW*2, 0.1], [-HW + 0.05, CZ, 0.1, HW*2], [HW - 0.05, CZ, 0.1, HW*2]].forEach(([x, z, w, d]) => {
    const band = mesh(box(w, 0.09, d), seamMat, x, HY + 2.85, z); band.castShadow = false; g.add(band);
  });
  // side walls: deep niches with a dim ember glow, so the room reads as carved stone rather than a backdrop
  const nicheMat = glow(0x6a4a2a, 0.22);
  [-1, 1].forEach(s => [-6.5, 2.2].forEach(z => {
    g.add(mesh(box(0.3, 3.4, 1.6), mat(0x1c1e25), s*(HW - 0.1), 2.6, z));
    const n = mesh(box(0.05, 2.9, 1.2), nicheMat, s*(HW - 0.26), 2.6, z); n.castShadow = false; g.add(n);
  }));

  // light falling from the crown of the monolith onto the heart-stone, plus slow motes
  const shaftMat = additive(0xffc46a, 0.07);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 3.0, WH, 20, 1, true), shaftMat); shaft.position.set(0, WH/2, -6.4); g.add(shaft);
  const MH = HY + 4.25, M = 70, motePos = new Float32Array(M*3), moteSeed = [];
  for(let i=0;i<M;i++){ const s = [(rnd()*2 - 1)*6.5, rnd()*MH, -9.3 + rnd()*5, rnd()*6.3]; moteSeed.push(s); motePos.set([s[0], s[1], s[2]], i*3); }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  g.add(new THREE.Points(moteGeo, new THREE.PointsMaterial({color:0xffd08a, size:0.07, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending, depthWrite:false})));

  /* ---- hero board on the heart-stone ---- */
  g.add(mesh(box(7.9, HY + 1.9, 0.4), mat(0x1f222a), 0, (HY + 1.9)/2, HZ - 0.25));   // heart-stone: reaches the floor however high the board sits
  g.add(mesh(box(8.3, 0.3, 0.7), mat(0x474b55), 0, HY - 2.0, HZ - 0.2));
  g.add(mesh(box(8.3, 0.3, 0.7), mat(0x474b55), 0, HY + 2.0, HZ - 0.2));
  const gem = mesh(new THREE.OctahedronGeometry(0.5), glow(EMBER, 2.2), 0, HY + 2.75, HZ); gem.castShadow = false; g.add(gem);

  const heroB = panel(7.2, 3.1, (ctx, W, H, st) => {
    card(ctx, W, H, st, {bg:'rgba(12,17,32,.96)', r:20});
    const x = 36, mw = W - 72; let y = 30;
    eyebrow(ctx, `${P.title}${company ? ' · ' + company : ''}`, x, y, COL.ember, 15); y += 30;
    fitFont(ctx, P.name, mw, 58, 400, FD, 30); ctx.fillStyle = COL.ink; ctx.fillText(P.name, x, y); y += 74;
    ctx.font = `600 20px ${FB}`; ctx.fillStyle = COL.muted; ctx.fillText(P.subtitle, x, y); y += 34;
    ctx.fillStyle = 'rgba(240,181,74,.45)'; ctx.fillRect(x, y, 56, 2); y += 14;
    ctx.font = `400 18px ${FB}`; ctx.fillStyle = '#d8d4c8'; para(ctx, P.description, x, y, mw, 26, 4);
  });
  heroB.position.set(0, HY, HZ); g.add(heroB);
  const heroItem = item({obj:heroB, panels:[heroB], view:view(new V3(0, HY, HZ), 7.5, 3.5), label:`${P.name}. ${P.title}. ${P.description}`});

  /* ---- focus-area lecterns: low, tilted back, in a shallow arc in front of the dais ---- */
  const lecMat = mat(0x474b55), slabMat = mat(0x2a2d36), lecBase = box(2.4, 0.3, 0.8), lecSlab = box(2.62, 2.27, 0.12);
  const TILT = -0.22;
  const steles = P.focusAreas.map((f, k) => {
    const r = Math.floor(k/cols), c = k - r*cols, inRow = Math.min(cols, nF - r*cols), L = rows - 1 - r;   // row 0 = top/back tier
    const o = c - (inRow - 1)/2, ry = -o*0.16, x = o*LX, z = -0.2 + Math.abs(o)*0.3 - L*1.2, base = L*TIER, y = base + 1.3;
    if(L && !c) g.add(mesh(box(inRow*LX + 0.6, base, 1.4), mat(0x2c2f38), 0, base/2, -0.3 - L*1.2));
    const grp = new THREE.Group(); grp.position.set(x, base, z); grp.rotation.y = ry; g.add(grp);
    grp.add(mesh(lecBase, lecMat, 0, 0.15, -0.1));
    const face = new THREE.Group(); face.position.y = y - base; face.rotation.x = TILT; grp.add(face);
    face.add(mesh(lecSlab, slabMat, 0, 0, -0.08));
    const p = panel(2.5, 2.15, (ctx, W, H, st) => {
      card(ctx, W, H, st, {bg:'rgba(20,24,40,.96)', r:12});
      ctx.font = `400 28px ${FB}`; ctx.fillStyle = COL.ember; ctx.fillText(f.glyph, 20, 18);
      ctx.font = `400 21px ${FD}`; ctx.fillStyle = COL.ink; const y2 = para(ctx, f.title, 58, 21, W - 78, 25, 2);
      ctx.font = `400 15px ${FB}`; ctx.fillStyle = '#cfd3dc'; para(ctx, f.desc, 20, Math.max(y2, 54) + 10, W - 40, 20.5, 6);
    });
    face.add(p);
    const n = faceY(ry); n.y = 0.25; n.normalize();
    return item({obj:grp, panels:[p], view:view(new V3(x, y, z), 2.9, 2.55, n), label:`${f.title}: ${f.desc}`});
  });

  /* ---- stat portals: framed doorways that glow and lift when focused ---- */
  const PW = 2.0, PH = 1.6, frameMat = mat(0x4f535e), jambGeo = box(0.16, PH + 0.3, 0.22), lintelGeo = box(PW + 0.5, 0.18, 0.26);
  const apGeo = new THREE.PlaneGeometry(PW + 0.14, PH + 0.14), apDim = additive(EMBER, 0.12), apLit = additive(EMBER, 0.5);
  const statItems = stats.map((s, k) => {
    const left = k < nLeft, j = left ? k : k - nLeft, x = left ? -SX : SX, y = SY + ((m - 1)/2 - j)*SG, z = -2.9, ry = left ? 0.26 : -0.26;
    const name = byId[s.to].name.toUpperCase();
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; g.add(grp);
    grp.add(mesh(jambGeo, frameMat, -PW/2 - 0.1, 0, -0.06), mesh(jambGeo, frameMat, PW/2 + 0.1, 0, -0.06), mesh(lintelGeo, frameMat, 0, PH/2 + 0.16, -0.04), mesh(lintelGeo, frameMat, 0, -PH/2 - 0.16, -0.04));
    const ap = new THREE.Mesh(apGeo, apDim); ap.position.z = -0.03; grp.add(ap);
    const p = panel(PW, PH, (ctx, W, H, st) => {
      card(ctx, W, H, st, {bg:'rgba(30,24,12,.94)', border:'rgba(240,181,74,.45)', r:14});
      ctx.textAlign = 'center';
      fitFont(ctx, s.big, W - 30, 46, 400, FD, 20); ctx.fillStyle = COL.ember; ctx.fillText(s.big, W/2, 14);
      fitFont(ctx, s.label.toUpperCase(), W - 24, 13, 700, FM, 9); ctx.fillStyle = COL.ink; ctx.fillText(s.label.toUpperCase(), W/2, 70);
      // the "door handle": a full-width button naming the destination
      const bx = 16, by = H - 54, bw = W - 32, bh = 34, txt = (st.focus ? '⏎ ENTER ' : '') + name + ' →';
      rr(ctx, bx, by, bw, bh, 9);
      if(st.focus){ ctx.fillStyle = COL.ember; ctx.fill(); } else { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(240,181,74,.75)'; ctx.stroke(); }
      fitFont(ctx, txt, bw - 16, 14, 700, FM, 9); ctx.fillStyle = st.focus ? '#1d1608' : COL.ember; ctx.fillText(txt, W/2, by + 10);
    });
    p.position.z = 0.02; grp.add(p);
    const it = item({obj:grp, panels:[p], view:view(new V3(x, y, z), 2.6, 2.1, faceY(ry)), label:`${s.big} ${s.label}. Portal: opens ${byId[s.to].name}.`, activate:() => hooks.goInside(s.to)});
    const base = grp.position.clone(), out = faceY(ry).multiplyScalar(0.18);
    it.setFocus = on => { setPanel(p, {focus:on}); ap.material = on ? apLit : apDim; grp.position.copy(base); if(on) grp.position.add(out); };
    return it;
  });
  items.push(...statItems.slice(0, nLeft), heroItem, ...steles, ...statItems.slice(nLeft));

  return {group:g, items, start:nLeft, frame:view(new V3(0, (TOP + 0.2)/2 - 0.45, -2.2), 2*SX + 3.3, TOP + 1.1),   // extra bottom margin: front lecterns sit nearer the camera and the hint bar covers the bottom edge
    light:{key:[0, HY + 0.75, 3, 0xffc070, 1.4], fill:[0, 7, -7.5, 0x7fa0ff, 0.9]}, heroSpot:new V3(-SX - 1.1, 0, 0.9),
    update(t){
      if(reduce) return;
      gem.position.y = HY + 2.75 + Math.sin(t*1.6)*0.15; gem.rotation.y = t*0.9;
      inlay.material.emissiveIntensity = 1.2 + Math.sin(t*2)*0.4;
      shaftMat.opacity = 0.065 + Math.sin(t*0.7)*0.02;
      pulses.forEach((p, k) => { p.position.y = 0.5 + ((t*1.1 + k*3.1) % (WH - 1)); });
      for(let i=0;i<M;i++){ const s = moteSeed[i]; motePos[i*3] = s[0] + Math.sin(t*0.3 + s[3])*0.3; motePos[i*3+1] = (s[1] + t*0.18) % MH; motePos[i*3+2] = s[2] + Math.cos(t*0.25 + s[3])*0.3; }
      moteGeo.attributes.position.needsUpdate = true;
    }};
}
