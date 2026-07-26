#!/usr/bin/env node
// LEVIATHAN · build js/transcript-index.js
//
//   node tools/build-transcript-index.js
//
// Every evidence page quotes messages. This resolves each of those quotes to a
// line number in transcript.html, once, at build time — so the pages ship a
// small lookup instead of the whole 2 MB transcript.
//
// A quote is matched on date + minute + speaker + the head of its text. The
// head, not the whole string: the pages truncate long quotes for display, so
// the first 28 alphanumeric characters is the part that can be trusted to
// survive. Where a quote resolves to no message the record simply carries no
// link — a missing link is honest, a wrong one is not.
//
// The lookup order at runtime (see js/transcript-link.js) is exact key, then
// same-minute, then first line of that day.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TRANSCRIPT = path.join(ROOT, 'data', 'transcript.json');
const OUT = path.join(ROOT, 'js', 'transcript-index.js');

// Shared with js/transcript-link.js — keep the two identical.
const fp = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 28);
const keyOf = (d, t, who, text) => d + '|' + t + '|' + who + '|' + fp(text);

function loadData() {
  global.window = {};
  for (const f of ['ledger-data', 'money-data', 'procurement-asks', 'procurement-data']) {
    require(path.join(ROOT, 'js', f + '.js'));
  }
  return global.window;
}

// Every quote any page can display, flattened to one shape.
//   who: 'A' Annie, 'D' Dan, '?' unattributed in the source data
function candidates(w) {
  const out = [];
  const push = (page, d, t, who, text) => {
    if (!d || !t || !text) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}/.test(t)) return;
    out.push({ page, d, t: t.slice(0, 5), who, text });
  };

  for (const day of (w.DrugLedger ? w.DrugLedger.days : [])) {
    for (const q of day.q || []) push('ledger', day.d, q.t, q.w === 'HER' ? 'A' : 'D', q.x);
  }
  for (const e of (w.FamilyLedger ? w.FamilyLedger.events : [])) {
    push('money', e.d, e.t, 'A', e.x);
    for (const q of e.q || []) push('money', e.d, q.t, '?', q.x);
  }
  for (const r of (w.ProcurementAsks ? w.ProcurementAsks.records : [])) {
    push('ask', r.d, r.t, 'A', r.x);
  }
  for (const r of (w.ProcurementData ? w.ProcurementData.records : [])) {
    // dir looks like "2025-02-22 20:46:33 | Received"
    const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/.exec(r.dir || '');
    if (!m) continue;
    const who = /Sent/i.test(r.dir) ? 'D' : /Received/i.test(r.dir) ? 'A' : '?';
    push('procurement', m[1], m[2], who, r.text);
  }
  return out;
}

function main() {
  const j = JSON.parse(fs.readFileSync(TRANSCRIPT, 'utf8'));
  const msgs = j.m;

  const exact = new Map();   // d|t|who|fp -> line
  const minute = new Map();  // d|t|who    -> line
  const day = new Map();     // d          -> first line
  for (let i = 0; i < msgs.length; i++) {
    const [ts, dir, text] = msgs[i];
    const d = ts.slice(0, 10), t = ts.slice(11, 16), who = dir ? 'D' : 'A';
    const line = i + 1;
    if (!day.has(d)) day.set(d, line);
    const mk = d + '|' + t + '|' + who;
    if (!minute.has(mk)) minute.set(mk, line);
    const ek = mk + '|' + fp(text);
    if (!exact.has(ek)) exact.set(ek, line);
  }

  const outK = {}, outM = {}, outD = {};
  const stats = {};
  const bump = (page, field) => {
    stats[page] = stats[page] || { total: 0, exact: 0, minute: 0, day: 0, miss: 0, outside: 0 };
    stats[page][field]++;
  };

  for (const c of candidates(w0)) {
    bump(c.page, 'total');
    if (c.d < j.first.slice(0, 10) || c.d > j.last.slice(0, 10)) { bump(c.page, 'outside'); continue; }

    const whos = c.who === '?' ? ['A', 'D'] : [c.who];
    let hit = null, kind = null;
    for (const who of whos) {
      const ek = keyOf(c.d, c.t, who, c.text);
      if (exact.has(ek)) { outK[ek] = exact.get(ek); hit = ek; kind = 'exact'; break; }
    }
    if (!hit) {
      for (const who of whos) {
        const mk = c.d + '|' + c.t + '|' + who;
        if (minute.has(mk)) { outM[mk] = minute.get(mk); hit = mk; kind = 'minute'; break; }
      }
    }
    if (!hit && day.has(c.d)) { kind = 'day'; }
    if (day.has(c.d)) outD[c.d] = day.get(c.d);
    bump(c.page, kind || 'miss');
  }

  // A wrong link is worse than no link: every exact key must point at a message
  // whose text actually starts the way the quote does.
  let bad = 0;
  for (const [k, line] of Object.entries(outK)) {
    const want = k.slice(k.lastIndexOf('|') + 1);
    if (fp(msgs[line - 1][2]) !== want) { bad++; console.error('MISMATCH ' + k + ' -> ' + line); }
  }
  if (bad) { console.error(bad + ' mismatched keys — refusing to write'); process.exit(1); }
  const loose = Object.entries(outM).length;
  if (loose) console.log('  ' + loose + ' same-minute fallback key(s) — text not matched exactly');

  const payload = {
    count: j.count,
    from: j.first.slice(0, 10),
    to: j.last.slice(0, 10),
    k: outK,
    m: outM,
    d: outD,
  };
  fs.writeFileSync(OUT,
    '// LEVIATHAN · TRANSCRIPT INDEX — generated by tools/build-transcript-index.js.\n'
    + '// Do not edit by hand. Maps a quote on an evidence page to its line in\n'
    + '// transcript.html; see js/transcript-link.js for the lookup order.\n'
    + 'window.TranscriptIndex = ' + JSON.stringify(payload) + ';\n', 'utf8');

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(OUT + '  ' + kb + ' KB  ' + payload.from + ' .. ' + payload.to);
  for (const [page, s] of Object.entries(stats)) {
    const linked = s.exact + s.minute;
    console.log('  %s: %d quotes — %d linked (%d exact, %d same-minute), %d day-only, %d outside export, %d no match',
      page, s.total, linked, s.exact, s.minute, s.day, s.outside, s.miss);
  }
}

const w0 = loadData();
main();
