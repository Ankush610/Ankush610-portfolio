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

  /* shell: floor with planks, back wall, picture rail */
  add(mesh(box(W, 0.3, 11), mat(0x2e2218), 0, -0.15, 0.5));
  { const rows = [], tones = [0x4a382d, 0x52402f, 0x45342a, 0x4e3a2c];
    for(let z = -4.35, r = 0; z < 6; z += 0.62, r++){ let x = -W/2 + (r % 3)*0.9 - 0.9; while(x < W/2){ const l = 2.4 + rnd()*1.6, x1 = Math.min(x + l, W/2); if(x1 > -W/2) { const x0 = Math.max(x, -W/2); rows.push([(x0 + x1)/2 - 0.015, 0, z, x1 - x0 - 0.03, 0.03, 0.59, 0, tones[Math.floor(rnd()*4)]]); } x += l; } }
    const pl = boxes(rows, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), true); pl.castShadow = false; g.add(pl); }
  add(mesh(box(W, 14.5, 0.4), mat(0x2e2420), 0, 7.25, -4.6));
  add(mesh(box(W, 0.12, 0.08), gilt, 0, 8.35, -4.36));
  // rug: gilt border, red field, darker medallion
  const rug = add(mesh(cyl(4.2, 4.2, 0.03, 32), mat(0x6b2f2a), 0, 0.02, 0.9)); rug.scale.set(Math.max(1, N*S/8.4), 1, 0.6);
  const rugB = add(mesh(cyl(4.45, 4.45, 0.02, 32), mat(0x8a6a3a), 0, 0.012, 0.9)); rugB.scale.copy(rug.scale);
  const rugM = add(mesh(cyl(2.3, 2.3, 0.03, 24), mat(0x4e2220), 0, 0.03, 0.9)); rugM.scale.copy(rug.scale);
  [rug, rugB, rugM].forEach(r => r.castShadow = false);

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
  prows.push([-W/2 + 0.3, 0], [W/2 - 0.3, 0]);
  prows.forEach(([x]) => wrows.push([x, 10.5, UZ + 0.06, 0.5, 4.2, 0.22], [x, 12.65, UZ + 0.1, 0.7, 0.3, 0.32], [x, 8.6, UZ + 0.1, 0.66, 0.3, 0.3]));   // pilaster, capital, base
  wrows.push([0, 13.0, UZ + 0.14, W, 0.35, 0.45], [0, 13.3, UZ + 0.24, W, 0.2, 0.6]);   // cornice
  g.add(boxes(wrows, dark));
  add(mesh(box(W, 0.4, 11), mat(0x251c18), 0, 14.7, 0.5));   // ceiling
  { const br = []; for(let x = -W/2 + 1.5; x < W/2; x += 3) br.push([x, 14.3, 0.5, 0.35, 0.45, 11]); br.push([0, 14.25, -1.5, W, 0.35, 0.3], [0, 14.25, 2.5, W, 0.35, 0.3]); g.add(boxes(br, wood)); }

  /* bookcases (one InstancedMesh of spines per case) */
  const pal = [0x7a2e2a, 0x2e4a6b, 0x3d5c3a, 0x6b4a2a, 0x5a3a6b, 0x8a6a3a, 0x2a5a5a, 0x9a4a2a, 0x4a4a52];
  function bookcase(w, h, shelves){
    const c = new THREE.Group();
    c.add(mesh(box(w, h, 0.12), dark, 0, h/2, -0.3));
    c.add(mesh(box(0.14, h, 0.7), wood, -w/2, h/2, 0)); c.add(mesh(box(0.14, h, 0.7), wood, w/2, h/2, 0));
    c.add(mesh(box(w + 0.3, 0.2, 0.85), dark, 0, h + 0.1, 0.03)); // crown moulding
    const sh = h/shelves; for(let k=0;k<=shelves;k++) c.add(mesh(box(w, 0.1, 0.7), wood, 0, k*sh + 0.05, 0));
    // [x, y, z, width, height, depth, roll]: upright runs, the odd leaning volume and flat stacks in the gaps
    const list = [];
    for(let k=0;k<shelves;k++){
      const base = k*sh + 0.1; let x = -w/2 + 0.12;
      while(x < w/2 - 0.3){
        const bw = 0.08 + rnd()*0.14, bh = sh*(0.5 + rnd()*0.38), r = rnd();
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
      const p = mesh(pedGeo, dark, 0, 6.68, -0.05); p.rotation.x = -Math.PI/2; p.scale.set(1, 1, 0.55); c.add(p);
      c.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), brass, 0, 6.95, 0.06));
    }
  }
  [-1, 1].forEach(s => { const c = bookcase(4.4, 6.4, 6); c.position.set(s*(W/2 - 0.6), 0, -0.8); c.rotation.y = -s*1.05; g.add(c); });

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
    add(mesh(box(1.05, 0.14, 0.8), mat(0x4a3020), x, 0.21, BZ - 0.22));
    add(mesh(cyl(0.2, 0.27, 2.0, 8), mat(0x4a3020), x, 1.28, BZ - 0.25));
    add(mesh(cyl(0.3, 0.3, 0.08, 8), brass, x, 0.32, BZ - 0.25));
    add(mesh(cyl(0.32, 0.24, 0.18, 8), mat(0x3a2618), x, 2.3, BZ - 0.25));
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
      xFlames.forEach((f, k) => { f.scale.y = 1 + Math.sin(t*11 + k*1.7)*0.18; });
      chand.rotation.z = Math.sin(t*0.5)*0.012; chand.rotation.x = Math.sin(t*0.37)*0.01;
      globe.rotation.y = t*0.15;
      winM.opacity = 0.15 + Math.sin(t*0.3)*0.025;
      for(let i=0;i<DM;i++){ const d = dseed[i]; dpos[i*3] = d[0] + Math.sin(t*0.13 + d[3])*0.6; dpos[i*3+1] = d[1] + Math.sin(t*0.21 + d[3]*2)*0.35; dpos[i*3+2] = d[2] + Math.cos(t*0.11 + d[3])*0.4; }
      dgeo.attributes.position.needsUpdate = true;
    }};
}
