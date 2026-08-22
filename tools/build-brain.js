#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// build-brain — compile the knowledge graph into the renderable mind.
//
// THE SINGULARITY BRAIN (see docs/SINGULARITY-BRAIN.md).
//
// Input:  data/wiki-data.json — the compiled projection of the wiki-brain repo,
//         already synced into this repo by .github/workflows/sync-wiki.yml.
// Output: data/brain.json     — the IDENTIFIED graph. Every node is tied to the
//         wiki entry it represents, carries that entry's identity, and carries
//         an infobox of synthetics derived from the topology.
//
// ── WHY THIS IS NO LONGER OPAQUE (changed 2026-08-01) ────────────────────────
// Phase 1 shipped an anonymized projection: opaque hashes, no titles, no claim
// text. The reasoning was a privacy posture. That reasoning does not survive
// contact with how the site is actually assembled:
//
//   brain.html and wiki.html are sealed by THE SAME GATE — js/singate.js,
//   consent + IP + name + passphrase — and wiki.html serves the FULL TEXT of
//   all 325 pages behind it.
//
// So the anonymization never protected anything. Any visitor who can open the
// mind can already open the reader and read every page in full. All the hashing
// achieved was making the one surface that should be most legible the only one
// that is deliberately unreadable — a graph you cannot learn anything from,
// sitting next to a reader that tells you everything.
//
// The gate is still the privacy boundary and is unchanged. This builder now
// assumes it, rather than re-implementing a second, weaker boundary behind it.
// The guard below therefore checks INTEGRITY (every node resolves to a real
// entry, every edge lands on a real node) instead of opacity, and still fails
// closed: a structurally broken graph is never written.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IN = path.join(ROOT, 'data', 'wiki-data.json');
const OUT = path.join(ROOT, 'data', 'brain.json');

// page_type → altitude. Altitude is depth in the render: doctrine burns at the
// core, ground orbits the rim. Structural index pages carry no knowledge and are
// dropped entirely.
const ALTITUDE = {
  synthesis: 'doctrine',
  concept: 'junction', profile: 'junction',
  entity: 'ground', event: 'ground', chat: 'ground',
  report: 'ground', summary: 'ground', period: 'ground',
  index: null   // drop
};

// Altitude → the ladder tier named in wiki-brain's SYNTHESIS_SPEC.md.
const TIER = { ground: 'T1', junction: 'T2', doctrine: 'T3' };

const clamp = (x) => +x.toFixed(4);

function main() {
  if (!fs.existsSync(IN)) {
    console.error('build-brain: missing ' + path.relative(ROOT, IN));
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const pages = (data.wikiPages && data.wikiPages.pages) || [];
  if (!pages.length) { console.error('build-brain: no pages in input'); process.exit(1); }

  // ── Pass 1: nodes ──────────────────────────────────────────────────────────
  const kept = new Map();            // id -> page
  let rawMax = 0;
  const rawOf = new Map();
  for (const p of pages) {
    const alt = ALTITUDE[p.page_type];
    if (!alt) continue;
    const raw = (p.links || []).length + (p.connections || []).length +
      (p.sources || []).length * 1.5 + (p.words || 0) / 500;
    rawMax = Math.max(rawMax, raw);
    rawOf.set(p.id, raw);
    kept.set(p.id, p);
  }

  // ── Pass 2: edges ──────────────────────────────────────────────────────────
  // Typed connections carry their argued claim now — the claim IS the knowledge,
  // and hiding it was the single biggest loss in the opaque projection. Plain
  // wikilinks stay typed 'links' and carry no claim, because they never had one.
  const edges = [];
  const seen = new Set();
  for (const p of pages) {
    if (!kept.has(p.id)) continue;
    const push = (target, type, claim) => {
      if (!kept.has(target) || target === p.id) return;
      const key = p.id + '>' + target + '>' + type;
      if (seen.has(key)) return;
      seen.add(key);
      const e = { from: p.id, to: target, type: String(type || 'relates') };
      if (claim) e.claim = String(claim);
      edges.push(e);
    };
    for (const c of (p.connections || [])) push(c.page, c.type || 'relates', c.claim);
    for (const l of (p.links || [])) push(l, 'links', null);
  }

  // ── Pass 3: the derived layer ──────────────────────────────────────────────
  // Everything below exists in no wiki page. It is what the graph knows about
  // itself once you look at it as a graph, and it is the reason a node is worth
  // clicking: identity tells you WHAT this is, the infobox tells you what it
  // DOES in the structure around it.
  const ids = [...kept.keys()];
  const ix = new Map(ids.map((id, i) => [id, i]));
  const nbr = ids.map(() => new Set());          // undirected neighbours
  const outAdj = ids.map(() => []);              // directed, for pagerank
  const stat = ids.map(() => ({
    deg: 0, indeg: 0, outdeg: 0, cross: 0, within: 0,
    contested: 0, districts: new Set(), types: {}
  }));

  for (const e of edges) {
    const a = ix.get(e.from), b = ix.get(e.to);
    const pa = kept.get(e.from), pb = kept.get(e.to);
    nbr[a].add(b); nbr[b].add(a);
    outAdj[a].push(b);
    stat[a].outdeg++; stat[b].indeg++;
    stat[a].deg++; stat[b].deg++;
    stat[a].types[e.type] = (stat[a].types[e.type] || 0) + 1;
    stat[b].types[e.type] = (stat[b].types[e.type] || 0) + 1;
    stat[a].districts.add(pb.domain); stat[b].districts.add(pa.domain);
    if (pa.domain === pb.domain) { stat[a].within++; stat[b].within++; }
    else { stat[a].cross++; stat[b].cross++; }
    if (e.type === 'contradicts') { stat[a].contested++; stat[b].contested++; }
  }

  const pr = pagerank(ids.length, outAdj);
  const prSorted = pr.slice().sort((a, b) => a - b);
  const prPct = (v) => clamp(lowerRank(prSorted, v) / (prSorted.length - 1 || 1));

  const tagsOf = ids.map((id) => new Set(kept.get(id).tags || []));
  const kin = nearestKin(ids, nbr, tagsOf, kept);

  const nodes = ids.map((id, i) => {
    const p = kept.get(id);
    const s = stat[i];
    const conn = s.cross + s.within;
    const alt = ALTITUDE[p.page_type];
    return {
      // ── identity: the node IS the entry ──
      id: id,
      title: p.title || id.split('/').pop(),
      domain: p.domain,
      page_type: p.page_type,
      status: p.status || 'unknown',
      altitude: alt,
      mass: rawMax ? clamp(rawOf.get(id) / rawMax) : 0,
      summary: trim(p.summary, 320),
      tags: p.tags || [],
      created: p.created || null,
      // ── the infobox: derived, in no source ──
      box: {
        tier: TIER[alt],
        words: p.words || 0,
        sources: (p.sources || []).length,
        arguments: s.deg,
        inbound: s.indeg,
        outbound: s.outdeg,
        districts: s.districts.size,
        reach: clamp(conn ? s.cross / conn : 0),
        rank: prPct(pr[i]),
        contested: s.contested,
        role: role(s, alt, conn),
        types: s.types,
        kin: kin[i]
      }
    };
  });

  const domains = {};
  for (const n of nodes) domains[n.domain] = (domains[n.domain] || 0) + 1;
  const maxDom = Math.max(...Object.values(domains));
  const frontier = Object.entries(domains)
    .map(([domain, count]) => ({ domain, count, weight: clamp(1 - count / maxDom) }))
    .sort((a, b) => b.weight - a.weight);

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    schema: 'brain/identified-1',
    source: data.source || 'wiki-brain',
    source_commit: data.source_commit || null,
    counts: { nodes: nodes.length, edges: edges.length, domains: Object.keys(domains).length },
    domains: domains,
    frontier: frontier,
    self: selfModel(nodes, edges, domains),
    nodes: nodes,
    edges: edges
  };

  assertIntact(out);
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  report(out);
}

function trim(s, n) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

function lowerRank(sorted, v) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
  return lo;
}

// Standard damped power iteration. Rank is reported as a percentile so it stays
// meaningful as the graph grows — "more load-bearing than 96% of the mind".
function pagerank(n, outAdj, d = 0.85, iters = 40) {
  let r = new Array(n).fill(1 / n);
  for (let t = 0; t < iters; t++) {
    const next = new Array(n).fill((1 - d) / n);
    let dangling = 0;
    for (let i = 0; i < n; i++) {
      const outs = outAdj[i];
      if (!outs.length) { dangling += r[i]; continue; }
      const share = d * r[i] / outs.length;
      for (const j of outs) next[j] += share;
    }
    const spread = d * dangling / n;
    for (let i = 0; i < n; i++) next[i] += spread;
    r = next;
  }
  return r;
}

// Nearest kin — the genuinely new column. Similarity is neighbour-set overlap
// plus tag overlap, so it finds pages that occupy the same structural position
// whether or not anyone has ever linked them. A high-similarity pair with NO
// edge between them is exactly what wiki-brain's connection queue is looking
// for, surfaced here per node and marked `linked: false`.
function nearestKin(ids, nbr, tagsOf, kept) {
  const jac = (a, b) => {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    const [s, l] = a.size < b.size ? [a, b] : [b, a];
    for (const v of s) if (l.has(v)) inter++;
    return inter / (a.size + b.size - inter);
  };
  return ids.map((id, i) => {
    const scored = [];
    for (let j = 0; j < ids.length; j++) {
      if (j === i) continue;
      const score = 0.65 * jac(nbr[i], nbr[j]) + 0.35 * jac(tagsOf[i], tagsOf[j]);
      if (score > 0.08) scored.push({ j, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map(({ j, score }) => ({
      id: ids[j],
      title: kept.get(ids[j]).title || ids[j].split('/').pop(),
      domain: kept.get(ids[j]).domain,
      score: clamp(score),
      linked: nbr[i].has(j)
    }));
  });
}

// A plain-language role, so the infobox says what the node DOES rather than only
// what it scores. Ordered most-specific first.
function role(s, alt, conn) {
  if (!s.deg) return 'orphan';
  if (s.contested) return 'contested';
  if (alt === 'doctrine' && s.indeg >= 3) return 'load-bearing';
  if (conn >= 6 && s.cross / conn >= 0.6) return 'bridge';
  if (s.deg >= 12) return 'hub';
  if (s.indeg >= 4 && s.outdeg <= 2) return 'cited';
  if (s.deg <= 2) return 'leaf';
  return 'member';
}

// ── the self-model ───────────────────────────────────────────────────────────
// The apex. The graph describing ITSELF, derived only from its own shape. Every
// statement is a count or a ratio rendered by a fixed template — nothing here is
// an opinion about the person; it is an audit of how much of the person has been
// written down, and how much thinking sits on top of what was written.
//
//   VOLUME — the district's share of all nodes, against the largest district.
//   LIFT   — the share of the district that is conclusion, not raw ground fact.
//   BUILT  — their geometric mean, so all-volume-no-lift scores low on purpose.
function selfModel(nodes, edges, domains) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const D = {};
  for (const n of nodes) {
    const d = D[n.domain] || (D[n.domain] = { domain: n.domain, n: 0, ground: 0, junction: 0, doctrine: 0, deg: 0, cross: 0, within: 0 });
    d.n++; d[n.altitude]++;
  }
  let tensions = 0, cross = 0, within = 0;
  for (const e of edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) continue;
    D[a.domain].deg++; D[b.domain].deg++;
    if (a.domain === b.domain) { within++; D[a.domain].within++; }
    else { cross++; D[a.domain].cross++; D[b.domain].cross++; }
    if (e.type === 'contradicts') tensions++;
  }

  const total = nodes.length;
  const maxN = Math.max(...Object.values(D).map(d => d.n));
  const composition = Object.values(D).map(d => {
    const conn = d.cross + d.within;
    const volume = d.n / maxN;
    const lift = d.n ? (d.junction + d.doctrine) / d.n : 0;
    return {
      domain: d.domain, count: d.n,
      share: clamp(d.n / total),
      ground: d.ground, junction: d.junction, doctrine: d.doctrine,
      volume: clamp(volume), lift: clamp(lift),
      built: clamp(Math.sqrt(volume * lift)),
      reach: clamp(conn ? d.cross / conn : 0),
      density: +(d.n ? d.deg / d.n : 0).toFixed(2)
    };
  }).sort((a, b) => b.count - a.count);

  const alt = { ground: 0, junction: 0, doctrine: 0 };
  for (const n of nodes) alt[n.altitude]++;

  const pct = (x) => Math.round(x * 100);
  const big = composition[0];
  const flat = composition.filter(c => !c.junction && !c.doctrine);
  const inverted = composition.filter(c => c.count >= 5 && !c.ground);
  const thin = composition.slice().sort((a, b) => a.count - b.count)[0];
  const densest = composition.slice().sort((a, b) => b.density - a.density)[0];
  const orphans = nodes.filter(n => !n.box.arguments).length;
  const unlinkedKin = nodes.reduce((a, n) => a + n.box.kin.filter(k => !k.linked && k.score >= 0.3).length, 0);

  const S = [];
  S.push(pct(big.share) + '% of this mind is ' + big.domain + '.');
  S.push(pct(alt.ground / total) + '% of it is raw fact. Only ' +
    pct(alt.doctrine / total) + '% is conclusion.');
  if (flat.length) {
    S.push(flat.length + ' of its ' + composition.length +
      ' districts carry nothing above ground level' +
      (flat.some(c => c.domain === big.domain)
        ? ' — including the largest, which has ' + big.count + ' facts and no conclusions drawn from them.'
        : ': ' + flat.map(c => c.domain).join(', ') + '.'));
  }
  if (inverted.length) {
    S.push('One district is inverted: ' + inverted[0].domain + ' is ' + inverted[0].count +
      ' nodes of pure conclusion resting on no ground of its own.');
  }
  S.push(pct(cross / (cross + within)) + '% of its arguments cross a district line, so it is ' +
    'more interconnected than compartmented.');
  S.push('It contradicts itself in ' + tensions + ' place' + (tensions === 1 ? '' : 's') +
    ', and those contradictions are kept rather than resolved away.');
  S.push('Its thinnest district, ' + thin.domain + ', holds ' + thin.count +
    ' node' + (thin.count === 1 ? '' : 's') + '. Its densest, ' + densest.domain +
    ', averages ' + densest.density.toFixed(1) + ' arguments per node.');
  if (orphans) {
    S.push(orphans + ' node' + (orphans === 1 ? ' is' : 's are') + ' connected to nothing at all, ' +
      'which is a hole in the graph rather than a fact about the life.');
  }
  if (unlinkedKin) {
    S.push('It can see ' + unlinkedKin + ' pairs of pages that sit in the same structural position ' +
      'and have never been connected — the work it already knows is waiting.');
  }

  return {
    derived_at: new Date().toISOString().slice(0, 10),
    altitude: alt,
    tensions: tensions,
    orphans: orphans,
    unlinked_kin: unlinkedKin,
    integration: clamp(cross / (cross + within)),
    composition: composition,
    statements: S,
    method: 'VOLUME = share of nodes vs largest district. LIFT = share of the ' +
      'district that is conclusion, not raw fact. BUILT = geometric mean of the two. ' +
      'RANK = PageRank percentile over the argument graph. KIN = neighbour-set and ' +
      'tag overlap, so an unlinked kin pair is a connection the graph has not made yet.'
  };
}

// ── the guard ────────────────────────────────────────────────────────────────
// Fails closed on a structurally broken graph. The opacity guard this replaces
// enforced a boundary that js/singate.js already enforces upstream and better;
// what actually needs guarding is that every node resolves to a real wiki entry
// and no edge dangles, because a mind that renders nodes it cannot explain is
// exactly the failure this rewrite exists to fix.
function assertIntact(out) {
  const ALT = new Set(['ground', 'junction', 'doctrine']);
  const SAFE_WORD = /^[a-z][a-z0-9-]{0,40}$/;
  const fail = (m) => { console.error('build-brain: FAIL-CLOSED — ' + m); process.exit(2); };

  const ids = new Set();
  for (const n of out.nodes) {
    if (!n.id || !/^wiki\//.test(n.id)) fail('node id is not a wiki entry path: ' + n.id);
    if (ids.has(n.id)) fail('duplicate node id: ' + n.id);
    ids.add(n.id);
    if (!n.title) fail('node has no title, so it cannot be tied to its entry: ' + n.id);
    if (!SAFE_WORD.test(n.domain)) fail('node domain looks unsafe: ' + n.domain);
    if (!ALT.has(n.altitude)) fail('node altitude not an enum: ' + n.altitude);
    if (typeof n.mass !== 'number') fail('node mass not a number: ' + n.id);
    if (!n.box || typeof n.box.arguments !== 'number') fail('node has no infobox: ' + n.id);
    if (!Array.isArray(n.box.kin)) fail('node infobox has no kin array: ' + n.id);
    for (const k of n.box.kin) if (!ids.has(k.id) && !k.id.startsWith('wiki/')) fail('kin id malformed on ' + n.id);
  }
  for (const e of out.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) fail('edge endpoint is not a node: ' + e.from + ' -> ' + e.to);
    if (!SAFE_WORD.test(e.type)) fail('edge type looks unsafe: ' + e.type);
  }
  for (const n of out.nodes) {
    for (const k of n.box.kin) if (!ids.has(k.id)) fail('kin points off-graph from ' + n.id + ': ' + k.id);
  }

  const s = out.self;
  if (!s || !Array.isArray(s.statements) || !s.statements.length) fail('self-model missing');
  for (const c of s.composition) {
    if (!Object.prototype.hasOwnProperty.call(out.domains, c.domain)) fail('self composition names an unknown domain: ' + c.domain);
  }
}

function report(out) {
  const w = (s) => process.stdout.write(s + '\n');
  const claims = out.edges.filter(e => e.claim).length;
  w('build-brain — data/brain.json written  [' + out.schema + ']');
  w('  source_commit : ' + (out.source_commit || '(none)'));
  w('  nodes         : ' + out.counts.nodes + '   edges: ' + out.counts.edges +
    '   argued claims: ' + claims);
  w('  domains       :');
  Object.entries(out.domains).sort((a, b) => b[1] - a[1])
    .forEach(([d, c]) => w('      ' + d.padEnd(10) + ' ' + String(c).padStart(4)));
  w('  frontier (thinnest first):');
  out.frontier.slice(0, 4).forEach(f =>
    w('      ' + f.domain.padEnd(10) + ' count ' + String(f.count).padStart(4) + '   pull ' + f.weight));
  w('  derived       : pagerank, reach, districts, role, kin' +
    '   (orphans ' + out.self.orphans + ', unlinked kin pairs ' + out.self.unlinked_kin + ')');
  w('  integrity     : every node ties to a wiki entry, no dangling edges');
}

main();
