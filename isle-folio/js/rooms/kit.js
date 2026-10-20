/* Shared building blocks for room interiors.
   A room = {group, items[], frame | view(), follow, start, maxDist, light, heroSpot, heroScale, update(t, dt), onFocus(i), onEnter(narrow)}
   maxDist: optional cap on the camera's distance from what it looks at (zoom-out stops there)
   heroScale: optional wizard size in this room (default HERO_SCALE.room), for rooms built at a bigger scale
   An item = a focusable thing: {obj, view:{c,w,h,n}, label, activate?} */
import { THREE, V3, ZN, reduce, touch, mat, mesh, glow, box, cyl, rnd } from '../engine.js';
import { setPanel } from '../panels.js';

// set by app.js so rooms can trigger navigation / announcements without importing it
export const hooks = { goInside(){}, announce(){} };

export const view = (c, w, h, n = ZN) => ({c, w, h, n});
export const faceY = a => new V3(Math.sin(a), 0, Math.cos(a));
export function item(o){
  const it = Object.assign({panels:[], label:''}, o);
  if(!it.setFocus) it.setFocus = on => it.panels.forEach(p => setPanel(p, {focus:on}));
  (it.hits || [it.obj]).forEach(h => h && h.traverse(m => { m.userData.item = it; }));
  return it;
}
export function floorDisc(r, color, segs=10){ return mesh(new THREE.CylinderGeometry(r, r*1.03, 0.4, segs), mat(color), 0, -0.2, 0); }
export function arcWall(r, h, color, start, len, y=0){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true, start, len), mat(color, {side:THREE.DoubleSide}));
  m.position.y = y + h/2; m.receiveShadow = true; return m;
}
