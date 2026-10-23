/* Assembles the outside world: terrain islands, bridges, buildings, props, decorative islets, labels. */
import { THREE, V3, reduce, touch, mat, mesh, glow, rnd } from '../engine.js';
import { scene } from '../engine.js';
import { DATA } from '../data.js';
import { FD, FB, COL, canvasTex, fitFont, card, eyebrow } from '../panels.js';
import { ISLANDS, byId, home } from './islands.js';
import { tree, cypress, maple, oak, umbrella, wisteria, windswept, spruce, rock } from './props.js';
import { buildSky } from './sky.js';
const FLORA = {pine:tree, cypress, maple, oak, umbrella, wisteria, windswept, spruce};   // islands.js `flora` → the tree each island grows
import { landmark, decorate, animated } from './landmarks.js';
import { makeHero } from './hero.js';
import { planBridges, bridges, bridgeMeshes, shapeIsland, islandMesh, obstacles, smooth } from './terrain.js';

export function buildWorld(){
planBridges();
home.plaza = true;

/* ---------- islands: terrain, building, door, props ---------- */
const tufts = [], flowers = [];
ISLANDS.forEach(isl => {
  const grp = new THREE.Group(); grp.position.set(isl.x, 0, isl.z); scene.add(grp); isl.group = grp;
  grp.add(islandMesh(isl));
  const lm = landmark(isl.id); lm.position.set(0, isl.h, 0); lm.rotation.y = isl.face; grp.add(lm);
  isl.lmGroup = lm; isl.lmWorld = new V3(isl.x, isl.h, isl.z);
  obstacles.push({x:isl.x, z:isl.z, r:isl.obs});
  const [dx, dz] = isl.rot(0, isl.obs + 1.6);
  isl.door = new V3(isl.x + dx, isl.topY(dx, dz), isl.z + dz);
  decorate(isl, grp);   // hand-placed island scenery first; the random scatter below steers around it

  // trees and rocks on open ground, away from the plateau, paths and anything already placed
  const placed = [], taken = (x, z, gap) => obstacles.some(o => Math.hypot(o.x - isl.x - x, o.z - isl.z - z) < (o.clear ?? o.r) + gap);   // o.clear: decorations can reserve more room than they collide with (e.g. a wide canopy)
  const spot = (minR, maxF, pathGap, gap) => {
    for(let tries = 0; tries < 60; tries++){
      const a = rnd()*Math.PI*2, f = rnd(), e = isl.edgeR(a), r = minR + (e*maxF - minR)*Math.sqrt(f);
      const x = Math.cos(a)*r, z = Math.sin(a)*r;
      if(r < minR || isl.pathDist(x, z) < pathGap || placed.some(p => Math.hypot(p[0] - x, p[1] - z) < gap) || taken(x, z, 0.9)) continue;
      placed.push([x, z]); return [x, z];
    }
    return null;
  };
  const nTrees = Math.round(isl.R*1.3);
  for(let k = 0; k < nTrees; k++){
    const p = spot(isl.obs + 2.8, 0.8, 1.7, 1.7); if(!p) continue;
    const s = 0.75 + rnd()*0.55, t = (FLORA[isl.flora] || tree)(s); t.position.set(p[0], isl.topY(p[0], p[1]) - 0.05, p[1]); grp.add(t);
    obstacles.push({x:isl.x + p[0], z:isl.z + p[1], r:0.32*s});
  }
  for(let k = 0; k < 7; k++){
    const p = spot(isl.obs + 2.2, 0.88, 1.3, 1.1); if(!p) continue;
    const s = 0.5 + rnd()*1.1, r = rock(s); r.position.set(p[0], isl.topY(p[0], p[1]) - 0.1, p[1]); grp.add(r);
    if(s > 1) obstacles.push({x:isl.x + p[0], z:isl.z + p[1], r:0.4*s});
  }
  for(let k = 0; k < Math.round(isl.R*9); k++){
    const a = rnd()*Math.PI*2, r = (isl.obs + 1) + rnd()*(isl.edgeR(a)*0.82 - isl.obs - 1), x = Math.cos(a)*r, z = Math.sin(a)*r;
    if(isl.pathDist(x, z) < 0.8) continue;
    if(taken(x, z, 0.1)) continue;
    (rnd() < 0.82 ? tufts : flowers).push([isl.x + x, isl.topY(x, z), isl.z + z, isl]);
  }
});

/* ---------- grass tufts and flowers: two instanced meshes for the whole world ---------- */
const dummy = new THREE.Object3D(), col = new THREE.Color();
function scatterIM(list, geo, colorOf, scale){
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.9}), list.length);
  list.forEach(([x, y, z, isl], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set((rnd() - 0.5)*0.3, rnd()*6, (rnd() - 0.5)*0.3); dummy.scale.setScalar(scale*(0.7 + rnd()*0.6)); dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, colorOf(isl, col));
  });
  im.receiveShadow = true; scene.add(im); return im;
}
const tuftGeo = new THREE.ConeGeometry(0.09, 0.42, 3); tuftGeo.translate(0, 0.18, 0);
scatterIM(tufts, tuftGeo, (isl, c) => c.setHex(isl.top).multiplyScalar(1.05 + rnd()*0.35), 1);
const flowerGeo = new THREE.OctahedronGeometry(0.09, 0); flowerGeo.translate(0, 0.14, 0);
const PETALS = [0xf2c14e, 0xe891bd, 0xb296f0, 0xf6efe0, 0x6fd3e6];
scatterIM(flowers, flowerGeo, (isl, c) => c.setHex(PETALS[Math.floor(rnd()*PETALS.length)]), 1);

/* ---------- bridges (each end has a gateway with a lantern) ---------- */
scene.add(bridgeMeshes());

/* ---------- decorative floating islets in the gaps (not walkable) ---------- */
const islets = [];
for(let tries = 0; tries < 200 && islets.length < 10; tries++){
  const a = rnd()*Math.PI*2, r = 14 + rnd()*34, x = Math.cos(a)*r, z = Math.sin(a)*r;
  if(ISLANDS.some(i => Math.hypot(i.x - x, i.z - z) < i.R + 5)) continue;
  if(bridges.some(br => { const dx = x - br.p0.x, dz = z - br.p0.z, t = (dx*br.dir.x + dz*br.dir.z)/br.len; return t > -0.1 && t < 1.1 && Math.abs(dx*-br.dir.z + dz*br.dir.x) < 4.5; })) continue;
  if(islets.some(o => Math.hypot(o.x - x, o.z - z) < 7)) continue;
  const it = {x, z, h:-3 + rnd()*6, R:1.8 + rnd()*2, obs:0, hill:1.2, top:[0x4b7445, 0x5d8746, 0x58636e, 0x6b5a7a][Math.floor(rnd()*4)], seed:40 + islets.length};
  shapeIsland(it);
  const m = islandMesh(it, 8, 24); m.position.set(x, 0, z); scene.add(m);
  if(it.R > 2.8){ const t = tree(0.7); t.position.set(0.3, it.topY(0.3, 0.2), 0.2); m.add(t); }   // a child of the islet, so it bobs and turns with it
  it.mesh = m; it.p = rnd()*6; islets.push(it);
}

const hero = makeHero(); scene.add(hero);

/* glowing ring at the nearest building's door: shows where to stand to enter */
const doorRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 40), new THREE.MeshBasicMaterial({color:0xf0b54a, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false}));
doorRing.rotation.x = -Math.PI/2; doorRing.renderOrder = 2; scene.add(doorRing);

buildSky(scene, animated);   // dome, stars, Milky Way, nebulae, moon, shooting stars, far islands

const flies = (function(){
  const n = 110, pos = new Float32Array(n*3), base = [];
  for(let i=0;i<n;i++){ const isl = ISLANDS[i % ISLANDS.length]; const a = rnd()*6.28, r = isl.obs + 1 + rnd()*(isl.R*0.75 - isl.obs); base.push([isl.x + Math.cos(a)*r, isl.topY(Math.cos(a)*r, Math.sin(a)*r) + 0.6 + rnd()*2.5, isl.z + Math.sin(a)*r, rnd()*6]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xffe08a, size:0.22, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false})));
  return {g, base, pos};
})();

// islets bob gently; reuse the old "debris" slot so app.js animates them
const debris = islets.map(it => { it.mesh.userData.p = it.p; return it.mesh; });

/* ---------- 3D island labels: highlight the island you're on, prompt when you're at the door ---------- */
const labelSprites = [];
ISLANDS.forEach(isl => {
  const isHome = isl.id === 'home', w = isHome ? 7.4 : 4.6, h = isHome ? 1.9 : 1.45;
  const enterTxt = touch ? '▸ tap the card to go inside' : '▸ press E to go inside';
  const p = canvasTex(w, h, (ctx, W, H, st) => {
    card(ctx, W, H, {focus:st.near}, {r:14, bg:'rgba(12,18,34,.88)', border: st.active ? 'rgba(240,181,74,.55)' : undefined});
    ctx.textAlign = 'center';
    const tag = st.near ? enterTxt : st.active ? '▸ walk to the door' : null;
    if(isHome){
      ctx.font = `400 50px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(DATA.personal.name, W/2, 24);
      fitFont(ctx, DATA.personal.subtitle, W - 50, 19, 600, FB); ctx.fillStyle = COL.muted; ctx.fillText(DATA.personal.subtitle, W/2, 92);
      eyebrow(ctx, tag || 'Hearthstone · start here', W/2, 134, tag ? COL.ember : COL.muted, 14);
    } else {
      ctx.font = `400 40px ${FD}`; ctx.fillStyle = COL.ink; ctx.fillText(isl.name, W/2, 18);
      eyebrow(ctx, tag || isl.sub, W/2, 76, tag ? COL.ember : COL.muted, 15);
    }
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:p.tex, depthTest:false, transparent:true, fog:false}));
  sp.center.set(0.5, 0); sp.scale.set(w, h, 1); sp.renderOrder = 10;
  sp.position.set(isl.x, isl.h + isl.lh, isl.z);
  sp.userData.id = isl.id; scene.add(sp); labelSprites.push(sp);
  isl.labelP = p;
});

ISLANDS.forEach(isl => { mergeStatic(isl.lmGroup); mergeStatic(isl.group, isl.lmGroup); });

return {hero, flies, debris, labelSprites, doorRing};
}

/* Islands are modelled from thousands of small meshes: one draw call each, and again in the shadow pass.
   Merge every still, opaque, untextured mesh under `root` into one vertex-coloured mesh per material look.
   Whatever an animation moves stays its own mesh (found by running the animations and seeing what moved);
   a material an animation changes (glows, flicker) keeps its own merged mesh so it still animates.
   lmGroup and the rest of the island merge separately, so walk-mode picking and camera occlusion only see the building. */
const MERGE_T = [0.37, 1.21, 2.3];   // sample times; under 3 so the sky's first shooting star isn't disturbed
function mergeStatic(root, skip){
  const list = [], walk = o => o.children.forEach(c => { if(c === skip) return; if(c.isMesh) list.push(c); walk(c); });
  walk(root);
  const mats = [...new Set(list.map(m => m.material).filter(m => m && m.isMeshStandardMaterial))];
  const look = m => [m.color.getHex(), m.emissive.getHex(), m.emissiveIntensity, m.opacity].join();
  const snap = () => { root.updateMatrixWorld(true); return {mx:list.map(m => m.matrixWorld.elements.join()), mt:mats.map(look)}; };
  const s0 = snap(), moved = new Set(), changed = new Set();
  MERGE_T.forEach(t => { animated.forEach(a => a.fn(t)); const s = snap(); list.forEach((m, i) => s.mx[i] !== s0.mx[i] && moved.add(m)); mats.forEach((m, i) => s.mt[i] !== s0.mt[i] && changed.add(m)); });
  animated.forEach(a => a.fn(0));
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), rel = new THREE.Matrix4(), c = new THREE.Color(), buckets = new Map();
  list.forEach(o => {
    const m = o.material, g = o.geometry;
    if(moved.has(o) || o.isInstancedMesh || o.children.length || !o.visible || !m || !m.isMeshStandardMaterial || m.map || m.transparent || m.alphaTest
       || o.raycast !== THREE.Mesh.prototype.raycast || Object.keys(o.userData).length || !g.attributes.normal || g.morphAttributes.position) return;
    const key = (changed.has(m) ? m.uuid : [m.roughness, m.metalness, m.emissive.getHex(), m.emissiveIntensity, m.side, m.flatShading, m.fog, m.depthWrite, m.polygonOffset].join()) + [o.castShadow, o.receiveShadow, o.renderOrder].join();
    let b = buckets.get(key); if(!b) buckets.set(key, b = {m, keep:changed.has(m), o, pos:[], nor:[], col:[]});
    const geo = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld));
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, gc = m.vertexColors && geo.attributes.color, n = P.length/3;
    if(rel.determinant() < 0) for(let i = 0; i < n; i += 3) for(const A of [P, N, gc && gc.array].filter(Boolean)){ const s = A.slice(i*3 + 3, i*3 + 6); A.copyWithin(i*3 + 3, i*3 + 6, i*3 + 9); A.set(s, i*3 + 6); }   // mirrored: keep triangles facing out
    const C = new Float32Array(n*3);
    for(let i = 0; i < n; i++){ c.copy(b.keep ? WHITE : m.color); if(gc) c.multiply(c2.fromArray(gc.array, i*3)); C[i*3] = c.r; C[i*3 + 1] = c.g; C[i*3 + 2] = c.b; }
    b.pos.push(P); b.nor.push(N); b.col.push(C);
    o.parent.remove(o);
  });
  const cat = arrs => { const a = new Float32Array(arrs.reduce((t, x) => t + x.length, 0)); let k = 0; arrs.forEach(x => { a.set(x, k); k += x.length; }); return a; };
  buckets.forEach(b => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(cat(b.pos), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(cat(b.nor), 3));
    if(!b.keep || b.m.vertexColors) geo.setAttribute('color', new THREE.BufferAttribute(cat(b.col), 3));
    // a still material gets a white, vertex-coloured copy (its colours are in the vertices); an animated one is shared untouched
    let m = b.m;
    if(!b.keep){ m = m.clone(); m.color.set(0xffffff); m.vertexColors = true; }
    const out = new THREE.Mesh(geo, m); Object.assign(out, {castShadow:b.o.castShadow, receiveShadow:b.o.receiveShadow, renderOrder:b.o.renderOrder});
    root.add(out);
  });
}
const WHITE = new THREE.Color(1, 1, 1), c2 = new THREE.Color();
