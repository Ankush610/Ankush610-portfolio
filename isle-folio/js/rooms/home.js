/* ---- Hearthstone: the Sanctum (inside the glowing monolith) ---- */
import { THREE, V3, reduce, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, FM, COL, panel, setPanel, rr, para, fitFont, card, eyebrow } from '../panels.js';
import { byId } from '../world/islands.js';
import { view, faceY, item, hooks } from './kit.js';

const EMBER = 0xf0b54a;
const additive = (color, opacity) => new THREE.MeshBasicMaterial({color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
const WOOD = 0x4a3222, WOOD_D = 0x33231a, WOOD_L = 0x6b4a30, IRON = 0x2a2c33, BRASS = 0xb08a4a, WAX = 0xe8dcc0;
const noPick = () => {};   // decor never steals a click from an item

/* decor mesh: no shadow casting (rooms sit outside the moon's shadow camera anyway) */
const dec = (geo, m, x, y, z) => { const o = mesh(geo, m, x, y, z); o.castShadow = false; return o; };
/* one draw call for many copies: rows of [x, y, z, sx, sy, sz, ry, color?, rx?, rz?] */
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), P3 = new V3(), S3 = new V3(), C3 = new THREE.Color();
function instanced(geo, material, rows){
  const im = new THREE.InstancedMesh(geo, material, rows.length);
  rows.forEach((a, i) => {
    Q.setFromEuler(EU.set(a[8] || 0, a[6] || 0, a[9] || 0));
    im.setMatrixAt(i, M4.compose(P3.set(a[0], a[1], a[2]), Q, S3.set(a[3], a[4], a[5])));
    if(a[7] != null) im.setColorAt(i, C3.setHex(a[7]));
  });
  im.instanceMatrix.needsUpdate = true; if(im.instanceColor) im.instanceColor.needsUpdate = true;
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.raycast = noPick;
  return im;
}
/* soft warm halo for every flame: one tiny canvas gradient, additive sprites */
let haloTex = null;
function haloMaterial(opacity){
  if(!haloTex){
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,214,140,1)'); gr.addColorStop(0.3, 'rgba(255,160,70,.45)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c);
  }
  return new THREE.SpriteMaterial({map:haloTex, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false});
}
const flameMat = (color, i) => new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:i, flatShading:true});   // own instance: animated

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
  const inlay = mesh(new THREE.TorusGeometry(2.4, 0.05, 6, 48), glow(EMBER, 1.4), 0, 0.1, 2.4); inlay.rotation.x = Math.PI/2; inlay.castShadow = false; g.add(inlay);

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

  /* ---- set dressing: a lived-in great hall carved into the stone ---- */
  const FZ = CZ + HW;                                                               // front edge of the floor
  // flagstone floor, laid in staggered courses with a little height and tone variation
  const stones = [], STONE = [0x3b3a3e, 0x34363d, 0x403d3d, 0x303239, 0x3a3b42, 0x443d38];
  for(let z = BZ + 0.6, r = 0; z < FZ; z += 1.2, r++) for(let x = -HW + (r % 2 ? 0.65 : 0); x < HW; x += 1.3){
    const w = Math.min(1.22, HW - x + 0.6);
    stones.push([x, 0.02 + rnd()*0.02, z, w, 0.06, 1.12, 0, STONE[Math.floor(rnd()*STONE.length)]]);
  }
  g.add(instanced(box(1, 1, 1), mat(0xffffff, {roughness:0.95}), stones));

  // ashlar blockwork on the back and side walls (above a timber wainscot); gaps read as mortar
  const blocks = [], BLOCK = [0x2e2a2c, 0x2a2c33, 0x332e2c, 0x26282e, 0x302b29, 0x2b2d35];
  const course = (len, fn) => { for(let y = 1.62, r = 0; y < WH; y += 0.72, r++){ let u = -len/2 + (r % 2 ? -0.5 : 0); while(u < len/2){ const w = 0.9 + rnd()*0.8, a = Math.max(u, -len/2), b = Math.min(u + w, len/2); if(b - a > 0.2) fn((a + b)/2, y, b - a - 0.07, BLOCK[Math.floor(rnd()*BLOCK.length)]); u += w; } } };
  course(HW*2, (u, y, w, c) => blocks.push([u, y, BZ + 0.03, w, 0.65, 0.05, 0, c]));
  [-1, 1].forEach(s => course(HW*2, (u, y, w, c) => blocks.push([s*(HW - 0.03), y, CZ + u, 0.05, 0.65, w, 0, c])));
  g.add(instanced(box(1, 1, 1), mat(0xffffff, {roughness:1}), blocks));
  // wainscot: dark panelling with battens and a rail, around the three walls
  const woodM = mat(WOOD), woodD = mat(WOOD_D), woodL = mat(WOOD_L);
  g.add(dec(box(HW*2, 1.25, 0.08), woodD, 0, 0.62, BZ + 0.05), dec(box(HW*2, 0.14, 0.2), woodL, 0, 1.3, BZ + 0.1));
  [-1, 1].forEach(s => g.add(dec(box(0.08, 1.25, HW*2), woodD, s*(HW - 0.05), 0.62, CZ), dec(box(0.2, 0.14, HW*2), woodL, s*(HW - 0.1), 1.3, CZ)));
  const battens = [];
  for(let u = -HW + 0.5; u < HW; u += 0.78){ battens.push([u, 0.62, BZ + 0.1, 0.09, 1.2, 0.05, 0, WOOD]); [-1, 1].forEach(s => battens.push([s*(HW - 0.1), 0.62, CZ + u, 0.05, 1.2, 0.09, 0, WOOD])); }
  g.add(instanced(box(1, 1, 1), mat(0xffffff, {roughness:0.85}), battens));

  // roof timbers: tie beams across the shaft, two purlins along it, corbels on the back wall
  const TB = WH - 0.7;
  [-8.2, -4.6, -1, 2.6].forEach(z => z > BZ && g.add(dec(box(HW*2, 0.5, 0.42), woodM, 0, TB, z)));
  [-1, 1].forEach(s => {
    g.add(dec(box(0.36, 0.36, HW*2), woodD, s*3.1, TB - 0.43, CZ));
    const corbel = dec(box(0.5, 0.9, 0.7), woodM, s*3.1, TB - 1.06, BZ + 0.38); g.add(corbel);
  });

  // a wrought-iron candle wheel hanging over the heart-stone
  const iron = mat(IRON, {roughness:0.6, metalness:0.4}), brass = mat(BRASS, {roughness:0.45, metalness:0.5});
  const CHY = HY + 5.6, CHZ = -6.4, CHR = 1.3;
  g.add(dec(cyl(0.035, 0.035, TB - CHY - 0.25, 5), iron, 0, (TB + CHY)/2, CHZ));
  const wheel = dec(new THREE.TorusGeometry(CHR, 0.07, 5, 18), iron, 0, CHY, CHZ); wheel.rotation.x = Math.PI/2; g.add(wheel);
  g.add(dec(new THREE.OctahedronGeometry(0.22), brass, 0, CHY - 0.05, CHZ));
  [0, Math.PI/2].forEach(a => { const sp = dec(box(CHR*2, 0.05, 0.05), iron, 0, CHY, CHZ); sp.rotation.y = a; g.add(sp); });
  [0, 1, 2].forEach(k => { const a = k*Math.PI*2/3, ch = dec(cyl(0.015, 0.015, 1.5, 3), iron, Math.cos(a)*CHR*0.5, CHY + 0.68, CHZ + Math.sin(a)*CHR*0.5); ch.rotation.set(Math.sin(a)*0.75, 0, -Math.cos(a)*0.75); g.add(ch); });

  // candles: every one in the room is a single instanced body + a single instanced flame
  const wax = [], flames = [];
  const candle = (x, y, z, h, r = 0.055) => { wax.push([x, y + h/2, z, r, h, r, rnd()*3]); flames.push([x, y + h + 0.07, z, 1, 1, 1, rnd()*3]); };
  for(let k = 0; k < 8; k++){ const a = k*Math.PI/4 + 0.2; candle(Math.cos(a)*CHR, CHY + 0.06, CHZ + Math.sin(a)*CHR, 0.22 + (k % 3)*0.06); }
  [-1, 1].forEach(s => {   // on both ledges of the heart-stone, just outside the board
    [[3.88, 0.32], [4.06, 0.2], [3.9, 0.14]].forEach(([x, h], k) => candle(s*x, HY - 1.85, HZ - 0.38 + k*0.2, h, 0.05));
    candle(s*3.98, HY + 2.15, HZ - 0.25, 0.26, 0.05);
  });

  // banners between the outer pilasters, high above the stat portals
  const cloth = mat(0x6e2420, {side:THREE.DoubleSide}), trim = mat(0xb4893f, {side:THREE.DoubleSide}), sigilM = glow(EMBER, 0.9);
  const bannerShape = (w, h, n) => { const sh = new THREE.Shape(); sh.moveTo(-w/2, 0); sh.lineTo(w/2, 0); sh.lineTo(w/2, -h); sh.lineTo(0, -h + n); sh.lineTo(-w/2, -h); sh.closePath(); return new THREE.ShapeGeometry(sh); };
  const BW = 1.6, BH = 3.6, BTOP = TB - 1.2, bClothG = bannerShape(BW, BH, 0.5), bTrimG = bannerShape(BW + 0.16, BH + 0.16, 0.5), rodG = cyl(0.045, 0.045, BW + 0.6, 6), finG = new THREE.OctahedronGeometry(0.09);
  const sigilG = new THREE.OctahedronGeometry(0.34), ringG = new THREE.TorusGeometry(0.5, 0.04, 4, 20);
  const banners = [-1, 1].map(s => {
    const bx = s*4.4*HW/7.8, rod = dec(rodG, brass, bx, BTOP + 0.05, BZ + 0.3); rod.rotation.z = Math.PI/2; g.add(rod);
    g.add(dec(finG, brass, bx - (BW/2 + 0.32), BTOP + 0.05, BZ + 0.3), dec(finG, brass, bx + (BW/2 + 0.32), BTOP + 0.05, BZ + 0.3));
    const b = new THREE.Group(); b.position.set(bx, BTOP, BZ + 0.3); g.add(b);
    b.add(dec(bTrimG, trim, 0, 0.08, -0.01), dec(bClothG, cloth, 0, 0, 0));
    const sg = dec(sigilG, sigilM, 0, -1.55, 0.03); sg.scale.set(0.7, 1, 0.12); b.add(sg);
    b.add(dec(ringG, trim, 0, -1.55, 0.02));
    b.add(dec(box(BW - 0.2, 0.05, 0.02), trim, 0, -0.35, 0.02), dec(box(BW - 0.2, 0.05, 0.02), trim, 0, -2.6, 0.02));
    return b;
  });

  // iron sconces on the outer pilasters, above the portals
  const sconceArm = box(0.08, 0.08, 0.42), sconceCup = cyl(0.14, 0.07, 0.12, 6), halos = [];
  [-1, 1].forEach(s => {
    const x = s*6.2*HW/7.8, y = HY + 3.85, z = BZ + 0.5;
    g.add(dec(sconceArm, iron, x, y, z + 0.2), dec(box(0.22, 0.4, 0.06), iron, x, y + 0.05, z + 0.02), dec(sconceCup, brass, x, y + 0.08, z + 0.4));
    candle(x, y + 0.14, z + 0.4, 0.24, 0.06);
    const h = new THREE.Sprite(haloMaterial(0.55)); h.position.set(x, y + 0.5, z + 0.45); h.scale.setScalar(1.6); h.raycast = noPick; g.add(h); halos.push(h);
  });

  // braziers under each column of portals, with a log pile and rising sparks
  const fireA = flameMat(0xff8a2a, 2.0), fireB = flameMat(0xffd27a, 2.4), coalM = flameMat(0xc8401e, 1.4), stoneM = mat(0x474b55), bowlM = mat(0x3a3d45, {roughness:0.7, metalness:0.3});
  const flameG = new THREE.ConeGeometry(0.2, 0.7, 5), tongues = [], logs = [], sparkSrc = [];
  [-1, 1].forEach(s => {
    const x = s*(SX + 0.55), z = -2.6;
    g.add(dec(cyl(0.42, 0.5, 0.18, 8), stoneM, x, 0.09, z), dec(cyl(0.2, 0.3, 0.62, 8), stoneM, x, 0.49, z), dec(cyl(0.62, 0.32, 0.34, 8), bowlM, x, 0.97, z));
    g.add(dec(cyl(0.54, 0.54, 0.05, 8), coalM, x, 1.12, z));
    [[0, 0, 1.0, fireA], [0.17, 0.08, 0.7, fireA], [-0.15, -0.06, 0.75, fireA], [0.02, 0.02, 0.6, fireB]].forEach(([dx, dz, sc, m], k) => {
      const f = dec(flameG, m, x + dx, 1.14 + 0.35*sc, z + dz); f.scale.setScalar(sc); f.rotation.y = k; g.add(f); tongues.push({f, sc, y:1.14, k: k + (s > 0 ? 4 : 0)});
    });
    const h = new THREE.Sprite(haloMaterial(0.6)); h.position.set(x, 1.45, z + 0.1); h.scale.setScalar(2.6); h.raycast = noPick; g.add(h); halos.push(h);
    sparkSrc.push([x, z]);
    // split logs stacked beside the brazier, toward the wall
    const lx = x + s*0.35;
    [[0, 0.13, 0], [0, 0.13, 0.3], [0, 0.13, -0.3], [0, 0.37, 0.15], [0, 0.37, -0.15], [0, 0.6, 0]].forEach(([dx, y, dz]) => logs.push([lx + dx, y, z - 0.95 + dz, 1, 1, 1, 0, rnd() > 0.5 ? WOOD_L : WOOD, 0, Math.PI/2]));
  });
  g.add(instanced(cyl(0.13, 0.13, 0.95, 6), mat(0xffffff, {roughness:0.95, flatShading:true}), logs));
  const NS = 28, sparkPos = new Float32Array(NS*3), sparkSeed = [];
  for(let i=0;i<NS;i++){ sparkSeed.push([i % 2, rnd()*6.3, 0.6 + rnd()*0.7, rnd()]); sparkPos.set([0, -10, 0], i*3); }
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({color:0xffa040, size:0.06, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false}));
  sparks.frustumCulled = false; sparks.raycast = noPick; g.add(sparks);
  const sparkStep = t => sparkSeed.forEach(([side, ph, sp, o], i) => {
    const [x, z] = sparkSrc[side], k = (t*sp*0.35 + o) % 1;
    sparkPos[i*3] = x + Math.sin(t*1.7 + ph)*0.18*(1 + k); sparkPos[i*3+1] = 1.3 + k*2.2; sparkPos[i*3+2] = z + Math.cos(t*1.3 + ph)*0.18*(1 + k);
  });
  sparkStep(0); sparkGeo.attributes.position.needsUpdate = true;

  // low cabinets in the back corners: books, a jar, candles; kept below the portals' line of sight
  const books = [], BOOK = [0x7a2a22, 0x2f4a6a, 0x5a6a3a, 0x8a6a2a, 0x4a2f5a, 0x6b3a22];
  [-1, 1].forEach(s => {
    const x = s*(HW - 1.25), z = BZ + 0.42, W = 1.9, H = 1.3, D = 0.62;
    g.add(dec(box(W, 0.08, D + 0.06), woodL, x, H, z), dec(box(W - 0.1, 0.06, D - 0.04), woodM, x, 0.62, z), dec(box(W - 0.1, 0.08, D - 0.04), woodM, x, 0.1, z));
    g.add(dec(box(0.08, H, D), woodM, x - W/2 + 0.04, H/2, z), dec(box(0.08, H, D), woodM, x + W/2 - 0.04, H/2, z), dec(box(W, H, 0.05), woodD, x, H/2, z - D/2 + 0.02));
    [0.14, 0.65].forEach(sy => { let u = x - W/2 + 0.16; while(u < x + W/2 - 0.3){ const bw = 0.07 + rnd()*0.06, bh = 0.32 + rnd()*0.14, lean = rnd() < 0.12 ? 0.25 : 0; books.push([u + bw/2, sy + bh/2, z + 0.02, bw, bh, 0.36 + rnd()*0.08, 0, BOOK[Math.floor(rnd()*BOOK.length)], 0, lean*s]); u += bw + 0.012 + (rnd() < 0.1 ? 0.15 : 0); } });
    for(let k = 0; k < 3; k++) books.push([x - s*0.45, H + 0.08 + k*0.07, z, 0.5, 0.065, 0.36, 0.1*k, BOOK[(k*2 + (s > 0)) % BOOK.length]]);   // a stack lying on top
    g.add(dec(cyl(0.14, 0.12, 0.3, 7), mat(0x5d7a72, {roughness:0.4}), x + s*0.05, H + 0.19, z - 0.05), dec(cyl(0.08, 0.08, 0.06, 7), woodL, x + s*0.05, H + 0.37, z - 0.05));
    candle(x + s*0.5, H + 0.04, z + 0.05, 0.3); candle(x + s*0.66, H + 0.04, z - 0.1, 0.18);
  });
  g.add(instanced(box(1, 1, 1), mat(0xffffff, {roughness:0.8}), books));

  // a woven hearth rug under the glowing ring, with a stepped border and fringes
  const RW = 6.0, RD = 5.0, RZ = 2.4;
  g.add(dec(box(RW, 0.03, RD), mat(0x4a1c18), 0, 0.075, RZ), dec(box(RW - 0.36, 0.034, RD - 0.36), mat(0x9a7038), 0, 0.077, RZ));
  g.add(dec(box(RW - 0.56, 0.036, RD - 0.56), mat(0x6a2420), 0, 0.079, RZ), dec(box(RW - 1.3, 0.038, RD - 1.3), mat(0x7a2e24), 0, 0.081, RZ));
  const diamond = dec(box(2.2, 0.04, 2.2), mat(0x2e2238), 0, 0.083, RZ); diamond.rotation.y = Math.PI/4; g.add(diamond);
  const fringe = [];
  for(let u = -RW/2 + 0.12; u < RW/2; u += 0.16) [-1, 1].forEach(s => fringe.push([u, 0.07, RZ + s*(RD/2 + 0.09), 0.05, 0.02, 0.18, 0, 0xd8c7a0]));
  g.add(instanced(box(1, 1, 1), mat(0xffffff), fringe));
  // candle clusters on squat stone plinths at the rug's front corners
  [-1, 1].forEach(s => { g.add(dec(cyl(0.34, 0.38, 0.16, 7), stoneM, s*(RW/2 + 0.5), 0.08, RZ + 1.7)); [[0, 0.42], [0.14, 0.28], [-0.1, 0.2]].forEach(([dx, h], k) => candle(s*(RW/2 + 0.5) + dx, 0.16, RZ + 1.7 + (k - 1)*0.1, h, 0.06)); });

  const waxM = mat(WAX, {roughness:0.6}), candleFlame = flameMat(0xffc060, 2.4);
  g.add(instanced(cyl(1, 1, 1, 6), waxM, wax));
  const flameIM = instanced(new THREE.OctahedronGeometry(0.05), candleFlame, flames.map(f => (f[4] = 1.8, f))); g.add(flameIM);
  { const h = new THREE.Sprite(haloMaterial(0.45)); h.position.set(0, CHY + 0.3, CHZ); h.scale.set(3.6, 1.6, 1); h.raycast = noPick; g.add(h); halos.push(h); }
  const haloBase = halos.map(h => h.material.opacity);

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
      tongues.forEach(({f, sc, y, k}) => { const n = 1 + Math.sin(t*9 + k*1.9)*0.12 + Math.sin(t*14.3 + k*3.7)*0.07; f.scale.set(sc*(1.06 - n*0.06), sc*n, sc*(1.06 - n*0.06)); f.position.y = y + 0.35*sc*n; f.rotation.y = k + t*0.8; });
      fireA.emissiveIntensity = 1.9 + Math.sin(t*11)*0.25; coalM.emissiveIntensity = 1.3 + Math.sin(t*2.3)*0.25;
      candleFlame.emissiveIntensity = 2.3 + Math.sin(t*13)*0.2 + Math.sin(t*7.1)*0.15;
      halos.forEach((h, k) => { h.material.opacity = haloBase[k]*(0.88 + Math.sin(t*(5 + k) + k)*0.08 + Math.sin(t*12.7 + k*2)*0.04); });
      banners.forEach((b, k) => { b.rotation.x = Math.sin(t*0.55 + k*2)*0.035 - 0.02; b.rotation.y = Math.sin(t*0.4 + k)*0.03; });
      sparkStep(t); sparkGeo.attributes.position.needsUpdate = true;
    }};
}
