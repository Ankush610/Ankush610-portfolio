# Change log

Every change to the project, newest first. One entry per change set.

Format:

```
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
