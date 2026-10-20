/* Floating-island terrain and rope bridges, plus the walkable-ground query the player uses.
   Every island is a polar mesh: noisy coastline, hills, a flat plateau for its building, dirt paths
   to each bridge, a beach rim and a rocky underside. The same height function drives the mesh and walking,
   so what you see is exactly what you stand on. No physics engine needed. */
import { THREE, V3, mesh, mat, glow, box, cyl } from '../engine.js';
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
const UNDER_TOP = new THREE.Color(0x5a4c3e), UNDER_BOT = new THREE.Color(0x2a231d);
const UNDER = [[0.99, -0.9], [0.93, -2.0], [0.8, -3.4], [0.62, -5.0], [0.4, -6.8], [0.18, -8.4], [0, -9.4]];

export function islandMesh(isl, rings = 22, segs = 72){
  const grass = new THREE.Color(isl.top), dark = grass.clone().multiplyScalar(0.72), depth = isl.R/8.5;
  const P = [], Col = [];
  const push = (x, y, z, c) => { P.push(x, y, z); Col.push(c.r, c.g, c.b); };
  const topColor = (x, y, z, d, r) => {
    const v = 0.94 + hash(Math.round(x*7), Math.round(z*7), isl.seed)*0.12;
    C.copy(grass).lerp(dark, smooth(0.2, 1.2, y - isl.h)*0.6).lerp(ROCK, smooth(1.3, 2.6, y - isl.h));
    if(r < isl.obs + 0.9 && isl.plaza) C.lerp(PLAZA, 0.85);
    C.lerp(DIRT, (1 - smooth(0.45, 0.85, isl.pathDist(x, z)))*(r > isl.obs*0.7 ? 0.9 : 0));
    C.lerp(SAND, smooth(0.83, 0.92, d));
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
  UNDER.forEach(([f, dy], k) => {
    const row = [], c = UNDER_TOP.clone().lerp(UNDER_BOT, k/(UNDER.length - 1));
    for(let j = 0; j < segs; j++){
      const th = j/segs*Math.PI*2, jit = f > 0 ? 1 + (hash(j, k, isl.seed) - 0.5)*0.16 : 0;
      const e = isl.edgeR(th)*f*jit;
      row.push([Math.cos(th)*e, isl.h + dy*depth + (hash(j, k + 9, isl.seed) - 0.5)*0.6*depth, Math.sin(th)*e, c.clone().multiplyScalar(0.9 + hash(j, k + 3, isl.seed)*0.2)]);
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
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(Col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({vertexColors:true, flatShading:true, roughness:0.95, metalness:0}));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---------- bridges: endpoints on each coast, sagging plank walkway, rope rails ---------- */
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
    br.sag = Math.min(0.7, br.len*0.035);
  });
}
const bridgeY = (br, t) => br.p0.y + (br.p1.y - br.p0.y)*t - br.sag*Math.sin(Math.PI*t);
export const bridgePoint = (br, t, out = new V3()) => out.set(br.p0.x + (br.p1.x - br.p0.x)*t, bridgeY(br, t), br.p0.z + (br.p1.z - br.p0.z)*t);

export function bridgeMeshes(){
  const g = new THREE.Group(), dummy = new THREE.Object3D(), side = new V3(), a = new V3(), b = new V3();
  const planks = [], posts = [];
  bridges.forEach(br => {
    side.set(-br.dir.z, 0, br.dir.x);
    const n = Math.ceil(br.len/0.36);
    for(let i = 0; i <= n; i++) planks.push([br, i/n]);
    const m = Math.max(2, Math.round(br.len/2.4));
    for(let i = 0; i <= m; i++) [-1, 1].forEach(sd => posts.push([br, i/m, sd]));
    [-1, 1].forEach(sd => {
      const pts = []; for(let i = 0; i <= 24; i++){ const t = i/24; bridgePoint(br, t, a).addScaledVector(side, sd*0.95); a.y += 0.95 - Math.sin(Math.PI*t)*0.12; pts.push(a.clone()); }
      const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.035, 4), mat(0xb8a27a));
      g.add(rope);
    });
  });
  const plankIM = new THREE.InstancedMesh(box(1.9, 0.08, 0.3), new THREE.MeshStandardMaterial({flatShading:true, roughness:0.9}), planks.length);
  const col = new THREE.Color();
  planks.forEach(([br, t], i) => {
    bridgePoint(br, t, dummy.position); bridgePoint(br, t < 1 ? t + 0.01 : t - 0.01, b);   // planks are symmetric, so facing back at the end is fine
    dummy.lookAt(b); dummy.rotateZ((hash(i, 1, 9) - 0.5)*0.06); dummy.updateMatrix();
    plankIM.setMatrixAt(i, dummy.matrix); plankIM.setColorAt(i, col.setHex(0x6b4a30).multiplyScalar(0.8 + hash(i, 2, 9)*0.4));
  });
  plankIM.castShadow = plankIM.receiveShadow = true; g.add(plankIM);
  const postIM = new THREE.InstancedMesh(cyl(0.06, 0.08, 1.1, 5), mat(0x5a3d28), posts.length);
  posts.forEach(([br, t, sd], i) => {
    side.set(-br.dir.z, 0, br.dir.x);
    bridgePoint(br, t, dummy.position).addScaledVector(side, sd*0.95); dummy.position.y += 0.45; dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    postIM.setMatrixAt(i, dummy.matrix);
  });
  postIM.castShadow = true; g.add(postIM);
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
    if(Math.abs(dx*-br.dir.z + dz*br.dir.x) < 0.8){ y = Math.max(y ?? -1e9, bridgeY(br, t) + 0.04); }
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
