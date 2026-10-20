# Change log

Every change to the project, newest first. One entry per change set.

Format:

```
## 2026-10-20 — Forgewell: front view, a proper U track, five carts, a wooden hanging board
- `js/rooms/projects.js`:
  - **Camera:** a near-level front view instead of looking down, on both wide screens and phones.
  - **Track:** a proper U. A semicircle (radius 5.6) in front of the forge, with parallel legs running straight back into the tunnel portals in the back wall (now at x = ±5.6).
  - **Carts:** five are out at a time (the focused one, one either side on the curve, one up each leg). The rest wait in the tunnels; spacing is `(MOUTH + 1.8)/3`, or wider for short project lists, so the loop's seam stays hidden.
  - **Board:** a wooden signboard. Five planks with a heavier top rail, iron bands showing on the wood margins, corner brackets and eye bolts, hung on link chains from the tie beam at z = -5. The painted card on it is dark stained wood with a faint grain. The board's bottom edge is fixed at y 3.75 and it grows upward, so the carts and the tunnel mouths show beneath it.
  - **Braziers:** they moved inside the U, either side of the furnace.
- Why: the looking-down view read as a top view, three carts felt sparse, the diagonal straights didn't read as a U, and the board was a flat dark slab.
- Checked: desktop (start, ←, the wrap from 01 to 11, max zoom-out), phone (375×812). No page errors.

## 2026-10-20 — Forgewell: a closed hall, and projects ride mine carts into tunnels in the back wall
- `js/rooms/projects.js`, the hall:
  - It's closed all round. The round back wall now runs the full half circle, straight side walls run forward to a front wall behind the camera, and the walls are taller (12) under a timber ceiling with rafters.
  - The plinth blocks, timber pilasters, bricks and wall plate continue round all of it, and the tie beams sit over the back half (further forward they would cross the camera's view).
  - The room sets `maxDist`, so zooming out stops inside the hall instead of showing the void.
- `js/rooms/projects.js`, the projects: the turntable (disc, glowing rim, rivets, hub gear) is gone. Projects ride mine carts:
  - The track has a ballast bed, timber sleepers and two-part rails. It curves round in front of the forge, then two straights run back and outward to arched tunnel portals cut into the back wall at |x| ≈ 8, clear of the hanging board.
  - Each portal is a black arched opening that carts vanish into, with a timber adit frame, a ring of wedge stones and a lantern either side.
  - Each cart is a tapered iron tub with coal, wheels that roll with the distance travelled, and the status gem on its front.
  - The carts are spaced round a loop that closes behind the wall, so the train always loops, out of one tunnel and in through the other. Spacing widens for small projects lists, so the loop's seam is always inside a tunnel. Any number of projects works.
- Props moved clear of the track: the tool racks and the right workbench (wall angle π ± 1.2), the anvil, the coal heap, the barrel, both braziers, the crates and ingots, and the bellows (now a spare by the left wall). The chimney runs up to the ceiling.
- Camera: wide screens look down a little, so the track, carts and portals read under the board. Phones keep the level view, because tilting pushed the tall board off the top of the screen.
- `js/app.js`: the zoom-out cap now measures the resting camera distance. It used to measure the current one, which is 1.35× further during the entry fly-in, and that permanently cut the zoom and framed rooms too tight.
- Why: the turntable read as a flat platter that didn't belong in a forge, and zooming out showed the hall's open front and the void.
- Checked: desktop (start, ← →, the wrap from 01 to 11, max zoom-out), phone (375×812). Runespire re-checked after the zoom-cap fix. No page errors.

## 2026-10-20 — Runespire: masonry, voussoir arches, more detail; the wizard faces the camera in rooms
- `js/rooms/skills.js`: the walls are coursed masonry over a dark mortar backing. Each course is split into the free spans between openings (niche arches, the door, the windows) and filled exactly in running bond, so blocks hug every edge. The niche and door arches are rings of wedge stones (voussoirs) round the keystone. There's a rune sigil in each niche above its stone, in the category colour and brighter on focus. The floor gets a slowly turning rune ring round the dais and a violet runner with gold edges and lozenges from the door to the dais. Crystal clusters sit at the column feet, as on the island outside, and a crystal lantern hangs on a chain under the gallery at every corner. The focused keystone is toned down so it keeps its colour.
- All of it is laid out per wall or per corner and instanced, so it scales with the number of categories. Measured: 7 categories, 65 draw calls and 27k triangles on a phone. 14 categories (a 15-sided tower), 112 draw calls and 38k triangles. 165 fps.
- `js/app.js`: inside rooms the wizard turns to face the camera instead of a fixed angle (0.2 rad, towards +z). That angle only worked while every room's camera looked from +z; Runespire's camera turns round the room, so he showed his back.
- Checked: desktop (stones, max zoom-out, Forgewell for the wizard change), phone, 14-category stress data. No page errors.

## 2026-10-20 — Runespire interior rebuilt to match the tower's exterior
- `js/rooms/skills.js`: the open-air circle is now the octagonal tower seen from inside, in the exterior's language and palette. The stepped plinth becomes a gold-trimmed dais. There are flagstone courses with staggered joints, ashlar walls, corner columns with bases and capitals, and string courses. Every wall has the exterior's glowing rune slits (a triple lancet above the niche and a pair in the upper chamber). The arched door has a violet keystone and iron straps. The balcony becomes a corbelled gallery with gold posts and rail, and the steep blue roof has ribs meeting at a boss, with the finial crystal hanging as a lamp. Columns carry cold-fire sconces, and there are rock shards drifting under the roof and two arcane bands with four orbiting crystals round the dais crystal.
- Each runestone stands in an arched niche (recess, jambs on plinths, imposts, arch ring). The niche's keystone glows in the category colour and brightens on focus.
- The tower has one wall per stone plus the door's (8 sides for 7 categories, more if there are more categories). The start stone faces the door. Niches and the gallery height follow each stone's height.
- `js/app.js`, `js/rooms/kit.js`: new optional room field `maxDist` caps how far zoom-out pulls the camera back. Runespire sets it so zoom-out stops short of the far wall; before, max zoom-out pushed the camera behind the door and the screen went black.
- Glowing parts use a dark base with emissive colour, so keystones and slits keep their hue under the room lights instead of clipping to white. Instanced meshes in the room don't frustum-cull: r128 culls them by the base geometry's bounding sphere at the room centre.
- Why: the interior should read as the inside of the building you just walked into.
- Checked: desktop (start stone, → through the stones, max zoom-out), phone (375×812), stress data (14 categories, one 30-skill category). 74 draw calls and about 18k triangles for the whole room. No page errors.

## 2026-10-20 — Runespire rebuilt as a runestone circle
- `js/rooms/skills.js` rewritten (409 → 155 lines). The room is now the crown of the spire, open to the night sky: seven rough-hewn standing stones in a ring (one per skill category, plus "Other" if any skill's category is undefined), each with its skills carved into a chiselled recess on its face. The camera stands inside the ring and turns from stone to stone (← →, click, swipe). The focused stone's carving, its ley line from the dais and a glow at its foot light up in the category colour; the crystal over the dais takes that colour too. Dressing: smaller filler menhirs between the stones, rocks, grass, stars, a moon, drifting motes.
- Removed: the orbiting skill rings, the arcane-glass pane, the legend column, tile hover and the whole tower interior.
- `js/app.js`, `js/rooms/kit.js`: dropped the `vertical` browse mode (↑ ↓). Runespire was the only room using it.
- Why: the old interior read as a web panel floating in a tower. The unfocused rings poked out around the pane, the pillar and white rings cut through it, and everything glowed the same blue.
- Scales with the data: the ring radius grows with the number of categories, a stone's height grows with its skill rows, category titles wrap onto two lines, and skill names too long at 14px wrap onto two lines.
- Checked: desktop (start stone, → to the next stone, zoomed out, clicking a neighbouring stone) and phone (375×812). Stress-tested with throwaway data: 14 categories, one category of 30 skills with a long title, very long skill names, an undefined category, and only 2 categories. Also checked at 1400×500 and 768×1024. No page errors.

## 2026-10-20 — Runespire: curved arcane-glass pane instead of the flat slab
- `js/rooms/skills.js`: the dark rectangle behind the focused skills is now `glassPane()`, a pane bent gently like the tower wall (its edges sag back by 4% of its width) with a shallow arched top, soft eroded edges, a glowing double frame tinted with the ring's colour, rune diamonds at the corners and the arch peak, faint specks and drifting sparks. Its canvases are redrawn only when the pane's size changes. The camera view and the parting of the other rings include the arch and margin; phones get a slightly smaller side margin so the skills stay large.
- The wall rune slits are a soft blue glow instead of washing out to white.
- Why: the flat, square-cornered slab read as an app panel inside a round tower.
- Checked: desktop and phone, two rings each, no page errors.

## 2026-10-20 — Two phone fixes: Lyceum easel peek, Runespire title overlap
- `js/rooms/teaching.js`: in portrait, the workshop easels are only shown while one of them is focused, so a half-cut easel no longer peeks in beside the chalkboard and trophies.
- `js/rooms/skills.js`: the legend starts in place on the first frame instead of sliding up from the floor, and the focused ring's title fades in only once the legend has nearly arrived, so the moving legend never crosses it (it did for about half a second on every ring change).
- Why: both read as layout bugs on phones.
- Checked on a phone (390×844, touch): Runespire on entry and through a ring change, frame by frame; Lyceum stepped through trophy, easel, easel, trophy; desktop views of both rooms unchanged; no page errors.

## 2026-10-20 — Richer room interiors (all seven rooms)
- One pass per room in `js/rooms/<id>.js`. Each room only gained set dressing and architecture; items, views, heroSpot, light and DATA reads are unchanged.
  - **Hearthstone** (`home.js`): instanced flagstone floor and ashlar walls, timber wainscot and roof beams, an iron candle wheel, swaying banners, sconces, braziers with sparks, corner bookcases, a woven hearth rug.
  - **Oakreach** (`journey.js`): plank floor with a runner rug, a taller carved back wall with gable trusses and a journey map, full-height posts with roots and a leafy canopy, arched windows with candles, a waypost, a travel chest, a milestone, a spinning globe, fireflies. Set dressing is baked into one mesh per material, so the room now has fewer meshes than before.
  - **Forgewell** (`projects.js`): forge hall detail: tool racks, chains and hooks, ingot crates, bellows, a grindstone, workbenches, embers.
  - **Runespire** (`skills.js`): rune-carved stone, floating crystals, arcane floor circles, star charts, cool braziers, orbiting motes.
  - **Lorehall** (`writing.js`): varied shelves and books, ladders, a reading table and chair, scrolls, a globe, candles.
  - **Lyceum** (`teaching.js`): tiered seating, columns, a laurel crest and garlands, a lectern, trophy plinths, banners.
  - **Beacon Point** (`contact.js`): lantern-room lens, spiral stair, bunting, life rings, a ship wheel, a telescope, crates, a compass rose.
- No new lights or network textures; repeated props are instanced or merged; animations are skipped under reduced motion.
- Why: the interiors felt bare next to the outside world.
- Checked: every room on desktop (1280×720) and phone (390×844, touch), default view and one step, with no page errors. Two quirks seen on phones were already on `main` and are unchanged: Lyceum's first view crops the left workshop card, and Runespire's ring title overlaps the legend while it unfolds.

## 2026-10-20 — Navigation UI styled like the island signs
- `js/app.js`: island cards now show a snapshot of their island, rendered once at load (`snapIslands()`: each island framed from its door side into a 128px scissored viewport, copied to a canvas; hero, labels and door ring hidden, fog pushed back). Card text matches the floating signs: mono uppercase `03 · PROJECTS`, serif island name, and `▸ TAP TO GO INSIDE` in ember on the centred card.
- `css/style.css`: cards, the Gateway/Leave buttons and the hint bar use the sign panel (`--sign`, 2px border, 14px radius, serif button text); the centred card gets the ember border and glow the 3D focus uses.
- `js/world/build.js`: the touch prompt on a sign reads "tap the card to go inside".
- Why: the plain pills and cards didn't look like the world they sit on.
- Checked on a phone (390×844, touch): swipe, tap, enter, leave all work; the snapshots render; desktop walk view unchanged.

## 2026-10-20 — Touch screens: island card strip instead of walking
- `js/app.js`: on `(pointer: coarse)` the world starts and stays in top view (no mode button, no hint bar, no Enter pill). A `#isles` strip of cards, one per island (section, island name, colour), sits at the bottom. Scrolling it centres a card and the camera circles that island with the wizard placed at its door; tapping the centred card, or the island itself, goes inside. Leaving a room re-centres that island's card. The touch tour aims a little low so the island sits above the cards.
- `js/world/player.js`, `index.html`, `css/style.css`: removed the joystick; added the card strip styles.
- README controls, decisions, plan updated; closes #11.
- Why: walking with a joystick was fiddly on phones, and the portrait top view cut off two islands.
- Checked in headless Chromium as a phone (390×844, touch): swipe → camera follows, tap off-centre card → centres, tap centred card → room, Leave → same card; tablet (1024×768, touch) and desktop walk/top view unchanged.

## 2026-10-20 — Shared-content cleanup after the gateway
- Run from the repo root now (`python3 -m http.server 8080`, open `/isle-folio/`); README, CLAUDE.md and the load-error message say so. One root `.claude/launch.json` replaces the per-folder ones, which served the subfolder and broke `../shared/`.
- `js/content.js`: plain-text mirror skips empty contact links (closes #3).
- `js/app.js`, `index.html`: travel-key range derived from `ISLANDS.length` (closes #4).
- Closed #1 (résumé in `shared/resume/`) and #2 (now in git).
- Why: the move to `shared/` left the run instructions and docs pointing at old paths.

## YYYY-MM-DD — short title
- what changed (files)
- why
- issue # closed, if any
```

---

## 2026-10-20 — everything moved into isle-folio/
- Moved `CLAUDE.md` and `docs/` from `timepass/` into `isle-folio/`, so the app folder is now the project root. Updated the paths in `CLAUDE.md`, `plan.md` and `issues.md`.
- Kept one `.claude/launch.json` (port 8123) and deleted the second one.
- Deleted the stale `Isle Folio.html` (it's in the system trash).
- Why: one self-contained folder, with no duplicate or stale files.
- Closes #5, #6.

## 2026-10-20 — Buildings face the centre island
- Every building used to face +z, so you often arrived at a building's side or back. Each door now faces Hearthstone (0,0); Hearthstone keeps +z.
- Core:
  - `js/world/islands.js` adds `isl.face` (yaw) and `isl.rot(x, z)`, which converts the building frame (door at +z) to the island-local frame.
  - `build.js` turns the landmark and the door position.
  - `terrain.js` turns the door path.
  - `player.js` makes the auto-walk end at the turned door.
  - `app.js` turns the dive camera, the leave-room facing, the start spawn, `?room=` and `?at=`.
- Per-island scenery, done by three subagents in parallel:
  - `isles/journey.js`: the oak, garden, well, mailbox and milestone searches now shift by `face`.
  - `isles/skills.js`: the floating shards' skipped front arc follows the door.
  - `isles/contact.js`: the mailbox turned with the door path, and a stale bench comment was fixed.
  - `projects.js`, `writing.js` and `teaching.js` needed no change; their props already avoid paths or face the centre.
- Result: the bridge from Hearthstone now lands on the front door of Oakreach, Lorehall, Beacon Point and Lyceum. Forgewell and Runespire have no bridge to the centre, but their doors still face it.
- Checked: the top-view map; `?at=<id>` for all six islands shows the front door; auto-walk Hearthstone → Runespire (two bridges) reaches the turned door; no console errors.

## 2026-10-20 — Top view: entering needs a second press
- `isle-folio/js/app.js`: the wizard no longer walks in by himself when he reaches the door. The camera keeps circling the island until you choose to go in: E / Enter, the "Enter <island>" button (now shown in top view once he's at the toured island's door), or picking the same island again.
  - Picking the island he's already standing at starts the tour instead of entering.
  - In top view, E only enters the island being toured.
  - The hint bar shows `E go inside` once he has arrived.
- Why: the user asked for it. Choosing an island should show it off first, and entering should be a separate choice.
- Checked in the browser: clicked Lorehall, waited 10s (circling, not entered, button shown), E → room. Left, clicked Lorehall again → circling, clicked again → room.

## 2026-10-20 — Two camera modes: walk and top view
- `isle-folio/js/app.js`: the old map (`overview`) is now **top view** mode (`top`), toggled with M / Esc or a new top-right button.
  - The map camera is closer, (0,50,48) instead of (0,66,58), centred a little south so all seven islands fit. In top view the camera can zoom in but never out past this framing (zoom range 0.5–1).
  - Click or tap anywhere on an island (its terrain group, not just the sign or building). The camera flies to that island and circles it (`tour`, `tourA`) while the wizard auto-walks there. When he reaches the door he goes inside.
  - Leaving a room while in top view returns to the whole map.
  - Fog scales with the portrait pull-back in top view, so phones don't get the dim, fogged-out map.
- `isle-folio/index.html`: added `#modeBtn` and updated the canvas aria-label. `css/style.css`: `.back.mode` puts the button on the right.
- `isle-folio/README.md`: updated the controls table.
- Why: the map zoomed out too far into the fog, touch users couldn't open it at all, and picking an island should show it off and take you inside.
- Checked in the browser: desktop map framing, tour → walk → auto-enter (Forgewell), leave → map, zoom-out cap, M back to walk mode, and on a phone (375×812) the map plus a tour of Lyceum.

## 2026-10-20 — Wizard (hero) clipping fixes
- `isle-folio/js/world/hero.js`:
  - Beard: flattened and tilted out along the robe's slope so it lies over the collar and chest. Before, only a stub showed above the collar.
  - Cape: the walk swing sign was inverted and pushed the cape forward into the robe. It now swings back. The cape is wider than the belt and its edges sit further back, so the swinging arms pass in front of it.
  - Arms: shoulders moved out and splayed (left 0.5, right 0.58 rad), so sleeves and cuffs no longer sink into the robe.
  - Staff: held upright on the outside of the hand and tapered toward the foot, so it clears the robe hem. The hat brim is 0.6 → 0.55 so the staff no longer pierces it.
  - Robe stars: placed on the robe surface computed from the shared `ROBE_PROFILE`. Before, they used hand-typed coordinates and some were buried.
- Why: the model clipped into itself when idle and walking.
- Checked: turntable renders at 0/90/180°, top-down, low angle, and walk/run poses, plus a look in-game.

## 2026-10-20 — Project docs set up
- Added `docs/plans/plan.md`, `docs/plans/issues.md`, `docs/plans/decisions.md`, `docs/logs/logs.md`, and `CLAUDE.md` at the repo root.
- Why: to track the plan, known issues and every change from here on.
