/* Runespire (skills): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';

// local seeded random (engine rnd() is a shared sequence; consuming it would shift other islands' props)
let seed = 7331;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const STONE = 0x8d919c, STONE_D = 0x5b5f6c, ROOF = 0x3b3d78, GOLD = 0xc9a24a, CYAN = 0x6fe3ff, VIOLET = 0xb48cff;
const OCT = Math.PI/8;   // turn 8-sided parts so a flat face points at the door (+z)

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on). */
export function building(animated){
  const g = new THREE.Group(), stone = mat(STONE), dark = mat(STONE_D), gold = mat(GOLD, {metalness:0.4, roughness:0.5});
  const oct = (rt, rb, h, y, m) => { const o = mesh(cyl(rt, rb, h, 8), m, 0, y + h/2, 0); o.rotation.y = OCT; g.add(o); return o; };
  // stepped plinth, tapering stone shaft in two stages, banded courses
  oct(1.36, 1.46, 0.28, 0, dark);
  oct(1.2, 1.28, 0.22, 0.28, stone);
  oct(0.9, 1.06, 2.1, 0.5, stone);
  oct(1.0, 1.0, 0.1, 1.55, dark);
  oct(0.98, 0.94, 0.18, 2.58, dark);
  oct(0.7, 0.84, 1.7, 2.76, stone);
  oct(0.8, 0.8, 0.08, 3.6, dark);
  // balcony: corbelled slab, posts and a gold rail
  oct(1.12, 0.82, 0.22, 4.44, dark);
  for(let k = 0; k < 8; k++){ const a = k*Math.PI/4 + OCT; g.add(mesh(box(0.07, 0.34, 0.07), dark, Math.sin(a)*1.02, 4.83, Math.cos(a)*1.02)); }
  const rail = mesh(new THREE.TorusGeometry(1.03, 0.035, 4, 16), gold, 0, 5.0, 0); rail.rotation.x = Math.PI/2; g.add(rail);
  // lantern chamber, eave, steep roof with a floating crystal finial
  oct(0.6, 0.64, 0.84, 4.66, stone);
  oct(0.8, 0.72, 0.12, 5.5, dark);
  const roof = mesh(new THREE.ConeGeometry(0.86, 1.22, 8), mat(ROOF), 0, 5.62 + 0.61, 0); roof.rotation.y = OCT; g.add(roof);
  g.add(mesh(new THREE.OctahedronGeometry(0.07), gold, 0, 6.86, 0));
  const tip = mesh(new THREE.OctahedronGeometry(0.13), glow(CYAN, 2.4), 0, 6.78, 0); tip.scale.y = 1.6; tip.castShadow = false; g.add(tip);

  // glowing rune slits on the flat faces: shaft (all but the door face), upper shaft, chamber windows
  const slits = [];   // [face index, distance out, y, width, height]
  for(let k = 1; k < 8; k++) slits.push([k, 0.9, 1.95, 0.1, 0.5]);
  for(let k = 0; k < 8; k++) slits.push([k, 0.75, 3.25, 0.08, 0.4]);
  for(let k = 0; k < 8; k++) slits.push([k, 0.6, 5.08, 0.16, 0.42]);
  const slitIM = new THREE.InstancedMesh(box(1, 1, 0.12), glow(CYAN, 1.3), slits.length), d = new THREE.Object3D();
  slits.forEach(([k, r, y, w, h], i) => {
    const a = k*Math.PI/4;
    d.position.set(Math.sin(a)*r, y, Math.cos(a)*r); d.rotation.set(0, a, 0); d.scale.set(w, h, 1); d.updateMatrix();
    slitIM.setMatrixAt(i, d.matrix);
  });
  slitIM.castShadow = false; g.add(slitIM);

  // entrance: arched stone porch with a dark door and a glowing rune keystone
  g.add(mesh(box(0.66, 1.15, 0.16), mat(0x2f2433), 0, 1.08, 0.95));
  const doorTop = mesh(cyl(0.33, 0.33, 0.16, 8, 1), mat(0x2f2433), 0, 1.65, 0.95); doorTop.rotation.x = Math.PI/2; g.add(doorTop);
  [-0.46, 0.46].forEach(x => g.add(mesh(box(0.2, 1.3, 0.3), stone, x, 1.15, 1.08)));
  const arch = mesh(new THREE.TorusGeometry(0.46, 0.11, 4, 8, Math.PI), stone, 0, 1.8, 1.08); g.add(arch);
  g.add(mesh(box(0.14, 0.2, 0.08), glow(VIOLET, 2.2), 0, 2.28, 1.2));

  // two slow arcane bands circling the shaft, and four crystals orbiting the balcony
  const bands = [CYAN, VIOLET].map((c, k) => { const b = new THREE.Mesh(new THREE.TorusGeometry(1.25 - k*0.12, 0.022, 3, 40), glow(c, 1.1)); b.position.y = 3.15 + k*0.5; g.add(b); return b; });
  const crystals = [0x7fd6ff, 0xb48cff, 0x7fffc4, 0xffd27a].map(c => { const cr = mesh(new THREE.OctahedronGeometry(0.22), glow(c, 1.3)); cr.castShadow = false; cr.scale.y = 1.7; g.add(cr); return cr; });
  const pl = new THREE.PointLight(0x9ab8ff, 1.0, 12, 2); pl.position.set(0, 5.1, 0); g.add(pl);
  animated.push({fn:t => {
    bands[0].rotation.set(Math.PI/2 + 0.32*Math.sin(t*0.5), 0.25, t*0.4);
    bands[1].rotation.set(Math.PI/2 - 0.3*Math.cos(t*0.4), -0.3, -t*0.3);
    crystals.forEach((c, k) => { const a = t*0.6 + k*Math.PI/2 + 0.6; c.position.set(Math.cos(a)*1.65, 4.1 + Math.sin(t*1.5 + k)*0.25, Math.sin(a)*1.65); c.rotation.y = t*1.8; });
    tip.position.y = 6.78 + Math.sin(t*1.2)*0.06; tip.rotation.y = t;
  }});
  return g;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}. */
export function decorate(isl, grp, animated){
  // small rocks from build.js aren't obstacles, so seed the spacing list with them
  const placed = grp.children.filter(o => o.geometry && o.geometry.type === 'DodecahedronGeometry').map(o => [o.position.x, o.position.z, o.geometry.parameters.radius]);
  const free = (x, z, r, pathGap = 1.25) => {
    const d = Math.hypot(x, z);
    return d > isl.obs + 2.4 && d < 0.8*isl.edgeR(Math.atan2(z, x)) && isl.pathDist(x, z) > pathGap + r
      && !obstacles.some(o => Math.hypot(isl.x + x - o.x, isl.z + z - o.z) < o.r + r + 0.2)
      && !placed.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + r + 0.3);
  };
  const solid = (x, z, r) => { placed.push([x, z, r]); obstacles.push({x:isl.x + x, z:isl.z + z, r}); };

  // a small arcane circle on the grass: ring, hexagram and a hovering crystal (walkable; only the crystal at its centre blocks)
  const circ = new THREE.Group(), lineM = glow(0x8f5cff, 0.9).clone();
  lineM.side = THREE.DoubleSide;
  const flat = geo => { const m = new THREE.Mesh(geo, lineM); m.rotation.x = -Math.PI/2; circ.add(m); return m; };
  flat(new THREE.RingGeometry(0.8, 0.86, 32)); flat(new THREE.RingGeometry(0.56, 0.6, 32));
  flat(new THREE.RingGeometry(0.45, 0.5, 3, 1, Math.PI/2)); flat(new THREE.RingGeometry(0.45, 0.5, 3, 1, -Math.PI/2));
  const orb = mesh(new THREE.OctahedronGeometry(0.16), glow(VIOLET, 1.2), 0, 0.9, 0); orb.scale.y = 1.6; orb.castShadow = false; circ.add(orb);
  for(let tries = 0; tries < 150; tries++){
    const a = rand()*Math.PI*2, r = 4.3 + rand()*2.5, x = Math.cos(a)*r, z = Math.sin(a)*r;
    if(!free(x, z, 0.8, 0.4)) continue;
    // tilt the circle to the ground's slope; skip steep spots
    const sx = (isl.topY(x + 1, z) - isl.topY(x - 1, z))/2, sz = (isl.topY(x, z + 1) - isl.topY(x, z - 1))/2;
    if(Math.hypot(sx, sz) > 0.3) continue;
    circ.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-sx, 1, -sz).normalize());
    circ.position.set(x, isl.topY(x, z) + 0.05, z); grp.add(circ); placed.push([x, z, 0.8]); obstacles.push({x:isl.x + x, z:isl.z + z, r:0.25}); break;
  }

  // ring of leaning rune stones with glyphs glowing through both faces (glyph material pulses → cloned)
  const rune = glow(CYAN, 1.2).clone(), stoneM = mat(0x6e7280);
  const glyphA = box(0.06, 0.5, 0.34), glyphB = box(0.22, 0.05, 0.34);
  for(let k = 0; k < 10; k++){
    // a ring just outside the plaza; nudge each slot a little if a tree or path is in the way
    let a, x, z, ok = false;
    for(const j of [0, 0.12, -0.12, 0.24, -0.24]){ a = (k + 0.5)/10*Math.PI*2 + j; x = Math.cos(a)*4.3; z = Math.sin(a)*4.3; if((ok = free(x, z, 0.35))) break; }
    if(!ok) continue;
    const s = new THREE.Group(), h = 1.3 + rand()*0.6;
    const slab = mesh(cyl(0.22, 0.36, h, 4), stoneM, 0, h/2 - 0.1, 0); slab.rotation.y = Math.PI/4; slab.scale.z = 0.5; s.add(slab);
    const cap = mesh(new THREE.ConeGeometry(0.22, 0.3, 4), stoneM, 0, h + 0.05, 0); cap.rotation.y = Math.PI/4; cap.scale.z = 0.5; s.add(cap);
    // algiz-like rune: a stave with two raised arms
    const gy = h*0.5;
    s.add(mesh(glyphA, rune, 0, gy, 0));
    [-1, 1].forEach(sd => { const arm = mesh(glyphB, rune, sd*0.08, gy + 0.18, 0); arm.rotation.z = sd*0.9; s.add(arm); });
    s.position.set(x, isl.topY(x, z), z); s.rotation.set((rand() - 0.5)*0.12, -a + Math.PI/2, (rand() - 0.5)*0.12);
    grp.add(s); solid(x, z, 0.35);
  }

  // crystal clusters growing from the ground
  const crystalGeo = new THREE.OctahedronGeometry(0.2, 0), base = mat(0x4d5160);
  const cols = [glow(CYAN, 1.2), glow(VIOLET, 1.2), glow(0x7fffc4, 1.0)];
  for(let n = 0, tries = 0; n < 4 && tries < 160; tries++){
    const a = rand()*Math.PI*2, r = 4.4 + rand()*2.4, x = Math.cos(a)*r, z = Math.sin(a)*r;
    if(!free(x, z, 0.45)) continue;
    const c = new THREE.Group(), m = cols[n % 3];
    c.add(mesh(new THREE.DodecahedronGeometry(0.32, 0), base, 0, 0.02, 0));
    for(let i = 0; i < 4; i++){
      const cr = mesh(crystalGeo, m, (rand() - 0.5)*0.35, 0.2, (rand() - 0.5)*0.35), sc = 0.7 + rand()*0.7;
      cr.scale.set(sc, sc*(2.2 + rand()*1.4), sc); cr.rotation.set((rand() - 0.5)*0.8, rand()*3, (rand() - 0.5)*0.8); cr.castShadow = false; c.add(cr);
    }
    c.position.set(x, isl.topY(x, z), z); grp.add(c); solid(x, z, 0.45); n++;
  }

  // floating rock shards drifting around the spire's sides and back (high overhead, so not obstacles)
  const shards = [], rockM = mat(0x666a76), rockGeo = new THREE.DodecahedronGeometry(0.4, 0), shardGeo = new THREE.OctahedronGeometry(0.12, 0), shardM = glow(CYAN, 1.6);
  for(let k = 0; k < 5; k++){
    const a = isl.face + Math.PI*0.3 + k/4*Math.PI*1.4 + (rand() - 0.5)*0.3, r = 3 + rand()*1.6, s = 0.6 + rand()*0.6;   // skip the front arc over the (turned) door
    const sh = new THREE.Group();
    const rk = mesh(rockGeo, rockM); rk.scale.set(s, s*0.7, s); sh.add(rk);
    const cr = mesh(shardGeo, shardM, 0, -0.32*s, 0); cr.scale.set(s, s*2.2, s); cr.castShadow = false; sh.add(cr);
    sh.position.set(Math.sin(a)*r, isl.h + 3.4 + rand()*1.4, Math.cos(a)*r); sh.rotation.y = rand()*6;
    sh.userData.y = sh.position.y; sh.userData.p = rand()*6;
    grp.add(sh); shards.push(sh);
  }

  animated.push({fn:t => {
    rune.emissiveIntensity = 1.1 + Math.sin(t*1.6)*0.5;
    lineM.emissiveIntensity = 0.8 + Math.sin(t*2.1 + 1)*0.3;
    orb.position.y = 0.9 + Math.sin(t*1.4)*0.12; orb.rotation.y = t*1.2;
    circ.children[2].rotation.z = circ.children[3].rotation.z = t*0.25;
    shards.forEach(sh => { sh.position.y = sh.userData.y + Math.sin(t*0.8 + sh.userData.p)*0.25; sh.rotation.y = sh.userData.p + t*0.3; });
  }});
}
