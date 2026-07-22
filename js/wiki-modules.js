// LEVIATHAN · WIKI section — reader + visualizer modules
// Mixed into the console Component prototype at mount.
(function () {
  const DCOL = {
    self: '#e8a33d', timeline: '#4fc3e8', people: '#e87da0', mind: '#9b8cf2',
    work: '#7fd486', interests: '#ffd28a', health: '#e85d4f', places: '#a6e6ff', legal: '#8b94a4'
  };
  const DOMS = ['self', 'timeline', 'people', 'mind', 'work', 'interests', 'health', 'places', 'legal'];
  const TCOL = {
    causes: '#e85d4f', 'caused-by': '#e85d4f', evidences: '#4fc3e8', 'evidenced-by': '#4fc3e8',
    instantiates: '#9b8cf2', 'instance-of': '#9b8cf2', precedes: '#e8a33d', follows: '#e8a33d',
    parallels: '#7fd486', mirrors: '#7fd486', contradicts: '#ff2d95', 'co-occurs': '#8b94a4',
    supplies: '#ffd28a', 'supplied-by': '#ffd28a', contextualizes: '#a6e6ff', escalates: '#e87da0',
    resolves: '#7fd486', 'component-of': '#8b94a4', contains: '#8b94a4', related: '#5b6472'
  };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  window.WikiModules = {
    WCOL: DCOL,
    WDOMS: DOMS,
    WTCOL: TCOL,
    WHINTS: {
      reader: 'THE SECOND BRAIN, VERBATIM \u00b7 343 PAGES \u00b7 CLICK ANY [[LINK]] \u00b7 SEARCH LEFT \u00b7 TYPED CONNECTIONS UP TOP',
      web: 'EVERY PAGE IS A NODE \u00b7 GRAB AND FLING \u00b7 CLICK TO PIN A DOSSIER \u00b7 DOUBLE-CLICK OPENS THE PAGE IN THE READER',
      claims: '639 TYPED EDGES, EACH ONE AN ARGUED CLAIM \u00b7 SCROLL THE FEED \u00b7 CLICK A CARD EDGE TO OPEN SOURCE OR TARGET',
      census: 'EVERY DOCUMENTED HUMAN AS A LIFELINE \u00b7 BAR = FIRST TO LAST CONTACT \u00b7 HOVER FOR THE ONE-LINER \u00b7 CLICK TO READ',
      strata: 'WHAT THE WIKI KNOWS, PLOTTED IN TIME \u00b7 EACH BAND IS A PAGE\u2019S DATE RANGE \u00b7 LANES = DOMAINS \u00b7 CLICK TO READ',
      accrete: 'THE WIKI DOCUMENTING ITSELF \u00b7 EVERY BAR A DAY OF OPERATIONS \u00b7 LINE = CUMULATIVE PAGES \u00b7 HOVER A DAY',
      tagmap: 'THEMES AS GRAVITY \u00b7 TAGS THAT SHARE PAGES ATTRACT \u00b7 CLICK A TAG TO LIST ITS PAGES \u00b7 CLICK A PAGE TO READ',
      mass: 'THE CORPUS BY WEIGHT \u00b7 234,736 WORDS TILED BY DOMAIN AND PAGE \u00b7 HOVER FOR COUNTS \u00b7 CLICK TO READ',
      lattice: 'GRAPH FORENSICS \u00b7 EDGE-TYPE SPECTRUM \u00b7 RECIPROCITY \u00b7 THE ORPHAN RING = PAGES NOTHING POINTS TO \u00b7 CLICK TO READ',
      evidence: 'WHERE THE KNOWLEDGE COMES FROM \u00b7 EVERY BAR A RAW SOURCE \u00b7 CLICK TO SEE THE PAGES IT FEEDS \u00b7 CLICK A PAGE TO READ'
    },

    sectionBtnStyle(on, tone) {
      return {
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', letterSpacing: '0.18em',
        padding: '6px 13px', cursor: 'pointer', fontWeight: on ? 700 : 400,
        color: on ? tone : '#5b6472', background: on ? 'rgba(155,140,242,0.06)' : 'transparent',
        border: '1px solid ' + (on ? tone : '#1d2430'), whiteSpace: 'nowrap', transition: 'all 130ms ease'
      };
    },

    // ---------- data ----------
    initWiki(pagesJ, textJ, logJ) {
      if (!pagesJ || !pagesJ.pages) return;
      const pages = pagesJ.pages;
      const byId = {}; pages.forEach(p => { byId[p.id] = p; });
      const inDeg = {}, outDeg = {};
      const typed = []; const seenT = new Set();
      for (const p of pages) for (const c of (p.connections || [])) {
        if (!byId[c.page] || c.page === p.id) continue;
        const k = p.id + '>' + c.page + '>' + c.type;
        if (seenT.has(k)) continue; seenT.add(k);
        typed.push({ a: p.id, b: c.page, type: c.type, claim: c.claim });
      }
      const prose = []; const seenP = new Set();
      for (const p of pages) for (const t of (p.links || [])) {
        if (!byId[t] || t === p.id) continue;
        const k = p.id + '>' + t;
        if (seenP.has(k)) continue; seenP.add(k);
        prose.push({ a: p.id, b: t });
        inDeg[t] = (inDeg[t] || 0) + 1;
        outDeg[p.id] = (outDeg[p.id] || 0) + 1;
      }
      const tags = {};
      for (const p of pages) for (const t of (p.tags || [])) { (tags[t] = tags[t] || []).push(p.id); }
      this.WK = { pages, byId, typed, prose, inDeg, outDeg, tags, log: (logJ && logJ.ops) || [] };
      this.WT = textJ || {};
    },

    wikiOpen(id) {
      if (!this.WK || !this.WK.byId[id]) return;
      this.setState({ section: 'wiki', tab: 'reader', wikiPage: id });
      setTimeout(() => this.renderReaderBody(), 0);
    },

    // ---------- chips ----------
    wikiChips(s, C) {
      const cs = (on, tone) => this.chipStyle(on, tone);
      const WK = this.WK;
      if (s.tab === 'reader') {
        return [
          { label: '\u2302 MASTER INDEX', onClick: () => this.wikiOpen('wiki/self/index'), style: cs(false) },
          { label: '\u2684 RANDOM PAGE', onClick: () => { if (WK) this.wikiOpen(WK.pages[Math.floor(Math.random() * WK.pages.length)].id); }, style: cs(false, '#9b8cf2') }
        ];
      }
      if (s.tab === 'web') {
        return [
          { label: s.webEdges === 'typed' ? 'TYPED EDGES' : 'ALL EDGES', onClick: () => { this.setState(st => ({ webEdges: st.webEdges === 'typed' ? 'all' : 'typed' })); }, style: cs(true, '#9b8cf2') },
          { label: 'ALL', onClick: () => this.setState({ webDom: 'ALL' }), style: cs(s.webDom === 'ALL') },
          ...DOMS.map(d => ({ label: d.toUpperCase(), onClick: () => this.setState({ webDom: d }), style: cs(s.webDom === d, DCOL[d]) }))
        ];
      }
      if (s.tab === 'claims') {
        const types = ['ALL', 'parallels', 'causes', 'evidences', 'instantiates', 'precedes', 'contradicts', 'contextualizes', 'co-occurs'];
        return types.map(t => ({ label: t.toUpperCase(), onClick: () => { this.setState({ claimType: t }); if (this.M.claims) this.M.claims.scroll = 0; }, style: cs(s.claimType === t, TCOL[t] || '#9b8cf2') }));
      }
      if (s.tab === 'census') {
        return [['first', 'BY FIRST CONTACT'], ['span', 'BY LONGEVITY'], ['name', 'A\u2013Z']].map(([id, l]) => ({
          label: l, onClick: () => this.setState({ censusSort: id }), style: cs(s.censusSort === id, '#e87da0')
        }));
      }
      if (s.tab === 'strata') {
        return [{ label: 'ALL', onClick: () => this.setState({ strataDom: 'ALL' }), style: cs(s.strataDom === 'ALL') },
          ...DOMS.map(d => ({ label: d.toUpperCase(), onClick: () => this.setState({ strataDom: d }), style: cs(s.strataDom === d, DCOL[d]) }))];
      }
      if (s.tab === 'tagmap') {
        return [[1, 'ALL LINKS'], [2, '\u2265 2 SHARED'], [3, '\u2265 3 SHARED']].map(([v, l]) => ({
          label: l, onClick: () => { this.setState({ tagMin: v }); this.M.tagmap = null; }, style: cs(s.tagMin === v, '#9b8cf2')
        }));
      }
      if (s.tab === 'mass') {
        return [{ label: 'ALL', onClick: () => this.setState({ massDom: 'ALL' }), style: cs(s.massDom === 'ALL') },
          ...DOMS.map(d => ({ label: d.toUpperCase(), onClick: () => this.setState({ massDom: d }), style: cs(s.massDom === d, DCOL[d]) }))];
      }
      if (s.tab === 'evidence') {
        return [[24, 'TOP 24'], [48, 'TOP 48']].map(([v, l]) => ({
          label: l, onClick: () => this.setState({ evTop: v }), style: cs(s.evTop === v, '#4fc3e8')
        }));
      }
      return [];
    },

    // ---------- reader ----------
    readerNav(s) {
      const WK = this.WK;
      if (!WK) return [];
      const items = [];
      const active = s.wikiPage;
      const q = (s.wikiSearch || '').trim().toLowerCase();
      const itemStyle = (on, col) => ({
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', letterSpacing: '0.04em',
        padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        color: on ? '#07090d' : '#a9a49a', background: on ? (col || '#9b8cf2') : 'transparent',
        borderLeft: '2px solid ' + (on ? (col || '#9b8cf2') : 'transparent')
      });
      const headStyle = (col) => ({
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.24em',
        padding: '14px 8px 4px', color: col, cursor: 'default'
      });
      if (q) {
        const hits = WK.pages.filter(p => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.summary || '').toLowerCase().includes(q)).slice(0, 60);
        items.push({ label: hits.length + ' MATCHES', onClick: () => {}, style: headStyle('#5b6472') });
        for (const p of hits) items.push({ label: p.title, onClick: () => this.wikiOpen(p.id), style: itemStyle(p.id === active, DCOL[p.domain]) });
        return items;
      }
      for (const d of DOMS) {
        const list = WK.pages.filter(p => p.domain === d).sort((a, b) => {
          const ai = a.id.endsWith('/index') ? 0 : 1, bi = b.id.endsWith('/index') ? 0 : 1;
          return ai - bi || a.id.localeCompare(b.id);
        });
        if (!list.length) continue;
        items.push({ label: '\u25c8 ' + d.toUpperCase() + ' \u00b7 ' + list.length, onClick: () => {}, style: headStyle(DCOL[d]) });
        for (const p of list) {
          const depth = p.id.split('/').length - 3;
          items.push({ label: (depth > 0 ? '\u00a0\u00a0'.repeat(depth) + '\u2514 ' : '') + p.title.slice(0, 44), onClick: () => this.wikiOpen(p.id), style: itemStyle(p.id === active, DCOL[p.domain]) });
        }
      }
      return items;
    },

    mdRender(src) {
      // strip frontmatter
      if (src.startsWith('---')) { const e = src.indexOf('\n---', 3); if (e > 0) src = src.slice(e + 4); }
      src = src.replace(/<!--[\s\S]*?-->/g, '');
      const inline = (t) => {
        t = esc(t);
        t = t.replace(/`([^`]+)`/g, "<code style=\"font-family:'IBM Plex Mono',monospace;font-size:12px;background:#10141b;border:1px solid #1d2430;padding:1px 5px;color:#ffd28a;\">$1</code>");
        t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (m, p1, p2) => this._wl(p1, p2));
        t = t.replace(/\[\[([^\]]+)\]\]/g, (m, p1) => this._wl(p1, null));
        t = t.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#4fc3e8;text-decoration:none;border-bottom:1px dotted #4fc3e8;">$1</a>');
        t = t.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e8e6e1;">$1</strong>');
        t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
        return t;
      };
      const P = "margin:0 0 14px;font-size:13.5px;line-height:2.05;color:#c9c5bb;";
      const out = [];
      const lines = src.split('\n');
      let i = 0;
      while (i < lines.length) {
        const l = lines[i];
        if (/^```/.test(l)) {
          const buf = []; i++;
          while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
          i++;
          out.push("<pre style=\"font-family:'IBM Plex Mono',monospace;font-size:11.5px;line-height:1.8;background:#0a0d13;border:1px solid #1d2430;padding:14px 16px;overflow-x:auto;color:#a9b4c4;margin:0 0 16px;\">" + esc(buf.join('\n')) + '</pre>');
          continue;
        }
        if (/^\s*\|/.test(l)) {
          const rows = [];
          while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
          const cells = rows.map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
          const body = cells.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)));
          let t = "<table style=\"border-collapse:collapse;margin:4px 0 18px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;\">";
          body.forEach((r, ri) => {
            t += '<tr>';
            for (const c of r) t += (ri === 0 ? "<th style=\"text-align:left;border:1px solid #1d2430;background:#10141b;color:#9b8cf2;padding:6px 12px;letter-spacing:0.06em;\">" : "<td style=\"border:1px solid #1d2430;color:#b9b4a9;padding:6px 12px;line-height:1.7;\">") + inline(c) + (ri === 0 ? '</th>' : '</td>');
            t += '</tr>';
          });
          out.push(t + '</table>');
          continue;
        }
        if (/^#{1,6}\s/.test(l)) {
          const lv = l.match(/^#+/)[0].length;
          const txt = l.replace(/^#+\s*/, '');
          if (lv === 1) out.push("<h1 style=\"margin:0 0 18px;font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:700;letter-spacing:0.02em;color:#e8e6e1;border-bottom:1px solid #1d2430;padding-bottom:12px;\">" + inline(txt) + '</h1>');
          else if (lv === 2) out.push("<h2 style=\"margin:30px 0 12px;font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;color:#cfc4ff;letter-spacing:0.03em;\">" + inline(txt) + '</h2>');
          else out.push("<h3 style=\"margin:22px 0 10px;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:0.16em;color:#8b94a4;text-transform:uppercase;\">" + inline(txt) + '</h3>');
          i++; continue;
        }
        if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { out.push('<div style="height:1px;background:#1d2430;margin:22px 0;"></div>'); i++; continue; }
        if (/^\s*>/.test(l)) {
          const buf = [];
          while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
          const isContra = /CONTRADICTION/i.test(buf.join(' '));
          out.push('<blockquote style="margin:0 0 16px;padding:10px 18px;border-left:2px solid ' + (isContra ? '#ff2d95' : '#e8a33d') + ';background:rgba(232,163,61,0.04);color:#b9b4a9;font-size:13px;line-height:1.95;">' + buf.map(inline).join('<br>') + '</blockquote>');
          continue;
        }
        if (/^\s*[-*+]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
          const ordered = /^\s*\d+\./.test(l);
          const buf = [];
          while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
            if (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i])) buf.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
            else buf[buf.length - 1] += ' ' + lines[i].trim();
            i++;
          }
          out.push('<' + (ordered ? 'ol' : 'ul') + ' style="margin:0 0 16px;padding-left:22px;">' + buf.map(b => '<li style="font-size:13.5px;line-height:2;color:#c9c5bb;margin-bottom:4px;">' + inline(b) + '</li>').join('') + '</' + (ordered ? 'ol' : 'ul') + '>');
          continue;
        }
        if (l.trim() === '') { i++; continue; }
        const buf = [];
        while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|\s*\||```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i]) && !/^\s*(---+)\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        if (buf.length) out.push('<p style="' + P + '">' + inline(buf.join(' ')) + '</p>');
      }
      return out.join('\n');
    },

    _wl(path, label) {
      let id = path.trim().replace(/\.md$/, '');
      if (!id.startsWith('wiki/')) id = 'wiki/' + id;
      const ok = this.WK && this.WK.byId[id];
      const txt = label || (this.WK && this.WK.byId[id] ? this.WK.byId[id].title : path.split('/').pop());
      if (!ok) return '<span style="color:#5b6472;border-bottom:1px dotted #3d4554;" title="not in wiki">' + txt + '</span>';
      return '<a data-wiki="' + id + '" style="color:#9b8cf2;cursor:pointer;text-decoration:none;border-bottom:1px dotted #9b8cf2;">' + txt + '</a>';
    },

    renderReaderBody() {
      const el = this._readerEl;
      if (!el || !this.WK) return;
      const id = this.state.wikiPage;
      const p = this.WK.byId[id];
      const md = this.WT[id];
      const MONO = "font-family:'IBM Plex Mono',monospace;";
      if (!p || md == null) {
        el.innerHTML = '<div style="' + MONO + 'font-size:11px;letter-spacing:0.2em;color:#5b6472;padding:60px 0;text-align:center;">PAGE NOT FOUND \u00b7 ' + esc(id) + '</div>';
        return;
      }
      const dcol = DCOL[p.domain] || '#8b94a4';
      let html = '';
      // breadcrumb + meta
      html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;' + MONO + 'font-size:9.5px;letter-spacing:0.18em;">';
      html += '<span style="color:' + dcol + ';border:1px solid ' + dcol + ';padding:3px 9px;">' + p.domain.toUpperCase() + '</span>';
      if (p.page_type) html += '<span style="color:#5b6472;">' + esc(p.page_type.toUpperCase()) + '</span>';
      if (p.status) html += '<span style="color:#5b6472;">\u00b7 ' + esc(p.status.toUpperCase()) + '</span>';
      if (p.drs) html += '<span style="color:#8b94a4;">\u00b7 ' + esc(p.drs) + (p.dre ? ' \u2192 ' + esc(p.dre) : '') + '</span>';
      html += '<span style="color:#3d4554;">\u00b7 ' + p.words.toLocaleString() + ' WORDS</span>';
      html += '</div>';
      if (p.tags && p.tags.length) {
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;">' + p.tags.map(t =>
          '<span style="' + MONO + 'font-size:9px;letter-spacing:0.12em;color:#9b8cf2;border:1px solid rgba(155,140,242,0.35);padding:2px 8px;">#' + esc(t) + '</span>').join('') + '</div>';
      }
      // infobox
      if (p.infobox) {
        const rows = Object.entries(p.infobox).filter(([k, v]) => v && typeof v !== 'object' || Array.isArray(v));
        if (rows.length) {
          html += '<div style="float:right;width:290px;margin:0 0 18px 26px;border:1px solid #1d2430;background:#0a0d13;">';
          html += '<div style="' + MONO + 'font-size:9px;letter-spacing:0.22em;color:' + dcol + ';padding:9px 13px;border-bottom:1px solid #161b24;">INFOBOX</div>';
          for (const [k, v] of rows) {
            const vv = Array.isArray(v) ? v.join(', ') : String(v);
            html += '<div style="display:flex;gap:10px;padding:7px 13px;border-bottom:1px solid #10141b;">'
              + '<div style="' + MONO + 'font-size:9px;letter-spacing:0.08em;color:#5b6472;min-width:92px;padding-top:2px;">' + esc(k.replace(/_/g, ' ').toUpperCase()) + '</div>'
              + '<div style="' + MONO + 'font-size:10.5px;line-height:1.7;color:#c9c5bb;">' + esc(vv) + '</div></div>';
          }
          html += '</div>';
        }
      }
      // typed connections
      if (p.connections && p.connections.length) {
        html += '<div style="border:1px solid #1d2430;background:rgba(155,140,242,0.03);padding:14px 16px;margin-bottom:22px;">';
        html += '<div style="' + MONO + 'font-size:9px;letter-spacing:0.22em;color:#9b8cf2;margin-bottom:10px;">TYPED CONNECTIONS \u00b7 ' + p.connections.length + '</div>';
        for (const c of p.connections) {
          const tc = TCOL[c.type] || '#8b94a4';
          const tgt = this.WK.byId[c.page];
          html += '<div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-top:1px solid rgba(29,36,48,0.6);flex-wrap:wrap;">'
            + '<span style="' + MONO + 'font-size:9px;letter-spacing:0.1em;color:#07090d;background:' + tc + ';padding:2px 7px;white-space:nowrap;">' + esc(c.type.toUpperCase()) + '</span>'
            + (tgt ? '<a data-wiki="' + c.page + '" style="' + MONO + 'font-size:11px;color:' + (DCOL[tgt.domain] || '#c9c5bb') + ';cursor:pointer;text-decoration:none;border-bottom:1px dotted;">' + esc(tgt.title) + '</a>' : '<span style="' + MONO + 'font-size:11px;color:#5b6472;">' + esc(c.page) + '</span>')
            + (c.claim ? '<span style="font-size:12px;line-height:1.8;color:#8f8a80;font-style:italic;flex-basis:100%;">' + esc(c.claim) + '</span>' : '')
            + '</div>';
        }
        html += '</div>';
      }
      html += this.mdRender(md);
      // backlinks
      const back = this.WK.prose.filter(e => e.b === id).map(e => e.a);
      const backT = this.WK.typed.filter(e => e.b === id).map(e => e.a);
      const all = [...new Set([...back, ...backT])].filter(b => b !== id);
      if (all.length) {
        html += '<div style="clear:both;margin-top:36px;border-top:1px solid #1d2430;padding-top:14px;">';
        html += '<div style="' + MONO + 'font-size:9px;letter-spacing:0.22em;color:#5b6472;margin-bottom:10px;">WHAT LINKS HERE \u00b7 ' + all.length + '</div>';
        html += '<div style="display:flex;gap:7px;flex-wrap:wrap;">' + all.map(b => {
          const bp = this.WK.byId[b];
          return '<a data-wiki="' + b + '" style="' + MONO + 'font-size:10px;letter-spacing:0.06em;color:' + (DCOL[bp.domain] || '#8b94a4') + ';border:1px solid #1d2430;padding:4px 10px;cursor:pointer;text-decoration:none;">' + esc(bp.title.slice(0, 40)) + '</a>';
        }).join('') + '</div></div>';
      }
      html += '<div style="clear:both;"></div>';
      el.innerHTML = html;
      el.querySelectorAll('[data-wiki]').forEach(a => a.addEventListener('click', (ev) => {
        ev.preventDefault();
        this.wikiOpen(a.getAttribute('data-wiki'));
      }));
      const sc = el.parentElement;
      if (sc) sc.scrollTop = 0;
    },

    // ---------- shared canvas helpers ----------
    wkWrap(ctx, text, maxW) {
      const words = String(text).split(/\s+/);
      const lines = []; let cur = '';
      for (const w of words) {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    },
    wkStandby(ctx, W, H) {
      const C = this.COL;
      ctx.font = '11px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.dim;
      ctx.fillText('WIKI DATA UNAVAILABLE', W / 2, H / 2);
      return true;
    },

    // ============================================================
    // WIKI 02 — WEB (the whole second brain as a force graph)
    // ============================================================
    initWeb(W, H) {
      const WK = this.WK;
      const nodes = WK.pages.map(p => {
        const deg = (WK.inDeg[p.id] || 0) + (WK.outDeg[p.id] || 0);
        return {
          id: p.id, p, x: W / 2 + (Math.random() - 0.5) * W * 0.8, y: H / 2 + (Math.random() - 0.5) * H * 0.8,
          vx: 0, vy: 0, r: 2.5 + Math.sqrt(deg) * 1.35, deg
        };
      });
      const byId = {}; nodes.forEach(n => byId[n.id] = n);
      const eT = WK.typed.map(e => ({ a: byId[e.a], b: byId[e.b], type: e.type })).filter(e => e.a && e.b);
      const eP = WK.prose.map(e => ({ a: byId[e.a], b: byId[e.b] })).filter(e => e.a && e.b);
      this.M.web = { nodes, byId, eT, eP, drag: null, hover: null, pinned: null, warm: 0 };
    },
    webStep(W, H, dt, kMul) {
      const Wb = this.M.web, nodes = Wb.nodes;
      const st = this.state;
      const active = (n) => st.webDom === 'ALL' || n.p.domain === st.webDom;
      // repulsion
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!active(a)) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (!active(b)) continue;
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
          if (d2 > 32000) continue;
          const f = (kMul * 900) / d2;
          const d = Math.sqrt(d2);
          dx /= d; dy /= d;
          a.vx += dx * f; a.vy += dy * f;
          b.vx -= dx * f; b.vy -= dy * f;
        }
      }
      const edges = this.state.webEdges === 'typed' ? Wb.eT : Wb.eT.concat(Wb.eP);
      for (const e of edges) {
        if (!active(e.a) || !active(e.b)) continue;
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const want = 60 + (e.a.r + e.b.r) * 2;
        const f = (d - want) * 0.012 * kMul;
        e.a.vx += (dx / d) * f; e.a.vy += (dy / d) * f;
        e.b.vx -= (dx / d) * f; e.b.vy -= (dy / d) * f;
      }
      for (const n of nodes) {
        if (!active(n)) continue;
        n.vx += (W / 2 - n.x) * 0.0022 * kMul;
        n.vy += (H / 2 - n.y) * 0.0022 * kMul;
        if (Wb.drag === n) { n.vx = 0; n.vy = 0; continue; }
        n.vx *= 0.86; n.vy *= 0.86;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(14, Math.min(W - 14, n.x));
        n.y = Math.max(48, Math.min(H - 20, n.y));
      }
    },
    draw_web(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.web || this._webWH !== W + 'x' + H) {
        this._webWH = W + 'x' + H;
        if (!this.M.web) { this.initWeb(W, H); for (let k = 0; k < 160; k++) this.webStep(W, H, 0.016, 1.6); }
      }
      const C = this.COL, Wb = this.M.web, st = this.state;
      this.webStep(W, H, dt, 1);
      const active = (n) => st.webDom === 'ALL' || n.p.domain === st.webDom;
      const edges = st.webEdges === 'typed' ? Wb.eT : Wb.eT.concat(Wb.eP);
      const focus = Wb.pinned || Wb.hover;
      ctx.lineWidth = 1;
      for (const e of edges) {
        if (!active(e.a) || !active(e.b)) continue;
        const hot = focus && (e.a === focus || e.b === focus);
        if (e.type) ctx.strokeStyle = hot ? (TCOL[e.type] || '#9b8cf2') : 'rgba(155,140,242,' + (hot ? 0.9 : 0.16) + ')';
        else ctx.strokeStyle = hot ? 'rgba(139,148,164,0.55)' : 'rgba(139,148,164,0.06)';
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      }
      // nodes + hover
      let hover = null;
      const mx = this.mouse.x, my = this.mouse.y;
      for (const n of Wb.nodes) {
        if (!active(n)) continue;
        const col = DCOL[n.p.domain] || '#8b94a4';
        const isF = n === focus;
        const near = focus && !isF && (edges.some(e => (e.a === focus && e.b === n) || (e.b === focus && e.a === n)));
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (isF ? 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = isF ? '#ffffff' : (focus && !near ? col + '55' : col);
        ctx.fill();
        if (n.deg > 14 || isF) {
          ctx.font = (isF ? '10px ' : '8.5px ') + this.MONO;
          ctx.fillStyle = isF ? '#e8e6e1' : 'rgba(139,148,164,0.75)';
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(n.p.title.slice(0, 26), n.x, n.y - n.r - 3);
        }
        if (mx >= 0 && !hover) {
          const dx = mx - n.x, dy = my - n.y;
          if (dx * dx + dy * dy < (n.r + 5) * (n.r + 5)) hover = n;
        }
      }
      Wb.hover = hover;
      if (hover && hover !== Wb.pinned) {
        this.card(ctx, hover.x, hover.y, [
          [hover.p.title, '#e8e6e1', '600 11px ' + this.MONO],
          [hover.p.domain.toUpperCase() + ' \u00b7 ' + hover.p.words.toLocaleString() + ' WORDS \u00b7 ' + hover.deg + ' EDGES', DCOL[hover.p.domain]],
          ['CLICK TO PIN \u00b7 DOUBLE-CLICK TO READ', C.dim, '9px ' + this.MONO]
        ]);
      }
      if (Wb.pinned) {
        const p = Wb.pinned.p;
        const x = 18, y = 58, w = 300;
        ctx.font = '10px ' + this.MONO;
        const sum = this.wkWrap(ctx, p.summary || '(no summary)', w - 28).slice(0, 6);
        const h = 92 + sum.length * 15;
        ctx.fillStyle = 'rgba(13,17,24,0.95)';
        ctx.strokeStyle = DCOL[p.domain];
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = '#e8e6e1';
        ctx.fillText(p.title.slice(0, 34), x + 14, y + 24);
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = DCOL[p.domain];
        ctx.fillText(p.domain.toUpperCase() + ' \u00b7 ' + (p.page_type || '').toUpperCase() + ' \u00b7 ' + p.words.toLocaleString() + ' WORDS', x + 14, y + 41);
        ctx.font = '10px ' + this.MONO; ctx.fillStyle = '#b9b4a9';
        sum.forEach((s, i) => ctx.fillText(s, x + 14, y + 62 + i * 15));
        ctx.fillStyle = '#9b8cf2'; ctx.font = '600 10px ' + this.MONO;
        ctx.fillText('\u25b8 OPEN IN READER', x + 14, y + h - 12);
        Wb.openBtn = { x: x + 14, y: y + h - 24, w: 140, h: 18 };
      } else Wb.openBtn = null;
      // legend
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      let lx = 16;
      for (const d of DOMS) {
        ctx.fillStyle = DCOL[d];
        ctx.fillRect(lx, H - 22, 7, 7);
        ctx.font = '8.5px ' + this.MONO;
        ctx.fillText(d.toUpperCase(), lx + 11, H - 18);
        lx += 20 + ctx.measureText(d.toUpperCase()).width;
      }
    },
    pt_web(type, p, e) {
      const Wb = this.M.web; if (!Wb) return;
      if (type === 'down') {
        if (Wb.openBtn && Wb.pinned && p.x >= Wb.openBtn.x - 4 && p.x <= Wb.openBtn.x + Wb.openBtn.w && p.y >= Wb.openBtn.y && p.y <= Wb.openBtn.y + Wb.openBtn.h) {
          this.wikiOpen(Wb.pinned.id); return;
        }
        if (Wb.hover) { Wb.drag = Wb.hover; Wb.pinned = Wb.hover; }
        else Wb.pinned = null;
      } else if (type === 'move' && Wb.drag) {
        Wb.drag.x = p.x; Wb.drag.y = p.y;
        Wb.drag.vx = (p.dx || 0) * 6; Wb.drag.vy = (p.dy || 0) * 6;
      } else if (type === 'up' || type === 'leave') Wb.drag = null;
      else if (type === 'dbl' && Wb.hover) this.wikiOpen(Wb.hover.id);
    },

    // ============================================================
    // WIKI 03 — CLAIMS (the typed edges as an argued feed)
    // ============================================================
    draw_claims(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.claims) this.M.claims = { scroll: 0, rows: [], hover: -1 };
      const C = this.COL, Cl = this.M.claims, WK = this.WK, st = this.state;
      const counts = {};
      for (const e of WK.typed) counts[e.type] = (counts[e.type] || 0) + 1;
      const types = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      // left rail — type spectrum
      const railW = 236;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('EDGE TYPES \u00b7 ' + WK.typed.length + ' CLAIMS', 18, 30);
      const maxC = types[0] ? types[0][1] : 1;
      Cl.typeHits = [];
      types.forEach(([t, n], i) => {
        const y = 52 + i * 26;
        if (y > H - 30) return;
        const on = st.claimType === 'ALL' || st.claimType === t;
        const col = TCOL[t] || '#8b94a4';
        ctx.fillStyle = on ? col : 'rgba(91,100,114,0.4)';
        ctx.fillRect(18, y - 4, Math.max(3, (n / maxC) * 120), 8);
        ctx.font = '9px ' + this.MONO;
        ctx.fillStyle = on ? '#c9c5bb' : '#5b6472';
        ctx.fillText(t.toUpperCase() + ' \u00b7 ' + n, 18, y + 13);
        Cl.typeHits.push({ y0: y - 8, y1: y + 20, t });
      });
      // feed
      const list = st.claimType === 'ALL' ? WK.typed : WK.typed.filter(e => e.type === st.claimType);
      const fx = railW + 20, fw = W - fx - 26;
      ctx.strokeStyle = C.line;
      ctx.beginPath(); ctx.moveTo(railW, 16); ctx.lineTo(railW, H - 16); ctx.stroke();
      // measure + draw cards
      let y = 24 - Cl.scroll;
      Cl.rows = [];
      const mx = this.mouse.x, my = this.mouse.y;
      Cl.hoverRow = null;
      ctx.font = '11px ' + this.GROT;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (y > H + 40) break;
        const a = WK.byId[e.a], b = WK.byId[e.b];
        ctx.font = '11.5px ' + this.GROT;
        const claimLines = e.claim ? this.wkWrap(ctx, e.claim, fw - 32) : [];
        const ch = 46 + claimLines.length * 17 + 12;
        if (y + ch > 0) {
          const hov = mx > fx && mx < fx + fw && my > y && my < y + ch;
          if (hov) Cl.hoverRow = { e, x0: fx, x1: fx + fw, y0: y, y1: y + ch };
          const col = TCOL[e.type] || '#8b94a4';
          ctx.fillStyle = hov ? 'rgba(16,20,27,0.9)' : 'rgba(13,17,24,0.55)';
          ctx.strokeStyle = hov ? col : C.line;
          ctx.beginPath(); ctx.rect(fx, y, fw, ch); ctx.fill(); ctx.stroke();
          ctx.textBaseline = 'middle';
          ctx.font = '600 10px ' + this.MONO;
          ctx.fillStyle = DCOL[a.domain] || '#c9c5bb'; ctx.textAlign = 'left';
          ctx.fillText(a.title.slice(0, 30), fx + 16, y + 20);
          const aw = ctx.measureText(a.title.slice(0, 30)).width;
          ctx.fillStyle = '#07090d';
          const tw = ctx.measureText(e.type.toUpperCase()).width + 12;
          ctx.fillStyle = col;
          ctx.fillRect(fx + 16 + aw + 12, y + 12, tw, 15);
          ctx.fillStyle = '#07090d';
          ctx.fillText(e.type.toUpperCase(), fx + 16 + aw + 18, y + 20);
          ctx.fillStyle = DCOL[b.domain] || '#c9c5bb';
          ctx.fillText(b.title.slice(0, 30), fx + 16 + aw + tw + 24, y + 20);
          ctx.font = '11.5px ' + this.GROT;
          ctx.fillStyle = hov ? '#d9d5cb' : '#a9a49a';
          claimLines.forEach((l, li) => ctx.fillText(l, fx + 16, y + 44 + li * 17));
          if (hov) {
            ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.dim;
            ctx.textAlign = 'right';
            ctx.fillText('CLICK LEFT HALF \u2192 SOURCE \u00b7 RIGHT HALF \u2192 TARGET', fx + fw - 12, y + ch - 11);
            ctx.textAlign = 'left';
          }
        }
        y += ch + 10;
      }
      Cl.contentH = y + Cl.scroll;
      // scrollbar
      if (Cl.contentH > H) {
        const sh = Math.max(30, H * (H / Cl.contentH));
        const sy = (Cl.scroll / (Cl.contentH - H)) * (H - sh - 20) + 10;
        ctx.fillStyle = 'rgba(155,140,242,0.35)';
        ctx.fillRect(W - 8, sy, 3, sh);
      }
    },
    pt_claims(type, p, e) {
      const Cl = this.M.claims; if (!Cl) return;
      if (type === 'wheel') {
        Cl.scroll = Math.max(0, Math.min((Cl.contentH || 0) - this.H + 60, Cl.scroll + e.deltaY));
      } else if (type === 'down') {
        const th = (Cl.typeHits || []).find(t => p.x < 200 && p.y >= t.y0 && p.y <= t.y1);
        if (th) { this.setState({ claimType: this.state.claimType === th.t ? 'ALL' : th.t }); Cl.scroll = 0; return; }
        if (Cl.hoverRow) {
          const r = Cl.hoverRow;
          this.wikiOpen(p.x < (r.x0 + r.x1) / 2 ? r.e.a : r.e.b);
        }
      }
    },

    // ============================================================
    // WIKI 04 — CENSUS (every documented human as a lifeline)
    // ============================================================
    initCensus() {
      const WK = this.WK;
      const people = WK.pages.filter(p => p.domain === 'people' && !p.id.includes('/contacts/') && !p.id.endsWith('/index'));
      const rows = [];
      for (const p of people) {
        let a = p.drs || (p.infobox && (p.infobox.first_contact || p.infobox.date_range_start)) || '';
        let b = p.dre || (p.infobox && p.infobox.last_contact) || '';
        if (!a && p.created) continue;
        if (!a) continue;
        if (!/^\d{4}/.test(a)) continue;
        if (!b || !/^\d{4}/.test(b)) b = a;
        const pad = (d) => (d + '-01-01').slice(0, 10);
        rows.push({ p, a: this.d2i(pad(a)), b: Math.max(this.d2i(pad(a)), this.d2i(pad(b))), known: (p.infobox && (p.infobox.known_for || p.infobox.relationship_to_dan)) || p.summary || '' });
      }
      this.M.census = { rows, hover: null };
    },
    draw_census(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.census) this.initCensus();
      const C = this.COL, Ce = this.M.census, st = this.state;
      let rows = Ce.rows.slice();
      if (st.censusSort === 'first') rows.sort((x, y) => x.a - y.a);
      else if (st.censusSort === 'span') rows.sort((x, y) => (y.b - y.a) - (x.b - x.a));
      else rows.sort((x, y) => x.p.title.localeCompare(y.p.title));
      const t0 = Math.min(...rows.map(r => r.a)), t1 = this.d2i('2026-07-21');
      const gx0 = 190, gx1 = W - 30, gy0 = 34, gy1 = H - 34;
      const xOf = (i) => gx0 + ((i - t0) / (t1 - t0)) * (gx1 - gx0);
      // year grid
      const y0y = this.i2d(t0).getUTCFullYear(), y1y = 2026;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let y = y0y; y <= y1y; y++) {
        const x = xOf(this.d2i(y + '-01-01'));
        if (x < gx0 - 5) continue;
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy1); ctx.stroke();
        if ((y1y - y0y > 20 ? y % 2 === 0 : true)) {
          ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.faint;
          ctx.fillText(String(y), x, gy1 + 6);
        }
      }
      const rh = Math.min(16, (gy1 - gy0) / rows.length);
      const mx = this.mouse.x, my = this.mouse.y;
      Ce.hover = null;
      rows.forEach((r, i) => {
        const y = gy0 + i * rh;
        const x0 = xOf(r.a), x1 = Math.max(xOf(r.b), x0 + 2);
        const hov = my >= y && my < y + rh && mx >= gx0 - 175 && mx <= gx1;
        if (hov) Ce.hover = { ...r, y };
        const span = r.b - r.a;
        const col = span > 2000 ? '#e87da0' : span > 400 ? '#e8a33d' : '#8b94a4';
        ctx.fillStyle = hov ? '#ffffff' : col + (hov ? '' : 'cc');
        ctx.fillRect(x0, y + rh * 0.22, x1 - x0, Math.max(2, rh * 0.5));
        if (rh >= 9 || hov) {
          ctx.font = (hov ? '600 ' : '') + Math.min(10, rh - 2.5) + 'px ' + this.MONO;
          ctx.fillStyle = hov ? '#e8e6e1' : '#6b7484';
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(r.p.title.slice(0, 24), gx0 - 10, y + rh / 2);
        }
      });
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(rows.length + ' DOCUMENTED PEOPLE \u00b7 BAR = FIRST \u2192 LAST DOCUMENTED CONTACT', 18, 18);
      if (Ce.hover) {
        const r = Ce.hover;
        ctx.font = '10px ' + this.MONO;
        const lines = [
          [r.p.title, '#e8e6e1', '600 11px ' + this.MONO],
          [this.fmtDate(r.a, true) + ' \u2192 ' + this.fmtDate(r.b, true) + ' \u00b7 ' + Math.round((r.b - r.a) / 365 * 10) / 10 + ' YRS', '#e87da0'],
          ...this.wkWrap(ctx, r.known.slice(0, 200), 330).slice(0, 4).map(l => [l, '#b9b4a9']),
          ['CLICK TO OPEN THE PAGE', C.dim, '8.5px ' + this.MONO]
        ];
        this.card(ctx, Math.min(mx, W - 380), my, lines);
      }
    },
    pt_census(type, p) {
      const Ce = this.M.census; if (!Ce) return;
      if (type === 'down' && Ce.hover) this.wikiOpen(Ce.hover.p.id);
    },

    // ============================================================
    // WIKI 05 — STRATA (what the wiki knows, plotted in time)
    // ============================================================
    initStrata() {
      const WK = this.WK;
      const items = [];
      for (const p of WK.pages) {
        if (!p.drs || !/^\d{4}/.test(p.drs)) continue;
        const pad = (d) => (d + '-01-01').slice(0, 10);
        let b = (p.dre && /^\d{4}/.test(p.dre)) ? p.dre : p.drs;
        items.push({ p, a: this.d2i(pad(p.drs)), b: Math.max(this.d2i(pad(p.drs)), this.d2i(pad(b))) });
      }
      this.M.strata = { items, hover: null };
    },
    draw_strata(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.strata) this.initStrata();
      const C = this.COL, St = this.M.strata, st = this.state;
      const items = st.strataDom === 'ALL' ? St.items : St.items.filter(i => i.p.domain === st.strataDom);
      const doms = st.strataDom === 'ALL' ? DOMS.filter(d => St.items.some(i => i.p.domain === d)) : [st.strataDom];
      const t0 = Math.min(...items.map(i => i.a), this.d2i('2004-01-01'));
      const t1 = this.d2i('2026-07-21');
      const gx0 = 120, gx1 = W - 26, gy0 = 30, gy1 = H - 30;
      const xOf = (i) => gx0 + ((i - t0) / (t1 - t0)) * (gx1 - gx0);
      // year grid
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let y = this.i2d(t0).getUTCFullYear(); y <= 2026; y++) {
        const x = xOf(this.d2i(y + '-01-01'));
        if (x < gx0) continue;
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy1); ctx.stroke();
        if (y % 2 === 0) { ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.faint; ctx.fillText(String(y), x, gy1 + 6); }
      }
      const laneH = (gy1 - gy0) / doms.length;
      const mx = this.mouse.x, my = this.mouse.y;
      St.hover = null;
      doms.forEach((d, di) => {
        const ly = gy0 + di * laneH;
        ctx.strokeStyle = 'rgba(29,36,48,0.6)';
        ctx.beginPath(); ctx.moveTo(gx0, ly); ctx.lineTo(gx1, ly); ctx.stroke();
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = DCOL[d];
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const dItems = items.filter(i => i.p.domain === d).sort((a, b) => a.a - b.a);
        ctx.fillText(d.toUpperCase(), 16, ly + laneH / 2 - 6);
        ctx.fillStyle = C.faint;
        ctx.fillText(dItems.length + ' PG', 16, ly + laneH / 2 + 8);
        // stack rows within lane
        const lanesEnd = [];
        for (const it of dItems) {
          let row = lanesEnd.findIndex(e => e < it.a);
          if (row < 0) { row = lanesEnd.length; lanesEnd.push(0); }
          lanesEnd[row] = it.b + 90;
          it._row = row;
        }
        const maxRows = Math.max(1, lanesEnd.length);
        const bh = Math.min(10, (laneH - 10) / maxRows);
        for (const it of dItems) {
          const x0 = xOf(it.a), x1 = Math.max(xOf(it.b), x0 + 3);
          const y = ly + 6 + it._row * bh;
          const hov = mx >= x0 - 2 && mx <= x1 + 2 && my >= y - 1 && my <= y + bh;
          if (hov) St.hover = it;
          ctx.fillStyle = hov ? '#ffffff' : DCOL[d] + 'bb';
          ctx.fillRect(x0, y, x1 - x0, Math.max(2, bh - 2));
        }
      });
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(items.length + ' DATED PAGES \u00b7 EACH BAND = ONE PAGE\u2019S DOCUMENTED DATE RANGE', 16, 16);
      if (St.hover) {
        const it = St.hover;
        ctx.font = '10px ' + this.MONO;
        this.card(ctx, mx, my, [
          [it.p.title, '#e8e6e1', '600 11px ' + this.MONO],
          [this.fmtDate(it.a, true) + ' \u2192 ' + this.fmtDate(it.b, true), DCOL[it.p.domain]],
          ...this.wkWrap(ctx, (it.p.summary || '').slice(0, 170), 320).slice(0, 3).map(l => [l, '#b9b4a9']),
          ['CLICK TO OPEN', C.dim, '8.5px ' + this.MONO]
        ]);
      }
    },
    pt_strata(type) {
      const St = this.M.strata; if (!St) return;
      if (type === 'down' && St.hover) this.wikiOpen(St.hover.p.id);
    },

    // ============================================================
    // WIKI 06 — ACCRETION (the wiki documenting itself)
    // ============================================================
    initAccrete() {
      const WK = this.WK;
      const KCOL = { ingest: '#e8a33d', connect: '#9b8cf2', rename: '#4fc3e8', build: '#7fd486', edit: '#e87da0', add: '#e87da0', triage: '#8b94a4', lint: '#8b94a4', rewrite: '#e85d4f', fix: '#e85d4f' };
      const byDay = {};
      for (const o of WK.log) {
        const k = KCOL[o.k] ? o.k : 'other';
        (byDay[o.d] = byDay[o.d] || {})[k] = ((byDay[o.d] || {})[k] || 0) + 1;
      }
      const days = Object.keys(byDay).sort();
      if (!days.length) { this.M.accrete = { empty: true }; return; }
      const d0 = this.d2i(days[0]) - 1, d1 = this.d2i(days[days.length - 1]) + 1;
      // cumulative pages + words by created date
      const createdByDay = {};
      for (const p of WK.pages) {
        if (!p.created) continue;
        createdByDay[p.created] = createdByDay[p.created] || { n: 0, w: 0 };
        createdByDay[p.created].n++;
        createdByDay[p.created].w += p.words;
      }
      const series = [];
      let cumN = 0, cumW = 0;
      for (let i = d0; i <= d1; i++) {
        const ds = this.i2d(i).toISOString().slice(0, 10);
        const c = createdByDay[ds];
        if (c) { cumN += c.n; cumW += c.w; }
        series.push({ i, ds, ops: byDay[ds] || null, cumN, cumW });
      }
      this.M.accrete = { d0, d1, series, KCOL, maxOps: Math.max(...series.map(s => s.ops ? Object.values(s.ops).reduce((a, b) => a + b, 0) : 0)), totN: cumN, totW: cumW, hover: null };
    },
    draw_accrete(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.accrete) this.initAccrete();
      const C = this.COL, A = this.M.accrete;
      if (A.empty) return this.drawStandby(ctx, W, H, 'NO LOG DATA');
      const gx0 = 60, gx1 = W - 60, gy0 = 60, gy1 = H - 70;
      const n = A.series.length;
      const bw = (gx1 - gx0) / n;
      const mx = this.mouse.x, my = this.mouse.y;
      A.hover = null;
      // cumulative pages area
      ctx.beginPath();
      A.series.forEach((s, i) => {
        const x = gx0 + i * bw + bw / 2;
        const y = gy1 - (s.cumN / A.totN) * (gy1 - gy0) * 0.92;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(155,140,242,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineTo(gx0 + (n - 0.5) * bw, gy1); ctx.lineTo(gx0 + bw / 2, gy1); ctx.closePath();
      ctx.fillStyle = 'rgba(155,140,242,0.07)'; ctx.fill();
      // op bars
      A.series.forEach((s, i) => {
        const x = gx0 + i * bw;
        if (mx >= x && mx < x + bw && my > gy0 - 20 && my < gy1 + 20) A.hover = s;
        if (!s.ops) return;
        let y = gy1;
        for (const [k, cnt] of Object.entries(s.ops)) {
          const h = (cnt / A.maxOps) * (gy1 - gy0) * 0.85;
          ctx.fillStyle = (A.KCOL[k] || '#5b6472') + (A.hover === s ? '' : 'cc');
          ctx.fillRect(x + 1, y - h, Math.max(2, bw - 2), h);
          y -= h;
        }
      });
      // axis dates
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.faint;
      for (let i = 0; i < n; i += Math.ceil(n / 12)) {
        const s = A.series[i];
        ctx.fillText(s.ds.slice(5), gx0 + i * bw + bw / 2, gy1 + 8);
      }
      // headline
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(this.WK.log.length + ' LOGGED OPERATIONS \u00b7 ' + A.totN + ' PAGES \u00b7 ' + A.totW.toLocaleString() + ' WORDS ACCRETED \u00b7 ' + A.series[0].ds + ' \u2192 ' + A.series[n - 1].ds, 18, 20);
      // legend
      let lx = 18;
      ctx.textBaseline = 'middle';
      for (const [k, col] of Object.entries(A.KCOL)) {
        ctx.fillStyle = col; ctx.fillRect(lx, H - 26, 7, 7);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = '#6b7484';
        ctx.fillText(k.toUpperCase(), lx + 11, H - 22);
        lx += 24 + ctx.measureText(k.toUpperCase()).width;
      }
      ctx.fillStyle = 'rgba(155,140,242,0.9)'; ctx.fillRect(lx, H - 25, 14, 2);
      ctx.fillStyle = '#6b7484'; ctx.fillText('CUMULATIVE PAGES', lx + 20, H - 22);
      if (A.hover) {
        const s = A.hover;
        const lines = [[s.ds, '#e8e6e1', '600 11px ' + this.MONO]];
        if (s.ops) for (const [k, cnt] of Object.entries(s.ops)) lines.push([cnt + ' \u00d7 ' + k.toUpperCase(), A.KCOL[k] || '#8b94a4']);
        lines.push([s.cumN + ' PAGES \u00b7 ' + s.cumW.toLocaleString() + ' WORDS TO DATE', '#9b8cf2']);
        this.card(ctx, mx, my, lines);
      }
    },
    pt_accrete() {},

    // ============================================================
    // WIKI 07 — TAGS (themes as gravity)
    // ============================================================
    initTagmap(W, H) {
      const WK = this.WK, st = this.state;
      const entries = Object.entries(WK.tags).filter(([t, ids]) => ids.length >= 2);
      const nodes = entries.map(([t, ids]) => ({
        t, ids, n: ids.length,
        x: W / 2 + (Math.random() - 0.5) * W * 0.6, y: H / 2 + (Math.random() - 0.5) * H * 0.6,
        vx: 0, vy: 0, r: 8 + Math.sqrt(ids.length) * 4
      }));
      const edges = [];
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const shared = nodes[i].ids.filter(id => nodes[j].ids.includes(id)).length;
        if (shared >= st.tagMin) edges.push({ a: nodes[i], b: nodes[j], w: shared });
      }
      this.M.tagmap = { nodes, edges, drag: null, hover: null, pinned: null, pageHits: [] };
    },
    draw_tagmap(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.tagmap || this._tagWH !== W + 'x' + H + this.state.tagMin) {
        this._tagWH = W + 'x' + H + this.state.tagMin;
        this.initTagmap(W, H);
        for (let k = 0; k < 140; k++) this.tagStep(W, H);
      }
      const C = this.COL, T = this.M.tagmap;
      this.tagStep(W, H);
      // edges
      for (const e of T.edges) {
        const hot = T.pinned && (e.a === T.pinned || e.b === T.pinned);
        ctx.strokeStyle = hot ? 'rgba(155,140,242,0.8)' : 'rgba(155,140,242,' + Math.min(0.4, 0.05 + e.w * 0.04) + ')';
        ctx.lineWidth = Math.min(4, 0.5 + e.w * 0.5);
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      }
      ctx.lineWidth = 1;
      const mx = this.mouse.x, my = this.mouse.y;
      let hover = null;
      for (const n of T.nodes) {
        const isP = n === T.pinned;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = isP ? '#cfc4ff' : 'rgba(155,140,242,' + (0.14 + Math.min(0.5, n.n * 0.02)) + ')';
        ctx.fill();
        ctx.strokeStyle = isP ? '#ffffff' : 'rgba(155,140,242,0.6)';
        ctx.stroke();
        ctx.font = (isP ? '600 ' : '') + Math.min(13, 8 + n.n * 0.2) + 'px ' + this.MONO;
        ctx.fillStyle = isP ? '#07090d' : '#c9c5bb';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('#' + n.t, n.x, n.y);
        if (mx >= 0 && !hover) { const dx = mx - n.x, dy = my - n.y; if (dx * dx + dy * dy < n.r * n.r) hover = n; }
      }
      T.hover = hover;
      if (hover && hover !== T.pinned) {
        this.card(ctx, hover.x, hover.y, [
          ['#' + hover.t, '#cfc4ff', '600 11px ' + this.MONO],
          [hover.n + ' PAGES \u00b7 CLICK TO LIST THEM', C.dim]
        ]);
      }
      // pinned panel
      T.pageHits = [];
      if (T.pinned) {
        const ids = T.pinned.ids.slice(0, 16);
        const x = W - 320, y = 56, w = 300, rowH = 20;
        const h = 44 + ids.length * rowH;
        ctx.fillStyle = 'rgba(13,17,24,0.95)'; ctx.strokeStyle = '#9b8cf2';
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = '600 11px ' + this.MONO; ctx.fillStyle = '#cfc4ff';
        ctx.fillText('#' + T.pinned.t + ' \u00b7 ' + T.pinned.n + ' PAGES', x + 14, y + 20);
        ids.forEach((id, i) => {
          const pp = this.WK.byId[id];
          const ry = y + 40 + i * rowH;
          const hov = mx >= x && mx <= x + w && my >= ry - rowH / 2 && my < ry + rowH / 2;
          if (hov) { ctx.fillStyle = 'rgba(155,140,242,0.12)'; ctx.fillRect(x + 1, ry - rowH / 2, w - 2, rowH); }
          ctx.font = '9.5px ' + this.MONO;
          ctx.fillStyle = DCOL[pp.domain] || '#8b94a4';
          ctx.fillText('\u25b8', x + 14, ry);
          ctx.fillStyle = hov ? '#e8e6e1' : '#a9a49a';
          ctx.fillText(pp.title.slice(0, 34), x + 28, ry);
          T.pageHits.push({ x, y: ry - rowH / 2, w, h: rowH, id });
        });
      }
    },
    tagStep(W, H) {
      const T = this.M.tagmap;
      for (let i = 0; i < T.nodes.length; i++) {
        const a = T.nodes[i];
        for (let j = i + 1; j < T.nodes.length; j++) {
          const b = T.nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 1;
          const min = (a.r + b.r) * 1.4;
          const f = d2 < min * min ? 3.5 : 2600 / d2;
          const d = Math.sqrt(d2); dx /= d; dy /= d;
          a.vx += dx * f * 0.3; a.vy += dy * f * 0.3;
          b.vx -= dx * f * 0.3; b.vy -= dy * f * 0.3;
        }
      }
      for (const e of T.edges) {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const want = 130 - Math.min(60, e.w * 12);
        const f = (d - want) * 0.008;
        e.a.vx += (dx / d) * f; e.a.vy += (dy / d) * f;
        e.b.vx -= (dx / d) * f; e.b.vy -= (dy / d) * f;
      }
      for (const n of T.nodes) {
        n.vx += (W / 2 - n.x) * 0.003; n.vy += (H / 2 - n.y) * 0.003;
        if (T.drag === n) { n.vx = 0; n.vy = 0; continue; }
        n.vx *= 0.84; n.vy *= 0.84;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.r, Math.min(W - n.r, n.x));
        n.y = Math.max(44 + n.r, Math.min(H - n.r, n.y));
      }
    },
    pt_tagmap(type, p) {
      const T = this.M.tagmap; if (!T) return;
      if (type === 'down') {
        const hit = (T.pageHits || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (hit) { this.wikiOpen(hit.id); return; }
        if (T.hover) { T.drag = T.hover; T.pinned = T.hover; }
        else T.pinned = null;
      } else if (type === 'move' && T.drag) { T.drag.x = p.x; T.drag.y = p.y; }
      else if (type === 'up' || type === 'leave') T.drag = null;
    },

    // ============================================================
    // WIKI 08 — MASS (the corpus by weight, treemap)
    // ============================================================
    buildMass(W, H) {
      const WK = this.WK, st = this.state;
      const gy0 = 44, pad = 2;
      const area = { x: 14, y: gy0, w: W - 28, h: H - gy0 - 40 };
      const rects = [];
      const doms = (st.massDom === 'ALL' ? DOMS : [st.massDom])
        .map(d => ({ d, pages: WK.pages.filter(p => p.domain === d && p.words > 0).sort((a, b) => b.words - a.words) }))
        .filter(g => g.pages.length)
        .map(g => ({ ...g, w: g.pages.reduce((a, p) => a + p.words, 0) }))
        .sort((a, b) => b.w - a.w);
      const totW = doms.reduce((a, g) => a + g.w, 0);
      // slice domains vertically into columns (strips)
      let x = area.x;
      for (const g of doms) {
        const gw = (g.w / totW) * area.w;
        // within domain: strip rows top→bottom
        let y = area.y;
        let idx = 0;
        while (idx < g.pages.length) {
          // take a strip: enough pages to make row height reasonable
          let take = [], sum = 0;
          const remainingH = area.y + area.h - y;
          const remainingW = g.pages.slice(idx).reduce((a, p) => a + p.words, 0);
          while (idx + take.length < g.pages.length) {
            const p = g.pages[idx + take.length];
            take.push(p); sum += p.words;
            const rowH = (sum / remainingW) * remainingH;
            if (rowH > 34 || take.length > 7) break;
          }
          const rowH = Math.min(remainingH, (sum / remainingW) * remainingH);
          let xx = x;
          for (const p of take) {
            const pw = (p.words / sum) * gw;
            rects.push({ x: xx + pad / 2, y: y + pad / 2, w: Math.max(1, pw - pad), h: Math.max(1, rowH - pad), p, d: g.d });
            xx += pw;
          }
          y += rowH;
          idx += take.length;
          if (y >= area.y + area.h - 2) break;
        }
        x += gw;
      }
      this.M.mass = { rects, doms, totW, hover: null, key: W + 'x' + H + st.massDom };
    },
    draw_mass(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.mass || this.M.mass.key !== W + 'x' + H + this.state.massDom) this.buildMass(W, H);
      const C = this.COL, Ms = this.M.mass;
      const mx = this.mouse.x, my = this.mouse.y;
      Ms.hover = null;
      for (const r of Ms.rects) {
        const hov = mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
        if (hov) Ms.hover = r;
        const col = DCOL[r.d];
        ctx.fillStyle = col + (hov ? 'ee' : (r.p.id.endsWith('/index') ? '30' : '66'));
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = 'rgba(7,9,13,0.9)';
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (r.w > 70 && r.h > 16) {
          ctx.font = '8.5px ' + this.MONO;
          ctx.fillStyle = hov ? '#07090d' : 'rgba(232,230,225,0.8)';
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(r.p.title.slice(0, Math.floor(r.w / 6)), r.x + 5, r.y + 4);
        }
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(Ms.totW.toLocaleString() + ' WORDS \u00b7 AREA \u221d PAGE LENGTH', 16, 24);
      // domain labels bottom
      let lx = 16;
      for (const g of Ms.doms) {
        ctx.fillStyle = DCOL[g.d]; ctx.fillRect(lx, H - 26, 7, 7);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = '#6b7484';
        const lbl = g.d.toUpperCase() + ' ' + Math.round(g.w / 1000) + 'K';
        ctx.fillText(lbl, lx + 11, H - 22);
        lx += 24 + ctx.measureText(lbl).width;
      }
      if (Ms.hover) {
        const r = Ms.hover;
        ctx.font = '10px ' + this.MONO;
        this.card(ctx, mx, my, [
          [r.p.title, '#e8e6e1', '600 11px ' + this.MONO],
          [r.d.toUpperCase() + ' \u00b7 ' + r.p.words.toLocaleString() + ' WORDS', DCOL[r.d]],
          ...this.wkWrap(ctx, (r.p.summary || '').slice(0, 150), 300).slice(0, 3).map(l => [l, '#b9b4a9']),
          ['CLICK TO OPEN', C.dim, '8.5px ' + this.MONO]
        ]);
      }
    },
    pt_mass(type) {
      const Ms = this.M.mass; if (!Ms) return;
      if (type === 'down' && Ms.hover) this.wikiOpen(Ms.hover.p.id);
    },

    // ============================================================
    // WIKI 09 — LATTICE (graph health forensics)
    // ============================================================
    initLattice(W, H) {
      const WK = this.WK;
      const INV = { causes: 'caused-by', 'caused-by': 'causes', evidences: 'evidenced-by', 'evidenced-by': 'evidences', instantiates: 'instance-of', 'instance-of': 'instantiates', precedes: 'follows', follows: 'precedes', supplies: 'supplied-by', 'supplied-by': 'supplies', 'component-of': 'contains', contains: 'component-of', contradicts: 'contradicts', parallels: 'parallels', mirrors: 'mirrors', 'co-occurs': 'co-occurs' };
      const set = new Set(WK.typed.map(e => e.a + '>' + e.b + '>' + e.type));
      let recip = 0, recipable = 0;
      for (const e of WK.typed) {
        const inv = INV[e.type];
        if (!inv) continue;
        recipable++;
        if (set.has(e.b + '>' + e.a + '>' + inv)) recip++;
      }
      const orphans = WK.pages.filter(p => !(WK.inDeg[p.id] > 0) && !p.id.endsWith('/index'));
      const typeCounts = {};
      for (const e of WK.typed) typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      const outHist = new Array(13).fill(0);
      for (const p of WK.pages) outHist[Math.min(12, WK.outDeg[p.id] || 0)]++;
      this.M.lattice = { recip, recipable, orphans, typeCounts, outHist, hover: null };
    },
    draw_lattice(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.lattice) this.initLattice(W, H);
      const C = this.COL, L = this.M.lattice, WK = this.WK;
      const mx = this.mouse.x, my = this.mouse.y;
      // headline stats
      const stats = [
        [WK.pages.length, 'PAGES'],
        [WK.typed.length, 'TYPED EDGES'],
        [WK.prose.length, 'PROSE LINKS'],
        [Math.round((L.recip / Math.max(1, L.recipable)) * 100) + '%', 'RECIPROCITY'],
        [L.orphans.length, 'ORPHANS']
      ];
      let sx = 24;
      for (const [v, l] of stats) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 22px ' + this.MONO;
        ctx.fillStyle = l === 'ORPHANS' ? C.red : l === 'RECIPROCITY' ? '#9b8cf2' : '#e8e6e1';
        ctx.fillText(String(v), sx, 46);
        ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(l, sx, 60);
        sx += Math.max(110, ctx.measureText(String(v)).width + 60);
      }
      // type spectrum (left)
      const types = Object.entries(L.typeCounts).sort((a, b) => b[1] - a[1]);
      const tx = 24, ty = 96, maxT = types[0] ? types[0][1] : 1;
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('EDGE-TYPE SPECTRUM', tx, ty - 12);
      types.forEach(([t, n], i) => {
        const y = ty + i * 21;
        if (y > H - 130) return;
        ctx.fillStyle = TCOL[t] || '#8b94a4';
        ctx.fillRect(tx, y, Math.max(3, (n / maxT) * 180), 9);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = '#8b94a4';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.toUpperCase() + ' ' + n, tx + Math.max(3, (n / maxT) * 180) + 8, y + 5);
      });
      // out-degree histogram (bottom-left)
      const hx = 24, hy = H - 40, hw = 260, hh = 66;
      const maxH = Math.max(...L.outHist);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textBaseline = 'alphabetic';
      ctx.fillText('OUT-DEGREE (PROSE LINKS PER PAGE)', hx, hy - hh - 8);
      L.outHist.forEach((n, i) => {
        const bw = hw / 13;
        const bh = (n / maxH) * hh;
        ctx.fillStyle = i === 0 ? C.red : '#4fc3e8';
        ctx.fillRect(hx + i * bw, hy - bh, bw - 2, bh);
        ctx.font = '7.5px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.textAlign = 'center';
        ctx.fillText(i === 12 ? '12+' : String(i), hx + i * bw + bw / 2, hy + 10);
      });
      ctx.textAlign = 'left';
      // orphan ring (right)
      const cx = W * 0.72, cy = H * 0.52, R0 = Math.min(W * 0.24, H * 0.36);
      ctx.strokeStyle = C.line;
      ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
      ctx.fillText('THE ORPHAN RING', cx, cy - R0 - 16);
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText('PAGES WITH NO INBOUND PROSE LINK', cx, cy - R0 - 4);
      L.hover = null;
      L.orphans.forEach((p, i) => {
        const a = (i / L.orphans.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * R0, y = cy + Math.sin(a) * R0;
        const dx = mx - x, dy = my - y;
        const hov = dx * dx + dy * dy < 64;
        if (hov) L.hover = { p, x, y };
        ctx.beginPath(); ctx.arc(x, y, hov ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = hov ? '#ffffff' : (DCOL[p.domain] || '#8b94a4');
        ctx.fill();
      });
      ctx.font = '600 15px ' + this.MONO; ctx.fillStyle = C.red; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(L.orphans.length, cx, cy - 8);
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('UNREACHABLE BY PROSE', cx, cy + 10);
      if (L.hover) {
        ctx.font = '10px ' + this.MONO;
        this.card(ctx, L.hover.x, L.hover.y, [
          [L.hover.p.title, '#e8e6e1', '600 11px ' + this.MONO],
          [L.hover.p.domain.toUpperCase() + ' \u00b7 ' + L.hover.p.words.toLocaleString() + ' WORDS', DCOL[L.hover.p.domain]],
          ['CLICK TO OPEN', C.dim, '8.5px ' + this.MONO]
        ]);
      }
      ctx.textAlign = 'left';
    },
    pt_lattice(type) {
      const L = this.M.lattice; if (!L) return;
      if (type === 'down' && L.hover) this.wikiOpen(L.hover.p.id);
    },

    // ============================================================
    // WIKI 10 — EVIDENCE (pages ↔ raw sources)
    // ============================================================
    initEvidence() {
      const WK = this.WK;
      const srcMap = {};
      for (const p of WK.pages) for (const s of (p.sources || [])) {
        const k = s.replace(/^raw\//, '');
        (srcMap[k] = srcMap[k] || []).push(p.id);
      }
      const cat = (s) => /message|imessage|MASTER/i.test(s) ? ['MESSAGES', '#e8a33d']
        : /facebook/i.test(s) ? ['FACEBOOK', '#4fc3e8']
        : /gemini|chat/i.test(s) ? ['AI CHATS', '#9b8cf2']
        : /location|semantic/i.test(s) ? ['LOCATION', '#7fd486']
        : /dox|scan/i.test(s) ? ['DOCUMENTS', '#e87da0']
        : /twitter|youtube|takeout/i.test(s) ? ['PLATFORM EXPORTS', '#a6e6ff']
        : /ancestry|dna|gedcom/i.test(s) ? ['GENEALOGY', '#ffd28a']
        : ['OTHER', '#8b94a4'];
      const rows = Object.entries(srcMap).map(([s, ids]) => ({ s, ids, n: ids.length, cat: cat(s) })).sort((a, b) => b.n - a.n);
      this.M.evidence = { rows, hover: null, pinned: null, pageHits: [] };
    },
    draw_evidence(ctx, W, H, dt) {
      if (!this.WK) return this.wkStandby(ctx, W, H);
      if (!this.M.evidence) this.initEvidence();
      const C = this.COL, E = this.M.evidence, st = this.state;
      const rows = E.rows.slice(0, st.evTop);
      const gx0 = 30, gy0 = 44;
      const rowH = Math.min(22, (H - gy0 - 30) / rows.length);
      const maxN = rows[0] ? rows[0].n : 1;
      const barW = W * (E.pinned ? 0.42 : 0.6);
      const mx = this.mouse.x, my = this.mouse.y;
      E.hover = null;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(E.rows.length + ' DISTINCT RAW SOURCES CITED \u00b7 BAR = PAGES FED', 18, 20);
      rows.forEach((r, i) => {
        const y = gy0 + i * rowH;
        const bw = Math.max(3, (r.n / maxN) * barW);
        const hov = my >= y && my < y + rowH && mx >= gx0 && mx <= gx0 + barW + 260;
        if (hov) E.hover = r;
        const active = E.pinned === r || hov;
        ctx.fillStyle = r.cat[1] + (active ? '' : '99');
        ctx.fillRect(gx0, y + rowH * 0.18, bw, rowH * 0.62);
        if (rowH >= 9) {
          ctx.font = (active ? '600 ' : '') + Math.min(9.5, rowH - 3) + 'px ' + this.MONO;
          ctx.fillStyle = active ? '#e8e6e1' : '#6b7484';
          const name = r.s.split('/').pop().slice(0, 46);
          ctx.fillText(name + ' \u00b7 ' + r.n, gx0 + bw + 10, y + rowH / 2);
        }
      });
      // pinned page list
      E.pageHits = [];
      if (E.pinned) {
        const ids = E.pinned.ids.slice(0, Math.floor((H - 120) / 19));
        const x = W - 330, y = 44, w = 312;
        const h = 46 + ids.length * 19;
        ctx.fillStyle = 'rgba(13,17,24,0.96)'; ctx.strokeStyle = E.pinned.cat[1];
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        ctx.font = '600 10px ' + this.MONO; ctx.fillStyle = E.pinned.cat[1];
        ctx.fillText(E.pinned.s.split('/').pop().slice(0, 40), x + 14, y + 18);
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(E.pinned.n + ' PAGES BUILT FROM THIS SOURCE', x + 14, y + 32);
        ids.forEach((id, i) => {
          const pp = this.WK.byId[id]; if (!pp) return;
          const ry = y + 48 + i * 19;
          const hov = mx >= x && mx <= x + w && my >= ry - 9 && my < ry + 10;
          if (hov) { ctx.fillStyle = 'rgba(79,195,232,0.1)'; ctx.fillRect(x + 1, ry - 9, w - 2, 19); }
          ctx.font = '9px ' + this.MONO;
          ctx.fillStyle = DCOL[pp.domain] || '#8b94a4';
          ctx.fillText('\u25b8', x + 14, ry);
          ctx.fillStyle = hov ? '#e8e6e1' : '#a9a49a';
          ctx.fillText(pp.title.slice(0, 36), x + 26, ry);
          E.pageHits.push({ x, y: ry - 9, w, h: 19, id });
        });
      }
      if (E.hover && E.hover !== E.pinned) {
        ctx.font = '10px ' + this.MONO;
        this.card(ctx, mx, my, [
          [E.hover.s.split('/').pop().slice(0, 44), '#e8e6e1', '600 10.5px ' + this.MONO],
          [E.hover.cat[0] + ' \u00b7 FEEDS ' + E.hover.n + ' PAGES', E.hover.cat[1]],
          ['CLICK TO LIST THE PAGES', C.dim, '8.5px ' + this.MONO]
        ]);
      }
    },
    pt_evidence(type, p) {
      const E = this.M.evidence; if (!E) return;
      if (type === 'down') {
        const hit = (E.pageHits || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
        if (hit) { this.wikiOpen(hit.id); return; }
        E.pinned = E.hover && E.pinned !== E.hover ? E.hover : null;
      }
    }
  };
})();
