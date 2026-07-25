// LEVIATHAN · WIKI section — analytic instruments (second wave)
//
// Five modules that read the wiki's PROSE rather than its edit history or its
// link graph. Everything here is a synthesized statistic computed in-browser
// from the page bodies at first view:
//
//   EPISTEME   how certain the record is of itself (hedge / assert / negate / query)
//   ATTENTION  documentation debt — words written ABOUT a subject vs. its own page
//   DICTION    each domain's private vocabulary (TF-IDF signature terms)
//   SCHEMA     metadata conformance — page_type × field coverage
//   ECHO       where the wiki repeats itself (page × page prose similarity)
//
// Mixed into the console Component prototype at mount, alongside WikiModules.
(function () {
  const STOP = new Set(('the a an and or but of to in on at for with by from as is was were are be been being ' +
    'this that these those it its his her their they he she him them we our you your i me my not no all any ' +
    'some more most other into over under after before during than then so such can could would should may ' +
    'might will just also only very own same each which who whom whose what when where why how there here ' +
    'about had has have been out up down off between through against while because if else than too').split(' '));

  const HEDGE_RE = /\b(may|might|possibly|perhaps|unclear|uncertain|appears?|seems?|suggests?|likely|unlikely|presumably|allegedly|apparently|probably|arguably|potentially|could|unknown|unconfirmed|ambiguous|roughly|approximately)\b/gi;
  const CERT_RE = /\b(definitely|certainly|confirmed|verified|proven|documented|always|never|exactly|precisely|clearly|demonstrably|established|conclusive|indisputable|unambiguous)\b/gi;
  const NEG_RE = /\b(not|never|none|nothing|cannot|can't|didn't|doesn't|isn't|wasn't|won't|refused|denied|denies|denial|contradicts?|contradiction|disputed|disputes)\b/gi;

  // core metadata columns for SCHEMA — [key, label, test]
  const CORE_FIELDS = [
    ['summary', 'SUMMARY', (p) => !!(p.summary && p.summary.length > 20)],
    ['tags', 'TAGS', (p) => !!(p.tags && p.tags.length)],
    ['sources', 'SOURCES', (p) => !!(p.sources && p.sources.length)],
    ['conns', 'TYPED CONN', (p) => !!(p.connections && p.connections.length)],
    ['claims', 'ARGUED CLAIM', (p) => !!(p.connections || []).some(c => c.claim && c.claim.length > 12)],
    ['links', 'PROSE LINKS', (p) => !!(p.links && p.links.length)],
    ['dates', 'DATE RANGE', (p) => !!p.drs],
    ['status', 'STATUS', (p) => !!p.status],
    ['infobox', 'INFOBOX', (p) => !!p.infobox],
    ['aliases', 'ALIASES', (p) => !!(p.aliases && p.aliases.length)]
  ];
  const BOX_FIELDS = [
    ['name', 'NAME'], ['known_for', 'KNOWN FOR'], ['relationship_to_dan', 'RELATION'],
    ['location', 'LOCATION'], ['sex', 'SEX'], ['handles', 'HANDLES']
  ];

  const hx = (col, a) => col + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

  window.WikiAnalytics = {
    WHINTS_X: {
      episteme: 'PRESS PLAY · FOUR PENS TRACE HOW SURE THE RECORD IS OF ITSELF, PAGE BY PAGE · REORDER WITH THE CHIPS · CLICK A PAGE TO READ IT',
      attention: 'WORDS WRITTEN ABOUT A SUBJECT vs. THE SIZE OF ITS OWN PAGE · ABOVE THE LINE = DOCUMENTATION DEBT · CLICK ANY DOT OR DEBT ROW TO READ',
      diction: 'EACH DOMAIN’S PRIVATE VOCABULARY, BY TF-IDF · HOVER A TERM FOR THE PAGES THAT CONCENTRATE IT · CLICK A PAGE TO READ',
      schema: 'METADATA CONFORMANCE · PAGE TYPE × FIELD COVERAGE · HOVER A CELL · CLICK IT TO LIST THE PAGES MISSING THAT FIELD',
      echo: 'WHERE THE WIKI REPEATS ITSELF · EVERY PAGE AGAINST EVERY OTHER, BY PROSE SIMILARITY · HOVER A CELL · CLICK AN ECHO TO READ',
      crucible: 'WHERE THE RECORD DISAGREES WITH ITSELF · EVERY CONTRADICTS EDGE, VERBATIM · GREEN = LATER RESOLVED · PRESS ▶ · CLICK EITHER SIDE TO READ'
    },

    // chips for the second-wave tabs · returns null when the tab isn't ours
    wikiChipsX(s) {
      const cs = (on, tone) => this.chipStyle(on, tone);
      if (s.tab === 'episteme') {
        return [
          { label: s.epistemePlay ? '❚❚ PAUSE' : '▶ PLAY', onClick: () => this.setState(st => ({ epistemePlay: !st.epistemePlay })), style: cs(s.epistemePlay, '#7b2dff') },
          { label: '↺ RESTART', onClick: () => this.epistemeRestart(), style: cs(false) },
          ...[[1.5, 'SLOW'], [5, 'NORMAL'], [16, 'FAST']].map(([v, l]) => ({
            label: l, onClick: () => this.setState({ epistemeSpeed: v }), style: cs(s.epistemeSpeed === v, '#7b2dff')
          })),
          ...[['certainty', 'BY CERTAINTY'], ['domain', 'BY DOMAIN'], ['size', 'BY SIZE']].map(([id, l]) => ({
            label: l, onClick: () => { this.setState({ epistemeOrder: id }); this.M.episteme = null; }, style: cs(s.epistemeOrder === id, '#b026ff')
          }))
        ];
      }
      if (s.tab === 'attention') {
        const pen = s.attentionView === 'pen';
        return [
          ...[['scatter', '\u25cc SCATTER'], ['pen', '\u2712 PENS']].map(([id, l]) => ({
            label: l, onClick: () => this.setState({ attentionView: id }), style: cs(s.attentionView === id, '#e0aaff')
          })),
          ...(pen ? [
            { label: s.attentionPlay ? '\u275a\u275a PAUSE' : '\u25b6 PLAY', onClick: () => this.setState(st => ({ attentionPlay: !st.attentionPlay })), style: cs(s.attentionPlay, '#39ff14') },
            { label: '\u21ba RESTART', onClick: () => this.attentionRestart(), style: cs(false) },
            ...[[1, 'SLOW'], [4, 'NORMAL'], [12, 'FAST']].map(([v, l]) => ({
              label: l, onClick: () => this.setState({ attentionSpeed: v }), style: cs(s.attentionSpeed === v, '#39ff14')
            }))
          ] : []),
          { label: 'ALL', onClick: () => { this.setState({ attentionDom: 'ALL' }); this.M.attentionPen = null; }, style: cs(s.attentionDom === 'ALL') },
          ...this.WDOMS.map(d => ({ label: d.toUpperCase(), onClick: () => { this.setState({ attentionDom: d }); this.M.attentionPen = null; }, style: cs(s.attentionDom === d, this.WCOL[d]) }))
        ];
      }
      if (s.tab === 'diction') {
        const pen = s.dictionView === 'pen';
        return [
          ...[['bars', '\u2261 BARS'], ['pen', '\u2712 PENS']].map(([id, l]) => ({
            label: l, onClick: () => { this.setState({ dictionView: id }); this.M.dictionPen = null; }, style: cs(s.dictionView === id, '#e0aaff')
          })),
          ...(pen ? [
            { label: s.dictionPlay ? '\u275a\u275a PAUSE' : '\u25b6 PLAY', onClick: () => this.setState(st => ({ dictionPlay: !st.dictionPlay })), style: cs(s.dictionPlay, '#39ff14') },
            { label: '\u21ba RESTART', onClick: () => this.dictionRestart(), style: cs(false) },
            ...[[0.6, 'SLOW'], [2, 'NORMAL'], [6, 'FAST']].map(([v, l]) => ({
              label: l, onClick: () => this.setState({ dictionSpeed: v }), style: cs(s.dictionSpeed === v, '#39ff14')
            }))
          ] : []),
          ...this.WDOMS.map(d => ({
            label: d.toUpperCase(), onClick: () => { this.setState({ dictionDom: d }); if (this.M.diction) this.M.diction.hover = null; this.M.dictionPen = null; },
            style: cs(s.dictionDom === d, this.WCOL[d])
          }))
        ];
      }
      if (s.tab === 'schema') {
        return [['core', 'CORE FIELDS'], ['box', 'INFOBOX FIELDS'], ['all', 'ALL']].map(([id, l]) => ({
          label: l, onClick: () => { this.setState({ schemaMode: id }); if (this.M.schema) this.M.schema.pinned = null; }, style: cs(s.schemaMode === id, '#00ffa3')
        }));
      }
      if (s.tab === 'crucible') {
        return [
          { label: s.cruciblePlay ? '❚❚ PAUSE' : '▶ PLAY', onClick: () => this.setState(st => ({ cruciblePlay: !st.cruciblePlay })), style: cs(s.cruciblePlay, this.WTCOL.contradicts) },
          { label: '↺ RESTART', onClick: () => this.crucibleRestart(), style: cs(false) },
          ...[[1, 'SLOW'], [3, 'NORMAL'], [8, 'FAST']].map(([v, l]) => ({
            label: l, onClick: () => this.setState({ crucibleSpeed: v }), style: cs(s.crucibleSpeed === v, this.WTCOL.contradicts)
          })),
          ...[['all', 'ALL'], ['unresolved', 'UNRESOLVED'], ['healed', 'HEALED']].map(([id, l]) => ({
            label: l,
            onClick: () => { this.setState({ crucibleFilter: id }); this.M.crucible = null; },
            style: cs(s.crucibleFilter === id, id === 'healed' ? this.WTCOL.resolves : this.WTCOL.contradicts)
          }))
        ];
      }
      if (s.tab === 'echo') {
        return [[0.12, 'FAINT ≥ .12'], [0.25, 'CLEAR ≥ .25'], [0.45, 'LOUD ≥ .45']].map(([v, l]) => ({
          label: l, onClick: () => { this.setState({ echoMin: v }); if (this.M.echo) this.M.echo.bmpFor = -1; }, style: cs(s.echoMin === v, '#39ff14')
        }));
      }
      return null;
    },

    // ---------- shared text machinery (built once, reused by DICTION + ECHO) ----------
    wkPlain(id) {
      let t = this.WT[id] || '';
      if (t.startsWith('---')) { const e = t.indexOf('\n---', 3); if (e > 0) t = t.slice(e + 4); }
      return t.replace(/```[\s\S]*?```/g, ' ')
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, (m, p1) => p1.split('/').pop().replace(/-/g, ' '));
    },
    wkSentences(id) {
      const t = this.wkPlain(id)
        .replace(/^\s*\|.*$/gm, ' ').replace(/^#{1,6}\s.*$/gm, ' ')
        .replace(/[*_`>#]/g, ' ').replace(/\s+/g, ' ');
      return t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 30 && s.length <= 320);
    },
    wkTokens(id) {
      return this.wkPlain(id).toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/)
        .filter(w => w.length > 3 && !STOP.has(w));
    },
    // term-frequency table per page + document frequency across the corpus
    wkTermIndex() {
      if (this._wkTI) return this._wkTI;
      const pages = this.WK.pages;
      const tf = pages.map(p => {
        const m = {};
        for (const w of this.wkTokens(p.id)) m[w] = (m[w] || 0) + 1;
        return m;
      });
      const df = {};
      for (const m of tf) for (const w of Object.keys(m)) df[w] = (df[w] || 0) + 1;
      this._wkTI = { tf, df, N: pages.length };
      return this._wkTI;
    },

    // ============================================================
    // WIKI 13 — EPISTEME  (how sure the record is of itself)
    // Four pens over a ranked walk of the corpus instead of over time:
    // the playhead crosses pages, not months.
    // ============================================================
    EP_PENS: [
      ['hedge', 'HEDGING', '#b026ff'],
      ['cert', 'ASSERTION', '#00ffa3'],
      ['neg', 'NEGATION', '#e01aff'],
      ['quer', 'OPEN QUESTION', '#39ff14']
    ],
    initEpisteme() {
      const WK = this.WK, order = this.state.epistemeOrder || 'certainty';
      const rows = [];
      for (const p of WK.pages) {
        if ((p.words || 0) < 60) continue; // too small for a stable rate
        const t = this.WT[p.id] || '';
        const w = p.words;
        const h = (t.match(HEDGE_RE) || []).length;
        const c = (t.match(CERT_RE) || []).length;
        const n = (t.match(NEG_RE) || []).length;
        const q = (t.match(/\?/g) || []).length;
        rows.push({
          p, w,
          hedge: h / w * 1000, cert: c / w * 1000, neg: n / w * 1000, quer: q / w * 1000,
          rawH: h, rawC: c,
          idx: (c - h) / w * 1000 // + = asserts, − = hedges
        });
      }
      if (order === 'certainty') rows.sort((a, b) => a.idx - b.idx);
      else if (order === 'size') rows.sort((a, b) => b.w - a.w);
      else rows.sort((a, b) => (this.WDOMS.indexOf(a.p.domain) - this.WDOMS.indexOf(b.p.domain)) || a.p.id.localeCompare(b.p.id));

      const nP = rows.length;
      const series = {}, maxRate = {};
      for (const [k] of this.EP_PENS) {
        series[k] = new Float32Array(nP);
        for (let i = 0; i < nP; i++) series[k][i] = rows[i][k];
        let m = 0.001;
        for (let i = 0; i < nP; i++) m = Math.max(m, series[k][i]);
        maxRate[k] = m;
      }
      const vol = new Float32Array(nP);
      let maxVol = 1;
      for (let i = 0; i < nP; i++) { vol[i] = rows[i].w; maxVol = Math.max(maxVol, rows[i].w); }

      // fragment feed — the single most epistemically loaded sentence per page,
      // with declared CONTRADICTION callouts winning outright. Each fragment
      // records WHICH pen it lit, so the feed can colour the attribution and
      // the reader can see that this sentence is what spiked that frequency.
      const PEN_COL = {};
      for (const [k, , col] of this.EP_PENS) PEN_COL[k] = col;
      const frags = [];
      rows.forEach((r, i) => {
        const sents = this.wkSentences(r.p.id);
        if (!sents.length) return;
        let best = null, bestScore = 0, bestPen = 'cert';
        for (const s of sents) {
          const h = (s.match(HEDGE_RE) || []).length;
          const c = (s.match(CERT_RE) || []).length;
          const n = (s.match(NEG_RE) || []).length;
          const q = (s.match(/\?/g) || []).length;
          const contra = /CONTRADICTION/i.test(s) ? 6 : 0;
          const sc = contra + h * 2 + c * 2 + q;
          if (sc > bestScore) {
            bestScore = sc; best = s;
            // attribute to the strongest signal in the winning sentence
            const rank = [['hedge', h * 2], ['cert', c * 2], ['neg', n], ['quer', q * 2 + contra]];
            rank.sort((a, b) => b[1] - a[1]);
            bestPen = rank[0][1] > 0 ? rank[0][0] : 'cert';
          }
        }
        if (best && bestScore >= 2) {
          frags.push({
            pos: i, text: best, tag: r.p.title.slice(0, 38), shownAt: 0,
            id: r.p.id, pen: PEN_COL[bestPen]
          });
        }
      });

      const hedged = rows.filter(r => r.idx < 0).length;
      const asserted = rows.filter(r => r.idx > 0).length;
      this.M.episteme = {
        rows, nP, series, maxRate, vol, maxVol, frags, order, hedged, asserted,
        play: 0.001, scrub: false, scrubGeo: null, hover: -1
      };
    },
    epistemeRestart() {
      const E = this.M.episteme; if (!E) return;
      E.play = 0.001; for (const f of E.frags) f.shownAt = 0;
      this.setState({ epistemePlay: true });
    },
    draw_episteme(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.episteme || this.M.episteme.order !== this.state.epistemeOrder) this.initEpisteme();
      const C = this.COL, E = this.M.episteme;
      if (!E.nP) { ctx.font = '11px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center'; ctx.fillText('NOT ENOUGH PROSE', W / 2, H / 2); return; }
      const ordLabel = E.order === 'certainty' ? 'RANKED HEDGED \u2192 ASSERTED' : E.order === 'size' ? 'RANKED LARGEST \u2192 SMALLEST' : 'GROUPED BY DOMAIN';

      this.penInstrument(ctx, W, H, dt, {
        id: 'episteme', accent: '#cfa8ff', title: 'EPISTEME',
        sub: E.nP + ' PAGES \u00b7 ' + E.hedged + ' HEDGE MORE THAN THEY ASSERT, ' + E.asserted + ' THE REVERSE \u00b7 ' + ordLabel,
        nP: E.nP, padL: 118, padT: 74, padB: 66, laneGap: 9,
        lanes: this.EP_PENS.map(([k, label, col]) => ({
          data: E.series[k], label, unit: '/1K WORDS', color: col, max: E.maxRate[k]
        })),
        volume: { data: E.vol, max: E.maxVol, color: '#7b2dff' },
        frags: E.frags,
        feedTitle: 'THE RECORD HEDGING AND ASSERTING \u00b7 VERBATIM',
        feed: { dy: -30, dh: -28 },
        // which region of the wiki the needle is over
        ribbon: (i, past) => hx(this.WCOL[E.rows[i].p.domain] || '#8fa878', past ? 0.85 : 0.22),
        tickStep: Math.max(1, Math.ceil(E.nP / 8)),
        tickLabel: (i) => '#' + (i + 1),

        readout: (g) => {
          const cur = E.rows[Math.min(E.nP - 1, Math.floor(E.play))];
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
          ctx.fillText(cur.p.title.slice(0, 34).toUpperCase(), g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO;
          ctx.fillStyle = cur.idx >= 0 ? '#00ffa3' : '#b026ff';
          ctx.fillText((cur.idx >= 0 ? 'ASSERTS +' : 'HEDGES ') + cur.idx.toFixed(1) + '  \u00b7  ' + this.fmt(cur.w) + ' WORDS', g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        // the zero-crossing — where the corpus stops hedging and starts asserting
        marker: (g) => {
          if (E.order !== 'certainty') return;
          const zi = E.rows.findIndex(r => r.idx >= 0);
          if (zi <= 0) return;
          const zx = g.xOf(zi);
          ctx.strokeStyle = 'rgba(232,230,225,0.28)'; ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(zx, g.padT); ctx.lineTo(zx, g.botY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '8px ' + this.MONO; ctx.fillStyle = 'rgba(232,230,225,0.45)';
          ctx.textAlign = 'center'; ctx.fillText('HEDGES \u2190 | \u2192 ASSERTS', zx, g.botY + 24);
          ctx.textAlign = 'left';
        },

        overlay: (g) => {
          E.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            E.hover = Math.max(0, Math.min(E.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (E.nP - 1))));
          }
          if (E.hover >= 0) {
            const r = E.rows[E.hover];
            ctx.strokeStyle = 'rgba(232,230,225,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(E.hover), g.padT); ctx.lineTo(g.xOf(E.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            this.card(ctx, mx, my, [
              [r.p.title.slice(0, 40), C.txt, '600 12px ' + this.GROT],
              [r.p.domain.toUpperCase() + ' \u00b7 #' + (E.hover + 1) + ' OF ' + E.nP + ' \u00b7 ' + this.fmt(r.w) + ' WORDS', this.WCOL[r.p.domain] || C.dim],
              ['HEDGE ' + r.hedge.toFixed(1) + '  \u00b7  ASSERT ' + r.cert.toFixed(1), '#b026ff'],
              ['NEGATE ' + r.neg.toFixed(1) + '  \u00b7  QUESTIONS ' + r.quer.toFixed(1), '#e01aff'],
              [r.idx >= 0 ? '\u25b2 ASSERTS MORE THAN IT HEDGES' : '\u25bc HEDGES MORE THAN IT ASSERTS', r.idx >= 0 ? '#00ffa3' : '#b026ff', '9px ' + this.MONO],
              ['CLICK TO READ THE PAGE', C.dim, '8.5px ' + this.MONO]
            ]);
          }
          if (this.cv) this.cv.style.cursor = E.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    },
    pt_episteme(type, p) {
      const E = this.M.episteme; if (!E) return;
      // a fragment row is the most compelling thing on screen — let it be the
      // thing you click, ahead of the column underneath the cursor
      if (type === 'down') {
        const hit = (E.fragRects || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (hit) { this.wikiOpen(hit.id); return; }
      }
      if (this.penScrub('episteme', type, p) === 'click' && E.hover >= 0) this.wikiOpen(E.rows[E.hover].p.id);
    },

    // ============================================================
    // WIKI 14 — ATTENTION  (documentation debt)
    // How many words the rest of the wiki spends naming a subject,
    // against how many words that subject's own page carries.
    // Mentions are counted in PROSE with wiki-link markup stripped,
    // so this is what the corpus TALKS about, not what it links.
    // ============================================================
    initAttention() {
      const WK = this.WK;
      const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      const targets = [];
      for (const p of WK.pages) {
        if (p.id.endsWith('/index')) continue;
        const keys = [p.title, ...(p.aliases || [])].map(norm)
          .filter(k => k.length >= 4 && k.split(' ').length <= 4);
        if (keys.length) targets.push({ p, keys });
      }
      // strip [[links]] so we measure prose naming, not the link web
      const bodies = WK.pages.map(p => ({
        id: p.id, p,
        txt: ' ' + norm((this.WT[p.id] || '').replace(/\[\[[^\]]*\]\]/g, ' ')) + ' '
      }));
      const items = [];
      for (const t of targets) {
        let n = 0; const from = [];
        for (const b of bodies) {
          if (b.id === t.p.id) continue;
          let c = 0;
          for (const k of t.keys) {
            const kk = ' ' + k + ' ';
            let i = 0;
            while ((i = b.txt.indexOf(kk, i)) >= 0) { c++; i += kk.length - 1; }
          }
          if (c) { n += c; from.push({ p: b.p, c }); }
        }
        from.sort((a, b) => b.c - a.c);
        const own = Math.max(1, t.p.words || 1);
        items.push({
          p: t.p, mentions: n, docs: from.length, from, own,
          // debt = how hard the page is working per word it actually carries.
          // Deliberately NOT n/sqrt(own): that just re-ranks by raw volume and
          // puts the single best-documented page on top of the debt list.
          debt: n / own
        });
      }
      let maxOwn = 1, maxMen = 1, maxDocs = 1;
      for (const it of items) { maxOwn = Math.max(maxOwn, it.own); maxMen = Math.max(maxMen, it.mentions); maxDocs = Math.max(maxDocs, it.docs); }
      const debts = items.filter(i => i.mentions >= 20).sort((a, b) => b.debt - a.debt).slice(0, 14);
      this.M.attention = { items, maxOwn, maxMen, maxDocs, debts, hover: null, pinned: null, rowHits: [], reveal: 0 };
    },
    // PEN MODE — the playhead sweeps subjects ranked by documentation debt and
    // the sidebar surfaces the actual sentences in which other pages name them.
    initAttentionPen() {
      if (!this.M.attention) this.initAttention();
      const A = this.M.attention, dom = this.state.attentionDom;
      const rows = A.items
        .filter(it => (dom === 'ALL' || it.p.domain === dom) && it.mentions > 0)
        .sort((x, y) => y.debt - x.debt);
      const nP = rows.length;
      const mentions = new Float32Array(nP), own = new Float32Array(nP), docs = new Float32Array(nP);
      const vol = new Float32Array(nP);
      let mMax = 0.001, oMax = 0.001, dMax = 0.001, vMax = 1;
      rows.forEach((it, i) => {
        // rate, not raw count: mentions per 1,000 words the page itself carries
        mentions[i] = it.mentions / Math.max(1, it.own) * 1000;
        own[i] = it.own;
        docs[i] = it.docs;
        vol[i] = it.mentions;
        if (mentions[i] > mMax) mMax = mentions[i];
        if (own[i] > oMax) oMax = own[i];
        if (docs[i] > dMax) dMax = docs[i];
        if (vol[i] > vMax) vMax = vol[i];
      });
      // the naming sentences themselves — one per documenting page, in order
      const frags = [];
      rows.forEach((it, i) => {
        const keys = [it.p.title, ...(it.p.aliases || [])]
          .filter(k => k && k.length >= 4).map(k => k.toLowerCase());
        let taken = 0;
        for (const f of it.from.slice(0, 3)) {
          const sent = this.wkSentences(f.p.id)
            .find(sn => keys.some(k => sn.toLowerCase().includes(k)));
          if (!sent) continue;
          frags.push({
            pos: i + Math.min(0.9, taken * 0.2), text: sent,
            tag: '\u2190 ' + f.c + '\u00d7 in ' + f.p.title.slice(0, 30),
            shownAt: 0, pen: this.WCOL[f.p.domain] || '#e0aaff', id: f.p.id
          });
          taken++;
        }
      });
      frags.sort((x, y) => x.pos - y.pos);
      this.M.attentionPen = {
        rows, nP, mentions, own, docs, vol, mMax, oMax, dMax, vMax, frags, dom,
        play: 0.001, scrub: false, scrubGeo: null, hover: -1
      };
    },
    attentionRestart() {
      const P = this.M.attentionPen; if (!P) return;
      P.play = 0.001; for (const f of P.frags) f.shownAt = 0;
      this.setState({ attentionPlay: true });
    },
    draw_attentionPen(ctx, W, H, dt) {
      if (!this.M.attentionPen || this.M.attentionPen.dom !== this.state.attentionDom) this.initAttentionPen();
      const C = this.COL, P = this.M.attentionPen;
      if (!P.nP) {
        ctx.font = '11px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
        ctx.fillText('NOTHING IS NAMED IN THIS DOMAIN', W / 2, H / 2); ctx.textAlign = 'left'; return;
      }
      this.penInstrument(ctx, W, H, dt, {
        id: 'attentionPen', stateKey: 'attention', accent: '#39ff14', title: 'ATTENTION',
        sub: P.nP + ' NAMED SUBJECTS \u00b7 RANKED BY DOCUMENTATION DEBT \u00b7 MOST DISCUSSED PER OWN WORD FIRST',
        nP: P.nP, padL: 118, padT: 74, padB: 66, laneGap: 9,
        lanes: [
          { data: P.mentions, label: 'NAMED', unit: '/1K OWN WORDS', color: '#39ff14', max: P.mMax },
          { data: P.own, label: 'OWN SIZE', unit: 'WORDS', color: '#b026ff', max: P.oMax },
          { data: P.docs, label: 'DOCUMENTERS', unit: 'PAGES', color: '#ccff00', max: P.dMax }
        ],
        volume: { data: P.vol, max: P.vMax, color: '#7b2dff' },
        frags: P.frags,
        feedTitle: 'THE SENTENCES THAT NAME THEM \u00b7 VERBATIM',
        feed: { dy: -30, dh: -28 },
        ribbon: (i, past) => hx(this.WCOL[P.rows[i].p.domain] || '#8fa878', past ? 0.85 : 0.22),
        tickStep: Math.max(1, Math.ceil(P.nP / 8)),
        tickLabel: (i) => '#' + (i + 1),
        readout: (g) => {
          const it = P.rows[Math.min(P.nP - 1, Math.floor(P.play))];
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
          ctx.fillText(it.p.title.slice(0, 34).toUpperCase(), g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = '#39ff14';
          ctx.fillText(it.mentions + ' MENTIONS \u00b7 ' + this.fmt(it.own) + ' OWN WORDS \u00b7 ' + it.docs + ' PAGES', g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },
        overlay: (g) => {
          P.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            P.hover = Math.max(0, Math.min(P.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (P.nP - 1))));
          }
          if (P.hover >= 0) {
            const it = P.rows[P.hover];
            ctx.strokeStyle = 'rgba(232,230,225,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(P.hover), g.padT); ctx.lineTo(g.xOf(P.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            const lines = [
              [it.p.title.slice(0, 40), C.txt, '600 12px ' + this.GROT],
              [it.p.domain.toUpperCase() + ' \u00b7 #' + (P.hover + 1) + ' OF ' + P.nP, this.WCOL[it.p.domain] || C.dim],
              [it.mentions + ' MENTIONS ACROSS ' + it.docs + ' PAGES', '#39ff14'],
              [this.fmt(it.own) + ' WORDS ON ITS OWN PAGE', '#b026ff']
            ];
            for (const f of it.from.slice(0, 3)) lines.push(['\u2190 ' + f.c + '\u00d7 in ' + f.p.title.slice(0, 30), this.WCOL[f.p.domain] || C.faint, '9px ' + this.MONO]);
            lines.push(['CLICK TO READ THE PAGE', C.dim, '8.5px ' + this.MONO]);
            this.card(ctx, mx, my, lines);
          }
          if (this.cv) this.cv.style.cursor = P.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    },
    draw_attention(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (this.state.attentionView === 'pen') return this.draw_attentionPen(ctx, W, H, dt);
      if (!this.M.attention) this.initAttention();
      const C = this.COL, A = this.M.attention, st = this.state;
      A.reveal = Math.min(1, A.reveal + dt * 0.9);
      const panelW = 300;
      const padL = 72, padR = panelW + 34, padT = 66, padB = 60;
      const pw = W - padL - padR, ph = H - padT - padB;
      const LX = (v) => Math.log10(1 + v);
      const mxX = LX(A.maxOwn) * 1.04, mxY = LX(A.maxMen) * 1.06;
      const X = (v) => padL + (LX(v) / mxX) * pw;
      const Y = (v) => padT + ph - (LX(v) / mxY) * ph;
      const dom = st.attentionDom;

      // log grid
      ctx.lineWidth = 1; ctx.font = '9px ' + this.MONO;
      for (let e = 0; e <= 5; e++) {
        const v = Math.pow(10, e);
        if (LX(v) <= mxX) {
          ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(X(v), padT); ctx.lineTo(X(v), padT + ph); ctx.stroke();
          ctx.fillStyle = C.faint; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(v >= 1000 ? (v / 1000) + 'K' : String(v), X(v), padT + ph + 8);
        }
        if (LX(v) <= mxY) {
          ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(padL + pw, Y(v)); ctx.stroke();
          ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(v >= 1000 ? (v / 1000) + 'K' : String(v), padL - 8, Y(v));
        }
      }
      // proportional-coverage reference: mentions rising with the square root of page mass
      ctx.strokeStyle = 'rgba(232,230,225,0.22)'; ctx.setLineDash([4, 5]);
      ctx.beginPath();
      for (let w = 1; w <= A.maxOwn; w *= 1.25) {
        const expect = Math.sqrt(w) * 0.9;
        const x = X(w), y = Y(expect);
        if (w === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.save();
      ctx.translate(X(A.maxOwn * 0.22), Y(Math.sqrt(A.maxOwn * 0.22) * 0.9));
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = 'rgba(232,230,225,0.4)'; ctx.textAlign = 'center';
      ctx.fillText('PROPORTIONAL COVERAGE', 0, -7);
      ctx.restore();
      ctx.font = '9.5px ' + this.MONO; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(224,26,255,0.6)'; ctx.textAlign = 'left';
      ctx.fillText('DEBT — TALKED ABOUT FAR MORE THAN DOCUMENTED', padL + 10, padT + 18);
      ctx.fillStyle = 'rgba(0,255,163,0.55)'; ctx.textAlign = 'right';
      ctx.fillText('MASS WITHOUT PULL — BIG PAGE, RARELY NAMED', padL + pw - 8, padT + ph - 12);

      // axis titles
      ctx.fillStyle = C.dim; ctx.textAlign = 'center';
      ctx.fillText('WORDS ON ITS OWN PAGE →', padL + pw / 2, H - 18);
      ctx.save(); ctx.translate(20, padT + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('TIMES NAMED IN OTHER PAGES →', 0, 0); ctx.restore();

      // dots
      A.hover = null;
      let best = 13;
      const mx = this.mouse.x, my = this.mouse.y;
      for (const it of A.items) {
        it._on = dom === 'ALL' || it.p.domain === dom;
        it._x = X(it.own); it._y = Y(it.mentions);
        if (it._on && mx < padL + pw + 12) {
          const d = Math.hypot(mx - it._x, my - it._y);
          if (d < best) { best = d; A.hover = it; }
        }
      }
      for (const it of A.items) {
        const lit = it === A.hover || it === A.pinned;
        const r = (2.4 + Math.sqrt(it.docs / A.maxDocs) * 11) * Math.min(1, A.reveal * 1.6);
        ctx.beginPath(); ctx.arc(it._x, it._y, lit ? r + 2.5 : r, 0, Math.PI * 2);
        if (!it._on) ctx.fillStyle = 'rgba(60,68,82,0.22)';
        else if (lit) ctx.fillStyle = '#ffffff';
        else ctx.fillStyle = hx(this.WCOL[it.p.domain] || '#8fa878', 0.4 + Math.min(0.5, it.docs / 60));
        ctx.fill();
        if (lit) {
          ctx.strokeStyle = this.WCOL[it.p.domain] || C.amber; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(it._x, it._y, r + 6, 0, Math.PI * 2); ctx.stroke();
        }
        if (it._on && (it.docs > 45 || lit)) {
          ctx.font = (lit ? '600 ' : '') + '8.5px ' + this.MONO;
          ctx.fillStyle = lit ? C.txt : '#6b7484';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(it.p.title.slice(0, 26), it._x, it._y + r + 4);
        }
      }

      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = '#39ff14';
      ctx.fillText('ATTENTION', 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      const shown = A.items.filter(i => i._on).length;
      const silent = A.items.filter(i => i._on && i.mentions === 0).length;
      ctx.fillText(shown + ' SUBJECTS · ' + silent + ' NEVER NAMED ANYWHERE ELSE · DOT SIZE = HOW MANY PAGES NAME IT', 18, 48);

      // ---- debt ranking panel ----
      const px = W - panelW - 14, py = padT - 24;
      const panelH = H - py - 34;
      ctx.fillStyle = 'rgba(11,15,21,0.9)'; ctx.fillRect(px, py, panelW, panelH);
      ctx.strokeStyle = C.line; ctx.strokeRect(px + 0.5, py + 0.5, panelW, panelH);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = '#e01aff';
      ctx.fillText('DOCUMENTATION DEBT · MOST DISCUSSED, LEAST WRITTEN', px + 12, py + 18);
      A.rowHits = [];
      const rowH = Math.min(26, (panelH - 40) / Math.max(1, A.debts.length));
      A.debts.forEach((it, i) => {
        const ry = py + 32 + i * rowH;
        if (ry + rowH > py + panelH - 4) return;
        const hov = mx >= px && mx <= px + panelW && my >= ry && my < ry + rowH;
        if (hov) { ctx.fillStyle = 'rgba(224,26,255,0.1)'; ctx.fillRect(px + 1, ry, panelW - 2, rowH); A.hover = it; }
        ctx.font = (hov ? '600 ' : '') + '9.5px ' + this.MONO;
        ctx.fillStyle = hov ? '#e9ffe6' : (this.WCOL[it.p.domain] || '#8fa878');
        ctx.fillText(it.p.title.slice(0, 28), px + 12, ry + rowH * 0.5);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = hov ? '#39ff14' : '#6f8a5e'; ctx.textAlign = 'right';
        ctx.fillText(it.mentions + '× / ' + this.fmt(it.own) + 'w', px + panelW - 12, ry + rowH * 0.5);
        ctx.textAlign = 'left';
        // debt bar
        const bw = (panelW - 24) * Math.min(1, it.debt / (A.debts[0].debt || 1));
        ctx.fillStyle = hx('#e01aff', hov ? 0.75 : 0.35);
        ctx.fillRect(px + 12, ry + rowH - 5, bw, 2);
        A.rowHits.push({ x: px, y: ry, w: panelW, h: rowH, it });
      });

      const show = A.pinned || A.hover;
      if (show) {
        const ratio = show.own ? (show.mentions / show.own * 1000) : 0;
        const lines = [
          [show.p.title.slice(0, 40), C.txt, '700 12.5px ' + this.GROT],
          [show.p.domain.toUpperCase() + ' · ' + this.fmt(show.own) + ' WORDS ON ITS OWN PAGE', this.WCOL[show.p.domain] || C.dim],
          ['NAMED ' + show.mentions + ' TIMES ACROSS ' + show.docs + ' PAGES', '#39ff14'],
          [ratio.toFixed(1) + ' MENTIONS PER 1,000 OWN WORDS', C.dim, '9px ' + this.MONO]
        ];
        for (const f of show.from.slice(0, 3)) lines.push(['← ' + f.c + '× in ' + f.p.title.slice(0, 30), this.WCOL[f.p.domain] || C.faint, '9px ' + this.MONO]);
        if (!show.from.length) lines.push(['NOTHING ELSE NAMES THIS SUBJECT', '#6f8a5e', '9px ' + this.MONO]);
        lines.push(['CLICK TO READ THE PAGE', C.dim, '8.5px ' + this.MONO]);
        this.card(ctx, mx >= 0 ? mx : show._x, my >= 0 ? my : show._y, lines, { border: show === A.pinned ? C.amber : C.line });
      }
      if (this.cv) this.cv.style.cursor = A.hover ? 'pointer' : 'crosshair';
    },
    pt_attention(type, p) {
      if (this.state.attentionView === 'pen') {
        const P = this.M.attentionPen; if (!P) return;
        if (type === 'down') {
          const hit = (P.fragRects || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
          if (hit) { this.wikiOpen(hit.id); return; }
        }
        if (this.penScrub('attentionPen', type, p) === 'click' && P.hover >= 0) this.wikiOpen(P.rows[P.hover].p.id);
        return;
      }
      const A = this.M.attention; if (!A) return;
      if (type === 'down') {
        const row = (A.rowHits || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (row) { this.wikiOpen(row.it.p.id); return; }
        if (A.hover) { if (A.pinned === A.hover) { this.wikiOpen(A.hover.p.id); A.pinned = null; } else A.pinned = A.hover; }
        else A.pinned = null;
      }
    },

    // ============================================================
    // WIKI 15 — DICTION  (each domain's private vocabulary)
    // TF-IDF over the page bodies: which words this domain uses that
    // the rest of the wiki does not.
    // ============================================================
    initDiction() {
      const WK = this.WK, TI = this.wkTermIndex();
      const byDom = {}, domsUsing = {};
      WK.pages.forEach((p, i) => {
        const d = p.domain;
        byDom[d] = byDom[d] || { counts: {}, total: 0, pages: 0 };
        byDom[d].pages++;
        for (const [w, c] of Object.entries(TI.tf[i])) {
          byDom[d].counts[w] = (byDom[d].counts[w] || 0) + c;
          byDom[d].total += c;
          (domsUsing[w] = domsUsing[w] || new Set()).add(d);
        }
      });
      const terms = {};
      for (const [d, agg] of Object.entries(byDom)) {
        const scored = [];
        for (const [w, c] of Object.entries(agg.counts)) {
          if (c < 4) continue;
          const score = (c / Math.max(1, agg.total)) * Math.log(TI.N / (1 + TI.df[w]));
          scored.push({ w, c, score, doms: domsUsing[w].size, df: TI.df[w] });
        }
        scored.sort((a, b) => b.score - a.score);
        terms[d] = scored.slice(0, 26);
      }
      this.M.diction = { byDom, terms, hover: null, pinned: null, rowHits: [], usage: null, usageFor: null };
    },
    // which pages concentrate a term, plus one verbatim line — resolved on demand
    dictionUsage(term, dom) {
      const D = this.M.diction, TI = this.wkTermIndex();
      const key = dom + '|' + term;
      if (D.usageFor === key) return D.usage;
      const hits = [];
      this.WK.pages.forEach((p, i) => {
        if (p.domain !== dom) return;
        const c = TI.tf[i][term];
        if (c) hits.push({ p, c });
      });
      hits.sort((a, b) => b.c - a.c);
      let quote = '';
      for (const h of hits.slice(0, 6)) {
        const s = this.wkSentences(h.p.id).find(x => new RegExp('\\b' + term.replace(/[^a-z']/g, '') + '\\b', 'i').test(x));
        if (s) { quote = s; break; }
      }
      D.usageFor = key;
      D.usage = { hits: hits.slice(0, 8), quote };
      return D.usage;
    },
    // PEN MODE — the playhead sweeps a domain's signature terms by TF-IDF and the
    // sidebar shows the in-context line dictionUsage already resolves.
    initDictionPen() {
      if (!this.M.diction) this.initDiction();
      const dom = this.state.dictionDom;
      const terms = (this.M.diction.terms[dom] || []).slice();
      const nP = terms.length;
      const score = new Float32Array(nP), uses = new Float32Array(nP), reach = new Float32Array(nP);
      let sMax = 0.001, uMax = 0.001, rMax = 0.001;
      terms.forEach((t, i) => {
        score[i] = t.score;
        uses[i] = t.c;
        // exclusivity: 1 when only this domain uses the word, 0 when all do
        reach[i] = 1 - (t.doms - 1) / Math.max(1, this.WDOMS.length - 1);
        if (score[i] > sMax) sMax = score[i];
        if (uses[i] > uMax) uMax = uses[i];
        if (reach[i] > rMax) rMax = reach[i];
      });
      const col = this.WCOL[dom] || '#e0aaff';
      const frags = [];
      terms.forEach((t, i) => {
        const u = this.dictionUsage(t.w, dom);
        if (u && u.quote) {
          frags.push({
            pos: i, text: u.quote,
            tag: t.w.toUpperCase() + ' \u00b7 ' + (u.hits[0] ? u.hits[0].p.title.slice(0, 30) : dom),
            shownAt: 0, pen: col, id: u.hits[0] ? u.hits[0].p.id : null
          });
        }
      });
      this.M.dictionPen = {
        terms, nP, score, uses, reach, sMax, uMax, rMax, frags, dom, col,
        play: 0.001, scrub: false, scrubGeo: null, hover: -1
      };
    },
    dictionRestart() {
      const P = this.M.dictionPen; if (!P) return;
      P.play = 0.001; for (const f of P.frags) f.shownAt = 0;
      this.setState({ dictionPlay: true });
    },
    draw_dictionPen(ctx, W, H, dt) {
      if (!this.M.dictionPen || this.M.dictionPen.dom !== this.state.dictionDom) this.initDictionPen();
      const C = this.COL, P = this.M.dictionPen;
      if (!P.nP) {
        ctx.font = '11px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
        ctx.fillText('NO DISTINCTIVE VOCABULARY IN THIS DOMAIN', W / 2, H / 2); ctx.textAlign = 'left'; return;
      }
      this.penInstrument(ctx, W, H, dt, {
        id: 'dictionPen', stateKey: 'diction', accent: P.col, title: 'DICTION \u00b7 ' + P.dom.toUpperCase(),
        sub: P.nP + ' SIGNATURE TERMS \u00b7 RANKED BY TF-IDF AGAINST THE OTHER ' + (this.WDOMS.length - 1) + ' DOMAINS',
        nP: P.nP, padL: 118, padT: 74, padB: 66, laneGap: 9,
        lanes: [
          { data: P.score, label: 'TF-IDF', unit: 'WEIGHT', color: P.col, max: P.sMax },
          { data: P.uses, label: 'USES', unit: 'IN DOMAIN', color: '#39ff14', max: P.uMax },
          { data: P.reach, label: 'EXCLUSIVITY', unit: '1 = ONLY HERE', color: '#b026ff', max: P.rMax }
        ],
        frags: P.frags,
        feedTitle: 'THE TERM IN CONTEXT \u00b7 VERBATIM',
        feed: { dy: -30, dh: -28 },
        tickStep: Math.max(1, Math.ceil(P.nP / 8)),
        tickLabel: (i) => P.terms[i] ? P.terms[i].w.slice(0, 9) : null,
        readout: (g) => {
          const t = P.terms[Math.min(P.nP - 1, Math.floor(P.play))];
          ctx.font = '600 13px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
          ctx.fillText(t.w.toUpperCase(), g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO; ctx.fillStyle = P.col;
          ctx.fillText(t.c + ' USES \u00b7 ' + t.df + ' PAGES CORPUS-WIDE \u00b7 ' + (t.doms === 1 ? 'ONLY HERE' : t.doms + ' DOMAINS'), g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },
        overlay: (g) => {
          P.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            P.hover = Math.max(0, Math.min(P.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (P.nP - 1))));
          }
          if (P.hover >= 0) {
            const t = P.terms[P.hover];
            ctx.strokeStyle = 'rgba(232,230,225,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(P.hover), g.padT); ctx.lineTo(g.xOf(P.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            const u = this.dictionUsage(t.w, P.dom);
            const lines = [
              [t.w.toUpperCase(), C.txt, '700 14px ' + this.GROT],
              [t.c + ' USES \u00b7 #' + (P.hover + 1) + ' OF ' + P.nP + ' \u00b7 ' + (t.doms === 1 ? 'USED NOWHERE ELSE' : t.doms + ' DOMAINS'), P.col]
            ];
            for (const h of (u ? u.hits.slice(0, 4) : [])) lines.push(['\u25b8 ' + h.p.title.slice(0, 32) + '  ' + h.c + '\u00d7', this.WCOL[h.p.domain] || C.faint, '9px ' + this.MONO]);
            lines.push(['CLICK TO READ THE TOP PAGE', C.dim, '8.5px ' + this.MONO]);
            this.card(ctx, mx, my, lines);
          }
          if (this.cv) this.cv.style.cursor = P.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    },
    draw_diction(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (this.state.dictionView === 'pen') return this.draw_dictionPen(ctx, W, H, dt);
      if (!this.M.diction) this.initDiction();
      const C = this.COL, D = this.M.diction, st = this.state;
      const dom = st.dictionDom, col = this.WCOL[dom] || '#8fa878';
      const list = D.terms[dom] || [];
      const agg = D.byDom[dom] || { total: 0, pages: 0 };

      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = col;
      ctx.fillText('DICTION · ' + dom.toUpperCase(), 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(agg.pages + ' PAGES · ' + this.fmt(agg.total) + ' CONTENT WORDS · TF-IDF AGAINST THE OTHER ' + (this.WDOMS.length - 1) + ' DOMAINS', 18, 48);

      if (!list.length) {
        ctx.font = '11px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
        ctx.fillText('NO DISTINCTIVE VOCABULARY IN THIS DOMAIN', W / 2, H / 2);
        return;
      }

      const panelW = Math.min(360, W * 0.34);
      const gx0 = 150, gx1 = W - panelW - 34;
      const gy0 = 72, gy1 = H - 34;
      const rowH = Math.min(24, (gy1 - gy0) / list.length);
      const maxScore = list[0].score || 1;
      const mx = this.mouse.x, my = this.mouse.y;
      D.hover = null;
      D.rowHits = [];

      list.forEach((t, i) => {
        const y = gy0 + i * rowH;
        if (y + rowH > gy1) return;
        const hov = mx >= 18 && mx <= gx1 && my >= y && my < y + rowH;
        if (hov) D.hover = t;
        const bw = Math.max(2, (t.score / maxScore) * (gx1 - gx0));
        // exclusivity: a term used by one domain only is a private word
        const excl = 1 - (t.doms - 1) / Math.max(1, this.WDOMS.length - 1);
        ctx.fillStyle = hx(col, hov ? 0.95 : 0.3 + excl * 0.45);
        ctx.fillRect(gx0, y + rowH * 0.22, bw, Math.max(3, rowH * 0.5));
        ctx.font = (hov ? '600 ' : '') + Math.min(11, rowH - 4) + 'px ' + this.MONO;
        ctx.fillStyle = hov ? '#e9ffe6' : '#a9a49a';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(t.w.slice(0, 20), gx0 - 10, y + rowH / 2);
        ctx.textAlign = 'left';
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = hov ? col : '#6f8a5e';
        ctx.fillText(t.c + '×  ·  ' + (t.doms === 1 ? 'ONLY HERE' : t.doms + ' DOMAINS'), gx0 + bw + 8, y + rowH / 2);
        D.rowHits.push({ x: 18, y, w: gx1 - 18, h: rowH, t });
      });
      ctx.textBaseline = 'alphabetic';
      ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText('BAR = TF-IDF WEIGHT · SOLID = USED NOWHERE ELSE', gx0, gy0 - 10);

      // ---- usage panel ----
      const show = D.pinned || D.hover;
      const px = W - panelW - 14, py = 62, panelH = H - py - 28;
      ctx.fillStyle = 'rgba(11,15,21,0.9)'; ctx.fillRect(px, py, panelW, panelH);
      ctx.strokeStyle = show ? hx(col, 0.5) : C.line; ctx.strokeRect(px + 0.5, py + 0.5, panelW, panelH);
      if (!show) {
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.fillText('HOVER A TERM TO SEE WHERE IT CONCENTRATES', px + 12, py + 20);
      } else {
        const u = this.dictionUsage(show.w, dom);
        ctx.font = '700 15px ' + this.GROT; ctx.fillStyle = col;
        ctx.fillText(show.w.toUpperCase(), px + 12, py + 24);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(show.c + ' USES IN ' + dom.toUpperCase() + ' · ON ' + show.df + ' PAGES CORPUS-WIDE · ' + show.doms + '/' + this.WDOMS.length + ' DOMAINS', px + 12, py + 40);
        let ry = py + 62;
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.fillText('CONCENTRATED IN', px + 12, ry); ry += 14;
        const maxC = u.hits.length ? u.hits[0].c : 1;
        for (const h of u.hits) {
          if (ry > py + panelH - 96) break;
          const hov = mx >= px && mx <= px + panelW && my >= ry - 10 && my < ry + 8;
          if (hov) { ctx.fillStyle = hx(col, 0.12); ctx.fillRect(px + 1, ry - 10, panelW - 2, 18); }
          ctx.fillStyle = hx(col, 0.3); ctx.fillRect(px + 12, ry + 4, (panelW - 90) * (h.c / maxC), 2);
          ctx.font = (hov ? '600 ' : '') + '9.5px ' + this.MONO;
          ctx.fillStyle = hov ? '#e9ffe6' : '#a9a49a';
          ctx.fillText(h.p.title.slice(0, 30), px + 12, ry);
          ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = '#6f8a5e'; ctx.textAlign = 'right';
          ctx.fillText(h.c + '×', px + panelW - 12, ry); ctx.textAlign = 'left';
          D.rowHits.push({ x: px, y: ry - 10, w: panelW, h: 18, open: h.p.id });
          ry += 19;
        }
        if (u.quote) {
          ry = Math.max(ry + 6, py + panelH - 88);
          ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.faint;
          ctx.fillText('IN CONTEXT', px + 12, ry); ry += 15;
          ctx.font = '11px ' + this.GROT; ctx.fillStyle = 'rgba(232,230,225,0.86)';
          for (const ln of this.wkWrap(ctx, '“' + u.quote + '”', panelW - 26).slice(0, 4)) {
            if (ry > py + panelH - 8) break;
            ctx.fillText(ln, px + 12, ry); ry += 15;
          }
        }
      }
      if (this.cv) this.cv.style.cursor = (D.hover || (D.rowHits || []).some(r => r.open && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)) ? 'pointer' : 'crosshair';
    },
    pt_diction(type, p) {
      if (this.state.dictionView === 'pen') {
        const P = this.M.dictionPen; if (!P) return;
        if (type === 'down') {
          const hit = (P.fragRects || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
          if (hit) { this.wikiOpen(hit.id); return; }
        }
        if (this.penScrub('dictionPen', type, p) === 'click' && P.hover >= 0) {
          const u = this.dictionUsage(P.terms[P.hover].w, P.dom);
          if (u && u.hits[0]) this.wikiOpen(u.hits[0].p.id);
        }
        return;
      }
      const D = this.M.diction; if (!D) return;
      if (type === 'down') {
        const hit = (D.rowHits || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (hit && hit.open) { this.wikiOpen(hit.open); return; }
        if (hit && hit.t) { D.pinned = (D.pinned === hit.t ? null : hit.t); return; }
        D.pinned = null;
      }
    },

    // ============================================================
    // WIKI 16 — SCHEMA  (the shape of the metadata)
    // page_type × field coverage. Every cell is a real gap you can open.
    // ============================================================
    initSchema() {
      const WK = this.WK;
      const types = {};
      for (const p of WK.pages) {
        const t = p.page_type || '(untyped)';
        (types[t] = types[t] || []).push(p);
      }
      const rows = Object.entries(types).map(([t, ps]) => ({ t, ps })).sort((a, b) => b.ps.length - a.ps.length);
      this.M.schema = { rows, hover: null, pinned: null, rowHits: [], cellHits: [] };
    },
    schemaCols() {
      const mode = this.state.schemaMode;
      const box = BOX_FIELDS.map(([k, l]) => [k, l, (p) => !!(p.infobox && p.infobox[k])]);
      if (mode === 'core') return CORE_FIELDS;
      if (mode === 'box') return box;
      return CORE_FIELDS.concat(box);
    },
    draw_schema(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.schema) this.initSchema();
      const C = this.COL, S = this.M.schema;
      const cols = this.schemaCols();
      const panelW = S.pinned ? 300 : 0;
      const gx0 = 132, gx1 = W - 24 - (panelW ? panelW + 14 : 0);
      const gy0 = 100, gy1 = H - 56;
      const cw = (gx1 - gx0) / cols.length;
      const rh = Math.min(34, (gy1 - gy0) / S.rows.length);
      const mx = this.mouse.x, my = this.mouse.y;
      S.hover = null; S.cellHits = []; S.rowHits = [];

      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = '#00ffa3';
      ctx.fillText('SCHEMA', 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(S.rows.length + ' PAGE TYPES × ' + cols.length + ' FIELDS · CELL = SHARE OF THAT TYPE CARRYING THE FIELD', 18, 48);

      // column headers (rotated)
      cols.forEach(([k, label], ci) => {
        const x = gx0 + ci * cw + cw / 2;
        ctx.save();
        ctx.translate(x, gy0 - 8); ctx.rotate(-Math.PI / 4);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'left';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });

      // overall per-column coverage across the whole corpus
      const totals = cols.map(([k, l, test]) => this.WK.pages.filter(test).length);

      S.rows.forEach((r, ri) => {
        const y = gy0 + ri * rh;
        if (y + rh > gy1 + 1) return;
        ctx.font = '9.5px ' + this.MONO; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const rowHov = my >= y && my < y + rh && mx >= 18 && mx <= gx1;
        ctx.fillStyle = rowHov ? '#e9ffe6' : '#8fa878';
        ctx.fillText(r.t.toUpperCase().slice(0, 14), gx0 - 12, y + rh / 2 - 5);
        ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.fillText(r.ps.length + ' PAGES', gx0 - 12, y + rh / 2 + 7);
        ctx.textAlign = 'left';
        cols.forEach(([k, label, test], ci) => {
          const have = r.ps.filter(test);
          const frac = have.length / r.ps.length;
          const x = gx0 + ci * cw;
          const hov = mx >= x && mx < x + cw && my >= y && my < y + rh;
          if (hov) S.hover = { r, k, label, frac, have: have.length, miss: r.ps.filter(p => !test(p)), test };
          // coverage → green, gap → red; full coverage reads as a solid block
          const colr = frac >= 0.999 ? '#00ffa3' : frac >= 0.6 ? '#39ff14' : '#e01aff';
          ctx.fillStyle = hx(colr, 0.1 + frac * 0.72);
          ctx.fillRect(x + 1, y + 1, cw - 2, rh - 2);
          if (hov) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.strokeRect(x + 1, y + 1, cw - 2, rh - 2); }
          if (cw > 34 && rh > 15) {
            ctx.font = '8.5px ' + this.MONO;
            ctx.fillStyle = frac > 0.45 ? 'rgba(7,9,13,0.85)' : 'rgba(232,230,225,0.65)';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(frac * 100) + '%', x + cw / 2, y + rh / 2);
            ctx.textAlign = 'left';
          }
          S.cellHits.push({ x, y, w: cw, h: rh, cell: { r, k, label, frac, miss: r.ps.filter(p => !test(p)) } });
        });
      });

      // corpus-wide footer bar per column
      ctx.textBaseline = 'alphabetic';
      cols.forEach(([k, label], ci) => {
        const x = gx0 + ci * cw, frac = totals[ci] / this.WK.pages.length;
        ctx.fillStyle = 'rgba(29,36,48,0.9)'; ctx.fillRect(x + 1, gy1 + 10, cw - 2, 5);
        ctx.fillStyle = hx(frac >= 0.6 ? '#00ffa3' : '#39ff14', 0.85);
        ctx.fillRect(x + 1, gy1 + 10, (cw - 2) * frac, 5);
      });
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint; ctx.textAlign = 'right';
      ctx.fillText('CORPUS-WIDE', gx0 - 12, gy1 + 16);
      ctx.textAlign = 'left';

      // ---- gap panel ----
      if (S.pinned) {
        const px = W - panelW - 14, py = 62, panelH = H - py - 28;
        ctx.fillStyle = 'rgba(11,15,21,0.96)'; ctx.fillRect(px, py, panelW, panelH);
        ctx.strokeStyle = '#e01aff'; ctx.strokeRect(px + 0.5, py + 0.5, panelW, panelH);
        ctx.font = '600 10.5px ' + this.MONO; ctx.fillStyle = '#e01aff';
        ctx.fillText(S.pinned.r.t.toUpperCase() + ' · NO ' + S.pinned.label, px + 12, py + 20);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(S.pinned.miss.length + ' OF ' + S.pinned.r.ps.length + ' PAGES MISSING THIS FIELD', px + 12, py + 35);
        let ry = py + 54;
        for (const p of S.pinned.miss) {
          if (ry > py + panelH - 10) { ctx.fillStyle = C.faint; ctx.font = '8.5px ' + this.MONO; ctx.fillText('… and more', px + 12, ry); break; }
          const hov = mx >= px && mx <= px + panelW && my >= ry - 10 && my < ry + 8;
          if (hov) { ctx.fillStyle = 'rgba(224,26,255,0.12)'; ctx.fillRect(px + 1, ry - 10, panelW - 2, 18); }
          ctx.font = '9px ' + this.MONO;
          ctx.fillStyle = this.WCOL[p.domain] || '#8fa878';
          ctx.fillText('▸', px + 12, ry);
          ctx.fillStyle = hov ? '#e9ffe6' : '#a9a49a';
          ctx.fillText(p.title.slice(0, 32), px + 26, ry);
          S.rowHits.push({ x: px, y: ry - 10, w: panelW, h: 18, id: p.id });
          ry += 19;
        }
      }

      if (S.hover && !S.pinned) {
        this.card(ctx, mx, my, [
          [S.hover.r.t.toUpperCase() + ' × ' + S.hover.label, C.txt, '600 11px ' + this.MONO],
          [S.hover.have + ' OF ' + S.hover.r.ps.length + ' PAGES CARRY IT (' + Math.round(S.hover.frac * 100) + '%)', S.hover.frac >= 0.999 ? '#00ffa3' : '#39ff14'],
          [S.hover.miss.length ? S.hover.miss.length + ' MISSING · CLICK TO LIST THEM' : 'COMPLETE COVERAGE', S.hover.miss.length ? '#e01aff' : '#00ffa3', '9px ' + this.MONO]
        ]);
      }
      if (this.cv) this.cv.style.cursor = (S.hover && S.hover.miss.length) || S.rowHits.some(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) ? 'pointer' : 'crosshair';
    },
    pt_schema(type, p) {
      const S = this.M.schema; if (!S) return;
      if (type === 'down') {
        const row = (S.rowHits || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (row) { this.wikiOpen(row.id); return; }
        const cell = (S.cellHits || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (cell && cell.cell.miss.length) {
          S.pinned = (S.pinned && S.pinned.r.t === cell.cell.r.t && S.pinned.k === cell.cell.k) ? null : cell.cell;
        } else S.pinned = null;
      }
    },

    // ============================================================
    // WIKI 18 — CRUCIBLE  (where the record disagrees with itself)
    //
    // The corpus ships the ground truth: contradicts / resolves / mirrors /
    // parallels edges, each carrying an authored `claim`. No NLI, no
    // embeddings — the disagreements were argued by hand and this instrument
    // just puts them at the centre instead of buried in a 640-edge feed.
    //
    // The axis is the whole TENSION FAMILY of page-pairs, ranked so the
    // contradictions lead. Sweeping only the contradictions would be a
    // four-position playhead — the 7 contradicts edges are reciprocal and
    // collapse to 4 unordered pairs — which is a fact, not an instrument.
    // The chips filter down to them; the pens show what kind of tension each
    // pair carries as the needle crosses it.
    // ============================================================
    CRUC_FAM: ['contradicts', 'resolves', 'mirrors', 'parallels'],
    initCrucible() {
      const WK = this.WK, T = this.WTCOL;
      const filter = this.state.crucibleFilter || 'all';
      const fam = new Set(this.CRUC_FAM);

      // endpoint tallies: how much of each relation touches a given page
      const touch = {};
      for (const e of WK.typed) {
        if (!fam.has(e.type)) continue;
        for (const side of [e.a, e.b]) {
          (touch[side] = touch[side] || {})[e.type] = ((touch[side] || {})[e.type] || 0) + 1;
        }
      }
      // total typed degree, for the volume lane
      const deg = {};
      for (const e of WK.typed) { deg[e.a] = (deg[e.a] || 0) + 1; deg[e.b] = (deg[e.b] || 0) + 1; }

      const pairs = new Map();
      for (const e of WK.typed) {
        if (!fam.has(e.type)) continue;
        const key = e.a < e.b ? e.a + '|' + e.b : e.b + '|' + e.a;
        if (!pairs.has(key)) {
          const [x, y] = key.split('|');
          pairs.set(key, { key, a: WK.byId[x], b: WK.byId[y], edges: [] });
        }
        pairs.get(key).edges.push(e);
      }

      let rows = [...pairs.values()].filter(r => r.a && r.b);
      for (const r of rows) {
        const ta = touch[r.a.id] || {}, tb = touch[r.b.id] || {};
        r.contra = (ta.contradicts || 0) + (tb.contradicts || 0);
        r.resolv = (ta.resolves || 0) + (tb.resolves || 0);
        r.mirror = (ta.mirrors || 0) + (tb.mirrors || 0);
        r.parall = (ta.parallels || 0) + (tb.parallels || 0);
        r.hasContra = r.edges.some(e => e.type === 'contradicts');
        // healed = a resolution reaches one of these pages, even if the
        // resolving edge is not itself on this pair
        r.healed = r.hasContra && r.resolv > 0;
        r.deg = (deg[r.a.id] || 0) + (deg[r.b.id] || 0);
      }
      if (filter === 'unresolved') rows = rows.filter(r => r.hasContra && !r.healed);
      else if (filter === 'healed') rows = rows.filter(r => r.healed);

      // contradictions lead, hottest first; the rest fall in behind by tension
      rows.sort((x, y) =>
        (y.hasContra ? 1 : 0) - (x.hasContra ? 1 : 0)
        || y.contra - x.contra
        || (y.mirror + y.parall) - (x.mirror + x.parall)
        || x.a.id.localeCompare(y.a.id));

      const nP = rows.length;
      const series = { contra: new Float32Array(nP), resolv: new Float32Array(nP), mirror: new Float32Array(nP), parall: new Float32Array(nP) };
      const vol = new Float32Array(nP);
      let maxVol = 1;
      const maxRate = { contra: 0.001, resolv: 0.001, mirror: 0.001, parall: 0.001 };
      rows.forEach((r, i) => {
        for (const k of ['contra', 'resolv', 'mirror', 'parall']) {
          series[k][i] = r[k];
          if (r[k] > maxRate[k]) maxRate[k] = r[k];
        }
        vol[i] = r.deg;
        if (r.deg > maxVol) maxVol = r.deg;
      });

      // the verbatim payoff: every authored claim on every edge of the pair,
      // coloured by its relation and clickable through to the page that argues it
      const frags = [];
      rows.forEach((r, i) => {
        const ordered = r.edges.slice().sort((x, y) =>
          (y.type === 'contradicts' ? 1 : 0) - (x.type === 'contradicts' ? 1 : 0));
        ordered.forEach((e, j) => {
          if (!e.claim || e.claim.length < 12) return;
          const src = WK.byId[e.a], dst = WK.byId[e.b];
          if (!src || !dst) return;
          frags.push({
            pos: i + Math.min(0.9, j * 0.12),
            text: e.claim,
            tag: (r.healed && e.type === 'contradicts' ? '✔ HEALED · ' : '')
              + e.type.toUpperCase() + ' · ' + src.title.slice(0, 22) + ' → ' + dst.title.slice(0, 22),
            shownAt: 0,
            pen: r.healed && e.type === 'contradicts' ? T.resolves : (T[e.type] || '#8fa878'),
            id: e.a
          });
        });
      });
      frags.sort((a, b) => a.pos - b.pos);

      const nContra = rows.filter(r => r.hasContra).length;
      const nHealed = rows.filter(r => r.healed).length;
      this.M.crucible = {
        rows, nP, series, maxRate, vol, maxVol, frags, filter, nContra, nHealed,
        play: 0.001, scrub: false, scrubGeo: null, hover: -1
      };
    },
    crucibleRestart() {
      const K = this.M.crucible; if (!K) return;
      K.play = 0.001; for (const f of K.frags) f.shownAt = 0;
      this.setState({ cruciblePlay: true });
    },
    draw_crucible(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.crucible || this.M.crucible.filter !== (this.state.crucibleFilter || 'all')) this.initCrucible();
      const C = this.COL, K = this.M.crucible, T = this.WTCOL;
      if (!K.nP) {
        ctx.font = '11px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
        ctx.fillText('NO PAIRS MATCH THIS FILTER', W / 2, H / 2); ctx.textAlign = 'left';
        return;
      }
      const PENS = [
        ['contra', 'CONTRADICTION', T.contradicts],
        ['resolv', 'RESOLUTION', T.resolves],
        ['mirror', 'TENSION', T.mirrors],
        ['parall', 'PARALLEL', T.parallels]
      ];
      const filtLabel = K.filter === 'unresolved' ? 'UNRESOLVED ONLY' : K.filter === 'healed' ? 'HEALED ONLY' : 'ALL TENSION PAIRS, CONTRADICTIONS FIRST';

      this.penInstrument(ctx, W, H, dt, {
        id: 'crucible', accent: T.contradicts, title: 'CRUCIBLE',
        sub: K.nP + ' PAIRS IN TENSION · ' + K.nContra + ' CONTRADICT · ' + K.nHealed + ' LATER RESOLVED · ' + filtLabel,
        nP: K.nP, padL: 118, padT: 74, padB: 66, laneGap: 9,
        lanes: PENS.map(([k, label, col]) => ({
          data: K.series[k], label, unit: 'EDGES', color: col, max: K.maxRate[k]
        })),
        volume: { data: K.vol, max: K.maxVol, color: '#7b2dff' },
        frags: K.frags,
        feedTitle: 'THE RECORD ARGUING WITH ITSELF · CLAIMS VERBATIM',
        feed: { dy: -30, dh: -28 },
        // contradictions burn, healed pairs go green, the rest stay quiet
        ribbon: (i, past) => {
          const r = K.rows[i];
          const col = r.healed ? T.resolves : r.hasContra ? T.contradicts : '#7b2dff';
          return hx(col, past ? (r.hasContra ? 0.95 : 0.5) : 0.18);
        },
        tickStep: Math.max(1, Math.ceil(K.nP / 8)),
        tickLabel: (i) => '#' + (i + 1),

        readout: (g) => {
          const r = K.rows[Math.min(K.nP - 1, Math.floor(K.play))];
          ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
          ctx.fillText((r.a.title.slice(0, 22) + ' ⟷ ' + r.b.title.slice(0, 22)).toUpperCase(), g.chartR - 20, 30);
          ctx.font = '9px ' + this.MONO;
          ctx.fillStyle = r.healed ? T.resolves : r.hasContra ? T.contradicts : C.dim;
          ctx.fillText(r.healed ? '✔ CONTRADICTED, THEN RESOLVED'
            : r.hasContra ? '✖ CONTRADICTION STANDS'
            : r.edges.length + ' TENSION EDGE' + (r.edges.length === 1 ? '' : 'S'), g.chartR - 20, 46);
          ctx.textAlign = 'left';
        },

        // the boundary where authored contradiction gives way to mere tension
        marker: (g) => {
          if (K.filter !== 'all') return;
          const zi = K.rows.findIndex(r => !r.hasContra);
          if (zi <= 0) return;
          const zx = g.xOf(zi);
          ctx.strokeStyle = hx(T.contradicts, 0.5); ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(zx, g.padT); ctx.lineTo(zx, g.botY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '8px ' + this.MONO; ctx.fillStyle = hx(T.contradicts, 0.7);
          ctx.textAlign = 'center'; ctx.fillText('CONTRADICTS ← | → MERELY IN TENSION', zx, g.botY + 24);
          ctx.textAlign = 'left';
        },

        overlay: (g) => {
          K.hover = -1;
          const mx = this.mouse.x, my = this.mouse.y;
          if (mx >= g.padL - 6 && mx <= g.chartR - 14 && my >= g.ribY - 6 && my <= g.botY + 6) {
            K.hover = Math.max(0, Math.min(K.nP - 1, Math.round(((mx - g.padL) / (g.chartR - g.padL - 20)) * (K.nP - 1))));
          }
          if (K.hover >= 0) {
            const r = K.rows[K.hover];
            ctx.strokeStyle = 'rgba(232,230,225,0.22)'; ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(g.xOf(K.hover), g.padT); ctx.lineTo(g.xOf(K.hover), g.botY); ctx.stroke();
            ctx.setLineDash([]);
            const lines = [
              [r.a.title.slice(0, 40), this.WCOL[r.a.domain] || C.txt, '600 12px ' + this.GROT],
              ['⟷ ' + r.b.title.slice(0, 38), this.WCOL[r.b.domain] || C.txt, '600 12px ' + this.GROT],
              ['#' + (K.hover + 1) + ' OF ' + K.nP + ' · ' + r.deg + ' TYPED EDGES ON THE PAIR', C.dim, '9px ' + this.MONO]
            ];
            for (const e of r.edges.slice(0, 3)) {
              lines.push([e.type.toUpperCase(), T[e.type] || C.dim, '9px ' + this.MONO]);
              if (e.claim) for (const ln of this.wkWrap(ctx, e.claim.slice(0, 190), 380).slice(0, 3)) {
                lines.push([ln, C.txt, '11px ' + this.GROT]);
              }
            }
            lines.push([r.healed ? '✔ A RESOLUTION REACHES THIS PAIR' : r.hasContra ? '✖ NOTHING RESOLVES THIS' : 'TENSION WITHOUT CONTRADICTION',
              r.healed ? T.resolves : r.hasContra ? T.contradicts : C.faint, '9px ' + this.MONO]);
            lines.push(['CLICK TO READ ' + r.a.title.slice(0, 26), C.dim, '8.5px ' + this.MONO]);
            this.card(ctx, mx, my, lines);
          }
          if (this.cv) this.cv.style.cursor = K.hover >= 0 ? 'pointer' : 'crosshair';
        }
      });
    },
    pt_crucible(type, p) {
      const K = this.M.crucible; if (!K) return;
      if (type === 'down') {
        const hit = (K.fragRects || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (hit) { this.wikiOpen(hit.id); return; }
      }
      if (this.penScrub('crucible', type, p) === 'click' && K.hover >= 0) this.wikiOpen(K.rows[K.hover].a.id);
    },

    // ============================================================
    // WIKI 17 — ECHO  (where the wiki repeats itself)
    // Cosine similarity of TF-IDF prose vectors, every page against every
    // other. Not the link graph — two pages can echo without citing each
    // other at all. The matrix is rasterised once and blitted per frame.
    // ============================================================
    initEcho() {
      const WK = this.WK, TI = this.wkTermIndex();
      const N = TI.N;
      const vecs = TI.tf.map(m => {
        const v = {}; let s = 0;
        for (const [w, c] of Object.entries(m)) {
          const d = TI.df[w];
          if (d < 2 || d > N * 0.5) continue; // drop hapax and boilerplate
          const x = (1 + Math.log(c)) * Math.log(N / d);
          v[w] = x; s += x * x;
        }
        s = Math.sqrt(s) || 1;
        for (const w in v) v[w] /= s;
        return v;
      });
      // page order: grouped by domain so the blocks read as regions
      const ord = WK.pages.map((p, i) => i).sort((a, b) => {
        const pa = WK.pages[a], pb = WK.pages[b];
        return (this.WDOMS.indexOf(pa.domain) - this.WDOMS.indexOf(pb.domain)) || pa.id.localeCompare(pb.id);
      });
      const posOf = new Int32Array(N);
      ord.forEach((pi, k) => { posOf[pi] = k; });
      // sparse similarity above the display floor
      const sims = [];
      const grid = new Float32Array(N * N);
      for (let i = 0; i < N; i++) {
        const a = vecs[i], ak = Object.keys(a);
        for (let j = i + 1; j < N; j++) {
          const b = vecs[j];
          let s = 0;
          for (const w of ak) { const bw = b[w]; if (bw) s += a[w] * bw; }
          if (s > 0.1) {
            sims.push({ i, j, s });
            const pi = posOf[i], pj = posOf[j];
            grid[pi * N + pj] = s; grid[pj * N + pi] = s;
          }
        }
      }
      sims.sort((a, b) => b.s - a.s);
      // domain run boundaries for the axis bands
      const bands = [];
      let run = null;
      ord.forEach((pi, k) => {
        const d = WK.pages[pi].domain;
        if (!run || run.d !== d) { run = { d, a: k, b: k }; bands.push(run); }
        run.b = k;
      });
      this.M.echo = {
        N, vecs, ord, posOf, grid, sims, bands,
        top: sims.slice(0, 40), hover: null, pinned: null, rowHits: [],
        bmp: null, bmpFor: -1
      };
    },
    echoBitmap() {
      const E = this.M.echo, min = this.state.echoMin;
      if (E.bmp && E.bmpFor === min) return E.bmp;
      if (typeof document === 'undefined') return null;
      const N = E.N;
      const cv = E.bmp || document.createElement('canvas');
      cv.width = N; cv.height = N;
      const c2 = cv.getContext('2d');
      const img = c2.createImageData(N, N);
      const d = img.data;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const k = (y * N + x) * 4;
          const s = x === y ? 1 : E.grid[y * N + x];
          if (x === y) { d[k] = 90; d[k + 1] = 100; d[k + 2] = 118; d[k + 3] = 255; continue; }
          if (s < min) { d[k + 3] = 0; continue; }
          // faint → amber, loud → white-hot
          const t = Math.min(1, (s - min) / Math.max(0.001, 1 - min));
          d[k] = 232;
          d[k + 1] = Math.round(163 + t * 80);
          d[k + 2] = Math.round(61 + t * 180);
          d[k + 3] = Math.round(70 + t * 185);
        }
      }
      c2.putImageData(img, 0, 0);
      E.bmp = cv; E.bmpFor = min;
      return cv;
    },
    draw_echo(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.echo) this.initEcho();
      const C = this.COL, E = this.M.echo, st = this.state;
      const panelW = Math.min(330, W * 0.3);
      const gx0 = 108, gy0 = 74;
      const avail = Math.min(W - panelW - gx0 - 40, H - gy0 - 46);
      const side = Math.max(80, avail);
      const gx1 = gx0 + side, gy1 = gy0 + side;
      const mx = this.mouse.x, my = this.mouse.y;

      const bmp = this.echoBitmap();
      if (bmp) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bmp, gx0, gy0, side, side);
        ctx.restore();
      }
      ctx.strokeStyle = C.line; ctx.strokeRect(gx0 + 0.5, gy0 + 0.5, side, side);

      // domain bands along both axes
      const sc = side / E.N;
      for (const b of E.bands) {
        const a0 = gy0 + b.a * sc, a1 = gy0 + (b.b + 1) * sc;
        const col = this.WCOL[b.d] || '#8fa878';
        ctx.fillStyle = hx(col, 0.75);
        ctx.fillRect(gx0 - 8, a0, 5, Math.max(1, a1 - a0));
        ctx.fillRect(gx0 + (b.a * sc), gy0 - 8, Math.max(1, (b.b + 1 - b.a) * sc), 5);
        if (a1 - a0 > 16) {
          ctx.font = '8px ' + this.MONO; ctx.fillStyle = col;
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(b.d.toUpperCase().slice(0, 9), gx0 - 14, (a0 + a1) / 2);
        }
        ctx.strokeStyle = 'rgba(29,36,48,0.85)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx0, a1); ctx.lineTo(gx1, a1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx0 + (b.b + 1) * sc, gy0); ctx.lineTo(gx0 + (b.b + 1) * sc, gy1); ctx.stroke();
      }

      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = '#39ff14';
      ctx.fillText('ECHO', 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      const above = E.sims.filter(s => s.s >= st.echoMin).length;
      ctx.fillText(this.fmt(above) + ' PAGE PAIRS SHARE PROSE AT ≥ ' + st.echoMin + ' · ' + E.N + '×' + E.N + ' COSINE MATRIX · BRIGHTER = MORE ALIKE', 18, 48);

      // hover a cell
      E.hover = null;
      if (mx >= gx0 && mx < gx1 && my >= gy0 && my < gy1) {
        const cx = Math.floor((mx - gx0) / sc), cy = Math.floor((my - gy0) / sc);
        if (cx >= 0 && cx < E.N && cy >= 0 && cy < E.N && cx !== cy) {
          const s = E.grid[cy * E.N + cx];
          if (s >= st.echoMin) {
            const pa = this.WK.pages[E.ord[cy]], pb = this.WK.pages[E.ord[cx]];
            E.hover = { pa, pb, s, ia: E.ord[cy], ib: E.ord[cx] };
          }
        }
        ctx.strokeStyle = 'rgba(232,230,225,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx0, my); ctx.lineTo(gx1, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, gy0); ctx.lineTo(mx, gy1); ctx.stroke();
      }

      // ---- top echoes panel ----
      const px = W - panelW - 14, py = 62, panelH = H - py - 28;
      ctx.fillStyle = 'rgba(11,15,21,0.9)'; ctx.fillRect(px, py, panelW, panelH);
      ctx.strokeStyle = C.line; ctx.strokeRect(px + 0.5, py + 0.5, panelW, panelH);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = '#39ff14';
      ctx.fillText('LOUDEST ECHOES · CLICK TO READ EITHER SIDE', px + 12, py + 18);
      E.rowHits = [];
      let ry = py + 36;
      for (const s of E.top) {
        if (s.s < st.echoMin) continue;
        if (ry > py + panelH - 26) break;
        const pa = this.WK.pages[s.i], pb = this.WK.pages[s.j];
        const hovA = mx >= px && mx <= px + panelW && my >= ry - 10 && my < ry + 4;
        const hovB = mx >= px && mx <= px + panelW && my >= ry + 4 && my < ry + 18;
        if (hovA || hovB) { ctx.fillStyle = 'rgba(57,255,20,0.09)'; ctx.fillRect(px + 1, ry - 11, panelW - 2, 29); }
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = s.s > 0.8 ? '#ffffff' : '#39ff14'; ctx.textAlign = 'right';
        ctx.fillText(s.s.toFixed(2), px + panelW - 12, ry + 3); ctx.textAlign = 'left';
        ctx.font = (hovA ? '600 ' : '') + '9px ' + this.MONO;
        ctx.fillStyle = hovA ? '#e9ffe6' : (this.WCOL[pa.domain] || '#8fa878');
        ctx.fillText(pa.title.slice(0, 30), px + 12, ry);
        ctx.font = (hovB ? '600 ' : '') + '9px ' + this.MONO;
        ctx.fillStyle = hovB ? '#e9ffe6' : (this.WCOL[pb.domain] || '#8fa878');
        ctx.fillText('↔ ' + pb.title.slice(0, 28), px + 12, ry + 14);
        E.rowHits.push({ x: px, y: ry - 11, w: panelW, h: 15, id: pa.id });
        E.rowHits.push({ x: px, y: ry + 4, w: panelW, h: 14, id: pb.id });
        ry += 33;
      }

      if (E.hover) {
        // shared distinctive terms — why these two echo
        const va = E.vecs[E.hover.ia], vb = E.vecs[E.hover.ib];
        const shared = Object.keys(va).filter(w => vb[w]).map(w => [w, va[w] * vb[w]])
          .sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
        this.card(ctx, mx, my, [
          [E.hover.pa.title.slice(0, 36), C.txt, '600 11.5px ' + this.GROT],
          ['↔ ' + E.hover.pb.title.slice(0, 34), C.txt, '600 11.5px ' + this.GROT],
          ['SIMILARITY ' + E.hover.s.toFixed(3) + (E.hover.s > 0.9 ? ' · NEAR-DUPLICATE' : ''), E.hover.s > 0.9 ? '#ffffff' : '#39ff14'],
          [shared.length ? 'SHARED: ' + shared.join(' · ') : 'DIFFUSE OVERLAP', C.dim, '9px ' + this.MONO],
          ['CLICK TO READ THE ROW PAGE', C.faint, '8.5px ' + this.MONO]
        ]);
      }
      if (this.cv) this.cv.style.cursor = (E.hover || E.rowHits.some(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)) ? 'pointer' : 'crosshair';
    },
    pt_echo(type, p) {
      const E = this.M.echo; if (!E) return;
      if (type === 'down') {
        const row = (E.rowHits || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (row) { this.wikiOpen(row.id); return; }
        if (E.hover) this.wikiOpen(E.hover.pa.id);
      }
    }
  };
})();
