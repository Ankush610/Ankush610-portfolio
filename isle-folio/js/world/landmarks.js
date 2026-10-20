/* Registry of island buildings and scenery: one file per island in ./isles/. */
import * as home from './isles/home.js';
import * as journey from './isles/journey.js';
import * as projects from './isles/projects.js';
import * as writing from './isles/writing.js';
import * as teaching from './isles/teaching.js';
import * as skills from './isles/skills.js';
import * as contact from './isles/contact.js';

const ISLES = {home, journey, projects, writing, teaching, skills, contact};
export const animated = [];  // {fn(t)}
export const landmark = id => ISLES[id].building(animated);
export const decorate = (isl, grp) => ISLES[isl.id] && ISLES[isl.id].decorate(isl, grp, animated);
