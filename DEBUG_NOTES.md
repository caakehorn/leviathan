# Transcript trap debug notes

The non-empty human-verification path is intentionally a decoy. The decoy should match `transcript.html` visually while revealing messages slowly.

Known failure mode fixed in `js/quiz.js`: the previous implementation extracted and mutated the real transcript's inline renderer by string replacement. That was brittle because it depended on exact source text matching (`var CHUNK=1500` and the exact `render()` function body). The replacement could silently fail as `transcript.html` evolved.

The replacement renderer copies the real transcript DOM/CSS shell and consumes `data/transcript.json` directly, constructing the same row structure with DOM APIs. This removes the source-code surgery entirely and keeps the fake presentation coupled to the real transcript's markup instead of its implementation details.
