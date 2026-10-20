/* ---- Runespire: inside the rune tower (one standing stone per skill category, its skills carved on the face) ----
   The tower's octagon from inside, in the exterior's language: the stepped plinth as a dais, banded courses, rune-slit
   windows, the arched door with its violet keystone, the balcony as a gallery with a gold rail, and the steep blue
   roof with its crystal finial hanging inside as a lamp. A runestone stands in an arched niche on every wall but the
   door's; the camera stands in the middle and turns from stone to stone. The focused stone's carving, keystone,
   ley line and foot glow light up in its category colour. */
import { THREE, V3, reduce, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, CAT, panel, fitFont, para } from '../panels.js';
import { view, item } from './kit.js';

const SW = 3.7, SD = 1.0;               // stone width, depth
const PW = 3.1, PH = 3.9, UP = 0.16;   // carved face width, its minimum height, camera tilt (looks a little down)
const ROW = 36, HEAD = 134;            // carving: min skill row height, header + margins (canvas px, 100 per unit)
const NW = SW + 1.0, RISE = 1.1;       // niche opening width, arch rise
const STONE = 0x767a87, STONE_D = 0x4a4e5a, ROOF = 0x3b3d78, GOLD = 0xc9a24a, CYAN = 0x6fe3ff, VIOLET = 0xb48cff;   // the exterior's palette
const mctx = document.createElement('canvas').getContext('2d');
// a glowing part that keeps its hue under the room lights (glow() adds emissive on top of a same-coloured base, which clips to white here)
const ember = (c, k) => mat(0x101218, {emissive:c, emissiveIntensity:k}).clone();
// carved face height for a category: grows with its rows (and a wrapped title) so a big category is a taller stone, never a cramped one
function faceH(cat){
  const n = cat.list.length, rows = Math.ceil(n/(n > 6 ? 2 : 1));
  mctx.font = `400 22px ${FD}`; const two = mctx.measureText(cat.label).width > PW*100 - 60;
  return Math.max(PH, (HEAD + (two ? 30 : 0) + rows*ROW)/100);
}

function dot(){   // soft white dot, tinted per use
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
// a rough-hewn monolith: tapered, slanted top, base at y 0. Vertices are nudged by a hash of their position (so the
// box's duplicated face vertices move together); the front face (+z) only sinks back, never forward through the carving.
function monolith(w, h, d, slant){
  const geo = new THREE.BoxGeometry(w, h, d, 3, 5, 1), p = geo.attributes.position;
  const hash = (x, y, z, k) => { const v = Math.sin(x*127.1 + y*311.7 + z*74.7 + k*19.3)*43758.5; return v - Math.floor(v) - 0.5; };
  for(let i = 0; i < p.count; i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), e = 0.09*Math.min(w, d);
    const t = (y/h + 0.5), nx = x*(1 - 0.14*t) + hash(x, y, z, 1)*e, nz = z + (z > 0 ? -Math.abs(hash(x, y, z, 2))*e : hash(x, y, z, 2)*e);
    p.setXYZ(i, nx, y + hash(x, y, z, 3)*e + (y > h/2 - 0.01 ? Math.sign(x)*slant : 0), nz);
  }
  geo.translate(0, h/2, 0); geo.computeVertexNormals(); return geo;
}
const diamond = (ctx, x, y, d) => { ctx.beginPath(); ctx.moveTo(x, y - d); ctx.lineTo(x + d*0.7, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d*0.7, y); ctx.closePath(); ctx.fill(); };

export default function build(){
  const g = new THREE.Group(), items = [], stones = [], tex = dot();
  // one stone per category that has skills, plus "Other" for skills whose cat isn't defined (so none are lost)
  const SC = DATA.skillCategories || {}, skills = DATA.skills || [];
  const cats = Object.keys(SC).map(key => ({label:SC[key].label || key, col:CAT[SC[key].color] || COL.muted, list:skills.filter(s => s.cat === key)}))
    .concat({label:'Other', col:COL.ink, list:skills.filter(s => !SC[s.cat])}).filter(c => c.list.length);
  const n = cats.length, S = Math.max(8, n + 1);   // the tower's octagon: a wall per stone plus the door's (more sides past 7 categories)
  const T = Math.tan(Math.PI/S), CS = Math.cos(Math.PI/S), WA = Math.max(10.7, 3.6/T), RC = WA/CS, WW = 2*WA*T;   // wall apothem, corner radius, wall width
  const R = WA - 1.5, Wa = i => -i*Math.PI*2/S;   // stone ring radius; wall i's angle (wall 0 is the door, at +z as outside; i grows clockwise)
  const wallOf = k => Math.round((k + 1)*S/(n + 1)), start = Math.floor((n - 1)/2);   // stones spread over the other walls; the start one faces the door
  const face = cats.map(cat => { const ph = faceH(cat), SH = ph + 1; return {ph, SH, jh:SH + 0.35}; });   // carving, stone and niche-jamb heights
  const GY = Math.max(9.6, ...face.map(f => f.jh + RISE + 1.4)), TH = GY + 4.2, RH = 9;   // gallery floor, eaves, roof height
  const all = [...Array(S).keys()], stoneM = mat(STONE), dark = mat(STONE_D), gold = mat(GOLD, {metalness:0.4, roughness:0.5}), WHITE = mat(0xffffff, {roughness:0.93});   // own cache key: other rooms use plain white untinted
  const UB = box(1, 1, 1);

  // repeated parts are InstancedMeshes: put(entry, d) poses the dummy and may return a tint (a hex number).
  // Tinted meshes use WHITE only: r128 breaks when one material is shared by tinted and untinted instanced meshes.
  const D = new THREE.Object3D(), C = new THREE.Color();
  function inst(geo, m, list, put){
    const im = new THREE.InstancedMesh(geo, m, list.length);
    list.forEach((e, i) => { D.position.set(0, 0, 0); D.rotation.set(0, 0, 0); D.scale.set(1, 1, 1); const c = put(e, D); D.updateMatrix(); im.setMatrixAt(i, D.matrix); if(typeof c === 'number') im.setColorAt(i, C.setHex(c)); });
    im.receiveShadow = true; im.frustumCulled = false; g.add(im); return im;   // r128 culls instances by the base geometry's sphere at the room centre, which can sit off screen
  }
  // a spot on wall i: u along it (left → right seen from the middle), height y, dz in from its face; turned to face the middle
  const onWall = (o, i, u, y, dz) => { const a = Wa(i), r = WA - dz; o.position.set(Math.sin(a)*r - Math.cos(a)*u, y, Math.cos(a)*r + Math.sin(a)*u); o.rotation.y = a + Math.PI; return o; };
  const corner = (o, i, r, y) => { const a = Wa(i) - Math.PI/S; o.position.set(Math.sin(a)*r, y, Math.cos(a)*r); o.rotation.y = a; return o; };
  // an S-sided prism lined up with the walls (a = apothem)
  const prism = (a, h, y, m, top = a) => { const o = mesh(new THREE.CylinderGeometry(top/CS, a/CS, h, S, 1, false, Math.PI/S), m, 0, y + h/2, 0); g.add(o); return o; };
  // a flat S-gon outline / course between apothems a0 and a1, lying on the floor
  const flatRing = (a0, a1, segs, gap = 0) => { const geo = new THREE.RingGeometry(a0/CS, a1/CS, segs, 1, -Math.PI/2 - Math.PI/S + gap, (segs === S ? Math.PI*2 : Math.PI*2/S) - 2*gap); geo.rotateX(-Math.PI/2); return geo; };

  /* ---------- floor: flagstone courses, a stepped dais (the tower's plinth), glowing inlay ---------- */
  prism(WA + 0.3, 0.4, -0.4, mat(0x24262e));   // mortar bed, shows in the joints
  for(let a0 = 2.7, c = 0; a0 < WA - 0.2; a0 += 1.6, c++){
    // two slabs per wall per course, joints staggered course to course
    const geo = flatRing(a0, Math.min(WA, a0 + 1.55), 1, 0.01);
    inst(geo, WHITE, all, (i, d) => { d.position.y = 0.01; d.rotation.y = Wa(i); return [0x3d414c, 0x363a44, 0x434754, 0x3a3e49][(i + c) % 4]; });
    if(c % 2) inst(UB, mat(0x24262e), all, (i, d) => { const a = Wa(i), r = a0 + 0.78; d.position.set(Math.sin(a)*r, 0.012, Math.cos(a)*r); d.rotation.y = a; d.scale.set(0.05, 0.01, 1.55); });
  }
  const inlay = ember(CYAN, 0.9);
  [2.85, R - 1.3].forEach(a => { const m = new THREE.Mesh(flatRing(a, a + 0.06, S), inlay); m.position.y = 0.025; g.add(m); });
  const runeRing = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({map:runeTex(), color:CYAN, transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false}));
  runeRing.rotation.x = -Math.PI/2; runeRing.position.y = 0.03; g.add(runeRing);
  // a runner from the door to the dais: violet cloth, gold edges, a row of gold lozenges (the door is wall 0, at +z)
  const z0 = 2.6, z1 = WA - 1.25, rl = z1 - z0;
  g.add(mesh(box(1.5, 0.02, rl), mat(0x3b2a58), 0, 0.02, (z0 + z1)/2));
  inst(UB, gold, [-0.7, 0.7], (x, d) => { d.position.set(x, 0.032, (z0 + z1)/2); d.scale.set(0.06, 0.012, rl); });
  inst(UB, gold, [...Array(Math.floor(rl/0.9))].map((_, j) => z0 + 0.45 + j*0.9), (z, d) => { d.position.set(0, 0.032, z); d.rotation.y = Math.PI/4; d.scale.set(0.2, 0.012, 0.2); });
  [[2.5, STONE_D], [1.9, 0x70747f], [1.3, STONE]].forEach(([a, c], j) => { prism(a, 0.18, j*0.18, mat(c)); prism(a + 0.03, 0.035, j*0.18 + 0.165, gold); });

  /* ---------- walls: mortar backing (the masonry goes on once the openings are known), corner columns, string courses ---------- */
  inst(new THREE.PlaneGeometry(WW + 0.1, TH), mat(0x2a2d36), all, (i, d) => { onWall(d, i, 0, TH/2, 0); });
  inst(cyl(0.42, 0.42, 1, 8), stoneM, all, (i, d) => { corner(d, i, RC - 0.35, TH/2); d.scale.y = TH; });
  inst(cyl(0.64, 0.68, 0.55, 8), dark, all, (i, d) => corner(d, i, RC - 0.35, 0.27));
  inst(cyl(0.62, 0.44, 0.45, 8), dark, all, (i, d) => corner(d, i, RC - 0.35, GY - 0.6));
  inst(UB, dark, all.flatMap(i => [[i, 0.3, 0.6, 0.3], [i, TH - 0.25, 0.5, 0.5]]), ([i, y, h, dd], d) => { onWall(d, i, 0, y, dd/2); d.scale.set(WW, h, dd); });

  // what each wall carries: the door (wall 0), a niche with its stone, or nothing; the window sits above whatever is there
  const niche = {}; cats.forEach((_, k) => { niche[wallOf(k)] = k; });
  const DOOR = 5.1;   // top of the door's keystone
  const below = i => i === 0 ? DOOR : niche[i] !== undefined ? face[niche[i]].jh + RISE + 0.55 : 1.2;
  /* ---------- rune-slit windows (the exterior's glowing slits, seen from inside) ---------- */
  const slitM = ember(CYAN, 1.0), wins = [], slits = [], dias = [], holes = all.map(() => []);   // holes: [half width, bottom, top] the masonry leaves clear
  all.forEach(i => {
    const y0 = below(i) + 0.55, y1 = GY - 0.75;
    if(y1 - y0 > 0.9){ wins.push([i, (y0 + y1)/2, 1.7, y1 - y0 + 0.4]); holes[i].push([0.9, y0 - 0.25, y1 + 0.25]); [[-0.45, 0.7], [0, 1], [0.45, 0.7]].forEach(([u, f]) => slits.push([i, u, (y0 + y1)/2, 0.15, (y1 - y0)*f])); }
    const u0 = GY + 0.9, u1 = TH - 0.9;   // upper chamber: a pair of tall slits with a rune diamond over them
    wins.push([i, (u0 + u1)/2, 1.3, u1 - u0 + 0.4]); holes[i].push([0.7, u0 - 0.25, u1 + 0.25]); slits.push([i, -0.22, (u0 + u1)/2 - 0.15, 0.16, u1 - u0 - 0.5], [i, 0.22, (u0 + u1)/2 - 0.15, 0.16, u1 - u0 - 0.5]); dias.push([i, u1 - 0.1]);
  });
  inst(UB, dark, wins, ([i, y, w, h], d) => { onWall(d, i, 0, y, 0.07); d.scale.set(w, h, 0.14); });
  inst(UB, slitM, slits, ([i, u, y, w, h], d) => { onWall(d, i, u, y, 0.15); d.scale.set(w, h, 0.04); }).castShadow = false;
  inst(UB, slitM, dias, ([i, y], d) => { onWall(d, i, 0, y, 0.15); d.rotation.z = Math.PI/4; d.scale.set(0.2, 0.2, 0.04); });

  // coursed masonry: each course is split into the free spans between openings, and every span is filled exactly
  // with blocks of random width (running bond: the first block's width alternates), so stones hug every edge
  const AX = NW/2 + 0.6, E = WW/2 - 0.45;
  const archW = (y, cy, ax, ay) => y < cy ? ax : y < cy + ay ? ax*Math.sqrt(1 - ((y - cy)/ay)**2) : 0;   // half width of an arched opening at height y
  const blocks = [];
  all.forEach(i => {
    for(let r = 0, y = 0.88; y < TH - 0.6; r++, y += 0.52){
      if(Math.abs(y - GY + 0.4) < 0.75) continue;   // behind the gallery and corbels
      const lo = y - 0.25, k = niche[i];
      let hw = 0;
      if(i === 0) hw = archW(lo, 3.4, 1.9, 1.75);
      if(k !== undefined) hw = archW(lo, face[k].jh + 0.2, AX, RISE + 0.75);
      holes[i].forEach(([w, a, b]) => { if(y + 0.25 > a && lo < b) hw = Math.max(hw, w); });
      const spans = hw > 0 ? [[-E, -hw - 0.04], [hw + 0.04, E]] : [[-E, E]];
      spans.forEach(([s0, s1]) => {
        let u = s0, first = true;
        while(s1 - u > 0.12){
          let w = first && r % 2 ? 0.35 + rnd()*0.3 : 0.7 + rnd()*0.6; first = false;
          if(s1 - u - w < 0.45) w = s1 - u;   // last block takes the remainder rather than leave a sliver
          blocks.push([i, u + w/2, y, w - 0.05, 0.07 + rnd()*0.06, rnd()]); u += w;
        }
      });
    }
  });
  const STONES = [0x555a69, 0x4b4f5d, 0x5d6271, 0x474b58, 0x515564];
  inst(UB, WHITE, blocks, ([i, u, y, w, dd, c], d) => { onWall(d, i, u, y, dd/2); d.scale.set(w, 0.47, dd); return STONES[Math.floor(c*STONES.length)]; });

  /* ---------- the door (wall 0): planked door, iron straps, jambs, arch and the violet keystone ---------- */
  const doorG = new THREE.Group(); onWall(doorG, 0, 0, 0, 0); g.add(doorG);
  const doorM = mat(0x2f2433), iron = mat(0x2a2d36);
  doorG.add(mesh(box(2.3, 3.4, 0.12), doorM, 0, 1.7, 0.06));
  const dtop = mesh(cyl(1.15, 1.15, 0.12, 12), doorM, 0, 3.4, 0.06); dtop.rotation.x = Math.PI/2; doorG.add(dtop);
  [0.7, 1.9, 3.1].forEach(y => doorG.add(mesh(box(2.2, 0.09, 0.04), iron, 0, y, 0.14)));
  const handle = mesh(new THREE.TorusGeometry(0.11, 0.025, 4, 10), gold, 0.6, 1.6, 0.16); doorG.add(handle);
  [-1.4, 1.4].forEach(u => doorG.add(mesh(box(0.5, 3.4, 0.5), stoneM, u, 1.7, 0.25)));
  doorG.add(mesh(box(0.38, 0.55, 0.36), ember(VIOLET, 1.4), 0, 3.4 + 1.5, 0.3));
  doorG.add(mesh(box(3.6, 0.12, 1.1), dark, 0, 0.06, 0.55));

  /* ---------- the niches: arched recess, jambs on plinths, imposts, arch ring and a keystone in the stone's colour ---------- */
  const jambs = [], arches = [];
  cats.forEach((cat, k) => { const i = wallOf(k), jh = face[k].jh; [-1, 1].forEach(s => jambs.push([i, s*(NW/2 + 0.25), jh])); arches.push([i, jh]); });
  inst(UB, stoneM, jambs, ([i, u, jh], d) => { onWall(d, i, u, jh/2, 0.25); d.scale.set(0.5, jh, 0.5); });
  inst(UB, dark, jambs, ([i, u], d) => { onWall(d, i, u, 0.25, 0.3); d.scale.set(0.75, 0.5, 0.62); });
  inst(UB, dark, jambs, ([i, u, jh], d) => { onWall(d, i, u, jh + 0.1, 0.3); d.scale.set(0.72, 0.2, 0.62); });
  // arch rings as wedge stones (voussoirs) round a half-ellipse, the crown left for the keystone
  const AR = NW/2 + 0.25, VN = 11, vous = [];
  const ring = (i, cy, ax, ay) => {
    const w = Math.PI*Math.sqrt((ax*ax + ay*ay)/2)/(VN - 1) - 0.06;
    for(let j = 0; j < VN; j++) if(j !== (VN - 1)/2){ const t = Math.PI*(1 - j/(VN - 1)); vous.push([i, Math.cos(t)*ax, cy + Math.sin(t)*ay, Math.atan2(Math.sin(t)/ay, Math.cos(t)/ax) - Math.PI/2, w, j]); }
  };
  arches.forEach(([i, jh]) => ring(i, jh + 0.2, AR, RISE + 0.2));
  ring(0, 3.4, 1.4, 1.4);
  inst(UB, WHITE, vous, ([i, u, y, rz, w, j], d) => { onWall(d, i, u, y, 0.25); d.rotation.z = rz; d.scale.set(w, 0.55, 0.5); return j % 2 ? 0x6c707d : 0x7a7e8b; });

  /* ---------- the runestones ---------- */
  const sigilTex = sigil(), sigilGeo = new THREE.PlaneGeometry(1, 1);
  const poolGeo = new THREE.PlaneGeometry(4.4, 4.4); poolGeo.rotateX(-Math.PI/2);
  cats.forEach((cat, k) => {
    const i = wallOf(k), a = Wa(i), col = cat.col, list = cat.list, c3 = new THREE.Color(col), {ph, SH, jh} = face[k], PY = 0.6 + ph/2;
    const back = new THREE.Mesh(archShape(NW, jh + 0.2, RISE), mat(0x2b2e38)); onWall(back, i, 0, 0, 0.02); g.add(back);   // the recess
    const crown = jh + 0.2 + RISE, sg2 = new THREE.Mesh(sigilGeo, new THREE.MeshBasicMaterial({map:sigilTex, color:c3, transparent:true, opacity:0.3, blending:THREE.AdditiveBlending, depthWrite:false}));
    onWall(sg2, i, 0, (SH + crown)/2 + 0.05, 0.04); sg2.scale.setScalar(Math.min(1.3, (crown - SH)*0.85)); g.add(sg2);   // rune sigil in the recess above the stone
    const key = mesh(box(0.42, 0.6, 0.38), ember(c3.getHex(), 0.4), 0, 0, 0); onWall(key, i, 0, jh + 0.2 + RISE + 0.22, 0.3); key.castShadow = false; g.add(key);
    const sg = new THREE.Group(); sg.position.set(Math.sin(a)*R, 0, Math.cos(a)*R); sg.rotation.y = a + Math.PI; g.add(sg);   // front (+z) faces the middle
    sg.add(mesh(monolith(SW, SH, SD, 0.18*(k % 2 ? 1 : -1)), mat(0x5c5e66), 0, 0, 0));
    sg.add(mesh(box(SW + 0.5, 0.3, SD + 0.5), mat(0x40444f), 0, 0.15, 0));   // plinth
    const p = panel(PW, ph, (ctx, W, H, st) => carve(ctx, W, H, st.focus, cat));
    p.position.set(0, PY, SD/2 + 0.01); sg.add(p);
    // focus dressing: a glow pool at the foot and a ley line from the dais
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({map:tex, color:c3, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false}));
    pool.position.set(0, 0.04, 1.4); sg.add(pool);
    const r0 = 2.85, r1 = R - SD/2 - 0.3, ley = mesh(box(0.06, 0.02, r1 - r0), ember(c3.getHex(), 0.4), Math.sin(a)*(r0 + r1)/2, 0.035, Math.cos(a)*(r0 + r1)/2);
    ley.rotation.y = a; ley.castShadow = false; g.add(ley);
    const rc = R - SD/2, top = jh + 0.2 + RISE + 0.55, nn = new V3(-Math.sin(a), UP, -Math.cos(a)).normalize();
    stones.push({pool, ley, key, sigil:sg2, col:c3, amt:0});
    items.push(item({obj:sg, panels:[p], wide:view(new V3(Math.sin(a)*rc, top/2, Math.cos(a)*rc), NW + 1.4, top + 0.4, nn),
      narrow:view(new V3(Math.sin(a)*rc, PY, Math.cos(a)*rc), SW + 0.5, SH, nn),
      label:`${cat.label}, ${list.length} skills: ${list.map(s => s.name).join(', ')}.`}));
  });

  /* ---------- the gallery (the exterior balcony): corbelled ledge, gold posts and rail ---------- */
  const ringShape = (a0, a1) => {
    const poly = (a, s) => { for(let j = 0; j <= S; j++){ const t = Wa(j) - Math.PI/S, x = Math.sin(t)*a/CS, y = -Math.cos(t)*a/CS; j ? s.lineTo(x, y) : s.moveTo(x, y); } return s; };
    const sh = poly(a1, new THREE.Shape()); sh.holes.push(poly(a0, new THREE.Path())); return sh;
  };
  const GD = 1.6, gal = new THREE.ExtrudeGeometry(ringShape(WA - GD, WA + 0.1), {depth:0.36, bevelEnabled:false}); gal.rotateX(-Math.PI/2);
  g.add(mesh(gal, dark, 0, GY - 0.36, 0));
  const IW = 2*(WA - GD + 0.12)*T;
  inst(UB, dark, all.flatMap(i => [-0.4, -0.22, 0.22, 0.4].map(f => [i, f*WW])), ([i, u], d) => { onWall(d, i, u, GY - 0.55, 0.65); d.scale.set(0.34, 0.38, 1.3); });
  inst(UB, dark, all.flatMap(i => [-0.4, -0.22, 0.22, 0.4].map(f => [i, f*WW])), ([i, u], d) => { onWall(d, i, u, GY - 0.92, 0.4); d.scale.set(0.3, 0.36, 0.8); });
  inst(UB, gold, all.flatMap(i => [-0.5, -0.25, 0, 0.25, 0.5].map(f => [i, f*IW*0.96])), ([i, u], d) => { onWall(d, i, u, GY + 0.42, GD - 0.12); d.scale.set(0.07, 0.84, 0.07); });
  inst(UB, gold, all, (i, d) => { onWall(d, i, 0, GY + 0.86, GD - 0.12); d.scale.set(IW, 0.07, 0.1); });

  /* ---------- the roof from inside: steep blue cone, ribs to a boss, and the finial crystal hanging as a lamp ---------- */
  const roof = new THREE.Mesh(new THREE.ConeGeometry(RC + 0.4, RH, S, 1, true, Math.PI/S), mat(ROOF, {side:THREE.BackSide})); roof.position.y = TH + RH/2; g.add(roof);
  const apex = new V3(0, TH + RH - 0.7, 0);
  inst(box(0.3, 0.3, 1), dark, all, (i, d) => { corner(d, i, (RC - 0.35)/2, (TH + apex.y)/2); d.lookAt(apex); d.scale.z = Math.hypot(RC - 0.35, apex.y - TH); });
  g.add(mesh(cyl(0.7, 0.3, 0.7, S), dark, 0, apex.y, 0));
  const LY = TH + 1.4;
  g.add(mesh(cyl(0.03, 0.03, apex.y - LY, 4), iron, 0, (apex.y + LY)/2, 0));
  const lampRing = mesh(new THREE.TorusGeometry(0.75, 0.05, 4, 24), gold, 0, LY, 0); lampRing.rotation.x = Math.PI/2; g.add(lampRing);
  const lamp = mesh(new THREE.OctahedronGeometry(0.42, 0), glow(CYAN, 2.2), 0, LY - 0.2, 0); lamp.scale.y = 1.7; lamp.castShadow = false; g.add(lamp);
  const lampHalo = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, color:0x8fdcff, transparent:true, opacity:0.6, blending:THREE.AdditiveBlending, depthWrite:false}));
  lampHalo.position.copy(lamp.position); lampHalo.scale.setScalar(4.5); g.add(lampHalo);

  /* ---------- crystal clusters at the column feet (as on the island outside) ---------- */
  const shardG = new THREE.OctahedronGeometry(0.2, 0), shards2 = [];
  all.forEach(i => { for(let j = 0; j < 4; j++) shards2.push([i, (rnd() - 0.5)*0.9, 0.5 + rnd()*1.1, (rnd() - 0.5)*0.7, (rnd() - 0.5)*0.7, j & 1]); });
  [[0x8fd8ff, 0x2a7fd0], [0xc4a4ff, 0x6a3fd0]].forEach(([c, e], m) => inst(shardG, mat(c, {emissive:e, emissiveIntensity:0.8}), shards2.filter(s => s[5] === m), ([i, t, h, rx, rz], d) => {
    const a = Wa(i) - Math.PI/S, r = RC - 1.05; d.position.set(Math.sin(a)*r + Math.cos(a)*t, h*0.35, Math.cos(a)*r - Math.sin(a)*t); d.rotation.set(rx, a, rz); d.scale.set(0.8, h*1.6, 0.8);
  }));
  inst(new THREE.DodecahedronGeometry(0.3, 0), dark, all, (i, d) => { corner(d, i, RC - 1.05, 0.05); d.scale.set(1.3, 0.5, 1.1); });

  /* ---------- crystal lanterns hanging from the gallery, one per corner ---------- */
  const LR = (WA - 1.25)/CS, LYn = GY - 1.9;
  inst(cyl(0.022, 0.022, 1, 4), iron, all, (i, d) => { corner(d, i, LR, (GY - 0.36 + LYn + 0.3)/2); d.scale.y = GY - 0.36 - LYn - 0.3; });
  inst(new THREE.ConeGeometry(0.3, 0.28, 6), iron, all, (i, d) => corner(d, i, LR, LYn + 0.3));
  inst(new THREE.ConeGeometry(0.2, 0.2, 6), iron, all, (i, d) => { corner(d, i, LR, LYn - 0.32); d.rotation.x = Math.PI; });
  inst(cyl(0.02, 0.02, 0.6, 3), gold, all.flatMap(i => [0, 1, 2].map(j => [i, j])), ([i, j], d) => { const a = Wa(i) - Math.PI/S, b = j*Math.PI*2/3; d.position.set(Math.sin(a)*LR + Math.cos(b)*0.2, LYn, Math.cos(a)*LR + Math.sin(b)*0.2); });
  inst(new THREE.OctahedronGeometry(0.14, 0), ember(CYAN, 1.6), all, (i, d) => { corner(d, i, LR, LYn); d.scale.y = 1.6; });
  const lanternHalo = new THREE.SpriteMaterial({map:tex, color:0x7fd6ff, transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false});
  all.forEach(i => { const h = corner(new THREE.Sprite(lanternHalo), i, LR, LYn); h.scale.setScalar(1.3); g.add(h); });

  /* ---------- cold-fire sconces on the columns ---------- */
  inst(UB, iron, all, (i, d) => { corner(d, i, RC - 0.95, 3.45); d.scale.set(0.12, 0.12, 0.55); });
  inst(cyl(0.24, 0.12, 0.2, 6), iron, all, (i, d) => corner(d, i, RC - 1.25, 3.55));
  const fOut = new THREE.MeshBasicMaterial({color:0x6fcfff, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending, depthWrite:false});
  const fIn = new THREE.MeshBasicMaterial({color:0xe6f7ff, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false});
  const flameO = new THREE.ConeGeometry(0.17, 0.5, 6), flameI = new THREE.ConeGeometry(0.08, 0.3, 5), sconceHalo = new THREE.SpriteMaterial({map:tex, color:0x7fc8ff, transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, depthWrite:false});
  const flames = all.map(i => {
    const o = corner(new THREE.Mesh(flameO, fOut), i, RC - 1.25, 3.9), m = corner(new THREE.Mesh(flameI, fIn), i, RC - 1.25, 3.8), h = corner(new THREE.Sprite(sconceHalo), i, RC - 1.25, 3.85);
    h.scale.setScalar(1.6); g.add(o, m, h); return {o, m, p:i*1.7};
  });

  /* ---------- the dais crystal with the exterior's two arcane bands and four orbiting crystals ---------- */
  const CY = 1.35, crystal = mesh(new THREE.OctahedronGeometry(0.34, 0), mat(0xd8ecff, {emissive:0x5f9fe8, emissiveIntensity:1.2}).clone(), 0, CY, 0);
  crystal.scale.y = 1.6; crystal.castShadow = false; g.add(crystal);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, color:0x9ab8ff, transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, depthWrite:false}));
  halo.position.copy(crystal.position); halo.scale.setScalar(1.8); g.add(halo);
  const bands = [CYAN, VIOLET].map((c, k) => { const b = mesh(new THREE.TorusGeometry(0.72 - k*0.1, 0.018, 3, 40), glow(c, 1.1), 0, CY, 0); b.castShadow = false; g.add(b); return b; });
  const orbs = [0x7fd6ff, 0xb48cff, 0x7fffc4, 0xffd27a].map(c => { const o = mesh(new THREE.OctahedronGeometry(0.09), glow(c, 1.3)); o.scale.y = 1.7; o.castShadow = false; g.add(o); return o; });

  /* ---------- floating rock shards drifting under the roof, crystals hanging beneath ---------- */
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 0), shardGeo = new THREE.OctahedronGeometry(0.14, 0), shards = [];
  for(let k = 0; k < 7; k++){
    const a = k/7*Math.PI*2 + rnd()*0.4, r = 4 + rnd()*3, s = 0.6 + rnd()*0.7, sh = new THREE.Group();
    const rk = mesh(rockGeo, mat(0x666a76)); rk.scale.set(s, s*0.7, s); sh.add(rk);
    const cr = mesh(shardGeo, glow(CYAN, 1.6), 0, -0.4*s, 0); cr.scale.set(s, s*2.2, s); cr.castShadow = false; sh.add(cr);
    sh.position.set(Math.sin(a)*r, GY + 0.5 + rnd()*2.5, Math.cos(a)*r); sh.rotation.y = rnd()*6; sh.userData = {y:sh.position.y, p:rnd()*6};
    g.add(sh); shards.push(sh);
  }

  /* ---------- drifting motes ---------- */
  const N = 70, mpos = new Float32Array(N*3), mSpd = [];
  for(let i = 0; i < N; i++){ const a = rnd()*7, r = 2 + rnd()*(R - 0.4); mpos.set([Math.sin(a)*r, 0.3 + rnd()*(GY - 0.3), Math.cos(a)*r], i*3); mSpd.push(0.15 + rnd()*0.3); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({map:tex, color:0xb9d8ff, size:0.12, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
  g.add(motes); const mp = mg.attributes.position;

  // the architecture is dressing: it never steals clicks (only the stones are items)
  g.traverse(o => { if(!o.userData.item) o.raycast = () => {}; });

  const baseCol = new THREE.Color(0x5f9fe8), tmp = new THREE.Color();
  const room = {group:g, items, start, follow:true, maxDist:R - SD/2 + WA - 2.4,   // from a stone back across the room, short of the far wall's door and jambs
    view(narrow){ const it = items[room.focus]; return narrow ? it.narrow : it.wide; },
    light:{key:[0, 7, 0, 0xc8d4ff, 1.05], fill:[0, 2, 0, 0x9a8cff, 0.5]}, heroSpot:new V3(1.6, 0, WA - 3.4),
    update(t, dt){
      const k = reduce ? 1 : Math.min(1, dt*4);
      stones.forEach((s, i) => {
        s.amt += ((i === room.focus ? 1 : 0) - s.amt)*k;
        s.pool.material.opacity = 0.75*s.amt;
        s.ley.material.emissiveIntensity = 0.35 + 1.6*s.amt;
        s.key.material.emissiveIntensity = 0.3 + 0.6*s.amt; s.sigil.material.opacity = 0.25 + 0.6*s.amt;
      });
      tmp.copy(baseCol).lerp(stones[room.focus].col, 0.7);
      crystal.material.emissive.lerp(tmp, k); halo.material.color.lerp(tmp, k);
      if(reduce){ orbs.forEach((o, j) => { const a = j*Math.PI/2 + 0.6; o.position.set(Math.cos(a)*1.05, CY, Math.sin(a)*1.05); }); bands[0].rotation.x = bands[1].rotation.x = Math.PI/2; return; }
      crystal.rotation.y = t*0.5; crystal.position.y = halo.position.y = CY + Math.sin(t*1.2)*0.06;
      bands[0].rotation.set(Math.PI/2 + 0.32*Math.sin(t*0.5), 0.25, t*0.4);
      bands[1].rotation.set(Math.PI/2 - 0.3*Math.cos(t*0.4), -0.3, -t*0.3);
      orbs.forEach((o, j) => { const a = t*0.6 + j*Math.PI/2 + 0.6; o.position.set(Math.cos(a)*1.05, CY + Math.sin(t*1.5 + j)*0.12, Math.sin(a)*1.05); o.rotation.y = t*1.8; });
      inlay.emissiveIntensity = 0.8 + Math.sin(t*1.3)*0.25; slitM.emissiveIntensity = 0.95 + Math.sin(t*1.6)*0.25;
      runeRing.rotation.z = t*0.03; lamp.rotation.y = t*0.4; lamp.position.y = LY - 0.2 + Math.sin(t*0.9)*0.08; lampHalo.position.y = lamp.position.y;
      flames.forEach(f => { const s = 1 + Math.sin(t*9 + f.p)*0.08 + Math.sin(t*13.7 + f.p*2)*0.06; f.o.scale.set(1/s, s, 1/s); f.m.scale.set(1, 2 - s, 1); });
      shards.forEach(sh => { sh.position.y = sh.userData.y + Math.sin(t*0.8 + sh.userData.p)*0.25; sh.rotation.y = sh.userData.p + t*0.3; });
      for(let i = 0; i < N; i++){ let y = mp.getY(i) + mSpd[i]*dt; if(y > GY) y -= GY - 0.3; mp.setY(i, y); }
      mp.needsUpdate = true;
    }};
  return room;
}

// rune sigil: concentric circles, a seven-pointed star, rune ticks (white, tinted per stone)
function sigil(){
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 3;
  [120, 100, 44].forEach(r => { x.beginPath(); x.arc(128, 128, r, 0, 7); x.stroke(); });
  x.lineWidth = 2; x.beginPath();
  for(let k = 0; k <= 7; k++){ const a = k*3*Math.PI*2/7 - Math.PI/2; k ? x.lineTo(128 + Math.cos(a)*96, 128 + Math.sin(a)*96) : x.moveTo(128 + Math.cos(a)*96, 128 + Math.sin(a)*96); }
  x.stroke();
  for(let k = 0; k < 28; k++){ const a = k/28*Math.PI*2; x.beginPath(); x.moveTo(128 + Math.cos(a)*103, 128 + Math.sin(a)*103); x.lineTo(128 + Math.cos(a)*(k % 4 ? 112 : 118), 128 + Math.sin(a)*(k % 4 ? 112 : 118)); x.stroke(); }
  x.beginPath(); x.arc(128, 128, 9, 0, 7); x.fill();
  return new THREE.CanvasTexture(c);
}
// the floor's rune ring round the dais: a band of angular glyphs between two circles
function runeTex(){
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'), C = 512, k = 512/4.5;   // 4.5 units = half the plane
  x.strokeStyle = '#fff'; x.lineWidth = 3;
  [3.0, 4.1].forEach(r => { x.beginPath(); x.arc(C, C, r*k, 0, 7); x.stroke(); });
  let sd = 3; const r2 = () => (sd = sd*16807 % 2147483647)/2147483647;
  x.lineWidth = 4;
  for(let j = 0; j < 36; j++){   // one glyph per slot: a stave plus two or three branches
    const a = j/36*Math.PI*2; x.save(); x.translate(C + Math.cos(a)*3.55*k, C + Math.sin(a)*3.55*k); x.rotate(a + Math.PI/2);
    x.beginPath(); x.moveTo(0, -20); x.lineTo(0, 20);
    for(let b = 0; b < 2 + (j % 2); b++){ const y = -14 + r2()*28, s = r2() < 0.5 ? -1 : 1; x.moveTo(0, y); x.lineTo(s*12, y + (r2() < 0.5 ? -10 : 10)); }
    x.stroke(); x.restore();
  }
  return new THREE.CanvasTexture(c);
}
// a niche recess: a rectangle with a segmental arch on top, base at y 0
function archShape(w, h, rise){
  const s = new THREE.Shape(); s.moveTo(-w/2, 0); s.lineTo(-w/2, h); s.absellipse(0, h, w/2, rise, Math.PI, 0, true); s.lineTo(w/2, 0); s.lineTo(-w/2, 0);
  return new THREE.ShapeGeometry(s, 12);
}

/* the carved face: category title (wraps to two lines), a rune divider, then the skills (one column up to 6, two past that) */
function carve(ctx, W, H, on, cat){
  const col = cat.col, list = cat.list;
  // a chiselled recess with cut corners, and an engraved border line that lights up in the category colour
  const cut = (i, k) => { ctx.beginPath(); ctx.moveTo(i + k, i); ctx.lineTo(W - i - k, i); ctx.lineTo(W - i, i + k); ctx.lineTo(W - i, H - i - k); ctx.lineTo(W - i - k, H - i); ctx.lineTo(i + k, H - i); ctx.lineTo(i, H - i - k); ctx.lineTo(i, i + k); ctx.closePath(); };
  cut(2, 22); ctx.fillStyle = 'rgba(22,24,32,.55)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();   // shadowed lip of the cut
  ctx.save(); if(on){ ctx.shadowColor = col; ctx.shadowBlur = 12; }
  cut(12, 16); ctx.lineWidth = on ? 2.5 : 1.5; ctx.strokeStyle = on ? col : 'rgba(200,205,220,.22)'; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = on ? 12 : 4;
  ctx.textAlign = 'center'; ctx.fillStyle = col;
  fitFont(ctx, cat.label, W - 60, 32, 400, FD, 22);
  const o = para(ctx, cat.label, W/2, 30, W - 60, 30, 2) - 60;   // extra height taken by a second title line
  ctx.font = `700 11px ${FM}`; ctx.fillStyle = COL.muted; ctx.fillText(`${list.length} SKILL${list.length === 1 ? '' : 'S'}`, W/2, 72 + o);
  ctx.fillStyle = col; ctx.fillRect(36, 96 + o, W/2 - 50, 1.5); ctx.fillRect(W/2 + 14, 96 + o, W/2 - 50, 1.5); diamond(ctx, W/2, 96.75 + o, 7);
  const cols = list.length > 6 ? 2 : 1, rows = Math.ceil(list.length/cols), top = 110 + o, avail = H - top - 24;
  const lh = Math.min(46, avail/rows), y0 = top + (avail - rows*lh)/2, cw = (W - 40)/cols, size = cols > 1 ? 18 : 22;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for(let c = 0; c < cols; c++){
    const names = list.filter((_, j) => j % cols === c).map(s => s.name), maxW = cw - 24;
    ctx.font = `600 ${size}px ${FB}`;
    const bw = Math.min(maxW, Math.max(...names.map(s => ctx.measureText(s).width))) + 20, x0 = 20 + c*cw + (cw - bw)/2;
    names.forEach((s, r) => {
      const y = y0 + (r + 0.5)*lh;
      ctx.fillStyle = col; diamond(ctx, x0 + 5, y, 5);
      fitFont(ctx, s, maxW, size, 600, FB, 14); ctx.fillStyle = on ? COL.ink : '#c8c4b8';
      if(ctx.measureText(s).width <= maxW) ctx.fillText(s, x0 + 20, y + 1);
      else para(ctx, s, x0 + 20, y - 7, maxW, 16, 2);   // still too long at 14px: two lines
    });
  }
  ctx.restore();
}
