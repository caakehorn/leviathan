// LEVIATHAN · THE PEN SCAFFOLD — shared instrument primitives
//
// The canonical shape of an analytic view in this project, lifted out of the
// console so more than one page can be built on it. A host mixes this in with
// Object.assign and supplies COL / MONO / GROT / W / H / mouse / state / M /
// setState; everything else is here.
//
// Consumers: the console Component (index.html) and the PROCUREMENT page
// (js/procurement.js), which shares no data layer with it at all.
(function () {
  window.PenCore = {
    // ============================================================
    // REUSABLE INSTRUMENT PRIMITIVES (Annie-pattern, generic)
    // Any module (PULSE, ORBITS, …) can compose these.
    // ============================================================
    // lanes: [{ data: Float32Array, label, unit, color, max }]
    // geo: { padL, padT, laneH, laneGap, x0, x1, xOf(pos) }
    drawPenLanes(ctx, geo, lanes, playPos, playing) {
      const C = this.COL;
      lanes.forEach((ln, li) => {
        const y0 = geo.padT + li * (geo.laneH + geo.laneGap);
        ctx.fillStyle = 'rgba(4,18,8,0.6)';
        ctx.fillRect(geo.x0, y0, geo.x1 - geo.x0, geo.laneH);
        ctx.strokeStyle = C.grid; ctx.strokeRect(geo.x0 + 0.5, y0 + 0.5, geo.x1 - geo.x0, geo.laneH);
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = ln.color; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(ln.label, geo.x0 - 12, y0 + geo.laneH / 2);
        if (ln.unit) {
          ctx.fillStyle = C.faint; ctx.font = '7.5px ' + this.MONO;
          ctx.fillText(ln.unit, geo.x0 - 12, y0 + geo.laneH / 2 + 12);
        }
        ctx.textAlign = 'left';
        const data = ln.data, n = data.length, mxr = ln.max || 0.001;
        ctx.strokeStyle = ln.color; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let m = 0; m <= playPos && m < n; m += 0.25) {
          const i0 = Math.floor(m), f = m - i0;
          const v = data[i0] * (1 - f) + data[Math.min(n - 1, i0 + 1)] * f;
          const x = geo.xOf(m), y = y0 + geo.laneH - 5 - (v / mxr) * (geo.laneH - 12);
          m === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        // pen head with live jitter
        const i0 = Math.floor(Math.min(n - 1, playPos)), f = playPos - i0;
        const v = data[i0] * (1 - f) + data[Math.min(n - 1, i0 + 1)] * f;
        const jit = playing ? (Math.random() - 0.5) * Math.min(8, v) * 1.1 : 0;
        const px = geo.xOf(playPos);
        const hy = y0 + geo.laneH - 5 - (v / mxr) * (geo.laneH - 12) + jit;
        ctx.fillStyle = ln.color;
        ctx.beginPath(); ctx.arc(px, hy, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ln.color + '55';
        ctx.beginPath(); ctx.moveTo(px, hy); ctx.lineTo(px + 14, hy - 10); ctx.stroke();
        ctx.font = '8px ' + this.MONO; ctx.fillStyle = ln.color;
        ctx.fillText(v.toFixed(1), px + 17, hy - 12);
      });
    },

    drawVolumeLane(ctx, geo, y0, data, max, playPos, color, label) {
      const C = this.COL;
      ctx.fillStyle = 'rgba(4,18,8,0.6)';
      ctx.fillRect(geo.x0, y0, geo.x1 - geo.x0, geo.laneH);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(label || 'VOLUME', geo.x0 - 12, y0 + geo.laneH / 2);
      ctx.textAlign = 'left';
      const n = data.length;
      const bw = Math.max(1.4, (geo.x1 - geo.x0) / n - 1);
      for (let i = 0; i < n; i++) {
        const x = geo.xOf(i);
        const hh = Math.sqrt(data[i] / max) * (geo.laneH - 8);
        const past = i <= playPos;
        ctx.fillStyle = past ? color + 'cc' : color + '29';
        ctx.fillRect(x - bw / 2, y0 + geo.laneH - 4 - hh, bw, hh);
      }
    },

    // frags: [{ pos, text, tag, shownAt, pen, id }] sorted by pos.
    // `pen` is the colour of the lane this record registered on, so the reader
    // can see which frequency a given sentence is what spiked; `id` is the page
    // it came from. Returns hit-rects so the owning pt_ handler can open them.
    drawFragmentFeed(ctx, geo, frags, playPos, title, accent) {
      const C = this.COL;
      ctx.fillStyle = 'rgba(3,14,7,0.85)';
      ctx.fillRect(geo.fx, geo.fy, geo.fw, geo.fh);
      ctx.strokeStyle = C.line; ctx.strokeRect(geo.fx + 0.5, geo.fy + 0.5, geo.fw, geo.fh);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(title, geo.fx + 14, geo.fy + 16);
      const now = performance.now();
      const visible = [];
      for (const f of frags) {
        if (f.pos <= playPos) { if (!f.shownAt) f.shownAt = now; visible.push(f); }
        else f.shownAt = 0;
      }
      const feed = visible.slice(-5).reverse();
      const rects = [];
      const mx = this.mouse ? this.mouse.x : -1, my = this.mouse ? this.mouse.y : -1;
      let fy = geo.fy + 40;
      const yMax = geo.fy + geo.fh - 26;
      for (let i = 0; i < feed.length; i++) {
        const f = feed[i];
        const rowTop = fy - 11;
        const age = (now - f.shownAt) / 1000;
        const chars = Math.floor(age * 60);
        const txt = f.text.slice(0, chars);
        const alpha = i === 0 ? 1 : Math.max(0.25, 0.8 - i * 0.18);
        // the tag carries the pen colour — this is the attribution
        const tagCol = f.pen || accent;
        const hot = f.id && mx >= geo.fx && mx <= geo.fx + geo.fw && my >= rowTop && my <= rowTop + 16;
        ctx.font = '9px ' + this.MONO;
        ctx.fillStyle = tagCol + Math.round((hot ? 1 : alpha) * 230).toString(16).padStart(2, '0');
        ctx.fillText((f.id ? (hot ? '▸ ' : '') : '') + f.tag, geo.fx + 14, fy);
        fy += 14;
        ctx.font = (i === 0 ? '500 12.5px ' : '11px ') + this.GROT;
        ctx.fillStyle = 'rgba(214,255,208,' + alpha + ')';
        const words = txt.split(' ');
        let line = '', lh = i === 0 ? 17 : 15;
        for (const w2 of words) {
          if (ctx.measureText(line + w2).width > geo.fw - 28) { ctx.fillText(line, geo.fx + 14, fy); fy += lh; line = w2 + ' '; }
          else line += w2 + ' ';
          if (fy > yMax) break;
        }
        if (fy <= yMax) { ctx.fillText(line + (i === 0 && chars < f.text.length ? '▌' : ''), geo.fx + 14, fy); fy += lh + 12; }
        if (f.id) rects.push({ x: geo.fx, y: rowTop, w: geo.fw, h: Math.min(fy, yMax) - rowTop, id: f.id });
        if (fy > yMax) break;
      }
      if (!visible.length) {
        ctx.font = '10px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.fillText('PRESS ▶ — THE PENS WILL WRITE', geo.fx + 14, geo.fy + 46);
      }
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText(visible.length + ' / ' + frags.length + ' FRAGMENTS SURFACED', geo.fx + 14, geo.fy + geo.fh - 10);
      return rects;
    },

    // ============================================================
    // THE PEN SCAFFOLD
    // The canonical shape of an analytic view: several pens tracing
    // frequencies over an ORDERING of the corpus (not necessarily time),
    // a volume lane grounding them in raw mass, a playable/scrubbable
    // playhead, and a verbatim feed of the records registering on each
    // frequency. POLYGRAPH, WEATHER and EPISTEME all reduce to this.
    //
    // The hook callbacks (readout/marker/overlay) fire at exact points in
    // the paint order so an instrument's bespoke furniture lands in the
    // same layer it did when each of these was hand-rolled.
    // ============================================================
    penInstrument(ctx, W, H, dt, cfg) {
      const C = this.COL, st = this.state, M = this.M[cfg.id];
      const nP = cfg.nP;
      // the cache key (this.M[id]) and the state key need not match: a view-mode
      // pen caches under its own id but shares the tab's play/speed state
      const sk = cfg.stateKey || cfg.id;

      // ---- advance the playhead (scrubbing takes precedence) ----
      if (st[sk + 'Play'] && !M.scrub) {
        M.play += (st[sk + 'Speed'] || 1) * dt;
        // stop at the last position, not just short of nP: xOf normalises by
        // nP-1, so parking the playhead at nP-0.01 pushes it past the right
        // edge of the chart by 1/(nP-1) of its width — invisible on a
        // 300-position corpus sweep, a tenth of the chart on a 11-month one
        if (M.play >= nP - 1) { M.play = nP - 1; this.setState({ [sk + 'Play']: false }); }
      }

      // ---- layout ----
      const chartR = W * (cfg.chartFrac || 0.62);
      const padL = cfg.padL, padT = cfg.padT, padB = cfg.padB, laneGap = cfg.laneGap;
      const nLanes = cfg.lanes.length + (cfg.volume ? 1 : 0);
      const laneH = (H - padT - padB - laneGap * (nLanes - 1)) / nLanes;
      const xOf = (i) => padL + (i / Math.max(1, nP - 1)) * (chartR - padL - 20);
      const geo = { padL, padT, laneH, laneGap, x0: padL, x1: chartR - 20, xOf };
      const vy0 = padT + cfg.lanes.length * (laneH + laneGap);
      const playX = xOf(M.play);
      const ribY = padT - 16;
      const botY = vy0 + (cfg.volume ? laneH : 0);
      const g = { geo, xOf, playX, vy0, laneH, chartR, padL, padT, padB, ribY, botY, nP, play: M.play, M };

      // ---- ribbon: a per-position colour strip above the lanes ----
      if (cfg.ribbon) {
        const bw = Math.max(1.2, (chartR - padL - 20) / nP + 0.6);
        for (let i = 0; i < nP; i++) {
          const col = cfg.ribbon(i, i <= M.play);
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(xOf(i), ribY, bw, 8);
        }
      }

      // ---- house header ----
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = cfg.accent;
      ctx.fillText(cfg.title, 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(cfg.sub, 18, 48);

      if (cfg.readout) cfg.readout(g);

      // ---- the pens, and the mass under them ----
      this.drawPenLanes(ctx, geo, cfg.lanes, M.play, st[sk + 'Play']);
      if (cfg.volume) this.drawVolumeLane(ctx, geo, vy0, cfg.volume.data, cfg.volume.max, M.play, cfg.volume.color, cfg.volume.label);

      // ---- needle ----
      ctx.strokeStyle = 'rgba(214,255,208,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(playX, (cfg.ribbon ? ribY - 4 : padT - 6)); ctx.lineTo(playX, botY + 8); ctx.stroke();

      if (cfg.marker) cfg.marker(g);

      // ---- position ticks along the axis ----
      if (cfg.tickLabel) {
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const step = Math.max(1, cfg.tickStep || 1);
        for (let i = 0; i < nP; i += step) {
          const lab = cfg.tickLabel(i);
          if (lab != null) ctx.fillText(lab, xOf(i), botY + 12);
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }

      M.scrubGeo = { x0: padL, x1: chartR - 20, y0: (cfg.ribbon ? ribY - 6 : padT - 6), y1: botY };

      if (cfg.overlay) cfg.overlay(g);

      // ---- the verbatim feed: what actually registered on those pens ----
      const fd = cfg.feed || {};
      const fx = chartR + 8, fw = W - fx - 16;
      M.fragRects = this.drawFragmentFeed(ctx,
        { fx, fy: padT + (fd.dy != null ? fd.dy : -30), fw, fh: H - padT + (fd.dh != null ? fd.dh : -28) },
        cfg.frags, M.play, cfg.feedTitle, cfg.accent);
      return g;
    },

    // Tag each fragment with the colour of the pen that was loudest at its
    // position, so the feed attributes the record to a frequency rather than
    // colouring everything with the instrument accent.
    penAttributeFrags(frags, pens, rates, maxRate) {
      for (const f of frags) {
        const i = Math.max(0, Math.round(f.pos));
        let best = null, bv = -1;
        for (const pen of pens) {
          const k = pen[0], col = pen[2];
          const arr = rates[k];
          if (!arr || i >= arr.length) continue;
          const v = arr[i] / (maxRate[k] || 1);
          if (v > bv) { bv = v; best = col; }
        }
        if (best) f.pen = best;
      }
      return frags;
    },

    // Shared scrub/click handling for pen instruments. Returns 'click' when the
    // pointer went down and up in the same spot, so the caller can decide what
    // that means (which page to open); scrubbing is handled here outright.
    penScrub(id, type, p) {
      const M = this.M[id];
      if (!M || !M.scrubGeo) return null;
      const g = M.scrubGeo;
      const at = (x) => Math.max(0.001, Math.min(M.nP - 1, ((x - g.x0) / (g.x1 - g.x0)) * (M.nP - 1)));
      const inChart = p.x >= g.x0 - 20 && p.x <= g.x1 + 20 && p.y >= g.y0 && p.y <= g.y1;
      if (type === 'down' && inChart) {
        M.downPos = { x: p.x, y: p.y };
        M.scrub = true;
        M.play = at(p.x);
      } else if (type === 'move' && M.scrub && this.mouse.down) {
        M.play = at(p.x);
      } else if (type === 'up' || type === 'leave') {
        const moved = M.downPos ? Math.hypot(p.x - M.downPos.x, p.y - M.downPos.y) : 99;
        M.scrub = false; M.downPos = null;
        if (type === 'up' && moved < 4) return 'click';
      }
      return null;
    }
  };
})();
