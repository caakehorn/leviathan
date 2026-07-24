# LEVIATHAN

A self-contained static site — the combined **VOID + LEVIATHAN** project — served straight from this repository. No build step, no bundler: `index.html` plus a handful of JavaScript modules and a single encrypted data bundle.

## What's here

```
index.html            # entry point + inline styles and template markup
js/
  support.js          # runtime: custom <x-dc> template engine, resource loading
  galaxy-cluster.js   # particle background simulation
  void-engine.js      # VOID visual layer
  wiki-modules.js     # wiki reader + first-wave wiki visualizers
  wiki-analytics.js   # second-wave wiki instruments computed from page prose
data/
  leviathan.enc       # AES-256-GCM encrypted content bundle (decrypted in-browser)
  wiki-data.json      # WIKI section dataset, built from github.com/caakehorn/wiki-brain
tools/
  build-wiki-data.py  # regenerates data/wiki-data.json from a wiki-brain checkout
.nojekyll             # disables GitHub's Jekyll build (see below)
.github/workflows/
  pages.yml           # GitHub Actions workflow that deploys to Pages
```

The page renders through a small client-side template engine (the `<x-dc>` element
and `{{ ... }}` bindings). React and Babel are loaded at runtime from the unpkg CDN,
so viewers need an internet connection but the repo needs no install step.

The `data/leviathan.enc` bundle is encrypted; the site prompts for a passphrase and
decrypts it in the browser using the Web Crypto API. The plaintext only ever exists
in memory in the visitor's tab.

The WIKI section's dataset (`data/wiki-data.json`) is the exception: it is built
from the [wiki-brain](https://github.com/caakehorn/wiki-brain) repository — the
authoritative wiki source, already served publicly at
caakehorn.github.io/wiki-brain — so it ships unencrypted and can be refreshed
without re-packing the bundle:

```bash
tools/build-wiki-data.py --wiki-brain /path/to/wiki-brain
```

If the file is absent the site falls back to the wiki snapshot inside the
encrypted bundle.

## Viewing on GitHub Pages

Because the page uses `{{ ... }}` bindings that are meant for the browser, **Jekyll must
not process the site** — Jekyll would try to interpret those as Liquid tags and break the
page. The included `.nojekyll` file and the Actions-based workflow both avoid that.

### Option A — GitHub Actions (recommended, already set up)

1. Push this branch and merge it to `main`.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. The `Deploy to GitHub Pages` workflow runs on every push to `main` (and can be run
   manually from the **Actions** tab). When it finishes, the live URL appears in the
   workflow summary and under Settings → Pages.

### Option B — Deploy from a branch

1. **Settings → Pages → Source → Deploy from a branch**.
2. Pick the branch (e.g. `main`) and folder `/ (root)`, then **Save**.
3. The `.nojekyll` file ensures the site is served as-is.

Your site will be published at `https://<username>.github.io/<repository>/`.

## Running locally

Open with any static file server (needed because the site uses `fetch`):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
