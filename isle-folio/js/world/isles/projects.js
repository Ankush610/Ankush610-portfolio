/* Forgewell (projects): a stone-and-timber smithy with a glowing furnace, plus an ore cart, ore heap and quench trough. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { anvil } from '../props.js';
import { obstacles } from '../terrain.js';

// local seeded random: never touch engine rnd() (shared sequence for every island)
let seed = 4242;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const STONE = 0x6f6a64, DARK = 0x4f4b47, BRICK = 0x8a4f3a, TIMBER = 0x4a3424, PLASTER = 0xcdb58c,
      ROOF = 0x7d3b2b, WOOD = 0x7a5536, IRON = 0x3a3d44, WATER = 0x3d6f8a;
const ROOF_K = 0.655;   // roof pitch (rise per run)

const add = (g, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = mesh(geo, m, x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };

function barrel(){
  const g = new THREE.Group();
  add(g, cyl(0.3, 0.27, 0.7, 10), mat(WOOD), 0, 0.35, 0);
  [0.12, 0.58].forEach(y => add(g, cyl(0.31, 0.31, 0.06, 10), mat(IRON), 0, y, 0));
  add(g, cyl(0.27, 0.27, 0.02, 10), mat(WATER, {roughness:0.3}), 0, 0.66, 0);
  return g;
}

/* The building: centred on the origin at ground level, front door facing +z, inside radius obs (2.7). */
export function building(animated){
  const g = new THREE.Group();
  // stone plinth + stone ground floor + half-timbered upper floor
  add(g, box(3.5, 0.3, 2.7), mat(DARK), 0, 0.15, 0);
  add(g, box(3.2, 1.0, 2.4), mat(STONE), 0, 0.8, 0);
  add(g, box(3.0, 0.9, 2.2), mat(PLASTER), 0, 1.75, 0);
  const tim = mat(TIMBER);
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(g, box(0.14, 0.95, 0.14), tim, sx*1.5, 1.75, sz*1.1)));
  [-1, 1].forEach(sz => add(g, box(3.1, 0.12, 0.14), tim, 0, 1.33, sz*1.12));
  [-1, 1].forEach(sx => add(g, box(0.14, 0.12, 2.3), tim, sx*1.52, 1.33, 0));
  add(g, box(0.1, 1.0, 0.06), tim, 1.0, 1.75, 1.13, 0, 0, 0.7);      // front brace
  [-1, 1].forEach(sx => add(g, box(0.06, 1.0, 0.1), tim, sx*1.53, 1.75, 0.5, 0.7*sx, 0, 0)); // side braces
  // warm windows (front right + both sides)
  const win = glow(0xffc46a, 1.1);
  add(g, box(0.42, 0.36, 0.04), win, -0.25, 1.82, 1.11);
  [-0.75, 0.75].forEach(x => add(g, box(0.42, 0.36, 0.04), win, x, 1.8, -1.11));
  [-1, 1].forEach(sx => add(g, box(0.04, 0.36, 0.42), win, sx*1.51, 1.78, -0.35));
  [-1, 1].forEach(sx => add(g, box(0.05, 0.08, 0.5), tim, sx*1.53, 1.98, -0.35));

  // gable roof: triangular prism + two tile planes + ridge
  const tri = new THREE.Shape(); tri.moveTo(-1.1, 0); tri.lineTo(1.1, 0); tri.lineTo(0, 1.1*ROOF_K); tri.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(tri, {depth:3.0, bevelEnabled:false}); gableGeo.translate(0, 0, -1.5); gableGeo.rotateY(Math.PI/2);
  add(g, gableGeo, mat(PLASTER), 0, 2.2, 0);
  const a = Math.atan(ROOF_K), run = 1.6, L = run/Math.cos(a), t = 0.12, roof = mat(ROOF);
  [-1, 1].forEach(sz => {
    const zc = sz*run/2, yc = 2.2 + (1.1 - run/2)*ROOF_K;
    add(g, box(3.5, t, L + 0.04), roof, 0, yc + Math.cos(a)*t/2, zc + sz*Math.sin(a)*t/2, sz*a);
  });
  add(g, box(3.6, 0.12, 0.2), mat(0x5a2a1f), 0, 2.2 + 1.1*ROOF_K + 0.13, 0);

  // door + frame + canopy
  add(g, box(0.95, 1.4, 0.08), tim, 0.55, 1.0, 1.21);
  add(g, box(0.78, 1.25, 0.06), mat(0x5e3d25), 0.55, 0.93, 1.25);
  [0.75, 1.2].forEach(y => add(g, box(0.8, 0.06, 0.02), mat(IRON), 0.55, y, 1.29));
  add(g, box(1.1, 0.07, 0.4), roof, 0.55, 1.82, 1.38, 0.3);  // door canopy

  // furnace: brick block protruding from the front-left, with an arched glowing mouth
  add(g, box(1.25, 1.3, 0.75), mat(BRICK), -0.95, 0.65, 1.45);
  add(g, box(1.35, 0.14, 0.85), mat(DARK), -0.95, 1.33, 1.45);
  add(g, box(0.86, 0.66, 0.06), mat(0x2a2522), -0.95, 0.6, 1.83);                  // soot surround
  const fireMat = glow(0xff7a2a, 2.4).clone(), coalMat = glow(0xff3d12, 2.0).clone();
  const mouth = add(g, box(0.6, 0.42, 0.05), fireMat, -0.95, 0.5, 1.85); mouth.castShadow = false;
  const arch = add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10, 1, false, -Math.PI/2, Math.PI), fireMat, -0.95, 0.71, 1.85, Math.PI/2); arch.castShadow = false;
  add(g, box(0.62, 0.1, 0.12), coalMat, -0.95, 0.3, 1.86).castShadow = false;
  add(g, box(0.9, 0.12, 0.18), mat(DARK), -0.95, 0.24, 1.9);                      // hearth sill
  // chimney rises from the furnace through the roof
  add(g, cyl(0.42, 0.62, 0.55, 4), mat(BRICK), -0.95, 1.65, 1.35, 0, Math.PI/4);
  add(g, box(0.5, 2.4, 0.5), mat(BRICK), -0.95, 3.05, 1.3);
  [2.35, 3.25].forEach(y => add(g, box(0.56, 0.08, 0.56), mat(DARK), -0.95, y, 1.3));
  add(g, box(0.64, 0.14, 0.64), mat(DARK), -0.95, 4.3, 1.3);
  const chimTop = 4.37;

  // front yard: anvil on a stump with a hot ingot, quench barrel, crate with ingots
  const fy = new THREE.Group(); fy.position.set(-0.08, 0, 2.3); fy.rotation.y = 1.75; g.add(fy);   // anvil between furnace and door
  fy.add(anvil());
  add(fy, box(0.28, 0.05, 0.1), glow(0xff8a3a, 2.2), 0.15, 0.8, 0).castShadow = false;   // hot bar
  add(fy, box(0.4, 0.05, 0.05), mat(WOOD), -0.15, 0.79, 0.15, 0, 0.5);                  // hammer handle
  add(fy, box(0.1, 0.1, 0.16), mat(IRON), 0.03, 0.81, 0.06, 0, 0.5);                     // hammer head
  const qb = barrel(); qb.position.set(-2.12, 0, 0.75); g.add(qb);
  add(g, box(0.62, 0.62, 0.62), mat(0x8a6542), 1.85, 0.31, 1.65, 0, 0.3);
  const gold = mat(0xc9a24a, {metalness:0.6, roughness:0.4}), steel = mat(0x9aa3ad, {metalness:0.6, roughness:0.4});
  [[0, 0, gold], [0.17, 0, steel], [-0.17, 0, gold], [0.08, 1, steel], [-0.09, 1, gold]].forEach(([dx, row, m]) =>
    add(g, box(0.13, 0.08, 0.36), m, 1.85 + Math.cos(0.3)*dx, 0.66 + row*0.08, 1.65 - Math.sin(0.3)*dx, 0, 0.3 + row*Math.PI/2));

  // right side lean-to: slanted roof on posts over a workbench and tool rack
  add(g, box(0.85, 0.08, 2.0), roof, 1.98, 1.5, 0, 0, 0, -0.42);
  [-0.85, 0.85].forEach(z => add(g, box(0.1, 1.38, 0.1), tim, 2.3, 0.69, z));
  add(g, box(0.5, 0.08, 1.3), mat(WOOD), 1.95, 0.82, 0);
  [-0.55, 0.55].forEach(z => add(g, box(0.4, 0.5, 0.06), tim, 1.95, 0.53, z));
  add(g, box(0.16, 0.14, 0.2), mat(IRON), 2.1, 0.93, -0.4);                       // vise
  add(g, box(0.04, 0.5, 1.1), mat(TIMBER), 1.62, 1.12, 0.1);                       // tool board
  [[-0.3, 0.32], [0, 0.4], [0.3, 0.28], [0.52, 0.36]].forEach(([z, h], i) => {
    add(g, box(0.04, h, 0.05), mat(WOOD), 1.66, 1.18 - h/2 + 0.12, 0.1 + z);
    add(g, box(0.05, 0.07, i % 2 ? 0.16 : 0.1), mat(IRON), 1.67, 1.26, 0.1 + z);
  });

  // back: firewood stack; left: coal pile
  const logGeo = cyl(0.11, 0.11, 1.2, 6), logM = mat(0x6b4a30);
  [[-0.23, 0], [0, 0], [0.23, 0], [-0.12, 1], [0.12, 1], [0, 2]].forEach(([dx, row]) =>
    add(g, logGeo, logM, 0.6, 0.41 + row*0.19, -1.62 + dx, 0, 0, Math.PI/2));
  const coal = mat(0x2a2a2e);
  [[-1.95, -0.5, 0.3], [-2.15, -0.15, 0.22], [-1.85, -0.9, 0.2], [-2.2, -0.75, 0.18]].forEach(([x, z, s]) =>
    add(g, new THREE.DodecahedronGeometry(s, 0), coal, x, s*0.5, z, rand(), rand()*6, rand()));

  // embers rising from the chimney (one Points object, buffer reused every frame)
  const N = 26, pos = new Float32Array(N*3), ph = [];
  for(let i = 0; i < N; i++) ph.push([rand(), rand()*6.28, 0.5 + rand()*0.6]);
  const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({color:0xffa040, size:0.13, transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false}));
  embers.frustumCulled = false; g.add(embers);
  // smoke puffs: one private material, puffs swell then shrink as they rise
  const smokeM = new THREE.MeshStandardMaterial({color:0xb3ada6, emissive:0x3a302a, flatShading:true, roughness:1, transparent:true, opacity:0.42, depthWrite:false});
  const puffs = [0, 1, 2, 3].map(() => { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), smokeM); g.add(p); return p; });

  const pl = new THREE.PointLight(0xff7a2a, 1.4, 9, 2); pl.position.set(-0.95, 0.75, 2.6); g.add(pl);
  animated.push({fn:t => {
    const f = Math.sin(t*9)*0.5 + Math.sin(t*23)*0.3;
    pl.intensity = 1.3 + f*0.35;
    fireMat.emissiveIntensity = 2.3 + f*0.6;
    coalMat.emissiveIntensity = 1.9 + Math.sin(t*3.1)*0.4;
    for(let i = 0; i < N; i++){
      const [o, w, sp] = ph[i], k = (o + t*sp*0.45) % 1;
      pos[i*3] = -0.95 + Math.sin(w + t*2 + k*5)*0.25*k - k*0.35;
      pos[i*3 + 1] = chimTop + k*1.3;
      pos[i*3 + 2] = 1.3 + Math.cos(w + t*1.7)*0.2*k - k*0.25;
    }
    eGeo.attributes.position.needsUpdate = true;
    puffs.forEach((p, i) => {
      const k = (i/4 + t*0.12) % 1;
      p.position.set(-0.95 - k*0.9, chimTop + 0.15 + k*1.1, 1.3 - k*0.7);
      p.scale.setScalar(Math.max(0.01, Math.sin(Math.PI*Math.min(1, k*1.15))*(0.8 + k)));
      p.rotation.set(k*2, i + k*3, 0);
    });
  }});
  return g;
}

/* ---------- island scenery: ore cart on a short rail, ore heap, water trough ---------- */
function oreCart(){
  const g = new THREE.Group();
  [-0.32, 0.32].forEach(x => add(g, box(0.05, 0.05, 1.9), mat(IRON), x, 0.03, 0));
  [-0.7, 0, 0.7].forEach(z => add(g, box(0.85, 0.05, 0.14), mat(TIMBER), 0, 0.02, z));
  add(g, cyl(0.62, 0.45, 0.5, 4, 1), mat(0x6a4b32), 0, 0.55, 0, 0, Math.PI/4).scale.set(0.85, 1, 1.15);
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(g, cyl(0.15, 0.15, 0.06, 8), mat(IRON), sx*0.34, 0.18, sz*0.33, 0, 0, Math.PI/2)));
  const ore = mat(0xb0643a, {metalness:0.4, roughness:0.6});
  [[0, 0.12], [0.15, -0.15], [-0.18, -0.05], [0.05, 0.25]].forEach(([x, z], i) =>
    add(g, new THREE.DodecahedronGeometry(0.17, 0), i % 2 ? mat(0x5b5f68) : ore, x, 0.82, z, i, i*2, 0));
  return g;
}
function oreHeap(){
  const g = new THREE.Group(), ore = mat(0xb0643a, {metalness:0.4, roughness:0.6}), crystal = glow(0x6fd3e6, 0.9);
  for(let i = 0; i < 8; i++){
    const a = i*2.4, r = i ? 0.25 + rand()*0.35 : 0, s = 0.22 + rand()*0.18;
    add(g, new THREE.DodecahedronGeometry(s, 0), i % 3 === 1 ? ore : mat(i % 2 ? 0x5b5f68 : 0x4e4a46), Math.cos(a)*r, s*0.6 + (i ? 0 : 0.18), Math.sin(a)*r, rand(), rand()*6, rand());
  }
  add(g, new THREE.OctahedronGeometry(0.12, 0), crystal, 0.1, 0.55, 0.05, 0, 0, 0.2);
  add(g, new THREE.OctahedronGeometry(0.09, 0), crystal, -0.2, 0.42, 0.18, 0.3, 0, 0);
  // a pickaxe leaning on the heap
  add(g, box(0.05, 0.9, 0.05), mat(WOOD), 0.55, 0.42, 0.2, 0, 0, 0.35);
  add(g, box(0.5, 0.06, 0.06), mat(IRON), 0.4, 0.85, 0.2, 0, 0, 0.25);
  return g;
}
function trough(){
  const g = new THREE.Group();
  add(g, box(1.2, 0.4, 0.55), mat(WOOD), 0, 0.3, 0);
  add(g, box(1.08, 0.04, 0.43), mat(WATER, {roughness:0.3}), 0, 0.49, 0);
  [-0.5, 0.5].forEach(x => add(g, box(0.1, 0.2, 0.6), mat(TIMBER), x, 0.1, 0));
  return g;
}

/* Place each piece on open ground: off paths, out of the plaza, inland of the coast, clear of trees/rocks already placed. */
export function decorate(isl, grp, animated){
  seed = 777;
  const placed = [];
  const spot = (r0, rad) => {
    for(let tries = 0; tries < 300; tries++){
      const ang = rand()*Math.PI*2, e = isl.edgeR(ang), r = r0 + rand()*Math.max(0, e*0.76 - r0);
      const x = Math.cos(ang)*r, z = Math.sin(ang)*r;
      if(r > e*0.78 || isl.pathDist(x, z) < 1.2 + rad) continue;
      if(placed.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + rad + 0.6)) continue;
      if(obstacles.some(o => Math.hypot(o.x - isl.x - x, o.z - isl.z - z) < o.r + rad + 0.25)) continue;
      placed.push([x, z, rad]); return [x, z];
    }
    return null;
  };
  const put = (obj, r0, rad, face) => {
    const p = spot(r0, rad); if(!p) return;
    obj.position.set(p[0], isl.topY(p[0], p[1]) - 0.03, p[1]);
    obj.rotation.y = face ? Math.atan2(p[0], p[1]) + face : rand()*6;
    grp.add(obj);
    obstacles.push({x:isl.x + p[0], z:isl.z + p[1], r:rad});
  };
  const minR = isl.obs + 2.6;
  put(oreCart(), minR, 0.75, Math.PI/2);
  put(oreHeap(), minR, 0.75);
  put(trough(), minR, 0.65, Math.PI/2);
}
