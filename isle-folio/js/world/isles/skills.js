/* Runespire (skills): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';
import { instanced } from '../props.js';

// local seeded random (engine rnd() is a shared sequence; consuming it would shift other islands' props)
let seed = 7331;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const STONE = 0x8d919c, STONE_D = 0x5b5f6c, ROOF = 0x3b3d78, GOLD = 0xc9a24a, CYAN = 0x6fe3ff, VIOLET = 0xb48cff;
const MASON = [0x8d919c, 0x868a95, 0x9498a3, 0x7f838e, 0x9a9da7, 0x888c99], MORTAR = 0x4a4e5a, DEEP = 0x1c1822;
const OCT = Math.PI/8;   // turn 8-sided parts so a flat face points at the door (+z)

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on).
   Inside (rooms/skills.js) is the tower's runestone hall: coursed masonry, round columns in every corner, triple rune
   slits below and paired slits under a rune diamond above, a planked door under a voussoir arch with a violet keystone,
   a gallery on two-tier corbels with gold posts and rail, crystal lanterns, cold-fire sconces and a ribbed blue cone
   roof. The tower outside is built the same way. */
export function building(animated){
  const g = new THREE.Group(), stone = mat(STONE), dark = mat(STONE_D), gold = mat(GOLD, {metalness:0.4, roughness:0.5});
  const unit = box(1, 1, 1), tinted = mat(0xffffff, {roughness:0.93}), iron = mat(0x2a2d36, {roughness:0.6, metalness:0.4});
  const noShadow = o => { o.castShadow = false; return o; };
  const oct = (rt, rb, h, y, m) => { const o = mesh(cyl(rt, rb, h, 8), m, 0, y + h/2, 0); o.rotation.y = OCT; g.add(o); return o; };
  // face frame: a = the face's outward angle (0 = door), u across it, d out from the axis
  const at = (a, u, d) => [Math.sin(a)*d + Math.cos(a)*u, Math.cos(a)*d - Math.sin(a)*u];
  const row = (a, u, y, d, sx, sy, sz, c, rz = 0) => { const [x, z] = at(a, u, d); return [x, y, z, sx, sy, sz, a, c, 0, rz]; };
  const FACES = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k*Math.PI/4), CORNERS = FACES.map(a => a + OCT), R = A => A/Math.cos(OCT);

  // coursed masonry on one tier: every course split into the free spans between openings, filled with random-width blocks
  const blocks = [];
  const masonry = (A, y0, y1, holes) => FACES.forEach((a, k) => {
    const FW = 2*A*Math.tan(OCT);
    for(let y = y0 + 0.17, r = 0; y + 0.15 < y1; y += 0.34, r++){
      let spans = [[-FW/2, FW/2]];
      holes(k).forEach(([u0, u1, h0, h1]) => { if(y + 0.15 > h0 && y - 0.15 < h1) spans = spans.flatMap(([p, q]) => [[p, Math.min(q, u0)], [Math.max(p, u1), q]].filter(([s, e]) => e - s > 0.06)); });
      spans.forEach(([s0, s1]) => { for(let u = s0 - (r % 2)*0.15; u < s1;){ const w = 0.26 + rand()*0.24, p = Math.max(u, s0), q = Math.min(u + w, s1); if(q - p > 0.05) blocks.push(row(a, (p + q)/2, y, A + 0.025, q - p - 0.04, 0.29, 0.05, MASON[Math.floor(rand()*MASON.length)])); u += w; } });
    }
  });

  // stepped plinth with a glowing rune inlay
  oct(1.9, 2.0, 0.26, 0, dark);
  oct(1.65, 1.72, 0.22, 0.26, stone);
  const inlayM = glow(CYAN, 1.6).clone();
  const inlay = noShadow(mesh(new THREE.RingGeometry(1.76, 1.86, 8, 1, OCT), inlayM, 0, 0.265, 0)); inlay.rotation.x = -Math.PI/2; g.add(inlay);

  // lower shaft: battered footing, mortar core, triple rune slits on every face but the door's
  const A1 = 1.15, A2 = 0.95, A3 = 0.72;
  oct(R(A1) + 0.12, R(A1) + 0.25, 0.5, 0.48, dark);
  oct(R(A1), R(A1), 2.32, 0.98, mat(MORTAR));
  masonry(A1, 0.98, 3.1, k => k === 0 ? [[-0.56, 0.56, 0, 2.6], [-0.16, 0.16, 2.6, 3.1]] : [[-0.38, 0.38, 1.42, 2.82]]);
  const slitM = glow(CYAN, 1.3).clone(), slits = [], trim = [];
  FACES.forEach((a, k) => {
    if(k === 0) return;
    [[-0.18, 0.7], [0, 1], [0.18, 0.7]].forEach(([u, f]) => slits.push(row(a, u, 2.12, A1 + 0.005, 0.07, 1.0*f, 0.02)));
    [-1, 1].forEach(s => trim.push(row(a, s*0.36, 2.12, A1 + 0.05, 0.08, 1.36, 0.1, 0x6c707d)));
    trim.push(row(a, 0, 2.84, A1 + 0.06, 0.86, 0.1, 0.13, 0x6c707d), row(a, 0, 1.4, A1 + 0.07, 0.86, 0.07, 0.16, 0x6c707d));
  });
  oct(R(A1) + 0.08, R(A1) + 0.08, 0.22, 3.1, dark);                               // string course / set-off

  // upper shaft: paired tall slits under a rune diamond on all eight faces
  oct(R(A2), R(A2), 2.2, 3.32, mat(MORTAR));
  masonry(A2, 3.32, 5.5, () => [[-0.25, 0.25, 3.7, 5.4]]);
  const dias = [];
  FACES.forEach(a => {
    [-0.09, 0.09].forEach(u => slits.push(row(a, u, 4.35, A2 + 0.005, 0.07, 1.05, 0.02)));
    [-1, 1].forEach(s => trim.push(row(a, s*0.25, 4.4, A2 + 0.05, 0.07, 1.25, 0.09, 0x6c707d)));
    trim.push(row(a, 0, 4.97, A2 + 0.06, 0.58, 0.08, 0.12, 0x6c707d), row(a, 0, 3.76, A2 + 0.06, 0.58, 0.06, 0.13, 0x6c707d));
    dias.push(row(a, 0, 5.2, A2 + 0.01, 0.17, 0.17, 0.02, undefined, Math.PI/4));
  });

  // round columns in every corner, as inside: base, shaft, capital on each tier
  const colRows = (Rc, y0, y1) => CORNERS.map(a => { const [x, z] = at(a, 0, Rc); return [x, (y0 + y1)/2, z, 1, y1 - y0, 1, 0]; });
  g.add(instanced(cyl(0.12, 0.12, 1, 8), stone, colRows(R(A1) - 0.02, 0.98, 3.1)), instanced(cyl(0.09, 0.09, 1, 8), stone, colRows(R(A2) - 0.01, 3.32, 5.5)));
  const capRows = (Rc, ys) => ys.flatMap(y => CORNERS.map(a => { const [x, z] = at(a, 0, Rc); return [x, y, z, 1, 1, 1, 0]; }));
  g.add(instanced(cyl(0.17, 0.19, 0.16, 8), dark, capRows(R(A1) - 0.02, [1.06, 3.0])), instanced(cyl(0.13, 0.14, 0.12, 8), dark, capRows(R(A2) - 0.01, [3.38, 5.42])));

  // the gallery: two-tier corbels under a projecting ledge, gold posts and a gold rail on every face
  const AG = 1.5*Math.cos(OCT) - 0.08, FWG = 2*AG*Math.tan(OCT), gal = [], goldRows = [];
  FACES.forEach(a => {
    [-0.3, 0, 0.3].forEach(u => gal.push(row(a, u, 5.38, A2 + 0.17, 0.14, 0.24, 0.34, STONE_D), row(a, u, 5.16, A2 + 0.1, 0.12, 0.22, 0.2, STONE_D)));
    [-0.5, -0.25, 0, 0.25, 0.5].forEach(f => goldRows.push(row(a, f*FWG*0.92, 5.95, AG, 0.05, 0.42, 0.05)));
    goldRows.push(row(a, 0, 6.18, AG, FWG*0.98, 0.05, 0.07));
  });
  oct(1.5, 1.22, 0.24, 5.5, dark);
  g.add(instanced(unit, tinted, gal), instanced(unit, gold, goldRows));

  // crystal lanterns hanging under the gallery at every corner
  const lantR = 1.32, lr = (geo, m, y, ry = 0) => instanced(geo, m, CORNERS.map(a => { const [x, z] = at(a, 0, lantR); return [x, y, z, 1, 1, 1, ry]; }), false);
  const lanternM = glow(CYAN, 1.8).clone();
  g.add(lr(cyl(0.015, 0.015, 0.36, 4), iron, 5.32), lr(new THREE.ConeGeometry(0.12, 0.1, 6), iron, 5.1), lr(new THREE.OctahedronGeometry(0.08, 0).scale(1, 1.6, 1), lanternM, 4.92));
  g.add(lr(new THREE.ConeGeometry(0.08, 0.08, 6).rotateX(Math.PI), iron, 4.74));

  // upper chamber: tall paired slits; eave; a steep ribbed roof with four lucarnes and a floating crystal finial
  oct(R(A3), R(A3), 1.11, 5.74, mat(MORTAR));
  masonry(A3, 5.74, 6.85, () => [[-0.2, 0.2, 5.8, 6.8]]);
  FACES.forEach(a => {
    [-0.07, 0.07].forEach(u => slits.push(row(a, u, 6.3, A3 + 0.005, 0.06, 0.8, 0.02)));
    [-1, 1].forEach(s => trim.push(row(a, s*0.19, 6.3, A3 + 0.04, 0.06, 0.95, 0.08, 0x6c707d)));
  });
  g.add(instanced(unit, tinted, blocks), instanced(unit, tinted, trim), instanced(unit, slitM, slits, false), instanced(unit, slitM, dias, false));
  oct(1.05, 0.9, 0.16, 6.85, dark);
  const RB = 1.12, RHt = 2.3, RY = 7.01, apex = new THREE.Vector3(0, RY + RHt, 0);
  const roof = mesh(new THREE.ConeGeometry(RB, RHt, 8), mat(ROOF), 0, RY + RHt/2, 0); roof.rotation.y = OCT; g.add(roof);
  CORNERS.forEach(a => {
    const [x, z] = at(a, 0, RB + 0.01), rib = mesh(box(0.06, 0.06, Math.hypot(RB, RHt)), gold, x/2, RY + RHt/2 + 0.02, z/2);
    rib.lookAt(apex); g.add(rib);                                                   // from the eave corner up to the apex
  });
  [0, 2, 4, 6].forEach(k => {
    const a = FACES[k], [x, z] = at(a, 0, 0.78), dm = new THREE.Group(); dm.position.set(x, 7.42, z); dm.rotation.y = a; g.add(dm);
    dm.add(mesh(box(0.3, 0.34, 0.36), stone, 0, 0, 0));
    const cap = mesh(new THREE.ConeGeometry(0.26, 0.24, 4), mat(ROOF), 0, 0.29, 0); cap.rotation.y = Math.PI/4; dm.add(cap);
    dm.add(noShadow(mesh(box(0.07, 0.2, 0.02), slitM, 0, -0.01, 0.185)));
  });
  g.add(mesh(cyl(0.1, 0.14, 0.12, 8), gold, 0, apex.y - 0.02, 0), mesh(new THREE.ConeGeometry(0.05, 0.3, 6), gold, 0, apex.y + 0.18, 0));
  const tip = noShadow(mesh(new THREE.OctahedronGeometry(0.15), glow(CYAN, 2.4), 0, apex.y + 0.55, 0)); tip.scale.y = 1.6; g.add(tip);

  // the door: a gabled stone portal, a planked door with iron straps under a voussoir arch, the violet keystone,
  // and cold-fire sconces either side
  const PF = A1 + 0.32, DW = 0.62, DS = 1.25, AR = DW/2, half = (r, t) => new THREE.CylinderGeometry(r, r, t, 12, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2);
  g.add(mesh(box(1.1, 2.0, 0.32), stone, 0, 1.48, A1 + 0.16));
  g.add(mesh(cyl(0.62, 0.62, 0.32, 3).rotateX(-Math.PI/2).scale(1, 0.4, 1), stone, 0, 2.48 + 0.124, A1 + 0.16));
  [-1, 1].forEach(s => { const sl = mesh(box(0.66, 0.08, 0.4), dark, s*0.27, 2.62, A1 + 0.16); sl.rotation.z = -s*0.43; g.add(sl); });
  const keyM = glow(VIOLET, 2.0).clone();
  g.add(mesh(box(DW, DS - 0.48, 0.02), mat(DEEP), 0, (DS + 0.48)/2, PF + 0.005), mesh(half(AR, 0.02), mat(DEEP), 0, DS, PF + 0.005));
  const plank = mat(0x2f2433);
  g.add(mesh(box(DW - 0.04, DS - 0.48, 0.04), plank, 0, (DS + 0.48)/2, PF + 0.02), mesh(half(AR - 0.02, 0.04), plank, 0, DS, PF + 0.02));
  const door = [];
  [-0.15, 0, 0.15].forEach(u => door.push([u, 0.975, PF + 0.042, 0.015, 0.95, 0.01, 0, 0x1f1824]));   // plank seams
  [0.68, 1.05].forEach(y => door.push([0, y, PF + 0.05, DW - 0.06, 0.05, 0.02, 0, 0x2a2d36]));
  [-1, 1].forEach(s => door.push([s*(AR + 0.06), (DS + 0.48)/2, PF + 0.04, 0.12, DS - 0.48, 0.1, 0, 0x7a7e8b]));
  for(let i = 0; i < 9; i++){ if(i === 4) continue; const th = (i + 0.5)*Math.PI/9, r = AR + 0.09; door.push([Math.cos(th)*r, DS + Math.sin(th)*r, PF + 0.04, 0.12, 0.18, 0.1, 0, i % 2 ? 0x6c707d : 0x7a7e8b, 0, th - Math.PI/2]); }
  door.push([0, 0.5, PF + 0.1, 0.9, 0.05, 0.28, 0, STONE_D]);
  g.add(instanced(unit, tinted, door));
  g.add(noShadow(mesh(box(0.13, 0.2, 0.1), keyM, 0, DS + AR + 0.1, PF + 0.05)));
  g.add(mesh(new THREE.TorusGeometry(0.045, 0.012, 4, 10), gold, 0.16, 0.92, PF + 0.06));
  const dia = noShadow(mesh(box(0.16, 0.16, 0.02), slitM, 0, 2.88, A1 + 0.01)); dia.rotation.z = Math.PI/4; g.add(dia);   // rune diamond over the portal
  const fOut = new THREE.MeshBasicMaterial({color:0x6fcfff, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending, depthWrite:false});
  const fIn = new THREE.MeshBasicMaterial({color:0xe6f7ff, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false});
  const flames = [];
  [-1, 1].forEach(s => {
    g.add(mesh(box(0.04, 0.04, 0.16), iron, s*0.44, 1.56, PF + 0.08), mesh(cyl(0.08, 0.04, 0.08, 6), iron, s*0.44, 1.6, PF + 0.16));
    const o = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), fOut), m = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 5), fIn);
    o.position.set(s*0.44, 1.75, PF + 0.16); m.position.set(s*0.44, 1.7, PF + 0.16); g.add(o, m); flames.push(o, m);
  });

  // crystal clusters growing at the plinth's corners
  const shards = [[], []];
  CORNERS.forEach((a, k) => { if(k === 0 || k === 7) return; for(let j = 0; j < 3; j++){ const [x, z] = at(a, (rand() - 0.5)*0.25, 1.68 + (rand() - 0.5)*0.12), h = 0.6 + rand()*0.8; shards[j & 1].push([x, 0.26 + h*0.12, z, 0.7, h*1.4, 0.7, rand()*3, undefined, (rand() - 0.5)*0.7, (rand() - 0.5)*0.7]); } });
  g.add(instanced(new THREE.OctahedronGeometry(0.1, 0), glow(CYAN, 1.2), shards[0], false), instanced(new THREE.OctahedronGeometry(0.1, 0), glow(VIOLET, 1.2), shards[1], false));

  // two slow arcane bands circling the shaft, and four crystals orbiting the gallery
  const bands = [CYAN, VIOLET].map((c, k) => { const b = noShadow(new THREE.Mesh(new THREE.TorusGeometry(1.75 - k*0.14, 0.022, 3, 48), glow(c, 1.1))); b.position.y = 2.3 + k*0.6; g.add(b); return b; });
  const crystals = [0x7fd6ff, 0xb48cff, 0x7fffc4, 0xffd27a].map(c => { const cr = noShadow(mesh(new THREE.OctahedronGeometry(0.2), glow(c, 1.3))); cr.scale.y = 1.7; g.add(cr); return cr; });
  const pl = new THREE.PointLight(0x9ab8ff, 1.0, 12, 2); pl.position.set(0, 6.3, 0); g.add(pl);
  animated.push({fn:t => {
    bands[0].rotation.set(Math.PI/2 + 0.2*Math.sin(t*0.5), 0.15, t*0.4);
    bands[1].rotation.set(Math.PI/2 - 0.18*Math.cos(t*0.4), -0.18, -t*0.3);
    crystals.forEach((c, k) => { const a = t*0.6 + k*Math.PI/2 + 0.6; c.position.set(Math.cos(a)*2.0, 6.5 + Math.sin(t*1.5 + k)*0.22, Math.sin(a)*2.0); c.rotation.y = t*1.8; });
    tip.position.y = apex.y + 0.55 + Math.sin(t*1.2)*0.06; tip.rotation.y = t;
    slitM.emissiveIntensity = 1.2 + Math.sin(t*1.3)*0.25;
    inlayM.emissiveIntensity = 1.4 + Math.sin(t*1.8)*0.4;
    lanternM.emissiveIntensity = 1.6 + Math.sin(t*2.4)*0.3;
    keyM.emissiveIntensity = 1.8 + Math.sin(t*1.5)*0.5;
    flames.forEach((f, k) => f.scale.set(1, 1 + Math.sin(t*(8 + k*1.9) + k)*0.2, 1));
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
    const a = rand()*Math.PI*2, r = 4.8 + rand()*2.2, x = Math.cos(a)*r, z = Math.sin(a)*r;
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
    for(const j of [0, 0.12, -0.12, 0.24, -0.24]){ a = (k + 0.5)/10*Math.PI*2 + j; x = Math.cos(a)*4.8; z = Math.sin(a)*4.8; if((ok = free(x, z, 0.35))) break; }
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
    const a = rand()*Math.PI*2, r = 4.8 + rand()*2.2, x = Math.cos(a)*r, z = Math.sin(a)*r;
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
