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
    var unq2 = unq;
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
      first_event: times.length ? isoOf(times[0]) : null,
      last_event: times.length ? isoOf(times[times.length - 1]) : null,
      dose: spread(doses),
      interval: spread(intervals(times)),
      first_dose: doses.length ? doses[0] : null,
      later_dose_mean: doses.length > 1 ? sum(doses.slice(1)) / (doses.length - 1) : null,
      rate_per_day: dur ? accounted / (dur / 86400) : null,
      events_per_day: dur ? live.length / (dur / 86400) : null,
      peak_window: peakWindow(times),
      time_of_day: hourHistogram(times),
      phases: phases(quant, unq2, doses, bu),
      depleted_within_24h: dur !== null && dur <= 86400 && u.status === 'closed'
    };
    u.display = display(u);
    u.reconciliation = u.status === 'closed' ? u.reconciliation : reconcile(u);
  }

  // Mirrors bin/intake's coverage_line() exactly — a parity test compares the
  // two strings, so any change here is a change there. It answers two questions:
  // how many events carry a number at all, and how many of those came off a
  // scale. A table logged entirely by one-tap presets has full coverage and not
  // one measurement on it, and saying only the first half reads as reassurance.
  // ── the analysis helpers ──────────────────────────────────────────────────
  // Each one mirrors a named function in `bin/intake`, and a parity harness
  // compares every field the pair produces over a log holding every awkward
  // case. That check is the only thing standing between two implementations
  // and two different accounts of the same night, so it is not optional.
  var PEAK_WINDOW_HOURS = 5;

  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  /** Mirrors _spread(). stdev is the SAMPLE deviation (n-1), as statistics.stdev. */
  function spread(values) {
    var v = values.filter(function (x) { return x !== null && x !== undefined; });
    if (!v.length) return { n: 0, mean: null, median: null, min: null, max: null,
                            stdev: null, cv: null };
    var mean = sum(v) / v.length, sd = null;
    if (v.length > 1) {
      sd = Math.sqrt(sum(v.map(function (x) { return (x - mean) * (x - mean); })) / (v.length - 1));
    }
    return { n: v.length, mean: mean, median: median(v),
             min: Math.min.apply(null, v), max: Math.max.apply(null, v),
             stdev: sd, cv: (sd !== null && mean) ? sd / mean : null };
  }

  function intervals(times) {
    var out = [];
    for (var i = 1; i < times.length; i++) out.push((times[i] - times[i - 1]) / 1000);
    return out;
  }

  /** Densest PEAK_WINDOW_HOURS window, anchored on a real event. */
  function peakWindow(times) {
    if (times.length < 2) return null;
    var span = PEAK_WINDOW_HOURS * 3600 * 1000, best = null;
    for (var i = 0; i < times.length; i++) {
      var j = i;
      while (j + 1 < times.length && times[j + 1] - times[i] <= span) j++;
      var count = j - i + 1;
      if (!best || count > best.events) {
        best = { start: isoOf(times[i]), end: isoOf(times[j]), events: count };
      }
    }
    return best && best.events > 1 ? best : null;
  }

  function hourHistogram(times) {
    var h = new Array(24).fill(0);
    times.forEach(function (t) { h[new Date(t).getHours()]++; });
    return h;
  }

  /** First 25% / middle 50% / final 25% of the unit, cut by QUANTITY consumed —
      the question is whether it sped up toward the end, not how the clock ran. */
  function phases(quant, unq, doses, bu) {
    var total = sum(doses);
    if (!quant.length || total <= 0) return null;
    var bounds = [[0, 0.25, 'first 25%'], [0.25, 0.75, 'middle 50%'], [0.75, 1, 'final 25%']];
    var buckets = {};
    bounds.forEach(function (b) {
      buckets[b[2]] = { label: b[2], events: 0, unquantified: 0, quantity: 0, times: [] };
    });
    var cum = 0;
    quant.forEach(function (ev, i) {
      var qty = doses[i], mid = (cum + qty / 2) / total;
      cum += qty;
      for (var k = 0; k < bounds.length; k++) {
        var lo = bounds[k][0], hi = bounds[k][1];
        if ((mid >= lo && mid < hi) || (hi === 1 && mid >= lo)) {
          var b = buckets[bounds[k][2]];
          b.events++; b.quantity += qty; b.times.push(new Date(ev.occurred_at).getTime());
          break;
        }
      }
    });
    unq.forEach(function (e) {
      var t = new Date(e.occurred_at).getTime();
      for (var k = 0; k < bounds.length; k++) {
        var b = buckets[bounds[k][2]];
        if (b.times.length && b.times[0] <= t && t <= b.times[b.times.length - 1]) {
          b.unquantified++; break;
        }
      }
    });
    return bounds.map(function (bd) {
      var b = buckets[bd[2]], ts = b.times.slice().sort(function (x, y) { return x - y; });
      return { label: b.label, events: b.events, unquantified: b.unquantified,
               quantity: Math.round(b.quantity * 1e6) / 1e6, quantity_unit: bu,
               seconds: ts.length > 1 ? (ts[ts.length - 1] - ts[0]) / 1000 : 0,
               start: ts.length ? isoOf(ts[0]) : null,
               end: ts.length ? isoOf(ts[ts.length - 1]) : null };
    });
  }

  function isoOf(ms) { return iso(new Date(ms)); }

  function coverageLine(a) {
    var e = a.events, q = e.measured + e.estimated, base;
    if (!e.total) return 'no events logged';
    if (!e.unquantified) base = e.total === 1 ? 'the one event carries a quantity'
                                               : 'all ' + e.total + ' events carry a quantity';
    else base = q + ' of ' + e.total + ' events carry a quantity (' +
                Math.round(a.coverage * 100) + '%); ' + e.unquantified + ' logged without one';
    if (!q) return base;
    if (!e.estimated) return base + (e.total === 1 ? ', and it was weighed' : ' — every one weighed');
    if (!e.measured) return base + (e.estimated === 1
      ? ' — but it was not weighed; it is an estimate'
      : ' — but none was weighed; all ' + e.estimated + ' are estimates');
    return base + ' — ' + e.measured + ' weighed, ' + e.estimated + ' estimated';
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

  // ── 勘定 · the cross-unit read ────────────────────────────────────────────
  // Mirrors cross_stats(). This is the part a night-by-night diary can never
  // reach — how long a size actually lasts, how often one is gone inside a day,
  // how wide the lines run, whether any of it has drifted month over month.
  function crossStats(units, substance, since, until) {
    var sel = units.filter(function (u) {
      if (substance && (u.substance_id || '') !== substance &&
          (u.substance || '').toLowerCase().indexOf(String(substance).toLowerCase()) < 0) return false;
      if (since && String(u.received_at).slice(0, 10) < since) return false;
      if (until && String(u.received_at).slice(0, 10) > until) return false;
      return true;
    });
    if (!sel.length) return null;

    var bySub = {}, hours = new Array(24).fill(0), allEvents = 0;
    sel.forEach(function (u) {
      var bu = u.quantity_unit, a = u.analysis;
      var b = bySub[u.substance] || (bySub[u.substance] = {
        substance: u.substance, unit: bu, units: 0, closed: 0, events: 0,
        quantified: 0, unquantified: 0, doses: [], durations: [], initials: [],
        rates: [], under24: 0, monthly: {} });
      b.units++;
      b.events += a.events.total;
      b.unquantified += a.events.unquantified;
      b.quantified += a.events.measured + a.events.estimated;
      allEvents += a.events.total;
      u.intakes.filter(function (e) { return !e.voided; }).forEach(function (e) {
        hours[new Date(e.occurred_at).getHours()]++;
        if (e.quantity === null || e.quantity === undefined) return;
        var q = convert(e.quantity, e.quantity_unit || bu, b.unit);
        if (q === null) return;
        b.doses.push(q);
        var mo = String(e.occurred_at).slice(0, 7);
        (b.monthly[mo] || (b.monthly[mo] = [])).push(q);
      });
      if (u.status === 'closed') {
        b.closed++;
        if (a.duration_seconds) b.durations.push(a.duration_seconds);
        if (a.depleted_within_24h) b.under24++;
      }
      if (u.initial_quantity !== null && u.initial_quantity !== undefined) {
        var init = convert(u.initial_quantity, bu, b.unit);
        if (init !== null) b.initials.push(init);
      }
      if (a.rate_per_day) b.rates.push(a.rate_per_day);
    });

    var bands = Object.keys(bySub).map(function (k) {
      var b = bySub[k];
      b.dose = spread(b.doses); b.duration = spread(b.durations);
      b.initial = spread(b.initials); b.rate = spread(b.rates);
      b.trend = Object.keys(b.monthly).sort().map(function (mo) {
        var v = b.monthly[mo];
        return { month: mo, n: v.length, mean: sum(v) / v.length };
      });
      delete b.monthly;
      return b;
    }).sort(function (x, y) { return y.units - x.units; });

    var dates = sel.map(function (u) { return u.received_at; }).sort();
    return {
      units: sel.length,
      closed: sel.filter(function (u) { return u.status === 'closed'; }).length,
      events: allEvents,
      span: [dates[0], dates[dates.length - 1]],
      time_of_day: hours,
      substances: bands
    };
  }

  // ── the receipt and the count, rendered here ──────────────────────────────
  // These print the same findings `bin/intake report` and `bin/intake stats`
  // print. They are NOT byte-pinned to the Python — the numbers are, by the
  // parity harness, and that is the part that can be wrong in a way a reader
  // cannot see. Layout is allowed to differ; arithmetic is not.
  function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }
  function rpad(s, n) { s = String(s); return ' '.repeat(Math.max(0, n - s.length)) + s; }

  function report(u) {
    var a = u.analysis, bu = u.quantity_unit, L = [];
    L.push('UNIT REPORT');
    L.push(u.substance + ' · unit #' + u.ordinal + ' · ' + u.id);
    L.push('─'.repeat(62));
    var rows = [
      ['Received', fmtWhen(u.received_at)],
      ['Closed', u.closed_at ? fmtWhen(u.closed_at) : 'still open'],
      ['Duration', fmtDur(a.duration_seconds)],
      ['Initial quantity', fmtQty(u.initial_quantity, bu)],
      ['', ''],
      ['Consumption events', String(a.events.total)],
      ['  measured', String(a.events.measured)],
      ['  estimated', String(a.events.estimated)],
      ['  unquantified', String(a.events.unquantified)]
    ];
    if (a.events.voided) rows.push(['  voided', String(a.events.voided)]);
    rows.push(['', '']);
    rows.push(['Quantified intake', fmtQty(a.quantified_total, bu)]);
    rows.push(['  of which measured', fmtQty(a.measured_total, bu)]);
    rows.push(['  of which estimated', fmtQty(a.estimated_total, bu)]);
    if (a.adjusted_total) rows.push(['Adjustments', fmtQty(a.adjusted_total, bu)]);
    if (u.status === 'active') {
      rows.push(['Remaining', fmtQty(a.remaining, bu) + (a.remaining_is_estimate ? ' (estimate)' : '')]);
    }
    var d = a.dose;
    rows.push(['', '']);
    rows.push(['Average dose', fmtQty(d.mean, bu)]);
    rows.push(['Median dose', fmtQty(d.median, bu)]);
    rows.push(['Smallest dose', fmtQty(d.min, bu)]);
    rows.push(['Largest dose', fmtQty(d.max, bu)]);
    rows.push(['Dose variability', d.cv === null ? '—' : d.cv.toFixed(2) + ' CV']);
    rows.push(['Average interval', fmtDur(a.interval.mean)]);
    rows.push(['Median interval', fmtDur(a.interval.median)]);
    if (a.rate_per_day) {
      rows.push(['Rate of consumption', fmtQty(a.rate_per_day, bu) + ' / day, quantified events only']);
    }
    if (a.peak_window) {
      rows.push(['Peak usage window', hourLabel(a.peak_window.start) + '–' +
        hourLabel(a.peak_window.end, true) + ' (' + a.peak_window.events + ' events in 5h)']);
    }
    var w = Math.max.apply(null, rows.map(function (r) { return r[0].length; })) + 2;
    rows.forEach(function (r) { L.push(!r[0] && !r[1] ? '' : pad(r[0], w) + r[1]); });

    L.push('');
    L.push('COVERAGE');
    L.push('  ' + coverageLine(a));
    if (a.events.unquantified) {
      L.push('  Every quantity above is computed from the quantified events alone.');
    }
    if (a.reconciliation_total) {
      L.push('  ' + fmtQty(a.reconciliation_total, bu) + ' of the quantified total is a ' +
             'single remainder written off at close, not a watched dose.');
    }
    if (a.overdrawn) L.push('  ⚠ more has been logged against this unit than it was opened with.');
    if (a.chronology_error) {
      L.push('  ⚠ an event is dated before the unit was received — duration, rate and ' +
             'phases are withheld until one of the two timestamps is corrected.');
    }

    if (a.phases) {
      L.push('');
      L.push('PHASES OF THE UNIT (by quantity consumed, ' + bu + ')');
      a.phases.forEach(function (ph) {
        L.push('  ' + pad(ph.label, 13) + rpad(ph.events, 2) + ' events' +
          (ph.unquantified ? ' +' + ph.unquantified + ' unquantified' : '') +
          '   ' + rpad(fmtQty(ph.quantity, bu), 10) + '  over ' + fmtDur(ph.seconds));
      });
      var f = a.phases[0], l = a.phases[a.phases.length - 1];
      if (f.seconds && l.seconds) {
        var fr = f.quantity / (f.seconds / 3600), lr = l.quantity / (l.seconds / 3600);
        L.push('  velocity      ' + fmtQty(fr, bu) + '/h at the start vs ' +
          fmtQty(lr, bu) + '/h at the end — ' +
          (lr > fr * 1.15 ? 'accelerating toward depletion'
            : fr > lr * 1.15 ? 'slowing toward depletion' : 'roughly even'));
      }
    }

    if (a.first_dose !== null && a.later_dose_mean !== null) {
      L.push('');
      L.push('FIRST DOSE');
      L.push('  ' + fmtQty(a.first_dose, bu) + ' against a later mean of ' +
        fmtQty(a.later_dose_mean, bu) + ' — ' +
        (a.first_dose > a.later_dose_mean * 1.1 ? 'larger than'
          : a.first_dose * 1.1 < a.later_dose_mean ? 'smaller than' : 'in line with') +
        ' the rest.');
    }

    if (a.time_of_day && a.time_of_day.some(Boolean)) {
      L.push('');
      L.push('TIME OF DAY (events per hour, 00–23)');
      L.push('  ' + sparkline(a.time_of_day));
      L.push('  ' + [0,3,6,9,12,15,18,21].map(function (h) { return pad(h, 3); }).join(''));
    }

    if (u.status === 'closed') {
      var r = u.reconciliation || {};
      L.push('');
      L.push('FINAL DISPOSITION');
      L.push('  ' + (u.disposition || 'closed'));
      if (r.resolution && r.resolution !== 'balanced') {
        L.push('  ' + fmtQty(Math.abs(r.unaccounted || 0), bu) + ' unaccounted → ' +
               String(r.resolution).replace(/_/g, ' '));
      } else if (r.resolution) {
        L.push('  the ledger balanced — nothing unaccounted for');
      }
      if (u.closing_note) L.push('  note: ' + u.closing_note);
    }
    return L.join('\n') + '\n';
  }

  var BAR = '▁▂▃▄▅▆▇█';
  function sparkline(v) {
    var top = Math.max.apply(null, v);
    if (!top) return '·'.repeat(v.length);
    return v.map(function (x) {
      return x ? BAR[Math.min(7, Math.floor(x / top * 7.999))] : '·';
    }).join('');
  }
  function hourLabel(isoStr, endOnly) {
    var d = new Date(isoStr), M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var h = d.getHours(), ampm = h < 12 ? 'am' : 'pm', hh = h % 12 || 12;
    return endOnly ? hh + ampm : M[d.getMonth()] + ' ' + d.getDate() + ' · ' + hh + ampm;
  }

  function statsText(st) {
    if (!st) return 'No units match that filter.\n';
    var L = ['ACROSS ' + st.units + ' UNIT(S) — ' + st.closed + ' closed, ' + st.events + ' events',
             fmtWhen(st.span[0]) + '  →  ' + fmtWhen(st.span[1]), ''];
    st.substances.forEach(function (b) {
      var bu = b.unit;
      L.push(b.substance.toUpperCase() + '   ' + b.units + ' unit(s), ' + b.closed + ' closed');
      L.push('  coverage        ' + (b.unquantified
        ? b.quantified + ' of ' + b.events + ' events quantified'
        : 'all ' + b.events + ' events quantified'));
      if (b.initial.n) L.push('  unit size       median ' + fmtQty(b.initial.median, bu) +
        '  (range ' + fmtQty(b.initial.min, bu) + '–' + fmtQty(b.initial.max, bu) + ')');
      if (b.duration.n) {
        L.push('  unit lasts      median ' + fmtDur(b.duration.median) +
          '  (range ' + fmtDur(b.duration.min) + '–' + fmtDur(b.duration.max) + ')');
        L.push('  gone in <24h    ' + b.under24 + ' of ' + b.duration.n + ' closed units');
      }
      if (b.dose.n) L.push('  dose            mean ' + fmtQty(b.dose.mean, bu) + ' · median ' +
        fmtQty(b.dose.median, bu) + ' · range ' + fmtQty(b.dose.min, bu) + '–' +
        fmtQty(b.dose.max, bu) + (b.dose.cv === null ? '' : ' · CV ' + b.dose.cv.toFixed(2)));
      if (b.rate.n) L.push('  rate            median ' + fmtQty(b.rate.median, bu) + ' / day');
      if (b.trend.length > 1) {
        L.push('  by month        ' + b.trend.map(function (t) {
          return t.month.slice(2) + ' ' + fmtQty(t.mean, bu) + '×' + t.n; }).join('  '));
        var f = b.trend[0], l = b.trend[b.trend.length - 1];
        if (f.mean) {
          var delta = (l.mean - f.mean) / f.mean;
          L.push('  drift           mean dose ' + (delta > 0 ? 'up' : 'down') + ' ' +
            Math.abs(delta * 100).toFixed(0) + '% from ' + f.month + ' to ' + l.month +
            (b.trend.length < 4 ? '  (two months of data — not a trend yet)' : ''));
        }
      }
      L.push('');
    });
    if (st.time_of_day.some(Boolean)) {
      L.push('TIME OF DAY (all events, 00–23)');
      L.push('  ' + sparkline(st.time_of_day));
      L.push('  ' + [0,3,6,9,12,15,18,21].map(function (h) { return pad(h, 3); }).join(''));
      L.push('');
    }
    return L.join('\n');
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

  // THE CATALOG FLOOR. The quick-log buttons exist only for substances in the
  // catalog, so a failed catalog fetch used to mean no buttons AND an empty
  // select box — a total loss of function from one silent network error. This is
  // the compiled-in copy of `intake/substances.json`, used only when every
  // network path failed, and the room says on screen when it is running on this
  // rather than on the live list.
  var BUILTIN = {
    categories: ['stimulant', 'depressant', 'psychedelic', 'dissociative', 'opioid',
                 'cannabinoid', 'prescription', 'supplement', 'other'],
    substances: [
      { id: 'buprenorphine', name: 'Buprenorphine', category: 'opioid',
        default_unit: 'mg', presets: [] },
      { id: 'caffeine', name: 'Caffeine', category: 'stimulant', default_unit: 'mg',
        presets: [{ id: 'coffee', label: 'A COFFEE', quantity: 150, unit: 'mg',
                    measurement_type: 'estimated', confidence: 'low',
                    note: 'preset: one brewed coffee, 150 mg — an 8 oz cup runs 95-165 mg, ' +
                          'so brew strength moves this more than cup size does' }] },
      { id: 'cannabis', name: 'Cannabis', category: 'cannabinoid', default_unit: 'g',
        presets: [{ id: 'one-hitter', label: 'ONE HITTER', quantity: 0.05, unit: 'g',
                    measurement_type: 'estimated', confidence: 'medium',
                    note: 'preset: one-hitter bowl, 0.05 g — a fixed bowl, so it repeats well' }] },
      { id: 'cocaine', name: 'Cocaine', category: 'stimulant', default_unit: 'g',
        presets: [{ id: 'line', label: 'ONE LINE', quantity: 0.1, unit: 'g',
                    measurement_type: 'estimated', confidence: 'low',
                    note: 'preset: one line, 0.1 g by eye — the widest-spread estimate here' }] },
      { id: 'nicotine', name: 'Nicotine', category: 'stimulant', default_unit: 'mg',
        presets: [{ id: 'cigarette', label: 'ONE CIGARETTE', quantity: 12, unit: 'mg',
                    measurement_type: 'estimated', confidence: 'medium',
                    note: 'preset: one cigarette — 12 mg is CONTENT in the rod (typical ' +
                          '10-14 mg), which is what leaves the pack. Absorbed dose is ' +
                          'roughly 1-1.5 mg, about a tenth of this.' }] }
    ]
  };

  /** The exact shape `boss.js` renders, assembled from the log. */
  function state(lines, catalog) {
    catalog = (catalog && catalog.substances && catalog.substances.length) ? catalog : BUILTIN;
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
    crossStats: crossStats, spread: spread, report: report, statsText: statsText,
    fmtQty: fmtQty, fmtDur: fmtDur, fmtWhen: fmtWhen,
    convert: convert, UNITS: UNITS, FAMILIES: FAMILIES, coverageLine: coverageLine
  };
})();
