// LEVIATHAN · ボスの部屋 — THE BOSS'S OFFICE
//
// The front end for the intake ledger. Every fixture in this room is a thing
// `bin/intake` actually holds: a UNIT is a table, an INTAKE EVENT is a line cut
// on that table, an ADJUSTMENT is something that walked out without being
// consumed, and CLOSING a unit is last call and the till count after it.
//
// ── WHERE THE DATA COMES FROM ────────────────────────────────────────────────
// Nowhere on this origin. The ledger lives on the machine you are sitting at,
// in wiki-brain, and this page is a client for the local daemon on port 8477.
// That is deliberate and it is the whole security model: the record never
// leaves localhost, this page never stores it, and a public site that cannot
// reach the daemon shows an empty room rather than a copy of anything.
//
// ── THE ONE RULE THIS FILE INHERITS ──────────────────────────────────────────
// The room is sleazy; the arithmetic is not. Every number rendered here comes
// from the ledger's own projection, formatted by the ledger's own formatter,
// and no quantity is ever printed without the share of events it was computed
// from. Where the ledger says it does not know, this page says so in its own
// voice — it does not fill the gap in, and it does not round it away.
(function () {
  'use strict';

  var BASES = ['http://127.0.0.1:8477', 'http://localhost:8477'];
  var PROBE_MS = 2600;

  var MODE = null;    // 'daemon' | 'web' — where the numbers came from
  var PHRASE = null;  // the gate's passphrase, used to open the sealed log
  var LINES = [];     // web mode: the sealed log, opened
  var BASE = null;    // whichever base answered
  var ST = null;      // the ledger state, as the daemon computed it
  var ROOM = 'floor';
  var FAIL = null;    // why the house is closed, if it is
  var MORE = {};      // per-unit: is the extra logging row open
  var PANEL = {};     // per-unit: 'close' | 'spill' | null
  var RECEIPT = null; // { ordinal, report, events }
  var COUNT = null;   // the cross-unit payload

  var ROOMS = [
    ['floor',  'フロア',  'THE FLOOR'],
    ['door',   '裏口',    'THE BACK DOOR'],
    ['office', '事務所',  'THE OFFICE'],
    ['count',  '勘定',    'THE COUNT']
  ];

  var MTYPE = {
    measured:     ['ON THE SCALE',        'somebody weighed it'],
    estimated:    ['EYEBALLED',           'somebody guessed, and said so'],
    unquantified: ['THE HOUSE DIDN’T ASK', 'a real event with no number on it']
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── talking to the house ──────────────────────────────────────────────────
  function req(path, opts) {
    opts = opts || {};
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, opts.timeout || 12000);
    return fetch((opts.base || BASE) + path, {
      method: opts.method || 'GET',
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctl ? ctl.signal : undefined,
      mode: 'cors',
      credentials: 'omit'
    }).then(function (r) {
      clearTimeout(t);
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
    }, function (e) { clearTimeout(t); throw e; });
  }

  // Try each base in turn. A daemon that is not running and a daemon that is
  // running but will not talk to this origin are different failures and the
  // room says which, because the fix is different.
  // The gate already took a passphrase this session and stashed it; the sealed
  // log opens with the same one, so web mode asks for nothing the visitor has
  // not already been asked for.
  function gatePhrase() {
    try { return sessionStorage.getItem('lv.gate.pw'); } catch (e) { return null; }
  }

  function probe() {
    var i = 0;
    function next() {
      if (i >= BASES.length) {
        return web();
      }
      var b = BASES[i++];
      return req('/api/intake', { base: b, timeout: PROBE_MS }).then(function (r) {
        if (!r.ok) { FAIL = 'refused'; return next(); }
        BASE = b; ST = r.body; FAIL = null; MODE = 'daemon'; return true;
      }, function () { return next(); });
    }
    return next();
  }

  // ── web mode ──────────────────────────────────────────────────────────────
  // No daemon. The log comes out of wiki-brain as a sealed blob, opens with the
  // gate's passphrase, and is projected by `boss-web.js` into the same shape the
  // daemon returns — so everything below this line renders identically either
  // way. What differs is stated on screen, never guessed at.
  function web() {
    if (!window.BossSync || !window.BossWeb) { FAIL = 'noanswer'; return Promise.resolve(false); }
    PHRASE = gatePhrase();
    if (!PHRASE) { FAIL = 'nophrase'; return Promise.resolve(false); }
    if (!BossSync.token()) { FAIL = 'notoken'; return Promise.resolve(false); }
    return BossSync.pull(PHRASE).then(function (lines) {
      LINES = lines;
      return fetch('https://raw.githubusercontent.com/' + BossSync.REPO +
                   '/main/intake/substances.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (cat) {
          ST = BossWeb.state(LINES, cat);
          MODE = 'web'; FAIL = null;
          return true;
        });
    }, function (e) {
      FAIL = /token/i.test(e.message) ? 'notoken' : 'sealed';
      FAILMSG = e.message;
      return false;
    });
  }

  var FAILMSG = null;

  /** Web-mode write: append events to the log, re-seal, push. Same union merge
      the CLI does, so a laptop and a phone writing at once cannot lose either. */
  function webWrite(newLines, message) {
    return BossSync.push(PHRASE, newLines, message).then(function (r) {
      LINES = r.lines;
      var cat = { substances: ST.substances, categories: ST.categories };
      ST = BossWeb.state(LINES, cat);
      return true;
    });
  }

  function refresh() {
    return req('/api/intake').then(function (r) {
      if (r.ok) { ST = r.body; FAIL = null; }
      return r;
    });
  }

  // Every mutation goes through here. The daemon answers with the whole
  // recomputed state, so the page never has to work out what a write did —
  // which is exactly how a UI stops agreeing with the ledger.
  function act(action, body, msgEl) {
    if (msgEl) { msgEl.className = 'msg'; msgEl.textContent = 'ringing it up…'; }
    if (MODE === 'web') return actWeb(action, body, msgEl);
    return req('/api/intake/' + action, { method: 'POST', body: body }).then(function (r) {
      if (!r.ok || r.body.error) {
        if (msgEl) { msgEl.className = 'msg'; msgEl.textContent = '✗ ' + (r.body.error || ('the house said no (' + r.status + ')')); }
        return null;
      }
      ST = r.body.state;
      if (msgEl) { msgEl.className = 'msg ok'; msgEl.textContent = ''; }
      return r.body.result;
    }, function (e) {
      if (msgEl) { msgEl.className = 'msg'; msgEl.textContent = '✗ lost the line to the house — ' + e; }
      return null;
    });
  }

  // Web-mode mutations. Deliberately only the ones capture needs: opening a
  // table, ringing up a line, writing off what walked out. Closing a unit is a
  // reconciliation and belongs with the tool that does the arithmetic — the room
  // says so rather than growing a second, thinner version of it.
  function actWeb(action, body, msgEl) {
    var qty = null, unit = null;
    if (body.quantity !== undefined && String(body.quantity).trim() !== '') {
      qty = parseFloat(body.quantity);
      unit = body.quantity_unit || null;
      if (isNaN(qty)) { return fail(msgEl, 'that is not a number'); }
    }
    var lines, msg, u;

    if (action === 'unit') {
      if (qty === null) return fail(msgEl, 'a unit has to start with a quantity');
      var sub = (ST.substances || []).filter(function (x) { return x.id === body.substance; })[0];
      if (!sub) return fail(msgEl, 'pick something off the list');
      var uid = BossWeb.newUnitId();
      lines = [BossWeb.event('unit_created', uid, {
        substance: sub.name, substance_id: sub.id, category: sub.category,
        quantity: qty, unit: unit || sub.default_unit,
        source_context: body.source || null, note: body.note || null
      }, when(body.at))];
      msg = 'intake: a table opened, sealed';
    } else if (action === 'log') {
      u = unitOf(body.unit); if (!u) return fail(msgEl, 'no such table');
      if (body.preset) {
        var subs = (ST.substances || []).filter(function (x) {
          return x.id === u.substance_id; })[0] || {};
        var pre = (subs.presets || []).filter(function (x) {
          return x.id === body.preset; })[0];
        if (!pre) return fail(msgEl, 'no preset "' + body.preset + '" for ' + u.substance);
        // Straight into the same envelope a typed line produces. A preset is a
        // set of default arguments, not a different kind of event.
        lines = [BossWeb.event('intake_logged', u.id, {
          quantity: pre.quantity, unit: pre.unit,
          measurement_type: pre.measurement_type || 'estimated',
          confidence: pre.confidence || null, descriptor: null,
          note: [pre.note, (body.note || '').trim()].filter(Boolean).join('; ') || null
        }, when(body.at))];
        return webWrite(lines, 'intake: ' + (pre.label || pre.id) + ', sealed')
          .then(function () {
            if (msgEl) { msgEl.className = 'msg ok'; msgEl.textContent = ''; }
            return { ok: true };
          }, function (e) { return fail(msgEl, e.message); });
      }
      var mt = body.measurement_type || (qty === null ? 'unquantified' : 'measured');
      if (qty === null && !(body.descriptor || '').trim())
        return fail(msgEl, 'give a quantity, or a descriptor like "one line"');
      if (mt === 'unquantified') { qty = null; unit = null; }
      else if (unit && BossWeb.convert(qty, unit, u.quantity_unit) === null)
        return fail(msgEl, 'cannot express ' + unit + ' as ' + u.quantity_unit +
                           ' — different kinds of quantity');
      lines = [BossWeb.event('intake_logged', u.id, {
        quantity: qty, unit: qty === null ? null : (unit || u.quantity_unit),
        measurement_type: mt,
        confidence: mt === 'estimated' ? (body.confidence || 'medium') : (body.confidence || null),
        descriptor: (body.descriptor || '').trim() || null,
        note: (body.note || '').trim() || null
      }, when(body.at))];
      msg = 'intake: a line, sealed';
    } else if (action === 'adjust') {
      u = unitOf(body.unit); if (!u) return fail(msgEl, 'no such table');
      if (qty === null) return fail(msgEl, 'how much walked out?');
      lines = [BossWeb.event('unit_adjusted', u.id, {
        kind: body.kind, quantity: qty, unit: unit || u.quantity_unit,
        note: (body.note || '').trim() || null
      }, when(body.at))];
      msg = 'intake: something walked out, sealed';
    } else if (action === 'close') {
      u = unitOf(body.unit); if (!u) return fail(msgEl, 'no such table');
      if (u.status !== 'active') return fail(msgEl, 'that table is already closed');
      var rec = u.reconciliation, at = when(body.at);
      lines = [];
      if (rec && rec.needs_answer) {
        if (!body.resolution) {
          return fail(msgEl, fmt(Math.abs(rec.unaccounted), u.quantity_unit) + ' is ' +
            (rec.overdrawn ? 'over-logged' : 'unaccounted for') +
            ' — say what happened to it.');
        }
        if (body.resolution === 'final_intake') {
          if (rec.overdrawn) {
            return fail(msgEl, 'more is logged than the unit held — correct an event ' +
                               'rather than adding another');
          }
          // Recorded as an estimate, never a measurement: nobody weighed this.
          // Same event the daemon writes, same flag, same note.
          lines.push(BossWeb.event('intake_logged', u.id, {
            quantity: rec.unaccounted, unit: u.quantity_unit,
            measurement_type: 'estimated', confidence: 'low', descriptor: null,
            reconciliation: true,
            note: 'reconciliation at close — the remainder of the unit, recorded as ' +
                  'one estimated final intake'
          }, at));
        }
      }
      var resolved = Object.assign({}, rec || {});
      resolved.resolution = (rec && body.resolution) ? body.resolution : 'balanced';
      if (body.resolution === 'final_intake' && rec) {
        resolved.quantified_intake = rec.quantified_intake + rec.unaccounted;
        resolved.unaccounted = 0;
      }
      lines.push(BossWeb.event('unit_closed', u.id, {
        disposition: body.disposition, reconciliation: resolved,
        note: (body.note || '').trim() || null
      }, at));
      return webWrite(lines, 'intake: last call, sealed').then(function () {
        if (msgEl) { msgEl.className = 'msg ok'; msgEl.textContent = ''; }
        var closed = unitOf(u.id);
        return { ok: true, unit: u.id, report: BossWeb.report(closed) };
      }, function (e) { return fail(msgEl, e.message); });
    } else {
      return fail(msgEl, 'not something the room can do — ' + action);
    }

    return webWrite(lines, msg).then(function () {
      if (msgEl) { msgEl.className = 'msg ok'; msgEl.textContent = ''; }
      return { ok: true };
    }, function (e) { return fail(msgEl, e.message); });
  }

  function fmt(q, u) { return window.BossWeb ? BossWeb.fmtQty(q, u) : q + ' ' + u; }

  function fail(el, text) {
    if (el) { el.className = 'msg'; el.textContent = '✗ ' + text; }
    return Promise.resolve(null);
  }
  function unitOf(ref) {
    var hit = ST.units.filter(function (u) { return u.id === ref; })[0];
    if (hit) return hit;
    return ST.units.filter(function (u) {
      return u.status === 'active' && String(u.ordinal) === String(ref).replace('#', '');
    })[0] || null;
  }
  function when(text) {
    text = (text || '').trim();
    if (!text) return BossWeb.iso();
    var d = new Date(text.replace(' ', 'T'));
    return isNaN(d.getTime()) ? BossWeb.iso() : BossWeb.iso(d);
  }

  // ── fixtures ──────────────────────────────────────────────────────────────
  // Fixed art, never data-driven. A decorative shape that appears to encode a
  // quantity is worse than no shape: the real numbers are three lines below it
  // and they are the ones that mean something.
  function glassTable() {
    return '<svg class="fixture" width="132" height="58" viewBox="0 0 132 58" aria-hidden="true">' +
      '<rect x="1" y="8" width="130" height="42" rx="2" fill="rgba(0,229,255,.045)" stroke="rgba(0,229,255,.22)"/>' +
      '<g stroke="rgba(247,233,230,.82)" stroke-width="2.5" stroke-linecap="round">' +
      '<line x1="14" y1="22" x2="62" y2="22"/><line x1="14" y1="30" x2="55" y2="30"/>' +
      '<line x1="14" y1="38" x2="49" y2="38"/></g>' +
      '<path d="M78 18 l22 -5 -4 16 -22 5 z" fill="none" stroke="rgba(63,208,122,.75)" stroke-width="1.5"/>' +
      '<rect x="80" y="36" width="34" height="9" rx="1" fill="none" stroke="rgba(247,233,230,.35)" stroke-width="1.2"/>' +
      '<line x1="118" y1="16" x2="118" y2="44" stroke="rgba(255,31,111,.5)" stroke-width="2"/>' +
      '</svg>';
  }
  function punchCard() {
    return '<svg width="150" height="66" viewBox="0 0 150 66" aria-hidden="true">' +
      '<rect x="1" y="1" width="148" height="64" fill="rgba(247,233,230,.06)" stroke="rgba(255,31,111,.35)"/>' +
      '<g stroke="rgba(255,31,111,.22)" stroke-width="1">' +
      '<line x1="1" y1="17" x2="149" y2="17"/><line x1="1" y1="33" x2="149" y2="33"/>' +
      '<line x1="1" y1="49" x2="149" y2="49"/><line x1="46" y1="1" x2="46" y2="65"/></g>' +
      '<g fill="rgba(255,31,111,.55)">' +
      '<circle cx="24" cy="9" r="2.5"/><circle cx="24" cy="25" r="2.5"/><circle cx="24" cy="41" r="2.5"/></g>' +
      '<text x="98" y="40" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12"' +
      ' fill="rgba(255,31,111,.85)" letter-spacing="2">IN</text></svg>';
  }
  function drawer() {
    return '<svg width="92" height="46" viewBox="0 0 92 46" aria-hidden="true">' +
      '<rect x="1" y="12" width="90" height="33" fill="rgba(0,0,0,.5)" stroke="rgba(255,59,48,.5)"/>' +
      '<line x1="30" y1="12" x2="62" y2="12" stroke="rgba(255,59,48,.6)" stroke-width="3"/>' +
      '<path d="M22 30 h30 l6 -6 h6 v6 h4 v6 h-16 l-4 4 h-20 z" fill="none"' +
      ' stroke="rgba(255,59,48,.6)" stroke-width="1.4"/></svg>';
  }

  // ── the two visuals ───────────────────────────────────────────────────────
  // COVERAGE. One value, so it is a stat tile with a proportion bar and not a
  // chart — the number is said once, directly labelled, with no axis or legend.
  function meter(a) {
    var e = a.events, q = e.measured + e.estimated;
    var pctv = e.total ? Math.round(q / e.total * 100) : 0;
    // Two questions, not one. "Every event carries a number" was true and
    // misleading on a table logged entirely by one-tap presets: full coverage,
    // zero measurements. The second sentence is the one that stops a column of
    // estimates from reading like a column of weights.
    var weighed = !e.measured && e.estimated
      ? 'Not one of them was weighed — all ' + e.estimated + ' are estimates.'
      : e.estimated
        ? e.measured + ' weighed, ' + e.estimated + ' estimated.'
        : e.measured ? 'Every one of them weighed.' : '';
    var cap = !e.total
      ? 'Nothing has gone down on this table yet.'
      : (e.unquantified === 0
          ? 'Every event on this table carries a number. '
          : q + ' of ' + e.total + ' events carry a number. ' + e.unquantified +
            ' went down without one, and the house is not going to invent them — ' +
            'every quantity here is computed from the ' + q + ', not the ' + e.total + '. ')
        + weighed;
    return '<div class="meter"><div class="n">' + pctv + '%<span class="of">COUNTED</span></div>' +
      '<div class="track"><div class="fill" style="width:' + pctv + '%"></div></div>' +
      '<div class="cap">' + esc(cap) + '</div></div>';
  }

  // HOURS. One series over an ordered dimension: no legend, the title names it,
  // only the peak is labelled, and every bar carries its own count on hover.
  function hours(hist, title) {
    var top = Math.max.apply(null, hist), total = hist.reduce(function (a, b) { return a + b; }, 0);
    if (!total) return '';
    var peak = hist.indexOf(top);
    var bars = hist.map(function (v, h) {
      var pc = top ? Math.round(v / top * 100) : 0;
      var lbl = String(h).padStart(2, '0') + ':00 — ' + v + (v === 1 ? ' event' : ' events');
      return '<div class="bar' + (v ? '' : ' zero') + '" style="height:' + Math.max(pc, 2) + '%">' +
        '<span class="tip">' + esc(lbl) + '</span></div>';
    }).join('');
    return '<div class="hours"><div class="rubric" style="font-size:9px;letter-spacing:.3em;color:var(--neon)">' +
      esc(title) + '</div><div class="plot">' + bars + '</div>' +
      '<div class="axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>' +
      '<div class="peak">Busiest hour is ' + String(peak).padStart(2, '0') + ':00 with ' + top +
      ' of ' + total + ' events. Hover any bar for its own count.</div></div>';
  }

  // ── the rooms ─────────────────────────────────────────────────────────────
  function tables() {
    var open = ST.units.filter(function (u) { return u.status === 'active'; });
    if (!open.length) {
      return '<div class="booth"><div class="rubric">NOBODY’S WORKING</div>' +
        '<h2>The floor is empty.</h2><p class="say">Not a single table is open. The unit ' +
        'comes first here and nothing gets logged against a table that isn’t — that is not ' +
        'ceremony, it is the only reason any of the numbers downstairs mean anything. A dose ' +
        'with no denominator can tell you nothing later.<br><br>' +
        'Go round <b>the back door</b> and put something on a table.</p>' +
        '<div style="margin-top:16px"><button class="deal" data-go="door">THE BACK DOOR ▸</button></div></div>';
    }
    return open.map(table).join('');
  }

  function table(u) {
    var d = u.display, a = u.analysis, id = u.id;
    var h = '<div class="booth hot" data-u="' + esc(id) + '">';
    h += '<div style="display:flex;gap:20px;justify-content:space-between;flex-wrap:wrap;align-items:flex-start">';
    h += '<div style="flex:1;min-width:230px">' +
      '<div class="rubric">TABLE ' + String(u.ordinal).padStart(2, '0') + ' · OPEN</div>' +
      '<h2>' + esc(u.substance.toUpperCase()) + '</h2>' +
      '<div style="font-size:10px;letter-spacing:.14em;color:var(--dim);margin-top:6px">' +
      esc(d.initial) + ' CAME THROUGH THE DOOR · ' + esc(d.received) +
      (u.source_context ? ' · ' + esc(u.source_context) : '') + '</div>' +
      '<div class="big" style="margin-top:16px">' + (d.remaining_is_estimate ? '~' : '') +
      esc(d.remaining) + '<small>STILL ON THE TABLE · ' + a.events.total +
      ' EVENT(S) · ' + esc(d.logged) + ' RUNG UP' +
      (d.mean ? ' · MEAN ' + esc(d.mean) : '') + '</small></div>';
    if (d.remaining_is_estimate) {
      h += '<div style="font-size:9.5px;letter-spacing:.12em;color:var(--dim);margin-top:8px">' +
        'The tilde is not decoration. Some of what came off this table was guessed at or never ' +
        'counted, so what is left is the house’s best idea and not a measurement.</div>';
    }
    if (d.overdrawn) {
      h += '<div style="display:flex;gap:14px;align-items:center;margin-top:14px;border:1px solid var(--danger);padding:12px 14px">' +
        drawer() + '<div style="font-size:11px;line-height:1.7;color:#ffb3ae">' +
        '<b>MORE HAS COME OFF THIS TABLE THAN EVER WENT ONTO IT.</b><br>' +
        'Somebody double-rang a line, or the delivery was short. Amend an event ' +
        'or write down what walked out — do not just close it.</div></div>';
    }
    if (a.chronology_error) {
      h += '<div class="msg" style="margin-top:12px">⚠ An event on this table is dated before the ' +
        'table opened. Duration, rate and phases are withheld until one of the two timestamps is fixed.</div>';
    }
    h += meter(a) + '</div>';
    h += '<div style="flex:0 0 auto">' + glassTable() + '</div></div>';

    // ONE TAP. The manual row below is still the honest path for anything
    // weighed — these are for the case that actually recurs, where the
    // alternative to a tap is not a careful entry but no entry at all.
    h += '<hr class="hr">';
    var pres = ((ST.substances || []).filter(function (x) {
      return x.id === u.substance_id; })[0] || {}).presets || [];
    if (pres.length) {
      h += '<div class="rubric">ONE TAP</div><div class="rowline" style="margin-bottom:6px">' +
        pres.map(function (pre) {
          return '<button class="deal" data-r="pre" data-pre="' + esc(pre.id) + '" ' +
            'title="' + esc(pre.note || '') + '">' + esc(pre.label || pre.id) +
            ' <span style="opacity:.72;font-weight:400">' + esc(pre.quantity) + ' ' +
            esc(pre.unit) + '</span></button>';
        }).join('') + '</div>' +
        '<div style="font-size:9.5px;letter-spacing:.1em;color:var(--dim);line-height:1.8;' +
        'margin-bottom:14px">Every preset goes down as an <b>estimate</b>, never a ' +
        'measurement — nobody weighed these, and the house will not let a stand-in pass ' +
        'for a scale.</div>';
    }
    h += '<div class="rubric">RING IT UP</div>';
    h += '<div class="rowline">' +
      '<input type="text" data-r="q" placeholder="0.18" style="width:7em" aria-label="quantity">' +
      '<select data-r="u" style="width:auto" aria-label="unit">' + unitOpts(u.quantity_unit) + '</select>' +
      '<button class="deal" data-r="cut">CUT A LINE</button>' +
      '<button class="ghost" data-r="more">' + (MORE[id] ? 'LESS' : 'MORE') + '…</button></div>';
    h += '<div data-r="morebox" style="display:' + (MORE[id] ? 'block' : 'none') + ';margin-top:14px">';
    h += '<div class="rowline" style="gap:8px">' + Object.keys(MTYPE).map(function (k, i) {
      return '<label class="tag ' + k + '" style="cursor:pointer;margin:0">' +
        '<input type="radio" name="mt-' + esc(id) + '" value="' + k + '"' + (i ? '' : ' checked') +
        ' style="width:auto;margin:0 4px 0 0"><i></i>' + esc(MTYPE[k][0]) + '</label>';
    }).join('') + '</div>';
    h += '<div style="font-size:9.5px;color:var(--dim);letter-spacing:.1em;margin-top:8px;line-height:1.8">' +
      'Pick <b>' + esc(MTYPE.unquantified[0]) + '</b> and leave the number blank — write ' +
      '“one line” in the descriptor instead. It counts as an event, it shapes the timing and ' +
      'the busy hours, and it never touches a gram figure. Losing it because the scale was in ' +
      'another room is how a ledger quietly stops describing the night.</div>';
    h += '<div class="rowline" style="margin-top:10px">' +
      '<input type="text" data-r="desc" placeholder="one line" style="width:12em">' +
      '<input type="text" data-r="at" placeholder="when (blank = now)" style="width:14em">' +
      '<input type="text" data-r="note" placeholder="note" style="width:14em"></div></div>';

    if (d.events.length) {
      h += '<div class="rubric" style="margin-top:20px">THE TAB</div>' +
        '<pre class="ievents" style="font:11.5px/1.6 \'IBM Plex Mono\',monospace;white-space:pre;' +
        'overflow-x:auto;background:rgba(0,0,0,.35);border:1px solid var(--line);padding:11px 13px;margin:0">' +
        esc(d.events.join('\n')) + '</pre>' +
        '<div style="font-size:9px;letter-spacing:.12em;color:var(--faint);margin-top:6px">' +
        '~ eyeballed · ? no number · ! walked out without being consumed · x struck</div>';
    }

    h += '<div class="rowline" style="margin-top:18px">' +
      '<button class="ghost cold" data-r="receipt">THE RECEIPT</button>' +
      '<button class="ghost" data-r="spill">SOMETHING WALKED OUT</button>' +
      '<button class="ghost" data-r="close">LAST CALL</button></div>';

    if (PANEL[id] === 'spill') h += spillPanel(u);
    if (PANEL[id] === 'close') h += closePanel(u);
    h += '<div class="msg" data-r="msg"></div></div>';
    return h;
  }

  function spillPanel(u) {
    return '<hr class="hr"><div class="rubric">IT DIDN’T GET USED, IT LEFT</div>' +
      '<p class="say" style="font-size:12px">A gram on the carpet is not a dose and a gram somebody ' +
      'else took home is not a dose. They come off the table without ever touching the ' +
      'consumption record, because a ledger that folds the two together reports a night ' +
      'that did not happen.</p><div class="rowline" style="margin-top:12px">' +
      '<input type="text" data-r="sq" placeholder="0.3" style="width:7em">' +
      '<select data-r="su" style="width:auto">' + unitOpts(u.quantity_unit) + '</select>' +
      '<select data-r="sk" style="width:auto">' +
      ST.adjustment_kinds.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') +
      '</select><input type="text" data-r="sn" placeholder="what happened" style="width:16em">' +
      '<button class="deal" data-r="ssave">WRITE IT OFF</button>' +
      '<button class="ghost" data-r="scancel">never mind</button></div>';
  }

  function closePanel(u) {
    var r = u.reconciliation, bu = u.quantity_unit;
    var h = '<hr class="hr"><div class="rubric">LAST CALL · 閉店</div>' +
      '<label class="fld">HOW DID THIS ONE END?</label>' +
      '<select data-r="cd" style="max-width:22em">' +
      ST.dispositions.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>';
    if (r && r.needs_answer) {
      var n = function (v) { return (Math.round(v * 1000) / 1000) + ' ' + bu; };
      h += '<div style="margin-top:16px;border:1px solid var(--line-hot);padding:15px 17px;' +
        'background:rgba(255,31,111,.05)">' +
        '<div style="font-family:\'Zen Kaku Gothic New\',sans-serif;font-weight:900;font-size:17px;color:#fff">' +
        'THE TILL IS ' + (r.overdrawn ? 'OVER' : 'SHORT') + '.</div>' +
        '<pre style="font:12px/1.75 \'IBM Plex Mono\',monospace;margin:12px 0 0;color:var(--smoke)">' +
        'came through the door   ' + n(r.initial) + '\n' +
        'rung up                 ' + n(r.quantified_intake) +
        (r.adjusted ? '\nwalked out              ' + n(r.adjusted) : '') + '\n' +
        (r.overdrawn ? 'OVER-LOGGED BY         ' : 'UNACCOUNTED FOR        ') + ' ' + n(Math.abs(r.unaccounted)) +
        (r.unquantified_events ? '\n\n' + r.unquantified_events +
          ' event(s) on this table never carried a number.' : '') + '</pre>' +
        '<p class="say" style="font-size:12px;margin-top:12px">Nobody is guessing this for you. ' +
        'A ledger that spreads an unexplained remainder across the doses it does know about ' +
        'produces a clean average that is arithmetic over a fiction — and it looks exactly like ' +
        'evidence. So: where did it go?</p>' +
        '<label class="fld">WHERE IT WENT</label>' +
        '<select data-r="cr" style="max-width:22em">' + ST.resolutions.map(function (x) {
          return '<option value="' + esc(x) + '">' + esc(x.replace(/_/g, ' ')) + '</option>';
        }).join('') + '</select>' +
        '<div style="font-size:9.5px;letter-spacing:.1em;color:var(--dim);margin-top:9px;line-height:1.8">' +
        '<b>final intake</b> writes the remainder as one estimated, low-confidence event. It gets ' +
        'counted — and every receipt from here on names it as a remainder written off at close ' +
        'rather than a dose anybody watched.<br>' +
        '<b>discrepancy</b> admits the house does not know. That is a real answer and it is often ' +
        'the true one.</div></div>';
    } else {
      h += '<div style="margin-top:14px;font-size:12px;line-height:1.8;color:var(--money)">' +
        'The till balances. Nothing is unaccounted for on this table.</div>';
    }
    return h + '<div class="rowline" style="margin-top:16px">' +
      '<input type="text" data-r="cat" placeholder="closed at (blank = now)" style="width:15em">' +
      '<input type="text" data-r="cn" placeholder="note" style="width:15em">' +
      '<button class="deal" data-r="csave">CLOSE THE TABLE</button>' +
      '<button class="ghost" data-r="ccancel">never mind</button></div>';
  }

  function unitOpts(sel) {
    var h = '';
    Object.keys(ST.quantity_units).forEach(function (fam) {
      h += '<optgroup label="' + esc(fam) + '">';
      ST.quantity_units[fam].forEach(function (u) {
        h += '<option' + (u === sel ? ' selected' : '') + '>' + esc(u) + '</option>';
      });
      h += '</optgroup>';
    });
    return h;
  }

  // ── 裏口 · THE BACK DOOR ──────────────────────────────────────────────────
  function backDoor() {
    var byCat = {};
    ST.substances.forEach(function (s) { (byCat[s.category] = byCat[s.category] || []).push(s); });
    var opts = '<option value="">— pick one —</option>';
    ST.categories.filter(function (c) { return byCat[c]; }).forEach(function (c) {
      opts += '<optgroup label="' + esc(c) + '">' + byCat[c].map(function (s) {
        return '<option value="' + esc(s.id) + '" data-unit="' + esc(s.default_unit) + '">' +
          esc(s.name) + '</option>';
      }).join('') + '</optgroup>';
    });
    opts += '<option value="__new__">+ put something new on the list…</option>';

    return '<div class="grid2"><div class="booth hot">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap">' +
      '<div><div class="rubric">裏口 · A DELIVERY</div><h2>PUNCH IT IN</h2></div>' +
      '<div>' + punchCard() + '</div></div>' +
      '<p class="say">Something finite arrived at a known time. That is the only kind of thing ' +
      'this ledger can count, and it is why the table comes before the line: 3.5 g is a ' +
      'denominator, and without one you can never ask how long it lasted, whether the first ' +
      'one ran bigger than the rest, or whether it went faster toward the end.</p>' +

      '<label class="fld">WHAT CAME IN</label><select id="nuSub">' + opts + '</select>' +
      '<div id="nuNew" style="display:none;border-left:2px solid var(--neon);padding-left:14px;margin-top:12px">' +
      '<label class="fld">NAME IT</label><input type="text" id="nuName" placeholder="Kratom">' +
      '<label class="fld">WHAT KIND</label><select id="nuCat">' +
      ST.categories.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<label class="fld">USUAL UNIT</label><select id="nuDefUnit">' + unitOpts('g') + '</select>' +
      '<div style="margin-top:12px"><button class="ghost" id="nuAdd">ADD IT TO THE LIST</button></div>' +
      '<div style="font-size:9.5px;color:var(--dim);letter-spacing:.1em;margin-top:9px;line-height:1.8">' +
      'Once, on purpose, and every table after this picks it off the list. Free text gives you ' +
      '“coke”, “cocaine” and “Cocaine ” as three different substances, and not one number that ' +
      'spans more than a single table survives that.</div></div>' +

      '<label class="fld">HOW MUCH</label><div class="rowline">' +
      '<input type="text" id="nuQty" placeholder="3.5" style="width:8em">' +
      '<select id="nuUnit" style="width:auto">' + unitOpts('g') + '</select></div>' +
      '<label class="fld">WHEN</label>' +
      '<input type="text" id="nuAt" placeholder="blank = now · or 2026-08-29 13:42">' +
      '<label class="fld">WHO, WHERE FROM (OPTIONAL)</label><input type="text" id="nuSource">' +
      '<label class="fld">NOTE (OPTIONAL)</label><input type="text" id="nuNote">' +
      '<div style="margin-top:18px"><button class="deal" id="nuGo">OPEN THE TABLE ▸</button></div>' +
      '<div class="msg" id="nuMsg"></div></div>' +

      '<div class="booth"><div class="rubric">HOUSE POLICY</div>' +
      '<h2 style="font-size:16px">Three ways to write a line down.</h2>' +
      '<div style="margin-top:14px">' + Object.keys(MTYPE).map(function (k) {
        return '<div style="margin-bottom:14px"><span class="tag ' + k + '" style="margin:0">' +
          '<i></i>' + esc(MTYPE[k][0]) + '</span>' +
          '<div style="font-size:11.5px;line-height:1.8;color:var(--smoke);margin-top:7px">' +
          esc(MTYPE[k][1]) + '</div></div>';
      }).join('') +
      '<p class="say" style="font-size:12px;border-top:1px solid var(--line);padding-top:14px">' +
      'The third one is the whole trick. A ledger that only takes grams throws away the count, ' +
      'the timing and the clustering every single time the scale is not to hand — and it throws ' +
      'them away <b>silently</b>. Here “one line” is an event with no number on it: it moves the ' +
      'event total, the intervals and the busy hours, and it never once touches a gram figure. ' +
      'Every quantity in this building comes with the share of events it was actually computed ' +
      'from, so a mean over ten of thirteen can never dress itself up as a mean over thirteen.</p>' +
      '</div></div></div>';
  }

  // ── 事務所 · THE OFFICE ───────────────────────────────────────────────────
  function office() {
    var h = '<div class="booth"><div class="rubric">事務所 · THE DESK</div>' +
      '<h2>THE RECEIPTS</h2><p class="say">One table, everything the ledger can prove about it. ' +
      'Duration, the counts by kind, the split between what was weighed and what was guessed, ' +
      'the spread of the lines, the gaps between them, the busiest window, and how the ' +
      'quantity went — first quarter, middle half, last quarter, cut by <i>how much went</i> ' +
      'rather than by the clock, because the question is whether it sped up toward the end.</p>';
    if (!ST.units.length) {
      return h + '<p class="say" style="margin-top:14px;color:var(--dim)">No tables have ever been ' +
        'opened. There is nothing on the desk.</p></div>';
    }
    h += '<div class="rowline" style="margin-top:16px">' +
      '<select id="rpPick" style="max-width:30em">' + ST.units.map(function (u) {
        return '<option value="' + esc(u.id) + '"' +
          (RECEIPT && RECEIPT.id === u.id ? ' selected' : '') + '>TABLE ' +
          String(u.ordinal).padStart(2, '0') + ' · ' + esc(u.substance) + ' · ' +
          esc(u.display.initial) + ' · ' + (u.status === 'active' ? 'OPEN' : 'CLOSED') +
          '</option>';
      }).join('') + '</select><button class="deal" id="rpGo">PULL THE RECEIPT</button></div>' +
      '<div class="msg" id="rpMsg"></div></div>';
    if (RECEIPT) {
      h += '<div class="receiptwrap"><pre class="receipt">' + esc(RECEIPT.report) +
        (RECEIPT.events && RECEIPT.events.length ? '\n\nEVENTS\n' + esc(RECEIPT.events.join('\n')) : '') +
        '</pre></div>';
    }
    return h;
  }

  // ── 勘定 · THE COUNT ──────────────────────────────────────────────────────
  function count() {
    var h = '<div class="booth hot"><div class="rubric">勘定 · THE BACK OFFICE</div>' +
      '<h2>ACROSS EVERY TABLE EVER OPENED</h2>' +
      '<p class="say">This is the part a night-by-night diary can never reach: how long a given ' +
      'size actually lasts, how often one is gone inside a day, how wide the lines run, and ' +
      'whether any of it has drifted month over month. It needs a denominator on every table, ' +
      'which is what the whole tedious business upstairs is for.</p>';
    if (!ST.units.length) {
      return h + '<p class="say" style="margin-top:14px;color:var(--dim)">Nothing to count yet.</p></div>';
    }
    h += '<div style="margin-top:16px"><button class="deal" id="ctGo">RUN THE NUMBERS</button></div>' +
      '<div class="msg" id="ctMsg"></div></div>';
    if (COUNT) {
      if (COUNT.stats && COUNT.stats.time_of_day) {
        h += '<div class="booth">' + hours(COUNT.stats.time_of_day, 'WHEN THE ROOM IS BUSY · ALL EVENTS BY HOUR') + '</div>';
      }
      h += '<div class="receiptwrap"><pre class="receipt">' + esc(COUNT.text) + '</pre></div>';
    }
    return h;
  }

  // ── シャッター · THE HOUSE IS CLOSED ──────────────────────────────────────
  // The one state this page must get right. There is no ledger to show, so it
  // shows none — no cached copy, no demo data, no plausible-looking sample.
  // A room full of invented numbers is worse than an empty one.
  function houseClosed() {
    if (FAIL === 'notoken') return tokenDoor();
    var why = FAIL === 'refused'
      ? 'The daemon answered and then refused this page. It is running, but it is not allowing ' +
        'requests from <code>' + esc(location.origin) + '</code>.'
      : FAIL === 'nophrase'
      ? 'The gate has no passphrase in this tab, so the sealed log cannot be opened. Reload and ' +
        'come through the front.'
      : FAIL === 'sealed'
      ? 'The sealed log would not open: <code>' + esc(FAILMSG || 'authentication failed') +
        '</code>. Either the passphrase is not the one it was sealed with, or the file has been ' +
        'altered since.'
      : 'Nothing is listening on <code>127.0.0.1:8477</code>, and there is no token on this ' +
        'device to read the sealed log with.';
    return '<div class="booth hot" style="text-align:center;padding:52px 24px">' +
      '<svg width="150" height="76" viewBox="0 0 150 76" aria-hidden="true" style="opacity:.75">' +
      '<g stroke="rgba(255,59,48,.5)" stroke-width="2">' +
      '<line x1="6" y1="10" x2="144" y2="10"/><line x1="6" y1="22" x2="144" y2="22"/>' +
      '<line x1="6" y1="34" x2="144" y2="34"/><line x1="6" y1="46" x2="144" y2="46"/>' +
      '<line x1="6" y1="58" x2="144" y2="58"/><line x1="6" y1="70" x2="144" y2="70"/></g>' +
      '<rect x="4" y="4" width="142" height="70" fill="none" stroke="rgba(255,59,48,.7)" stroke-width="2"/></svg>' +
      '<div class="rubric" style="margin-top:22px">シャッター</div>' +
      '<h2 style="font-size:30px">THE HOUSE IS CLOSED</h2>' +
      '<p class="say" style="margin:14px auto 0;text-align:left;max-width:62ch">' + why +
      ' The ledger lives on your machine and never leaves it — this page is only a client for ' +
      'it, which is exactly why there is nothing here to show you when the daemon is down. ' +
      'It will not put up a sample night instead.</p>' +
      '<pre style="display:inline-block;text-align:left;margin:22px auto 0;padding:16px 22px;' +
      'background:rgba(0,0,0,.45);border:1px solid var(--line-hot);font:12.5px/1.8 \'IBM Plex Mono\',monospace;' +
      'color:var(--money)">cd wiki-brain\npython3 app.py</pre>' +
      '<div style="margin-top:20px"><button class="deal" id="knock">KNOCK AGAIN</button></div>' +
      '<div style="font-size:9.5px;letter-spacing:.14em;color:var(--faint);margin-top:20px;line-height:1.9">' +
      'Or run the whole thing from the terminal: <code>bin/intake</code>. Same ledger, same rules,<br>' +
      'no neon. This room is a face on it, never a second copy of it.</div></div>';
  }

  // ── the token door ────────────────────────────────────────────────────────
  // The one thing web mode needs that the gate cannot supply. It is kept on this
  // device and nowhere else: never committed, never sent anywhere but
  // api.github.com, and FORGET wipes it. The ledger itself is deliberately not
  // cached here — a plaintext consumption record in a browser store on a public
  // origin is the same mistake as committing one, made somewhere harder to see.
  function tokenDoor() {
    return '<div class="booth hot" style="padding:40px 26px">' +
      '<div class="rubric">裏の鍵 · THE BACK KEY</div>' +
      '<h2>THE ROOM NEEDS A KEY TO THE BOOKS</h2>' +
      '<p class="say">No daemon on this machine, so the room reads the ledger straight out of ' +
      '<code>' + esc(BossSync.REPO) + '</code> — <b>sealed</b>. It travels and rests as ciphertext ' +
      'and opens with the passphrase you already gave the gate, so that repository being public ' +
      'publishes nothing readable. GitHub stores a blob it cannot read, and so does anyone who ' +
      'clones it.</p>' +
      '<p class="say">What it still needs is permission to write. Make a fine-grained token with ' +
      '<b>Contents: read and write</b> on that repository and nothing else, and paste it here — ' +
      'it stays on this device, in this browser, and goes nowhere but api.github.com.</p>' +
      '<div class="rowline" style="margin-top:18px">' +
      '<input type="text" id="tokIn" placeholder="github_pat_…" style="max-width:30em" ' +
      'autocomplete="off" spellcheck="false">' +
      '<button class="deal" id="tokGo">OPEN THE BOOKS</button>' +
      (BossSync.token() ? '<button class="ghost" id="tokForget">FORGET IT</button>' : '') +
      '</div><div class="msg" id="tokMsg"></div>' +
      '<div style="font-size:9.5px;letter-spacing:.14em;color:var(--faint);margin-top:22px;line-height:1.9">' +
      'Prefer no token at all? Run the ledger daemon on this machine instead —<br>' +
      '<code>cd wiki-brain &amp;&amp; python3 app.py</code> — and the room uses that.</div></div>';
  }

  // ── paint ─────────────────────────────────────────────────────────────────
  function chrome() {
    var lamp = $('#house'), st = $('#houseState'), who = $('#houseWho');
    if (ST && !FAIL) {
      lamp.className = 'live';
      var open = ST.units.filter(function (u) { return u.status === 'active'; }).length;
      st.textContent = 'THE HOUSE IS OPEN';
      var src = MODE === 'web'
        ? 'sealed · ' + esc(BossSync.REPO)
        : esc(String(BASE).replace(/^https?:\/\//, ''));
      who.innerHTML = open + ' table(s) working · ' + ST.today + ' event(s) tonight · ' +
        '<span style="color:var(--faint)">' + src + '</span>';
    } else {
      lamp.className = 'closed';
      st.textContent = 'THE HOUSE IS CLOSED';
      who.textContent = 'no ledger on 127.0.0.1:8477';
    }
    $('#rooms').innerHTML = ROOMS.map(function (r) {
      return '<button data-room="' + r[0] + '" class="' + (ROOM === r[0] ? 'on' : '') + '">' +
        '<span class="jp">' + r[1] + '</span>' + r[2] + '</button>';
    }).join('');
    $$('#rooms button').forEach(function (b) {
      b.onclick = function () { ROOM = b.dataset.room; render(); };
    });
  }

  function render() {
    chrome();
    var stage = $('#stage');
    if (!ST || FAIL) { stage.innerHTML = houseClosed(); wireClosed(); return; }
    if (ST.errors && ST.errors.length) {
      stage.innerHTML = '<div class="booth" style="border-color:var(--danger)">' +
        '<div class="rubric" style="color:var(--danger)">THE BOOKS DO NOT ADD UP</div>' +
        ST.errors.map(function (e) { return '<div class="msg">' + esc(e) + '</div>'; }).join('') +
        '<p class="say" style="margin-top:10px">Fix this at the terminal before logging anything ' +
        'else — <code>bin/intake check</code> says the same thing and says it more precisely.</p></div>';
      return;
    }
    stage.innerHTML =
      (ST.warnings && ST.warnings.length
        ? '<div class="booth" style="border-color:var(--amber)">' + ST.warnings.map(function (w) {
            return '<div style="font-size:11.5px;line-height:1.8;color:var(--gold)">⚠ ' + esc(w) + '</div>';
          }).join('') + '</div>'
        : '') +
      (ROOM === 'floor' ? tables()
        : ROOM === 'door' ? backDoor()
        : ROOM === 'office' ? office()
        : count());
    wire();
  }

  // ── wiring ────────────────────────────────────────────────────────────────
  function wireClosed() {
    var go = $('#tokGo');
    if (go) {
      go.onclick = function () {
        var t = ($('#tokIn').value || '').trim();
        if (!t) { $('#tokMsg').textContent = '✗ paste the token first'; return; }
        BossSync.setToken(t);
        go.disabled = true; go.textContent = 'OPENING…';
        FAIL = null;
        probe().then(function () { render(); });
      };
      $('#tokIn').onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go.click(); } };
      var f = $('#tokForget');
      if (f) f.onclick = function () { BossSync.forget(); FAIL = 'notoken'; render(); };
      return;
    }
    var k = $('#knock');
    if (k) k.onclick = function () {
      k.disabled = true; k.textContent = 'KNOCKING…';
      FAIL = null; BASE = null;
      probe().then(function () { render(); });
    };
  }

  function wire() {
    $$('[data-go]').forEach(function (b) {
      b.onclick = function () { ROOM = b.dataset.go; render(); };
    });

    $$('.booth[data-u]').forEach(function (card) {
      var id = card.dataset.u;
      var g = function (r) { return card.querySelector('[data-r="' + r + '"]'); };
      var v = function (r) { var e = g(r); return e ? e.value.trim() : ''; };
      var msg = g('msg');

      if (g('more')) g('more').onclick = function () { MORE[id] = !MORE[id]; render(); };

      var cut = function () {
        var picked = card.querySelector('input[name="mt-' + id + '"]:checked');
        act('log', {
          unit: id, quantity: v('q'), quantity_unit: v('u'),
          measurement_type: picked ? picked.value : 'measured',
          descriptor: v('desc'), at: v('at'), note: v('note')
        }, msg).then(function (r) { if (r) render(); });
      };
      card.querySelectorAll('[data-r="pre"]').forEach(function (b) {
        b.onclick = function () {
          b.disabled = true;
          act('log', { unit: id, preset: b.dataset.pre }, msg).then(function (r) {
            if (r) render(); else b.disabled = false;
          });
        };
      });
      if (g('cut')) g('cut').onclick = cut;
      ['q', 'desc'].forEach(function (r) {
        if (g(r)) g(r).onkeydown = function (e) {
          if (e.key === 'Enter') { e.preventDefault(); cut(); }
        };
      });

      if (g('spill')) g('spill').onclick = function () {
        PANEL[id] = PANEL[id] === 'spill' ? null : 'spill'; render();
      };
      if (g('scancel')) g('scancel').onclick = function () { PANEL[id] = null; render(); };
      if (g('ssave')) g('ssave').onclick = function () {
        act('adjust', { unit: id, quantity: v('sq'), quantity_unit: v('su'),
          kind: v('sk'), note: v('sn') }, msg).then(function (r) {
          if (r) { PANEL[id] = null; render(); }
        });
      };

      if (g('close')) g('close').onclick = function () {
        PANEL[id] = PANEL[id] === 'close' ? null : 'close'; render();
      };
      if (g('ccancel')) g('ccancel').onclick = function () { PANEL[id] = null; render(); };
      if (g('csave')) g('csave').onclick = function () {
        act('close', { unit: id, disposition: v('cd'), resolution: v('cr'),
          at: v('cat'), note: v('cn') }, msg).then(function (r) {
          if (!r) return;
          PANEL[id] = null;
          RECEIPT = { id: id, report: r.report, events: [] };
          ROOM = 'office';
          render();
          var box = $('.receiptwrap');
          if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      };

      if (g('receipt')) g('receipt').onclick = function () { pullReceipt(id); };
    });

    // the back door
    var sub = $('#nuSub');
    if (sub) {
      sub.onchange = function () {
        var isNew = sub.value === '__new__';
        $('#nuNew').style.display = isNew ? 'block' : 'none';
        var o = sub.selectedOptions[0];
        if (!isNew && o && o.dataset.unit) $('#nuUnit').value = o.dataset.unit;
      };
      $('#nuAdd').onclick = function () {
        act('substance', { name: $('#nuName').value, category: $('#nuCat').value,
          quantity_unit: $('#nuDefUnit').value }, $('#nuMsg')).then(function (r) {
          if (!r) return;
          render();
          $('#nuSub').value = r.substance.id;
          $('#nuUnit').value = r.substance.default_unit;
        });
      };
      $('#nuGo').onclick = function () {
        act('unit', { substance: $('#nuSub').value, quantity: $('#nuQty').value,
          quantity_unit: $('#nuUnit').value, at: $('#nuAt').value,
          source: $('#nuSource').value, note: $('#nuNote').value }, $('#nuMsg')).then(function (r) {
          if (r) { ROOM = 'floor'; render(); }
        });
      };
      $('#nuQty').onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); $('#nuGo').click(); }
      };
    }

    if ($('#rpGo')) $('#rpGo').onclick = function () { pullReceipt($('#rpPick').value); };

    if ($('#ctGo')) $('#ctGo').onclick = function () {
      var m = $('#ctMsg'); m.className = 'msg'; m.textContent = 'counting…';
      if (MODE === 'web') {
        var st = BossWeb.crossStats(ST.units);
        COUNT = { stats: st, text: BossWeb.statsText(st) };
        m.textContent = '';
        render();
        return;
      }
      req('/api/intake/stats').then(function (r) {
        if (!r.ok || r.body.error) { m.textContent = '✗ ' + (r.body.error || r.status); return; }
        COUNT = r.body; m.textContent = ''; render();
      }, function (e) { m.textContent = '✗ ' + e; });
    };
  }

  function pullReceipt(id) {
    var m = $('#rpMsg') || null;
    if (MODE === 'web') {
      var u = unitOf(id);
      if (!u) { if (m) { m.className = 'msg'; m.textContent = '✗ no such table'; } return; }
      RECEIPT = { id: id, report: BossWeb.report(u), events: u.display.events };
      ROOM = 'office';
      render();
      var box0 = $('.receiptwrap');
      if (box0) box0.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    req('/api/intake/report?unit=' + encodeURIComponent(id)).then(function (r) {
      if (!r.ok || r.body.error) {
        if (m) { m.className = 'msg'; m.textContent = '✗ ' + (r.body.error || r.status); }
        return;
      }
      RECEIPT = { id: id, report: r.body.report, events: r.body.events };
      ROOM = 'office';
      render();
      var box = $('.receiptwrap');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, function (e) { if (m) { m.className = 'msg'; m.textContent = '✗ ' + e; } });
  }

  // ── the clock on the camera ───────────────────────────────────────────────
  function tick() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var el = $('#camclock');
    if (el) el.textContent = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      '  ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function boot() {
    tick(); setInterval(tick, 1000);
    chrome();
    $('#stage').innerHTML = '<div class="booth" style="text-align:center;padding:44px">' +
      '<div class="rubric">…</div><h2 style="font-size:20px">TRYING THE DOOR</h2>' +
      '<p class="say" style="margin-top:8px;color:var(--dim)">Looking for the ledger on this machine.</p></div>';
    probe().then(function () { render(); });
    // The ledger can move under this page — the CLI writes to the same log —
    // so re-read it whenever the tab comes back to the front.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && BASE && !FAIL) refresh().then(render);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
