/* Oakreach (journey): a timber-framed cottage under a great old oak, with a garden, a well and milestones along the paths. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';

// local seeded random (never touch engine rnd(): it's a shared sequence)
let seed = 4242;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

const WOOD = 0x4a3222, PLANK = 0x7a5434, DOOR = 0x6b4026, PLASTER = 0xe8dfc6, STONE = 0x857f74, ROOF = 0x8c3b2b, ROOF_D = 0x6e2c20, GREEN = 0x3f6b4a, LIT = 0xffcf7a;

/* (x, y) outline extruded along z, centred on z = 0: gables, roofs */
function prism(pts, depth){
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1]));
  return new THREE.ExtrudeGeometry(s, {depth, bevelEnabled:false}).translate(0, 0, -depth/2);
}
/* a lit window on a group facing +z: glowing pane, cross mullions, sill */
function windowOn(g, x, y, z, ry, w = 0.46){
  const o = new THREE.Group(); o.position.set(x, y, z); o.rotation.y = ry; g.add(o);
  const pane = mesh(box(w, w, 0.04), glow(LIT, 1.8)); pane.castShadow = false; o.add(pane);
  o.add(mesh(box(w + 0.08, 0.05, 0.06), mat(WOOD), 0, 0, 0.02), mesh(box(0.05, w + 0.08, 0.06), mat(WOOD), 0, 0, 0.02));
  o.add(mesh(box(w + 0.14, 0.06, 0.14), mat(WOOD), 0, -w/2 - 0.04, 0.05));
  return o;
}

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on). */
export function building(animated){
  const g = new THREE.Group(), wood = mat(WOOD), add = (...a) => g.add(mesh(...a));
  // stone footing, plaster walls, solid gable fill under the roof
  add(box(2.84, 0.3, 2.44), mat(STONE), 0, 0.15, 0);
  add(box(2.6, 1.6, 2.2), mat(PLASTER), 0, 1.1, 0);
  add(prism([[-1.3, 1.9], [1.3, 1.9], [0, 2.98]], 2.2), mat(PLASTER));
  // steep gabled roof (ridge front-to-back), ridge cap and shingle courses
  add(prism([[-1.62, 1.62], [0, 2.96], [1.62, 1.62], [1.62, 1.78], [0, 3.14], [-1.62, 1.78]], 2.75), mat(ROOF));
  add(box(0.2, 0.12, 2.85), mat(ROOF_D), 0, 3.12, 0);
  const pitch = Math.atan(0.84);
  [0.42, 0.84, 1.26].forEach(d => [-1, 1].forEach(s => { const c = mesh(box(0.05, 0.035, 2.77), mat(ROOF_D), s*d, 3.14 - 0.84*d + 0.02, 0); c.rotation.z = -s*pitch; g.add(c); }));

  // timber frame: corner posts, top and bottom plates, rails, side braces, gable studs
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(box(0.14, 1.6, 0.14), wood, sx*1.31, 1.1, sz*1.11)));
  [-1, 1].forEach(s => {
    add(box(2.76, 0.12, 0.1), wood, 0, 1.86, s*1.12); add(box(0.1, 0.12, 2.36), wood, s*1.32, 1.86, 0);
    add(box(2.76, 0.09, 0.06), wood, 0, 0.36, s*1.12); add(box(0.06, 0.09, 2.36), wood, s*1.32, 0.36, 0);
    add(box(2.7, 0.07, 0.05), wood, 0, 0.9, s*1.125);
    [-1, 1].forEach(sz => { const b = mesh(box(0.07, 1.56, 0.07), wood, s*1.33, 1.1, sz*0.68); b.rotation.x = -sz*0.45; g.add(b); });
    [-0.45, 0.45].forEach(x => add(box(0.09, 0.66, 0.07), wood, x, 2.23, s*1.12));
  });
  const attic = mesh(cyl(0.17, 0.17, 0.05, 8).rotateX(Math.PI/2), glow(LIT, 1.6), 0, 2.42, 1.12); attic.castShadow = false; g.add(attic);
  add(new THREE.TorusGeometry(0.18, 0.035, 4, 8), wood, 0, 2.42, 1.14);

  // lit windows: shuttered pair either side of the door with flower boxes, one on each other wall
  const petals = [0xe891bd, 0xf2c14e, 0xf6efe0, 0xd85a5a];
  [-0.85, 0.85].forEach(x => {
    windowOn(g, x, 1.28, 1.12, 0);
    [-1, 1].forEach(s => add(box(0.14, 0.5, 0.04), mat(GREEN), x + s*0.31, 1.28, 1.14));
    add(box(0.52, 0.13, 0.16), mat(DOOR), x, 0.92, 1.2);
    for(let k = 0; k < 4; k++) add(new THREE.OctahedronGeometry(0.06, 0), mat(petals[(k + (x > 0 ? 1 : 0)) % 4]), x - 0.18 + k*0.12, 1.02, 1.21 + (k % 2)*0.03);
  });
  windowOn(g, 1.31, 1.28, 0, Math.PI/2); windowOn(g, -1.31, 1.28, 0, -Math.PI/2); windowOn(g, 0, 1.28, -1.12, Math.PI);

  // front door with frame and brass knob
  add(box(0.62, 1.1, 0.06), mat(DOOR), 0, 0.85, 1.13);
  [-1, 1].forEach(s => add(box(0.1, 1.2, 0.1), wood, s*0.37, 0.9, 1.14));
  add(box(0.86, 0.12, 0.12), wood, 0, 1.52, 1.14);
  add(box(0.06, 0.06, 0.05), mat(0xd8b04a, {metalness:0.5, roughness:0.4}), 0.2, 0.86, 1.18);

  // porch: deck, step, posts and a little gabled canopy with a hanging lantern
  add(box(1.5, 0.12, 0.76), mat(PLANK), 0, 0.24, 1.5);
  add(box(1.0, 0.14, 0.32), mat(STONE), 0, 0.07, 2.04);
  [-1, 1].forEach(s => add(cyl(0.06, 0.07, 1.4, 6), wood, s*0.62, 1.0, 1.8));
  add(box(1.42, 0.1, 0.1), wood, 0, 1.69, 1.8);
  const canopy = mesh(prism([[-0.8, 1.68], [0, 2.08], [0.8, 1.68], [0.8, 1.8], [0, 2.2], [-0.8, 1.8]], 0.95), mat(ROOF), 0, 0, 1.55); g.add(canopy);
  add(cyl(0.012, 0.012, 0.18, 4), wood, 0.42, 1.55, 1.8);
  const lamp = mesh(box(0.13, 0.17, 0.13), glow(0xffd27a, 2.2), 0.42, 1.38, 1.8); lamp.castShadow = false; g.add(lamp);
  const lcap = mesh(new THREE.ConeGeometry(0.12, 0.09, 4), wood, 0.42, 1.5, 1.8); lcap.rotation.y = Math.PI/4; g.add(lcap);

  // woodpile against the left wall
  [[-1.56, 0.1], [-1.77, 0.1], [-1.665, 0.28]].forEach(([x, y]) => add(cyl(0.1, 0.1, 0.8, 6).rotateX(Math.PI/2), mat(PLANK), x, y, -0.5));

  // stone chimney through the right slope, smoke puffs
  add(box(0.42, 1.1, 0.42), mat(0x7d756b), 0.8, 2.75, -0.55);
  add(box(0.52, 0.1, 0.52), mat(0x5f5952), 0.8, 3.33, -0.55);
  const smoke = [], puffGeo = new THREE.DodecahedronGeometry(0.17);
  for(let k = 0; k < 3; k++){ const p = new THREE.Mesh(puffGeo, new THREE.MeshStandardMaterial({color:0xb9bcc6, flatShading:true, transparent:true, opacity:0.5, depthWrite:false})); g.add(p); smoke.push(p); }
  animated.push({fn:t => smoke.forEach((p, k) => { const u = (t*0.35 + k/3) % 1; p.position.set(0.8 + Math.sin(u*6 + k)*0.15, 3.45 + u*1.35, -0.55 - u*0.2); p.scale.setScalar(0.6 + u*1.3); p.material.opacity = 0.5*(1 - u); })});
  return g;
}

/* the island's namesake: a broad old oak with a rope swing */
function oak(animated){
  const g = new THREE.Group(), bark = mat(0x4e3523);
  g.add(mesh(cyl(0.5, 0.78, 0.35, 7), bark, 0, 0.12, 0));
  g.add(mesh(cyl(0.3, 0.5, 2.7, 7), bark, 0, 1.4, 0));
  const limb = (len, y, ry, rz) => { const b = new THREE.Group(); b.position.y = y; b.rotation.set(0, ry, rz); b.add(mesh(cyl(0.08, 0.16, len, 5), bark, 0, len/2, 0)); g.add(b); };
  limb(1.5, 2.1, 0.4, 1.0); limb(1.4, 2.3, 2.6, 0.9); limb(1.3, 2.4, 4.4, 0.8);
  const arm = mesh(cyl(0.08, 0.15, 1.7, 5), bark, 0.85, 2.15, 0); arm.rotation.z = -Math.PI/2; g.add(arm);
  const blob = new THREE.IcosahedronGeometry(1, 0), leaves = [0x4f7f3a, 0x5e8f43, 0x44703a];
  [[0, 3.55, 0, 1.55], [1.15, 3.1, 0.35, 1.1], [-1.05, 3.2, -0.4, 1.2], [0.2, 3.1, -1.15, 1.05], [-0.35, 3.15, 1.1, 1.05], [0.35, 4.3, 0.2, 1.0], [1.35, 3.0, -0.75, 0.8], [-0.9, 3.9, 0.7, 0.8]]
    .forEach(([x, y, z, s], k) => { const m = mesh(blob, mat(leaves[k % 3]), x, y, z); m.scale.set(s, s*0.78, s); m.rotation.set(rand()*3, rand()*3, 0); g.add(m); });
  // rope swing hanging from the low arm
  const swing = new THREE.Group(); swing.position.set(1.15, 2.1, 0); g.add(swing);
  [-0.24, 0.24].forEach(x => swing.add(mesh(cyl(0.015, 0.015, 1.45, 4), mat(0xb8a27a), x, -0.72, 0)));
  swing.add(mesh(box(0.62, 0.05, 0.22), mat(PLANK), 0, -1.45, 0));
  animated.push({fn:t => { swing.rotation.x = Math.sin(t*1.3)*0.16; }});
  return g;
}

function well(){
  const g = new THREE.Group(), wood = mat(WOOD);
  g.add(mesh(cyl(0.55, 0.6, 0.55, 10), mat(STONE), 0, 0.27, 0));
  g.add(mesh(cyl(0.62, 0.62, 0.1, 10), mat(0x9a9488), 0, 0.58, 0));
  g.add(mesh(cyl(0.45, 0.45, 0.02, 10), mat(0x23415e, {roughness:0.3}), 0, 0.64, 0));
  [-1, 1].forEach(s => g.add(mesh(box(0.09, 1.15, 0.09), wood, s*0.52, 1.18, 0)));
  const roof = mesh(prism([[-0.58, 1.62], [0, 2.02], [0.58, 1.62], [0.58, 1.72], [0, 2.12], [-0.58, 1.72]], 1.45), mat(ROOF)); roof.rotation.y = Math.PI/2; g.add(roof);
  g.add(mesh(cyl(0.04, 0.04, 1.2, 6).rotateZ(Math.PI/2), wood, 0, 1.45, 0));
  g.add(mesh(box(0.05, 0.22, 0.05), wood, 0.64, 1.36, 0));
  g.add(mesh(cyl(0.01, 0.01, 0.3, 4), mat(0xb8a27a), 0, 1.3, 0));
  g.add(mesh(cyl(0.12, 0.1, 0.18, 7), mat(DOOR), 0, 1.08, 0));
  return g;
}

function mailbox(){
  const g = new THREE.Group();
  g.add(mesh(box(0.08, 0.85, 0.08), mat(WOOD), 0, 0.42, 0));
  g.add(mesh(box(0.24, 0.2, 0.38), mat(GREEN), 0, 0.94, 0));
  g.add(mesh(cyl(0.12, 0.12, 0.38, 8).rotateX(Math.PI/2), mat(GREEN), 0, 1.04, 0));
  g.add(mesh(box(0.03, 0.24, 0.04), mat(0xc0392b), 0.14, 1.04, -0.08), mesh(box(0.03, 0.08, 0.12), mat(0xc0392b), 0.14, 1.12, -0.02));
  g.add(mesh(box(0.16, 0.02, 0.1), mat(0xf6efe0), 0, 0.98, 0.21));   // a letter poking out
  return g;
}

/* waymarker stone with a glowing notch */
function milestone(m){
  const g = new THREE.Group(), stone = mat(0x8a857b);
  g.add(mesh(box(0.34, 0.5, 0.17), stone, 0, 0.25, 0));
  g.add(mesh(cyl(0.17, 0.17, 0.17, 8).rotateX(Math.PI/2), stone, 0, 0.5, 0));
  const n = mesh(box(0.14, 0.14, 0.02), m, 0, 0.42, 0.09); n.rotation.z = Math.PI/4; n.castShadow = false; g.add(n);
  return g;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}. */
export function decorate(isl, grp, animated){
  seed = 4242;
  const plaza = isl.obs + 2.2;
  // free spot? clear of plaza, coast, paths, and everything solid placed so far (build.js trees/rocks included)
  const clear = (x, z, r, gap = 1.2, solid = true) => {
    const d = Math.hypot(x, z);
    return d - r > plaza && d + r < 0.85*isl.edgeR(Math.atan2(z, x)) && isl.pathDist(x, z) > gap + r
      && (!solid || obstacles.every(o => Math.hypot(o.x - isl.x - x, o.z - isl.z - z) > o.r + r));
  };
  // search outward from a preferred angle (radians, local x/z), nearest-to-house first (or from d0 out)
  const find = (a0, r, gap = 1.2, solid = true, d0 = plaza + r + 0.1) => {
    for(let k = 0; k < 30; k++){
      const a = a0 + (k % 2 ? 1 : -1)*Math.ceil(k/2)*0.12;
      for(let d = d0; d < 0.85*isl.edgeR(a); d += 0.25){ const x = Math.cos(a)*d, z = Math.sin(a)*d; if(clear(x, z, r, gap, solid)) return [x, z]; }
    }
    return null;
  };
  const place = (o, p, r, ry = Math.atan2(-p[0], -p[1])) => {
    o.position.set(p[0], isl.topY(p[0], p[1]) - 0.03, p[1]); o.rotation.y = ry; grp.add(o);
    obstacles.push({x:isl.x + p[0], z:isl.z + p[1], r});
  };

  // the great oak behind the cottage (search with a wide berth so its canopy doesn't swallow other trees)
  // preferred angles below are in the building frame; atan2(z, x) angles turn by -face into the island frame
  const F = isl.face;
  let p = find(-2.36 - F, 1.0, 0.6, false, 6.0) || find(-2.36 - F, 1.0, 0.6, false);
  if(p){ place(oak(animated), p, 0.62, Math.atan2(p[1], -p[0])); obstacles[obstacles.length - 1].clear = 2.3; }   // keep the random scatter out from under the canopy

  // fenced vegetable garden: white pickets round a 2 x 1.5 bed of cabbages and pumpkins
  p = find(-0.8 - F, 1.0, 1.2, false);
  if(p){
    const [cx, cz] = p, ry = Math.atan2(-cx, -cz), cs = Math.cos(ry), sn = Math.sin(ry), W = 0.85, D = 0.58;
    const loc = (u, v) => [cx + u*cs + v*sn, cz - u*sn + v*cs];   // garden frame → island frame (matches rotation.y = ry)
    const dummy = new THREE.Object3D(), pk = [], rails = [], corners = [[-W, -D], [W, -D], [W, D], [-W, D]];
    corners.forEach((c0, i) => {
      const c1 = corners[(i + 1) % 4], len = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]), n = Math.round(len/0.24);
      for(let j = 0; j < n; j++){ const f = j/n; pk.push(loc(c0[0] + (c1[0] - c0[0])*f, c0[1] + (c1[1] - c0[1])*f)); }
      const a = loc(...c0), b = loc(...c1); rails.push([a, b, 0.16], [a, b, 0.34]);
    });
    const white = new THREE.MeshStandardMaterial({color:0xefe9dc, flatShading:true, roughness:0.9});
    const pickets = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.5, 4).translate(0, 0.25, 0), white, pk.length);
    pk.forEach(([x, z], i) => { dummy.position.set(x, isl.topY(x, z) - 0.04, z); dummy.rotation.set(0, ry + Math.PI/4, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); pickets.setMatrixAt(i, dummy.matrix); });
    const railIM = new THREE.InstancedMesh(box(0.04, 0.05, 1), white, rails.length), q = new THREE.Vector3();
    rails.forEach(([a, b, h], i) => {
      dummy.position.set((a[0] + b[0])/2, (isl.topY(...a) + isl.topY(...b))/2 + h, (a[1] + b[1])/2);
      dummy.lookAt(q.set(b[0], isl.topY(...b) + h, b[1])); dummy.scale.set(1, 1, Math.hypot(b[0] - a[0], b[1] - a[1])); dummy.updateMatrix(); railIM.setMatrixAt(i, dummy.matrix);
    });
    const veg = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), new THREE.MeshStandardMaterial({flatShading:true, roughness:0.85}), 12), col = new THREE.Color();
    for(let i = 0; i < 12; i++){
      const u = -0.54 + (i % 4)*0.36, v = -0.3 + Math.floor(i/4)*0.3, [x, z] = loc(u, v), pump = i >= 8;
      dummy.position.set(x, isl.topY(x, z) + 0.08, z); dummy.rotation.set(rand(), rand()*6, 0); dummy.scale.set(1, pump ? 0.7 : 0.85, 1).multiplyScalar(0.8 + rand()*0.4); dummy.updateMatrix();
      veg.setMatrixAt(i, dummy.matrix); veg.setColorAt(i, col.setHex(pump ? 0xe0862d : [0x7fb55a, 0x6aa04a][i % 2]));
    }
    [pickets, railIM, veg].forEach(m => { m.castShadow = m.receiveShadow = true; grp.add(m); });
    obstacles.push({x:isl.x + cx, z:isl.z + cz, r:0.95, clear:1.4});
  }

  // stone well off to the side
  p = find(2.6 - F, 0.75);
  if(p) place(well(), p, 0.72, rand()*6);

  // mailbox by the front path, its slot facing the path
  p = find(1.2 - F, 0.2, 1.0);
  if(p) place(mailbox(), p, 0.22, Math.atan2(-(p[0]*Math.cos(F) - p[1]*Math.sin(F)), 0) + F);   // building-frame x decides the side

  // milestones along each bridge path, alternating sides, glowing notch facing the walker
  const notch = glow(0xf0b54a, 1.5), door = isl.rot(0, isl.obs + 3.2);
  isl.paths.forEach(([, , ex, ez]) => {
    const L = Math.hypot(ex, ez); if(ex === door[0] && ez === door[1]) return;   // skip the short door path (same rot() call as terrain.js, so exact)
    const dx = ex/L, dz = ez/L;
    let side = 1;
    for(let d = plaza + 0.8; d < L - 1.6; d += 2.2, side = -side){
      for(const s of [side, -side]){
        const x = dx*d - dz*1.45*s, z = dz*d + dx*1.45*s;
        if(!clear(x, z, 0.2, 1.2)) continue;
        place(milestone(notch), [x, z], 0.24, Math.atan2(dz*s, -dx*s)); break;
      }
    }
  });
}
