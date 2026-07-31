# THE SINGULARITY BRAIN — a plan

*A living, self-rendering model of a person. The plan, not the build. Tear it apart.*

Status: **DRAFT for review.** Nothing here is committed as architecture until Dan signs off on the three forks at the bottom. This document contains no sensitive specifics from the source graph on purpose.

---

## 0. The one-sentence version

Take the knowledge graph the `wiki-brain` repo already is — a real typed
argument-graph about one person — and build on top of it the thing it was
always reaching for and never became: a **living representation of a mind that
grows visibly, rebalances away from any single obsession, and rolls up into a
self-model you can fall into.** Public, ungated, generative, and — as far as we
can find — not a thing anyone has actually built.

---

## 1. What Karpathy actually proposed

In April 2026 Andrej Karpathy published a gist titled simply **"LLM Wiki."**
Not an app — an *idea file*, meant to be pasted into an agent like Claude Code.
The pattern:

- **`raw/`** holds unprocessed source material (articles, transcripts, notes,
  chats), immutable, kept forever.
- An **agent reads `raw/` once**, extracts concepts and entities, and writes
  **structured, interlinked markdown pages into `wiki/`.**
- It **cross-links** every page, maintains an **`index.md`**, and appends every
  operation to a **`log.md`.**
- Three governance files run it: **`agents.md`** (instructions), **`index.md`**
  (catalog), **`log.md`** (history).
- It runs as a **loop**: check `raw/` for new material, synthesize, link, log,
  file the source as processed. Optionally hourly, optionally auto-committed.

**The insight, stated plainly:** most "second brains" fail not from lack of
content but from lack of *structure an LLM can navigate*. "You can have ten
thousand notes and still get worse answers than someone with fifty
well-organized ones." The shift is that the LLM is no longer a chat interface
*on top of* your notes — it is the mechanism that **organizes, summarizes,
links, and continuously updates** the knowledge itself. This beats plain RAG
because RAG retrieves raw chunks, while the wiki **pre-synthesizes** raw
material into dense, reasoned pages the model reasons over far better.

That is the whole of it. It is a beautiful, minimal pattern. It is also — and
this matters for us — **only the substrate.** Karpathy described how to grow
good tissue. He did not describe how to grow a *face*.

---

## 2. What `wiki-brain` already is (full credit)

The last attempt did not miss Karpathy's pattern. It **exceeded** it. As it
stands today the source graph is:

- **~320 compiled pages** across nine domains (self, timeline, people, mind,
  work, interests, health, places, legal).
- **~700 typed edges**, each a *relationship type from a fixed vocabulary plus
  one argued claim sentence* — not "related to," but `supplies` / `evidenced-by`
  / `contradicts` / `component-of` with a falsifiable claim attached.
- **~1,000 sources**, every load-bearing fact traced to a raw file on disk.
- **~240,000 words** of earned prose.
- A **synthesis altitude** system (`CLIMB`): ground pages carry entities read
  from `raw/`; junction pages carry the pattern found across three or more of
  them; doctrine carries the rule found across junctions — each layer declaring
  its premises with `synthesizes:` so the dependency is checkable and can go
  **stale** when a premise moves.
- A real **falsifiability discipline**: when a conclusion is proven wrong, the
  failure stays on the page and the rule gets wider and truer. *That* — a rule
  that exists in no source anywhere, produced by the graph reading itself — is
  what the system is for.
- A full **ingestion loop** with a local app, capture tooling, queues, lint,
  and an agent-readable published feed.

This is Karpathy's wiki taken all the way to a **reasoning engine.** We keep all
of it. The Singularity brain is not a replacement for `wiki-brain`; it is its
**face**, and `wiki-brain` remains the private substrate underneath.

---

## 3. Where it fell short — precisely

Not the machinery. Four things, and the evidence for each is in the graph
itself:

1. **It doesn't grow on its own, so in practice it stopped.** Growth is
   entirely operator-driven — it expands only when Dan sits down and feeds it —
   and that has proven unsustainable across *at least three* attempts (there is
   a literal `(failed-wiki-project)` archive in the raw tree). The most recent
   operator energy went into **rewriting the same page twice**, not extending
   coverage. A second brain that requires unbroken discipline to grow will keep
   dying the same way. **Growth has to become something you *want* to feed
   because you can *watch* it expand.**

2. **Its center of mass drifted onto one subject.** `people: 208` against
   `work: 6`, `health: 1`, `places: 3`. The graph over-indexed on the
   relationship because that is where the *raw data* (the message corpus) was
   densest — not because it is the most representative of the whole person. Dan
   has said it directly: deemphasize Annie. She is pivotal, but she is one
   region, not the gravity well. **The comprehensive self is work, ideas,
   taste, mind, history, place — and those are the thin domains.**

3. **It has no apex.** It represents Dan as a corpus of arguments an LLM can
   *read*. There is no top-level **self-model** the whole graph rolls up into —
   the thing that answers "who is this person" as a single, coherent,
   continuously re-derived whole. The altitude system climbs from ground to
   doctrine but stops short of the summit: the person.

4. **It never became experiential.** It is private plumbing — markdown, a local
   Python app, an agent feed. Nothing *renders* it. You cannot see the mind,
   watch it accrete, feel its shape, or find its edges. "Attempting to represent
   ME" is stated as the purpose and embodied nowhere you can stand and look at.

---

## 4. The thesis — what we are actually building

> **A public, living, self-rendering model of a person** that (a) is a real
> typed argument-graph, not notes and not RAG; (b) grows by LLM ingestion; (c)
> renders as an experiential mind you navigate; and (d) treats *"represent me"*
> as an explicit, measurable, self-auditing target — the graph reasoning about
> its own completeness, its own contradictions, and its own frontier.

Each of those exists somewhere in isolation. The **fusion** — a genuine
reasoning-graph that is *also* a growing public organism that *also* models its
own completeness — is the part we cannot find prior art for. That is the swing.

It also lands naturally in **THE SINGULARITY** wing: a point where the accreted
mass of a life collapses into something that reasons about itself. The
black-hole aesthetic is not decoration — it is the data model. **Altitude is
depth.** Ground facts orbit at the rim; junctions fall inward; doctrine burns
near the core; and at the very center is the self-model — the thing everything
else is falling toward.

---

## 5. The design

### 5.1 The substrate feed
`wiki-brain` stays the source of truth and stays private. The Singularity reads
a **compiled, opaque projection** of it — never the private prose. Per the
locked decision (§9), the projection is **fully anonymized topology**: nodes
carry no title, no summary, no sources, no readable text of any kind. Concretely:

```
node   := { id: opaque-hash, domain, altitude, mass }   // NO title, NO gloss, NO sources
edge   := { from: opaque-hash, to: opaque-hash, type }   // NO claim text
domains := { <domain>: count }                           // the district sizes
frontier := { domain, gap, weight }                      // named holes the graph knows it has
```

- `id` is a stable hash of the real page path, so edges resolve consistently
  while the path itself (which can name a person or a condition) never ships.
- `altitude` ∈ {ground, junction, doctrine} — derived from page type, drives depth.
- `mass` — how load-bearing the node is (degree × sources × words), drives
  gravity and size.
- The **only** readable text in the whole public projection is a single,
  separately-**curated** self-portrait (§5.3) that Dan approves by hand — it is
  never auto-extracted from private prose. Everything else is gravity.

### 5.2 The rendering — the mind you fall into
A WebGL / canvas force-graph in the Singularity palette:

- **Depth = altitude.** Doctrine and the self-model at the core; ground at the
  rim; you literally descend toward meaning.
- **Regions = domains.** Nine luminous districts. Their *size on screen is their
  coverage* — so the relationship region is visibly one district among many, and
  the thin domains (work, place, health) read as **underbuilt**, which is the
  honest picture and the invitation to build them.
- **Edges are arguments, not lines.** Hovering an edge shows its typed claim.
  Traversing a chain of typed edges *is* reading an argument the graph composes
  (X supplies Y, Y ruptures Z).
- **Frontiers glow.** The gaps the graph knows about are rendered as cold, empty
  space with a labelled pull — "work: 6 pages, thinnest domain." The holes are
  first-class citizens, because naming the hole is what makes you want to fill
  it.
- **Determinism**, as everywhere on this site: the same graph renders the same
  mind; a node's position is seeded by its id.

### 5.3 The apex — the self-model
A single continuously re-derived page/artifact at the center: **the portrait.**
It is *earned*, not hand-written — regenerated from the doctrine layer whenever
the graph changes, and it carries its own **tensions** (the live contradictions
the graph hasn't resolved) and **growth edges** (what it most needs next). This
is the "represent ME" made into an object you can point at, and — critically —
into a *number*: a completeness/representativeness score per domain that the
mind wears on its face.

### 5.4 The growth loop, made visible
The failure mode is that growth stops. The fix is to make growth the most
rewarding thing on the page:

- Every ingestion **visibly accretes** — new nodes fall in, mass shifts,
  frontiers shrink, the completeness meter moves. You *watch yourself expand.*
- The mind **asks for what it lacks.** The frontier list is a to-do list the
  graph writes about itself — "you are 1 page deep on health; 6 on work."
- Ingestion stays the `wiki-brain` loop (that machinery is good); the Singularity
  is the **dashboard and the reward** that makes the loop worth running.

---

## 6. The decision that gates everything: privacy — LOCKED

**THE SINGULARITY IS THE PUBLIC, UNGATED WING.** The `wiki-brain` graph contains
some of the most sensitive material a person has — health and substance detail,
sexual and financial specifics, real people named with real handles. **None of
that can be rendered publicly and ungated.** This is not a small caveat; it is
the first architectural decision, and I will not ship a build that resolves it
by accident.

**Dan's decision (2026-07-31): a new consent layer + only the self-overview
readable + live sync.** The most conservative posture on the board, and the
right one for a public model of a real person. In practice this is stricter
than the original "abstract-by-default": there, marked nodes could ship a
`gloss`; here, **nothing ships readable except one hand-curated self-portrait.**

The build therefore fails closed at the hardest setting:

- **Every node is gravity.** The projection is anonymized topology — opaque
  hashes, domain, altitude, mass, edge types — and carries **no title, no
  summary, no sources, no claim text.** There is no per-node readable content to
  leak because there is none in the file. The relationship and health districts
  are present as mass and pull on everything; they cannot be opened because there
  is nothing inside them to open.
- **One readable surface: the self-portrait.** A single curated apex text (§5.3)
  that Dan writes/approves by hand. It is never auto-extracted from the private
  prose; the pipeline cannot promote a private page to readable.
- **A consent layer** stands in front of the whole thing — a third posture,
  lighter than the Temple's quiz→curtain→passphrase but a deliberate threshold
  and acknowledgement before the mind opens.
- **Live sync**, with the redaction running **inside** the sync so the fail-closed
  rule is enforced on every update, not once at build time.

---

## 7. Phases

Each phase is independently shippable. We stop and look after each.

- **Phase 0 — this document.** Align on the thesis and the three forks. *(here)*
- **Phase 1 — the projection.** A build step (`tools/build-brain.py`, reading a
  `wiki-brain` checkout) that emits the redacted `data/brain.json` under the
  fail-closed rule. No UI yet. Deliverable: the safe, curated graph, and a report
  of exactly what is and isn't public.
- **Phase 2 — the static mind.** The Singularity graph renderer over
  `brain.json`: depth = altitude, regions = domains, glowing frontiers, hoverable
  typed-edge arguments. Read-only, deterministic. This is the "holy shit" ship.
- **Phase 3 — the apex.** The derived self-model at the core; the completeness
  meter; tensions and growth-edges surfaced.
- **Phase 4 — the loop, visible.** Wire ingestion so new material accretes on
  screen; the frontier becomes the to-do list; growth becomes the reward.
- **Phase 5 — rebalance.** Actively drive coverage toward the thin whole-person
  domains, using the meter as the target. This is where "comprehensive" and
  "deemphasize Annie" actually happen — as *build direction*, not a setting.

---

## 8. What stays true to the rest of the site

- **The Rule / determinism** carries over: same graph → same mind, seeded
  positions, no editorializing beyond what the typed claims already assert.
- **The generative score** plays here too.
- It reuses the Singularity palette and the black-hole vocabulary already
  shipped — the encyclopedia and the brain are two organs of the same wing.

---

## 9. Decisions — LOCKED (2026-07-31)

1. **Privacy posture → a new consent layer.** Not the Temple gate, not wide
   open: the brain gets its own deliberate threshold, and the projection behind
   it is fully opaque (§6).
2. **Public/private line → only the self-overview is readable.** All nine
   domains render as shape/gravity; the single curated self-portrait is the only
   readable text. Every underlying node — Annie included — is gravity, present
   and unreadable.
3. **Source coupling → live sync now.** The projection is built inside the
   existing `wiki-brain` sync so the mind updates when the brain moves, with the
   fail-closed redaction enforced on every sync.

## 10. Build status

- **Phase 1 — the opaque projection: IN PROGRESS.** `tools/build-brain.js`
  compiles `data/wiki-data.json` (itself the synced projection of `wiki-brain`)
  into `data/brain.json`: anonymized nodes (opaque id, domain, altitude, mass)
  and edges (opaque endpoints, type only). Fail-closed — the builder asserts the
  output carries no title, summary, source, or claim text before it writes. The
  readable self-portrait and the consent layer arrive with Phase 2 (the
  renderer).
