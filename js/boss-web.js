// LEVIATHAN · ボスの部屋 — web mode: the room, with no daemon behind it.
//
// `js/boss.js` renders a state object the local ledger daemon computes. This
// file produces THE SAME SHAPE from the sealed log fetched by `boss-sync.js`,
// so the room's four rooms render unchanged whether the numbers came from
// `bin/intake` on this machine or from a file on a phone. One renderer, two
// sources — and the source is named on screen so nobody has to guess.
//
// ── WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────────
// It is a CAPTURE projection, not the analysis. It computes what you need to
// log honestly and see where a unit stands: event counts by kind, quantified
// total, remaining, coverage, mean and median dose. It does NOT compute the
// phases, the peak window, the interval distribution, the first-dose comparison
// or anything in `bin/intake stats` — those stay in Python, with one
// implementation, and the room says so rather than growing a second set of
// numbers that can drift from the first.
//
// That line is drawn where it is on purpose. Capture arithmetic is addition and
// it is verifiable at a glance; the analysis is where a second implementation
// would quietly start disagreeing with the first, and this repository already
// has two ledgers' worth of that lesson written into it.
//
// ── THE RULES SURVIVE THE PORT ───────────────────────────────────────────────
// Unquantified events count toward every event total and touch no quantity.
// Every figure carries the share of events it was computed from. A remainder
// written off at close is named as one. Those are not the daemon's rules, they
// are the ledger's, and they hold here too.
(function () {
  'use strict';

  var FAMILIES = {
    mass:   { mcg: 0.001, ug: 0.001, mg: 1, g: 1000, kg: 1000000 },
    volume: { ml: 1, cc: 1, cl: 10, dl: 100, l: 1000 },
    count:  { count: 1, ct: 1, tab: 1, cap: 1, pill: 1, dose: 1, patch: 1, puff: 1, drop: 1, unit: 1 }
  };
  var UNITS = {};
  Object.keys(FAMILIES).forEach(function (fam) {
    Object.keys(FAMILIES[fam]).forEach(function (u) { UNITS[u] = [fam, FAMILIES[fam][u]]; });
  });

  function convert(q, from, to) {
    if (from === to) return q;
    var a = UNITS[from], b = UNITS[to];
    if (!a || !b || a[0] !== b[0]) return null;   // never guesses across families
    return q * a[1] / b[1];
  }

  function fmtQty(q, u) {
    if (q === null || q === undefined) return '—';
    var s = Math.abs(q) >= 100 ? q.toFixed(1) : Math.abs(q) >= 1 ? q.toFixed(2) : q.toFixed(3);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s + ' ' + u;
  }
  function fmtDur(sec) {
    if (sec === null || sec === undefined) return '—';
    if (sec < 0) return '-' + fmtDur(-sec);
    sec = Math.floor(sec);
    var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    return d ? d + 'd ' + h + 'h ' + String(m).padStart(2, '0') + 'm'
         : h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
  }
  function fmtWhen(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric',
                                         hour: 'numeric', minute: '2-digit' });
  }
  function median(v) {
    if (!v.length) return null;
    var s = v.slice().sort(function (a, b) { return a - b; }), i = s.length >> 1;
    return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
  }

  /** Replay the log the way `bin/intake`'s project() does: corrections and voids
      applied at read time, so the file on disk still says what was first typed. */
  function build(lines, substances) {
    var events = [];
    lines.forEach(function (l) {
      l = l.trim(); if (!l) return;
      try { events.push(JSON.parse(l)); } catch (e) { /* a torn line is not a unit */ }
    });

    var corrections = {}, voided = {};
    events.forEach(function (e) {
      if (e.type === 'event_corrected') (corrections[e.data.target] = corrections[e.data.target] || []).push(e);
      else if (e.type === 'event_voided') voided[e.data.target] = e;
    });
    function effective(e) {
      var d = Object.assign({}, e.data || {}), at = e.occurred_at, corr = [];
      (corrections[e.id] || []).forEach(function (c) {
        var f = c.data.fields || {};
        corr.push({ reason: c.data.reason });
        Object.assign(d, f);
        if (f.occurred_at) at = f.occurred_at;
      });
      return { data: d, occurred_at: at, corrections: corr, voided: !!voided[e.id] };
    }

    var units = {}, order = 0;
    events.forEach(function (e) {
      if (e.type !== 'unit_created') return;
      var r = effective(e); if (r.voided) return;
      units[e.unit_id] = {
        id: e.unit_id, ordinal: ++order,
        substance: r.data.substance, substance_id: r.data.substance_id,
        initial_quantity: r.data.quantity, quantity_unit: r.data.unit,
        received_at: r.occurred_at, source_context: r.data.source_context,
        note: r.data.note, status: 'active', closed_at: null,
        disposition: null, reconciliation: null, intakes: [], adjustments: []
      };
    });
    events.forEach(function (e) {
      var u = units[e.unit_id]; if (!u) return;
      var r = effective(e);
      if (e.type === 'intake_logged') {
        u.intakes.push({ id: e.id, occurred_at: r.occurred_at, quantity: r.data.quantity,
          quantity_unit: r.data.unit, measurement_type: r.data.measurement_type || 'measured',
          confidence: r.data.confidence, descriptor: r.data.descriptor, note: r.data.note,
          reconciliation: !!r.data.reconciliation, corrections: r.corrections, voided: r.voided });
      } else if (e.type === 'unit_adjusted') {
        u.adjustments.push({ id: e.id, occurred_at: r.occurred_at, kind: r.data.kind,
          quantity: r.data.quantity, quantity_unit: r.data.unit, note: r.data.note,
          corrections: r.corrections, voided: r.voided });
      } else if (e.type === 'unit_closed') {
        u.status = 'closed'; u.closed_at = e.occurred_at || e.timestamp;
        u.disposition = e.data.disposition; u.reconciliation = e.data.reconciliation;
        u.closing_note = e.data.note;
      } else if (e.type === 'unit_reopened') {
        u.status = 'active'; u.closed_at = null; u.disposition = null; u.reconciliation = null;
      }
    });

    var list = Object.keys(units).map(function (k) { return units[k]; })
                     .sort(function (a, b) { return a.ordinal - b.ordinal; });
    list.forEach(function (u) {
      u.intakes.sort(function (a, b) { return a.occurred_at < b.occurred_at ? -1 : 1; });
      u.adjustments.sort(function (a, b) { return a.occurred_at < b.occurred_at ? -1 : 1; });
      analyse(u);
    });
    return list;
  }

  function analyse(u) {
    var bu = u.quantity_unit || 'g';
    var live = u.intakes.filter(function (e) { return !e.voided; });
    var voidedN = u.intakes.length - live.length;
    var inBase = function (e) {
      if (e.quantity === null || e.quantity === undefined) return null;
      return convert(e.quantity, e.quantity_unit || bu, bu);
    };
    var measured = live.filter(function (e) { return e.measurement_type === 'measured' && inBase(e) !== null; });
    var estimated = live.filter(function (e) { return e.measurement_type === 'estimated' && inBase(e) !== null; });
    var unq = live.filter(function (e) { return e.measurement_type === 'unquantified' || inBase(e) === null; });
    var quant = measured.concat(estimated).sort(function (a, b) { return a.occurred_at < b.occurred_at ? -1 : 1; });
    var doses = quant.map(inBase);
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };

    var mTot = sum(measured.map(inBase)), eTot = sum(estimated.map(inBase));
    var recon = sum(quant.filter(function (e) { return e.reconciliation; }).map(inBase));
    var adj = 0;
    u.adjustments.filter(function (a) { return !a.voided; }).forEach(function (a) {
      var q = a.quantity === null ? null : convert(a.quantity, a.quantity_unit || bu, bu);
      if (q !== null) adj += (a.kind === 'found' ? -q : q);
    });

    var accounted = mTot + eTot + adj;
    var initial = u.initial_quantity;
    var remaining = initial === null || initial === undefined ? null : Math.max(0, initial - accounted);
    var times = live.map(function (e) { return new Date(e.occurred_at).getTime(); }).sort();
    var received = u.received_at ? new Date(u.received_at).getTime() : null;
    var end = u.closed_at ? new Date(u.closed_at).getTime() : (times.length ? times[times.length - 1] : received);
    var dur = (received !== null && end !== null) ? (end - received) / 1000 : null;
    var chrono = dur !== null && dur < 0;
    if (chrono) dur = null;

    u.analysis = {
      quantity_unit: bu,
      events: { total: live.length, measured: measured.length, estimated: estimated.length,
                unquantified: unq.length, voided: voidedN },
      coverage: live.length ? quant.length / live.length : null,
      measured_total: mTot, estimated_total: eTot, quantified_total: mTot + eTot,
      reconciliation_total: recon, adjusted_total: adj, accounted: accounted,
      remaining: remaining,
      overdrawn: initial !== null && initial !== undefined && (initial - accounted) < -1e-9,
      remaining_is_estimate: !!(estimated.length || unq.length),
      duration_seconds: dur, chronology_error: chrono,
      dose: { n: doses.length,
              mean: doses.length ? sum(doses) / doses.length : null,
              median: median(doses),
              min: doses.length ? Math.min.apply(null, doses) : null,
              max: doses.length ? Math.max.apply(null, doses) : null,
              stdev: null, cv: null },
      // Deliberately absent in web mode; see the header. The room asks for the
      // daemon rather than inventing a second set of these.
      interval: { n: 0, mean: null, median: null, min: null, max: null },
      phases: null, peak_window: null, first_dose: null, later_dose_mean: null,
      rate_per_day: null, events_per_day: null,
      time_of_day: null, depleted_within_24h: false
    };
    u.display = display(u);
    u.reconciliation = u.status === 'closed' ? u.reconciliation : reconcile(u);
  }

  function coverageLine(a) {
    var e = a.events, q = e.measured + e.estimated;
    if (!e.total) return 'no events logged';
    if (!e.unquantified) return 'all ' + e.total + ' events carry a quantity';
    return q + ' of ' + e.total + ' events carry a quantity (' +
           Math.round(a.coverage * 100) + '%); ' + e.unquantified + ' logged without one';
  }

  function display(u) {
    var a = u.analysis, bu = u.quantity_unit;
    return {
      initial: fmtQty(u.initial_quantity, bu),
      logged: fmtQty(a.quantified_total, bu),
      remaining: fmtQty(a.remaining, bu),
      remaining_is_estimate: a.remaining_is_estimate,
      mean: a.dose.n ? fmtQty(a.dose.mean, bu) : null,
      coverage: coverageLine(a),
      received: fmtWhen(u.received_at),
      closed: u.closed_at ? fmtWhen(u.closed_at) : null,
      duration: fmtDur(a.duration_seconds),
      overdrawn: a.overdrawn,
      events: eventLines(u)
    };
  }

  function eventLines(u) {
    var rows = [];
    u.intakes.forEach(function (e) {
      var mark = e.voided ? 'x' : e.measurement_type === 'estimated' ? '~'
               : e.measurement_type === 'unquantified' ? '?' : ' ';
      var what = e.quantity === null || e.quantity === undefined
        ? (e.descriptor || '—') : fmtQty(e.quantity, e.quantity_unit);
      rows.push([e.occurred_at, '  ' + mark + ' ' + stamp(e.occurred_at) + '  ' +
        pad(what, 12) + '  ' + e.id.slice(-6) + (e.corrections.length ? '  (corrected)' : '') +
        (e.note ? '  ' + e.note : '')]);
    });
    u.adjustments.forEach(function (a) {
      rows.push([a.occurred_at, '  ! ' + stamp(a.occurred_at) + '  ' +
        pad(fmtQty(a.quantity, a.quantity_unit), 12) + '  ' + a.id.slice(-6) + '  ' + a.kind +
        (a.note ? ' — ' + a.note : '')]);
    });
    rows.sort(function (x, y) { return x[0] < y[0] ? -1 : 1; });
    return rows.map(function (r) { return r[1]; });
  }
  function pad(s, n) { s = String(s); return ' '.repeat(Math.max(0, n - s.length)) + s; }
  function stamp(iso) {
    var d = new Date(iso), M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return M[d.getMonth()] + ' ' + d.getDate() + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function reconcile(u) {
    var a = u.analysis, initial = u.initial_quantity;
    if (initial === null || initial === undefined) return null;
    var gap = initial - a.accounted;
    var tol = Math.max(1e-9, Math.abs(initial) * 1e-6);
    return { initial: initial, quantified_intake: a.quantified_total, adjusted: a.adjusted_total,
             unaccounted: gap, quantity_unit: u.quantity_unit,
             needs_answer: Math.abs(gap) > tol, overdrawn: gap < -tol,
             unquantified_events: a.events.unquantified };
  }

  // ── writing ───────────────────────────────────────────────────────────────
  // The same ULID `bin/intake` mints: 48 bits of millisecond timestamp then 80
  // of randomness, Crockford base32. Sortable, so ids in the log sort into the
  // order they were recorded, and collision-resistant enough that two devices
  // writing the same second cannot produce the same id.
  var C32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function ulid() {
    var ms = Date.now(), out = '';
    var rand = crypto.getRandomValues(new Uint8Array(10));
    var bits = BigInt(ms) << 80n;
    for (var i = 0; i < 10; i++) bits |= BigInt(rand[i]) << BigInt(8 * (9 - i));
    for (var sh = 125; sh >= 0; sh -= 5) out += C32[Number((bits >> BigInt(sh)) & 31n)];
    return out;
  }

  function iso(d) {
    d = d || new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    var off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-';
    off = Math.abs(off);
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) +
      sign + p(Math.floor(off / 60)) + ':' + p(off % 60);
  }

  /** One event, in `bin/intake`'s envelope. `interface: web` is how the record
      later says which of the three surfaces a night was logged from. */
  function event(type, unitId, data, occurredAt) {
    return JSON.stringify({
      id: 'intake_evt_' + ulid(),
      type: type,
      timestamp: iso(),
      occurred_at: occurredAt || iso(),
      unit_id: unitId || null,
      data: data || {},
      source: { application: 'leviathan', tool: 'boss-office', interface: 'web' }
    });
  }

  function newUnitId() { return 'intake_unit_' + ulid(); }

  /** The exact shape `boss.js` renders, assembled from the sealed log. */
  function state(lines, catalog) {
    var units = build(lines);
    var today = iso().slice(0, 10);
    var n = 0;
    units.forEach(function (u) {
      u.intakes.forEach(function (e) {
        if (!e.voided && String(e.occurred_at).slice(0, 10) === today) n++;
      });
    });
    var qu = {};
    Object.keys(FAMILIES).forEach(function (fam) {
      qu[fam] = Object.keys(FAMILIES[fam]).sort(function (a, b) {
        return FAMILIES[fam][a] - FAMILIES[fam][b];
      });
    });
    return {
      substances: (catalog && catalog.substances) || [],
      categories: (catalog && catalog.categories) ||
        ['stimulant','depressant','psychedelic','dissociative','opioid',
         'cannabinoid','prescription','supplement','other'],
      units: units,
      quantity_units: qu,
      confidences: ['high', 'medium', 'low'],
      dispositions: ['consumed', 'discarded', 'transferred', 'unknown', 'other'],
      resolutions: ['final_intake', 'discrepancy', 'lost', 'transferred', 'other'],
      adjustment_kinds: ['spill','loss','transfer','seizure','disposal','found','correction'],
      warnings: [], errors: [], today: n
    };
  }

  window.BossWeb = {
    build: build, state: state, event: event, newUnitId: newUnitId, ulid: ulid, iso: iso,
    fmtQty: fmtQty, fmtDur: fmtDur, fmtWhen: fmtWhen,
    convert: convert, UNITS: UNITS, FAMILIES: FAMILIES, coverageLine: coverageLine
  };
})();
