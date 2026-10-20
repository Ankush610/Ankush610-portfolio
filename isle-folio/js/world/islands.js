/* Archipelago layout. Content lives in data.json; this is only where things sit in the world.
   x,z: island centre · h: ground height · R: rough radius · obs: building footprint radius (collision + plateau)
   hill: how lumpy the land is · top: grass colour · lh: label height above ground · seed: terrain noise */
import { V3 } from '../engine.js';

export const ISLANDS = [
  {id:'home',     name:'Hearthstone',  sub:'Start here', x:0,   z:0,   h:0,    R:10.5, obs:2.0, hill:1.4, top:0x4b7445, lh:7.0, seed:1},
  {id:'journey',  name:'Oakreach',     sub:'Journey',    x:-15, z:-22, h:1.4,  R:8.5,  obs:2.0, hill:2.2, top:0x5d8746, lh:5.6, seed:2},
  {id:'projects', name:'Forgewell',    sub:'Projects',   x:14,  z:-23, h:0.6,  R:9,    obs:2.7, hill:1.8, top:0x7a6a3c, lh:5.4, seed:3},
  {id:'writing',  name:'Lorehall',     sub:'Writing',    x:28,  z:-2,  h:2.2,  R:8.5,  obs:2.2, hill:1.6, top:0x6b5a7a, lh:5.8, seed:4},
  {id:'contact',  name:'Beacon Point', sub:'Contact',    x:17,  z:23,  h:-0.8, R:8,    obs:1.4, hill:2.0, top:0x456f69, lh:7.6, seed:5},
  {id:'teaching', name:'Lyceum',       sub:'Teaching',   x:-17, z:21,  h:0.3,  R:9,    obs:3.1, hill:1.5, top:0x7a7048, lh:4.8, seed:6},
  {id:'skills',   name:'Runespire',    sub:'Skills',     x:-29, z:0,   h:1.8,  R:8.5,  obs:1.5, hill:2.4, top:0x58636e, lh:7.6, seed:7}
];
// walkable rope bridges between islands
export const BRIDGES = [
  ['home', 'journey'], ['home', 'writing'], ['home', 'teaching'], ['home', 'contact'],
  ['journey', 'projects'], ['projects', 'writing'], ['writing', 'contact'], ['teaching', 'skills'], ['skills', 'journey']
];

ISLANDS.forEach(i => {
  i.pos = new V3(i.x, i.h, i.z);
  // every building is modelled with its door facing +z; turn it so the door faces the centre island (home keeps +z)
  i.face = i.x || i.z ? Math.atan2(-i.x, -i.z) : 0;
  const c = Math.cos(i.face), s = Math.sin(i.face);
  i.rot = (x, z) => [x*c + z*s, -x*s + z*c];   // building frame (door at +z) → island-local frame, same turn as rotation.y = face
});
export const byId = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
export const home = byId.home;
