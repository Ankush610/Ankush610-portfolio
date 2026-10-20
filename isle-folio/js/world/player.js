/* Third-person walking: WASD/arrows move the wizard relative to the camera (touch screens use the island cards instead),
   drag orbits the camera, and travelTo() auto-walks across bridges to another island's door. */
import { THREE, V3, reduce } from '../engine.js';
import { ISLANDS, byId } from './islands.js';
import { groundY, surfaceY, islandAt, bridges } from './terrain.js';

const MOVE = {KeyW:[0, 1], ArrowUp:[0, 1], KeyS:[0, -1], ArrowDown:[0, -1], KeyA:[-1, 0], ArrowLeft:[-1, 0], KeyD:[1, 0], ArrowRight:[1, 0]};
const wrapAng = a => ((a + Math.PI*3) % (Math.PI*2)) - Math.PI;

export function createPlayer(hero, isActive){
  const keys = new Set();
  let yaw = 0, pitch = 0.42, lastDrag = -1e9, route = null, bestD = 1e9, stuckT = 0, groundTarget = hero.position.y, moving = 0;
  const T = () => performance.now()/1000;
  const ray = new THREE.Raycaster(), dir = new V3(), occ = [];

  addEventListener('keydown', e => {
    if(!isActive() || e.altKey || e.ctrlKey || e.metaKey) return;
    if(MOVE[e.code] || e.code.startsWith('Shift')){ keys.add(e.code); if(MOVE[e.code]){ route = null; e.preventDefault(); } }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  /* try to move; slide along walls/edges when the direct step is blocked */
  function tryMove(dx, dz){
    const p = hero.position, stuck = groundY(p.x, p.z) === null;   // started inside an obstacle: let any step on solid ground through
    for(const [mx, mz] of [[dx, dz], [dx, 0], [0, dz]]){
      if(!mx && !mz) continue;
      const y = groundY(p.x + mx, p.z + mz, 0.38, stuck);
      if(y !== null && y - groundTarget < 1.1){ p.x += mx; p.z += mz; groundTarget = y; return true; }
    }
    return false;
  }

  function update(dt, t){
    if(!isActive()) keys.clear();
    let ix = 0, iz = 0;
    keys.forEach(c => { if(MOVE[c]){ ix += MOVE[c][0]; iz += MOVE[c][1]; } });
    const len = Math.hypot(ix, iz);
    let vx = 0, vz = 0, speed = 0;
    if(len > 0.08){
      route = null;
      const s = Math.min(1, len)/len, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      vx = (fx*iz + rx*ix)*s; vz = (fz*iz + rz*ix)*s;
      speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 10 : 6.5;
      // camera eases round behind you when you walk forwards or turn (not when backing up)
      if(iz > -0.2 && T() - lastDrag > 1.2 && !reduce) yaw += wrapAng(Math.atan2(vx, vz) + Math.PI - yaw)*Math.min(1, dt*1.4*Math.min(1, Math.abs(ix) + 0.25));
    } else if(route){
      const wp = route[0], dx = wp.x - hero.position.x, dz = wp.z - hero.position.z, d = Math.hypot(dx, dz);
      if(d < 0.45){ route.shift(); bestD = 1e9; stuckT = 0; if(!route.length) route = null; }
      else {
        vx = dx/d; vz = dz/d; speed = 8;
        if(d < bestD - 0.15){ bestD = d; stuckT = 0; } else if((stuckT += dt) > 1.0){ hero.position.set(wp.x, wp.y, wp.z); groundTarget = wp.y; stuckT = 0; }   // ponytail: no pathfinding round obstacles; hop to the waypoint if blocked
        if(T() - lastDrag > 1.2 && !reduce) yaw += wrapAng(Math.atan2(vx, vz) + Math.PI - yaw)*Math.min(1, dt*1.2);
      }
    }
    if(speed){
      const step = speed*(reduce ? 1 : 1)*dt;
      const ok = tryMove(vx*step, vz*step);
      hero.rotation.y += wrapAng(Math.atan2(vx, vz) - hero.rotation.y)*Math.min(1, dt*12);
      moving = ok ? 1 : 0;
    } else moving = 0;
    hero.position.y += (groundTarget - hero.position.y)*Math.min(1, dt*12);
    hero.userData.pose(t, moving ? (speed > 7 ? 1.5 : 1) : 0, dt);
  }

  /* camera: orbit around the wizard, never dipping under the ground */
  function camera(pos, tgt, aspect = 1.6){
    tgt.set(hero.position.x, hero.position.y + 1.3, hero.position.z);
    const d = 9.8*Math.pow(Math.max(1, 1/aspect), 0.6);   // pull back on portrait screens
    pos.set(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(d).add(tgt);
    // don't let buildings come between the camera and the wizard: pull the camera in front of the first solid hit
    occ.length = 0;
    ISLANDS.forEach(i => { if(i.lmGroup && Math.hypot(i.x - tgt.x, i.z - tgt.z) < i.obs + d + 2) occ.push(i.lmGroup); });
    if(occ.length){
      dir.subVectors(pos, tgt); const full = dir.length(); dir.divideScalar(full);
      ray.set(tgt, dir); ray.far = full;
      const hit = ray.intersectObjects(occ, true).find(h => h.object.isMesh && !h.object.material.transparent);
      if(hit) pos.copy(tgt).addScaledVector(dir, Math.max(1.6, hit.distance - 0.4));
    }
    const g = surfaceY(pos.x, pos.z); if(g !== null && pos.y < g + 1.2) pos.y = g + 1.2;
  }
  function orbit(dx, dy){ yaw -= dx*0.006; pitch = Math.min(1.25, Math.max(0.1, pitch + dy*0.004)); lastDrag = T(); }

  /* walk to an island's door, crossing bridges island by island (breadth-first over the bridge graph) */
  function travelTo(id){
    const p = hero.position;
    const here = islandAt(p.x, p.z) || ISLANDS.reduce((a, b) => Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? a : b);
    const prev = {[here.id]: null}, q = [here.id];
    while(q.length){
      const c = q.shift(); if(c === id) break;
      bridges.forEach(br => { const n = br.a === c ? br.b : br.b === c ? br.a : null; if(n && !(n in prev)){ prev[n] = [c, br]; q.push(n); } });
    }
    if(!(id in prev)) return;
    const hops = []; for(let c = id; prev[c]; c = prev[c][0]) hops.unshift(prev[c]);
    // stay on cleared ground: circle the plaza around each building, then follow the dirt path out to the bridge
    const ang = (isl, v) => Math.atan2(v.z - isl.z, v.x - isl.x);
    const pts = [];
    let isl = here, a = ang(here, p);
    hops.forEach(([from, br]) => {
      const [out, inn] = br.a === from ? [br.p0, br.p1] : [br.p1, br.p0];
      pts.push(...plaza(isl, a, ang(isl, out)), out.clone(), inn.clone());
      isl = byId[br.a === from ? br.b : br.a]; a = ang(isl, inn);
    });
    pts.push(...plaza(isl, a, ang(isl, isl.door)), isl.door.clone());
    route = pts; bestD = 1e9; stuckT = 0;
  }
  function plaza(isl, from, to){
    const r = isl.obs + 1.4, d = wrapAng(to - from), n = Math.max(1, Math.ceil(Math.abs(d)/0.45)), pts = [];
    for(let k = 0; k <= n; k++){ const t = from + d*k/n, x = Math.cos(t)*r, z = Math.sin(t)*r; pts.push(new V3(isl.x + x, isl.topY(x, z), isl.z + z)); }
    return pts;
  }
  function place(v, faceYaw = 0){
    hero.position.copy(v); groundTarget = v.y; hero.rotation.y = faceYaw; yaw = faceYaw; route = null;
  }

  return {update, camera, orbit, travelTo, place, get traveling(){ return !!route; }, get moving(){ return moving; }};
}
