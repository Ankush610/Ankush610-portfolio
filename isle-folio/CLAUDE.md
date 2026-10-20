# CLAUDE.md

**Isle Folio**: Ankush Sonawane's portfolio as a walkable 3D world of seven floating islands, each with a room for one section. Everything (app, docs, this file) lives in `isle-folio/`. Read `README.md` for the file layout, controls and how to add an island.

## Run

```bash
python3 -m http.server 8123
```

Open http://localhost:8123. It has to be served over HTTP because `data.json` is loaded with `fetch`. Use `?room=<id>` to open a room directly and `?data=draft.json` to preview a draft.

## Stack

- Plain ES modules, no build step, no npm.
- Three.js **r128**, loaded globally from the cdnjs CDN as `window.THREE`. Use the r128 API.
- All content is in `data.json`. Don't hardcode content in JS.
- Island buildings are modelled with the door at +z and turned by `isl.face` so the door faces the centre island. In `decorate()`, place front-relative props with `isl.rot(x, z)`.

## Docs, keep these current

- `docs/plans/plan.md`: what we're building, status, next steps.
- `docs/plans/issues.md`: known issues. Move fixed ones to **Closed**.
- `docs/plans/decisions.md`: why things are the way they are.
- `docs/logs/logs.md`: **after every change, add an entry at the top** (date, what changed, why, issue # closed).

## Conventions

- Match the existing code style: terse JS, a one-line header comment per file, sparse comments.
- Deliberate shortcuts get a `// ponytail:` comment that names the limit and how to upgrade.
- Keep the plain-HTML mirror (`js/content.js`) in sync whenever `data.json` gets a new field or section.
