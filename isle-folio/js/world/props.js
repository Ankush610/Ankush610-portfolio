/* Small reusable meshes: trees, rocks, lanterns, gates, anvils, star fields. */
import { THREE, V3, ZN, reduce, touch, mat, mesh, glow, box, cyl, rnd } from '../engine.js';

export function tree(s=1){
  const g = new THREE.Group();
  g.add(mesh(cyl(0.12*s, 0.18*s, 0.7*s, 5), mat(0x5a3d28), 0, 0.35*s, 0));
  const c1 = rnd() > 0.5 ? 0x2f6b3a : 0x3b7d3f;
  g.add(mesh(new THREE.ConeGeometry(0.9*s, 1.6*s, 6), mat(c1), 0, 1.3*s, 0));
  g.add(mesh(new THREE.ConeGeometry(0.65*s, 1.3*s, 6), mat(c1), 0, 2.05*s, 0));
  g.rotation.y = rnd()*6;
  return g;
}
export function rock(s=1){
  const m = mesh(new THREE.DodecahedronGeometry(0.5*s, 0), mat(rnd()>0.5?0x6d717a:0x5b5f68), 0, 0.2*s, 0);
  m.scale.set(1, 0.6, 1); m.rotation.set(rnd(), rnd()*6, rnd());
  return m;
}
export function lantern(){
  const g = new THREE.Group();
  g.add(mesh(cyl(0.3,0.38,0.35,6), mat(0x4e525b), 0, 0.17, 0));
  g.add(mesh(cyl(0.1,0.1,0.8,6), mat(0x5e626b), 0, 0.75, 0));
  g.add(mesh(box(0.42,0.36,0.42), glow(0xffd27a, 2.2), 0, 1.3, 0));
  g.add(mesh(new THREE.ConeGeometry(0.45,0.35,4), mat(0x4e525b), 0, 1.65, 0));
  g.children[3].rotation.y = Math.PI/4;
  return g;
}
export function gate(){
  const g = new THREE.Group(), red = mat(0x9a2f22), dark = mat(0x3a1c18);
  g.add(mesh(cyl(0.16,0.2,2.6,6), red, -1.25, 1.3, 0));
  g.add(mesh(cyl(0.16,0.2,2.6,6), red, 1.25, 1.3, 0));
  g.add(mesh(box(3.4,0.22,0.36), dark, 0, 2.65, 0));
  g.add(mesh(box(3.0,0.16,0.26), red, 0, 2.2, 0));
  return g;
}
export function anvil(){
  const a = new THREE.Group();
  a.add(mesh(box(0.45,0.5,0.35), mat(0x3d4048), 0, 0.25, 0));
  a.add(mesh(box(1.0,0.28,0.45), mat(0x2f3238), 0.1, 0.62, 0));
  return a;
}
export function starField(n, rMin, rMax, yOff, size){
  const pos = new Float32Array(n*3);
  for(let i=0;i<n;i++){ const u = rnd()*2-1, a = rnd()*Math.PI*2, r = rMin + rnd()*(rMax-rMin), s = Math.sqrt(1-u*u); pos.set([Math.cos(a)*s*r, Math.abs(u)*r*0.8 + yOff, Math.sin(a)*s*r], i*3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({color:0xc9d4ff, size, sizeAttenuation:true, fog:false}));
}
