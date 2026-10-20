# Isle Folio

A walkable 3D portfolio. Seven floating islands, each with a building you can step inside; all content is laid out in 3D inside those rooms.

No build step: plain ES modules + Three.js r128 from a CDN.

## Run

`data.json` is loaded with `fetch`, so the folder must be served over HTTP (opening `index.html` as a file won't work):

```bash
python3 -m http.server 8123
```

Then open <http://localhost:8123>.

## Edit content

Everything you'd want to change lives in **`data.json`** (profile, experience, projects, skills, writing, workshops, talks, contact). Rooms read it at startup and lay themselves out from it.

The résumé link points to `resume/Ankush_Sonawane_Resume.pdf`, so put the PDF there.

Every list in `data.json` can grow or shrink — rooms size themselves to the content. Optional links (`linkedin`, `medium`, a project's `link`, …) can be left empty or removed and their buttons simply don't appear.

**Preview a draft** without touching the real file: save it next to `data.json` (e.g. `draft.json`) and open `/?data=draft.json`.

**Link straight into a room:** `/?room=projects` (ids: `home`, `journey`, `projects`, `skills`, `writing`, `teaching`, `contact`).

## Adding a new section (a new island)

Items are data; a whole new *kind* of section needs a little code:

1. Add the content to `data.json` (e.g. `"openSource": [...]`).
2. Create `js/rooms/<id>.js` exporting a default `build()` that returns a room (copy the smallest existing room as a template; the contract is documented at the top of `rooms/kit.js`).
3. Register it in `js/rooms/index.js`.
4. Add an island to `ISLANDS` in `js/world/islands.js` (pick an open `x, z`, size `R`, building footprint `obs`) and connect it with an entry in `BRIDGES`; optionally add its outside building in `js/world/landmarks.js`. Terrain, paths, bridges, walking and auto-travel all pick it up automatically. Keys 1–9 travel to the first nine islands.

## Layout

```
index.html            page shell
data.json             all portfolio content
css/style.css         the few 2D bits: back button, hint bar, fade, fallback
js/
  main.js             entry: load data → plain-text mirror → fonts → 3D
  data.js             loads data.json, exports DATA
  content.js          plain-HTML copy of the content (screen readers + no-WebGL fallback)
  engine.js           renderer, scene, lights, mesh/material helpers, seeded random
  panels.js           canvas-drawn text panels (every readable thing in 3D)
  app.js              state, input (keys, pointer, wheel, pinch), camera, transitions, render loop
  world/
    islands.js        island names, positions, sizes, colours, and which islands bridges connect
    terrain.js        island shapes (noise coastline, hills, paths, underside), bridges, walkable-ground checks
    player.js         walking, follow camera, joystick, auto-travel over bridges
    props.js          trees, rocks, lanterns, gates, anvils, star fields
    landmarks.js      each island's building, seen from outside
    hero.js           the wizard
    build.js          assembles islands, paths, effects, floating labels
  rooms/
    kit.js            room/item helpers (view framing, focusable items, floors, walls)
    index.js          room registry, built lazily on first visit
    home.js           Hearthstone · intro, focus areas, stats
    journey.js        Oakreach · experience + education
    projects.js       Forgewell · project carousel
    skills.js         Runespire · skill rings
    writing.js        Lorehall · articles as books
    teaching.js       Lyceum · workshops, talks, recognition
    contact.js        Beacon Point · contact links
```

## Controls

| | Outside | Inside a room |
|---|---|---|
| Move | W A S D / arrow keys (Shift to run) · joystick on phones | ← → (↑ ↓ in Runespire) / click / swipe |
| Look | drag | — |
| Go inside / open | walk up to a door, then E / Enter / the Enter button | Enter / click the focused thing |
| Travel | click an island's floating sign, or keys 1–7 (walks you there over the bridges) | — |
| Top view | M / Esc or the top-right button toggles it. Click anywhere on an island: the camera circles it while the wizard walks to its door; then E / Enter, the Enter button, or picking it again goes inside | — |
| Back | — | Esc / “← Leave” button (top view returns to the whole map) |
| Zoom | scroll, pinch, `+` `-` `0` | same |
