/* The night sky behind the islands: a gradient dome, three layers of stars (some twinkling), a Milky Way band,
   nebulae, the moon where the moonlight comes from, the odd shooting star, and far-off island silhouettes on the
   horizon. Nothing here takes light or fog; animation runs through `animated` (frozen when reduced motion is on). */
import { THREE, V3, mat, mesh } from '../engine.js';

// own seeded random: never touch the shared rnd() sequence (it places every island's props)
let sd = 4711;
const r01 = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0)/4294967296;
const unlit = o => Object.assign(o, {fog:false, depthWrite:false, transparent:true});

function canvasTexture(size, draw){ const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return new THREE.CanvasTexture(c); }
// a soft round dot, so stars aren't squares
const dotTex = canvasTexture(32, (x, S) => { const g = x.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); });
// a nebula: overlapping soft blobs of one hue, brighter toward the middle
const cloudTex = (h, seed) => canvasTexture(256, (x, S) => {
  let s = seed; const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0)/4294967296;
  for(let i = 0; i < 26; i++){
    const cx = S/2 + (r() - 0.5)*S*0.55, cy = S/2 + (r() - 0.5)*S*0.4, rad = S*(0.08 + r()*0.2), a = 0.05 + r()*0.08;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, `hsla(${h + (r() - 0.5)*30},70%,62%,${a})`); g.addColorStop(1, `hsla(${h},70%,50%,0)`);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  }
});
// the moon: a pale disc with darker maria and a few craters
const moonTex = canvasTexture(128, (x, S) => {
  x.fillStyle = '#e8e6dc'; x.beginPath(); x.arc(S/2, S/2, S*0.46, 0, 7); x.fill();
  x.save(); x.beginPath(); x.arc(S/2, S/2, S*0.46, 0, 7); x.clip();
  [[0.38, 0.4, 0.16], [0.6, 0.55, 0.12], [0.45, 0.66, 0.09], [0.66, 0.32, 0.07]].forEach(([u, v, rr]) => { x.fillStyle = 'rgba(150,150,160,.35)'; x.beginPath(); x.arc(u*S, v*S, rr*S, 0, 7); x.fill(); });
  [[0.3, 0.6, 0.04], [0.55, 0.25, 0.03], [0.7, 0.7, 0.035], [0.4, 0.3, 0.025]].forEach(([u, v, rr]) => { x.strokeStyle = 'rgba(120,120,130,.45)'; x.lineWidth = 1.5; x.beginPath(); x.arc(u*S, v*S, rr*S, 0, 7); x.stroke(); });
  const sh = x.createLinearGradient(0, 0, S, S); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(10,15,40,.35)'); x.fillStyle = sh; x.fillRect(0, 0, S, S);
  x.restore();
});

// a point on the sky sphere: azimuth a, elevation e (radians), radius R
const onSky = (a, e, R) => new V3(Math.cos(e)*Math.cos(a)*R, Math.sin(e)*R, Math.cos(e)*Math.sin(a)*R);
function stars(list, size, opacity = 1){
  const pos = new Float32Array(list.length*3), col = new Float32Array(list.length*3);
  list.forEach(([p, c], i) => { pos.set([p.x, p.y, p.z], i*3); col.set([c.r, c.g, c.b], i*3); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial(unlit({size, map:dotTex, vertexColors:true, opacity, blending:THREE.AdditiveBlending}));
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = -1; return pts;
}

export function buildSky(scene, animated){
  const sky = new THREE.Group(); scene.add(sky);
  /* the dome: deep navy overhead, a violet glow at the horizon, dark below */
  const dome = new THREE.SphereGeometry(300, 32, 24), dc = [], c = new THREE.Color();
  const stops = [[-1, 0x0a0c24], [-0.45, 0x0d1030], [0.0, 0x1a1a3e], [0.12, 0x141a38], [0.4, 0x0b1128], [1, 0x050816]];   // space all round, not a floor of black
  for(let i = 0; i < dome.attributes.position.count; i++){
    const y = dome.attributes.position.getY(i)/300; let k = 1; while(k < stops.length - 1 && y > stops[k][0]) k++;
    const [y0, c0] = stops[k - 1], [y1, c1] = stops[k]; c.setHex(c0).lerp(new THREE.Color(c1), Math.min(1, Math.max(0, (y - y0)/(y1 - y0)))); dc.push(c.r, c.g, c.b);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
  const domeM = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false}));
  domeM.renderOrder = -2; sky.add(domeM);

  /* stars: a dense faint field, brighter coloured ones, and three groups that twinkle */
  const TINTS = [0xffffff, 0xdfe8ff, 0xbcd0ff, 0xfff1d0, 0xffd9a0, 0xffb0a0].map(h => new THREE.Color(h));
  const randStar = (minE = -1) => {   // the islands float in space: stars in every direction, below too
    const a = r01()*Math.PI*2, e = Math.asin(minE + r01()*(1 - minE)); return onSky(a, e, 220 + r01()*50); };
  const faint = []; for(let i = 0; i < 5200; i++) faint.push([randStar(), TINTS[i % 3].clone().multiplyScalar(0.45 + r01()*0.35)]);
  sky.add(stars(faint, 1.7));
  const bright = []; for(let i = 0; i < 520; i++) bright.push([randStar(), TINTS[Math.floor(r01()*TINTS.length)].clone().multiplyScalar(0.7 + r01()*0.3)]);
  sky.add(stars(bright, 3.4));
  const twinkle = [0, 1, 2].map(k => { const l = []; for(let i = 0; i < 120; i++) l.push([randStar(), TINTS[(i + k) % TINTS.length]]); const p = stars(l, 4.4); sky.add(p); return p.material; });

  /* the Milky Way: a tilted band of dense small stars with soft glowing clouds along it */
  const tilt = new THREE.Euler(0.55, 0.3, 0.25), band = [];
  for(let i = 0; i < 7000; i++){
    const a = r01()*Math.PI*2, w = (r01() + r01() + r01() - 1.5)*0.16;           // roughly gaussian across the band
    const p = onSky(a, w, 235 + r01()*30).applyEuler(tilt);
    band.push([p, TINTS[i % 4].clone().multiplyScalar(0.35 + r01()*0.4)]);
  }
  sky.add(stars(band, 1.4));
  const bandTex = cloudTex(250, 17);
  for(let i = 0; i < 12; i++){
    const p = onSky(i/12*Math.PI*2 + r01()*0.2, (r01() - 0.5)*0.1, 250).applyEuler(tilt);
    const s = new THREE.Sprite(new THREE.SpriteMaterial(unlit({map:bandTex, color:[0x8a7ad8, 0x6a8ad8, 0xb08ad0][i % 3], opacity:0.32, blending:THREE.AdditiveBlending})));
    s.position.copy(p); s.scale.setScalar(110 + r01()*50); s.material.rotation = r01()*6; s.renderOrder = -1; sky.add(s);
  }

  /* nebulae: clouds of colour above and below (the top view looks down into the lower sky) */
  [[275, 0.6, 0.35, 41], [180, 2.3, 0.2, 53], [330, 3.9, 0.45, 67], [220, 5.2, 0.12, 79], [260, 1.4, -0.55, 83], [200, 3.0, -0.8, 89], [310, 4.6, -0.4, 97]].forEach(([h, a, e, seed]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial(unlit({map:cloudTex(h, seed), opacity:0.55, blending:THREE.AdditiveBlending})));
    s.position.copy(onSky(a, e, 255)); s.scale.setScalar(e < 0 ? 190 : 150); s.material.rotation = a; s.renderOrder = -1; sky.add(s);
  });

  /* the moon, where the moonlight comes from (engine.js puts the light at (-22, 40, 18)), with a halo */
  const md = new V3(-22, 40, 18).normalize();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial(unlit({map:dotTex, color:0x9fb4ff, opacity:0.35, blending:THREE.AdditiveBlending})));
  halo.position.copy(md).multiplyScalar(240); halo.scale.setScalar(70); sky.add(halo);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial(unlit({map:moonTex, opacity:1})));
  moon.position.copy(md).multiplyScalar(235); moon.scale.setScalar(16); moon.renderOrder = 0; sky.add(moon);

  /* far-off islands: dark silhouettes floating round the horizon (the fog turns them to shapes against the glow) */
  const rockM = mat(0x1a1f2c), topM = mat(0x22302a);
  for(let i = 0; i < 16; i++){
    const a = i/16*Math.PI*2 + r01()*0.3, R = 160 + r01()*40, y = -24 + r01()*18, s = 2.5 + r01()*3.5;
    const g = new THREE.Group(); g.position.set(Math.cos(a)*R, y, Math.sin(a)*R); g.rotation.y = r01()*6;
    const top = mesh(new THREE.CylinderGeometry(1, 0.9, 0.35, 9), topM); top.scale.set(s, s, s*(0.8 + r01()*0.4)); g.add(top);
    const under = mesh(new THREE.ConeGeometry(0.95, 2.4, 9), rockM, 0, -1.35*s, 0); under.rotation.x = Math.PI; under.scale.set(s, s, s); g.add(under);
    if(r01() < 0.6) for(let k = 0; k < 3; k++){ const t = mesh(new THREE.ConeGeometry(0.22*s, 0.9*s, 6), topM, (r01() - 0.5)*s, 0.6*s, (r01() - 0.5)*s); g.add(t); }
    g.traverse(o => { o.castShadow = false; o.receiveShadow = false; o.raycast = () => {}; });
    sky.add(g);
  }

  /* shooting stars: one streak at a time, now and then */
  const streakPos = new Float32Array(6), streakG = new THREE.BufferGeometry(); streakG.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakM = new THREE.LineBasicMaterial(unlit({color:0xe8eeff, opacity:0, blending:THREE.AdditiveBlending}));
  const streak = new THREE.Line(streakG, streakM); streak.frustumCulled = false; sky.add(streak);
  let next = 3, from = new V3(), dir = new V3();
  animated.push({fn:t => {
    twinkle.forEach((m, k) => { m.opacity = 0.55 + Math.sin(t*(1.3 + k*0.7) + k*2.1)*0.35; });
    halo.material.opacity = 0.32 + Math.sin(t*0.4)*0.04;
    if(t > next){ from.copy(onSky(r01()*Math.PI*2, 0.35 + r01()*0.6, 230)); dir.set(r01() - 0.5, -0.35 - r01()*0.3, r01() - 0.5).normalize(); next = t + 4 + r01()*7; streak.userData.t0 = t; }
    const u = (t - (streak.userData.t0 ?? -9))/0.9;
    if(u >= 0 && u <= 1){
      const head = from.clone().addScaledVector(dir, u*70), tail = from.clone().addScaledVector(dir, Math.max(0, u*70 - 18));
      streakPos.set([head.x, head.y, head.z, tail.x, tail.y, tail.z]); streakG.attributes.position.needsUpdate = true;
      streakM.opacity = Math.sin(u*Math.PI)*0.9;
    } else streakM.opacity = 0;
  }});
  return sky;
}
