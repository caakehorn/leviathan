// LEVIATHAN · THE DRUG LEDGER — renderer
//
// Deliberately not a canvas instrument. This page is for a reader who will not
// scroll a corpus and will not trust a chart they cannot check: every row is a
// real date they can look up in the full export, every quote is verbatim, and
// the running tallies are visible at all times so no single day has to carry an
// argument on its own.
(function () {
  const L = window.DrugLedger;
  const M = L.meta;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const pretty = (d) => {
    const [y, m, dd] = d.split('-').map(Number);
    return MONTHS[m - 1] + ' ' + dd + ', ' + y;
  };

  // What the day amounts to, stated in one line and derived only from counts.
  // No adjectives that the numbers do not already earn.
  function verdict(x) {
    const bits = [];
    if (x.denom) bits.push(x.denom === 1 ? 'she names the size' : 'she names the size ' + x.denom + '×');
    if (x.ask) bits.push(x.ask === 1 ? 'she asks' : 'she asks ' + x.ask + '×');
    if (x.fund) bits.push(x.fund === 1 ? 'she moves the money' : 'she moves the money ' + x.fund + '×');
    if (x.up) bits.push('HE PUSHES A BIGGER BUY');
    if (x.cond) bits.push('HE TIES SUPPLY TO HER TIME');
    if (!bits.length) bits.push('supply discussed, no transaction recorded');
    return bits.join(' · ');
  }

  function tone(x) {
    if (x.up || x.cond) return 'adverse';
    if (x.denom || x.fund || x.ask) return 'her';
    return 'flat';
  }

  const state = { filter: 'all', open: new Set() };

  function rows() {
    return L.days.filter((x) => {
      if (state.filter === 'order') return x.denom;
      if (state.filter === 'fund') return x.fund;
      if (state.filter === 'ask') return x.ask;
      if (state.filter === 'adverse') return x.up || x.cond;
      if (state.filter === 'him') return x.open === 'HIM';
      return true;
    });
  }

  function render() {
    const host = $('#rows');
    host.replaceChildren();
    const list = rows();
    $('#count').textContent = list.length + ' DAY' + (list.length === 1 ? '' : 'S') + ' SHOWN';

    // running tallies accumulate down the page so the reader watches them build
    let cO = 0, cF = 0, cA = 0, cU = 0;
    for (const x of list) {
      cO += x.denom; cF += x.fund; cA += x.ask; cU += x.up + x.cond;

      const row = el('div', 'row ' + tone(x));
      const head = el('button', 'head');
      head.setAttribute('aria-expanded', state.open.has(x.d) ? 'true' : 'false');

      head.append(el('span', 'date', pretty(x.d)));
      const who = el('span', 'who ' + (x.open === 'HER' ? 'wHer' : 'wHim'),
        x.open === 'HER' ? 'SHE RAISED IT' : 'HE RAISED IT');
      head.append(who);
      head.append(el('span', 'verdict', verdict(x)));
      head.append(el('span', 'vol', x.her + ' / ' + x.his));
      const tal = el('span', 'tally');
      tal.textContent = 'Σ ' + cO + ' orders · ' + cF + ' funded · ' + cA + ' asks' + (cU ? ' · ' + cU + ' pushes' : '');
      head.append(tal);
      head.addEventListener('click', () => {
        if (state.open.has(x.d)) state.open.delete(x.d); else state.open.add(x.d);
        render();
      });
      row.append(head);

      if (state.open.has(x.d)) {
        const body = el('div', 'body');
        for (const q of x.q) {
          const line = el('div', 'q ' + (q.w === 'HER' ? 'qHer' : 'qDan'));
          const m = el('div', 'qm');
          m.append(el('span', 'qw', q.w === 'HER' ? 'ANNIE' : 'DAN'));
          m.append(el('span', 'qt', q.t));
          if (q.tag) m.append(el('span', 'qtag ' + (q.tag === 'UPSELL' || q.tag === 'CONDITION' ? 'bad' : ''), q.tag));
          line.append(m);
          line.append(el('div', 'qx', '“' + q.x + '”'));
          if (window.TranscriptLink) {
            line.append(window.TranscriptLink.el(
              { d: x.d, t: q.t, who: q.w === 'HER' ? 'A' : 'D', text: q.x }));
          }
          row.append(line);
        }
        const src = el('div', 'src');
        src.textContent = 'VERIFY: ' + x.her + ' supply-context messages from her, '
          + x.his + ' from him, on ' + x.d + '. Every quote above links to the line it came from.';
        body.append(src);
        if (window.TranscriptLink) body.append(window.TranscriptLink.dayEl(x.d));
        row.append(body);
      }
      host.append(row);
    }
  }

  function boot() {
    $('#hdrStat').textContent =
      M.days + ' DAYS · ' + M.from + ' → ' + M.to + ' · '
      + (M.corpusHer + M.corpusHis).toLocaleString('en-US') + ' MESSAGES READ';
    for (const [id, label] of [['all', 'ALL DAYS'], ['order', 'SHE NAMED THE SIZE'], ['fund', 'SHE MOVED MONEY'],
      ['ask', 'SHE ASKED'], ['him', 'HE RAISED IT FIRST'], ['adverse', 'HE PUSHED']]) {
      const b = el('button', 'chip' + (state.filter === id ? ' on' : ''), label);
      b.addEventListener('click', () => {
        state.filter = id;
        document.querySelectorAll('#filters .chip').forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
        render();
        window.scrollTo(0, $('#rows').offsetTop - 80);
      });
      $('#filters').append(b);
    }
    render();
  }
  window.addEventListener('DOMContentLoaded', boot);
})();
