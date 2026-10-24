# Change log

Every change to the project, newest first. One entry per change set.

Format:

```
## 2026-10-24 — Lyceum: no gaps, no clipping
- `js/world/isles/teaching.js`, gaps closed:
  - The gable fill under the main roof stopped 0.12 below the roof's underside, the whole length of the hall, leaving a slit you could see the sky through just under the raking cornice. It now runs from eave to eave right up under the roof.
  - The wing end gables stopped 0.06–0.12 short of their roofs. They're now cut to the roof's slope. The wing walls topped out 0.01 below the roof, so a solid attic now fills the space between the colonnade ceiling and the roof.
- Clipping removed:
  - The laurel and lamp in the pediment (r 0.34) were taller than the pediment and poked through the cornice. They're scaled to fit (r 0.2).
  - The gilt keystone ran into the plaque, so the plaque moved up 0.08.
  - The banners ran under the corner pilasters and their capitals, so they're narrower, shorter and moved in between them.
  - The dentils hung 0.11 in front of the frieze and 0.01 below the cornice. They now sit against both.
  - The rosettes overlapped the gilt line, so they're slightly smaller.
  - The lions' plinths overlapped the cheek walls, so they moved out to x 2.12.
  - The front lantern posts stood on the bottom step, so they moved off it.
  - Inside the colonnades, the end pilasters on the wings' back walls poked out through the end walls. They're narrower and moved inward.
  - On the new back, the wing pilasters ran into the windows and the centre block's rustication, so they're gone. The balustrade overhung the podium, so the back podium is now 0.15 deeper.
- Why: user saw a gap between the roof and wall and asked for every pass-through like it to be fixed.
- Checked in node with Three r128 raycasts: 71k horizontal rays through the centre block under its roof line went 1,140 straight through before and 0 now; the wings (front-to-back and end-to-end, 121k rays) are solid. Not checked visually (no WebGL in the preview pane).

## 2026-10-24 — Lyceum: a finished back
- `js/world/isles/teaching.js`: the hall was only dressed at the front; from behind it was a bare cream box. The centre block's face (corner pilasters, gilt line, tympanum with the lamp in its laurel, raking cornices, arch of voussoirs with gilt keystone, plaque, oculus, banners, rusticated base, dentils, rosettes, acroteria) is now built in one loop for both ends. At the back the arch is a tall lit window with iron tracery and a low marble balustrade instead of the open door; the door leaves, steps, lions and cheek walls stay front only.
- The wings' back walls get two lit arched windows each (the end-wall window, now a shared `arched()` helper), end pilasters, a base course, a cornice with a gilt line, and antefixes along the rear eave. Lantern posts flank the back window and two more cypresses stand behind the wings.
- Why: user noticed every other building has detail all round except the Lyceum.
- Checked: built the group in node with Three r128 (no WebGL in the preview pane): 347 meshes (was 234), no errors, everything new stays inside the 3.6 obstacle radius. Not checked visually.

## 2026-10-23 — Rooms: hold and drag to look around
- `js/app.js`: in a room, press and hold (300 ms) then drag, with the mouse or a finger, and the camera slides sideways and up/down, following the pointer (it moves the camera and what it looks at together, so the view slides rather than turns). Release and it eases back. Moving before the hold time is still a swipe (browse); a tap still opens. The slide is at most 0.3 × the view distance across, 0.2 × up/down, and never more than 1.5 units, so it can't reach the walls. A pinch cancels it.
- Room hint bar: "hold and drag to look" (touch), "Hold + drag look" (desktop).
- Why: user asked for a little left/right freedom while zoomed in.
- Checked with synthetic pointer events in the Lyceum (stubbed renderer): a quick swipe moved to the next exhibit; hold-and-drag slid the camera 0.71 units with the view direction unchanged and the exhibit unchanged; release brought it back.

## 2026-10-23 — data.json: one writing style
- `shared/data.json` (shared with `static-portfolio/`):
  - **Official names.** `SLURM` → `Slurm` (vLLM-Bench-App text and tags), `Torch`/`Torchvision` → `PyTorch`/`torchvision`, `CDAC` → `C-DAC` (education, achievements), `Bramhi` → `Brahmi` (the script). Names that are lowercase by their own projects stay so: `vLLM`, `llama.cpp`, `scikit-learn`, `uv`, `torchvision`.
  - **Title case for every title.** The talks were half sentence case ("Two-day AI/HPC training with hands-on labs"); they now match the projects, posts and awards ("Two-Day AI/HPC Training with Hands-On Labs"). `Hands-on` → `Hands-On` in titles; `SCI event` → `SCI Event`, `Tanzania cohort` → `Tanzania Cohort`.
  - **British spelling in prose**, as the file already had (programme, tumour): visualisation, recognised, digitising, fertiliser. Technical terms such as quantization are left as the field writes them.
  - "Data Science & Deep Learning Learning Guide" → "Data Science & Deep Learning Guide"; "in Streamlit UI" → "in a Streamlit UI".
- `static-portfolio/js/render.js`: the fallback company string `CDAC Pune` → `C-DAC Pune`.
- Why: user asked for one consistent writing style, with names in their official casing.
- Checked: the JSON parses; both sites load it; the plain-text mirror shows the new spellings and no `SLURM` or `CDAC` remain.

## 2026-10-23 — Runespire: stone carvings in EB Garamond
- `js/rooms/skills.js`: the skill names were in Figtree (a UI sans) and the count in JetBrains Mono, which read as an app screen rather than a carved runestone. Names are now EB Garamond semi-bold, a size up (25 / 20 px for one / two columns) because Garamond runs small; the count ("7 SKILLS") is letterspaced Garamond capitals (`caps()`, as in the Lyceum). The Young Serif category title stays. A name too long for its column wraps to two lines at the same size instead of shrinking.
- Why: user felt the stone text didn't match the room. Garamond is already loaded and used by the Lyceum, Lorehall and Oakreach, so it costs nothing.
- Checked: rendered all seven stone faces (2D canvas) and looked at them. Every name fits; "Computer Vision", "Open OnDemand" and "LoRA / QLoRA" wrap at full size.

## 2026-10-23 — Lyceum: exhibits no longer burn out to white
- `js/rooms/teaching.js`: the previous change made the key light whiter (more green and blue than the old amber) and tripled the ambient. On cream stone, key (1.2) + hemi (0.3) + moon (0.1) summed past 1, so the tablets, pilasters and floor clipped to near-white and lost their shading. The key is now 0.75 and the ambient 0.18/0.05, so a cream face peaks at about 0.85 of its colour. The key strength is one constant, `KEY`, because `update()` flickers the light round it every frame (it used to reset it to a hard-coded 1.2).
- Why: user screenshot (items washed out after the slate-wall change).
- Checked: the room builds and the key light flickers around 0.75. Not checked visually: the browser pane has no WebGL.

## 2026-10-23 — Lyceum: slate walls, softer light, readable focused tablets
- `js/rooms/teaching.js`: the walls, the stone, the key light and the fill light were all warm amber, so the whole hall (and the exhibits) read as one orange. The walls are now slate plaster (`0x56606c`, coursing a shade darker) behind the light stone trim, pilasters and dado. The key light is a softer warm white (`0xffd6a4`), the fill a paler amber (`0xffbc7a`, 0.8), and the cool sky ambient goes up from 0.1/0.04 to 0.3/0.1, so the shadows are moonlit instead of black-orange.
- `js/rooms/teaching.js`: focused tablets cut their letters in a deep burnished gilt (`#9a6a1c` → `#5c3a0c`) instead of bright gold leaf, which was hard to read on cream marble.
- Why: user screenshot (everything the same orange; the focused "2024" tablet hard to read).
- Checked: the room builds and the focused text is much darker. Not checked visually: the browser pane has no WebGL.

## 2026-10-23 — Lyceum: the camera stays inside the hall on laptops and phones
- `js/rooms/teaching.js`: `maxDist` capped the camera at 9.4 from the exhibit, which put it against the opposite wall, in among its sconces and header boards. Widescreen desktops frame an exhibit from about 7, so they never got there; 16:10 and 3:2 laptops, iPads and phones frame from 8–9.5, so they sat at the wall by default. The cap is now per exhibit: 2 short of the wall behind the camera. During the entry intro it was 40, so you could zoom out through the entrance wall; now it stops 1.5 short of it.
- `js/app.js`: entering a room, the fly-in start and the starting zoom respect `maxDist`. On small screens the fly-in used to start outside the walls. Applies to every room.
- Why: user report (laptop and mobile; not seen on a widescreen PC).
- Checked: computed the camera's furthest position for every exhibit at 16:9, 16:10, 3:2, 4:3 and phone portrait, fully zoomed out with mouse parallax. The camera stays within 3.65 of the hall's centre line (walls at 5.4, sconces at 4.55); the intro stops at z 6 (entrance wall at 7.5). On phones the default view sits 15% closer, and the exhibit still fits. Not checked visually: the browser pane has no WebGL.

## 2026-10-23 — Everything loads behind the loader: rooms pre-built, shaders pre-compiled
- `js/main.js`: after the world is built, every room is built too (they were built on first entry) and `renderer.compile()` compiles every shader, all while the loader is still up. Entering a room the first time no longer stutters.
- Why: user asked for the whole site to load first, then be used.
- Checked: with a stubbed renderer, boot runs with no errors, all rooms are built and the loader still fades. Not timed on a real GPU.

## 2026-10-23 — Performance: islands merged into a few meshes, no shadow redraws in rooms, adaptive resolution
- `js/world/build.js`: new `mergeStatic()` runs once after the world is built. Every still, opaque, untextured mesh on an island merges into one vertex-coloured mesh per material look (the building in `lmGroup` and the rest of the island separately, so picking and camera occlusion still see only the building). Meshes an animation moves stay separate (found by running `animated` at a few sample times); a material an animation changes keeps its own merged mesh, so glows and flicker still work.
  - Outdoors: 2,867 meshes → 449, shadow casters 2,486 → 194. Roughly 5,350 draw calls per frame → about 640 (main pass + shadow pass).
- `js/app.js`: inside a room, `renderer.shadowMap.autoUpdate` is off. Rooms sit far outside the moon's shadow box, so the islands' shadow map (all outdoor casters) was being redrawn every frame for nothing.
- `js/app.js`: if 90 frames average over 26 ms, the pixel ratio drops by 0.25 (never below 1). Still slow at 1×: the moon's shadow map halves to 1024 (once). For weak and integrated GPUs. Marked `ponytail:` (one-way). Checked with forced slow frames: 2× → 1× → shadows 1024, then it stops.
- `js/world/isles/skills.js`: the arcane circle's hexagram animation read `circ.children[2]`/`[3]` by index, which merging shifts. It now keeps references.
- Why: user asked for the major bottlenecks to be removed. Per-object draw calls were the big one.
- Checked: with a stubbed renderer, the world builds, no merged mesh is moved by any animation at later times, and every animated material is still on a live mesh. Not checked visually: the browser pane has no WebGL.

## 2026-10-21 — A full night sky: the islands float in space
- `js/world/sky.js` (new), built from `build.js` in place of the single 1,800-point star field:
  - **Dome.** A gradient sphere: deep navy overhead, a violet glow at the horizon, and a blue-violet space tone below. The top view looks down into the lower sky, so that half is no longer black.
  - **Stars, all round the sphere.** 5,200 faint, 520 brighter in tinted colours (white, pale blue, gold, red), and three groups of 120 that twinkle. All use a soft round sprite, so none are squares.
  - **Milky Way.** A tilted band of 7,000 small stars with twelve soft glowing clouds along it.
  - **Nebulae.** Seven procedural clouds (violet, teal, rose, blue), four above the horizon and three below.
  - **Moon.** A cratered moon with a halo, placed where the moonlight comes from.
  - **Shooting stars.** One streak every 4–11 s.
  - **Far islands.** Sixteen dark silhouettes of distant islands round the horizon.
  - Nothing in the sky takes light or fog. It has its own seeded random (the shared `rnd()` is untouched) and animates through `animated`, so it is still with reduced motion.
- Why: user feedback (more stars, a fuller and more detailed space background).
- Checked: walk view and top view. No console errors.

## 2026-10-21 — The outside world more saturated (not brighter; rooms unchanged)
- `js/engine.js`: `vivid(colour, k = 1.4)` raises a colour's saturation, keeping its lightness.
- `js/world/terrain.js`: every terrain colour (grass, earth, cliffs, underside, roots) goes through `vivid`.
- `js/world/props.js`: baked tree colours go through `vivid`.
- `js/app.js`:
  - Outdoors the night light keeps its original strength (hemisphere 0.55, moon 1.05) but is a little less blue (sky 0x9cabdc, ground 0x22301d, moon 0xd8e0ff), so it stops washing the colours out. It is applied at startup too.
  - Rooms restore the original cool sky colours and their own intensities, so interiors look as before.
  - A first pass also brightened the outdoor light; the user wanted saturation only, so the brightness went back.
- Shared `mat()` materials (buildings, props) are not recoloured, since rooms use them too.
- Why: user feedback (more saturated colours outside, not brighter).
- Checked: top view outdoors; the Lorehall room is unchanged. No console errors.

## 2026-10-21 — Floating islets: trees stay on their islets
- `js/world/build.js`: an islet's tree was added to the scene on its own, so it hung still while the islet bobbed and slowly turned beneath it, and drifted off. It is now a child of the islet mesh (local position), so it bobs and turns with it.
- Why: user report (a tree floating loose over an islet).

## 2026-10-21 — Island terrain: cliffs with strata, a rugged underside, hanging spires and roots
- `js/world/terrain.js` (`islandMesh`, used by every island and floating islet):
  - **Cliffs.** Below the rim there is now a grassy lip that overhangs a little, an earth band, and a cliff of rock strata stepping inward. The rings hang off the rim's real height and are jittered with coherent noise, so they read as ledges rather than fuzz. The strata are tinted toward each island's grass colour, so every island's cliffs differ.
  - **Underside.** The old smooth cone is a rugged mass, lumpier the deeper it goes, tapering to the keel. Extra rock spires (about 0.6 per unit of radius) hang beneath it, their bases buried in the rock.
  - **Roots.** Thin roots trail over the cliff edges and curl outward and down.
  - **Edges.** The pale beach band round every island is gone: the grass now browns toward the edge. Only coastal islands (`beach: true`, Beacon Point) keep a sandy rim.
  - It is all one mesh per island, as before. Walkable ground (`topY`) is unchanged: everything new is below and around the rim.
- `js/world/islands.js`: Beacon Point `beach: true`, and the field is documented.
- Why: user feedback (improve the island geometry for every island).
- Checked: walk-mode side views of Hearthstone and Lorehall, the archipelago from above. No console errors.

## 2026-10-21 — Trees: more detail, baked to one draw call each
- `js/world/props.js`:
  - **Baking.** Every tree is modelled from many small parts, then `bake()` merges all its non-glowing parts into one vertex-coloured mesh (glowing parts, like Runespire's crystals, stay their own mesh). Each tree costs one draw call however detailed it is, fewer than the 4–6 it used before.
  - **Shared parts.** A flared root base and tapering bole (`trunk()`) and visible branches (`branch()`). Crowns are built from more pieces and shaded darker underneath and lighter on top.
  - **Per species:** maples drop leaves round their feet; oaks have four limbs and a shaded under-canopy; umbrella pines have a forked crown in layers and cones on the ground; wisteria has a twisting trunk, sixteen long lilac racemes with pale tips and petals underfoot; windswept pines have pads streaming along the lean and roots gripping on the windward side; spruces have six drooping two-tone tiers and sometimes small rune crystals at the roots; some cypresses have twin tops.
- Why: user feedback (improve the trees further).
- Checked: top view, tours of Hearthstone, Lorehall, Oakreach and Forgewell. No console errors.

## 2026-10-21 — Every island grows its own tree
- `js/world/props.js`: six new trees beside the pine and cypress, each `(s, r = rnd)`:
  - `maple`: Hearthstone, an autumn crown in ember reds and golds.
  - `oak`: Oakreach, a short thick trunk with limbs under a wide low canopy.
  - `umbrella`: Forgewell, a stone pine with a tall bare forked trunk and a flat dark crown.
  - `wisteria`: Lorehall, a gnarled trunk hung with lilac blossom.
  - `windswept`: Beacon Point, a coastal pine bent by the sea wind; every one leans the same way.
  - `spruce`: Runespire, narrow and blue-black, some tipped with a glowing rune crystal.
- `js/world/islands.js`: each island names its tree in `flora`. Unset means pine, which the floating islets keep.
- `js/world/build.js`: the random scatter plants each island's own tree.
- Why: user feedback (a unique tree per island).
- Checked: top view of the archipelago, top-view tours of Lorehall, Beacon Point and Runespire. No console errors.

## 2026-10-21 — Lyceum: the amphitheatre outside becomes the Hall of the Lyceum, its island a formal garden
- `js/world/isles/teaching.js`: the outside now matches the new hall (and the user's concept image):
  - **Centre block (the nave).** A pale stone front on a podium, with a rusticated base course, coursing, corner pilasters, an entablature with a gilt line, gold rosettes and dentils, and a cornice. The pediment has a recessed tympanum carved with the lamp of learning in a gilded laurel (as at the hall's far end), raking cornices and gilt acroteria. The blue slate roof is coursed and topped by an open ridge cupola with a flame burning in it.
  - **Door and front.** A tall arched door of voussoirs with a gilt keystone, its leaves swung open on the warm-lit hall, a navy emblem plaque and a round leaded window above it, and navy banners either side.
  - **Clerestory.** The centre block is tall enough to show lit arched windows with pilaster strips above the wing roofs.
  - **Wings.** Two colonnades under blue slate (columns, navy banners between them, hanging lanterns, antefixes, gilt gable finials). Their back walls have lit doors and pilasters, and an arched lit window sits in each end wall. Planters run along the front.
  - **Steps.** Wide steps between cheek walls with urns, a guardian lion on a plinth either side, lanterns on posts and slim cypresses. No carved name: the emblem stands for it.
  - **Grounds.** A forecourt crescent (banner poles flanking the way in, cypresses, iron lanterns and scholars' busts), clipped box hedges round the sides and back, and a statue, scroll racks, benches and a few olives. Everything keeps clear of the circle the wizard walks.
- `js/world/islands.js`: Lyceum `obs` 3.1 → 3.6, `lh` 4.8 → 7.0, a sage lawn (`top` 0x6f8448), and the new optional fields `plaza: true` (paved court) and `flora: 'cypress'`.
- `js/world/build.js`, `js/world/props.js`: a `cypress()` prop (it takes a local random source, so decorations don't shift the shared `rnd()`). An island with `flora: 'cypress'` gets cypresses instead of pines in the random scatter.
- Why: user feedback (exterior built from the new interior; the island's look updated to match; more design detail).
- Checked: top-view tour (front, side, back), entering the hall. No console errors.

## 2026-10-21 — Lyceum: the amphitheatre becomes the Hall of the Lyceum (scales with the data)
- `js/rooms/teaching.js`, rewritten. The amphitheatre had one fixed place per kind of entry, paged when a list grew, and had nowhere for a new kind. It is now a long colonnaded stone hall under a timber roof:
  - **Sections from the data.** `KINDS` lists the kinds: talks & events (stone tablets), workshops (easels with printed sheets), awards (marble pedestals with a trophy, laurel, star or scroll and a gilt-lettered plaque), and extracurriculars (gilt frames; shown once `extracurricular` exists in data.json). A kind with no entries is skipped.
  - **It grows.** Each section has a carved header board (emblem and name in gold leaf, the count and years) and one bay per entry. Sections go to whichever wall is shorter, and the hall's length follows the data: nothing pages or hides. Checked with 30 talks, 6 workshops, 8 awards and 5 extracurriculars.
  - **Camera.** A look down the nave on entry, then each stop turns to face its exhibit (wider framing on desktop, one exhibit on a phone). Browsing goes down the left wall and back up the right.
  - **Displays like the other rooms.** Tablets have letters cut into marble (gilded when focused), sheets and frames are printed parchment, plaques have gilt letters on dark stone. Titles auto-fit, and there are no web cards.
  - **The hall.** Marble flagstones, a blue runner with gold borders and lozenges, pilasters, a cornice and timber trusses. Sconces hang under every header, with planters, benches and floor lanterns between sections. A lamp of learning in a gilded laurel sits at the far end, under an arched niche between two banners. It is closed all round, and zoom-out stops inside.
  - **Fewer lights, no clipping.** The header boards hang 0.36 out from the wall, clear of the pilasters (which used to cut through them). Wall sconces are one per ~5 units of a section (at least one), each on an iron arm from the wall. The floor lanterns are gone.
  - **Candlelight.** A dim sky light (the new per-room `light.ambient`), warm flickering key and fill lights that follow the focused stop, and amber lantern glows. The unlit exhibit faces are tinted to the candlelight so they don't glare.
- `js/app.js`, `js/rooms/kit.js`: a room may set `light.ambient: [hemi, moon]`. The default (0.35, 0.22) is unchanged for every other room.
- `js/content.js`: the plain-text mirror lists extracurriculars when data.json has them.
- `docs/plans/decisions.md`: why the hall layout, and how to add a kind.
- Why: user feedback (it must scale to more awards, extracurriculars, seminars and events; dimmer medieval candlelight).
- Checked: desktop entry view and stops (tablets, easels, pedestals), the scaled test data, phone (375×812) stops. No console errors.

## 2026-10-20 — Bridges: hub and spoke from the centre, rebuilt as weathered stone arches
- `js/world/islands.js`: `BRIDGES` is now generated so every island links only to the centre island (six spokes). The island-to-island bridges are gone, and travel between outer islands routes through the centre.
- `js/world/terrain.js`: the rope bridges are replaced by old stone arch bridges:
  - **Shape.** The deck rises to the middle (`rise`, up to 1.0) instead of sagging, on a rubble body that deepens toward the ends so they sink into the islands.
  - **Surface.** The deck is uneven flagstones split at random, some sunken, tilted or mossy, and the arch stones under both faces vary in depth.
  - **Parapets.** Laid stone by stone, with varied length and height, gaps where stones have fallen, and coping missing or askew. Moss sits on the tops and ivy trails over the outer faces.
  - **Ends and underside.** Broken rock hangs under the arch, and a rough, leaning pillar at each corner carries a lantern.
  - **Variation.** Every stone is sized, tilted and toned with `hash()`, so the bridges are irregular but stable across visits.
  - **Walking.** No beam crosses overhead (a first timber gateway version cut across the wizard at the doors). The walkable strip narrowed to 0.6 so the wizard stays inside the parapets, and the corner pillars are obstacles.
- `js/world/build.js`: the old lanterns beside each bridge end are gone (the pillars carry them). `js/world/props.js`: the now-unused `lantern()` is removed.
- `README.md`, `docs/plans/decisions.md`: updated for the hub-and-spoke layout.
- Why: user feedback (centre-focused bridges; a better, stone, weathered medieval bridge without clipping).
- Checked: top view of all six spokes, walking and auto-travel between outer islands via the centre, the bridge seen from a door and from the side. No console errors.

## 2026-10-20 — Oakreach: a closed Chronicle hall with printed pages, and a timber hall outside to match
- `js/rooms/journey.js`:
  - **Closed hall.** The hall had only a back wall and short end walls, so zooming out showed the void. The end walls, floor and planks now run to a front wall at z = 22 under a ceiling with joists, and the wainscot and chair rail turn the corners. `maxDist` keeps zoom-out inside. The added planks use the room's own PRNG so the shared `rnd()` sequence is untouched.
  - **Displays as print** (like the Lorehall's books):
    - **Role header:** a parchment page with a two-column layout (period in small caps, title, company in italics | description) and skills as an italic keyword line instead of pills.
    - **Education card:** the same treatment in a gilt slip.
    - **Highlight notes:** parchment leaves with a title, a red small-caps date, a fleuron and Garamond text that auto-fits (title on one line where it can, body 15.5 → 12px). Each is held by a red wax seal instead of a pushpin.
    - **Board:** the orange corkboard is now a dark oak panel in an oak frame with a lighter moulding and a gilt slip.
    - **Timeline year plaques:** carved wood with gilt numerals.
- `js/panels.js`: `gilt()` and `grain()` moved here from `rooms/contact.js` so Beacon Point and Oakreach share them.
- `js/world/isles/journey.js`: the cottage is now a timber-framed hall like the room it holds:
  - **Walls.** A stone footing laid in courses, a dark plank wainscot under an oak chair rail, plaster above, posts on oak plinths with carved bands, a top plate and knee braces.
  - **Roof and gables.** A shingled roof with its ridge along the hall and barge boards. Each gable has a truss (collar beam, king post, struts), a carved tree-ring medallion with a glowing heart, and a tall arched window (lit panes, mullion, transoms, keystone, sill), the same as the hall's end windows inside.
  - **Front.** An arched oak door in a moulded frame, shuttered windows with flower boxes, wall lanterns on the posts, and a porch with carved posts on stone pads and a hanging lantern.
  - **Around it.** Ivy up the front corner and a woodpile. A stone chimney climbs the right gable (at the user's request it replaced a plain box): a wide breast with sloped shoulders, a stack in coursed stone, a string course, a stepped cap and two clay pots that the smoke rises from.
  - The corner roots tried on the exterior were removed at the user's request.
- `js/world/islands.js`: Oakreach `obs` 2.0 → 2.6, `lh` 5.6 → 6.0.
- Why: user feedback (interior and exterior improved in the same way as the other islands).
- Checked: desktop interior resting view and zoom-out, exterior gable and front (top-view tour). No console errors.

## 2026-10-20 — Beacon Point: the lighthouse outside built from its lantern room's parts
- `js/world/isles/contact.js`:
  - **Tower.** Taller (to 5.55) and wider at the foot, on a two-step stone plinth laid in courses, with front steps. The red and white bands are now painted brick (one instanced mesh of courses laid round the openings), the outside of the watch room's whitewashed brick. Ten arched windows climb the tower, each with a lit pane, a mullion, a stone surround, a sill and a hood.
  - **Keeper's porch.** A gabled white porch with a red roof and a brass finial. It has a planked door with iron straps and a ring pull under a stone arch with a red keystone, quoined jambs, a threshold, and storm lanterns on brackets either side (as inside).
  - **Watch room.** Brass portholes with bolts, lit from within, on every face under a red frieze (the interior's portholes and frieze).
  - **Gallery.** Corbel brackets under a slate deck, and an iron railing of twenty posts with two rails.
  - **Lantern, as inside.** A red parapet with a brass cap rail; see-through glazing with mullions and two transoms; and inside it the lens, with five glowing prism rings, a bright core, a slowly turning brass cage and a soft halo.
  - **Roof.** A red dome with slate ribs (the rafters inside), a brass collar and vent ball, a lightning rod with compass arms, and the weather vane. The sweeping beams stay.
  - The lantern's halo sprite opts out of raycasts: the walk camera's occlusion raycast crashes on sprites (no `raycaster.camera`), which froze the render loop.
- `js/world/islands.js`: Beacon Point `obs` 1.4 → 1.9 (wider plinth), `lh` 7.6 → 9.0 (label clears the vane).
- Why: user feedback (exterior matched to the interior, as done for the other islands).
- Checked: desktop walk view at the door, top-view tour (back), entering the lantern room. No console errors after the fix.

## 2026-10-20 — Beacon Point: a closed watch room, displays made in the room's own materials
- `js/rooms/contact.js`:
  - **Closed room.** The lantern room was open at the front, so zooming out showed it floating in the void. The glazed lantern (mullions, transoms, parapet, rafters, roof) is now the back half only. A watch room runs forward to a front wall at z = 18, behind the phone's portrait camera, and `maxDist` (16.5) keeps zoom-out inside, like the other halls.
  - **The watch room** carries the tower's red and white bands inside: whitewashed brick over a red dado (battens, a mahogany rail), a red frieze between mouldings, a beamed ceiling and deck planks. Brass portholes with dark night glass line the walls, four more storm lanterns hang there, and there is a framed chart, a ship's clock and a barometer.
  - **Displays, no more web cards** (like the Lorehall's printed pages):
    - **Intro:** the keeper's log, a parchment chart with rhumb lines, a compass rose and a dashed course under Garamond text. It sits in a mahogany frame with brass corner plates on an easel, with gilt rules when focused.
    - **Email me:** a navy enamel plaque with a gilt rope border, the title in gold leaf and the address in cream, on a mahogany desk with turned legs, brass collars and a picture lamp. Its two buttons are carved wooden plates with gilt letters (green or red letters when the copy succeeds or fails).
    - **Links:** carved wooden nameplates with gilt letters (a gilt edge and a warmer board when focused) on a mahogany board on posts, under a carved header to match.
- Why: user feedback. The user also asked to drop the signal flags tried on the nameplates (they read as national flags) and to make the clickable plates wood rather than brass.
- Checked: desktop resting view, zoomed-out, focused nameplate; phone (375×812) resting and zoomed-out. No console errors.

## 2026-10-20 — Runespire: the slim spire outside becomes the rune tower it holds
- `js/world/isles/skills.js`: the tower now matches its interior (coursed masonry, round columns in every corner, triple rune slits below and paired slits under a rune diamond above, a planked door under a voussoir arch with a violet keystone, a gallery on two-tier corbels with gold posts and rail, crystal lanterns, cold-fire sconces, a ribbed blue cone roof):
  - **Shaft.** Three octagonal tiers over a battered footing, each faced in coursed blocks laid round the openings (one instanced mesh), with a round column (base and capital) in every corner. The lower tier has triple rune slits in stone frames on every face but the door's. A string course sets off the upper tier, whose faces have paired tall slits under a glowing rune diamond.
  - **Gallery.** Two-tier corbels under a projecting ledge, gold posts and a gold rail on every face, and a crystal lantern hanging under each corner.
  - **Top.** An upper chamber with paired slits, the eave, then a steep blue roof with gold ribs on its edges, four small dormers with glowing slits, a gold boss and spike, and the floating crystal finial.
  - **Door.** A gabled stone portal with a planked door (seams, iron straps, a gold ring pull) under a voussoir arch with the violet keystone, a threshold, a rune diamond over the portal, and cold-fire sconces (blue additive flames, as inside) either side.
  - The plinth is stepped with a glowing rune inlay, and crystal clusters grow at its corners. The arcane bands and orbiting crystals stay, resized to the new tower.
  - The rune-stone ring, arcane circle and crystal clusters on the island moved out to clear the wider footprint.
- `js/world/islands.js`: Runespire `obs` 1.5 → 2.1 (wider plinth), `lh` 7.6 → 10.4 (label clears the finial).
- Why: user feedback (richer architecture, closer to the interior, as done for the other islands).
- Checked: desktop front, side and zoomed-out views, entering the tower and leaving. No console errors.

## 2026-10-20 — Lorehall: the little temple outside becomes the library it holds
- `js/world/isles/writing.js`: the building now matches its interior (a tall hall of bookcases, a gilt picture rail, an upper storey of leaded arched windows between pilasters, a cornice):
  - **Hall.** A rusticated base laid in two courses of tinted blocks, a string course, then pilasters with bases and capitals and tall arched windows on the sides and back. The windows are lit warm, leaded (mullion and transoms), with moulded architraves, a keystone, a hood and a bracketed sill.
  - **Top.** An entablature over hall and portico: architrave, a frieze with gilt rosettes, dentils all round, the cornice. A balustrade runs round the roof with lamp-urns burning on the corner posts.
  - **Front.** A deeper portico of four columns (plinth, torus base, shaft, echinus, abacus). The pediment has a raking cornice, a recessed tympanum with a glowing open book and gilt rays, and acroteria. The great door has panelled plank leaves with ring pulls and a leaded glowing fanlight under a moulded arch with a gilt keystone, set in a small pedimented frame. Purple banners hang in the outer bays, and bronze lanterns on pedestals flank the steps.
  - **Rotunda.** A pedestal, a drum with lit windows ringed by twelve columns, a taller ribbed dome with gilt ribs, and a glowing lantern with a finial. The orbiting books and swirling pages stay, retuned to the new dome.
- `js/world/islands.js`: Lorehall `obs` 2.2 → 2.9 (bigger plinth), `lh` 5.8 → 7.0 (label clears the lantern).
- Why: user feedback (richer architecture, closer to the interior, as done for Hearthstone and Forgewell).
- Checked: desktop front and side views, entering the library and leaving. No console errors.

## 2026-10-20 — Forgewell: the smithy outside becomes the foundry hall it holds
- `js/world/isles/projects.js`: the small half-timbered smithy is now a brick foundry hall in the style of its interior (a hall with a curved back wall, stone plinth blocks, timber pilasters, protruding bricks, a wall-plate, a banded furnace chimney, and mine tunnels the carts run into):
  - **Shell.** A brick nave with a half-round apse behind, on a stone footing laid in two courses all round, timber pilasters, a sill rail and wall-plate, and scattered protruding bricks. The roof is a gable over the nave and a half cone over the apse at the same pitch, both with tile courses, a ridge and barge boards, and a glowing louvred vent with a weather vane on the ridge.
  - **Front.** A plastered, timber-framed gable with an iron plate of crossed gold hammers and a small glowing vent. Below it is a stone arch (quoins, voussoirs, a keystone) with an iron-ribbed glowing fanlight. One plank door is shut and the other swung open onto the forge glow, with wall torches on the pilasters either side.
  - **Sides and back.** An arched, barred window glows on each side, and slit windows on the apse. The furnace chimney rises from the back of the apse (where the hall's furnace stands inside): a stone-footed breast with a glowing ash door, a tall stack with three iron bands, a corbelled cap and a glowing flue, giving off embers and smoke.
  - **Right:** a mine tunnel through the wall (stone block, timber frame, wedge stones, a lantern), with rails and a cart carrying a treasure chest whose lid glows, like the carts inside. **Left:** a squat brick smelter with a glowing mouth, a pumping bellows, and a molten runnel into ingot moulds. The anvil, quench barrel, ingot crate, coal pile and firewood stay around it.
- `js/world/props.js`: the `instanced()` helper (one draw call for many tinted boxes) moved here from `isles/home.js` so both islands share it.
- `js/world/islands.js`: Forgewell `obs` 2.7 → 3.1 (bigger hall), `lh` 5.4 → 7.0 (label clears the chimney).
- Why: user feedback (richer architecture, closer to the interior, as done for Hearthstone).
- Checked: desktop front, left and right views, top view, entering the foundry. No console errors.

## 2026-10-20 — Hearthstone: the monolith outside becomes an octagonal keep that matches its hall; signpost removed
- `js/world/isles/home.js`:
  - **The building.** The tapered monolith is now an octagonal keep, dressed like the hall inside it: ashlar courses (one instanced mesh, holes left for openings) over a battered dark footing, stepped buttresses on every corner with a glowing seam and a pulse of light running up each, and a rune band of gilt glyphs between pale string courses. A gabled portal holds an arched door of iron-strapped planks with firelight leaking through the gap, quoined jambs, voussoirs and an ember keystone, with iron sconces either side. Lancet windows and arrow slits glow round the sides and back, a rose window sits over the door, and red banners with a glowing sigil hang on the faces flanking it. The top is a machicolated gallery with a crenellated parapet and glowing pinnacles, then an open lantern of eight pillars and arches over a fire bowl (the light the hall's oculus lets in), a gold crown, and the floating heart-gem with its orbiting motes. The stepped dais is octagonal with a gold inlay, the corner obelisks stay.
  - **Signpost removed** (and its `signArm` helper and imports).
  - Braziers, benches and the standing-stone ring moved out a little to clear the wider footprint.
- `js/world/islands.js`: home `obs` 2.0 → 2.4 (wider keep), `lh` 7.0 → 8.6 (label clears the gem).
- Why: user feedback (richer centre-island architecture, closer to the interior, no signboard).
- Checked: desktop walk view, zoomed-out view, top view. No console errors.

## 2026-10-20 — Hearthstone: closed hall, zoom-out stays inside; displays carved, written and cast to fit the room
- `js/rooms/home.js`:
  - **Closed hall.** The chamber was an open-fronted square shaft, so zooming out showed its open front, the floor's edge and the void above. Walls, floor, ceiling, wainscot, ashlar, purlins and tie beams now run forward to a front wall at z = 28 (deep enough for the phone's portrait camera), and `maxDist` (26) keeps zoom-out inside, like Forgewell, Runespire and Lorehall. A red runner leads down the hall to the rug, more niches line the side walls, and the light shaft falls through an iron-ringed oculus in the new ceiling.
  - On phones the stat portals are now framed straight on; at their old angle, zooming out swung the camera through the side wall.
  - **Displays.** The hero board is a slate tablet set into the heart-stone: chiselled bevel, an incised gilt border with corner lozenges (it kindles when focused), letters cut with a shadow, the name in gold leaf, the rest in EB Garamond. The focus-area lecterns hold parchment leaves on a wooden reading board with a ledge (red mark, title, fleuron, ink text, gilt frame when focused). The stat portals show ember light welling out of the dark doorway, with a rivetted brass name-plate naming where they lead (`⏎` only on desktop, auto-fitted). No more rounded web cards.
- `js/panels.js`: the Lorehall's printed-page helpers (`paper`, `rules`, `fleuron`, `caps`, the `FP`/`INK`/`RED`/`SEP` constants) moved here from `js/rooms/writing.js` so both rooms share them, and the EB Garamond load-then-repaint now covers every panel.
- Why: user feedback.
- Checked: desktop (start, max zoom-out, focused portal), phone (375×812) resting and zoomed-out at a portal, Lorehall unchanged. No page errors.

## 2026-10-20 — Lorehall: a proper bookmark ribbon, a dark gutter, no running head on the right page
- `js/rooms/writing.js`: the bookmark was three stiff boxes that read as a red pole. It is now one thin satin strip along a curve: lying in the gutter, out of the foot of the book, rolling over the ledge's lip and hanging a little to one side, with a swallowtail end. A dark crease fills the gap where the pages meet (the red leather spine showed through as a line). The right page no longer repeats the title at the top; the description starts higher.
- Why: user feedback.
- Checked: desktop close-up and default view.

## 2026-10-20 — Lorehall: books as real open volumes, turned lecterns, a woven rug, richer bookcases
- `js/rooms/writing.js`:
  - **The books.** Each is now a leather-bound volume lying open: two leather boards with gilt corner pieces and a rounded spine, a page block under each page (its head, tail and fore-edge striped like stacked leaves), and pages that dip into the gutter, swell and droop slightly at the edge (bent planes; the gutter shadow is in vertex colours since the pages are unlit). A ribbon runs from the gutter over the ledge and hangs down.
  - **The pages are set like print**, not cards: aged paper with foxing, a printed double frame (gilt when focused, replacing the orange outline), letterspaced small-caps running heads, fleurons, the title centred in Young Serif, an italic read time and folio. The description has a red three-line drop cap and auto-fits 17 → 12px. Tags are an italic keyword line wrapped by whole tags (no pills), and the call to read is small caps (`⏎` only on desktop). Body face is EB Garamond (added to the Google Fonts link in `index.html`); the pages repaint once it loads.
  - **Lecterns**: four feet with bun ends, a lathe-turned column with a brass collar, a bracket under a slanted desk with moulded sides and a lipped ledge.
  - **Rug**: a rectangular woven runner drawn on canvas (navy guards, gilt-and-diamond border, lozenge lattice, a medallion under each book) with fringed ends, replacing the scaled ellipses.
  - **Bookcases**: a plinth under the bottom shelf, a stepped cornice, and the odd curio among the books (stoppered jar, hourglass, iron-banded box). Two more cases stand along each side wall.
- Why: the user asked for better room geometry and a display that reads as an open book in the library's style rather than web cards.
- Checked: desktop (focused and unfocused book, max zoom-out), phone (375×812).

## 2026-10-20 — Lorehall: closed hall, zoom-out stays inside
- `js/rooms/writing.js`: the library only had a back wall, so zooming out (and the phone view) showed its open sides and front and the void. The hall is now closed: side walls, a front wall at z = 21 behind the portrait camera, and the floor, planks, ceiling and beams run to it. The shell is 1.6 wider than the bookcase layout so the angled corner cases clear the side walls; the picture rail and cornice run the full width. `maxDist` (19.5) keeps zoom-out inside, like Forgewell and Runespire.
- Checked: desktop max zoom-out, phone (375×812) resting view and zoom-out. No page errors.

## 2026-10-20 — Forgewell: bigger carts, the card on the chest lid, stone tunnel portals, more detail, a bigger wizard
- `js/rooms/projects.js`:
  - **Bigger carts and track.** Carts and chests are modelled in cart units inside a body group scaled ×1.85, and the track's gauge, sleepers, rails and ballast widened to match.
  - **The card is on the lid.** The floating plaque is gone: the card lives on the inside of the chest lid, in a gold frame on a plank lining. Shut, it faces down into the chest. When the focused chest's lid swings back (~100°, ease-out-back), the card turns to face the viewer, upright. The coin heap is lower so it doesn't cover the card, the light shaft is fainter, and the sparkles stay low.
  - **Tunnel portals rebuilt.** Each is a stone block jutting out of the back wall, facing straight down its track leg and deep enough to meet the curved wall. It has a rectangular mine opening sized for the bigger carts (3.0 × 3.3), a timber frame at the mouth and one just inside, a short recessed tunnel with darkness thickening to a black mouth, a ring of wedge stones over the lintel, masonry on the face, and lanterns. The track legs now end at the recessed mouth.
  - **More detail.** Timber posts with braces under the board's tie beam, four lanterns hanging on chains from the tie beams (with light pools), two torches on the back wall, smithing scrap round the anvil, an ore heap with glowing ore at each portal, and a pickaxe and shovel left leaning by them.
  - **The wizard** is 1.4× in this room and stands beside the left of the track. The quench barrel moved to the left wall.
- `js/app.js`, `js/rooms/kit.js`: rooms can set `heroScale` (default `HERO_SCALE.room`) for rooms built at a bigger scale.
- The tool racks (and the right workbench under one) moved to π ± 1.07 and the wall torches to π ± 0.767, centred in the gaps between the back wall's timber pilasters; at their old angles a pilaster cut through each of them. The ingot pile moved to the front right to make room for the bench.
- Fixed along the way: the portal depth constant was first named `FD`, which shadowed the display-font constant and shrank every title on the board and cards. It's now `PDP`.
- Checked: desktop (start, browsing, mid-move, max zoom-out, a close look at a portal), phone (375×812), Runespire unchanged. No page errors.

## 2026-10-20 — Forgewell: treasure chests on the carts
- `js/rooms/projects.js`: every cart now carries a plain treasure chest instead of coal and an always-up card.
  - **The chest:** it sits square on its cart. It has a plank body, iron trims and bands, a brass lock plate, and a domed lid hinged at the back with a hasp. A heap of gold coins and a few gems sits inside.
  - **Side carts:** their chests stay shut, with no preview text.
  - **The focused cart:** only its chest opens. The lid swings back, a gold glow spreads over the opening, a soft light shaft rises with sparkles drifting up, and the project card floats up clear of the chest so the gold shows beneath it. There is one glow rig, and it moves onto whichever cart is focused.
  - **Browsing:** the chest you leave closes as its cart rolls on.
  - **Opening in two phases**, so nothing passes through anything: the lid swings open first (about 100°, with a small ease-out-back bounce), then the plaque rises from just above the rim, at 85% size, high enough that the open lid shows beneath it. Closing runs the phases in reverse.
  - **The plaque:** the card that rises out of the open chest is built like the chest. It has plank backing in the chest's wood, a gold rim, iron corner brackets with brass rivets, and the card inlaid on the front: dark stained wood with a gold double border, gold corner diamonds and a cream title.
  - **Framing:** both views moved down a little so the open chest clears the hint bar.
- Why: open cards on every cart were busy. Plain closed chests keep the side carts quiet, and the open, glowing chest marks the focused project.
- Checked: desktop (start, browsing, mid-move) and phone (375×812). No page errors.

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
