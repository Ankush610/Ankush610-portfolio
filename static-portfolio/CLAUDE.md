# CLAUDE.md

Guidance for Claude Code (or any AI assistant) working in this repository.

## Project Overview

**PORTFOLIO — Retro Terminal Portfolio**
A neocities-inspired personal site for an AI/ML Engineer. Retro terminal
aesthetic — dark background, scanline/rain canvas, neon teal/amber/pink/green
accents, pixel-art icons.

- **Type:** Static Web Application (SPA shell, client-side routing only)
- **Stack:** Vanilla HTML5, CSS3, JavaScript (ES6+) — no build step, no framework
- **Data-driven:** All copy/content lives in `data.json`, not in HTML or JS
- **Theming:** Two themes — `dark` ("Nexus", default) and `light` ("Office") —
  toggled via `data-theme` on `<html>` and persisted in `localStorage`

## Directory Structure

Content lives in `../shared/` (`data.json`, `resume/`, `favicon.png`), shared with `isle-folio/`.

```
.
├── index.html        # Page shell + entry point (loads CSS/JS, sets favicon)
├── css/
│   ├── base.css        # CSS variables, reset, typography, theme variable defs
│   ├── layout.css       # Grid, header, nav, footer structure
│   ├── components.css   # Panels, tags, sidebar widgets (incl. phase widget)
│   ├── sections.css     # Per-tab (HOME/SKILLS/PROJECTS/...) styles
│   ├── animations.css   # Entrance & stagger animations
│   └── theme-light.css  # Overrides scoped to html[data-theme="light"]
└── js/
    ├── app.js    # Boot sequence, theme toggle, clock + sun/moon phase widget,
    │             # page shell (header/nav/footer), routing between tabs
    ├── render.js # Pure functions that turn `data.json` into HTML strings
    │             # for each section (HOME, SKILLS, PROJECTS, BLOG, ...)
    └── rain.js   # Canvas-based background rain animation
```

## Running Locally

No build step, but it **must** be served over HTTP (not `file://`) because
`app.js` fetches `../shared/data.json` via `fetch()`. Serve the **repo root**:

```bash
python3 -m http.server 8080   # from the repo root
```
Then open `http://localhost:8080/static-portfolio/`. The launch config is in
the repo root's `.claude/launch.json`.

## Editing Workflow

1. **Content changes** (bio, skills, projects, blog posts, workshops, contact
   info, resume link) → edit `../shared/data.json` only. Nothing else needs to change;
   `render.js` reads it at boot and re-renders on tab switch.
2. **Visual/structural changes** to a specific tab → edit the matching
   `render*()` function in `js/render.js` plus the relevant block in
   `css/sections.css`.
3. **Shell-level changes** (header, nav, footer, clock, theme toggle, phase
   widget) → `js/app.js` + `css/layout.css` / `css/components.css`.
4. **Theme-specific styling** → add overrides in `css/theme-light.css` scoped
   under `html[data-theme="light"] ...`; dark mode is the CSS default, so it
   should need no explicit selector in most cases.
5. Always keep HTML/CSS/JS separated — no inline `<style>`/`<script>` blocks
   beyond the tiny pre-paint theme-flash guard already in `index.html`.

## Conventions

- **No inline styles from JS except where truly dynamic** (e.g. the
  clock/phase widget sets `style.background`/`style.color` at runtime based
  on time of day + active theme — see `getSunMoonPhase()` and `startClock()`
  in `js/app.js`). Everything else should be a CSS class.
- **Escape all user/data-driven text** with the `esc()` helper in
  `render.js` before interpolating into HTML strings.
- **Pixel-art icons** (sun/moon phase glyphs, favicon) are hand-built from
  `<rect>` elements on a small grid with `image-rendering: pixelated`, not
  imported image assets — keep new icons in the same style.
- **Branding**: the site refers to itself as `PORTFOLIO` (see
  `data.json → personal.handle`), shown uppercase in the header logo and
  footer. Update that one field to rebrand instead of hardcoding strings.

## Color Theme (dark / default)

Background `#0a0a0e` with:
- **Teal/Cyan** `#00e5ff` — primary links, titles, favicon accent
- **Amber** `#ffb300` — project titles, stats, achievements
- **Pink/Magenta** `#ff4081` — blog posts, highlights
- **Green** `#39ff14` — online status, workshops, ML skills
- Orange/Red/Purple — category accents for skills

Light theme ("Office") remaps these onto a lighter surface — see
`css/theme-light.css` for the full override set.
