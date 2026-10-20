/* Three.js setup and the tiny mesh helpers every module shares.
   THREE itself comes from the CDN <script> in index.html. */
export const THREE = window.THREE;
export const V3 = THREE.Vector3, ZN = new V3(0, 0, 1);
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const touch = matchMedia('(pointer: coarse)').matches;

export let renderer, scene, camera, hemi, moon, keyL, fillL, ANISO = 1;

/* Throws when WebGL is unavailable; main.js catches that and shows the plain-text fallback. */
export function initEngine(canvas){
  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1e);
  scene.fog = new THREE.Fog(0x0a0f1e, 70, 190);
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);

  hemi = new THREE.HemisphereLight(0x8fa3d8, 0x1d2a1a, 0.55); scene.add(hemi);
  moon = new THREE.DirectionalLight(0xcdd8ff, 1.05);
  moon.position.set(-22, 40, 18);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, {left:-46, right:46, top:46, bottom:-46, near:1, far:140});
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.bias = -0.0008;
  scene.add(moon);
  // two shared lights that move into whichever room is open (constant light count = no shader recompiles)
  keyL = new THREE.PointLight(0xffffff, 0, 30, 1.5); fillL = new THREE.PointLight(0xffffff, 0, 30, 1.5);
  scene.add(keyL, fillL);
}

const mats = {};
export function mat(color, opts){
  const key = color + JSON.stringify(opts||{});
  if(!mats[key]) mats[key] = new THREE.MeshStandardMaterial(Object.assign({color, flatShading:true, roughness:0.9, metalness:0}, opts||{}));
  return mats[key];
}
export function mesh(geo, m, x=0, y=0, z=0){ const o = new THREE.Mesh(geo, m); o.position.set(x,y,z); o.castShadow = true; o.receiveShadow = true; return o; }
export function glow(color, intensity=1.6){ return mat(color, {emissive:color, emissiveIntensity:intensity}); }
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (a, b, h, n=8) => new THREE.CylinderGeometry(a, b, h, n);

/* push a colour's saturation up (outdoor terrain and trees only; shared mat() materials stay as they are) */
const _hsl = {};
export function vivid(c, k = 1.4){ c.getHSL(_hsl); return c.setHSL(_hsl.h, Math.min(1, _hsl.s*k), _hsl.l); }

/* seeded random so the world looks the same every visit */
let seed = 7;
export function rnd(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
