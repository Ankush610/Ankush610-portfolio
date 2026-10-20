# Decisions

Why things are the way they are. Add a short entry when making a choice someone might later want to undo.

Format: **date — decision**, followed by why and what would change it.

---

**2026-10-20 — Forgewell is a closed hall; projects ride mine carts into tunnels in the back wall.**
Why: the portals hide every cart off the open track, and the carts are spaced round a loop that closes behind the wall, so any number of projects reads the same and browsing past the last one simply loops. The track is a U (a semicircle in front, parallel legs back to the wall), with five carts out at a time. The board hangs high so the carts and the tunnel mouths show beneath it. The hall is closed, with walls all round, a ceiling and `maxDist`, so zooming out never shows the void.
Revisit if: the room should show a different number of carts. `SP` is `(MOUTH + 1.8)/k` for k carts either side of the front; make sure k·SP stays past `MOUTH + 1.2`, so the next one is inside a tunnel.

**2026-10-20 — No lazy loading or custom culling for rooms; enclosed rooms cap zoom-out instead.**
Why: rooms are already built on first entry, and Three.js skips off-screen meshes. Runespire measures 74 draw calls and about 18k triangles, so loading parts on demand would add code without a visible gain. The black screen at max zoom-out came from the camera passing through a wall, so the fix is `room.maxDist`.
Revisit if: a room drops frames on a phone. Then measure `renderer.info` first.

**2026-10-20 — Runespire is a runestone circle inside the tower, one stone per skill category.**
Why: skills are a flat list of names grouped by category, so a physical object per category (like Forgewell's pedestals) reads better than a UI grid floating in 3D. On a phone, one stone fills the screen, so there's no layout juggling. The stones stand in niches round the tower's octagon (one wall per stone plus the door's), so the interior matches the building outside.
It scales with the data: the ring widens as categories are added, a stone grows taller with its skill count, long titles wrap onto two lines, and long skill names wrap.
Revisit if: skills get per-skill detail (that would need a focus step per skill), or a single category reaches 60+ skills (its stone would get very tall; split the category).

**Initial — No build step; plain ES modules + Three.js r128 via CDN.**
Why: nothing to install or configure, and any static host can serve it.
Revisit if: we need a newer Three.js (ESM-only) or npm packages.

**Initial — All content in `data.json`, rooms lay out from it.**
Why: editing the portfolio shouldn't mean touching code. `?data=draft.json` previews a draft without changing the real file.
Revisit if: content needs per-item layout control that data alone can't express.

**Initial — Text in 3D is drawn on canvases (`panels.js`), with a hidden HTML mirror (`content.js`).**
Why: everything readable stays inside the 3D scene. The mirror keeps it accessible and is the fallback when WebGL fails.
Revisit if: the text gets too blurry on high-DPI screens or the mirror falls out of sync.

**Initial — One file per island (`world/isles/*.js`) and one per room (`rooms/*.js`).**
Why: to add a section, you add files instead of editing a shared one.
Revisit if: the files start sharing a lot of duplicated code. Move that into `kit.js` / `props.js`.

**2026-10-20 — Top view is a mode, not a one-off map screen.**
Why: visitors who don't want to walk can browse the whole portfolio by clicking islands. It also gives touch users a way to travel without the joystick.
Revisit if: people get lost switching modes. Then make WASD in top view switch straight to walk mode.

**2026-10-20 — Touch screens browse by island cards, not by walking.**
Why: the joystick was fiddly, and in portrait the top view cut off the outer islands. A swipeable card strip names each section ("Projects", "Skills"), works one-handed, and the camera follows the centred card, so every island gets framed. Touch = `(pointer: coarse)`, so tablets get it too.
Revisit if: tablet users ask to walk. Then gate it on screen width as well.

**2026-10-20 — Buildings are modelled facing +z and turned at build time (`isl.face`, `isl.rot`).**
Why: every door faces the centre island, so arriving from the main bridges shows the front. The model files keep one simple convention, and `decorate()` turns its front-relative props with `isl.rot` (it builds into an unturned group).
Revisit if: an island needs a door facing somewhere else. Then set `face` per island in `ISLANDS`.
