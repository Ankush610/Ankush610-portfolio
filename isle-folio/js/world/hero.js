/* The little wizard who walks between islands. Faces +z.
   hero.userData.pose(t, moving, dt) animates him: walk bob, arm and cape swing, drooping hat tip, glowing staff. */
import { THREE, reduce, mat, mesh, glow, cyl } from '../engine.js';

export const HERO_SCALE = {world: 0.92, room: 0.8};

// robe silhouette as [radius, height] pairs, bottom to top
const ROBE_PROFILE = [[0.6, 0.02], [0.58, 0.14], [0.5, 0.5], [0.41, 0.88], [0.33, 1.18], [0.26, 1.36], [0.1, 1.44], [0, 1.45]];
const robeR = y => { const i = ROBE_PROFILE.findIndex(p => p[1] >= y), [r1, y1] = ROBE_PROFILE[i], [r0, y0] = ROBE_PROFILE[i - 1]; return r0 + (r1 - r0)*(y - y0)/(y1 - y0); };

const ROBE = 0x2b3f8f, ROBE_DARK = 0x22306e, TRIM = 0xd4a84a, SKIN = 0xeac3a0, BEARD = 0xeeeae2, HAT = 0x3a2b62, WOOD = 0x6b4a30, CAPE = 0x6a2f86;

export function makeHero(){
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);

  // boots peeking out under the hem
  [-0.17, 0.17].forEach(x => { const b = mesh(new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI*2, 0, Math.PI/2), mat(0x3a2a20), x, 0, 0.2); b.scale.set(1, 0.9, 1.5); body.add(b); });

  // robe: a flared lathe silhouette, gold hem trim, belt with buckle, a few embroidered stars
  const robe = mesh(new THREE.LatheGeometry(ROBE_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 12), mat(ROBE));
  body.add(robe);
  const hem = mesh(new THREE.TorusGeometry(0.585, 0.035, 5, 24), mat(TRIM, {metalness:0.4, roughness:0.5}), 0, 0.08, 0); hem.rotation.x = Math.PI/2; body.add(hem);
  const belt = mesh(new THREE.TorusGeometry(0.395, 0.045, 5, 20), mat(0x5a3d28), 0, 0.9, 0); belt.rotation.x = Math.PI/2; body.add(belt);
  body.add(mesh(new THREE.BoxGeometry(0.14, 0.12, 0.05), mat(TRIM, {metalness:0.5, roughness:0.4}), 0, 0.9, 0.42));
  const star = new THREE.OctahedronGeometry(0.045, 0), starM = glow(0xffd98a, 1.2);
  // [angle from the front, height]: sat on the robe surface so none sink into it
  [[0.5, 0.35], [-0.66, 0.55], [0.28, 0.66], [-0.16, 0.25], [1.06, 0.7]].forEach(([a, y]) => { const d = robeR(y) + 0.015; const s = mesh(star, starM, Math.sin(a)*d, y, Math.cos(a)*d); s.castShadow = false; body.add(s); });

  // cape hanging behind the shoulders (swings back when walking)
  const capePivot = new THREE.Group(); capePivot.position.set(0, 1.32, -0.08); body.add(capePivot);
  // wider than robe and belt all the way down, edges set back so the swinging arms pass in front of them
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.74, 1.28, 12, 1, true, Math.PI/2 + 0.45, Math.PI - 0.9), mat(CAPE, {side:THREE.DoubleSide}));
  cape.position.y = -0.62; cape.castShadow = true; capePivot.add(cape);
  const collar = mesh(new THREE.TorusGeometry(0.29, 0.065, 5, 16), mat(CAPE), 0, 1.36, 0); collar.rotation.x = Math.PI/2; body.add(collar);

  // arms: sleeve + cuff + hand, pivoting at the shoulder
  const arm = (side, splay) => {
    const pivot = new THREE.Group(); pivot.position.set(side*0.33, 1.24, 0.02); body.add(pivot);
    const sleeve = mesh(cyl(0.08, 0.15, 0.56, 8), mat(ROBE_DARK), 0, -0.27, 0); pivot.add(sleeve);
    const cuff = mesh(cyl(0.155, 0.155, 0.07, 8), mat(TRIM, {metalness:0.4, roughness:0.5}), 0, -0.53, 0); pivot.add(cuff);
    const hand = mesh(new THREE.SphereGeometry(0.075, 8, 6), mat(SKIN), 0, -0.6, 0.02); pivot.add(hand);
    pivot.rotation.z = side*splay;
    return pivot;
  };
  const armL = arm(-1, 0.5), armR = arm(1, 0.58);

  // staff in the right hand: gnarled shaft, a curl at the top cradling the glowing orb
  // held upright on the outside of the hand, so it clears the robe hem below and the hat brim above
  const staff = new THREE.Group(); staff.position.set(0.03, -0.6, 0.03); staff.rotation.z = -0.58; armR.add(staff);
  const shaft = mesh(cyl(0.05, 0.03, 2.0, 6), mat(WOOD), 0, 0.35, 0); staff.add(shaft);
  [-0.2, 0.55, 1.0].forEach(y => staff.add(mesh(cyl(0.055, 0.055, 0.06, 6), mat(0x4e3424), 0, y, 0)));
  const curl = mesh(new THREE.TorusGeometry(0.13, 0.03, 5, 12, Math.PI*1.4), mat(WOOD), 0, 1.45, 0); curl.rotation.z = -0.4; staff.add(curl);
  const orb = mesh(new THREE.SphereGeometry(0.12, 12, 8), glow(0x7fe3ff, 2.6).clone(), 0, 1.47, 0); orb.castShadow = false; staff.add(orb);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({color:0x7fe3ff, transparent:true, opacity:0.18, depthWrite:false, blending:THREE.AdditiveBlending}));
  halo.position.copy(orb.position); staff.add(halo);
  const ol = new THREE.PointLight(0x7fe3ff, 0.8, 6, 2); ol.position.copy(orb.position); staff.add(ol);   // the wizard's only light: keep it single

  // head: face, eyes, bushy brows, nose, long beard and moustache
  const head = new THREE.Group(); head.position.set(0, 1.62, 0.02); body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.27, 12, 9), mat(SKIN)));
  [-0.095, 0.095].forEach(x => {
    head.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), mat(0x1c1a24), x, 0.04, 0.245));
    const brow = mesh(new THREE.BoxGeometry(0.12, 0.035, 0.05), mat(BEARD), x, 0.11, 0.24); brow.rotation.z = -x*1.6; head.add(brow);
  });
  const nose = mesh(new THREE.ConeGeometry(0.05, 0.13, 6), mat(0xe0a98a), 0, -0.02, 0.28); nose.rotation.x = Math.PI/2; head.add(nose);
  // flattened, tip tilted out along the robe's slope so it lies over collar and chest instead of sinking into them
  const beard = mesh(new THREE.ConeGeometry(0.21, 0.55, 8), mat(BEARD), 0, -0.4, 0.31); beard.rotation.x = Math.PI - 0.35; beard.scale.z = 0.6; head.add(beard);
  [-1, 1].forEach(s => { const m = mesh(new THREE.ConeGeometry(0.05, 0.2, 5), mat(BEARD), s*0.09, -0.09, 0.25); m.rotation.z = s*(Math.PI/2 + 0.35); head.add(m); });

  // hat: wide brim, gold band with a star, and a three-part cone whose tip droops backwards
  const hat = new THREE.Group(); hat.position.set(0, 0.2, 0); hat.rotation.set(-0.06, 0, 0.05); head.add(hat);
  hat.add(mesh(cyl(0.55, 0.57, 0.05, 16), mat(HAT), 0, 0, 0));
  hat.add(mesh(cyl(0.3, 0.33, 0.11, 14), mat(TRIM, {metalness:0.4, roughness:0.5}), 0, 0.07, 0));
  const hatStar = mesh(new THREE.OctahedronGeometry(0.07, 0), glow(0xffd98a, 1.8), 0, 0.08, 0.32); hatStar.castShadow = false; hat.add(hatStar);
  const s1 = new THREE.Group(); s1.position.y = 0.1; hat.add(s1);
  s1.add(mesh(cyl(0.2, 0.3, 0.42, 12), mat(HAT), 0, 0.21, 0));
  const s2 = new THREE.Group(); s2.position.y = 0.42; s2.rotation.x = -0.4; s1.add(s2);
  s2.add(mesh(cyl(0.11, 0.2, 0.36, 10), mat(HAT), 0, 0.18, 0));
  const s3 = new THREE.Group(); s3.position.y = 0.36; s3.rotation.x = -0.75; s2.add(s3);
  s3.add(mesh(new THREE.ConeGeometry(0.11, 0.32, 10), mat(HAT), 0, 0.16, 0));
  const pom = mesh(new THREE.SphereGeometry(0.045, 6, 5), glow(0xffd98a, 1.6), 0, 0.33, 0); pom.castShadow = false; s3.add(pom);

  // the brim would shade the face into a grey blob under the moon: hat casts no shadow, face takes none
  hat.traverse(o => { o.castShadow = false; });
  head.traverse(o => { o.receiveShadow = false; });

  g.userData.body = body; g.userData.orb = orb;
  /* moving: 0 idle … 1 walking, 1.5 running */
  let swing = 0;
  g.userData.pose = (t, moving, dt = 0.016) => {
    swing += ((moving ? 1 : 0) - swing)*Math.min(1, dt*8);
    const w = t*(moving > 1 ? 15 : 12), still = reduce;
    body.position.y = still ? 0 : moving ? Math.abs(Math.sin(w))*0.16 : Math.sin(t*2)*0.035;
    armL.rotation.x = still ? 0 : Math.sin(w)*0.7*swing;
    armR.rotation.x = still ? 0 : -Math.sin(w)*0.25*swing - 0.1*swing;
    capePivot.rotation.x = still ? 0.05 : 0.08 + 0.35*swing + Math.sin(t*(moving ? 7 : 1.6))*(moving ? 0.05 : 0.03);
    s2.rotation.z = still ? 0 : Math.sin(t*1.7)*0.06 + Math.sin(w*0.5)*0.05*swing;
    s3.rotation.x = -0.75 - (still ? 0 : 0.15*swing + Math.sin(t*2.3)*0.04);
    head.rotation.y = still ? 0 : Math.sin(t*0.7)*0.08*(1 - swing);
    const glowI = still ? 2.4 : 2.2 + Math.sin(t*3)*0.6;
    orb.material.emissiveIntensity = glowI; halo.material.opacity = 0.12 + glowI*0.03;
  };
  g.scale.setScalar(HERO_SCALE.world);
  return g;
}
