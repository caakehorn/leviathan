# LEVIATHAN

A self-contained static site — the combined **VOID + LEVIATHAN** project — served straight from this repository. No build step, no bundler: `index.html` plus a handful of JavaScript modules and a single encrypted data bundle.

## What's here

```
index.html            # entry point + inline styles and template markup
procurement.html      # PROCUREMENT — an unlisted third section (see below)
ask.html              # standalone view of instrument VI · THE ASK
ledger.html           # THE DRUG LEDGER — day by day, both directions
money.html            # THE FAMILY LEDGER — where the money came from
transcript.html       # THE TRANSCRIPT — the complete message record, searchable
temple.html           # THE TEMPLE — the section index (see below)
oracle.html           #   CHAPEL I · the seeded oracle over the whole record
voice.html            #   CHAPEL II · a trigram chain over Annie's messages
clock.html            #   CHAPEL III · eleven years of her messages as a spiral
terms.html            # the Terms of Service, rendered from js/tos.js — the one
                       # page not behind the gate
archive.html          # decoy: a fake "archive index" the quiz trap can lead to
final.html            # decoy: a fake "final determination" screen
transcript2.html      # decoy: chained from final.html
transcript3.html      # decoy: "corrupted reconstruction", chained from archive.html
404.html              # static not-found page (deep links into wiki page ids can go stale)
css/
  slime.css           # SLIME: the theme layer the standalone pages share
js/
  gate.js             # THE GATE: terms → quiz → curtain → passphrase, in front
                       # of every page; loads tos.js, quiz.js and GoatCounter
  temple.js           # THE TEMPLE's shared runtime: field, seeded rng, sigil, audio
  annie.js            # ANNIE: her half of the corpus, reduced to structure
  tos.js              # the Terms of Service dialog gate.js loads on demand
  quiz.js             # the quiz + decoy maze gate.js loads on demand
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
  wiki-meta.json      # the same headline counts alone, ~175 B, for pages that cannot afford 2.5 MB
  transcript.json     # the message record behind transcript.html, built from a CSV export
tools/
  build-wiki-data.py  # regenerates data/wiki-data.json + data/wiki-meta.json from a wiki-brain checkout
  encrypt.py          # writes blobs in the site's AES-256-GCM format
  build-transcript.py # regenerates data/transcript.json from an iMessage CSV export
  build-transcript-index.js # regenerates js/transcript-index.js from the two above
.nojekyll             # disables GitHub's Jekyll build (see below)
.gitignore            # ignores the transient .wiki-brain/ checkout
.gitattributes        # LF endings; marks the data files binary / generated
.editorconfig         # 4-space Python, 2-space everything else
robots.txt            # advisory: disallow-all, since the gate fronts everything
.github/
  dependabot.yml      # weekly bumps for the Actions used below
  workflows/
    pages.yml         # GitHub Actions workflow that deploys to Pages
    sync-wiki.yml     # hourly rebuild of wiki-data.json from wiki-brain
```

## SLIME — the palette

Radioactive green is the ground, not the accent. The ink is a green-black
(`#041206`) lit from underneath by pools of `#39ff14`; purple is the
counter-hue, and hot pink and cerulean are the two spot channels. Nothing on
the site sits outside these five families:

| channel | hex | where |
| --- | --- | --- |
| slime | `#39ff14` · hi `#b6ff8f` · acid `#ccff00` | primary — every default mark, rule and label |
| mint | `#00ffa3` | the second green, for a lane that must not read as the first |
| purple | `#b026ff` · violet `#7b2dff` · light `#e0aaff` | the counter-hue: structure, second series, pinned state |
| hot pink | `#ff2f9d` · light `#ff86c9` | contradiction, adverse counts, the other side of a two-party record |
| cerulean | `#00b7ff` · light `#7fe3ff` | the cold channel: muted chrome, focus rings, rivers, deferral |

`index.html` carries them in `COL` (the console's canvas palette, with the
legacy semantic names — `amber` is the slime channel, `cyan` the purple one,
`red` the hot-pink one) and again as CSS custom properties for the markup.
The standalone pages get them from `css/slime.css`, which also supplies the
backdrop, the scanlines, and the ooze creeping down both edges. That
stylesheet only ever *adds* atmosphere — layout, type scale and typeface stay
with the page that loads it.

The particle engines are on the same four stops: `neon()` in the WebGL path
and `neonRGB()` in the CPU fallback (`js/galaxy-cluster.js`), and `pal()` in
`js/void-engine.js`, all run slime → cerulean → purple → hot pink → slime.

## The three phases

`index.html` is one page in three states. **PHASE 00** is the splash — the
gravity well, a live particle cluster you can grab. **PHASE 01** is the void
console, which indexes the whole site in five numbered sections: `01 — THE
CORPUS` (the record and its nineteen instruments), `02 — THE WIKI` (the reader
and its eighteen), `03 — ANNIE` (the standalone evidence pages), `04 — THE
TEMPLE`, and `05 — OPEN A CHANNEL`. **PHASE 02** is the LEVIATHAN console
itself, 37 instruments over two sections; the corpus and wiki halves have
separate entry points from the void (`enterCorpus` / `enterWiki`) that stage
the section before the passphrase gate is asked for.

Both halves of that console are on this side of the site, and both are on the
same canvas and the same tab bar — `◈ CORPUS` and `◈ WIKI` at its left end swap
which set of instruments the nineteen/eighteen numbered tabs address, and every
module draws through `draw_<tab>` regardless of which section it belongs to.
`wiki.html`, over on the Singularity side, is the wiki's *prose reader* and only
that; it has never carried the instruments. Routing `enterWiki` / `toWiki` there
is therefore not a shortcut but a deletion — it retires all eighteen wiki
instruments while leaving their code loaded and unreachable, which is exactly
what happened between the move to the Singularity and this note.

The page renders through a small client-side template engine (the `<x-dc>` element
and `{{ ... }}` bindings). React and ReactDOM are loaded at runtime from the unpkg
CDN (SRI-pinned, see `REACT_URL` in `js/support.js`), so viewers need an internet
connection but the repo needs no install step. Nothing renders until they land,
which is why `index.html` preconnects and preloads them from the real `<head>`.

`@babel/standalone` is also wired up, but only ever fetched for an `<x-import>`
pointing at a `.jsx`/`.tsx` file. There are none, so no in-browser transpilation
happens on this site.

## The gate

`js/gate.js` loads first on every page and hides the document synchronously, so
nothing paints until four steps are cleared. Every page includes only this one
file; `gate.js` pulls in the other three on demand.

0. **The terms.** `js/tos.js`, a Terms of Service dialog with an explicit
   checkbox and an "I agree" button that stays disabled until it's ticked.
   Declining replaces the document. Acceptance is recorded per device in
   `localStorage`, versioned, so a returning visitor is never asked twice.
   `terms.html` renders the identical document from the same source and is the
   one page not behind the gate — terms you cannot read before agreeing to
   them are not terms.
1. **The quiz.** `js/quiz.js`. An empty submit passes. Anything else drops the
   visitor into a decoy: a clone of `transcript.html`'s shell, rendered from
   the real data but appended one row every few seconds, that eventually
   forwards into a small maze of pages (`archive.html`, `final.html`,
   `transcript2.html`, `transcript3.html`) built to look like continued
   progress toward the real archive without ever reaching it.
2. **The curtain.** The flash screen. Its copy rotates through `TAUNTS` — one
   line every ten seconds, as many lines as the array holds. Type `SKIP_CODE`
   and hit Enter to cut it short; do nothing and it opens itself after
   `WAIT_MS`, a full minute. There is no input field and no prompt: keystrokes
   are read off the window and the echo line stays empty until the first
   character, so nothing on screen admits a code exists. Anyone on a phone, or
   anyone who was never told, simply waits — which is the point of the minute.
3. **The passphrase.** Behind the curtain, the only one of the four that is an
   actual lock.

Steps 0, 1 and 2 are doormen, not boundaries; the passphrase is the boundary.

The lock uses the same protocol the archive bundle always had — PBKDF2-SHA256
over the passphrase (250,000 iterations), AES-256-GCM for the payload — and
checks the entry by *decrypting* a blob: a wrong passphrase fails GCM
authentication and throws. There is no stored hash, so there is nothing on the
wire to grind offline any faster than 250k iterations per guess. One unlock
covers the tab (`sessionStorage`) and skips steps 1 and 2 on every page after it;
`index.html`'s archive reuses it rather than asking twice.

All the copy and every dial — the rotating lines, `SKIP_CODE`, `WAIT_MS`,
`MSG_MS`, the greeting — sit in one block at the top of `js/gate.js`.

An unlock lasts as long as the tab, so the owner cannot see their own front
door again by reloading. Append `#lock` to any URL (or call `LVGate.lock()`)
to throw the bolt: it drops the stored passphrase, strips itself back out of
the URL, and re-serves the curtain.

`tools/encrypt.py` writes blobs in that format — it is the encryptor that was
missing from this repo:

```bash
tools/encrypt.py verify                      # data/verify.enc — the small blob
                                             # the gate checks against
tools/encrypt.py pack data/transcript.json   # -> data/transcript.json.enc
tools/encrypt.py check data/leviathan.enc    # does this passphrase open it?
```

The passphrase comes from `$LEVIATHAN_PASSPHRASE` or a prompt. It is never
written to disk and must never be committed — and it cannot be recovered from
anything in this repository, which is the point of the design.

### Getting it wrong

A wrong passphrase brings the same screen back for 30 seconds, this time with a
countdown and no way through. The lockout is stored as a deadline in
`sessionStorage`, not a timer, so reloading the page does not skip it — which
makes it double as the rate limit: one guess per 30 seconds per tab, on top of
the 250,000 PBKDF2 iterations each attempt already costs. It outlives the
curtain, too: reload mid-sentence and you serve the remainder before you are
offered the way through again.

It flashes at 0.34s per on-off cycle — about 2.9 flashes a second, just under
the 3 Hz general-flash threshold in WCAG 2.3.1, the same line `index.html`'s
`enterflash` comment draws. Under `prefers-reduced-motion: reduce` it stops
strobing but still takes the whole page for the whole 30 seconds.

The console's own archive prompt calls `LVGate.punish()` for a wrong passphrase
rather than keeping its own version of any of this.

### What the gate does not do

**It gates rendering, not access.** These still resolve for anyone who types the
URL, gate or no gate:

- `data/transcript.json`, `data/wiki-data.json`
- `js/ledger-data.js`, `js/money-data.js`, `js/procurement-data.js`, `js/procurement-asks.js`
- the HTML of every page

And while this repository is public, all of it is readable on github.com
regardless of what the deployed site does. Real protection at rest means three
things, in this order:

1. **Encrypt the payloads** — `tools/encrypt.py pack` each one, have the page
   fetch the `.enc` and decrypt with the gate's passphrase, and delete the
   plaintext from the working tree.
2. **Purge the history** — git keeps every plaintext blob ever committed, so
   step 1 alone changes nothing for anyone who clones.
3. **Make the repository private** — otherwise steps 1 and 2 only move where
   the plaintext is read from.

Until those are done, treat `js/gate.js` as a lock on the front door of a
building with windows.

The `data/leviathan.enc` bundle is the one payload already encrypted; the site
decrypts it in the browser using the Web Crypto API, and the plaintext only ever
exists in memory in the visitor's tab.

### Counting

`gate.js` loads GoatCounter (`danfrank.goatcounter.com`) once, in itself, so
every page gets both an ordinary pageview and the gate's own funnel without a
second script tag anywhere — `terms.html` is the one exception, since it
deliberately does not load `gate.js` and carries its own tag instead.

`tally(name)` fires a `gate/<name>` event. The whole path — how many people
see the gate, how many bounce at each step, how many are actively trying to
get past the passphrase — is legible from these:

| event | fires when |
| --- | --- |
| `gate/tos-shown` · `gate/tos-agreed` · `gate/tos-declined` | the terms dialog, and which button |
| `gate/quiz-shown` · `gate/quiz-passed` · `gate/quiz-trapped` | the quiz, and whether it was passed or triggered the decoy maze |
| `gate/curtain-shown` | the flash screen, in its normal (skippable) form |
| `gate/curtain-code` · `gate/curtain-waited` | cleared with `SKIP_CODE`, or by waiting out `WAIT_MS` |
| `gate/curtain-badcode` | a wrong code was typed |
| `gate/punish-shown` | the flash screen shown as the 30-second passphrase punishment |
| `gate/passphrase-shown` · `gate/passphrase-fail` · `gate/passphrase-ok` | reaching the lock, and every attempt against it |

Because the earliest events fire before GoatCounter's async script has had
time to load, `tally()` queues anything called too soon and drains the queue
from the script's `onload` — a plain readiness guard would otherwise silently
undercount exactly the events (`tos-shown`, most of all) that matter most. If
the script never loads at all (blocked, offline), the queue just sits there;
counting is never allowed to slow down or affect the gate itself.

A returning visitor who already holds a passphrase in `sessionStorage` skips
steps 0–2 entirely and generates no `gate/*` events at all — the funnel only
measures people who are actually being asked to get past something.

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

## THE TEMPLE — a section

`temple.html` is the index; each chapel is its own page. `js/temple.js` is the
shared runtime (the WebGL field, the seeded RNG, the sigil renderer, the Web
Audio voice) and `js/annie.js` is the corpus layer every Annie-side chapel
draws from.

TempleOS shipped with an oracle: Terry Davis wired a hardware RNG to a
dictionary and read what came back as God talking. The mechanism was trivial,
the idea was not. This section is a set of variations on it — machines that
speak, whose vocabulary is fixed, whose selection nobody controls.

### The rule

The subject is Annie, and the constraint is that **nothing here makes a
judgement**. No sentiment scoring, no curated vocabulary, no flagged phrases,
no highlighted dates, no threshold chosen because of what it would surface.
Every number a chapel displays is a count, a timestamp, or a transition
probability computed over the whole of her half of the record with no message
excluded.

That is not modesty. Anything editorial would make the output a portrait of an
*argument*; left alone, the counts make a portrait of a *person*, and the
interesting part is that nobody chose any of it. The single exception is the
closed-class stopword list the lexicon uses, published as `LVAnnie.STOP` so it
can be read and disagreed with.

| chapel | corpus | what it does |
| --- | --- | --- |
| **I · THE ORACLE** (`oracle.html`) | both sides, 134,348 messages | Draws real passages in answer to a question. Seeded by the question, so the same question returns the same answer forever — an oracle you can re-roll is a slot machine. Three rites: VERSE, WORD, CHORUS. |
| **II · THE VOICE** (`voice.html`) | Annie only, 434,795 words | A word-level trigram chain. Does not retrieve: every line is new and none were ever sent, but each word-pair hands off to a word that really did follow it. Turn it on and it does not stop. |
| **III · THE CLOCK** (`clock.html`) | Annie only, 68,998 points | Every message she sent, placed by when. Angle is the hour, radius is the date — first at the centre, last at the rim. Hover any dot to read it. |

### On the model

The trigram table maps a word-pair to a bucket of every word that ever followed
it, duplicates kept, so the bucket *is* its own frequency table and sampling it
uniformly samples her real distribution. There is no smoothing, no temperature,
and no penalty term — the model has no parameters, which means there is nothing
in it for anyone to have tuned. Utterances end where her messages ended,
because the terminator is part of the table. It is built in slices off the main
thread; on 435k tokens the whole build is a couple of seconds.

It is not her, not a quote, not a prediction, and not an opinion about her. It
is the shape of 434,795 words with the meaning taken out.

### On the clock

Timestamps are parsed by hand out of the `"YYYY-MM-DD HH:MM:SS"` string rather
than through `Date()`, so the viewer's timezone cannot shift which hour a
message lands in. Colour encodes hour-of-day and nothing else. Every point is
drawn — no sampling, no density binning — and the tooltip does a linear
nearest-point search so what you read is provably the dot under the cursor.

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

Keeping the file current is only half of it — the pages that read it have to
stop trusting their caches. Both consumers (`void.html`'s wiki instruments and
`wiki.html`'s reader) fetch with `cache: 'no-cache'`, which revalidates rather
than re-downloads: an unchanged dataset costs one 304 and a changed one is
picked up on the next load instead of whenever the Pages `max-age` happens to
lapse. `wiki.html` used `force-cache` until this note and would happily serve a
copy from before the last sync.

Nothing about the wiki's size is typed by hand anywhere. `build-wiki-data.py`
also writes `data/wiki-meta.json` — page count, typed edges, words, domains,
log ops, `source_commit`, about 175 bytes — because `void.html` quotes those
figures on its landing sections, where no visitor has decrypted anything and a
2.5 MB fetch would be absurd. `validate.yml` recomputes every field from the
dataset and fails if the two disagree, so the small file can never drift away
from the large one. (Before it existed, the landing page claimed 343 pages long
after the corpus passed 400.)

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
