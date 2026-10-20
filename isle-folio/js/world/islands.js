/* Archipelago layout. Content lives in data.json; this is only where things sit in the world.
   x,z: island centre · h: ground height · R: rough radius · obs: building footprint radius (collision + plateau)
   hill: how lumpy the land is · top: grass colour · lh: label height above ground · seed: terrain noise
   plaza?: pave the ground round the building · beach?: a sandy rim (coastal) · flora?: the island's tree (props.js): maple, oak, umbrella, wisteria, windswept, cypress, spruce; pine if unset */
import { V3 } from '../engine.js';

export const ISLANDS = [
  {id:'home',     name:'Hearthstone',  sub:'Start here', x:0,   z:0,   h:0,    R:10.5, obs:2.4, hill:1.4, top:0x4b7445, lh:8.6, seed:1, flora:'maple'},
  {id:'journey',  name:'Oakreach',     sub:'Journey',    x:-15, z:-22, h:1.4,  R:8.5,  obs:2.6, hill:2.2, top:0x5d8746, lh:6.0, seed:2, flora:'oak'},
  {id:'projects', name:'Forgewell',    sub:'Projects',   x:14,  z:-23, h:0.6,  R:9,    obs:3.1, hill:1.8, top:0x7a6a3c, lh:7.0, seed:3, flora:'umbrella'},
  {id:'writing',  name:'Lorehall',     sub:'Writing',    x:28,  z:-2,  h:2.2,  R:8.5,  obs:2.9, hill:1.6, top:0x6b5a7a, lh:7.0, seed:4, flora:'wisteria'},
  {id:'contact',  name:'Beacon Point', sub:'Contact',    x:17,  z:23,  h:-0.8, R:8,    obs:1.9, hill:2.0, top:0x456f69, lh:9.0, seed:5, flora:'windswept', beach:true},
  {id:'teaching', name:'Lyceum',       sub:'Teaching',   x:-17, z:21,  h:0.3,  R:9,    obs:3.6, hill:1.5, top:0x6f8448, lh:7.0, seed:6, plaza:true, flora:'cypress'},
  {id:'skills',   name:'Runespire',    sub:'Skills',     x:-29, z:0,   h:1.8,  R:8.5,  obs:2.1, hill:2.4, top:0x58636e, lh:10.4, seed:7, flora:'spruce'}
];
// walkable bridges: every island hangs off the centre one (hub and spoke), none join each other
export const BRIDGES = ISLANDS.filter(i => i.id !== 'home').map(i => ['home', i.id]);

ISLANDS.forEach(i => {
  i.pos = new V3(i.x, i.h, i.z);
  // every building is modelled with its door facing +z; turn it so the door faces the centre island (home keeps +z)
  i.face = i.x || i.z ? Math.atan2(-i.x, -i.z) : 0;
  const c = Math.cos(i.face), s = Math.sin(i.face);
  i.rot = (x, z) => [x*c + z*s, -x*s + z*c];   // building frame (door at +z) → island-local frame, same turn as rotation.y = face
});
export const byId = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
export const home = byId.home;
