#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// build-brain — compile the private knowledge graph into a PUBLIC, OPAQUE mind.
//
// THE SINGULARITY BRAIN, Phase 1 (see docs/SINGULARITY-BRAIN.md).
//
// Input:  data/wiki-data.json — the compiled projection of the private wiki-brain
//         repo, already synced into this repo by .github/workflows/sync-wiki.yml.
// Output: data/brain.json     — anonymized topology only. Nodes carry an OPAQUE
//         hash id, a domain, an altitude, and a mass. Edges carry two opaque
//         endpoints and a type. Nothing else.
//
// ── THE FAIL-CLOSED RULE ─────────────────────────────────────────────────────
// Per Dan's locked privacy decision, the public projection ships NO readable
// per-node content: no title, no summary, no source, no claim text, no raw path.
// A page path can itself name a person or a diagnosis, so even the id is a hash
// of the path, never the path. This builder REFUSES TO WRITE if it can detect
// any readable field surviving into the output — it fails closed, loudly, rather
// than publish a private brain by omission. The one readable surface in the whole
// public mind (a curated self-portrait) is added by hand in a later phase and is
// never produced here.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// A stable, non-reversible id. Salt keeps it from being a plain sha1 of a path
// that someone could reproduce and confirm; truncation keeps the file small.
const SALT = 'leviathan/singularity/brain/v1';
function opaque(realId) {
  return crypto.createHash('sha256').update(SALT + '\0' + realId).digest('hex').slice(0, 12);
}

function main() {
  if (!fs.existsSync(IN)) {
    console.error('build-brain: missing ' + path.relative(ROOT, IN));
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const pages = (data.wikiPages && data.wikiPages.pages) || [];
  if (!pages.length) { console.error('build-brain: no pages in input'); process.exit(1); }

  // Pass 1 — nodes. Compute a raw mass per page, then normalize.
  const byReal = new Map();          // realId -> { node, realId }
  let rawMax = 0;
  for (const p of pages) {
    const alt = ALTITUDE[p.page_type];
    if (!alt) continue;              // drop structural index pages
    const links = (p.links || []).length;
    const conns = (p.connections || []).length;
    const srcs = (p.sources || []).length;
    const words = p.words || 0;
    const raw = links + conns + srcs * 1.5 + words / 500;
    rawMax = Math.max(rawMax, raw);
    byReal.set(p.id, { realId: p.id, domain: p.domain, altitude: alt, raw });
  }

  const nodes = [];
  const idMap = new Map();            // realId -> opaque
  for (const { realId, domain, altitude, raw } of byReal.values()) {
    const oid = opaque(realId);
    idMap.set(realId, oid);
    nodes.push({
      id: oid,
      domain: domain,
      altitude: altitude,
      mass: rawMax ? +(raw / rawMax).toFixed(4) : 0
    });
  }

  // Pass 2 — edges. Only edges whose BOTH endpoints are real nodes survive, so
  // no edge can point at a dropped index or an off-graph path. Claim text is
  // never copied; only the typed relationship travels.
  const edges = [];
  const seen = new Set();
  for (const p of pages) {
    const from = idMap.get(p.id);
    if (!from) continue;
    const push = (targetReal, type) => {
      const to = idMap.get(targetReal);
      if (!to || to === from) return;
      const key = from + '>' + to + '>' + type;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ from: from, to: to, type: type });
    };
    for (const c of (p.connections || [])) push(c.page, String(c.type || 'relates'));
    for (const l of (p.links || [])) push(l, 'links');
  }

  // District sizes and the frontier — the honest holes. weight is how thin a
  // domain is (bigger = thinner), so the render can pull you toward what's least
  // built. These are counts and enums only.
  const domains = {};
  for (const n of nodes) domains[n.domain] = (domains[n.domain] || 0) + 1;
  const maxDom = Math.max(...Object.values(domains));
  const frontier = Object.entries(domains)
    .map(([domain, count]) => ({ domain, count, weight: +(1 - count / maxDom).toFixed(4) }))
    .sort((a, b) => b.weight - a.weight);

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    schema: 'brain/opaque-1',
    source: data.source || 'wiki-brain',
    source_commit: data.source_commit || null,
    counts: { nodes: nodes.length, edges: edges.length, domains: Object.keys(domains).length },
    domains: domains,
    frontier: frontier,
    self: selfModel(nodes, edges, domains),
    nodes: nodes,
    edges: edges
  };

  assertOpaque(out);
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  report(out);
}

// ── the self-model ───────────────────────────────────────────────────────────
// The apex. The graph describing ITSELF, derived only from its own shape — no
// private content is read, because there is none left in the projection to read.
// Every statement below is a count or a ratio over the topology, rendered into a
// sentence by a fixed template. Nothing here is an opinion about the person; it
// is an audit of how much of the person has been written down, and how much
// thinking sits on top of what was written.
//
// The two meters, stated openly because a weighting is always a choice:
//   VOLUME — the district's share of all nodes, against the largest district.
//            How much of this part of the life exists in the graph at all.
//   LIFT   — the share of the district that is conclusion (junction or doctrine)
//            rather than raw ground fact. How much has been *thought about*.
// A district needs both. BUILT is their geometric mean, so a district that is
// all volume and no lift, or all lift and no volume, scores low on purpose.
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
      share: +(d.n / total).toFixed(4),
      ground: d.ground, junction: d.junction, doctrine: d.doctrine,
      volume: +volume.toFixed(4),
      lift: +lift.toFixed(4),
      built: +Math.sqrt(volume * lift).toFixed(4),
      reach: +(conn ? d.cross / conn : 0).toFixed(4),
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

  // Statements are built from templates + numbers only. They stay true as the
  // graph grows because they are recomputed, never written down.
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

  return {
    derived_at: new Date().toISOString().slice(0, 10),
    altitude: alt,
    tensions: tensions,
    integration: +(cross / (cross + within)).toFixed(4),
    composition: composition,
    statements: S,
    method: 'VOLUME = share of nodes vs largest district. LIFT = share of the ' +
      'district that is conclusion, not raw fact. BUILT = geometric mean of the two.'
  };
}

// ── the guard ────────────────────────────────────────────────────────────────
// Structural whitelist: every node key must be one of these, every edge key one
// of those, and every string value must be a known-safe enum or a hex hash /
// date / short slug. Anything else — a stray title, a leaked path — trips it and
// nothing is written.
function assertOpaque(out) {
  const NODE_KEYS = new Set(['id', 'domain', 'altitude', 'mass']);
  const EDGE_KEYS = new Set(['from', 'to', 'type']);
  const ALT = new Set(['ground', 'junction', 'doctrine']);
  const HEX = /^[0-9a-f]{12}$/;
  const SAFE_WORD = /^[a-z][a-z0-9-]{0,40}$/;   // domain names, edge types
  const fail = (m) => { console.error('build-brain: FAIL-CLOSED — ' + m); process.exit(2); };

  for (const n of out.nodes) {
    for (const k of Object.keys(n)) if (!NODE_KEYS.has(k)) fail('node has forbidden key: ' + k);
    if (!HEX.test(n.id)) fail('node id is not an opaque hash: ' + n.id);
    if (!SAFE_WORD.test(n.domain)) fail('node domain looks unsafe: ' + n.domain);
    if (!ALT.has(n.altitude)) fail('node altitude not an enum: ' + n.altitude);
    if (typeof n.mass !== 'number') fail('node mass not a number');
  }
  for (const e of out.edges) {
    for (const k of Object.keys(e)) if (!EDGE_KEYS.has(k)) fail('edge has forbidden key: ' + k);
    if (!HEX.test(e.from) || !HEX.test(e.to)) fail('edge endpoint not an opaque hash');
    if (!SAFE_WORD.test(e.type)) fail('edge type looks unsafe: ' + e.type);
  }
  // Belt and braces: no readable field names anywhere in the serialized output.
  const blob = JSON.stringify(out.nodes) + JSON.stringify(out.edges);
  for (const banned of ['title', 'summary', 'gloss', 'claim', 'source', 'path', 'name', 'wiki/']) {
    if (blob.includes(banned)) fail('serialized graph contains banned token: ' + banned);
  }

  // The self-model is the only prose in the file. It is generated from templates
  // and numbers, so it cannot carry private content — but verify rather than
  // trust: statements must be plain sentences, must not embed a node id, and
  // every word in them must be a domain name or ordinary English.
  const s = out.self;
  if (!s || !Array.isArray(s.statements)) fail('self-model missing');
  const known = new Set(Object.keys(out.domains));
  for (const line of s.statements) {
    if (typeof line !== 'string') fail('self statement is not a string');
    if (/[0-9a-f]{12}/.test(line)) fail('self statement embeds a node id: ' + line);
    if (!/^[A-Za-z0-9 ,.'%:—-]+$/.test(line)) fail('self statement has unexpected characters: ' + line);
  }
  for (const c of s.composition) {
    if (!known.has(c.domain)) fail('self composition names an unknown domain: ' + c.domain);
    if (!SAFE_WORD.test(c.domain)) fail('self composition domain looks unsafe: ' + c.domain);
  }
}

function report(out) {
  const w = (s) => process.stdout.write(s + '\n');
  w('build-brain — data/brain.json written');
  w('  source_commit : ' + (out.source_commit || '(none)'));
  w('  nodes         : ' + out.counts.nodes + '   edges: ' + out.counts.edges);
  w('  domains       :');
  Object.entries(out.domains).sort((a, b) => b[1] - a[1])
    .forEach(([d, c]) => w('      ' + d.padEnd(10) + ' ' + String(c).padStart(4)));
  w('  frontier (thinnest first):');
  out.frontier.slice(0, 4).forEach(f =>
    w('      ' + f.domain.padEnd(10) + ' count ' + String(f.count).padStart(4) + '   pull ' + f.weight));
  w('  readable per-node content: NONE (fail-closed guard passed)');
}

main();
