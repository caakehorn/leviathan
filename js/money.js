// LEVIATHAN · THE FAMILY LEDGER — renderer
//
// Same shape as the drug ledger and for the same reason: a reader who will not
// scroll a corpus needs dates they can check, quotes they can read, and a
// visible distinction between what is proven and what is merely adjacent.
(function () {
  const L = window.FamilyLedger, M = L.meta;
  const $ = (s) => document.querySelector(s);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const MO = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const pretty = (d) => { const [y, m, dd] = d.split('-').map(Number); return MO[m - 1] + ' ' + dd + ', ' + y; };

  const state = { filter: 'all', open: new Set() };
  const pass = (e) => state.filter === 'all' ? true
    : state.filter === 'chain' ? e.chain
    : state.filter === 'linked' ? e.linked
    : state.filter === 'asked' ? e.kind === 'ASKED'
    : state.filter === 'sugie' ? e.src === 'SUGIE'
    : true;

  function render() {
    const host = $('#rows'); host.replaceChildren();
    const list = L.events.filter(pass);
    $('#count').textContent = list.length + ' EVENT' + (list.length === 1 ? '' : 'S') + ' SHOWN';
    let n = 0;
    for (const e of list) {
      n++;
      const row = el('div', 'row' + (e.chain ? ' chain' : e.linked ? ' linked' : ''));
      const head = el('button', 'head');
      head.append(el('span', 'date', pretty(e.d) + '  ' + e.t));
      head.append(el('span', 'src s' + e.src, e.src));
      head.append(el('span', 'kind', e.kind));
      const v = el('span', 'verdict');
      v.textContent = (e.chain ? 'STATES BOTH HALVES IN ONE MESSAGE · ' : '') + e.desc;
      head.append(v);
      head.addEventListener('click', () => { state.open.has(e.d + e.t) ? state.open.delete(e.d + e.t) : state.open.add(e.d + e.t); render(); });
      row.append(head);
      if (state.open.has(e.d + e.t)) {
        const q = el('div', 'q qHer');
        q.append(el('div', 'qm', 'ANNIE · ' + e.t
          + (e.recv ? '  ·  RECEIVED $' + e.recv : '') + (e.spend ? '  ·  TOWARD A BUY $' + e.spend : '')));
        q.append(el('div', 'qx', '“' + e.x + '”'));
        if (window.TranscriptLink) {
          q.append(window.TranscriptLink.el({ d: e.d, t: e.t, who: 'A', text: e.x }));
        }
        row.append(q);
        for (const s of e.q) {
          if (s.x === e.x.slice(0, 230)) continue;
          const b = el('div', 'q qSup');
          b.append(el('div', 'qm', 'SAME DAY · ' + s.t));
          b.append(el('div', 'qx', '“' + s.x + '”'));
          if (window.TranscriptLink) {
            b.append(window.TranscriptLink.el({ d: e.d, t: s.t, who: '?', text: s.x }));
          }
          row.append(b);
        }
        row.append(el('div', 'src-note', 'VERIFY: every quote above links to the exact line it came from '
          + 'in the full record.'
          + (e.chain ? '' : ' A same-day link is circumstantial — she had other bills, and money is fungible.')));
        if (window.TranscriptLink) row.append(window.TranscriptLink.dayEl(e.d));
      }
      host.append(row);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('#hdrStat').textContent = M.events + ' EVENTS ACROSS ' + M.days + ' DAYS · ' + M.from + ' → ' + M.to;
    for (const [id, lab] of [['all', 'ALL EVENTS'], ['chain', 'BOTH HALVES, ONE MESSAGE'], ['linked', 'SAME-DAY SUPPLY'],
      ['asked', 'SHE ASKED'], ['sugie', 'FROM HER GRANDMOTHER']]) {
      const b = el('button', 'chip' + (state.filter === id ? ' on' : ''), lab);
      b.addEventListener('click', () => {
        state.filter = id;
        document.querySelectorAll('#filters .chip').forEach((c) => c.classList.remove('on'));
        b.classList.add('on'); render();
      });
      $('#filters').append(b);
    }
    render();
  });
})();
