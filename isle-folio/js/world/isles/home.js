/* Hearthstone (home): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';
import { instanced } from '../props.js';

// local seeded random (never touch engine rnd(): it's a shared sequence)
let seed = 1337;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const STONE = 0x686b74, DARK = 0x5f626a, DEEP = 0x2a2420, GOLD = 0xf0b54a, EMBER = 0xff8a3a;
const TRIM = 0xa29a8c, MORTAR = 0x4b4d55, IRON = 0x2a2c33, WOOD = 0x4a3222, CLOTH = 0x6e2420, BRASS = 0xc8902e;
const ASHLAR = [0x686b74, 0x6f727b, 0x5f626a, 0x74737a, 0x66666e, 0x6b6a70, 0x62656d];
const OCT = Math.PI/8, A = 1.5, RB = A/Math.cos(OCT), FW = 2*A*Math.tan(OCT);   // keep: octagon apothem, corner radius, face width

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on).
   The hall inside (rooms/home.js) is ashlar over a dark base, with glowing seams, a rune band, red banners and
   light falling through an oculus; the keep wears the same outside: an octagonal tower with a fire in its crown. */
export function building(animated){
  const g = new THREE.Group();
  const flat = o => { o.castShadow = false; return o; };
  const oct = (r0, r1, h, y, m) => { const o = mesh(cyl(r0, r1, h, 8), m, 0, y, 0); o.rotation.y = OCT; return o; };   // flat face toward +z
  // face frame: a = the face's outward angle (0 = door), u across it, d out from the centre
  const at = (a, u, d) => [Math.sin(a)*d + Math.cos(a)*u, Math.cos(a)*d - Math.sin(a)*u];
  const onFace = (o, a, u, y, d) => { const [x, z] = at(a, u, d); o.position.set(x, y, z); o.rotation.y = a; return o; };
  const row = (a, u, y, d, sx, sy, sz, c) => { const [x, z] = at(a, u, d); return [x, y, z, sx, sy, sz, a, c]; };
  const FACES = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k*Math.PI/4), CORNERS = FACES.map(a => a + OCT);
  const unit = box(1, 1, 1), trim = mat(TRIM), iron = mat(IRON, {roughness:0.6, metalness:0.4}), brass = mat(BRASS, {metalness:0.5, roughness:0.4});

  // stepped octagonal dais with a glowing inlay, steps down at the door
  g.add(oct(2.6, 2.7, 0.28, 0.14, mat(DARK)), oct(2.15, 2.22, 0.28, 0.42, mat(0x777a82)));
  const ringMat = glow(GOLD, 2.4).clone();
  const ring = flat(mesh(new THREE.RingGeometry(2.26, 2.4, 8, 1, OCT), ringMat, 0, 0.285, 0)); ring.rotation.x = -Math.PI/2; g.add(ring);
  g.add(mesh(box(1.7, 0.14, 0.32), mat(DARK), 0, 0.07, 2.62));

  // the keep: battered footing, a mortar core faced with ashlar courses (holes left for the door and windows)
  g.add(oct(1.74, 1.88, 0.5, 0.81, mat(DARK)), oct(RB, RB, 3.6, 2.76, mat(MORTAR)));
  const LANCET = [-0.2, 0.2, 1.55, 2.95], SLIT = [-0.12, 0.12, 3.85, 4.42];
  const holes = k => k === 0 ? [[-0.6, 0.6, 0, 3.2], [-0.34, 0.34, 3.82, 4.46]] : k === 1 || k === 7 ? [] : [LANCET, SLIT];
  const blocks = [];
  FACES.forEach((a, k) => {
    for(let y = 1.23, r = 0; y < 4.5; y += 0.34, r++){
      if(y > 3.1 && y < 3.8) continue;                                     // the rune band
      let spans = [[-FW/2, FW/2]];
      holes(k).forEach(([u0, u1, y0, y1]) => { if(y + 0.15 > y0 && y - 0.15 < y1) spans = spans.flatMap(([p, q]) => [[p, Math.min(q, u0)], [Math.max(p, u1), q]].filter(([s, e]) => e - s > 0.06)); });
      spans.forEach(([s0, s1]) => {
        for(let u = s0 - (r % 2)*0.17; u < s1;){
          const w = 0.28 + rand()*0.26, p = Math.max(u, s0), q = Math.min(u + w, s1);
          if(q - p > 0.05) blocks.push(row(a, (p + q)/2, y, A + 0.025, q - p - 0.04, 0.29, 0.05, ASHLAR[Math.floor(rand()*ASHLAR.length)]));
          u += w;
        }
      });
    }
  });
  g.add(instanced(unit, mat(0xffffff, {roughness:0.95}), blocks));

  // stepped buttresses on every corner, each with a glowing seam and a pulse of light running up it (as in the hall)
  const butt = [], seamMat = glow(EMBER, 0.25), pulseMat = glow(EMBER, 1.8), pulses = [];
  CORNERS.forEach(a => {
    butt.push(row(a, 0, 1.76, RB + 0.06, 0.3, 1.4, 0.38, DARK), row(a, 0, 3.51, RB + 0.02, 0.24, 2.1, 0.3, DARK));
    butt.push(row(a, 0, 2.5, RB + 0.2, 0.32, 0.08, 0.14, 0x777a82));      // set-off ledge
    g.add(flat(onFace(mesh(box(0.05, 3.3, 0.03), seamMat), a, 0, 2.8, RB + 0.265)));
    const p = flat(onFace(mesh(box(0.08, 0.5, 0.05), pulseMat), a, 0, 2, RB + 0.27)); g.add(p); pulses.push(p);
  });
  g.add(instanced(unit, mat(0xffffff), butt));

  // rune band: trim string courses either side of a dark recess with glowing glyphs
  g.add(oct(RB + 0.08, RB + 0.08, 0.1, 3.17, trim), oct(RB + 0.08, RB + 0.08, 0.1, 3.73, trim), oct(RB + 0.01, RB + 0.01, 0.46, 3.45, mat(DEEP)));
  const runeMat = glow(GOLD, 1.8).clone(), glyphs = [];
  FACES.forEach((a, k) => [-0.42, -0.14, 0.14, 0.42].forEach(u => {
    if(k === 0 && Math.abs(u) < 0.3) return;                                // the gable's finial sits there
    glyphs.push(row(a, u, 3.45, A + 0.025, 0.035, 0.3, 0.03));
    const tick = rand();
    glyphs.push(row(a, u + (tick > 0.5 ? 0.05 : -0.05), 3.38 + tick*0.16, A + 0.025, 0.1, 0.03, 0.03));
    if(tick > 0.35) glyphs.push(row(a, u + (tick > 0.7 ? -0.04 : 0.04), 3.56 - tick*0.06, A + 0.025, 0.07, 0.03, 0.03));
  }));
  g.add(instanced(unit, runeMat, glyphs, false));

  // the door: a gabled portal of pale stone, quoined jambs, an arch of voussoirs with an ember keystone,
  // and a pair of iron-strapped doors with firelight leaking through the gap
  const PZ = A + 0.2, DF = A + 0.4, DW = 0.7, DS = 1.66, AR = DW/2;          // portal centre z, its face, door width, arch springing, arch radius
  g.add(mesh(box(1.2, 2.3, 0.4), mat(0x777a82), 0, 1.71, PZ));
  const tymp = cyl(0.8, 0.8, 0.4, 3).rotateX(-Math.PI/2).scale(1, 0.34, 1);
  g.add(mesh(tymp, mat(0x777a82), 0, 2.86 + 0.136, PZ));
  [-1, 1].forEach(s => { const sl = mesh(box(0.84, 0.09, 0.5), mat(DARK), s*0.33, 3.08, PZ); sl.rotation.z = -s*0.52; g.add(sl); });
  const fin = flat(mesh(new THREE.OctahedronGeometry(0.1), glow(GOLD, 2.2), 0, 3.42, PZ)); fin.scale.y = 1.5; g.add(fin);
  const halfDisc = r => new THREE.CylinderGeometry(r, r, 0.04, 14, 1, false, -Math.PI/2, Math.PI).rotateX(-Math.PI/2);
  g.add(mesh(box(DW, DS - 0.56, 0.02), mat(DEEP), 0, (DS + 0.56)/2, DF + 0.01), mesh(halfDisc(AR), mat(DEEP), 0, DS, DF + 0.01));
  const wood = mat(WOOD);
  [-1, 1].forEach(s => {
    g.add(mesh(box(DW/2 - 0.03, DS - 0.56, 0.04), wood, s*DW/4, (DS + 0.56)/2, DF + 0.03));
    [0.82, 1.38].forEach(y => g.add(mesh(box(DW/2 - 0.06, 0.05, 0.02), iron, s*DW/4, y, DF + 0.06)));
    const handle = mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10), brass, s*0.07, 1.12, DF + 0.065); g.add(handle);
  });
  g.add(mesh(halfDisc(AR - 0.02), wood, 0, DS, DF + 0.03));
  const doorMat = glow(EMBER, 1.8).clone();
  g.add(flat(mesh(box(0.025, DS - 0.5, 0.05), doorMat, 0, (DS + 0.56)/2 + 0.02, DF + 0.03)), flat(mesh(box(DW, 0.03, 0.04), doorMat, 0, 0.575, DF + 0.03)));
  const dress = [];
  for(let j = 0; j < 5; j++){ const w = j % 2 ? 0.16 : 0.24; [-1, 1].forEach(s => dress.push([s*(AR + w/2), 0.67 + j*0.22, DF + 0.05, w, 0.2, 0.1, 0])); }
  for(let i = 0; i < 9; i++){
    const th = (i + 0.5)*Math.PI/9, key = i === 4, r = AR + 0.12;
    dress.push([Math.cos(th)*r, DS + Math.sin(th)*r, DF + 0.05, key ? 0.17 : 0.13, key ? 0.3 : 0.24, key ? 0.14 : 0.1, 0, null, 0, th - Math.PI/2]);
  }
  g.add(instanced(unit, trim, dress));
  g.add(flat(mesh(new THREE.OctahedronGeometry(0.06), glow(EMBER, 2.4), 0, DS + AR + 0.12, DF + 0.13)));
  // iron sconces either side of the arch
  const flameMat = glow(0xffc04a, 2.6).clone(), flames = [];
  [-1, 1].forEach(s => {
    g.add(mesh(box(0.04, 0.04, 0.2), iron, s*0.45, 2.2, DF + 0.1), mesh(cyl(0.09, 0.05, 0.1, 6), iron, s*0.45, 2.24, DF + 0.2));
    const f = flat(mesh(new THREE.ConeGeometry(0.07, 0.24, 5), flameMat, s*0.45, 2.41, DF + 0.2)); g.add(f); flames.push(f);
  });

  // windows: tall lancets and arrow slits round the sides and back, a rose window over the door, all lit from within
  const winMat = glow(0xffb45a, 1.3).clone(), frames = [], panes = [];
  FACES.forEach((a, k) => {
    if(k === 0 || k === 1 || k === 7) return;
    panes.push(row(a, 0, 2.15, A + 0.005, 0.32, 1.1, 0.02));
    g.add(flat(onFace(mesh(halfDisc(0.16), winMat), a, 0, 2.7, A + 0.005)));
    [-1, 1].forEach(s => frames.push(row(a, s*0.21, 2.25, A + 0.05, 0.08, 1.2, 0.1, TRIM)));
    for(let i = 0; i < 5; i++){ const th = (i + 0.5)*Math.PI/5, [x, z] = at(a, Math.cos(th)*0.21, A + 0.05); frames.push([x, 2.7 + Math.sin(th)*0.21, z, 0.08, 0.11, 0.1, a, TRIM, 0, th - Math.PI/2]); }
    frames.push(row(a, 0, 1.56, A + 0.07, 0.54, 0.07, 0.16, TRIM), row(a, 0, 2.2, A + 0.025, 0.03, 1.1, 0.03, IRON), row(a, 0, 2.3, A + 0.025, 0.32, 0.03, 0.03, IRON));
    panes.push(row(a, 0, 4.13, A + 0.005, 0.08, 0.5, 0.02));
    [-1, 1].forEach(s => frames.push(row(a, s*0.09, 4.13, A + 0.04, 0.06, 0.52, 0.08, TRIM)));
    frames.push(row(a, 0, 4.42, A + 0.045, 0.3, 0.07, 0.09, TRIM), row(a, 0, 3.85, A + 0.05, 0.3, 0.06, 0.1, TRIM));
  });
  g.add(instanced(unit, winMat, panes, false), instanced(unit, mat(0xffffff), frames));
  const rose = flat(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16).rotateX(Math.PI/2), winMat, 0, 4.14, A + 0.005)); g.add(rose);
  g.add(mesh(new THREE.TorusGeometry(0.29, 0.045, 5, 16), trim, 0, 4.14, A + 0.05), mesh(cyl(0.05, 0.05, 0.06, 8).rotateX(Math.PI/2), trim, 0, 4.14, A + 0.04));
  [0, 1, 2, 3].forEach(k => { const b = mesh(box(0.54, 0.03, 0.03), iron, 0, 4.14, A + 0.025); b.rotation.z = k*Math.PI/4; g.add(b); });

  // red banners with a glowing sigil on the faces either side of the door (the hall hangs the same ones)
  const bannerShape = (w, h, n) => { const sh = new THREE.Shape(); sh.moveTo(-w/2, 0); sh.lineTo(w/2, 0); sh.lineTo(w/2, -h); sh.lineTo(0, -h + n); sh.lineTo(-w/2, -h); sh.closePath(); return new THREE.ShapeGeometry(sh); };
  const cloth = mat(CLOTH, {side:THREE.DoubleSide}), gilt = mat(0xb4893f, {side:THREE.DoubleSide});
  [1, 7].forEach(k => {
    const a = FACES[k];
    g.add(onFace(mesh(bannerShape(0.84, 1.86, 0.28), gilt), a, 0, 4.38, A + 0.09), onFace(mesh(bannerShape(0.7, 1.72, 0.24), cloth), a, 0, 4.31, A + 0.1));
    g.add(onFace(mesh(box(0.96, 0.04, 0.04), iron), a, 0, 4.36, A + 0.13));
    [-1, 1].forEach(s => g.add(onFace(mesh(new THREE.OctahedronGeometry(0.05), brass), a, s*0.5, 4.36, A + 0.13)));
    const sig = flat(onFace(mesh(new THREE.OctahedronGeometry(0.13), runeMat), a, 0, 3.45, A + 0.11)); sig.scale.set(1, 1.5, 0.2); g.add(sig);
  });

  // machicolated gallery: corbels, a projecting walk, a crenellated parapet and pinnacles on the corners
  const top = [];
  FACES.forEach(a => {
    [-0.4, 0, 0.4].forEach(u => top.push(row(a, u, 4.42, A + 0.12, 0.14, 0.28, 0.3, DARK)));
    [-0.5, 0, 0.5].forEach(u => top.push(row(a, u, 5.18, (RB + 0.34)*Math.cos(OCT) - 0.08, 0.26, 0.32, 0.16, STONE)));
  });
  g.add(instanced(unit, mat(0xffffff), top));
  g.add(oct(RB + 0.36, RB + 0.28, 0.2, 4.66, mat(DARK)), oct(RB + 0.34, RB + 0.34, 0.26, 4.89, mat(STONE)));
  const tipMat = glow(0xffd27a, 2.2).clone();
  CORNERS.forEach(a => {
    const [x, z] = at(a, 0, RB + 0.26);
    const p = mesh(cyl(0.02, 0.11, 0.5, 4), mat(DARK), x, 5.27, z); p.rotation.y = a + Math.PI/4; g.add(p);
    g.add(flat(mesh(new THREE.OctahedronGeometry(0.06), tipMat, x, 5.58, z)));
  });

  // the crown: an open lantern of eight pillars and arches over a fire bowl, the light the hall's oculus lets in
  g.add(oct(1.05, 1.1, 0.16, 5.1, mat(DARK)), oct(1.08, 1.02, 0.16, 6.2, mat(STONE)));
  const lant = [], LR = 0.9;
  CORNERS.forEach(a => { const [x, z] = at(a, 0, LR); lant.push([x, 5.65, z, 1, 1, 1, 0]); });
  g.add(instanced(cyl(0.06, 0.075, 0.95, 6), mat(STONE), lant));
  const archR = LR*Math.sin(OCT), arch = new THREE.TorusGeometry(archR, 0.035, 4, 8, Math.PI);
  g.add(instanced(arch, trim, FACES.map(a => row(a, 0, 5.75, LR*Math.cos(OCT), 1, 1, 1))));
  g.add(mesh(cyl(0.45, 0.25, 0.22, 8), iron, 0, 5.32, 0));
  const fireMat = glow(0xffa53a, 2.6).clone(), coreMat = glow(0xffe08a, 2.8);
  [[0, 0, 0.3, 0.8], [0.14, 0.08, 0.18, 0.55], [-0.12, -0.1, 0.18, 0.5]].forEach(([x, z, r, h]) => {
    const f = flat(mesh(new THREE.ConeGeometry(r, h, 6), fireMat, x, 5.43 + h/2, z)); g.add(f); flames.push(f);
  });
  const core = flat(mesh(new THREE.ConeGeometry(0.14, 0.5, 5), coreMat, 0, 5.68, 0)); g.add(core); flames.push(core);

  // golden crown holding the floating heart-gem, three motes orbiting it
  CORNERS.forEach(a => { const [x, z] = at(a, 0, 0.9), p = mesh(new THREE.ConeGeometry(0.06, 0.42, 4), brass, x, 6.48, z); p.rotation.set(Math.cos(a)*0.3, 0, -Math.sin(a)*0.3); g.add(p); });
  g.add(flat(mesh(new THREE.TorusGeometry(0.98, 0.035, 4, 32).rotateX(Math.PI/2), brass, 0, 6.3, 0)));
  const GY = 7.1;
  const gem = flat(mesh(new THREE.OctahedronGeometry(0.42), glow(GOLD, 2.2), 0, GY, 0)); gem.scale.y = 1.35; g.add(gem);
  const orbit = new THREE.Group(); orbit.position.y = GY; g.add(orbit);
  for(let k = 0; k < 3; k++){ const a = k*Math.PI*2/3; orbit.add(flat(mesh(new THREE.OctahedronGeometry(0.09), glow(0xffe6a8, 2.4), Math.cos(a)*0.85, Math.sin(a*2)*0.15, Math.sin(a)*0.85))); }

  // four small obelisks on the dais corners, tipped with glowing shards
  [1, 3, 5, 7].forEach(k => {
    const [x, z] = at(FACES[k], 0, 2.25);
    const o = mesh(cyl(0.07, 0.14, 0.8, 4), mat(DARK), x, 0.68, z); o.rotation.y = FACES[k] + Math.PI/4; g.add(o);
    g.add(flat(mesh(new THREE.OctahedronGeometry(0.1), tipMat, x, 1.2, z)));
  });

  animated.push({fn:t => {
    gem.position.y = GY + Math.sin(t*1.6)*0.15; gem.rotation.y = t*0.9;
    orbit.position.y = gem.position.y; orbit.rotation.y = -t*1.3;
    ringMat.emissiveIntensity = 2 + Math.sin(t*2)*0.6;
    runeMat.emissiveIntensity = 1.6 + Math.sin(t*1.2)*0.5;
    tipMat.emissiveIntensity = 2 + Math.sin(t*2.6)*0.5;
    doorMat.emissiveIntensity = 1.6 + Math.sin(t*7)*0.3 + Math.sin(t*13)*0.2;
    winMat.emissiveIntensity = 1.2 + Math.sin(t*3.1)*0.12;
    pulses.forEach((p, k) => p.position.y = 1.4 + ((t*0.35 + k*0.37) % 1)*2.8);
    flames.forEach((f, k) => f.scale.set(1 + Math.sin(t*13 + k)*0.08, 1 + Math.sin(t*(9 + k*1.7) + k)*0.18 + Math.sin(t*21 + k)*0.06, 1));
    flameMat.emissiveIntensity = fireMat.emissiveIntensity = 2.4 + Math.sin(t*17)*0.4;
  }});
  const pl = new THREE.PointLight(0xffb04a, 1.0, 14, 2); pl.position.set(0, 1.3, 2.8); g.add(pl);
  return g;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}. */
export function decorate(isl, grp, animated){
  seed = 1337;
  // trees/rocks were already scattered by build.js: stay clear of them
  const taken = grp.children.filter(c => Math.hypot(c.position.x, c.position.z) > 1).map(c => [c.position.x, c.position.z, 0.5]);
  const free = (x, z, gap) => isl.pathDist(x, z) > gap && taken.every(([a, b, r]) => Math.hypot(a - x, b - z) > r + 0.5);
  const at = (o, x, z, r, room = 0.5) => {
    o.position.set(x, isl.topY(x, z), z); grp.add(o); taken.push([x, z, room]);
    if(r) obstacles.push({x:isl.x + x, z:isl.z + z, r});
  };
  const polar = (deg, r) => [Math.cos(deg*Math.PI/180)*r, Math.sin(deg*Math.PI/180)*r];

  // braziers flanking the front path
  const flameMat = glow(0xffa53a, 2.6).clone(), coreMat = glow(0xffe08a, 2.8).clone(), flames = [];
  [70, 110].forEach(deg => {
    const [x, z] = polar(deg, 5.4), b = new THREE.Group();
    b.add(mesh(cyl(0.22, 0.3, 0.12, 6), mat(DARK), 0, 0.06, 0));
    b.add(mesh(cyl(0.08, 0.11, 0.85, 6), mat(0x3d4048), 0, 0.5, 0));
    b.add(mesh(cyl(0.36, 0.16, 0.26, 7), mat(0x3d4048), 0, 1.02, 0));
    b.add(mesh(new THREE.TorusGeometry(0.36, 0.035, 4, 14).rotateX(Math.PI/2), mat(0xc8902e, {metalness:0.5, roughness:0.4}), 0, 1.15, 0));
    const f = mesh(new THREE.ConeGeometry(0.26, 0.7, 6), flameMat, 0, 1.45, 0), c = mesh(new THREE.ConeGeometry(0.13, 0.42, 5), coreMat, 0, 1.33, 0);
    f.castShadow = c.castShadow = false; b.add(f, c); flames.push(f, c);
    at(b, x, z, 0.38);
  });

  // two benches facing the hearth
  [196, 262].forEach(deg => {
    const [x, z] = polar(deg, 5.2);
    if(!free(x, z, 1.6)) return;
    const b = new THREE.Group(), wood = mat(0x7a5434);
    b.add(mesh(box(1.4, 0.1, 0.42), wood, 0, 0.44, 0));
    b.add(mesh(box(1.4, 0.32, 0.08), wood, 0, 0.7, -0.2));
    [-0.55, 0.55].forEach(lx => b.add(mesh(box(0.14, 0.42, 0.36), mat(DARK), lx, 0.21, 0)));
    b.rotation.y = Math.atan2(-x, -z);
    at(b, x, z, 0.62, 0.9);
  });

  // ring of standing stones just beyond the plaza, each with a rune facing the hearth
  const runeMat = glow(0x9fd8ff, 1.6).clone(), stoneGeo = cyl(0.13, 0.3, 1, 5), runeGeo = new THREE.OctahedronGeometry(0.09);
  for(let deg = 0; deg < 360; deg += 18){
    const [x, z] = polar(deg, 5.1);
    if(!free(x, z, 1.3)) continue;
    const h = 1.3 + rand()*0.8, s = new THREE.Group();
    const m = mesh(stoneGeo, mat(rand() > 0.5 ? 0x7d8088 : 0x6d7078), 0, h/2 - 0.05, 0); m.scale.y = h; m.rotation.y = Math.PI/5; s.add(m);
    const r = mesh(runeGeo, runeMat, 0, h*0.6, 0.19); r.scale.set(1, 1.6, 0.35); r.castShadow = false; s.add(r);
    s.rotation.set((rand() - 0.5)*0.12, Math.atan2(-x, -z), (rand() - 0.5)*0.12);
    at(s, x, z, 0.3);
  }

  animated.push({fn:t => {
    runeMat.emissiveIntensity = 1.3 + Math.sin(t*1.1)*0.6;
    flameMat.emissiveIntensity = 2.4 + Math.sin(t*15)*0.4;
    flames.forEach((f, k) => f.scale.set(1, 1 + Math.sin(t*(9 + k*1.7) + k)*0.16 + Math.sin(t*23 + k)*0.05, 1));
  }});
}
