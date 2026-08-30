// LEVIATHAN · PROCUREMENT — five instruments over the evidence pool
//
// A third section, standing apart from both the encrypted corpus console and
// the WIKI reader. It has no data layer of its own: js/procurement-data.js is
// the whole dataset, and every number drawn here is a count of citations in it.
//
// The instruments are built on the same pen scaffold as EPISTEME and CRUCIBLE
// (js/pen-core.js) for a reason that is not decoration. The scaffold's contract
// is that a lane's height is always a count of records, and every record it
// counts is readable verbatim in the feed beside it. An instrument built on it
// cannot show you a line without showing you the rows underneath — which is the
// only way a chart is worth anything as evidence.
//
//   AGENCY        who performed each procurement act, in order, 2014 → 2026
//   LEDGER        the Johnny era — her own supplier, seven years early
//   UNCONDITIONAL his hostility against his provision; the leverage lane is empty
//   CLOCK         the dependency window, sized against the whole relationship
//   PROVENANCE    the case re-sorted by how hard the evidence is
//   THE ASK       her procurement messages recounted from raw, Feb 2025 on
(function () {
  const D = window.ProcurementData;

  const COL = {
    bg: '#041206', panel: '#041206', line: '#14471f', grid: '#0a2410',
    txt: '#e9ffe6', dim: '#6f8a5e', faint: '#3d5230',
    amber: '#39ff14', amberHi: '#b6ff8f', cyan: '#b026ff', cyanHi: '#e0aaff',
    red: '#ff2f9d', green: '#00ffa3', rose: '#ff86c9', violet: '#7b2dff', violetHi: '#cfa8ff'
  };
  // who did the thing — one colour per actor, used for every ribbon on the page
  const WHO = { annie: '#39ff14', dan: '#b026ff', third: '#ff2f9d', record: '#00ffa3' };
  const TIER_COL = { 'RAW-CSV': '#39ff14', 'RAW-DUMP': '#39ff14', THREAD: '#00ffa3', WIKI: '#b026ff', DOSSIER: '#ff2f9d', DERIVED: '#ff2f9d' };

  const hx = (col, a) => col + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const ymOf = (day) => {
    const dt = new Date(day * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() };
  };
  const monthIndex = (day, y0, m0) => {
    const t = ymOf(day);
    return (t.y - y0) * 12 + (t.m - m0);
  };
  const stamp = (r) => {
    const t = ymOf(r.day);
    return (r.approx ? '~' : '') + MONTHS[t.m] + ' ' + t.y;
  };

  // A pen lane is a smoothed count: each record drops a triangular bump of its
  // own evidentiary weight at its position, and the lane is the sum. Nothing is
  // interpolated between records that is not a record.
  function density(nP, hits, bw) {
    const out = new Float32Array(nP);
    const w = Math.max(1.2, bw);
    for (const h of hits) {
      const lo = Math.max(0, Math.ceil(h.pos - w)), hi = Math.min(nP - 1, Math.floor(h.pos + w));
      for (let i = lo; i <= hi; i++) out[i] += (h.w || 1) * (1 - Math.abs(i - h.pos) / w);
    }
    return out;
  }
  const maxOf = (a) => { let m = 0.001; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; };

  // ---------------------------------------------------------------
  // THE HOST
  // Supplies the handful of fields PenCore expects (COL/MONO/GROT/W/H/
  // mouse/state/M/setState) and nothing else. There is no framework here:
  // setState merges and repaints the chrome, and the canvas redraws itself.
  // ---------------------------------------------------------------
  class Procurement {
    constructor() {
      this.COL = COL;
      this.MONO = "'IBM Plex Mono', monospace";
      this.GROT = "'Zen Kaku Gothic New', sans-serif";
      this.M = {};
      this.mouse = { x: -1, y: -1, down: false };
      this.state = {
        tab: 'agency',
        pinned: null,
        brief: false,
        agencyPlay: false, agencySpeed: 4,
        askPlay: false, askSpeed: 60,
        ledgerPlay: false, ledgerSpeed: 2,
        uncondPlay: false, uncondSpeed: 3,
        clockPlay: false, clockSpeed: 9,
        provPlay: false, provSpeed: 5,
        parentsPlay: false, parentsSpeed: 10,
        provFilter: 'all'
      };
      Object.assign(this, window.PenCore);
    }

    setState(patch) {
      const p = typeof patch === 'function' ? patch(this.state) : patch;
      Object.assign(this.state, p);
      this.renderChrome();
    }

    // ---------- boot ----------
    mount() {
      this.cv = document.getElementById('stage');
      this.ctx = this.cv.getContext('2d');
      this.chipsEl = document.getElementById('chips');
      this.tabsEl = document.getElementById('tabs');
      this.hintEl = document.getElementById('hint');
      this.srcEl = document.getElementById('source');
      this.briefEl = document.getElementById('brief');

      const pt = (e) => {
        const r = this.cv.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      this.cv.addEventListener('pointermove', (e) => {
        const p = pt(e); this.mouse.x = p.x; this.mouse.y = p.y; this.dispatch('move', p);
      });
      this.cv.addEventListener('pointerdown', (e) => {
        const p = pt(e); this.mouse.down = true; this.cv.setPointerCapture(e.pointerId); this.dispatch('down', p);
      });
      this.cv.addEventListener('pointerup', (e) => {
        const p = pt(e); this.mouse.down = false; this.dispatch('up', p);
      });
      this.cv.addEventListener('pointerleave', () => {
        this.mouse.x = -1; this.mouse.y = -1; this.mouse.down = false; this.dispatch('leave', { x: -1, y: -1 });
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.setState({ pinned: null, brief: false });
        if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); this.togglePlay(); }
      });
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(document.getElementById('stageWrap'));
      this.resize();
      this.renderChrome();
      this.last = 0;
      requestAnimationFrame((t) => this.frame(t));
    }

    resize() {
      const box = this.cv.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      // below the floor the wrapper scrolls sideways instead of the chart
      // squeezing the feed out of existence
      this.W = Math.max(1000, box.width);
      this.H = Math.max(420, box.height);
      this.cv.width = this.W * dpr;
      this.cv.height = this.H * dpr;
      this.cv.style.width = this.W + 'px';
      this.cv.style.height = this.H + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    frame(t) {
      const dt = Math.min(0.05, (t - this.last) / 1000 || 0);
      this.last = t;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, this.W, this.H);
      const fn = this['draw_' + this.state.tab];
      if (fn) fn.call(this, ctx, this.W, this.H, dt);
      requestAnimationFrame((t2) => this.frame(t2));
    }

    dispatch(type, p) {
      const fn = this['pt_' + this.state.tab];
      if (fn) fn.call(this, type, p);
    }

    togglePlay() {
      const k = this.state.tab + 'Play';
      this.setState((s) => ({ [k]: !s[k] }));
    }

    // ---------- chrome ----------
    TABS = [
      ['agency', 'I · AGENCY'],
      ['ledger', 'II · LEDGER'],
      ['uncond', 'III · UNCONDITIONAL'],
      ['clock', 'IV · CLOCK'],
      ['prov', 'V · PROVENANCE'],
      ['ask', 'VI · THE ASK'],
      ['parents', 'VII · PARENTS']
    ];
    HINTS = {
      agency: 'EVERY PROCUREMENT ACT IN THE RECORD, IN ORDER · PRESS ▶ · THE BOTTOM PEN IS SUPPLY WITHHELD AS LEVERAGE AND IT NEVER LEAVES THE FLOOR · CLICK ANY LINE FOR ITS SOURCE ROW',
      ledger: 'HER OWN DEALER, HER OWN RUNS, HER OWN MONEY — 2018–2019, SEVEN YEARS BEFORE HE WAS EVER HER SOURCE · CLICK ANY LINE FOR ITS SOURCE ROW',
      uncond: 'HIS HOSTILITY CLIMBS. THE SUPPLY NEVER MOVES WITH IT. THE LEVERAGE LANE IS EMPTY BECAUSE THE RECORD HAS NOTHING TO PUT IN IT · CLICK ANY LINE FOR ITS SOURCE',
      clock: 'THE WHOLE RELATIONSHIP AT MONTH RESOLUTION · THE SHADED WINDOW IS WHERE SHE SOURCED THROUGH HIM — ENTERED BY HER OWN MOVE, LEFT BY HER OWN JOB',
      prov: 'THE SAME CASE RE-SORTED BY HOW HARD THE EVIDENCE IS · RAW EXPORT ROWS FIRST, DAN’S UNCORROBORATED WORD LAST · FILTER TO SEE WHAT SURVIVES WITHOUT HIM',
      ask: 'FROM THE RAW TEXT EXPORTS — 18,946 OF ANNIE’S MESSAGES, FEB 2025 → JUN 2026 · ANNIE RAISES THE MONEY AND NAMES THE BUY SIZE — NOT ASKING DAN FOR DRUGS · CLICK ANY LINE FOR ITS SOURCE',
      parents: 'ANNIE’S OWN MOTHER AND FATHER, AND THE MONEY BETWEEN THEM — 73 RAW EXPORT ROWS, AUG 2025 → JUL 2026 · SHE ASKS, THEY SEND, THEY REFUSE, SHE OWES · CLICK ANY LINE FOR ITS SOURCE ROW'
    };

    chip(label, on, tone, onClick) {
      const b = document.createElement('button');
      b.className = 'chip' + (on ? ' on' : '');
      b.textContent = label;
      if (tone) {
        b.style.borderColor = on ? tone : '';
        b.style.color = on ? tone : '';
        b.style.background = on ? tone.replace(')', '') + '14' : '';
        if (on) b.style.background = 'rgba(57,255,20,0.08)';
      }
      b.addEventListener('click', onClick);
      return b;
    }

    speedChips(key, opts, tone) {
      return opts.map(([v, l]) => this.chip(l, this.state[key] === v, tone, () => this.setState({ [key]: v })));
    }

    renderChrome() {
      const s = this.state;
      this.tabsEl.replaceChildren(...this.TABS.map(([id, label]) =>
        this.chip(label, s.tab === id, '#39ff14', () => this.setState({ tab: id, pinned: null }))));

      const t = s.tab;
      const playLabel = (t === 'ask')
        ? (s[t + 'Play'] ? '❚❚ PAUSE THE ASK' : '▶ PLAY THE ASK')
        : (s[t + 'Play'] ? '❚❚ PAUSE' : '▶ PLAY');
      const playBtn = this.chip(playLabel, s[t + 'Play'], '#39ff14', () => this.togglePlay());
      // On THE ASK (instrument VI) the Play control is made massive and
      // impossible to miss — it is the one action that brings the pens to life.
      if (t === 'ask') {
        playBtn.className = 'chip play-massive' + (s[t + 'Play'] ? ' on' : '');
        playBtn.style.cssText = 'font-family:' + this.MONO + ';font-size:15px;font-weight:700;letter-spacing:0.24em;padding:16px 36px;border-radius:999px;border:1px solid #39ff14;color:' + (s[t + 'Play'] ? '#39ff14' : '#041206') + ';background:' + (s[t + 'Play'] ? 'rgba(57,255,20,0.18)' : '#39ff14') + ';box-shadow:0 0 30px rgba(57,255,20,0.7);animation:askpulse 2.4s ease-in-out infinite;cursor:pointer;white-space:nowrap;';
      }
      const chips = [
        playBtn,
        this.chip('↺ RESTART', false, null, () => this.restart())
      ];
      const sp = {
        agency: [[1.5, 'SLOW'], [4, 'NORMAL'], [12, 'FAST']],
        ledger: [[0.8, 'SLOW'], [2, 'NORMAL'], [6, 'FAST']],
        uncond: [[1, 'SLOW'], [3, 'NORMAL'], [9, 'FAST']],
        clock: [[3, 'SLOW'], [9, 'NORMAL'], [26, 'FAST']],
        prov: [[2, 'SLOW'], [5, 'NORMAL'], [15, 'FAST']],
        ask: [[20, 'SLOW'], [60, 'NORMAL'], [180, 'FAST']],
        parents: [[3, 'SLOW'], [10, 'NORMAL'], [30, 'FAST']]
      }[t];
      chips.push(...this.speedChips(t + 'Speed', sp, '#b026ff'));
      if (t === 'prov') {
        chips.push(...[['all', 'ALL'], ['annie', 'HER OWN WORDS'], ['third', 'THIRD PARTY'], ['adverse', 'AGAINST DAN']]
          .map(([id, l]) => this.chip(l, s.provFilter === id, id === 'adverse' ? '#ff2f9d' : '#00ffa3',
            () => { this.M.prov = null; this.setState({ provFilter: id }); })));
      }
      chips.push(this.chip(s.brief ? '▤ CLOSE BRIEF' : '▤ BRIEF', s.brief, '#e0aaff', () => this.setState({ brief: !s.brief })));
      this.chipsEl.replaceChildren(...chips);

      this.hintEl.textContent = this.HINTS[t];
      this.renderSource();
      this.briefEl.hidden = !s.brief;
    }

    restart() {
      const M = this.M[this.state.tab];
      if (M) { M.play = 0.001; for (const f of M.frags) f.shownAt = 0; }
      this.setState({ [this.state.tab + 'Play']: true });
    }

    // The source card: the whole point of the page. Clicking a line in any feed
    // pins the record it came from, with its file, its row, its tier, the wiki
    // page that carries it, and whatever caveat the wiki attached to it.
    renderSource() {
      const r = this.state.pinned;
      if (!r) { this.srcEl.hidden = true; return; }
      this.srcEl.hidden = false;
      const url = 'https://github.com/caakehorn/wiki-brain/blob/main/' + r.page + '.md';
      this.srcEl.innerHTML = '';
      const mk = (cls, txt) => { const e = document.createElement('div'); e.className = cls; e.textContent = txt; return e; };

      const head = document.createElement('div');
      head.className = 'srcHead';
      const badge = mk('tier', r.tier);
      badge.style.color = TIER_COL[r.tier];
      badge.style.borderColor = TIER_COL[r.tier];
      head.append(badge, mk('srcTag', r.tag));
      const close = document.createElement('button');
      close.className = 'chip';
      close.textContent = '✕';
      close.addEventListener('click', () => this.setState({ pinned: null }));
      head.append(close);
      this.srcEl.append(head);

      this.srcEl.append(mk('quote', '“' + r.text + '”'));
      const meta = document.createElement('dl');
      meta.className = 'meta';
      const row = (k, v) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        meta.append(dt, dd);
      };
      row('SOURCE FILE', r.src);
      row('ROW', r.dir);
      row('DATE', stamp(r) + (r.approx ? '  (approximate — the wiki dates this cluster, not the row)' : ''));
      row('ACTOR', { annie: 'ANNIE', dan: 'DAN', third: 'THIRD PARTY', record: 'THE RECORD ITSELF' }[r.who]);
      this.srcEl.append(meta);

      // Straight into the record itself, at the line this came off.
      if (window.TranscriptLink) {
        const ts = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(r.dir || '');
        const d = (ts && ts[1]) || (/^\d{4}-\d{2}-\d{2}$/.test(r.d || '') ? r.d : null);
        const t = (ts && ts[2]) || (r.t || '');
        const who = /Sent/i.test(r.dir || '') ? 'D' : /Received/i.test(r.dir || '') ? 'A'
          : r.who === 'dan' ? 'D' : r.who === 'annie' ? 'A' : '?';
        const link = d && t ? window.TranscriptLink.el({ d, t, who, text: r.text })
          : d ? window.TranscriptLink.dayEl(d) : null;
        if (link) { const wrap = document.createElement('div'); wrap.append(link); this.srcEl.append(wrap); }
      }

      if (r.note) this.srcEl.append(mk('note', r.note));
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = '→ ' + r.page;
      this.srcEl.append(a);
    }

    pin(rec) { this.setState({ pinned: rec }); }

    // shared: turn a feed click into a pinned source card
    feedClick(id, p, M) {
      if (!M || !M.fragRects) return false;
      const hit = M.fragRects.find(q => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h);
      if (hit && hit.id) { this.pin(hit.id); return true; }
      return false;
    }

    card(ctx, x, y, lines) {
      ctx.save();
      let w = 0;
      const lh = 16;
      for (const [txt, , font] of lines) { ctx.font = font || ('10px ' + this.MONO); w = Math.max(w, ctx.measureText(txt).width); }
      w += 24;
      const h = lines.length * lh + 16;
      let bx = x + 14, by = y - h - 10;
      if (bx + w > this.W - 8) bx = x - w - 14;
      if (by < 8) by = y + 16;
      if (bx < 8) bx = 8;
      ctx.fillStyle = 'rgba(4,18,8,0.94)';
      ctx.strokeStyle = COL.line;
      ctx.beginPath(); ctx.rect(bx, by, w, h); ctx.fill(); ctx.stroke();
      lines.forEach(([txt, color, font], i) => {
        ctx.font = font || ('10px ' + this.MONO);
        ctx.fillStyle = color || COL.txt;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(txt, bx + 12, by + 12 + (i + 0.55) * lh - 4);
      });
      ctx.restore();
    }

    // The scaffold draws the sub-heading left and the readout right on the same
    // two lines. Truncate the sub so a long one can never run under the readout.
    fitSub(ctx, text) {
      const maxW = this.W * 0.62 - 18 - 330;
      ctx.save();
      ctx.font = '9px ' + this.MONO;
      let t = text;
      if (ctx.measureText(t).width > maxW) {
        while (t.length > 4 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
        t += '…';
      }
      ctx.restore();
      return t;
    }

    wrap(ctx, text, maxW) {
      const out = [];
      let line = '';
      for (const w of String(text).split(' ')) {
        if (line && ctx.measureText(line + ' ' + w).width > maxW) { out.push(line); line = w; }
        else line = line ? line + ' ' + w : w;
      }
      if (line) out.push(line);
      return out;
    }

    // Every instrument's hover card is the same shape: the record, its tier,
    // and the instruction that a click opens the source.
    hoverCard(ctx, rec, extra) {
      const lines = [
        [rec.tag, TIER_COL[rec.tier], '600 10px ' + this.MONO],
        [stamp(rec) + ' · ' + rec.tier + ' · ' + rec.src.slice(0, 44), COL.dim, '9px ' + this.MONO]
      ];
      for (const ln of this.wrap(ctx, '“' + rec.text.slice(0, 220) + (rec.text.length > 220 ? '…' : '') + '”', 400).slice(0, 4)) {
        lines.push([ln, COL.txt, '11px ' + this.GROT]);
      }
      if (extra) lines.push([extra, COL.faint, '9px ' + this.MONO]);
      lines.push(['CLICK FOR THE FULL SOURCE ROW', COL.dim, '8.5px ' + this.MONO]);
      this.card(ctx, this.mouse.x, this.mouse.y, lines);
    }

    // ============================================================
    // I — AGENCY
    // Every act of procurement in the record, in the order it happened,
    // sorted into who performed it. Four pens. The fourth is the one that
    // matters: supply withheld as leverage, and it is empty by count.
    // ============================================================
    initAgency() {
      const rows = D.records.filter(r => ['init', 'node', 'broker', 'offer', 'hold', 'third'].includes(r.lane));
      const nP = rows.length;
      const bins = { ask: [], node: [], route: [], offer: [] };
      rows.forEach((r, i) => {
        const k = r.lane === 'init' ? 'ask'
          : r.lane === 'node' ? 'node'
            : (r.lane === 'broker' || r.lane === 'third') ? 'route'
              : r.lane === 'offer' ? 'offer' : null;
        // `hold` records are annotations about an empty lane, not entries in it
        if (k) bins[k].push({ pos: i, w: r.w });
      });
      const bw = Math.max(1.6, nP / 9);
      const series = {};
      const max = {};
      for (const k of Object.keys(bins)) {
        series[k] = density(nP, bins[k], bw);
        max[k] = maxOf(series[k]);
      }
      // the leverage lane is drawn on the same scale as the busiest pen, so its
      // flatness is a real comparison rather than an artefact of autoscaling
      max.hold = Math.max(max.ask, max.node, max.route, max.offer);

      const vol = new Float32Array(nP);
      rows.forEach((r, i) => { vol[i] = r.w; });

      this.M.agency = {
        rows, nP, series, max, vol, maxVol: 4, hover: -1,
        play: 0.001, scrub: false, scrubGeo: null,
        frags: rows.map((r, i) => ({
          pos: i, text: r.text, tag: stamp(r) + ' · ' + r.tag, shownAt: 0,
          pen: WHO[r.who], id: r
        })),
        nAsk: bins.ask.length, nNode: bins.node.length, nRoute: bins.route.length, nOffer: bins.offer.length
      };
    }

    draw_agency(ctx, W, H, dt) {
      if (!this.M.agency) this.initAgency();
      const A = this.M.agency;
      this.penInstrument(ctx, W, H, dt, {
        id: 'agency', accent: '#39ff14', title: 'AGENCY',
        sub: this.fitSub(ctx, A.nP + ' ACTS CITED · ' + A.nAsk + ' SHE ASKS · ' + A.nNode + ' SHE SOURCES · '
          + A.nRoute + ' SHE ROUTES · ' + A.nOffer + ' HE OFFERS · 0 HE WITHHOLDS'),
        nP: A.nP, padL: 158, padT: 76, padB: 66, laneGap: 7,
        lanes: [
          { data: A.series.ask, label: 'SHE ASKS / SHE GOES', unit: 'CITED ACTS', color: '#39ff14', max: A.max.ask },
          { data: A.series.node, label: 'SHE SOURCES IT HERSELF', unit: 'CITED ACTS', color: '#00ffa3', max: A.max.node },
          { data: A.series.route, label: 'SHE ROUTES IT FOR OTHERS', unit: 'CITED ACTS', color: '#ff86c9', max: A.max.route },
          { data: A.series.offer, label: 'HE OFFERS / DELIVERS', unit: 'CITED ACTS', color: '#b026ff', max: A.max.offer },
          { data: new Float32Array(A.nP), label: 'HE WITHHOLDS AS LEVERAGE', unit: 'CITED ACTS · ZERO', color: '#ff2f9d', max: A.max.hold }
        ],
        volume: { data: A.vol, max: A.maxVol, color: '#7b2dff' },
        frags: A.frags,
        feedTitle: 'THE ACTS THEMSELVES, VERBATIM · CLICK ONE FOR ITS SOURCE',
        feed: { dy: -32, dh: -30 },
        ribbon: (i, past) => hx(WHO[A.rows[i].who], past ? 0.95 : 0.16),
        tickStep: Math.max(1, Math.ceil(A.nP / 8)),
        tickLabel: (i) => stamp(A.rows[i]).replace(/^~/, ''),

        readout: (g) => {
          const r = A.rows[Math.min(A.nP - 1, Math.floor(A.play))];
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = WHO[r.who]; ctx.textAlign = 'right';
          ctx.fillText(stamp(r) + ' · ' + { annie: 'ANNIE', dan: 'DAN', third: 'A THIRD PARTY', record: 'THE RECORD' }[r.who], g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = COL.dim;
          ctx.fillText(r.tier + ' · ' + r.src.slice(0, 38), g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        // the flat lane needs saying out loud, or it reads as a rendering bug
        marker: (g) => {
          const y = g.padT + 4 * (g.laneH + g.geo.laneGap) + g.laneH / 2;
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = hx('#ff2f9d', 0.8); ctx.textAlign = 'center';
          ctx.fillText('NO RECORD EXISTS FOR THIS LANE — wiki/people/annie-ulmer, AUG 2025 → MAR 2026', (g.padL + g.chartR) / 2, y + 4);
          ctx.textAlign = 'left';
        },

        overlay: (g) => {
          A.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            A.hover = Math.max(0, Math.min(A.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (A.nP - 1))));
          }
          if (A.hover >= 0) {
            ctx.strokeStyle = 'rgba(214,255,208,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(A.hover), g.padT); ctx.lineTo(g.xOf(A.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            this.hoverCard(ctx, A.rows[A.hover], '#' + (A.hover + 1) + ' OF ' + A.nP);
          }
          this.cv.style.cursor = A.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    }

    pt_agency(type, p) {
      const A = this.M.agency; if (!A) return;
      if (type === 'down' && this.feedClick('agency', p, A)) return;
      if (this.penScrub('agency', type, p) === 'click' && A.hover >= 0) this.pin(A.rows[A.hover]);
    }

    // ============================================================
    // II — LEDGER
    // The Johnny era on its own. Four pens over her side of a supplier
    // relationship she ran without him: the travel, the money, the chasing
    // when it failed, and the times she brought someone else into it.
    // ============================================================
    initLedger() {
      const rows = D.records.filter(r => r.k);
      const nP = rows.length;
      const kinds = [
        ['travel', 'SHE TRAVELS TO IT', '#39ff14'],
        ['pay', 'SHE MOVES THE MONEY', '#00ffa3'],
        ['chase', 'SHE CHASES A FAILURE', '#b026ff'],
        ['broker', 'SHE ROUTES IT FOR OTHERS', '#ff2f9d']
      ];
      const series = {}, max = {};
      const bw = Math.max(1.4, nP / 7);
      for (const [k] of kinds) {
        series[k] = density(nP, rows.map((r, i) => (r.k === k ? { pos: i, w: r.w } : null)).filter(Boolean), bw);
        max[k] = maxOf(series[k]);
      }
      const vol = new Float32Array(nP);
      rows.forEach((r, i) => { vol[i] = r.w; });
      // the distance between the last of these acts and the day he became her
      // source — the number the whole instrument exists to state
      const gap = D.dayNum('2025-02-01') - rows[rows.length - 1].day;

      this.M.ledger = {
        rows, nP, kinds, series, max, vol, gap, hover: -1,
        play: 0.001, scrub: false, scrubGeo: null,
        frags: rows.map((r, i) => ({
          pos: i, text: r.text, tag: stamp(r) + ' · ' + r.tag, shownAt: 0,
          pen: { travel: '#39ff14', pay: '#00ffa3', chase: '#b026ff', broker: '#ff2f9d' }[r.k], id: r
        }))
      };
    }

    draw_ledger(ctx, W, H, dt) {
      if (!this.M.ledger) this.initLedger();
      const L = this.M.ledger;
      this.penInstrument(ctx, W, H, dt, {
        id: 'ledger', accent: '#00ffa3', title: 'LEDGER · THE JOHNNY ERA',
        sub: this.fitSub(ctx, L.nP + ' CITED LINES, 2018–2019 · ' + L.gap.toLocaleString('en-US') + ' DAYS BEFORE HE BECAME HER SOURCE'),
        nP: L.nP, padL: 160, padT: 76, padB: 66, laneGap: 8,
        lanes: L.kinds.map(([k, label, col]) => ({
          data: L.series[k], label, unit: 'CITED LINES', color: col, max: L.max[k]
        })),
        volume: { data: L.vol, max: 4, color: '#7b2dff' },
        frags: L.frags,
        feedTitle: 'HER LINES, VERBATIM · imessage_7249204125_both_all_now.csv',
        feed: { dy: -32, dh: -30 },
        ribbon: (i, past) => hx('#39ff14', past ? 0.9 : 0.16),
        tickStep: Math.max(1, Math.ceil(L.nP / 7)),
        tickLabel: (i) => stamp(L.rows[i]).replace(/^~/, ''),

        readout: (g) => {
          const r = L.rows[Math.min(L.nP - 1, Math.floor(L.play))];
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = '#39ff14'; ctx.textAlign = 'right';
          ctx.fillText(stamp(r) + ' · SHE IS RUNNING THE NODE', g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = COL.dim;
          ctx.fillText(r.tier + ' · ' + r.dir, g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        marker: (g) => {
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = hx('#e0aaff', 0.75); ctx.textAlign = 'left';
          ctx.fillText('THE SUPPLIER IS JOHNNY (+1 724 322 3678). THE CUSTOMER RELATIONSHIP IS HERS.', g.padL, g.botY + 40);
          ctx.fillStyle = hx('#6f8a5e', 0.9);
          ctx.fillText('DIRECTION TAGS FOR THESE ROWS ARE NOT PUBLISHED — THE WIKI ATTRIBUTES THEM TO HER FACILITATION. TIER: THREAD.', g.padL, g.botY + 54);
        },

        overlay: (g) => {
          L.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            L.hover = Math.max(0, Math.min(L.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (L.nP - 1))));
          }
          if (L.hover >= 0) {
            ctx.strokeStyle = 'rgba(214,255,208,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(L.hover), g.padT); ctx.lineTo(g.xOf(L.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            this.hoverCard(ctx, L.rows[L.hover], '#' + (L.hover + 1) + ' OF ' + L.nP);
          }
          this.cv.style.cursor = L.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    }

    pt_ledger(type, p) {
      const L = this.M.ledger; if (!L) return;
      if (type === 'down' && this.feedClick('ledger', p, L)) return;
      if (this.penScrub('ledger', type, p) === 'click' && L.hover >= 0) this.pin(L.rows[L.hover]);
    }

    // ============================================================
    // III — UNCONDITIONAL
    // The terminal window, month by month. The volume lane is Dan's own
    // documented verbal abuse — the wiki's count, not a friendly one — and
    // the leverage lane underneath it stays empty the whole way across.
    // ============================================================
    initUncond() {
      const y0 = 2025, m0 = 7; // Aug 2025
      const nP = 11;           // → Jun 2026
      const rows = D.records.filter(r => r.day >= D.dayNum('2025-08-01') && r.day <= D.dayNum('2026-06-30'));
      const at = (r) => Math.max(0, Math.min(nP - 1, monthIndex(r.day, y0, m0)));
      const bin = (pred) => density(nP, rows.filter(pred).map(r => ({ pos: at(r), w: 1 })), 1.1);

      const ask = bin(r => r.lane === 'init');
      const give = bin(r => r.lane === 'offer');
      const hostile = bin(r => r.lane === 'hostile' && r.who === 'dan');
      const mx = Math.max(maxOf(ask), maxOf(give), maxOf(hostile));

      const vol = new Float32Array(nP);
      const volKnown = new Array(nP).fill(false);
      for (let i = 0; i < nP; i++) {
        const y = y0 + Math.floor((m0 + i) / 12), m = (m0 + i) % 12;
        const key = y + '-' + String(m + 1).padStart(2, '0');
        if (D.abuseMo[key] != null) { vol[i] = D.abuseMo[key]; volKnown[i] = true; }
      }

      this.M.uncond = {
        rows, nP, y0, m0, ask, give, hostile, mx, vol, volKnown, hover: -1,
        play: 0.001, scrub: false, scrubGeo: null,
        frags: rows.map(r => ({
          pos: at(r) + Math.min(0.85, (r.i % 5) * 0.14), text: r.text,
          tag: stamp(r) + ' · ' + r.tag, shownAt: 0,
          pen: r.lane === 'hold' ? '#ff2f9d' : WHO[r.who], id: r
        })).sort((a, b) => a.pos - b.pos)
      };
    }

    draw_uncond(ctx, W, H, dt) {
      if (!this.M.uncond) this.initUncond();
      const U = this.M.uncond;
      const label = (i) => {
        const y = U.y0 + Math.floor((U.m0 + i) / 12), m = (U.m0 + i) % 12;
        return MONTHS[m] + ' ' + String(y).slice(2);
      };
      this.penInstrument(ctx, W, H, dt, {
        id: 'uncond', accent: '#b026ff', title: 'UNCONDITIONAL',
        sub: this.fitSub(ctx, 'AUG 2025 → JUN 2026 · HIS ABUSE QUADRUPLES · HIS PROVISION NEVER BECOMES THE PUNISHMENT'),
        nP: U.nP, padL: 158, padT: 76, padB: 70, laneGap: 8,
        lanes: [
          { data: U.ask, label: 'SHE ASKS', unit: 'CITED ACTS', color: '#39ff14', max: U.mx },
          { data: U.give, label: 'HE PROVIDES', unit: 'CITED ACTS', color: '#00ffa3', max: U.mx },
          { data: U.hostile, label: 'HE TURNS ON HER', unit: 'CITED LINES · COUNT BELOW', color: '#ff86c9', max: U.mx },
          { data: new Float32Array(U.nP), label: 'SUPPLY USED AS LEVERAGE', unit: 'CITED ACTS · ZERO', color: '#ff2f9d', max: U.mx }
        ],
        volume: { data: U.vol, max: 36, color: '#ff2f9d' },
        frags: U.frags,
        feedTitle: 'THE TERMINAL WINDOW, VERBATIM · CLICK ONE FOR ITS SOURCE',
        feed: { dy: -32, dh: -30 },
        ribbon: (i, past) => hx(U.volKnown[i] ? '#ff2f9d' : '#3d5230', past ? 0.85 : 0.16),
        tickStep: 1,
        tickLabel: label,

        readout: (g) => {
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = '#ff2f9d'; ctx.textAlign = 'right';
          const i = Math.min(U.nP - 1, Math.floor(U.play));
          ctx.fillText(label(i) + ' · ' + (U.volKnown[i] ? U.vol[i] + ' ABUSIVE MESSAGES FROM HIM' : 'ABUSE COUNT NOT PUBLISHED'), g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = '#39ff14';
          ctx.fillText('SUPPLY WITHHELD IN RETALIATION: 0', g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        marker: (g) => {
          // where the wiki's abuse count runs out — the ribbon greys, say why
          const zi = U.volKnown.lastIndexOf(true);
          if (zi >= 0 && zi < U.nP - 1) {
            const zx = g.xOf(zi + 0.5);
            ctx.strokeStyle = hx('#ff2f9d', 0.45); ctx.setLineDash([3, 4]);
            ctx.beginPath(); ctx.moveTo(zx, g.padT); ctx.lineTo(zx, g.botY); ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = '8px ' + this.MONO; ctx.fillStyle = hx('#ff2f9d', 0.7); ctx.textAlign = 'center';
            ctx.fillText('COUNTED ← | → NOT PUBLISHED', zx, g.botY + 26);
            ctx.textAlign = 'left';
          }
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = hx('#e0aaff', 0.8); ctx.textAlign = 'left';
          ctx.fillText('THE VOLUME LANE IS HIS OWN ABUSE COUNT — 9 · 0 · 5 · 14 · 22 · 25 · 36 — REPRODUCED EXACTLY FROM RAW ON 2026-07-18.', g.padL, g.botY + 48);
        },

        overlay: (g) => {
          U.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            U.hover = Math.max(0, Math.min(U.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (U.nP - 1))));
          }
          if (U.hover >= 0) {
            const i = U.hover;
            ctx.strokeStyle = 'rgba(214,255,208,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(i), g.padT); ctx.lineTo(g.xOf(i), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            const inMonth = U.rows.filter(r => monthIndex(r.day, U.y0, U.m0) === i);
            const lines = [
              [label(i), COL.txt, '600 12px ' + this.GROT],
              [U.volKnown[i] ? U.vol[i] + ' ABUSIVE MESSAGES FROM DAN (PUBLISHED COUNT)' : 'ABUSE COUNT NOT PUBLISHED', '#ff2f9d', '9px ' + this.MONO],
              ['0 INSTANCES OF SUPPLY WITHHELD', '#39ff14', '9px ' + this.MONO],
              [inMonth.length + ' CITED RECORD' + (inMonth.length === 1 ? '' : 'S') + ' THIS MONTH', COL.dim, '9px ' + this.MONO]
            ];
            for (const r of inMonth.slice(0, 3)) {
              for (const ln of this.wrap(ctx, '“' + r.text.slice(0, 110) + '”', 360).slice(0, 2)) lines.push([ln, COL.txt, '11px ' + this.GROT]);
            }
            this.card(ctx, mx, my, lines);
          }
          this.cv.style.cursor = 'crosshair';
        }
      });
    }

    pt_uncond(type, p) {
      const U = this.M.uncond; if (!U) return;
      if (type === 'down' && this.feedClick('uncond', p, U)) return;
      this.penScrub('uncond', type, p);
    }

    // ============================================================
    // IV — CLOCK
    // The whole relationship at month resolution, with the three things the
    // manipulation claim depends on drawn as lanes: whether she had her own
    // income, whether she had a route to supply that was not him, and whether
    // he was her source. The last one is on for fifteen months out of 127.
    // ============================================================
    initClock() {
      const s = ymOf(D.start), e = ymOf(D.end);
      const y0 = s.y, m0 = s.m;
      const nP = (e.y - y0) * 12 + (e.m - m0) + 1;
      const income = new Float32Array(nP), route = new Float32Array(nP), danSrc = new Float32Array(nP);
      const phaseAt = new Array(nP).fill(null);
      for (let i = 0; i < nP; i++) {
        const y = y0 + Math.floor((m0 + i) / 12), m = (m0 + i) % 12;
        const day = Math.round(Date.UTC(y, m, 15) / 86400000);
        // clamp rather than fall through: the first and last months of the
        // relationship sit a fortnight outside the first and last phase
        // boundaries, and letting them miss put the closing phase at month one
        const ph = D.phases.find(p => day >= p.da && day <= p.db)
          || (day < D.phases[0].da ? D.phases[0] : D.phases[D.phases.length - 1]);
        phaseAt[i] = ph;
        income[i] = ph.income; route[i] = ph.route; danSrc[i] = ph.danSrc;
      }
      const acts = density(nP, D.records
        .filter(r => ['init', 'node', 'broker'].includes(r.lane))
        .map(r => ({ pos: Math.max(0, Math.min(nP - 1, monthIndex(r.day, y0, m0))), w: 1 })), 2.2);

      // volume: Annie's own message output per month, from the published
      // year table. Years the table does not carry stay at zero and the
      // instrument says so rather than interpolating across the hole.
      const vol = new Float32Array(nP);
      const volKnown = new Array(nP).fill(false);
      for (let i = 0; i < nP; i++) {
        const y = y0 + Math.floor((m0 + i) / 12);
        if (D.yearMsgs[y]) { vol[i] = D.yearMsgs[y].annie / 12; volKnown[i] = true; }
      }
      // full dependency only — the closing phase is drawn at half height
      // because the Marucas job had already started cutting it
      const depMonths = danSrc.reduce((a, v) => a + (v >= 1 ? 1 : 0), 0);

      this.M.clock = {
        nP, y0, m0, income, route, danSrc, acts, maxActs: maxOf(acts), phaseAt,
        vol, volKnown, maxVol: maxOf(vol), depMonths, hover: -1,
        play: 0.001, scrub: false, scrubGeo: null,
        frags: D.records.map(r => ({
          pos: Math.max(0, Math.min(nP - 1, monthIndex(r.day, y0, m0))) + Math.min(0.8, (r.i % 4) * 0.2),
          text: r.text, tag: stamp(r) + ' · ' + r.tag, shownAt: 0, pen: WHO[r.who], id: r
        })).sort((a, b) => a.pos - b.pos)
      };
    }

    draw_clock(ctx, W, H, dt) {
      if (!this.M.clock) this.initClock();
      const K = this.M.clock;
      const label = (i) => {
        const y = K.y0 + Math.floor((K.m0 + i) / 12), m = (K.m0 + i) % 12;
        return m === 0 ? String(y) : '';
      };
      const pct = Math.round((K.depMonths / K.nP) * 100);
      this.penInstrument(ctx, W, H, dt, {
        id: 'clock', accent: '#e0aaff', title: 'CLOCK',
        sub: this.fitSub(ctx, K.nP + ' MONTHS · SHE SOURCED THROUGH HIM FOR ' + K.depMonths + ' OF THEM (' + pct + '%)'),
        nP: K.nP, padL: 172, padT: 76, padB: 74, laneGap: 8,
        lanes: [
          { data: K.income, label: 'SHE HAS HER OWN INCOME', unit: 'DOCUMENTED PHASE', color: '#39ff14', max: 1 },
          { data: K.route, label: 'A ROUTE THAT ISN’T HIM', unit: 'DOCUMENTED PHASE', color: '#00ffa3', max: 1 },
          { data: K.danSrc, label: 'HE IS HER SOURCE', unit: 'DOCUMENTED PHASE', color: '#ff2f9d', max: 1 },
          { data: K.acts, label: 'HER OWN PROCUREMENT ACTS', unit: 'CITED ACTS', color: '#b026ff', max: K.maxActs }
        ],
        volume: { data: K.vol, max: K.maxVol, color: '#7b2dff' },
        frags: K.frags,
        feedTitle: 'WHAT THE RECORD SAYS AT THIS POINT ON THE CLOCK',
        feed: { dy: -32, dh: -30 },
        ribbon: (i, past) => {
          const ph = K.phaseAt[i];
          const col = ph.danSrc > 0 ? '#ff2f9d' : ph.income >= 1 ? '#39ff14' : '#7b2dff';
          return hx(col, past ? 0.9 : 0.16);
        },
        tickStep: 1,
        tickLabel: label,

        readout: (g) => {
          const i = Math.min(K.nP - 1, Math.floor(K.play));
          const ph = K.phaseAt[i];
          ctx.font = '600 11px ' + this.MONO;
          ctx.fillStyle = ph.danSrc > 0 ? '#ff2f9d' : '#39ff14';
          ctx.textAlign = 'right';
          ctx.fillText(ph.label, g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = COL.dim;
          ctx.fillText('MONTH ' + (i + 1) + ' OF ' + K.nP + (K.volKnown[i] ? '' : ' · VOLUME NOT PUBLISHED'), g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        marker: (g) => {
          // shade the dependency window across the whole chart
          const a = K.danSrc.findIndex(v => v > 0);
          if (a < 0) return;
          let b = a;
          while (b + 1 < K.nP && K.danSrc[b + 1] > 0) b++;
          const xa = g.xOf(a), xb = g.xOf(b);
          ctx.fillStyle = 'rgba(255,47,157,0.10)';
          ctx.fillRect(xa, g.padT, xb - xa, g.botY - g.padT);
          ctx.strokeStyle = hx('#ff2f9d', 0.5); ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(xa, g.padT); ctx.lineTo(xa, g.botY); ctx.moveTo(xb, g.padT); ctx.lineTo(xb, g.botY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '8px ' + this.MONO; ctx.fillStyle = hx('#ff2f9d', 0.9); ctx.textAlign = 'center';
          ctx.fillText('THE WINDOW THE CLAIM IS ABOUT', (xa + xb) / 2, g.padT + 14);
          ctx.textAlign = 'left';
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = hx('#6f8a5e', 0.95);
          ctx.fillText('VOLUME LANE = ANNIE’S OWN MESSAGES/MO FROM THE PUBLISHED YEAR TABLE. 2020–2022 AND 2026 ARE ABSENT FROM IT AND ARE DRAWN AS ZERO.', g.padL, g.botY + 50);
        },

        overlay: (g) => {
          K.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            K.hover = Math.max(0, Math.min(K.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (K.nP - 1))));
          }
          if (K.hover >= 0) {
            const i = K.hover, ph = K.phaseAt[i];
            const y = K.y0 + Math.floor((K.m0 + i) / 12), m = (K.m0 + i) % 12;
            ctx.strokeStyle = 'rgba(214,255,208,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(i), g.padT); ctx.lineTo(g.xOf(i), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            const lines = [
              [MONTHS[m] + ' ' + y, COL.txt, '600 12px ' + this.GROT],
              [ph.label, ph.danSrc > 0 ? '#ff2f9d' : '#39ff14', '9px ' + this.MONO]
            ];
            for (const ln of this.wrap(ctx, ph.note, 380).slice(0, 4)) lines.push([ln, COL.txt, '11px ' + this.GROT]);
            this.card(ctx, mx, my, lines);
          }
          this.cv.style.cursor = 'crosshair';
        }
      });
    }

    pt_clock(type, p) {
      const K = this.M.clock; if (!K) return;
      if (type === 'down' && this.feedClick('clock', p, K)) return;
      this.penScrub('clock', type, p);
    }

    // ============================================================
    // V — PROVENANCE
    // The same evidence, re-sorted by how hard it is. Raw export rows play
    // first and the sweep degrades from there, so a reader can see exactly
    // where the case stops resting on primary rows and starts resting on
    // Dan's own word — and how much is left standing at that point.
    // ============================================================
    initProv() {
      const f = this.state.provFilter || 'all';
      let rows = D.records.slice();
      if (f === 'annie') rows = rows.filter(r => r.who === 'annie');
      else if (f === 'third') rows = rows.filter(r => r.who === 'third');
      else if (f === 'adverse') rows = rows.filter(r => r.lane === 'adverse');
      rows.sort((a, b) => b.w - a.w || a.day - b.day);
      const nP = rows.length;
      const rung = (r) => (r.tier === 'RAW-CSV' || r.tier === 'RAW-DUMP') ? 0 : r.tier === 'THREAD' ? 1 : r.tier === 'WIKI' ? 2 : 3;
      const series = [0, 1, 2, 3].map(k =>
        density(nP, rows.map((r, i) => (rung(r) === k ? { pos: i, w: 1 } : null)).filter(Boolean), Math.max(1.4, nP / 10)));
      const max = Math.max(...series.map(maxOf));
      const vol = new Float32Array(nP);
      rows.forEach((r, i) => { vol[i] = r.w; });
      // where primary rows run out
      const softAt = rows.findIndex(r => rung(r) > 1);

      this.M.prov = {
        rows, nP, series, max, vol, filter: f, softAt, hover: -1,
        play: 0.001, scrub: false, scrubGeo: null,
        counts: [0, 1, 2, 3].map(k => rows.filter(r => rung(r) === k).length),
        frags: rows.map((r, i) => ({
          pos: i, text: r.text, tag: r.tier + ' · ' + r.tag, shownAt: 0,
          pen: TIER_COL[r.tier], id: r
        }))
      };
    }

    draw_prov(ctx, W, H, dt) {
      if (!this.M.prov || this.M.prov.filter !== (this.state.provFilter || 'all')) this.initProv();
      const P = this.M.prov;
      if (!P.nP) {
        ctx.font = '11px ' + this.MONO; ctx.fillStyle = COL.dim; ctx.textAlign = 'center';
        ctx.fillText('NO RECORDS MATCH THIS FILTER', W / 2, H / 2); ctx.textAlign = 'left';
        return;
      }
      const filtLabel = { all: 'EVERY RECORD ON THIS PAGE', annie: 'ONLY HER OWN WORDS', third: 'ONLY THIRD-PARTY WITNESSES', adverse: 'ONLY WHAT THE RECORD PUBLISHES AGAINST DAN' }[P.filter];
      this.penInstrument(ctx, W, H, dt, {
        id: 'prov', accent: '#00ffa3', title: 'PROVENANCE',
        sub: this.fitSub(ctx, filtLabel + ' · ' + P.counts[0] + ' RAW · ' + P.counts[1] + ' THREAD · ' + P.counts[2] + ' WIKI · ' + P.counts[3] + ' DOSSIER-ONLY'),
        nP: P.nP, padL: 176, padT: 76, padB: 70, laneGap: 8,
        lanes: [
          { data: P.series[0], label: 'RAW EXPORT ROW', unit: 'FILE · TIME · DIRECTION', color: '#39ff14', max: P.max },
          { data: P.series[1], label: 'NAMED EXPORT, ATTRIBUTED', unit: 'NO ROW-LEVEL TAG', color: '#00ffa3', max: P.max },
          { data: P.series[2], label: 'WIKI FINDING', unit: 'SOURCED, NOT QUOTED', color: '#b026ff', max: P.max },
          { data: P.series[3], label: 'DOSSIER OR DERIVED ONLY', unit: 'SECONDARY', color: '#ff2f9d', max: P.max }
        ],
        volume: { data: P.vol, max: 4, color: '#7b2dff' },
        frags: P.frags,
        feedTitle: 'STRONGEST EVIDENCE FIRST · CLICK ONE FOR ITS SOURCE',
        feed: { dy: -32, dh: -30 },
        ribbon: (i, past) => hx(WHO[P.rows[i].who], past ? 0.95 : 0.16),
        tickStep: Math.max(1, Math.ceil(P.nP / 8)),
        tickLabel: (i) => '#' + (i + 1),

        readout: (g) => {
          const r = P.rows[Math.min(P.nP - 1, Math.floor(P.play))];
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = TIER_COL[r.tier]; ctx.textAlign = 'right';
          ctx.fillText(r.tier + ' · ' + { annie: 'HER OWN WORDS', dan: 'DAN', third: 'THIRD-PARTY WITNESS', record: 'THE RECORD ITSELF' }[r.who], g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = COL.dim;
          ctx.fillText(r.src.slice(0, 40), g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        marker: (g) => {
          if (P.softAt <= 0) return;
          const zx = g.xOf(P.softAt);
          ctx.strokeStyle = hx('#ff2f9d', 0.55); ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(zx, g.padT); ctx.lineTo(zx, g.botY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '8px ' + this.MONO; ctx.fillStyle = hx('#ff2f9d', 0.8); ctx.textAlign = 'center';
          ctx.fillText('PRIMARY ROWS ← | → EVERYTHING SOFTER', zx, g.botY + 26);
          ctx.textAlign = 'left';
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = hx('#e0aaff', 0.8);
          ctx.fillText(P.softAt + ' OF ' + P.nP + ' RECORDS SIT LEFT OF THAT LINE. THE ARGUMENT DOES NOT NEED THE ONES ON THE RIGHT.', g.padL, g.botY + 46);
        },

        overlay: (g) => {
          P.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            P.hover = Math.max(0, Math.min(P.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (P.nP - 1))));
          }
          if (P.hover >= 0) {
            ctx.strokeStyle = 'rgba(214,255,208,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(P.hover), g.padT); ctx.lineTo(g.xOf(P.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            this.hoverCard(ctx, P.rows[P.hover], '#' + (P.hover + 1) + ' OF ' + P.nP);
          }
          this.cv.style.cursor = P.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    }

    // ============================================================
    // VI — THE ASK
    // Recounted from raw. Every Annie-thread export in wiki-brain merged, the
    // UTC-stamped one converted to local (it was minting phantom duplicates
    // four hours off), deduplicated, her side only: 18,946 messages across
    // Feb 2025 → Jun 2026 with every month covered. Classified by speech-act
    // frame plus named object, then every hit read by hand and the false
    // positives struck. Per-category precision is on the page.
    //
    // The shape that came out is not the one the wiki's prose implies. She is
    // overwhelmingly not asking him to hand her drugs — she is raising money
    // and placing orders. The lanes are ordered so that reads top to bottom.
    // ============================================================
    initAsk() {
      const A0 = window.ProcurementAsks;
      const d0 = D.dayNum(A0.meta.from), d1 = D.dayNum(A0.meta.to);
      const nP = d1 - d0 + 1;
      const rows = A0.records.map(r => ({ ...r, day: D.dayNum(r.d), pos: D.dayNum(r.d) - d0 }))
        .filter(r => r.pos >= 0 && r.pos < nP);
      const LANES = [
        // the order Annie names — "How much?" · "60" — is the top lane because it
        // is the act the whole question turns on: Annie sets the size of the buy
        ['denom', 'ANNIE NAMES THE BUY SIZE', '#39ff14', ['denom']],
        ['want', 'ANNIE ASKS FOR IT', '#00ffa3', ['want', 'order', 'chase', 'askSupply', 'askMoney', 'askOther']],
        ['fund', 'ANNIE RAISES THE MONEY', '#b6ff8f', ['fund', 'ask3p']],
        ['code', 'ANNIE HANDS DAN HER ATM CODE', '#ff86c9', ['code']],
        ['see', 'IS THE SOURCE AROUND?', '#b026ff', ['see']]
      ];
      const series = {}, max = {}, counts = {};
      for (const [k, , , kinds] of LANES) {
        const hits = rows.filter(r => kinds.includes(r.k));
        counts[k] = hits.length;
        series[k] = density(nP, hits.map(r => ({ pos: r.pos, w: 1 })), 9);
        max[k] = maxOf(series[k]);
      }
      const mx = Math.max(...Object.values(max));
      for (const k of Object.keys(max)) max[k] = mx;

      const total = rows.length;
      const cum = new Float32Array(nP);
      const byDay = {};
      for (const r of rows) byDay[r.pos] = (byDay[r.pos] || 0) + 1;
      let run = 0;
      for (let i = 0; i < nP; i++) { run += byDay[i] || 0; cum[i] = run; }

      const KTAG = {
        denom: 'DAN ASKS HOW MUCH \u2014 ANNIE NAMES THE NUMBER',
        want: 'ANNIE ASKS FOR IT', code: 'ANNIE HANDS DAN HER ATM CODE', see: 'IS THE SOURCE AROUND?',
        fund: 'ANNIE RAISES THE MONEY', order: 'ANNIE PLACES THE ORDER', chase: 'ANNIE CHASES THE SUPPLY',
        askSupply: 'ANNIE ASKS DAN FOR SUPPLY', askMoney: 'ANNIE ASKS DAN FOR MONEY',
        askOther: 'ANNIE ASKS DAN FOR SOMETHING', ask3p: 'ANNIE ASKS ANNIE’S FAMILY'
      };
      const KCOL = {
        denom: '#39ff14', want: '#00ffa3', code: '#ff86c9', see: '#b026ff',
        fund: '#b6ff8f', order: '#00ffa3', chase: '#00ffa3',
        askSupply: '#ff86c9', askMoney: '#ff86c9', askOther: '#ff86c9', ask3p: '#b026ff'
      };

      this.M.ask = {
        rows, nP, d0, LANES, series, max, counts, cum, total, byDay, hover: -1,
        meta: A0.meta,
        play: 0.001, scrub: false, scrubGeo: null,
        frags: rows.map(r => ({
          pos: r.pos, text: r.x,
          tag: r.d + ' ' + r.t + ' · ' + KTAG[r.k],
          shownAt: 0, pen: KCOL[r.k],
          id: {
            tier: 'RAW-CSV', tag: KTAG[r.k], text: r.x, d: r.d, t: r.t,
            src: 'wiki-brain raw/self/message-csv/ · merged Annie-thread exports',
            dir: r.d + ' ' + r.t + ' | Received | +1 212 ··· 2449',
            page: 'wiki/people/annie-ulmer', who: 'annie', day: r.day, approx: false,
            note: 'Recounted from raw, not from the wiki\u2019s prose. Classified by speech-act frame plus named object, then hand-audited; this category held '
              + (A0.meta.precision[r.k] || 100) + '% precision against a full manual read of every hit.'
          }
        }))
      };
    }

    draw_ask(ctx, W, H, dt) {
      if (!this.M.ask) this.initAsk();
      const A = this.M.ask;
      const dayOf = (i) => new Date((A.d0 + i) * 86400000);
      const label = (i) => {
        const t = dayOf(i);
        return t.getUTCDate() === 1 ? MONTHS[t.getUTCMonth()] + (t.getUTCMonth() === 0 ? ' ' + t.getUTCFullYear() : '') : null;
      };
      const askShare = Math.round((A.counts.want / A.total) * 100);

      this.penInstrument(ctx, W, H, dt, {
        id: 'ask', accent: '#39ff14', title: 'THE ASK',
        sub: this.fitSub(ctx, A.total + ' PROCUREMENT MESSAGES · ' + A.counts.denom + ' WHERE ANNIE NAMES THE SIZE · ' + A.counts.code + ' WHERE ANNIE HANDS DAN HER ATM CODE'),
        nP: A.nP, padL: 176, padT: 76, padB: 76, laneGap: 7,
        lanes: A.LANES.map(([k, lab, col]) => ({
          data: A.series[k], label: lab, unit: A.counts[k] + ' MESSAGES', color: col, max: A.max[k]
        })),
        volume: { data: A.cum, max: Math.max(1, A.total), color: '#ff2f9d', label: 'RUNNING TOTAL' },
        frags: A.frags,
        feedTitle: 'HER OWN WORDS, FROM THE RAW EXPORTS · CLICK FOR PROVENANCE',
        feed: { dy: -32, dh: -30 },
        ribbon: (i, past) => {
          const n = A.byDay[i] || 0;
          if (!n) return hx('#14471f', past ? 0.4 : 0.12);
          return hx('#39ff14', past ? Math.min(1, 0.5 + n * 0.25) : 0.25);
        },
        tickStep: 1,
        tickLabel: label,

        readout: (g) => {
          const i = Math.min(A.nP - 1, Math.floor(A.play));
          const t = dayOf(i);
          ctx.font = '700 15px ' + this.MONO; ctx.fillStyle = '#ff2f9d'; ctx.textAlign = 'right';
          ctx.fillText('RUNNING TOTAL: ' + A.cum[i], g.chartR - 20, 32);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = COL.dim;
          ctx.fillText(MONTHS[t.getUTCMonth()] + ' ' + t.getUTCDate() + ' ' + t.getUTCFullYear()
            + ' · ' + (A.byDay[i] || 0) + ' THAT DAY', g.chartR - 20, 48);
          ctx.textAlign = 'left';
        },

        marker: (g) => {
          ctx.font = '9px ' + this.MONO; ctx.textAlign = 'left';
          ctx.fillStyle = hx('#39ff14', 0.9);
          ctx.fillText(A.meta.herMessages.toLocaleString('en-US') + ' OF ANNIE’S MESSAGES READ, ' + A.meta.from + ' → ' + A.meta.to
            + ' · EVERY MONTH COVERED · NO NARRATIVE GAPS TO EXPLAIN AWAY.', g.padL, g.botY + 40);
          ctx.fillStyle = hx('#e0aaff', 0.9);
          ctx.fillText('ANNIE STATES ' + A.meta.dollarMentions + ' DOLLAR AMOUNTS TOTALLING $' + A.meta.dollarsStated.toLocaleString('en-US')
            + '. THE PATTERN: DAN ASKS HOW MUCH, ANNIE NAMES THE NUMBER — “HOW MUCH?” → “60”. THE CODE LANE IS ANNIE’S OWN BANK ACCOUNT.', g.padL, g.botY + 54);
        },

        overlay: (g) => {
          A.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            A.hover = Math.max(0, Math.min(A.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (A.nP - 1))));
          }
          if (A.hover >= 0) {
            const i = A.hover, t = dayOf(i);
            ctx.strokeStyle = 'rgba(214,255,208,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(i), g.padT); ctx.lineTo(g.xOf(i), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            const near = A.rows.filter(r => Math.abs(r.pos - i) <= 5).sort((a, b) => Math.abs(a.pos - i) - Math.abs(b.pos - i));
            const lines = [
              [MONTHS[t.getUTCMonth()] + ' ' + t.getUTCDate() + ', ' + t.getUTCFullYear(), COL.txt, '600 12px ' + this.GROT],
              [(A.byDay[i] || 0) + ' PROCUREMENT MESSAGE' + ((A.byDay[i] || 0) === 1 ? '' : 'S') + ' THAT DAY', '#39ff14', '9px ' + this.MONO],
              ['RUNNING TOTAL HERE: ' + A.cum[i] + ' OF ' + A.total, '#ff2f9d', '9px ' + this.MONO]
            ];
            for (const r of near.slice(0, 3)) {
              lines.push([r.d + ' ' + r.t, COL.dim, '9px ' + this.MONO]);
              for (const ln of this.wrap(ctx, '\u201c' + r.x.slice(0, 140) + '\u201d', 380).slice(0, 3)) lines.push([ln, COL.txt, '11px ' + this.GROT]);
            }
            if (near.length) lines.push(['CLICK TO OPEN THE NEAREST ROW', COL.dim, '8.5px ' + this.MONO]);
            this.card(ctx, mx, my, lines);
          }
          this.cv.style.cursor = A.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    }

    pt_ask(type, p) {
      const A = this.M.ask; if (!A) return;
      if (type === 'down' && this.feedClick('ask', p, A)) return;
      if (this.penScrub('ask', type, p) === 'click' && A.hover >= 0) {
        const near = A.rows.filter(r => Math.abs(r.pos - A.hover) <= 5)
          .sort((a, b) => Math.abs(a.pos - A.hover) - Math.abs(b.pos - A.hover));
        if (near.length) {
          const f = A.frags.find(x => x.id && x.id.text === near[0].x);
          if (f) this.pin(f.id);
        }
      }
    }

    pt_prov(type, p) {
      const P = this.M.prov; if (!P) return;
      if (type === 'down' && this.feedClick('prov', p, P)) return;
      if (this.penScrub('prov', type, p) === 'click' && P.hover >= 0) this.pin(P.rows[P.hover]);
    }

    // ============================================================
    // VII — PARENTS
    // Annie's own mother and father, and the money between them. 73 raw
    // export rows (Aug 2025 -> Jul 2026) where she references her OWN mom/dad
    // AND money. The pens are the role each row plays: she ASKS, they SEND,
    // they REFUSE, she OWES (check / repay). The volume lane marks which
    // parent — mom carries almost all of it. Every row is verbatim and
    // click-to-source, like the other instruments.
    // ============================================================
    initParents() {
      const rows = (window.ParentMoneyData || []).slice();
      const nP = rows.length;
      // order is already chronological (export order); bin by role
      const lanes = [
        ['ask', 'ANNIE ASKS HER PARENTS FOR MONEY', '#39ff14'],
        ['send', 'THEY SEND / PAY / GIVE HER', '#00ffa3'],
        ['refuse', 'THEY REFUSE TO SEND', '#e01aff'],
        ['debt', 'SHE OWES / THEY WRITE THE CHECK', '#c77dff'],
        ['asset', 'THE HOUSE / INHERITED ASSET', '#b026ff'],
        ['mention', 'MENTIONED IN PASSING', '#6f8a5e']
      ];
      const bw = Math.max(1.2, nP / 8);
      const series = {}, max = {};
      for (const [k] of lanes) {
        series[k] = density(nP, rows.map((r, i) => (r.k === k ? { pos: i, w: 1 } : null)).filter(Boolean), bw);
        max[k] = maxOf(series[k]);
      }
      // volume lane marks which parent is in the row: mom = high, dad = low
      const vol = new Float32Array(nP);
      rows.forEach((r, i) => { vol[i] = /(^|\b)mom/.test(r.text.toLowerCase()) ? 1 : 0.18; });

      this.M.parents = {
        rows, nP, lanes, series, max, vol, hover: -1,
        play: 0.001, scrub: false, scrubGeo: null,
        frags: rows.map((r, i) => ({
          pos: i, text: r.text, tag: stamp(r) + ' · ' + r.tag, shownAt: 0,
          pen: { ask: '#39ff14', send: '#00ffa3', refuse: '#e01aff', debt: '#c77dff', asset: '#b026ff', mention: '#6f8a5e' }[r.k],
          id: r
        }))
      };
    }

    draw_parents(ctx, W, H, dt) {
      if (!this.M.parents) this.initParents();
      const P = this.M.parents;
      this.penInstrument(ctx, W, H, dt, {
        id: 'parents', accent: '#00ffa3', title: 'PARENTS · THE MONEY BETWEEN THEM',
        sub: this.fitSub(ctx, P.nP + ' RAW ROWS, AUG 2025 → JUL 2026 · ' + P.lanes.length + ' ROLES · SHE ASKS, THEY SEND, THEY REFUSE, SHE OWES'),
        nP: P.nP, padL: 210, padT: 76, padB: 70, laneGap: 7,
        lanes: P.lanes.map(([k, label, col]) => ({
          data: P.series[k], label, unit: P.lanes.filter(l => l[0] === k).length ? 'ROWS' : 'ROWS', color: col, max: P.max[k]
        })),
        volume: { data: P.vol, max: 1, color: '#e0aaff', label: 'MOM (TALL) vs DAD (LOW)' },
        frags: P.frags,
        feedTitle: 'HER PARENTS AND THE MONEY, VERBATIM · CLICK ONE FOR ITS SOURCE ROW',
        feed: { dy: -32, dh: -30 },
        ribbon: (i, past) => hx('#00ffa3', past ? 0.85 : 0.18),
        tickStep: Math.max(1, Math.ceil(P.nP / 9)),
        tickLabel: (i) => stamp(P.rows[i]).replace(/^~/, ''),

        readout: (g) => {
          const r = P.rows[Math.min(P.nP - 1, Math.floor(P.play))];
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = '#00ffa3'; ctx.textAlign = 'right';
          ctx.fillText(stamp(r) + ' · ' + r.tag, g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = COL.dim;
          ctx.fillText(r.tier + ' · ' + r.src.slice(0, 38), g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        marker: (g) => {
          const nMom = P.rows.filter(r => /(^|\b)mom/.test(r.text.toLowerCase())).length;
          const nDad = P.rows.length - nMom;
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = hx('#e0aaff', 0.85); ctx.textAlign = 'left';
          ctx.fillText('MOTHER: ' + nMom + ' ROWS · FATHER: ' + nDad + ' ROWS · SOURCE: imessage_export_2124702449_20260726041750..csv',
            g.padL, g.botY + 44);
          ctx.fillStyle = hx('#6f8a5e', 0.9);
          ctx.fillText('DIRECTION IN THIS EXPORT: DAN = SENT, ANNIE = RECEIVED (verified against known lines — see "Goodbye forever").',
            g.padL, g.botY + 58);
        },

        overlay: (g) => {
          P.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            P.hover = Math.max(0, Math.min(P.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (P.nP - 1))));
          }
          if (P.hover >= 0) {
            ctx.strokeStyle = 'rgba(232,230,225,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(P.hover), g.padT); ctx.lineTo(g.xOf(P.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            this.hoverCard(ctx, P.rows[P.hover], '#' + (P.hover + 1) + ' OF ' + P.nP);
          }
          this.cv.style.cursor = P.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    }

    pt_parents(type, p) {
      const P = this.M.parents; if (!P) return;
      if (type === 'down' && this.feedClick('parents', p, P)) return;
      if (this.penScrub('parents', type, p) === 'click' && P.hover >= 0) this.pin(P.rows[P.hover]);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (!window.PenCore || !window.ProcurementData) return;
    window.__procurement = new Procurement();
    window.__procurement.mount();
  });
})();
