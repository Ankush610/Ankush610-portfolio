/* Beacon Point (contact): its building seen from outside, plus optional island scenery. */
import { THREE, mat, mesh, glow, box, cyl } from '../../engine.js';
import { obstacles } from '../terrain.js';

const WHITE = 0xf0ebe0, RED = 0xb8372b, SLATE = 0x2b2f38, WOOD = 0x6b4a30, DARKWOOD = 0x4a3222, STONE = 0x8a877f;
const N = 10, TAPER = 0.076;                       // tower sides; lean of each face (rad)
const rAt = y => 1.0 - (y - 0.35)/4.2*0.32;         // tower radius at height y
const apo = y => rAt(y)*Math.cos(Math.PI/N);        // distance to the middle of a face
const prism = (r0, r1, h, n = N) => { const g = cyl(r0, r1, h, n); g.rotateY(Math.PI/n); return g; }; // a face (not an edge) points at +z

/* thing stuck flat on the tower face that points at angle `a` (0 = +z) */
function onFace(g, obj, a, y, dz = 0){
  const h = new THREE.Group(); h.rotation.y = a; g.add(h);
  obj.position.set(0, y, apo(y) + dz); obj.rotation.x = -TAPER; h.add(obj);
  return obj;
}

/* The building: centred on the origin at ground level, front door facing +z. It must fit inside the island's
   `obs` radius (see world/islands.js) — that circle is its collision footprint and the plaza is cleared around it.
   Per-frame animation: push {fn(t)} into `animated` (skipped when reduced motion is on). */
export function building(animated){
  const g = new THREE.Group();
  // stone plinth and front steps
  g.add(mesh(prism(1.2, 1.28, 0.55), mat(STONE), 0, 0.08, 0));
  g.add(mesh(box(0.8, 0.13, 0.26), mat(STONE), 0, 0.065, 1.3));
  g.add(mesh(box(0.8, 0.13, 0.22), mat(0x99968e), 0, 0.2, 1.16));
  // tapered tower in red/white bands
  for(let k = 0; k < 6; k++){
    const y0 = 0.35 + k*0.7, y1 = y0 + 0.7;
    g.add(mesh(prism(rAt(y1), rAt(y0), 0.7), mat(k % 2 ? RED : WHITE), 0, (y0 + y1)/2, 0));
  }
  // door with frame, canopy and a little lamp; windows up the tower
  onFace(g, mesh(box(0.6, 0.92, 0.08), mat(SLATE)), 0, 0.81);
  onFace(g, mesh(box(0.44, 0.8, 0.08), mat(DARKWOOD)), 0, 0.76, 0.03);
  onFace(g, mesh(box(0.74, 0.06, 0.28), mat(RED)), 0, 1.3, 0.1);
  const dl = onFace(g, mesh(box(0.1, 0.14, 0.1), glow(0xffd27a, 2)), 0, 1.48, 0.06); dl.castShadow = false;
  [[0, 2.45], [Math.PI*0.8, 1.8], [-Math.PI*0.8, 3.2], [Math.PI*0.4, 3.6], [-Math.PI*0.35, 2.3]].forEach(([a, y]) => {
    onFace(g, mesh(box(0.3, 0.42, 0.06), mat(SLATE)), a, y);
    onFace(g, mesh(box(0.2, 0.3, 0.06), glow(0xffd27a, 0.9)), a, y, 0.02).castShadow = false;
  });
  // gallery: corbel, deck, railing
  g.add(mesh(prism(1.0, rAt(4.55), 0.22), mat(SLATE), 0, 4.55, 0));
  g.add(mesh(prism(1.08, 1.08, 0.1), mat(SLATE), 0, 4.71, 0));
  for(let k = 0; k < 12; k++){ const a = k/12*Math.PI*2; g.add(mesh(cyl(0.025, 0.025, 0.42, 4), mat(SLATE), Math.sin(a)*0.98, 4.96, Math.cos(a)*0.98)); }
  const rail = mesh(new THREE.TorusGeometry(0.98, 0.03, 4, 20), mat(SLATE), 0, 5.17, 0); rail.rotation.x = Math.PI/2; g.add(rail);
  // lantern room: low wall, glowing glass, glazing bars
  g.add(mesh(prism(0.62, 0.62, 0.24), mat(RED), 0, 4.88, 0));
  const glass = mesh(prism(0.55, 0.55, 0.72), glow(0xffe6a0, 1.1), 0, 5.36, 0); glass.castShadow = false; g.add(glass);
  for(let k = 0; k < N; k++){ const a = k/N*Math.PI*2; const b = mesh(box(0.035, 0.72, 0.035), mat(SLATE), Math.sin(a)*0.56, 5.36, Math.cos(a)*0.56); b.rotation.y = a; g.add(b); }
  g.add(mesh(prism(0.57, 0.57, 0.035), mat(SLATE), 0, 5.4, 0));
  // red dome, ventilator ball, weather vane
  g.add(mesh(prism(0.72, 0.68, 0.08), mat(SLATE), 0, 5.76, 0));
  const dome = mesh(new THREE.SphereGeometry(0.64, N, 4, 0, Math.PI*2, 0, Math.PI/2), mat(RED), 0, 5.8, 0); dome.scale.y = 0.8; g.add(dome);
  g.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), mat(SLATE), 0, 6.36, 0));
  g.add(mesh(cyl(0.018, 0.025, 0.42, 4), mat(SLATE), 0, 6.6, 0));
  const vane = new THREE.Group(); vane.position.y = 6.66; g.add(vane);
  vane.add(mesh(box(0.5, 0.025, 0.025), mat(SLATE)));
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.12, 4), mat(SLATE), 0.29, 0, 0); tip.rotation.z = -Math.PI/2; vane.add(tip);
  vane.add(mesh(box(0.1, 0.12, 0.015), mat(RED), -0.22, 0.03, 0));
  // two faint opposed beams sweeping round (kept dim so they never wash out the view)
  const beamGeo = new THREE.ConeGeometry(0.9, 8, 12, 1, true); beamGeo.translate(0, -4, 0); beamGeo.rotateZ(Math.PI/2);
  const beamMat = new THREE.MeshBasicMaterial({color:0xfff0b8, transparent:true, opacity:0.06, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending});
  const pivot = new THREE.Group(); pivot.position.y = 5.36; g.add(pivot);
  const b1 = new THREE.Mesh(beamGeo, beamMat), b2 = new THREE.Mesh(beamGeo, beamMat); b2.rotation.y = Math.PI; pivot.add(b1, b2);
  const pl = new THREE.PointLight(0xfff0b8, 1.0, 14, 2); pl.position.set(0, 5.4, 0); g.add(pl);
  pivot.rotation.y = 0.6; vane.rotation.y = 0.8;
  animated.push({fn:t => { pivot.rotation.y = 0.6 + t*0.6; vane.rotation.y = 0.8 + Math.sin(t*0.3)*0.5 + Math.sin(t*1.7)*0.08; }});
  return g;
}

/* Extra scenery on this island. `grp` is positioned at the island centre (x, 0, z); place things at local (x, isl.topY(x, z), z).
   Keep clear of paths (isl.pathDist(x, z) > 1.2), the plaza (radius > isl.obs + 2.2) and the coast (radius < 0.85 * isl.edgeR(angle)).
   Anything solid must be added to `obstacles` in WORLD coords: {x: isl.x + x, z: isl.z + z, r}.
   Spots were picked to sit in the gaps between the trees/rocks build.js scatters on this island. */
export function decorate(isl, grp, animated){
  const put = (o, x, z, rotY = 0, dy = 0) => { o.position.set(x, isl.topY(x, z) + dy, z); o.rotation.y = rotY; grp.add(o); return o; };
  const solid = (x, z, r) => obstacles.push({x:isl.x + x, z:isl.z + z, r});
  const facing = (x, z) => Math.atan2(-x, -z);       // rotY that turns local +z towards the tower

  /* keeper's cottage: whitewashed walls, hip roof, chimney, lit window */
  const c = new THREE.Group();
  c.add(mesh(box(1.7, 0.3, 1.3), mat(STONE), 0, 0, 0));
  c.add(mesh(box(1.6, 1.0, 1.2), mat(WHITE), 0, 0.6, 0));
  const roofGeo = new THREE.ConeGeometry(1, 0.8, 4); roofGeo.rotateY(Math.PI/4); roofGeo.scale(1.35, 1, 1.03);
  c.add(mesh(roofGeo, mat(RED), 0, 1.5, 0));
  c.add(mesh(box(0.22, 0.6, 0.22), mat(STONE), 0.45, 1.65, -0.2));
  c.add(mesh(box(0.42, 0.72, 0.06), mat(DARKWOOD), -0.3, 0.46, 0.61));
  c.add(mesh(box(0.36, 0.3, 0.06), glow(0xffd27a, 1.2), 0.38, 0.65, 0.61));
  c.add(mesh(box(0.42, 0.04, 0.08), mat(SLATE), 0.38, 0.49, 0.63));
  c.add(mesh(box(0.06, 0.3, 0.36), glow(0xffd27a, 1.2), 0.81, 0.65, 0));
  c.add(mesh(box(0.4, 0.4, 0.4), mat(WOOD), -0.65, 0.2, 0.85));     // crate by the door
  c.add(mesh(cyl(0.18, 0.18, 0.46, 8), mat(DARKWOOD), -1.05, 0.23, 0.6));
  const cx = 4.0, cz = 2.75, ca = facing(cx, cz), co = Math.cos(ca), si = Math.sin(ca);
  put(c, cx, cz, ca, -0.05);
  [[0, 0, 1.0], [-0.75, 0.75, 0.38]].forEach(([x, z, r]) => solid(cx + x*co + z*si, cz - x*si + z*co, r));   // walls, crate + barrel

  /* mailbox by the front path (the contact theme), door facing the path */
  const mb = new THREE.Group();
  mb.add(mesh(box(0.1, 1.0, 0.1), mat(WOOD), 0, 0.5, 0));
  mb.add(mesh(box(0.36, 0.26, 0.6), mat(0x2e5e8a), 0, 1.13, 0));
  const topGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8, 1, false, 0, Math.PI); topGeo.rotateX(Math.PI/2); topGeo.rotateZ(Math.PI/2);
  mb.add(mesh(topGeo, mat(0x2e5e8a), 0, 1.26, 0));
  mb.add(mesh(box(0.34, 0.36, 0.03), mat(0x24496b), 0, 1.17, 0.31));
  mb.add(mesh(box(0.03, 0.34, 0.05), mat(RED), 0.2, 1.38, -0.1));
  mb.add(mesh(box(0.03, 0.12, 0.14), mat(RED), 0.2, 1.5, -0.03));
  const [mx, mz] = isl.rot(1.55, 3.75);             // building frame → island-local
  put(mb, mx, mz, isl.face - Math.PI/2);
  solid(mx, mz, 0.25);

  /* signal mast with a hoist of code flags fluttering */
  const fm = new THREE.Group();
  fm.add(mesh(cyl(0.22, 0.3, 0.25, 6), mat(STONE), 0, 0.12, 0));
  fm.add(mesh(cyl(0.04, 0.06, 3.2, 6), mat(WHITE), 0, 1.6, 0));
  fm.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), mat(0xd9b34a), 0, 3.24, 0));
  fm.add(mesh(box(1.0, 0.04, 0.04), mat(WHITE), 0, 2.85, 0));
  const flags = [];
  [[0xf2c14e, 0x2e5e8a], [WHITE, RED], [0x2e5e8a, WHITE]].forEach(([a, b], k) => {
    const f = new THREE.Group(); f.position.set(0.48, 2.65 - k*0.42, 0); fm.add(f);
    const ma = mesh(box(0.18, 0.32, 0.015), mat(a), 0.09, 0, 0), mbb = mesh(box(0.18, 0.32, 0.015), mat(b), 0.27, 0, 0);
    f.add(ma, mbb); flags.push(f);
  });
  fm.add(mesh(cyl(0.008, 0.008, 1.0, 3), mat(SLATE), 0.48, 2.3, 0));
  put(fm, 4.5, -1.0, -0.6);
  solid(4.5, -1.0, 0.3);

  /* rowboat pulled up on the grass with its oars */
  const bt = new THREE.Group();
  const hullGeo = new THREE.SphereGeometry(1, 8, 3, 0, Math.PI*2, Math.PI/2, Math.PI/2); hullGeo.scale(0.5, 0.36, 1.1);
  bt.add(mesh(hullGeo, mat(0x3f6f8a), 0, 0.34, 0));
  const inner = mesh(hullGeo, mat(WOOD, {side:THREE.BackSide}), 0, 0.35, 0); inner.scale.setScalar(0.94); bt.add(inner);
  const rim = mesh(new THREE.TorusGeometry(1, 0.05, 3, 16), mat(WHITE), 0, 0.34, 0); rim.rotation.x = Math.PI/2; rim.scale.set(0.5, 1.1, 1); bt.add(rim);
  bt.add(mesh(box(0.86, 0.05, 0.22), mat(WOOD), 0, 0.26, 0.1));
  bt.add(mesh(box(0.6, 0.05, 0.2), mat(WOOD), 0, 0.24, -0.6));
  [-1, 1].forEach(s => { const o = mesh(box(0.05, 0.04, 1.5), mat(WOOD), s*0.18, 0.33, 0.05); o.rotation.y = s*0.12; bt.add(o); });
  bt.rotation.z = 0.08;
  const bx = -4.5, bz = 1.5, ba = 0.35; put(bt, bx, bz, ba, 0.02);
  [-0.55, 0.55].forEach(d => solid(bx + Math.sin(ba)*d, bz + Math.cos(ba)*d, 0.55));

  /* bench on the south side between the two bridge paths, looking out to sea */
  const bn = new THREE.Group();
  bn.add(mesh(box(1.1, 0.07, 0.34), mat(WOOD), 0, 0.42, 0));
  bn.add(mesh(box(1.1, 0.26, 0.05), mat(WOOD), 0, 0.66, -0.16));
  [-0.45, 0.45].forEach(x => bn.add(mesh(box(0.07, 0.42, 0.3), mat(DARKWOOD), x, 0.21, 0)));
  put(bn, -0.25, -4.7, Math.PI);
  solid(-0.25, -4.7, 0.5);

  /* gulls circling the light */
  const gulls = [], wingGeo = box(0.42, 0.02, 0.14); wingGeo.translate(0.21, 0, 0);
  for(let k = 0; k < 3; k++){
    const pv = new THREE.Group(); pv.position.y = isl.h + 5.0 + k*0.55; grp.add(pv);
    const gl = new THREE.Group(); gl.position.x = 2.6 + k*0.7; gl.rotation.z = 0.25; pv.add(gl);
    gl.add(mesh(box(0.11, 0.1, 0.38), mat(0xf4f1ea)));
    const beak = mesh(new THREE.ConeGeometry(0.03, 0.1, 4), mat(0xe0a030), 0, 0, -0.23); beak.rotation.x = -Math.PI/2; gl.add(beak);
    const wl = mesh(wingGeo, mat(0xdcdcd6)), wr = mesh(wingGeo, mat(0xdcdcd6)); wr.rotation.y = Math.PI; gl.add(wl, wr);
    wl.castShadow = wr.castShadow = false;
    pv.rotation.y = k*2.2; wl.rotation.z = wr.rotation.z = 0.25;
    gulls.push([pv, wl, wr, 0.35 + k*0.07, k*2.2]);
  }
  animated.push({fn:t => {
    flags.forEach((f, k) => { f.rotation.y = Math.sin(t*3.1 + k*1.3)*0.35 + 0.2; });
    gulls.forEach(([pv, wl, wr, w, p]) => { pv.rotation.y = p + t*w; const fl = Math.sin(t*5 + p*3)*0.45; wl.rotation.z = wr.rotation.z = fl; });
  }});
}
