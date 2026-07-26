# LEVIATHAN

A self-contained static site — the combined **VOID + LEVIATHAN** project — served straight from this repository. No build step, no bundler: `index.html` plus a handful of JavaScript modules and a single encrypted data bundle.

## What's here

```
index.html            # entry point + inline styles and template markup
procurement.html      # PROCUREMENT — an unlisted third section (see below)
ledger.html           # THE DRUG LEDGER — day by day, both directions
money.html            # THE FAMILY LEDGER — where the money came from
transcript.html       # THE TRANSCRIPT — the complete message record, searchable
404.html              # static not-found page (deep links into wiki page ids can go stale)
js/
  support.js          # runtime: custom <x-dc> template engine, resource loading
  pen-core.js         # the pen scaffold: lanes, volume, playhead, verbatim feed
  galaxy-cluster.js   # particle background simulation
  void-engine.js      # VOID visual layer
  wiki-reader.js      # WIKI reader: markdown rendering, search, page navigation
  wiki-modules.js     # first-wave wiki visualizers (WEB, CLAIMS, MASS, …)
  wiki-analytics.js   # second-wave wiki instruments computed from page prose
  procurement-data.js # PROCUREMENT's evidence pool — citations, not claims
  procurement-asks.js # THE ASK's ledger, recounted from wiki-brain raw/
  procurement.js      # PROCUREMENT's six instruments
  ledger-data.js      # THE DRUG LEDGER's rows
  ledger.js           # THE DRUG LEDGER's renderer
  money-data.js       # THE FAMILY LEDGER's events
  money.js            # THE FAMILY LEDGER's renderer
  transcript-index.js # quote → transcript line lookup (generated)
  transcript-link.js  # turns a quote on any evidence page into a link into the record
data/
  leviathan.enc       # AES-256-GCM encrypted content bundle (decrypted in-browser)
  wiki-data.json      # WIKI section dataset, built from github.com/caakehorn/wiki-brain
  transcript.json     # the message record behind transcript.html, built from a CSV export
tools/
  build-wiki-data.py  # regenerates data/wiki-data.json from a wiki-brain checkout
  build-transcript.py # regenerates data/transcript.json from an iMessage CSV export
  build-transcript-index.js # regenerates js/transcript-index.js from the two above
.nojekyll             # disables GitHub's Jekyll build (see below)
.gitignore            # ignores the transient .wiki-brain/ checkout
.gitattributes        # LF endings; marks the data files binary / generated
.editorconfig         # 4-space Python, 2-space everything else
robots.txt            # advisory: keeps crawlers off the bulk data/ blobs
.github/
  dependabot.yml      # weekly bumps for the Actions used below
  workflows/
    pages.yml         # GitHub Actions workflow that deploys to Pages
    sync-wiki.yml     # hourly rebuild of wiki-data.json from wiki-brain
```

The page renders through a small client-side template engine (the `<x-dc>` element
and `{{ ... }}` bindings). React and ReactDOM are loaded at runtime from the unpkg
CDN (SRI-pinned, see `REACT_URL` in `js/support.js`), so viewers need an internet
connection but the repo needs no install step. Nothing renders until they land,
which is why `index.html` preconnects and preloads them from the real `<head>`.

`@babel/standalone` is also wired up, but only ever fetched for an `<x-import>`
pointing at a `.jsx`/`.tsx` file. There are none, so no in-browser transpilation
happens on this site.

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

**PyYAML is required.** The wiki frontmatter carries nested lists of dicts
(`connections`, `sources`) that the no-dependency fallback parser cannot read —
without it the build still *succeeds* but emits zero typed edges and no sources,
silently gutting the CLAIMS / HEALTH / EVIDENCE / GENESIS / SCHEMA views. The
script therefore refuses to run without it, and also refuses to overwrite the
existing dataset if a rebuild loses more than 20% of its pages, words, or edges
(override with `--allow-shrink` when a large deletion is genuine).

## The pen scaffold

`js/pen-core.js` holds the shape most of the analytic views reduce to: several
pens tracing frequencies over an *ordering* of the corpus, a volume lane
grounding them in raw mass, a scrubbable playhead, and a feed of the records
that registered on each pen, verbatim. POLYGRAPH, WEATHER, EPISTEME and
CRUCIBLE all compose it, and so does every instrument on the PROCUREMENT page.

A host mixes it in with `Object.assign` and supplies `COL` / `MONO` / `GROT` /
`W` / `H` / `mouse` / `state` / `M` / `setState`. The console (`index.html`)
does this from `componentDidMount`; `js/procurement.js` does it in a plain class
constructor with no React underneath it at all.

## PROCUREMENT — the unlisted third section

`procurement.html` is a standalone page, reachable only by typing its URL.
Nothing on the site links to it and it carries `noindex`. Unlike the corpus
console it needs **no passphrase**: every line it quotes is already published
unencrypted, in `data/wiki-data.json` and upstream in wiki-brain, so encrypting
it would protect nothing and only make the citations harder to check.

It shares no data layer with the rest of the site. `js/procurement-data.js` is
the entire dataset — a hand-assembled pool of ~55 records, each one a quotation
plus its source file, its row, its provenance tier and whatever caveat the wiki
attached to it. The six instruments do nothing but order that pool, count it,
and read it back. Clicking any line in any feed pins the full source card.

Because the pool is checked in rather than generated, editing it is editing the
page: add a record to the `R` array in `js/procurement-data.js` and every
instrument picks it up on the next load. Records need `d` (ISO date at day,
month or year precision), `lane`, `who`, `tier`, `tag`, `text`, `src`, `dir` and
`page`; `note` and `approx` are optional, and `k` is the LEDGER sub-kind.

**THE ASK** does not run on that pool. `js/procurement-asks.js` is a recount from
primary sources: every Annie-thread export in
[wiki-brain](https://github.com/caakehorn/wiki-brain)'s `raw/self/message-csv/`
merged, the one UTC-stamped export converted to local time (it was minting
phantom duplicates four hours off), deduplicated on text within a 120-second
window, her side kept — 18,946 messages, 2025-02-01 to 2026-06-05, every month
covered. Requests are classified by speech-act frame *plus* named object rather
than by keyword, and every hit was then read by hand with the false positives
struck; the surviving per-category precision ships in `meta.precision` and is
displayed on the instrument. Regenerating it means re-running that merge — the
file is a build artifact of the raw exports, not hand-authored like `R`.

## Keeping the WIKI section in sync

`.github/workflows/sync-wiki.yml` keeps `data/wiki-data.json` in step with
wiki-brain automatically. It runs hourly, compares wiki-brain's current commit
against the `source_commit` recorded in the dataset, and exits in a few seconds
when nothing has moved. When wiki-brain *has* moved it rebuilds, commits the
result with the upstream SHA in the message, and then deploys the site.

It deploys by calling `pages.yml` directly rather than relying on that
workflow's own push trigger: a push made with `GITHUB_TOKEN` deliberately does
not start another workflow run, so the deploy would otherwise never fire.

You can also run it from **Actions → Sync wiki data from wiki-brain → Run
workflow**, which takes a *force* option to rebuild even when the source hasn't
moved. The dataset carries no build timestamp, so a rebuild from an unchanged
source is byte-identical and simply produces no commit.

### Optional: update within seconds instead of within the hour

The hourly poll needs no setup on the wiki-brain side. To make edits propagate
immediately, add this to **wiki-brain** as `.github/workflows/notify-leviathan.yml`:

```yaml
name: Notify leviathan
on:
  push:
    branches: [main]
    paths: ['wiki/**', 'log.md']
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/caakehorn/leviathan/dispatches \
            -d '{"event_type":"wiki-brain-updated"}'
        env:
          TOKEN: ${{ secrets.LEVIATHAN_DISPATCH_TOKEN }}
```

`LEVIATHAN_DISPATCH_TOKEN` is a fine-grained PAT with **Contents: read and
write** on `caakehorn/leviathan`, stored as an Actions secret in wiki-brain.
The hourly schedule stays on as a safety net either way.

> GitHub disables scheduled workflows in repositories with no activity for 60
> days. The sync commits here count as activity, so this only matters if
> wiki-brain also goes quiet for that long.

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

### Option B — Deploy from a branch (not recommended)

This publishes the repo root as-is, including `tools/` and `.github/`, and it
bypasses `pages.yml` — which `sync-wiki.yml` calls directly, so the wiki sync
would stop deploying.


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
