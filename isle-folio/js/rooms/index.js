/* Room registry. Rooms are built lazily the first time they are entered. */
import { scene } from '../engine.js';
import { ISLANDS } from '../world/islands.js';
import home from './home.js';
import journey from './journey.js';
import projects from './projects.js';
import skills from './skills.js';
import writing from './writing.js';
import teaching from './teaching.js';
import contact from './contact.js';

const BUILD = {home, journey, projects, skills, writing, teaching, contact};

const rooms = {};
export function getRoom(id){
  if(rooms[id]) return rooms[id];
  const r = BUILD[id]();
  r.id = id; r.focus = r.start || 0;
  r.group.position.set(4000 + ISLANDS.findIndex(i => i.id === id)*900, 0, 0);
  r.group.visible = false; scene.add(r.group);
  r.items.forEach((it, k) => it.setFocus(k === r.focus));
  r.onFocus && r.onFocus(r.focus, true);
  return rooms[id] = r;
}
