/* ---- Runespire: the Rune tower (skills orbit, focused category unfolds) ----
   Each category is a ring of tiles orbiting the crystal pillar. The focused ring unfolds into a grid on a
   dark slate in front of the camera, the rings above/below part to make room, and a rune column (one row
   per category, top ring on top) shows where you are in the stack. Rows are clickable. */
import { THREE, V3, reduce, touch, mesh, glow, box, cyl, rnd } from '../engine.js';
import { camera } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, CAT, canvasTex, panel, setPanel, rr, fitFont, para } from '../panels.js';
import { view, item, floorDisc, arcWall } from './kit.js';

const GZ = 4.3, TW = 1.6, TH = 0.48, SX = 1.72, SY = 0.6;   // grid depth, tile size, tile pitch
const LW = 1.75, RH = 0.34, LGAP = 0.4, LABH = 0.58;          // legend width, legend row height, gaps

export default function build(){
  const g = new THREE.Group(), items = [], rings = [];
  g.add(floorDisc(9, 0x2c313c, 12));
  // materials we animate are cloned: engine's glow()/mat() are cached and shared with other rooms
  const rune = mesh(new THREE.TorusGeometry(2.2, 0.04, 6, 64), glow(0x7fd6ff, 1.4).clone(), 0, 0.02, 0); rune.rotation.x = Math.PI/2; g.add(rune);
  g.add(arcWall(9.5, 15, 0x3b4050, Math.PI/2, Math.PI));
  for(let k=0;k<7;k++){ const a = Math.PI/2 + 0.3 + k*0.42; const s = mesh(box(0.25, 1.6, 0.1), glow(0x9ab8ff, 1.1), Math.sin(a)*9.4, 3 + (k%3)*3.4, Math.cos(a)*9.4); s.rotation.y = a; s.castShadow = false; g.add(s); }
  const pillar = mesh(cyl(0.5, 0.5, 15, 12), new THREE.MeshStandardMaterial({color:0x6f9fe8, emissive:0x3f78d8, emissiveIntensity:1.1, transparent:true, opacity:0.55, flatShading:true}), 0, 7.5, 0);
  pillar.castShadow = false; g.add(pillar);
  const core = mesh(cyl(0.16, 0.16, 15, 8), glow(0xd8ecff, 2.4).clone(), 0, 7.5, 0); g.add(core);
  const runeBase = new THREE.Color(0x7fd6ff), coreBase = new THREE.Color(0xd8ecff);

  // slate behind the focused grid + legend: hides the pillar and the rings behind it
  const plateGeo = new THREE.PlaneGeometry(1, 1);
  const edge = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0, depthWrite:false}));
  const plate = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({color:0x0b1020, transparent:true, opacity:0, depthWrite:false}));
  g.add(edge, plate);

  const legend = new THREE.Group(); g.add(legend);
  // one group per category that has skills, plus "Other" for skills whose cat isn't defined (so none are lost)
  const SC = DATA.skillCategories || {}, skills = DATA.skills || [];
  const cats = Object.keys(SC).map(key => ({label:SC[key].label || key, col:CAT[SC[key].color] || COL.muted, list:skills.filter(s => s.cat === key)}))
    .concat({label:'Other', col:COL.ink, list:skills.filter(s => !SC[s.cat])}).filter(c => c.list.length);
  const LH = cats.length*RH, Y0 = Math.max(1.1, LH/2 + 0.45);   // lowest ring high enough that its card clears the floor
  const PH = Math.max(15, Y0 + cats.length*1.75 + 2);            // pillar tall enough for every ring
  pillar.scale.y = core.scale.y = PH/15; pillar.position.y = core.position.y = PH/2;
  cats.forEach((cat, i) => {
    const col = cat.col, list = cat.list;
    const y = Y0 + i*1.75, r = Math.max(1.8, list.length*1.85/(Math.PI*2));
    const rg = new THREE.Group(); g.add(rg);
    const torus = mesh(new THREE.TorusGeometry(r, 0.025, 6, 72), glow(new THREE.Color(col).getHex(), 1.3).clone(), 0, y - 0.32, 0);
    torus.material.transparent = true; torus.rotation.x = Math.PI/2; torus.castShadow = false; rg.add(torus);
    // one soft halo texture per category, shared by its tiles (each tile gets its own material for opacity)
    const halo = canvasTex(TW + 0.4, TH + 0.4, (ctx, W, H) => {
      ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = col; rr(ctx, 20, 20, W - 40, H - 40, 10); ctx.fill();
    }).tex;
    const tiles = list.map(s => {
      const p = panel(TW, TH, (ctx, W, H, st) => {
        rr(ctx, 3, 3, W - 6, H - 6, 10); ctx.fillStyle = st.hover ? 'rgba(22,28,48,.97)' : 'rgba(12,16,30,.95)'; ctx.fill();
        ctx.lineWidth = st.hover ? 3 : 2; ctx.strokeStyle = col; ctx.stroke();
        ctx.fillStyle = col; rr(ctx, 11, 12, 5, H - 24, 2); ctx.fill();
        // long names: shrink to 15px, then wrap onto two lines (ellipsis only past that)
        fitFont(ctx, s.name, W - 40, 20, 600, FB, 15); ctx.textBaseline = 'middle'; ctx.fillStyle = COL.ink;
        if(ctx.measureText(s.name).width <= W - 40) ctx.fillText(s.name, 26, H/2 + 1);
        else { ctx.font = `600 14px ${FB}`; para(ctx, s.name, 26, H/2 - 7, W - 38, 16, 2); }
      });
      const h = new THREE.Mesh(new THREE.PlaneGeometry(TW + 0.4, TH + 0.4), new THREE.MeshBasicMaterial({map:halo, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false}));
      h.position.z = -0.02; h.visible = false; p.add(h);
      p.userData.halo = h; p.userData.hov = 0;
      rg.add(p); return p;
    });
    const lab = panel(2.6, LABH, (ctx, W, H) => {
      fitFont(ctx, cat.label, W - 70, 26, 400, FD, 16); ctx.fillStyle = col; ctx.fillText(cat.label, 6, 8);
      const lw = ctx.measureText(cat.label).width; eyebrow2(ctx, `${list.length} skills`, lw + 18, 17);
      ctx.fillStyle = col; ctx.fillRect(6, H - 10, W - 12, 2);
    });
    lab.material.opacity = 0; rg.add(lab);
    // legend row: rune pip on a shared vertical line, name, count. Top ring sits on top.
    const row = panel(LW, RH, (ctx, W, H, st) => {
      const cx = 14, cy = H/2, on = st.focus;
      ctx.fillStyle = 'rgba(173,186,222,.35)';
      ctx.fillRect(cx - 1, i === cats.length - 1 ? cy : 0, 2, (i === 0 || i === cats.length - 1) ? H/2 : H);
      ctx.beginPath(); const d = on ? 8 : 5.5; ctx.moveTo(cx, cy - d); ctx.lineTo(cx + d, cy); ctx.lineTo(cx, cy + d); ctx.lineTo(cx - d, cy); ctx.closePath();
      ctx.fillStyle = on ? col : 'rgba(12,16,30,1)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      if(on){ ctx.fillStyle = col; ctx.globalAlpha = 0.16; rr(ctx, 28, 3, W - 30, H - 6, 6); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.textBaseline = 'middle';
      fitFont(ctx, cat.label, W - 76, on ? 17 : 15, on ? 700 : 500, FB, 11); ctx.fillStyle = on ? COL.ink : col; ctx.fillText(cat.label, 36, cy + 1);
      ctx.font = `600 12px ${FM}`; ctx.fillStyle = on ? col : COL.muted; ctx.textAlign = 'right'; ctx.fillText(String(list.length), W - 8, cy + 1);
    });
    row.position.y = (i - (cats.length - 1)/2)*RH; legend.add(row);
    const ring = {grp:rg, y, r, tiles, lab, torus, row, ang: rnd()*6, spin: (i % 2 ? 1 : -1)*0.12, amt:0, dy:0, n:list.length, cols:1, rows:1, col:new THREE.Color(col)};
    rings.push(ring);
    items.push(item({obj:rg, hits:[rg, row], setFocus(on){ setPanel(row, {focus:on}); }, label:`${cat.label}, ${list.length} skills: ${list.map(s => s.name).join(', ')}`}));
  });
  function eyebrow2(ctx, text, x, size){ ctx.font = `700 ${size*0.8}px ${FM}`; ctx.fillStyle = COL.muted; ctx.fillText(text.toUpperCase(), x, size); }

  // focused-card extents relative to (x 0, ring y). Written into C, no allocations per frame.
  const C = {l:0, r:0, t:0, b:0, lx:0, ly:0, gh:0, gw:0};
  let narrowNow = null;
  const relayout = narrow => { narrowNow = narrow; rings.forEach(rg => { rg.cols = Math.min(rg.n, narrow ? 2 : 4); rg.rows = Math.ceil(rg.n/rg.cols); }); };
  function card(rg, narrow){
    const gw = rg.cols*SX - (SX - TW), gh = rg.rows*SY - (SY - TH), labTop = gh/2 + 0.1 + LABH;
    C.gw = gw; C.gh = gh;
    if(narrow){   // legend above the label, left-aligned with the grid (above, so low rings never dip into the floor)
      C.lx = -gw/2 + LW/2; C.ly = labTop + LGAP*0.5 + LH/2;
      C.l = -gw/2; C.r = Math.max(gw/2, -gw/2 + LW); C.t = labTop + LGAP*0.5 + LH; C.b = -gh/2;
    } else {      // legend column to the left of the grid
      C.lx = -gw/2 - LGAP - LW/2; C.ly = 0;
      C.l = -gw/2 - LGAP - LW; C.r = gw/2; C.t = Math.max(labTop, LH/2); C.b = Math.min(-gh/2, -LH/2);
    }
    return C;
  }

  const ease = f => f*f*(3 - 2*f);
  const vc = new V3(), vv = view(vc, 1, 1);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let moved = false, hovered = null;
  if(!touch) addEventListener('pointermove', e => { ndc.set(e.clientX/innerWidth*2 - 1, -(e.clientY/innerHeight)*2 + 1); moved = true; });

  const room = {group:g, items, start: Math.min(2, items.length - 1), follow:true, vertical:true,
    view(narrow){
      if(narrow !== narrowNow) relayout(narrow);
      const rg = rings[room.focus], c = card(rg, narrow);
      // constant zoom across categories: frame at least a full-width (max columns) card
      const minW = (narrow ? 2 : 4)*SX - (SX - TW) + (narrow ? 0 : LGAP + LW);
      vc.set((c.l + c.r)/2, rg.y + (c.t + c.b)/2, GZ);
      vv.w = Math.max(c.r - c.l, minW) + 0.8; vv.h = c.t - c.b + 0.9;
      return vv;
    },
    onFocus(){ if(hovered){ setPanel(hovered, {hover:false}); hovered = null; } },
    light:{key:[0, 8, 6, 0x9ab8ff, 1.2], fill:[0, 2, 4, 0xb48cff, 0.6]}, heroSpot:new V3(5.0, 0, 1.4),
    update(t, dt){
      const narrow = camera.aspect < 1.05; if(narrow !== narrowNow) relayout(narrow);
      const k = reduce ? 1 : Math.min(1, dt*4), F = rings[room.focus], c = card(F, narrow);
      // rings above/below part so nothing overlaps the focused card
      const upY = Math.max(0, c.t + 1.1 - 1.75), downY = Math.min(0, c.b - 0.8 + 1.75);
      const ff = ease(F.amt);
      plate.position.set((c.l + c.r)/2, F.y + (c.t + c.b)/2, GZ - 0.12); plate.scale.set(c.r - c.l + 0.5, c.t - c.b + 0.5, 1);
      edge.position.set(plate.position.x, plate.position.y, GZ - 0.13); edge.scale.set(plate.scale.x + 0.05, plate.scale.y + 0.05, 1);
      plate.material.opacity = 0.96*ff; edge.material.opacity = 0.55*ff; edge.material.color.copy(F.col);
      legend.position.x += (c.lx - legend.position.x)*k; legend.position.y += (F.y + c.ly - legend.position.y)*k; legend.position.z = GZ;
      rune.material.emissive.copy(runeBase).lerp(F.col, 0.6*ff); rune.material.emissiveIntensity = 1.1 + (reduce ? 0 : Math.sin(t*1.7)*0.4);
      core.material.emissive.copy(coreBase).lerp(F.col, 0.25*ff);

      if(moved){
        moved = false; ray.setFromCamera(ndc, camera);
        const h = g.visible && ff > 0.9 ? ray.intersectObjects(F.tiles, false)[0] : null;
        const p = h ? h.object : null;
        if(p !== hovered){ hovered && setPanel(hovered, {hover:false}); p && setPanel(p, {hover:true}); hovered = p; }
      }
      rings.forEach((rg, i) => {
        const on = rg === F;
        rg.amt += ((on ? 1 : 0) - rg.amt)*k;
        rg.dy += ((i > room.focus ? upY : i < room.focus ? downY : 0) - rg.dy)*k;
        rg.grp.position.y = rg.dy;
        if(!reduce) rg.ang += rg.spin*dt*(1 - rg.amt);
        const f = ease(rg.amt), cols = rg.cols, rows = rg.rows;
        for(let j = 0; j < rg.n; j++){
          const p = rg.tiles[j], a = rg.ang + j*Math.PI*2/rg.n, row = Math.floor(j/cols), inRow = Math.min(cols, rg.n - row*cols), cc = j - row*cols;
          const gx = (cc - (inRow - 1)/2)*SX, gy = rg.y + ((rows - 1)/2 - row)*SY;
          p.position.set(Math.sin(a)*rg.r*(1 - f) + gx*f, rg.y + (gy - rg.y)*f, Math.cos(a)*rg.r*(1 - f) + GZ*f);
          p.rotation.y = Math.atan2(Math.sin(a), Math.cos(a))*(1 - f);
          p.material.opacity = 0.3 + 0.7*f;
          const u = p.userData; u.hov += ((p === hovered ? 1 : 0) - u.hov)*(reduce ? 1 : Math.min(1, dt*10));
          p.scale.setScalar(1 + 0.05*u.hov);
          // idle glow: a slow wave across the grid; hover brightens it
          u.halo.visible = f > 0.02;
          u.halo.material.opacity = f*(0.16 + (reduce ? 0.06 : 0.1*Math.sin(t*1.6 - j*0.55)) + 0.45*u.hov);
        }
        rg.torus.material.opacity = 1 - 0.9*f;
        // label only shows on the focused card (the legend names the rest): top-left of the grid
        if(on) rg.lab.position.set(-c.gw/2 + 1.3, rg.y + c.gh/2 + 0.1 + LABH/2, GZ);
        rg.lab.material.opacity = f; rg.lab.visible = f > 0.02;
      });
    }};
  return room;
}
