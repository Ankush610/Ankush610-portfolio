# Ankush Sonawane — Portfolio

One static site, two ways in. The gateway at `/` lets visitors pick:

| Path | What it is |
|---|---|
| `/` | Gateway page (`index.html`) |
| `/static-portfolio/` | "Office": the classic portfolio, a bold, flat neubrutalist look |
| `/isle-folio/` | Isle Folio, a walkable 3D world (Three.js) |
| `/shared/` | Content both sites read: `data.json`, `resume/`, `favicon.png`, `og.png` |

Edit content once in **`shared/data.json`**; both portfolios pick it up.

## Run locally

No build step. Serve the **repo root** over HTTP (the sites `fetch` `../shared/data.json`, so `file://` or serving a subfolder won't work):

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>.

## Deploy

Everything is static, so any static host works with the repo root as the site root and no build command: GitHub Pages (deploy from `main`, folder `/`), Netlify, Vercel, Cloudflare Pages.
Once the site has a domain, make the gateway's `og:image` an absolute URL (see the `ponytail:` note in `index.html`).
