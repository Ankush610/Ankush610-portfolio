# Issues

Known problems and loose ends. Move an item to **Closed** when it's fixed, and log the fix in `docs/logs/logs.md`.

## Open

| # | Sev | Issue | Where | Notes |
|---|---|---|---|---|
| 1 | High | The résumé link is broken because `resume/` is empty. | `data.json` → `resume` | Add `Ankush_Sonawane_Resume.pdf`. |
| 2 | Med | The project isn't under git, so there's no history and no way to roll back. | repo root | Run `git init` and add a `.gitignore`. |
| 3 | Med | The plain-text mirror prints LinkedIn, GitHub and Medium links even when they're empty. The 3D contact room already skips them. | `js/content.js` (Contact line) | Filter out empty links like `rooms/contact.js` does. |
| 4 | Low | The hint bar and the canvas aria-label say "1–7", but travel supports up to 9 islands. | `js/app.js:32`, `index.html:15` | Derive the text from `ISLANDS.length`. |
| 7 | Low | Three.js r128 (2021) is pinned from a CDN. It works, but it's old and the page can't run offline. | `index.html` | Upgrade only if a feature needs it. Newer versions are ES-module-only and change how it's imported. |
| 8 | Low | Auto-travel has no pathfinding. When an obstacle blocks the hero, it teleports to the next waypoint. | `js/world/player.js:63` | Marked `ponytail:`. Add steering if the jump is noticeable. |
| 9 | Low | Recognition props are chosen by a keyword guess on the title. | `js/rooms/teaching.js:199` | Marked `ponytail:`. Add a `kind` field to the data if it guesses wrong. |
| 10 | Low | There are no automated checks, not even a smoke test that `data.json` loads and every room builds. | — | Add one when a regression hurts. |
| 11 | Low | On portrait phones the top view still cuts off the far west and east islands (Runespire, Lorehall) at the screen edges. | `js/app.js` `desired()` | Add drag-to-pan in top view if it matters. |

## Closed

| # | Issue | Fix |
|---|---|---|
| 5 | `Isle Folio.html` was a stale single-file copy that drifted from `data.json`. | Deleted (moved to the system trash) on 2026-10-20. |
| 6 | Two `launch.json` files on different ports. | Kept one in `isle-folio/.claude/` on port 8123. |
