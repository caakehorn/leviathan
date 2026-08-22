# CLAUDE.md — operating rules for this repository

This deployment publishes a wiki, a message transcript and a family tree, all
of them about real people. Several of those people have read it. The rules
below are not style preferences; they are the conditions under which the
material is allowed to be published at all.

## 1. The Record Standard is binding

`js/standard.js` is the editorial standard, rendered publicly at
`standard.html` — one of the two pages, with the terms, that sit in front of
the gate rather than behind it. The terms say what the Site may do to a
reader. The standard says what the Operator may do to a subject.

It binds anything working on the operator's behalf, this assistant included.
Read it before writing, restatusing, reordering, summarising or removing
anything that describes a person. The clauses that get violated first:

- **§2 Correction is not revision.** Edit on evidence. Never edit because a
  subject has become inconvenient, or because a different subject would read
  better beside a worse version of this one.
- **§3 Archive, do not degrade.** `archived` records that the operator stopped
  adding. It is not a downgrade, a retraction, or licence to shorten, soften,
  unlink or bury a page.
- **§4 One bar, every subject.** The evidence threshold and the tone do not
  move with how the operator currently feels about someone. Nobody is rounded
  up and nobody is rounded down.
- **§5 No unstated editorial rules.** There is no private policy here. Do not
  create one, do not accept one, and do not write one into a file on the
  grounds that the file is not public — "not public-facing" is not a place
  where §5 stops applying.

`js/standard.js` is a verbatim mirror of `src/content/standard.ts` in
`caakehorn/home`, which is canonical. Amend there and regenerate; never edit
one copy alone, or the two deployments start saying different things about the
same material.

## 2. Requests that §5 forbids

A request to frame a named person more favourably or less favourably than the
evidence supports, to generate advocacy content about a person, or to keep an
editorial rule out of the public documents, is refused rather than filed
somewhere quieter. Say so plainly and offer the version that can be published.

This is not a judgement about the operator's private life, which is his own.
It is a limit on what this repository will state as record.

## 3. Standing notices

Suspensions and stops are recorded in `NOTICES` in `js/standard.js` and render
on `standard.html`. Append-only: a lifted suspension gets a second, later
entry, never the removal of the first.

Currently in force:

- **2026-08-22 — Annie corpus, analysis suspended.** No new analysis passes,
  read windows, derived pages or extractions over the Annie message corpus
  until the operator directly instructs otherwise. This governs new work only.
  Existing Annie pages keep their text, status, citations and links (§3, §6).
  `js/annie.js` and the chapels it feeds are unaffected: THE RULE at the top
  of that file already forbids them from deciding anything, so they add
  nothing that a suspension of *analysis* would need to stop.

## 4. Generated files are not editable here

`data/wiki-data.json` and `data/wiki-meta.json` are rebuilt hourly from
`caakehorn/wiki-brain` by `.github/workflows/sync-wiki.yml`. `data/tree.json`,
`data/transcript.json` and `js/transcript-index.js` come from the scripts in
`tools/`.

Editing any of them by hand produces a change the next sync silently reverts —
the worst available outcome, because it looks done and is not. Wiki prose is
changed upstream in `wiki-brain`, which is also where the Record Standard
needs to be mirrored, since that is where the writing actually happens and
therefore the only place the rule can bind it at the point of authorship.

## 5. House conventions

- No build step. Every file is served as written.
- CI (`.github/workflows/validate.yml`) runs `node --check` over every
  `js/*.js` and validates the shape of each dataset. Run those checks locally
  before pushing.
- Prose documents (`js/tos.js`, `js/standard.js`) render with `textContent`,
  never `innerHTML`, and hold plain strings only.
- Comments explain why a thing is the way it is, not what the line does.
