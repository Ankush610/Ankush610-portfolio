/* Floating-island terrain and rope bridges, plus the walkable-ground query the player uses.
   Every island is a polar mesh: noisy coastline, hills, a flat plateau for its building, dirt paths
   to each bridge, a beach rim and a rocky underside. The same height function drives the mesh and walking,
   so what you see is exactly what you stand on. No physics engine needed. */
import { THREE, V3, mesh, mat, glow, box, cyl, vivid } from '../engine.js';
import { ISLANDS, BRIDGES, byId } from './islands.js';

/* ---------- seeded value noise ---------- */
function hash(x, y, s){ let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, y, s){
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx*fx*(3 - 2*fx), v = fy*fy*(3 - 2*fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a)*u + (c - a)*v + (a - b - c + d)*u*v;
}
export const fbm = (x, y, s) => noise(x, y, s)*0.55 + noise(x*2.1, y*2.1, s + 7)*0.3 + noise(x*4.3, y*4.3, s + 13)*0.15;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
function segDist(x, z, s){ // distance from (x,z) to segment s = [ax, az, bx, bz]
  const dx = s[2] - s[0], dz = s[3] - s[1], L = dx*dx + dz*dz || 1;
  const t = Math.min(1, Math.max(0, ((x - s[0])*dx + (z - s[1])*dz)/L));
  return Math.hypot(x - s[0] - dx*t, z - s[1] - dz*t);
}

/* ---------- island shape (works for main islands and decorative islets) ---------- */
export function shapeIsland(isl){
  const s = isl.seed;
  // two scales of noise around the rim: big lobes and bays, plus smaller jagged headlands
  isl.edgeR = th => isl.R*(0.66 + 0.5*fbm(Math.cos(th)*1.3 + 5, Math.sin(th)*1.3 + 5, s) + 0.14*(noise(Math.cos(th)*4.5 + 9, Math.sin(th)*4.5 + 9, s + 21) - 0.5));
  isl.paths = isl.paths || [];
  isl.pathDist = (lx, lz) => { let m = 99; for(const p of isl.paths) m = Math.min(m, segDist(lx, lz, p)); return m; };
  isl.topY = (lx, lz) => {
    const r = Math.hypot(lx, lz), d = r/isl.edgeR(Math.atan2(lz, lx));
    const pm = smooth(0.7, 2.6, isl.pathDist(lx, lz));
    const flat = smooth(isl.obs + 1.4, isl.obs + 4.2, r);
    const n = fbm(lx*0.16 + s*3.1, lz*0.16 - s*1.7, s);
    const hills = Math.max(0, n - 0.42)*isl.hill*3*flat*pm*(1 - smooth(0.6, 0.88, d));
    const bumps = (fbm(lx*0.8, lz*0.8, s + 3) - 0.5)*0.16*flat*pm;
    return isl.h + hills + bumps - smooth(0.84, 1.0, d)*0.8;
  };
}

const C = new THREE.Color(), C2 = new THREE.Color();
const SAND = new THREE.Color(0xcdb98a), DIRT = new THREE.Color(0x8a6a48), ROCK = new THREE.Color(0x7d7a72), PLAZA = new THREE.Color(0x8b8676);
const UNDER_TOP = new THREE.Color(0x7a6a58), UNDER_BOT = new THREE.Color(0x2e2620), ROOT = new THREE.Color(0x4a3a2a), EARTH = new THREE.Color(0x6a5640);
// below the rim, as [radius fraction of the coast, drop × depth]: a grassy lip that overhangs a little, an earth band,
// a cliff of rock strata stepping in, then the rugged mass tapering to the keel
const CLIFF = [[1.015, -0.12], [1.02, -0.34], [1.0, -0.62], [0.985, -0.98], [0.97, -1.32], [0.95, -1.7]];
const DEEP = [[0.9, -2.3], [0.8, -3.1], [0.68, -4.1], [0.54, -5.3], [0.38, -6.7], [0.22, -8.1], [0.08, -9.2], [0, -9.8]];
const STRATA = [0x9a8a74, 0xb2a690, 0x8a7a66, 0xa49884].map(c => new THREE.Color(c));   // bright enough to read in moonlight
// the underside's drop (× depth) at radius fraction f, read off DEEP (for hanging spires)
const deepY = f => { for(let k = 1; k < DEEP.length; k++){ const [f0, y0] = DEEP[k - 1], [f1, y1] = DEEP[k]; if(f >= f1) return y0 + (y1 - y0)*(f0 - f)/(f0 - f1); } return DEEP[DEEP.length - 1][1]; };

export function islandMesh(isl, rings = 22, segs = 72){
  const grass = new THREE.Color(isl.top), dark = grass.clone().multiplyScalar(0.72), depth = isl.R/8.5;
  const P = [], Col = [];
  const push = (x, y, z, c) => { vivid(C2.copy(c)); P.push(x, y, z); Col.push(C2.r, C2.g, C2.b); };   // every terrain colour a little more saturated
  const topColor = (x, y, z, d, r) => {
    const v = 0.94 + hash(Math.round(x*7), Math.round(z*7), isl.seed)*0.12;
    C.copy(grass).lerp(dark, smooth(0.2, 1.2, y - isl.h)*0.6).lerp(ROCK, smooth(1.3, 2.6, y - isl.h));
    if(r < isl.obs + 0.9 && isl.plaza) C.lerp(PLAZA, 0.85);
    C.lerp(DIRT, (1 - smooth(0.45, 0.85, isl.pathDist(x, z)))*(r > isl.obs*0.7 ? 0.9 : 0));
    C.lerp(isl.beach ? SAND : EARTH, smooth(0.86, 0.97, d)*(isl.beach ? 1 : 0.55));   // a beach only on coastal islands; elsewhere the grass browns toward the edge
    return C.multiplyScalar(v);
  };
  // vertex grid: ring 0 = centre point, rings 1..rings = top surface, then underside rings to the tip
  const grid = [];
  grid.push([[0, isl.topY(0, 0), 0, topColor(0, isl.topY(0, 0), 0, 0, 0).clone()]]);
  for(let k = 1; k <= rings; k++){
    const row = [], t = k/rings;
    for(let j = 0; j < segs; j++){
      const th = j/segs*Math.PI*2, e = isl.edgeR(th), x = Math.cos(th)*e*t, z = Math.sin(th)*e*t, y = isl.topY(x, z);
      row.push([x, y, z, topColor(x, y, z, t, e*t).clone()]);
    }
    grid.push(row);
  }
  // the cliff: rings hung off the rim's own height, jittered with coherent noise so strata read as ledges, not fuzz
  const tint = new THREE.Color(isl.top), rimY = th => { const e = isl.edgeR(th); return isl.topY(Math.cos(th)*e, Math.sin(th)*e); };
  CLIFF.forEach(([f, dy], k) => {
    const row = [];
    for(let j = 0; j < segs; j++){
      const th = j/segs*Math.PI*2, cx = Math.cos(th), sz = Math.sin(th);
      const e = isl.edgeR(th)*f*(1 + (noise(cx*3 + k*0.7, sz*3, isl.seed + 31) - 0.5)*(k < 2 ? 0.02 : 0.07));
      const y = rimY(th) + dy*depth + (noise(cx*2.5, sz*2.5 + k, isl.seed + 37) - 0.5)*0.25*depth;
      const c = k < 1 ? grass.clone().multiplyScalar(0.62) : k < 2 ? C2.setHex(0x5a4630).clone() : STRATA[k % 4].clone().lerp(tint, 0.14);
      row.push([cx*e, y, sz*e, c.multiplyScalar(0.9 + hash(j, k + 41, isl.seed)*0.2)]);
    }
    grid.push(row);
  });
  // the underside: a rugged mass, lumpier the deeper it goes, tapering to the keel
  DEEP.forEach(([f, dy], k) => {
    const row = [], c = UNDER_TOP.clone().lerp(UNDER_BOT, k/(DEEP.length - 1));
    for(let j = 0; j < segs; j++){
      const th = j/segs*Math.PI*2, cx = Math.cos(th), sz = Math.sin(th);
      const jit = f > 0 ? 1 + (noise(cx*2.2 + k, sz*2.2, isl.seed + 43) - 0.5)*0.45 + (hash(j, k, isl.seed) - 0.5)*0.1 : 0;
      const e = isl.edgeR(th)*f*jit;
      row.push([cx*e, isl.h + dy*depth + (hash(j, k + 9, isl.seed) - 0.5)*0.7*depth, sz*e, c.clone().multiplyScalar(0.88 + hash(j, k + 3, isl.seed)*0.24)]);
    }
    grid.push(row);
  });
  const tri = (a, b, c) => { for(const v of [a, b, c]) push(v[0], v[1], v[2], v[3]); };
  for(let j = 0; j < segs; j++){ const j2 = (j + 1) % segs; tri(grid[0][0], grid[1][j2], grid[1][j]); }
  for(let k = 1; k < grid.length - 1; k++){
    for(let j = 0; j < segs; j++){
      const j2 = (j + 1) % segs, a = grid[k][j], b = grid[k][j2], c = grid[k + 1][j], d = grid[k + 1][j2];
      tri(a, b, c); tri(b, d, c);
    }
  }
  // rock spires hanging under the island, besides the keel (a cone each, its base buried in the underside)
  const cone = (x, y, z, rb, h, sides, cTop, cTip, rot) => {
    const tip = [x, y - h, z, cTip];
    for(let i = 0; i < sides; i++){
      const a0 = rot + i/sides*Math.PI*2, a1 = rot + (i + 1)/sides*Math.PI*2;
      tri([x + Math.cos(a0)*rb, y, z + Math.sin(a0)*rb, cTop], [x + Math.cos(a1)*rb, y, z + Math.sin(a1)*rb, cTop], tip);
    }
  };
  const nSp = Math.max(1, Math.round(isl.R*0.6));
  for(let i = 0; i < nSp; i++){
    const th = hash(i, 51, isl.seed)*Math.PI*2, f = 0.28 + hash(i, 52, isl.seed)*0.4, e = isl.edgeR(th)*f;
    const y = isl.h + (deepY(f) + 0.5)*depth, h = (1.4 + hash(i, 53, isl.seed)*2.6)*depth, rb = (0.4 + hash(i, 54, isl.seed)*0.45)*depth*1.3;
    cone(Math.cos(th)*e, y, Math.sin(th)*e, rb, h, 6, UNDER_TOP.clone().lerp(UNDER_BOT, 0.4), UNDER_BOT.clone().multiplyScalar(0.8), hash(i, 55, isl.seed)*3);
  }
  // roots trailing over the cliff edge: thin three-sided strands from under the lip, curling down and out
  const nRt = Math.round(isl.R*1.6);
  for(let i = 0; i < nRt; i++){
    const th = hash(i, 61, isl.seed)*Math.PI*2, e = isl.edgeR(th), y0 = rimY(th) - 0.3*depth, len = (0.6 + hash(i, 62, isl.seed)*1.4)*depth, w = Math.max(0.025, 0.05*depth);
    const x0 = Math.cos(th)*e*1.0, z0 = Math.sin(th)*e*1.0, x1 = Math.cos(th)*e*1.05, z1 = Math.sin(th)*e*1.05, rc = ROOT.clone().multiplyScalar(0.85 + hash(i, 63, isl.seed)*0.3);
    for(let q = 0; q < 3; q++){
      const a0 = q/3*Math.PI*2, a1 = (q + 1)/3*Math.PI*2, p = (a, x, y, z) => [x + Math.cos(a)*w, y, z + Math.sin(a)*w, rc];
      tri(p(a0, x0, y0, z0), p(a1, x0, y0, z0), [x1, y0 - len, z1, rc]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(Col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({vertexColors:true, flatShading:true, roughness:0.95, metalness:0}));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---------- bridges: endpoints on each coast, a stone arch rising between them ---------- */
export const bridges = [];
export function planBridges(){
  ISLANDS.forEach(shapeIsland);
  BRIDGES.forEach(([a, b]) => {
    const A = byId[a], B = byId[b], dir = new V3(B.x - A.x, 0, B.z - A.z).normalize();
    const la = dir.clone().multiplyScalar(A.edgeR(Math.atan2(dir.z, dir.x))*0.84);
    const lb = dir.clone().multiplyScalar(-B.edgeR(Math.atan2(-dir.z, -dir.x))*0.84);
    A.paths.push([0, 0, la.x, la.z]); B.paths.push([0, 0, lb.x, lb.z]);
    bridges.push({a, b, la, lb});
  });
  // a short path out of each building's front door (doors face the centre island, see islands.js)
  ISLANDS.forEach(i => i.paths.push([0, 0, ...i.rot(0, i.obs + 3.2)]));
  bridges.forEach(br => {
    const A = byId[br.a], B = byId[br.b];
    br.p0 = new V3(A.x + br.la.x, A.topY(br.la.x, br.la.z) + 0.06, A.z + br.la.z);
    br.p1 = new V3(B.x + br.lb.x, B.topY(br.lb.x, br.lb.z) + 0.06, B.z + br.lb.z);
    br.len = Math.hypot(br.p1.x - br.p0.x, br.p1.z - br.p0.z);
    br.dir = new V3(br.p1.x - br.p0.x, 0, br.p1.z - br.p0.z).normalize();
    br.rise = Math.min(1.0, br.len*0.06);   // a single-span stone arch: the deck rises toward the middle
  });
}
const bridgeY = (br, t) => br.p0.y + (br.p1.y - br.p0.y)*t + br.rise*Math.sin(Math.PI*t);
export const bridgePoint = (br, t, out = new V3()) => out.set(br.p0.x + (br.p1.x - br.p0.x)*t, bridgeY(br, t), br.p0.z + (br.p1.z - br.p0.z)*t);

/* An old stone arch bridge: a deck of uneven, sunken and mossy flagstones on a rubble body that deepens toward the ends
   (so each end sinks into its island), a ragged ring of arch stones under both faces, broken rock hanging beneath,
   parapets laid stone by stone (gaps where stones have fallen, coping missing or askew), moss and trailing ivy, and a
   rough leaning pillar at each corner carrying a lantern. Every stone is sized, tilted and toned by hash(), so nothing
   repeats and the world still looks the same on every visit. Nothing crosses overhead (no camera clipping at the doors).
   The walkable strip (BRIDGE_WALK) keeps the wizard's body inside the parapets. */
const BRIDGE_W = 1.15, BRIDGE_WALK = 0.6;   // deck half width (to the parapets' outer face), walkable half width
export function bridgeMeshes(){
  const g = new THREE.Group(), D = new THREE.Object3D(), side = new V3(), a = new V3(), b = new V3(), col = new THREE.Color();
  const STONE = [0x7a7468, 0x6f6a5f, 0x857e71, 0x726c62, 0x655f56, 0x8a8275], PAVE = [0x8d877b, 0x80796d, 0x958e81, 0x77716a, 0x6c675d],
        MOSSY = [0x66704f, 0x5a6646, 0x707a55], RING = [0x948c7e, 0x8a8274, 0x9d9587];
  const stones = [], moss = [], ivy = [], rocks = [], newels = [];
  const thick = t => 0.42 + (1 - Math.sin(Math.PI*t))*1.0;   // depth of stone under the deck: thin at the crown, deep at the springing
  bridges.forEach((br, bi) => {
    side.set(-br.dir.z, 0, br.dir.x);
    const h = (i, k) => hash(bi*977 + i, k, 31), pick = (L, i, k) => L[Math.floor(h(i, k)*L.length)];
    const point = t => { bridgePoint(br, t, a); return bridgePoint(br, Math.min(1, t + 0.005), new V3()).sub(bridgePoint(br, Math.max(0, t - 0.005), b)); };   // a at t; returns the deck's direction there
    // rows: [x, y, z, sx, sy, sz, color, dir, yaw, roll]
    const put = (L, t, off, dy, sx, sy, sz, c, yaw = 0, roll = 0) => { const d = point(t); L.push([a.x + side.x*off, a.y + dy, a.z + side.z*off, sx, sy, sz, c, d, yaw, roll]); };
    // the body: rubble blocks, ragged in width and depth
    const n = Math.max(8, Math.round(br.len/0.42)), sl = br.len/n;
    for(let i = 0; i < n; i++){
      const t = (i + 0.5)/n, th = thick(t)*(0.9 + h(i, 1)*0.2);
      put(stones, t, (h(i, 2) - 0.5)*0.06, -0.08 - th/2, 2*BRIDGE_W - 0.06 + (h(i, 3) - 0.5)*0.12, th, sl + 0.03, pick(STONE, i, 4), (h(i, 5) - 0.5)*0.04);
      // arch ring under both faces: voussoirs of uneven depth, some proud of the face
      [-1, 1].forEach((sd, k) => { const vh = 0.24 + h(i, 6 + k)*0.16; put(stones, t, sd*(BRIDGE_W - 0.02 + h(i, 8 + k)*0.04), -0.08 - th + vh/2, 0.08 + h(i, 10 + k)*0.05, vh, sl - 0.04, pick(RING, i, 12 + k), 0, (h(i, 14 + k) - 0.5)*0.12); });
    }
    // the deck: rows of flagstones split at random across the width, sunk and tilted a little, some mossy
    for(let u = 0.0, r = 0; u < br.len - 0.05; r++){
      const L = 0.32 + h(r, 20)*0.3, t = Math.min(1, (u + L/2)/br.len);
      for(let x = -BRIDGE_W + 0.24, c = 0; x < BRIDGE_W - 0.24 - 0.05; c++){
        const w = Math.min(0.32 + h(r*7 + c, 21)*0.42, BRIDGE_W - 0.24 - x), cx = x + w/2, mossy = h(r*7 + c, 22) < 0.12;
        put(stones, t, cx, -0.035 - h(r*7 + c, 23)*0.03, w - 0.035, 0.06, L - 0.035, mossy ? pick(MOSSY, r*7 + c, 24) : pick(PAVE, r*7 + c, 25), (h(r*7 + c, 26) - 0.5)*0.08, (h(r*7 + c, 27) - 0.5)*0.05);
        x += w;
      }
      u += L;
    }
    // parapets laid stone by stone: varied length and height, gaps where stones fell, coping missing or askew
    [-1, 1].forEach((sd, k) => {
      for(let u = 0.25, j = 0; u < br.len - 0.25; j++){
        const L = 0.3 + h(j, 30 + k)*0.32, t = (u + L/2)/br.len, end = t < 0.08 || t > 0.92;
        u += L;
        if(!end && h(j, 32 + k) < 0.07) continue;                                   // a fallen stone
        const ht = 0.36 + h(j, 34 + k)*0.2, off = sd*(BRIDGE_W - 0.12 + (h(j, 36 + k) - 0.5)*0.04);
        put(stones, t, off, ht/2 - 0.02, 0.2 + h(j, 38 + k)*0.06, ht, L - 0.03, pick(STONE, j, 40 + k), (h(j, 42 + k) - 0.5)*0.08, (h(j, 44 + k) - 0.5)*0.06);
        if(h(j, 46 + k) < 0.78) put(stones, t, off + sd*(h(j, 48 + k) - 0.5)*0.05, ht + 0.02, 0.28, 0.07, L + 0.02 - h(j, 50 + k)*0.08, pick(RING, j, 52 + k), (h(j, 54 + k) - 0.5)*0.12, (h(j, 56 + k) - 0.5)*0.1);
        if(h(j, 58 + k) < 0.22) put(moss, t, off, ht + 0.08, 0.22 + h(j, 60 + k)*0.15, 0.06, 0.2 + h(j, 62 + k)*0.2, pick(MOSSY, j, 64 + k), h(j, 66 + k)*3);
        if(h(j, 68 + k) < 0.12) put(ivy, t, off + sd*0.13, -0.1 - h(j, 70 + k)*0.35, 0.04, 0.5 + h(j, 72 + k)*0.6, 0.14, pick(MOSSY, j, 74 + k));   // ivy trailing over the outer face
      }
    });
    // broken rock hanging under the arch
    for(let k = 0; k < Math.round(br.len/2.2); k++){
      const t = 0.12 + h(k, 80)*0.76, s = 0.35 + h(k, 81)*0.45; point(t);
      rocks.push([a.x + side.x*(h(k, 82) - 0.5)*1.2, a.y - thick(t) - s*0.3, a.z + side.z*(h(k, 82) - 0.5)*1.2, s, s*(1.1 + h(k, 83)*0.9), s, pick(STONE, k, 84), null, h(k, 85)*6, (h(k, 86) - 0.5)*0.5]);
    }
    // rough corner pillars at both ends, a little out of true
    [0.015, 0.985].forEach((t, e) => { point(t); [-1, 1].forEach(sd => {
      const x = a.x + side.x*sd*(BRIDGE_W - 0.12), z = a.z + side.z*sd*(BRIDGE_W - 0.12), q = e*2 + (sd > 0 ? 1 : 0);
      newels.push([x, a.y, z, 0.85 + h(q, 90)*0.25, (h(q, 91) - 0.5)*0.08, h(q, 92)*0.6, q]); obstacles.push({x, z, r:0.22});
    }); });
  });
  const inst = (geo, m, rows, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, m, rows.length);
    rows.forEach(([x, y, z, sx, sy, sz, c, d, yaw = 0, roll = 0], i) => {
      D.position.set(x, y, z); D.rotation.set(0, 0, 0);
      if(d) D.lookAt(x + d.x, y + d.y, z + d.z);                                  // length (z) along the deck, pitched with it
      D.rotateY(yaw); D.rotateZ(roll); D.scale.set(sx, sy, sz); D.updateMatrix();
      im.setMatrixAt(i, D.matrix); if(c != null) im.setColorAt(i, col.setHex(c));
    });
    im.castShadow = shadow; im.receiveShadow = true; g.add(im); return im;
  };
  const rough = new THREE.MeshStandardMaterial({flatShading:true, roughness:1});
  inst(box(1, 1, 1), rough, stones);
  inst(new THREE.DodecahedronGeometry(0.5, 0), rough, moss, false);
  inst(box(1, 1, 1), rough, ivy, false);
  inst(new THREE.DodecahedronGeometry(0.5, 0), rough, rocks);
  // the pillars: a big lower block, a smaller one set on it off-centre, a worn cap, then an iron post and a lantern
  const pr = (fn) => newels.map(([x, y, z, hh, lean, ry, q]) => fn(x, y, z, hh, lean, ry, q));
  inst(box(1, 1, 1), rough, pr((x, y, z, hh, lean, ry, q) => [x, y + hh*0.3, z, 0.42, hh*0.6, 0.4, STONE[q % 6], null, ry, lean]));
  inst(box(1, 1, 1), rough, pr((x, y, z, hh, lean, ry, q) => [x + lean*0.5, y + hh*0.8, z, 0.34, hh*0.42, 0.33, STONE[(q + 2) % 6], null, ry + 0.2, lean*1.5]));
  inst(box(1, 1, 1), rough, pr((x, y, z, hh, lean, ry, q) => [x + lean, y + hh + 0.05, z, 0.4, 0.09, 0.38, RING[q % 3], null, ry - 0.15, lean*2]));
  inst(cyl(0.025, 0.035, 0.28, 5), mat(0x2a2522), pr((x, y, z, hh, lean) => [x + lean, y + hh + 0.22, z, 1, 1, 1]));
  inst(box(0.17, 0.22, 0.17), glow(0xffc870, 2.0), pr((x, y, z, hh, lean) => [x + lean, y + hh + 0.45, z, 1, 1, 1]), false);
  inst(new THREE.ConeGeometry(0.15, 0.12, 4).rotateY(Math.PI/4), mat(0x2a2522), pr((x, y, z, hh, lean) => [x + lean, y + hh + 0.62, z, 1, 1, 1]));
  return g;
}

/* ---------- walkable ground ---------- */
export const obstacles = [];   // {x, z, r, clear?} circles: buildings, trees, big rocks, lanterns; `clear` = extra room kept free of random scatter
const WALK_D = 0.9;            // how close to the coastline you may walk (fraction of edge radius)
export function islandAt(x, z){
  for(const i of ISLANDS){ const lx = x - i.x, lz = z - i.z, r = Math.hypot(lx, lz); if(r < i.R*1.15 && r/i.edgeR(Math.atan2(lz, lx)) < 1) return i; }
  return null;
}
/* height of walkable ground at (x,z), or null if you'd step into the void or into an obstacle */
export function groundY(x, z, rad = 0.45, ignoreObstacles = false){
  if(!ignoreObstacles) for(const o of obstacles) if(Math.hypot(x - o.x, z - o.z) < o.r + rad) return null;
  let y = null;
  for(const br of bridges){
    const dx = x - br.p0.x, dz = z - br.p0.z, t = (dx*br.dir.x + dz*br.dir.z)/br.len;
    if(t < 0 || t > 1) continue;
    if(Math.abs(dx*-br.dir.z + dz*br.dir.x) < BRIDGE_WALK){ y = Math.max(y ?? -1e9, bridgeY(br, t) + 0.04); }
  }
  for(const i of ISLANDS){
    const lx = x - i.x, lz = z - i.z, r = Math.hypot(lx, lz);
    if(r > i.R*1.15) continue;
    if(r/i.edgeR(Math.atan2(lz, lx)) < WALK_D) y = Math.max(y ?? -1e9, i.topY(lx, lz));
  }
  return y;
}
/* any ground under (x,z) regardless of obstacles (props placement, camera floor) */
export function surfaceY(x, z){
  const i = islandAt(x, z); return i ? i.topY(x - i.x, z - i.z) : null;
}
export { hash, smooth };
