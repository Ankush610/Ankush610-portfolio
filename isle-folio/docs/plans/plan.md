# Plan — Isle Folio

## What we're building

**Isle Folio** is Ankush Sonawane's portfolio as a walkable 3D world. Visitors walk a wizard across seven floating islands. Each island has a building, and its room lays out one section of the portfolio in 3D.

| # | Island | Room content |
|---|---|---|
| 1 | Hearthstone (`home`) | intro, focus areas, stats |
| 2 | Oakreach (`journey`) | experience + education |
| 3 | Forgewell (`projects`) | project carousel |
| 4 | Runespire (`skills`) | runestone circle |
| 5 | Lorehall (`writing`) | articles as books |
| 6 | Lyceum (`teaching`) | workshops, talks, recognition |
| 7 | Beacon Point (`contact`) | contact links, résumé |

## Principles

- **No build step.** Plain ES modules and Three.js r128 from a CDN, served as static files.
- **Content is data.** Everything editable lives in `data.json`. Rooms size themselves to the lists in it.
- **Never a black screen.** `content.js` renders a plain-HTML mirror for screen readers. The same mirror is the fallback when WebGL, Three.js or the data fail to load.
- **Small and boring.** No framework and no bundler. Add a dependency only when a few lines can't do the job.

## Where things live

- `isle-folio/` is the project root: the app, `CLAUDE.md` and these docs. `README.md` has the run steps, the file layout and how to add an island.
- `docs/plans/`: plan, issues and decisions.
- `docs/logs/logs.md`: a log of every change.

## Status (2026-10-20)

- [x] Seven islands, bridges, walking, auto-travel, map view
- [x] Seven rooms built from `data.json`
- [x] Touch: island card strip (top view only), swipe, pinch
- [x] Two modes: walk (WASD) and top view (pick an island, the camera circles it while the wizard walks to the door, a second press goes in)
- [x] Plain-text / no-WebGL fallback
- [ ] Résumé PDF in `resume/`
- [ ] Deploy somewhere public
- [ ] Put the project under git

## Next up

1. Fix the open items in [issues.md](issues.md).
2. Choose hosting. Any static host works (GitHub Pages, Netlify, Cloudflare Pages).
3. Test performance on a low-end phone.
