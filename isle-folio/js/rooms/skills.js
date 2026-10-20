/* ---- Runespire: the Rune tower (skills orbit, focused category unfolds) ----
   Each category is a ring of tiles orbiting the crystal pillar. The focused ring unfolds into a grid on a
   dark slate in front of the camera, the rings above/below part to make room, and a rune column (one row
   per category, top ring on top) shows where you are in the stack. Rows are clickable. */
import { THREE, V3, reduce, touch, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { camera } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, CAT, canvasTex, panel, setPanel, rr, fitFont, para } from '../panels.js';
import { view, item, floorDisc } from './kit.js';

const GZ = 4.3, TW = 1.6, TH = 0.48, SX = 1.72, SY = 0.6;   // grid depth, tile size, tile pitch
const LW = 1.75, RH = 0.34, LGAP = 0.4, LABH = 0.58;          // legend width, legend row height, gaps

export default function build(){
  const g = new THREE.Group(), items = [], rings = [];
  g.add(floorDisc(9, 0x2c313c, 12));
  // materials we animate are cloned: engine's glow()/mat() are cached and shared with other rooms
  const rune = mesh(new THREE.TorusGeometry(2.2, 0.04, 6, 64), glow(0x7fd6ff, 1.4).clone(), 0, 0.02, 0); rune.rotation.x = Math.PI/2; g.add(rune);
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
  const deco = decor(g, PH);   // tower architecture + set dressing (behind the content plane only)
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
      deco(t, dt, F.col, ff);

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

/* ---- Tower dressing: rune-carved walls, star charts, arcane floor, cold braziers, lecterns, crystals, motes.
   Everything sits behind the content plane (z < GZ - 0.2) or on the floor, repeated parts are instanced, no lights
   (glow materials + additive sprites only). Returns a per-frame animator. */
function decor(root, PH){
  const g = new THREE.Group(); root.add(g);
  const HALF = Math.PI/2, WR = 9.5, WH = Math.max(15, Math.ceil(PH + 2));
  const D = new THREE.Object3D(), tint = new THREE.Color();
  const onWall = (a, r, y) => D.position.set(Math.sin(a)*r, y, Math.cos(a)*r);
  function inst(geo, m, n, place, colors){
    const im = new THREE.InstancedMesh(geo, m, n);
    for(let i = 0; i < n; i++){
      D.position.set(0, 0, 0); D.rotation.set(0, 0, 0); D.scale.set(1, 1, 1);
      place(i, D); D.updateMatrix(); im.setMatrixAt(i, D.matrix);
      if(colors) im.setColorAt(i, tint.setHex(colors[i % colors.length]));
    }
    im.receiveShadow = true; g.add(im); return im;
  }
  function radial(inner, outer, stops){   // soft additive dot, drawn once
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, inner, 32, 32, outer);
    stops.forEach(([o, col]) => gr.addColorStop(o, col)); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const dot = radial(0, 32, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(200,235,255,.65)'], [1, 'rgba(120,180,255,0)']]);
  const stone = mat(0x464c5f), stoneDk = mat(0x30343f), white = mat(0xffffff);

  /* walls: stone shell, pilasters with plinths/capitals, diamond-profile string courses, ashlar blocks, rune slits */
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, WH, 28, 1, true, HALF, Math.PI), mat(0x3b4050, {side:THREE.DoubleSide}));
  wall.position.y = WH/2; wall.receiveShadow = true; g.add(wall);
  const PA = k => HALF + 0.09 + k*0.42;   // 8 pilasters, 7 bays between them
  inst(box(0.75, WH, 0.45), stone, 8, (i, d) => { onWall(PA(i), 9.3, WH/2); d.rotation.y = PA(i); });
  inst(box(1.05, 1, 0.7), stoneDk, 16, (i, d) => { const k = i >> 1, top = i & 1; onWall(PA(k), 9.2, top ? WH - 0.35 : 0.5); d.rotation.y = PA(k); d.scale.y = top ? 0.7 : 1; });
  const tiers = []; for(let y = 4.6; y < WH - 1.5; y += 3.4) tiers.push(y);
  const ledgeGeo = new THREE.TorusGeometry(9.36, 0.14, 4, 32, Math.PI);
  [0.95, ...tiers, WH - 0.05].forEach(y => { const l = mesh(ledgeGeo, stoneDk, 0, y, 0); l.rotation.x = -HALF; l.castShadow = false; g.add(l); });
  const near = (a, list, gap) => list.some(b => Math.abs(a - b) < gap);
  const pil = [...Array(8)].map((_, k) => PA(k));
  const ash = [];
  while(ash.length < 90){
    const a = HALF + 0.04 + rnd()*(Math.PI - 0.08), y = 1.4 + rnd()*(WH - 2.2);
    if(!near(a, pil, 0.1) && !tiers.some(t => Math.abs(t - y) < 0.4)) ash.push([a, y, 0.7 + rnd()*0.8]);
  }
  inst(box(1, 0.42, 0.12), white, ash.length, (i, d) => { onWall(ash[i][0], 9.46, ash[i][1]); d.rotation.y = ash[i][0]; d.scale.x = ash[i][2]; }, [0x434a5d, 0x353a49, 0x4b5266, 0x3e4456]);
  // carved rune slits: one per bay, tier alternating (the glow is shared and slowly breathes)
  const slitMat = glow(0x9ab8ff, 1.1).clone();
  inst(box(0.25, 1.6, 0.1), slitMat, 7, (k, d) => { const a = HALF + 0.3 + k*0.42; onWall(a, 9.4, 3 + (k%3)*3.4); d.rotation.y = a; });
  inst(box(0.12, 0.12, 0.06), slitMat, 28, (i, d) => { const k = i >> 2, a = HALF + 0.3 + k*0.42, j = i & 3; onWall(a, 9.38, 3 + (k%3)*3.4 + (j < 2 ? 1.05 + j*0.22 : -1.05 - (j - 2)*0.22)); d.rotation.set(0, a, Math.PI/4); });

  /* star charts: one per bay on another tier, slowly turning in their frames */
  const chart = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = 'rgba(10,16,34,.92)'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    x.strokeStyle = 'rgba(150,200,255,.75)'; x.lineWidth = 2;
    [120, 104, 62, 30].forEach(r => { x.beginPath(); x.arc(128, 128, r, 0, 7); x.stroke(); });
    x.lineWidth = 1.5;
    for(let i = 0; i < 48; i++){ const a = i/48*Math.PI*2, r0 = i % 4 ? 112 : 104; x.beginPath(); x.moveTo(128 + Math.cos(a)*r0, 128 + Math.sin(a)*r0); x.lineTo(128 + Math.cos(a)*120, 128 + Math.sin(a)*120); x.stroke(); }
    for(let i = 0; i < 12; i++){ const a = i/12*Math.PI*2; x.beginPath(); x.moveTo(128 + Math.cos(a)*30, 128 + Math.sin(a)*30); x.lineTo(128 + Math.cos(a)*104, 128 + Math.sin(a)*104); x.strokeStyle = 'rgba(150,200,255,.22)'; x.stroke(); }
    const st = [...Array(26)].map(() => { const a = rnd()*7, r = 34 + rnd()*66; return [128 + Math.cos(a)*r, 128 + Math.sin(a)*r]; });
    x.strokeStyle = 'rgba(190,225,255,.6)'; x.lineWidth = 1.2; x.beginPath();
    [[0,1,2,3],[5,6,7],[9,10,11,12,9],[14,15,16]].forEach(path => path.forEach((j, n) => n ? x.lineTo(...st[j]) : x.moveTo(...st[j]))); x.stroke();
    x.fillStyle = '#eaf6ff'; st.forEach(([sx, sy], i) => { x.beginPath(); x.arc(sx, sy, i % 5 ? 1.8 : 3.2, 0, 7); x.fill(); });
    x.fillStyle = '#b48cff'; x.beginPath(); x.arc(128, 128, 6, 0, 7); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const chartGeo = new THREE.CircleGeometry(1.12, 24), chartMat = new THREE.MeshBasicMaterial({map:chart, transparent:true, color:0xb8c8ec});
  const frameGeo = new THREE.TorusGeometry(1.16, 0.07, 4, 24), frameMat = glow(0x6f8fd8, 0.35);
  const charts = [];
  [0, 1, 2, 4, 5, 6].forEach(k => {
    const a = HALF + 0.3 + k*0.42, y = 2.8 + ((k%3 + 1)%3)*3.4 + (k%3 === 1 ? 0.1 : 0);
    if(y > WH - 2) return;
    const c = new THREE.Mesh(chartGeo, chartMat); c.position.set(Math.sin(a)*9.3, y, Math.cos(a)*9.3); c.rotation.set(0, a + Math.PI, rnd()*6); g.add(c); charts.push(c);
    const f = new THREE.Mesh(frameGeo, frameMat); f.position.set(Math.sin(a)*9.32, y, Math.cos(a)*9.32); f.rotation.y = a; g.add(f);
  });

  /* vaulted half-dome cap with a cornice */
  const vault = new THREE.Mesh(new THREE.ConeGeometry(WR, 5, 16, 1, true, HALF, Math.PI), mat(0x2b2f3b, {side:THREE.DoubleSide}));
  vault.position.y = WH + 2.5; g.add(vault);
  inst(box(0.3, 0.3, 10.6), stoneDk, 5, (i, d) => { const a = HALF + (i + 0.5)*Math.PI/5; d.position.set(Math.sin(a)*4.75, WH + 2.5, Math.cos(a)*4.75); d.rotation.set(0, a, 0, 'YXZ'); d.rotation.x = Math.atan2(5, WR); });

  /* floor: flagstone rings, stepped dais, glowing circles, a seven-pointed star (one point per ring) and rune ticks */
  const slab = (r0, r1, n, gap) => { const geo = new THREE.RingGeometry(r0, r1, 3, 1, -Math.PI/n + gap, Math.PI*2/n - gap*2); geo.rotateX(-HALF); return geo; };
  inst(slab(4.25, 5.35, 24, 0.012), white, 24, (i, d) => { d.position.y = 0.012; d.rotation.y = i*Math.PI/12; }, [0x363b48, 0x2f3440, 0x3a3f4d]);
  inst(slab(5.45, 8.85, 16, 0.008), white, 16, (i, d) => { d.position.y = 0.012; d.rotation.y = (i + 0.5)*Math.PI/8; }, [0x323744, 0x3a3f4e, 0x2d313c, 0x363b49]);
  g.add(mesh(cyl(1.45, 1.55, 0.2, 12), stoneDk, 0, 0.1, 0), mesh(cyl(1.0, 1.1, 0.2, 12), stone, 0, 0.3, 0));
  const lineMat = glow(0x7fd6ff, 1.2).clone();
  [3.05, 4.05].forEach(r => { const c = mesh(new THREE.TorusGeometry(r, 0.03, 4, 64), lineMat, 0, 0.025, 0); c.rotation.x = HALF; c.castShadow = false; g.add(c); });
  const SR = 4.0, starP = k => [Math.sin(k*Math.PI*2/7)*SR, -Math.cos(k*Math.PI*2/7)*SR];
  inst(box(1, 0.02, 0.05), lineMat, 7, (k, d) => {
    const [x0, z0] = starP(k), [x1, z1] = starP(k + 3);
    d.position.set((x0 + x1)/2, 0.03, (z0 + z1)/2); d.rotation.y = -Math.atan2(z1 - z0, x1 - x0); d.scale.x = Math.hypot(x1 - x0, z1 - z0);
  });
  inst(box(0.07, 0.025, 0.32), lineMat, 42, (i, d) => { const a = i/42*Math.PI*2, r = i % 3 ? 2.65 : 2.6; d.position.set(Math.sin(a)*r, 0.03, Math.cos(a)*r); d.rotation.y = a; d.scale.z = i % 3 ? 1 : 1.6; });

  /* cold-fire braziers */
  const BA = [HALF + 0.45, HALF + 1.2, 3*HALF - 1.2, 3*HALF - 0.45], BR = 7.5;
  const iron = mat(0x2a2d36), ironHi = mat(0x4a5060);
  inst(cyl(0.12, 0.34, 1.0, 6), iron, 4, (i, d) => d.position.set(Math.sin(BA[i])*BR, 0.5, Math.cos(BA[i])*BR));
  inst(cyl(0.58, 0.3, 0.38, 8), ironHi, 4, (i, d) => d.position.set(Math.sin(BA[i])*BR, 1.17, Math.cos(BA[i])*BR));
  inst(new THREE.TorusGeometry(0.58, 0.05, 4, 8), iron, 4, (i, d) => { d.position.set(Math.sin(BA[i])*BR, 1.36, Math.cos(BA[i])*BR); d.rotation.x = HALF; });
  inst(cyl(0.5, 0.5, 0.06, 8), glow(0x4fb8ff, 1.8), 4, (i, d) => d.position.set(Math.sin(BA[i])*BR, 1.34, Math.cos(BA[i])*BR));
  const flameO = new THREE.ConeGeometry(0.34, 1.0, 6), flameI = new THREE.ConeGeometry(0.17, 0.62, 5);
  const fOut = new THREE.MeshBasicMaterial({color:0x6fcfff, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending, depthWrite:false});
  const fIn = new THREE.MeshBasicMaterial({color:0xe6f7ff, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false});
  const haloMat = new THREE.SpriteMaterial({map:dot, color:0x7fc8ff, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false});
  const flames = BA.map((a, i) => {
    const x = Math.sin(a)*BR, z = Math.cos(a)*BR;
    const o = new THREE.Mesh(flameO, fOut), n = new THREE.Mesh(flameI, fIn), h = new THREE.Sprite(haloMat.clone());
    o.position.set(x, 1.86, z); n.position.set(x, 1.68, z); h.position.set(x, 1.8, z); h.scale.setScalar(2.6);
    g.add(o, n, h); return {o, n, h, p:i*1.7};
  });

  /* lecterns with open spellbooks, a hovering glyph and a stack of tomes */
  const wood = mat(0x3d3340), page = mat(0xe8dfc8), glyphMat = glow(0xb48cff, 2);
  const covers = [mat(0x6b3a52), mat(0x2f4a6b), mat(0x4f3a6b), mat(0x3d5a4a)];
  const glyphs = [];
  [HALF + 0.78, 3*HALF - 0.78].forEach((a, s) => {
    const L = new THREE.Group(); L.position.set(Math.sin(a)*6.6, 0, Math.cos(a)*6.6); L.rotation.y = a + Math.PI; g.add(L);
    L.add(mesh(box(0.7, 0.08, 0.5), wood, 0, 0.04, 0), mesh(cyl(0.06, 0.09, 1.0, 6), wood, 0, 0.55, 0));
    const top = new THREE.Group(); top.position.set(0, 1.1, 0); top.rotation.x = -0.38; L.add(top);
    top.add(mesh(box(0.8, 0.05, 0.56), wood, 0, 0, 0), mesh(box(0.74, 0.03, 0.5), covers[s], 0, 0.04, 0));
    const pl = mesh(box(0.34, 0.03, 0.44), page, -0.18, 0.07, 0), pr = mesh(box(0.34, 0.03, 0.44), page, 0.18, 0.07, 0);
    pl.rotation.z = 0.08; pr.rotation.z = -0.08; top.add(pl, pr);
    const gl = mesh(new THREE.OctahedronGeometry(0.07, 0), glyphMat, 0, 1.55, 0.05); gl.castShadow = false; L.add(gl); glyphs.push(gl);
    for(let b = 0; b < 3; b++){ const t = mesh(box(0.5 - b*0.06, 0.12, 0.36 - b*0.03), covers[(b + s*2) % 4], (s ? 0.75 : -0.75), 0.06 + b*0.12, 0.15); t.rotation.y = (b - 1)*0.25; L.add(t); }
  });

  /* crystals: drifting shards along the walls, clusters at the wall foot, and a crown crystal on the pillar */
  const shard = new THREE.OctahedronGeometry(0.32, 0);
  const cMats = [mat(0x8fd8ff, {emissive:0x2a7fd0, emissiveIntensity:0.9}), mat(0xc4a4ff, {emissive:0x6a3fd0, emissiveIntensity:0.85})];   // facets stay readable
  const floaters = cMats.map(() => []);
  for(let i = 0; i < 18; i++){ const a = HALF + 0.12 + rnd()*(Math.PI - 0.24); floaters[i & 1].push({a, r:7.6 + rnd()*1.0, y:2.2 + rnd()*(WH - 4), s:0.6 + rnd()*0.8, ph:rnd()*6, sp:0.3 + rnd()*0.4}); }
  const fl = floaters.map((list, j) => inst(shard, cMats[j], list.length, (i, d) => place(list[i], d, 0)));
  function place(c, d, t){ onWall(c.a, c.r, c.y + Math.sin(t*0.7 + c.ph)*0.18); d.rotation.set(0.3, c.ph + t*c.sp, 0); d.scale.set(c.s*0.7, c.s*1.5, c.s*0.7); }
  const clusters = [];
  [HALF + 0.3, HALF + 0.72, 3*HALF - 0.72, 3*HALF - 0.3].forEach(a => { for(let j = 0; j < 4; j++) clusters.push([a + (rnd() - 0.5)*0.12, 8.6 + rnd()*0.4, 0.8 + rnd()*1.4, (rnd() - 0.5)*0.8, (rnd() - 0.5)*0.8]); });
  inst(shard, cMats[0], clusters.length, (i, d) => { const [a, r, h, rx, rz] = clusters[i]; onWall(a, r, h*0.4); d.rotation.set(rx, rnd()*6, rz); d.scale.set(0.6 + h*0.2, h, 0.6 + h*0.2); });
  const crown = mesh(new THREE.OctahedronGeometry(0.6, 0), mat(0xd8ecff, {emissive:0x5f9fe8, emissiveIntensity:1.2}), 0, PH + 0.8, 0); crown.scale.y = 1.7; g.add(crown);
  const crownRing = mesh(new THREE.TorusGeometry(1.0, 0.04, 4, 24), glow(0x9ab8ff, 1.6), 0, PH + 0.8, 0); crownRing.rotation.x = 1.2; g.add(crownRing);

  /* motes: a slow inner swirl round the pillar (radius < 3.6, so always behind the content plane) and sparks rising along the walls */
  const mk = (n, fn, col, size) => {
    const pos = new Float32Array(n*3); for(let i = 0; i < n; i++) pos.set(fn(i), i*3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({map:dot, color:col, size, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false}));
    g.add(p); return p;
  };
  const swirl = mk(70, () => { const a = rnd()*7, r = 1.0 + rnd()*2.5; return [Math.sin(a)*r, 0.6 + rnd()*(PH - 0.6), Math.cos(a)*r]; }, 0xa8dcff, 0.14);
  const rise = mk(60, () => { const a = HALF + rnd()*Math.PI, r = 6.2 + rnd()*3; return [Math.sin(a)*r, rnd()*WH, Math.cos(a)*r]; }, 0xc6a8ff, 0.18);
  const rp = rise.geometry.attributes.position, rSpd = [...Array(60)].map(() => 0.25 + rnd()*0.45);

  g.traverse(o => { o.castShadow = false; o.raycast = () => {}; });   // pure dressing: never cast, never steal clicks
  const slitBase = slitMat.emissiveIntensity, lineCol = new THREE.Color(0x7fd6ff);

  return function animate(t, dt, focusCol, ff){
    lineMat.emissive.copy(lineCol).lerp(focusCol, 0.5*ff);
    if(reduce) return;
    slitMat.emissiveIntensity = slitBase + Math.sin(t*0.9)*0.35;
    lineMat.emissiveIntensity = 1.1 + Math.sin(t*1.3 + 1)*0.3;
    for(const c of charts) c.rotation.z += dt*0.03;
    flames.forEach(f => {
      const k = 1 + Math.sin(t*9 + f.p)*0.08 + Math.sin(t*13.7 + f.p*2)*0.06;
      f.o.scale.set(1/k, k, 1/k); f.n.scale.set(1, 2 - k, 1); f.o.rotation.y = t*0.8 + f.p;
      f.h.material.opacity = 0.5 + (k - 1)*0.9;
    });
    glyphs.forEach((gl, i) => { gl.position.y = 1.55 + Math.sin(t*1.4 + i*2)*0.08; gl.rotation.y = t*1.2; });
    fl.forEach((im, j) => { floaters[j].forEach((c, i) => { place(c, D, t); D.updateMatrix(); im.setMatrixAt(i, D.matrix); }); im.instanceMatrix.needsUpdate = true; });
    crown.rotation.y = t*0.4; crownRing.rotation.z = t*0.25;
    swirl.rotation.y = t*0.06;
    for(let i = 0; i < 60; i++){ let y = rp.getY(i) + rSpd[i]*dt; if(y > WH) y -= WH; rp.setY(i, y); }
    rp.needsUpdate = true;
  };
}
