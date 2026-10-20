# Decisions

Why things are the way they are. Add a short entry when making a choice someone might later want to undo.

Format: **date — decision**, followed by why and what would change it.

---

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
