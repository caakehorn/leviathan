// LEVIATHAN · TRANSCRIPT LINK — every quote points back at the record
//
// The evidence pages quote messages. This turns each of those quotes into a
// link to the exact line of transcript.html it came from, so a reader who does
// not believe a claim never has to take it on trust: one click puts them in the
// full unedited history at that message, with everything said around it.
//
// Lookup order, against the table built by tools/build-transcript-index.js:
//   1. exact   date + minute + speaker + head of the text
//   2. minute  date + minute + speaker
//   3. day     first line of that date
// Anything the export does not cover gets no link and says so. A quote from
// before the export window is labelled as outside it rather than left blank,
// because a reader who sees some rows linked and others bare will otherwise
// assume the bare ones are the weak ones.
(function () {
  const X = window.TranscriptIndex || null;
  const fp = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 28);

  const CSS = `
.tlink{display:inline-flex;align-items:center;gap:7px;margin:8px 0 2px;padding:5px 11px;
  border:1px solid #39ff14;border-radius:3px;background:#0d3308;color:#39ff14;
  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;font-weight:600;
  letter-spacing:.09em;text-decoration:none;cursor:pointer;transition:background .12s}
.tlink:hover{background:#39ff14;color:#0a2605}
.tlink .tln{opacity:.78;font-weight:400}
.tlink.day{border-color:#b026ff;background:#082510;color:#e0a3ff}
.tlink.day:hover{background:#b026ff;color:#041206}
.tnone{display:inline-block;margin:8px 0 2px;padding:5px 0;color:#6f8a5e;
  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.06em}`;

  function injectCSS() {
    if (document.getElementById('tlink-css')) return;
    const s = document.createElement('style');
    s.id = 'tlink-css';
    s.textContent = CSS;
    (document.head || document.documentElement).append(s);
  }

  const inRange = (d) => !!X && typeof d === 'string' && d >= X.from && d <= X.to;

  // who: 'A' Annie, 'D' Dan, '?' unknown — unknown tries both.
  function line(q) {
    if (!X || !q || !q.d) return null;
    const t = (q.t || '').slice(0, 5);
    const whos = !q.who || q.who === '?' ? ['A', 'D'] : [q.who];
    if (t && q.text) {
      for (const w of whos) {
        const v = X.k[q.d + '|' + t + '|' + w + '|' + fp(q.text)];
        if (v) return v;
      }
    }
    if (t) {
      for (const w of whos) {
        const v = X.m[q.d + '|' + t + '|' + w];
        if (v) return v;
      }
    }
    return null;
  }

  const dayLine = (d) => (X && X.d[d]) || null;
  const href = (n) => 'transcript.html#L' + n;

  function anchor(n, label, cls) {
    const a = document.createElement('a');
    a.className = 'tlink' + (cls ? ' ' + cls : '');
    a.href = href(n);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Opens the full message record at line ' + n;
    const t = document.createElement('span');
    t.textContent = label;
    const l = document.createElement('span');
    l.className = 'tln';
    l.textContent = 'line ' + n.toLocaleString('en-US');
    a.append(t, l);
    return a;
  }

  function note(txt) {
    const s = document.createElement('span');
    s.className = 'tnone';
    s.textContent = txt;
    return s;
  }

  // The element to hang under a quote: a link when the message is in the
  // export, a stated reason when it is not.
  function el(q, label) {
    injectCSS();
    const n = line(q);
    if (n) return anchor(n, label || 'READ IT IN THE TRANSCRIPT →', '');
    if (!X) return note('transcript index not loaded');
    if (!inRange(q && q.d)) {
      return note('· this message predates the transcript export (' + X.from + ' onward)');
    }
    const d = dayLine(q && q.d);
    if (d) return anchor(d, 'OPEN THAT DAY IN THE TRANSCRIPT →', 'day');
    return note('· not found in the transcript export');
  }

  // Day-level link for a whole row: "everything said that day".
  function dayEl(d, label) {
    injectCSS();
    const n = dayLine(d);
    if (n) return anchor(n, label || 'OPEN THIS DAY IN THE TRANSCRIPT →', 'day');
    if (!X) return note('transcript index not loaded');
    if (!inRange(d)) return note('· this day predates the transcript export (' + X.from + ' onward)');
    return note('· this day is not in the transcript export');
  }

  window.TranscriptLink = { line, dayLine, dayEl, el, href, inRange, meta: X };
})();
