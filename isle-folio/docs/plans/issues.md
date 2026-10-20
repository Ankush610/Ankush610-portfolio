# Issues

Known problems and loose ends. Move an item to **Closed** when it's fixed, and log the fix in `docs/logs/logs.md`.

## Open

| # | Sev | Issue | Where | Notes |
|---|---|---|---|---|
| 7 | Low | Three.js r128 (2021) is pinned from a CDN. It works, but it's old and the page can't run offline. | `index.html` | Upgrade only if a feature needs it. Newer versions are ES-module-only and change how it's imported. |
| 8 | Low | Auto-travel has no pathfinding. When an obstacle blocks the hero, it teleports to the next waypoint. | `js/world/player.js:63` | Marked `ponytail:`. Add steering if the jump is noticeable. |
| 9 | Low | Recognition props are chosen by a keyword guess on the title. | `js/rooms/teaching.js:199` | Marked `ponytail:`. Add a `kind` field to the data if it guesses wrong. |
| 10 | Low | There are no automated checks, not even a smoke test that `data.json` loads and every room builds. | — | Add one when a regression hurts. |

## Closed

| # | Issue | Fix |
|---|---|---|
| 1 | The résumé link was broken because `resume/` was empty. | The PDF now lives in `shared/resume/` and `data.json` points there. |
| 2 | The project wasn't under git. | It's in the `Ankush610-portfolio` repo. |
| 3 | The plain-text mirror printed empty LinkedIn/GitHub/Medium links. | `js/content.js` skips empty links, like `rooms/contact.js`. |
| 4 | The hint bar and canvas aria-label said "1–7" regardless of island count. | Hint range comes from `ISLANDS.length` (max 9); the aria-label no longer names a range. |
| 11 | On portrait phones the top view cut off the far west and east islands. | Touch screens now frame one island at a time, chosen from the card strip. |
| 5 | `Isle Folio.html` was a stale single-file copy that drifted from `data.json`. | Deleted (moved to the system trash) on 2026-10-20. |
| 6 | Two `launch.json` files on different ports. | One `.claude/launch.json` at the repo root, serving the root on port 8080. |
