/* App state, input (keys, pointer, wheel, pinch), camera framing, room transitions and the render loop. */
import { THREE, V3, reduce, touch } from './engine.js';
import * as E from './engine.js';
import { ISLANDS, byId, home } from './world/islands.js';
import { createPlayer } from './world/player.js';
import { HERO_SCALE } from './world/hero.js';
import { obstacles, groundY } from './world/terrain.js';
import { animated } from './world/landmarks.js';
import { getRoom } from './rooms/index.js';
import { hooks } from './rooms/kit.js';

export function startApp({hero, flies, debris, labelSprites, doorRing}){
const {renderer, scene, camera, hemi, moon, keyL, fillL} = E, canvas = renderer.domElement;

/* ---------- State ---------- */
// top: top-view mode (pick an island, the camera circles it while the wizard walks to its door; a second press goes in) vs walking with WASD
let current = 'home', near = null, top = false, tour = null, tourA = 0, mode = 'world', room = null, busy = false, diving = null;
const camTarget = new V3(), camPos = new V3(), wantTarget = new V3(), wantPos = new V3();
const backBtn = document.getElementById('backBtn'), hint = document.getElementById('hint'), fader = document.getElementById('fader'), live = document.getElementById('live');
const enterBtn = document.getElementById('enterBtn'), stickEl = document.getElementById('stick'), modeBtn = document.getElementById('modeBtn');
const player = createPlayer(hero, () => mode === 'world' && !top && !busy);

function hud(){
  backBtn.hidden = mode !== 'room';
  if(mode === 'room'){
    backBtn.textContent = '← Leave ' + byId[room.id].name;
    const ax = room.vertical ? '<kbd>↑</kbd><kbd>↓</kbd>' : '<kbd>←</kbd><kbd>→</kbd>';
    hint.innerHTML = touch ? 'Swipe to browse · pinch to zoom · tap to open' : `<b>${byId[room.id].name}</b><span class="k">${ax} browse</span><span class="k"><kbd>Scroll</kbd> zoom</span><span class="k"><kbd>Enter</kbd> open</span><span class="k"><kbd>Esc</kbd> back outside</span>`;
  } else {
    const isl = byId[current];
    hint.innerHTML = top
      ? tour ? `<b>Visiting ${byId[tour].name}</b>` + (touch ? ' · tap another island to change' : (near === tour ? `<span class="k"><kbd>E</kbd> go inside</span>` : '') + `<span class="k">click another island to change</span><span class="k"><kbd>M</kbd> walk mode</span>`)
      : (touch ? '<b>Top view</b> · tap an island to visit it' : `<b>Top view</b><span class="k">click an island to visit</span><span class="k"><kbd>1–${KEYS}</kbd> visit</span><span class="k"><kbd>M</kbd> walk mode</span>`)
      : touch ? `<b>${isl.name}</b> · drag to look · tap a sign to travel` : `<b>${isl.name}</b><span class="k"><kbd>W A S D</kbd> walk</span><span class="k"><kbd>Drag</kbd> look</span><span class="k"><kbd>E</kbd> enter</span><span class="k"><kbd>1–${KEYS}</kbd> travel</span><span class="k"><kbd>M</kbd> top view</span>`;
  }
  modeBtn.hidden = mode !== 'world';
  modeBtn.textContent = top ? '✥ Walk mode' : '◎ Top view';
  enterBtn.hidden = !(mode === 'world' && near && (!top || near === tour));
  if(near) enterBtn.textContent = `Enter ${byId[near].name}` + (touch ? '' : '  ·  E');
  if(stickEl) stickEl.hidden = !(touch && mode === 'world' && !top);
}
const KEYS = Math.min(9, ISLANDS.length);
function setLabels(){ ISLANDS.forEach(i => i.labelP.redraw({active: i.id === current, near: i.id === near})); }
function travel(id){
  if(top){
    if(tour === id){ if(near === id) goInside(id); return; }   // second pick of the island being toured: go in
    const i = byId[id]; tourA = Math.atan2(camPos.x - i.x, camPos.z - i.z); tour = id;   // start the orbit from where the camera already is
  } else if(near === id){ goInside(id); return; }
  if(near !== id) player.travelTo(id);
  hud();
  live.textContent = near === id ? `At the door of ${byId[id].name}. Press E to go inside.` : `Walking to ${byId[id].name}, ${byId[id].sub}.`;
}
function setTop(on){
  top = on; tour = null; zoom = 1; hud();
  live.textContent = on ? 'Top view. Pick an island to visit.' : 'Walk mode.';
}
modeBtn.addEventListener('click', () => { if(!busy && mode === 'world') setTop(!top); });
function setLights(r){
  if(r){
    hemi.intensity = 0.35; moon.intensity = 0.22;
    [[keyL, r.light.key], [fillL, r.light.fill]].forEach(([L, [x, y, z, c, i]]) => { L.position.set(x, y, z).add(r.group.position); L.color.setHex(c); L.intensity = i; });
  } else { hemi.intensity = 0.55; moon.intensity = 1.05; keyL.intensity = 0; fillL.intensity = 0; }
}
function setFocus(i){
  const n = room.items.length; i = ((i % n) + n) % n;
  if(i === room.focus) return;
  room.items[room.focus] && room.items[room.focus].setFocus(false);
  room.focus = i; room.items[i].setFocus(true);
  room.onFocus && room.onFocus(i);
  live.textContent = room.items[i].label;
}
const step = d => setFocus(room.focus + d);
function activate(){ const it = room.items[room.focus]; if(it && it.activate) it.activate(); }

function openRoom(id){
  if(room) room.group.visible = false;
  const r = getRoom(id);
  room = r; mode = 'room'; current = id;
  r.group.visible = true; setLights(r); zoom = zoomCur = 1;
  r.onEnter && r.onEnter(camera.aspect < 1.05);
  hero.position.copy(r.group.position).add(r.heroSpot); hero.userData.inRoom = true; hero.scale.setScalar(HERO_SCALE.room);
  desired();
  camTarget.copy(wantTarget);
  camPos.copy(wantPos).sub(wantTarget).multiplyScalar(reduce ? 1 : 1.35).add(wantTarget);
  live.textContent = `Inside ${byId[id].name}, ${byId[id].sub}. ${r.items[r.focus] ? r.items[r.focus].label : ''}`;
}
function goInside(id){
  if(busy) return; busy = true;
  const fromWorld = mode === 'world';
  if(fromWorld) diving = byId[id];
  setTimeout(() => {
    fader.classList.add('on');
    setTimeout(() => {
      try { openRoom(id); } catch(err){ console.error(err); mode = 'world'; room = null; setLights(null); }
      diving = null; hud(); fader.classList.remove('on'); busy = false;
    }, reduce ? 30 : 380);
  }, fromWorld && !reduce ? 650 : 0);
}
function leaveRoom(){
  if(busy || mode !== 'room') return; busy = true;
  fader.classList.add('on');
  setTimeout(() => {
    const id = room.id; room.group.visible = false; room = null; mode = 'world'; setLights(null); zoom = zoomCur = 1; tour = null;   // top view comes back out to the whole map
    hero.userData.inRoom = false; hero.scale.setScalar(HERO_SCALE.world);
    player.place(byId[id].door, byId[id].face);   // step out of the door, camera looking back at the building
    desired(); camTarget.copy(wantTarget); camPos.copy(wantPos);
    hud(); fader.classList.remove('on'); busy = false; canvas.focus({preventScroll:true});
  }, reduce ? 30 : 380);
}
backBtn.addEventListener('click', leaveRoom);

enterBtn.addEventListener('click', () => { if(near) goInside(near); });
window.addEventListener('keydown', e => {
  if(busy) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if(k === '+' || k === '='){ zoomBy(0.85); e.preventDefault(); return; }
  if(k === '-' || k === '_'){ zoomBy(1/0.85); e.preventDefault(); return; }
  if(k === '0'){ zoom = 1; return; }
  if(mode === 'room'){
    if(k === 'Escape' || k === 'Backspace'){ leaveRoom(); e.preventDefault(); return; }
    const v = room.vertical, d = {ArrowLeft:-1, ArrowRight:1, ArrowUp: v ? 1 : -1, ArrowDown: v ? -1 : 1, a:-1, d:1, w: v ? 1 : -1, s: v ? -1 : 1}[k];
    if(d){ step(d); e.preventDefault(); return; }
    if(k === 'Enter' || k === ' '){ if(document.activeElement === backBtn) return; activate(); e.preventDefault(); }
    return;
  }
  // world: movement keys are handled by the player; here only enter / map / travel
  if(k === 'Escape' || k === 'm'){ setTop(!top); e.preventDefault(); return; }
  if(k === 'e' || k === 'Enter' || k === ' '){ if(document.activeElement && document.activeElement.tagName === 'BUTTON') return; if(near && (!top || near === tour)) goInside(near); e.preventDefault(); return; }
  if(/^[1-9]$/.test(k) && ISLANDS[+k - 1]){ travel(ISLANDS[+k - 1].id); e.preventDefault(); }
});

/* picking */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function aim(ev){ const r = canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left)/r.width)*2 - 1, -((ev.clientY - r.top)/r.height)*2 + 1); ray.setFromCamera(ndc, camera); }
function pickIsland(ev){
  aim(ev);
  const key = top ? 'group' : 'lmGroup';   // top view: anywhere on the island; walking: only its sign or building
  const hits = ray.intersectObjects([...labelSprites, ...ISLANDS.map(i => i[key])], true);
  for(const h of hits){ let o = h.object; if(o.userData.id) return o.userData.id; while(o && !ISLANDS.some(i => i[key] === o)) o = o.parent; const isl = ISLANDS.find(i => i[key] === o); if(isl) return isl.id; }
  return null;
}
function pickItem(ev){
  aim(ev);
  const h = ray.intersectObject(room.group, true)[0]; if(!h) return null;
  for(let o = h.object; o; o = o.parent){ if(o.userData.item) return o.userData.item; if(o.userData.focused) return room.items[room.focus]; }
  return null;
}
/* zoom: wheel, trackpad pinch, touch pinch, +/- keys. Scales the camera's distance to what it looks at. */
let zoom = 1, zoomCur = 1;
function zoomBy(f){ const [lo, hi] = mode === 'room' ? [0.45, 1.8] : top ? [0.5, 1] : [0.4, 2.0]; zoom = Math.min(hi, Math.max(lo, zoom*f)); }
const ptrs = new Map(); let pinchD = 0, pinching = false;
const ptrDist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
let downAt = null, lastPt = null, dragging = false;
canvas.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if(ptrs.size === 2){ pinching = true; pinchD = ptrDist(); downAt = null; } else if(ptrs.size === 1){ downAt = [e.clientX, e.clientY]; lastPt = [e.clientX, e.clientY]; dragging = false; }
});
canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); if(!ptrs.size) pinching = false; downAt = null; });
canvas.addEventListener('pointerup', e => {
  ptrs.delete(e.pointerId);
  if(pinching){ if(!ptrs.size) pinching = false; downAt = null; return; }
  if(!downAt || busy){ downAt = null; return; }
  const dx = e.clientX - downAt[0], dy = e.clientY - downAt[1]; downAt = null;
  if(mode === 'room'){
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)){ step(dx < 0 ? 1 : -1); return; }
    if(Math.abs(dy) > 50){ step(room.vertical ? (dy < 0 ? -1 : 1) : (dy < 0 ? 1 : -1)); return; }
    if(Math.hypot(dx, dy) > 8) return;
    const it = pickItem(e); if(!it) return;
    const k = room.items.indexOf(it);
    if(k === room.focus) activate(); else setFocus(k);
    return;
  }
  if(dragging || Math.hypot(dx, dy) > 8) return;
  const id = pickIsland(e); if(id) travel(id);
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if(busy) return;
  const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  zoomBy(Math.exp(Math.max(-250, Math.min(250, dy)) * (e.ctrlKey ? 0.01 : 0.0025)));
}, {passive:false});
const mouse = new THREE.Vector2();
let hoverT = 0;
canvas.addEventListener('pointermove', e => {
  if(ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if(pinching && ptrs.size === 2){ const d = ptrDist(); if(d > 0) zoomBy(pinchD/d); pinchD = d; return; }
  // drag to look around (outside)
  if(mode === 'world' && !top && downAt && lastPt && ptrs.has(e.pointerId)){
    if(Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) dragging = true;
    if(dragging) player.orbit(e.clientX - lastPt[0], e.clientY - lastPt[1]);
    lastPt = [e.clientX, e.clientY];
  }
  mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  if(e.pointerType === 'mouse' && !busy && performance.now() - hoverT > 80){
    hoverT = performance.now();
    canvas.classList.toggle('hovering', !!(mode === 'room' ? pickItem(e) : pickIsland(e)));
  }
});

/* ---------- Camera ---------- */
function resize(){ renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

function fit(v, pos, tgt){
  const tn = Math.tan(camera.fov*Math.PI/360);
  const d = Math.max(v.w/(2*tn*camera.aspect), v.h/(2*tn))*1.08;
  tgt.copy(v.c); pos.copy(v.n).normalize().multiplyScalar(d).add(v.c); pos.y += d*0.06;
}
function desired(){
  if(mode === 'room'){
    const narrow = camera.aspect < 1.05, r = room;
    const v = r.view ? r.view(narrow) : (r.follow || narrow) ? r.items[r.focus].view : r.frame;
    fit(v, wantPos, wantTarget); wantPos.add(r.group.position); wantTarget.add(r.group.position);
    return;
  }
  if(diving){ const p = diving.lmWorld, a = diving.face; wantTarget.set(p.x, p.y + 1.6, p.z); wantPos.set(p.x + Math.sin(a)*6.5, p.y + 3.2, p.z + Math.cos(a)*6.5); return; }
  const k = Math.max(1, 0.95 / camera.aspect);
  const fk = top ? k : 1; scene.fog.near = 70*fk; scene.fog.far = 190*fk;   // portrait pulls the top view back: push the fog back with it
  if(top && tour){   // circle the chosen island, framed so the whole of it stays in view
    const i = byId[tour], d = (i.R + 3)*2.6*k;
    wantTarget.set(i.x, i.h + 1, i.z); wantPos.set(i.x + Math.sin(tourA)*d, i.h + 1 + d*0.85, i.z + Math.cos(tourA)*d);
  }
  else if(top){ wantTarget.set(0, 0, 4); wantPos.set(0, 50*k, 48*k); }   // centred a little south: the near islands draw bigger
  else player.camera(wantPos, wantTarget, camera.aspect);
}

/* which island are you on, and are you standing at its door? */
function whereAmI(){
  const p = hero.position;
  let best = current, bd = 1e9;
  ISLANDS.forEach(i => { const d = Math.hypot(i.x - p.x, i.z - p.z) - i.R; if(d < bd){ bd = d; best = i.id; } });
  const i = byId[best], n = Math.hypot(i.x - p.x, i.z - p.z) < i.obs + 2.7 && Math.abs(p.y - i.h) < 2.5 ? best : null;
  if(best !== current || n !== near){
    const arrived = n && n !== near;
    current = best; near = n; setLabels(); hud();
    if(arrived) live.textContent = `At the door of ${i.name}, ${i.sub}. Press E to go inside.`;
  }
}

{ const [x, z] = home.rot(0, home.obs + 3.2); player.place(new V3(home.x + x, home.topY(x, z), home.z + z), home.face); }   // on the cleared path in front of the door
setLabels(); hud();
desired(); camTarget.copy(wantTarget); camPos.copy(wantPos).add(new V3(0, 30, 30));

const tmp = new V3(), clock = new THREE.Clock();
function frame(){
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  desired();
  const f = reduce ? 1 : 1 - Math.exp(-dt*(diving ? 3.6 : mode === 'room' ? 4 : 3.2));
  camTarget.lerp(wantTarget, f); camPos.lerp(wantPos, f);
  zoomCur += (zoom - zoomCur) * (reduce ? 1 : Math.min(1, dt*8));
  camera.position.copy(camPos).sub(camTarget).multiplyScalar(zoomCur).add(camTarget);
  if(!reduce && mode === 'room'){ camera.position.x += mouse.x*0.5; camera.position.y -= mouse.y*0.28; }
  camera.lookAt(camTarget);

  if(mode === 'world'){
    player.update(dt, t);
    whereAmI();
    if(top && tour && !reduce) tourA += dt*0.22;   // keep circling; going inside waits for E / Enter / the button
    const ci = byId[current], dr = doorRing;
    dr.position.set(ci.door.x, ci.door.y + 0.06, ci.door.z);
    const dd = Math.hypot(hero.position.x - ci.door.x, hero.position.z - ci.door.z);
    dr.material.opacity = (near ? 0.85 : 0.5*(1 - Math.min(1, Math.max(0, (dd - 4)/8)))) * (reduce ? 1 : 0.75 + Math.sin(t*3)*0.25);
    labelSprites.forEach(sp => { const i = byId[sp.userData.id]; sp.position.y = i.h + i.lh + (reduce ? 0 : Math.sin(t*1.3 + sp.position.x)*0.08); });
    if(!reduce){
      animated.forEach(a => a.fn(t));
      for(let i=0;i<flies.base.length;i++){ const b = flies.base[i]; flies.pos[i*3] = b[0] + Math.sin(t*0.6 + b[3])*0.8; flies.pos[i*3+1] = b[1] + Math.sin(t*1.3 + b[3]*2)*0.4; flies.pos[i*3+2] = b[2] + Math.cos(t*0.5 + b[3])*0.8; }
      flies.g.attributes.position.needsUpdate = true;
      debris.forEach(d => { d.position.y += Math.sin(t*0.8 + d.userData.p)*0.004; d.rotation.y += dt*0.2; });
    } else if(t < 0.1){ animated.forEach(a => a.fn(0)); for(let i=0;i<flies.base.length;i++) flies.pos.set(flies.base[i].slice(0,3), i*3); flies.g.attributes.position.needsUpdate = true; }
  } else {
    hero.userData.pose(t, 0, dt);   // idle inside rooms
    hero.rotation.y += (((0.2 - hero.rotation.y + Math.PI*3) % (Math.PI*2)) - Math.PI)*Math.min(1, dt*3);
    if(room && room.update) room.update(t, dt);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

hooks.goInside = goInside;
// deep link: ?room=projects opens straight into that room
const deep = new URLSearchParams(location.search).get('room');
if(byId[deep]){ player.place(byId[deep].door, byId[deep].face); openRoom(deep); hud(); }
// ?at=projects starts outside that island, a few steps in front of its building
const at = new URLSearchParams(location.search).get('at');
if(byId[at] && !byId[deep]){
  const i = byId[at], d = i.door, fx = Math.sin(i.face), fz = Math.cos(i.face);
  const k = [3, 2, 1.5, 1, 0].find(k => groundY(d.x + fx*k, d.z + fz*k) !== null) ?? 0;   // farthest walkable spot in front of the door
  player.place(new V3(d.x + fx*k, groundY(d.x + fx*k, d.z + fz*k) ?? d.y, d.z + fz*k), i.face); desired(); camTarget.copy(wantTarget); camPos.copy(wantPos);
}
hooks.announce = msg => { live.textContent = msg; };
requestAnimationFrame(frame);
}
