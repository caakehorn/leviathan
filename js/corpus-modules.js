// LEVIATHAN · CORPUS section — the nineteen message-archive visualizers
// Every module is a (initₓ, draw_ₓ, pt_ₓ) triple plus whatever constant tables
// it needs; the shell dispatches to them by tab name through this['draw_' + tab].
// Mixed into the console Component prototype at mount, exactly like the wiki
// modules — see js/wiki-modules.js.
(function () {
  window.CorpusModules = {
    // ============================================================
    // MODULE 01 — PULSE
    // ============================================================
    draw_pulse(ctx, W, H, dt) {
      const D = this.D, C = this.COL, P = this.M.pulse;
      P.reveal = Math.min(1, P.reveal + dt * 0.8);
      // inertia + smoothing
      if (!this.mouse.down && Math.abs(P.vx) > 0.001) {
        const span = P.tb - P.ta;
        P.ta -= P.vx * span; P.tb -= P.vx * span; P.vx *= 0.93;
        this.pulseClamp();
      }
      P.a += (P.ta - P.a) * Math.min(1, dt * 11);
      P.b += (P.tb - P.b) * Math.min(1, dt * 11);

      const eraY = 8, eraH = 20;
      const wTop = 42, wBot = H - 104;
      const mid = (wTop + wBot) / 2, half = (wBot - wTop) / 2 - 4;
      const mmY = H - 64, mmH = 34;
      const span = Math.max(1, P.b - P.a);
      const xOf = (i) => ((i - P.a) / span) * W;
      const iOf = (x) => P.a + (x / W) * span;

      // era bands
      for (const e of D.eras) {
        const x0 = Math.max(0, xOf(e.i0)), x1 = Math.min(W, xOf(e.i1));
        if (x1 < 0 || x0 > W || x1 - x0 < 2) continue;
        ctx.fillStyle = e.tone === 'amber' ? 'rgba(57,255,20,0.07)' : 'rgba(176,38,255,0.05)';
        ctx.fillRect(x0, eraY, x1 - x0, eraH);
        ctx.fillStyle = e.tone === 'amber' ? 'rgba(57,255,20,0.06)' : 'rgba(176,38,255,0.04)';
        ctx.fillRect(x0, wTop, x1 - x0, wBot - wTop);
        if (x1 - x0 > 70) {
          ctx.font = '9px ' + this.MONO;
          ctx.fillStyle = e.tone === 'amber' ? C.amber : C.cyan;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(e.label, x0 + 8, eraY + eraH / 2 + 0.5);
        }
      }

      // year grid
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const y0 = this.i2d(D.day0 + Math.floor(P.a)).getUTCFullYear();
      const y1 = this.i2d(D.day0 + Math.ceil(P.b)).getUTCFullYear();
      for (let y = y0; y <= y1 + 1; y++) {
        const i = this.d2i(y + '-01-01') - D.day0;
        const x = xOf(i);
        if (x < -40 || x > W + 40) continue;
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, wTop); ctx.lineTo(x, wBot + 16); ctx.stroke();
        ctx.font = '10px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(String(y), x, wBot + 20);
      }
      // month ticks when zoomed
      if (span < 1200) {
        for (let y = y0; y <= y1; y++) for (let m = 1; m < 12; m++) {
          const i = this.d2i(y + '-' + String(m + 1).padStart(2, '0') + '-01') - D.day0;
          const x = xOf(i);
          if (x < 0 || x > W) continue;
          ctx.strokeStyle = 'rgba(20,26,35,0.7)';
          ctx.beginPath(); ctx.moveTo(x, mid - half * 0.5); ctx.lineTo(x, mid + half * 0.5); ctx.stroke();
          if (span < 420) {
            ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
            ctx.fillText('JFMAMJJASOND'[m], x, wBot + 6);
          }
        }
      }

      // midline
      ctx.strokeStyle = '#5b1a8f'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();

      // waveform columns
      const amp = (v) => Math.min(1, Math.sqrt(v / D.maxDay) * 1.12) * half;
      const revealX = P.reveal * W * 1.15;
      for (let x = 0; x < W; x++) {
        if (x > revealX) break;
        const i0 = Math.max(0, Math.floor(iOf(x))), i1 = Math.min(D.N - 1, Math.max(i0, Math.floor(iOf(x + 1))));
        if (i0 >= D.N || i1 < 0) continue;
        let s = 0, r = 0;
        for (let i = i0; i <= i1; i++) { if (D.S[i] > s) s = D.S[i]; if (D.R[i] > r) r = D.R[i]; }
        const fade = Math.min(1, (revealX - x) / 60);
        if (s > 0) {
          const h = amp(s);
          const g = ctx.createLinearGradient(0, mid - h, 0, mid);
          g.addColorStop(0, 'rgba(57,255,20,' + (0.95 * fade) + ')');
          g.addColorStop(1, 'rgba(57,255,20,' + (0.18 * fade) + ')');
          ctx.fillStyle = g;
          ctx.fillRect(x, mid - h, 1, h);
        }
        if (r > 0) {
          const h = amp(r);
          const g = ctx.createLinearGradient(0, mid, 0, mid + h);
          g.addColorStop(0, 'rgba(176,38,255,' + (0.16 * fade) + ')');
          g.addColorStop(1, 'rgba(176,38,255,' + (0.85 * fade) + ')');
          ctx.fillStyle = g;
          ctx.fillRect(x, mid, 1, h);
        }
      }
      // axis legend
      ctx.font = '9px ' + this.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.amber; ctx.fillText('\u25b2 SENT', 10, wTop + 8);
      ctx.fillStyle = C.cyan; ctx.fillText('\u25bc RECEIVED', 10, wBot - 8);

      // event pins
      let hoverEvent = null;
      for (const ev of D.events) {
        const x = xOf(ev.i);
        if (x < -10 || x > W + 10) continue;
        const near = Math.abs(this.mouse.x - x) < 7 && this.mouse.y > wTop && this.mouse.y < wBot;
        if (near) hoverEvent = { ...ev, x };
        ctx.save();
        ctx.translate(x, mid);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = near ? C.amberHi : C.amber;
        const s = near ? 5.5 : 4;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }

      // minimap
      this.pulseMini(ctx, W, mmY, mmH);

      // hover crosshair + card
      const mx = this.mouse.x, my = this.mouse.y;
      if (mx >= 0 && my > wTop && my < wBot && !P.drag) {
        const di = Math.floor(iOf(mx));
        if (di >= 0 && di < D.N) {
          ctx.strokeStyle = 'rgba(232,230,225,0.25)';
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(mx, wTop); ctx.lineTo(mx, wBot); ctx.stroke();
          ctx.setLineDash([]);
          const perPx = span / W;
          let lines;
          if (perPx <= 1.6) {
            const s = D.S[di], r = D.R[di];
            lines = [
              [this.fmtDate(D.day0 + di, true), C.txt, '600 11px ' + this.MONO],
              [this.fmt(s) + ' sent', C.amber],
              [this.fmt(r) + ' received', C.cyan]
            ];
          } else {
            const w = Math.ceil(perPx * 3);
            let s = 0, r = 0;
            for (let i = Math.max(0, di - w); i <= Math.min(D.N - 1, di + w); i++) { s += D.S[i]; r += D.R[i]; }
            lines = [
              ['\u2248 ' + this.fmtDate(D.day0 + di), C.txt, '600 11px ' + this.MONO],
              [this.fmt(s) + ' sent / ' + this.fmt(r) + ' recv', C.dim],
              ['in surrounding ' + (2 * w + 1) + ' days', C.faint]
            ];
          }
          if (hoverEvent) lines.push(['\u25c6 ' + hoverEvent.label, C.amberHi]);
          this.card(ctx, mx, Math.min(my, mid), lines);
        }
      }
    },

    pulseMini(ctx, W, y, h) {
      const D = this.D, C = this.COL, P = this.M.pulse;
      if (!this._miniCache || this._miniCache.w !== W) {
        const cols = new Float32Array(W * 2);
        for (let x = 0; x < W; x++) {
          const i0 = Math.floor((x / W) * D.N), i1 = Math.max(i0, Math.floor(((x + 1) / W) * D.N) - 1);
          let s = 0, r = 0;
          for (let i = i0; i <= i1 && i < D.N; i++) { if (D.S[i] > s) s = D.S[i]; if (D.R[i] > r) r = D.R[i]; }
          cols[x * 2] = s; cols[x * 2 + 1] = r;
        }
        this._miniCache = { w: W, cols };
      }
      const { cols } = this._miniCache;
      ctx.fillStyle = '#12001f';
      ctx.fillRect(0, y, W, h);
      const midm = y + h / 2;
      for (let x = 0; x < W; x += 1) {
        const s = cols[x * 2], r = cols[x * 2 + 1];
        const hs = Math.sqrt(s / D.maxDay) * (h / 2 - 2), hr = Math.sqrt(r / D.maxDay) * (h / 2 - 2);
        if (s) { ctx.fillStyle = 'rgba(57,255,20,0.45)'; ctx.fillRect(x, midm - hs, 1, hs); }
        if (r) { ctx.fillStyle = 'rgba(176,38,255,0.4)'; ctx.fillRect(x, midm, 1, hr); }
      }
      // view window
      const x0 = (P.a / D.N) * W, x1 = (P.b / D.N) * W;
      ctx.fillStyle = 'rgba(232,230,225,0.07)';
      ctx.fillRect(x0, y, x1 - x0, h);
      ctx.strokeStyle = 'rgba(232,230,225,0.4)'; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y + 0.5, Math.max(3, x1 - x0) - 1, h - 1);
    },

    pulseClamp() {
      const P = this.M.pulse, N = this.D.N;
      const span = Math.max(10, Math.min(N, P.tb - P.ta));
      if (P.ta < -span * 0.15) P.ta = -span * 0.15;
      if (P.tb > N + span * 0.15) P.tb = N + span * 0.15;
      P.tb = P.ta + span;
      if (P.tb > N + span * 0.15) { P.tb = N + span * 0.15; P.ta = P.tb - span; }
    },

    pt_pulse(type, p, e) {
      const P = this.M.pulse, W = this.W, H = this.H;
      const mmY = H - 64, mmH = 34;
      const span = P.tb - P.ta;
      if (type === 'down') {
        if (p.y > mmY - 4 && p.y < mmY + mmH + 4) {
          P.drag = 'mini';
          const center = (p.x / W) * this.D.N;
          P.ta = center - span / 2; P.tb = center + span / 2;
          this.pulseClamp();
        } else { P.drag = 'pan'; P.vx = 0; }
      } else if (type === 'move') {
        if (!this.mouse.down) return;
        if (P.drag === 'pan') {
          const d = (p.dx / W) * span;
          P.ta -= d; P.tb -= d;
          P.vx = p.dx / W;
          this.pulseClamp();
          P.a = P.ta; P.b = P.tb;
        } else if (P.drag === 'mini') {
          const center = (p.x / W) * this.D.N;
          P.ta = center - span / 2; P.tb = center + span / 2;
          this.pulseClamp();
        }
      } else if (type === 'up' || type === 'leave') {
        P.drag = null;
      } else if (type === 'wheel') {
        const f = Math.exp(e.deltaY * 0.0016);
        const pivot = P.ta + (p.x / W) * span;
        P.ta = pivot - (pivot - P.ta) * f;
        P.tb = pivot + (P.tb - pivot) * f;
        this.pulseClamp();
      } else if (type === 'dbl') {
        P.ta = 0; P.tb = this.D.N;
      }
    },

    pulseJump(label) {
      const P = this.M.pulse, D = this.D;
      if (label === 'FULL') { P.ta = 0; P.tb = D.N; return; }
      const e = D.eras.find(x => x.label === label);
      if (e) { P.ta = e.i0 - 20; P.tb = e.i1 + 20; this.pulseClamp(); }
    },

    // ============================================================
    // MODULE 02 — CLOCK  (spin a 15-year average day)
    // ============================================================
    draw_clock(ctx, W, H, dt) {
      const D = this.D, C = this.COL, K = this.M.clock;
      const hourly = D.msg.hourly, hw = D.msg.hourWeek;
      const cx = W / 2, cy = H / 2 + 6;
      const R = Math.min(W, H) * 0.40;
      const r0 = R * 0.46;
      K.geo = { cx, cy, R, r0 };
      if (!K.drag) { K.rot += K.rotV * dt; K.rotV *= Math.pow(0.90, dt * 60); if (Math.abs(K.rotV) < 0.0002) K.rotV = 0; }
      const rot = K.rot;
      const mode = this.state.clockMode;
      const val = (h) => mode === 'sent' ? hourly[h][0] : mode === 'recv' ? hourly[h][1] : hourly[h][0] + hourly[h][1];
      let mx = 0; for (let h = 0; h < 24; h++) mx = Math.max(mx, val(h));
      let hwMax = 0; for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) hwMax = Math.max(hwMax, hw[d][h]);

      const angOf = (h) => (h / 24) * Math.PI * 2 - Math.PI / 2 + rot;
      const needleHour = ((Math.round((-rot / (Math.PI * 2)) * 24) % 24) + 24) % 24;

      // inner polar heatmap: 7 day-of-week rings x 24 wedges
      const ringW = (r0 - R * 0.10) / 7;
      for (let d = 0; d < 7; d++) {
        const ri = R * 0.10 + d * ringW, ro = ri + ringW - 1.2;
        for (let h = 0; h < 24; h++) {
          const a0 = angOf(h) - Math.PI / 24, a1 = angOf(h) + Math.PI / 24;
          const t = hw[d][h] / hwMax;
          ctx.beginPath();
          ctx.arc(cx, cy, ro, a0, a1); ctx.arc(cx, cy, ri, a1, a0, true); ctx.closePath();
          ctx.fillStyle = 'rgba(57,255,20,' + (0.05 + Math.pow(t, 0.7) * 0.85).toFixed(3) + ')';
          ctx.fill();
        }
      }

      // outer 24h bars
      for (let h = 0; h < 24; h++) {
        const a = angOf(h);
        const t = val(h) / mx;
        const len = (R - r0) * (0.15 + Math.pow(t, 0.85) * 0.85);
        const aw = Math.PI / 24 * 0.82;
        const isNeedle = h === needleHour, isHover = h === K.hoverH;
        ctx.beginPath();
        ctx.arc(cx, cy, r0 + len, a - aw, a + aw); ctx.arc(cx, cy, r0, a + aw, a - aw, true); ctx.closePath();
        if (isNeedle) ctx.fillStyle = mode === 'recv' ? C.cyanHi : C.amberHi;
        else if (isHover) ctx.fillStyle = mode === 'recv' ? C.cyan : C.amber;
        else ctx.fillStyle = mode === 'recv' ? 'rgba(176,38,255,' + (0.35 + t * 0.55).toFixed(3) + ')' : 'rgba(57,255,20,' + (0.35 + t * 0.55).toFixed(3) + ')';
        ctx.fill();
        const lx = cx + Math.cos(a) * (R + 16), ly = cy + Math.sin(a) * (R + 16);
        ctx.font = (isNeedle ? '600 10px ' : '9px ') + this.MONO;
        ctx.fillStyle = isNeedle ? C.txt : C.faint;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(h).padStart(2, '0'), lx, ly);
      }

      // fixed needle pointing up
      ctx.strokeStyle = C.txt; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - r0 * 0.92); ctx.lineTo(cx, cy - R - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R - 12); ctx.lineTo(cx - 5, cy - R - 2); ctx.lineTo(cx + 5, cy - R - 2); ctx.closePath();
      ctx.fillStyle = C.txt; ctx.fill();

      // center readout plate
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.10 - 3, 0, Math.PI * 2);
      ctx.fillStyle = '#12001f'; ctx.fill();
      const hv = hourly[needleHour];
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = '600 30px ' + this.MONO; ctx.fillStyle = C.txt;
      ctx.fillText(String(needleHour).padStart(2, '0') + ':00', cx, cy - R * 0.46 - 14);
      ctx.font = '9px ' + this.MONO;
      ctx.fillStyle = C.amber; ctx.fillText(this.fmt(hv[0]) + ' SENT', cx - 50, cy - R * 0.46 + 6);
      ctx.fillStyle = C.cyan; ctx.fillText(this.fmt(hv[1]) + ' RECV', cx + 50, cy - R * 0.46 + 6);
      if (!D.totalsAll) D.totalsAll = D.msg.totals.sent + D.msg.totals.recv;
      ctx.fillStyle = C.dim; ctx.font = '8px ' + this.MONO;
      ctx.fillText(((hv[0] + hv[1]) / D.totalsAll * 100).toFixed(1) + '% OF 15 YEARS OF TRAFFIC HAPPENS HERE', cx, cy - R * 0.46 + 22);

      // ring legend
      ctx.fillStyle = C.faint; ctx.font = '8px ' + this.MONO;
      ctx.fillText('INNER RINGS: SUN \u2192 SAT \u00b7 OUTER BARS: HOUR VOLUME', cx, cy + R + 30);

      // hover detect
      if (this.mouse.x >= 0) {
        const dx = this.mouse.x - cx, dy = this.mouse.y - cy, rr = Math.hypot(dx, dy);
        if (rr > r0 && rr < R + 8) {
          let a = Math.atan2(dy, dx) - rot + Math.PI / 2;
          a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          K.hoverH = Math.round(a / (Math.PI * 2) * 24) % 24;
        } else K.hoverH = -1;
      } else K.hoverH = -1;
      if (K.hoverH >= 0 && K.hoverH !== needleHour && !K.drag) {
        const hh = hourly[K.hoverH];
        this.card(ctx, this.mouse.x, this.mouse.y, [
          [String(K.hoverH).padStart(2, '0') + ':00 \u2014 ' + String((K.hoverH + 1) % 24).padStart(2, '0') + ':00', C.txt, '600 11px ' + this.MONO],
          [this.fmt(hh[0]) + ' sent', C.amber],
          [this.fmt(hh[1]) + ' received', C.cyan]
        ]);
      }
    },

    pt_clock(type, p, e) {
      const K = this.M.clock, g = K.geo; if (!g) return;
      if (type === 'down') {
        if (Math.hypot(p.x - g.cx, p.y - g.cy) < g.R + 30) {
          K.drag = true; K.lastAng = Math.atan2(p.y - g.cy, p.x - g.cx); K.rotV = 0;
        }
      } else if (type === 'move' && K.drag && this.mouse.down) {
        const a = Math.atan2(p.y - g.cy, p.x - g.cx);
        let d = a - K.lastAng;
        if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
        K.rot += d; K.lastAng = a; K.rotV = d * 55;
      } else if (type === 'up' || type === 'leave') {
        K.drag = false;
      } else if (type === 'wheel') {
        K.rotV = 0; K.rot += (e.deltaY > 0 ? -1 : 1) * (Math.PI * 2 / 24);
      }
    },

    // ============================================================
    // MODULE 03 — ORBITS  (fling the people in your life)
    // ============================================================
    initOrbits() {
      const D = this.D;
      const NOW = this.d2i('2026-06-09');
      const list = D.msg.threads.slice(0, 18);
      const maxTot = list[0].tot;
      const cx = this.W / 2, cy = this.H / 2;
      this.M.orbits = {
        bodies: list.map((t, i) => {
          const recencyDays = Math.max(0, NOW - this.d2i(t.last));
          const rad = 80 + Math.min(1, Math.sqrt(recencyDays / 4200)) * (Math.min(this.W, this.H) * 0.42 - 80);
          const size = 7 + Math.sqrt(t.tot / maxTot) * 32;
          const theta = (i * 2.399963) % (Math.PI * 2); // golden angle spread
          return {
            t, baseRad: rad, theta, omega: (28 / rad) * (i % 2 ? 1 : -1) * 0.5,
            size, px: cx + Math.cos(theta) * rad, py: cy + Math.sin(theta) * rad, vx: 0, vy: 0,
            recencyDays
          };
        }),
        pinned: null, drag: null, hover: null
      };
    },

    draw_orbits(ctx, W, H, dt) {
      if (!this.M.orbits || this._orbW !== W + 'x' + H) { this._orbW = W + 'x' + H; this.initOrbits(); }
      const C = this.COL, O = this.M.orbits, cx = W / 2, cy = H / 2;
      dt = Math.min(dt, 0.03);
      // guide rings
      ctx.strokeStyle = 'rgba(34,42,55,0.5)'; ctx.lineWidth = 1;
      const maxR = Math.min(W, H) * 0.42;
      for (let r = 80; r <= maxR; r += (maxR - 80) / 3) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('TALKED YESTERDAY', cx, cy - 80 + 12);
      ctx.fillText('SILENT FOR A DECADE', cx, cy - maxR - 10);

      for (const b of O.bodies) {
        b.theta += b.omega * dt;
        const ax = cx + Math.cos(b.theta) * b.baseRad, ay = cy + Math.sin(b.theta) * b.baseRad;
        if (O.drag === b) { b.px = this.mouse.x; b.py = this.mouse.y; }
        else {
          const k = 3.2, damp = Math.pow(0.88, dt * 60);
          b.vx += (ax - b.px) * k * dt; b.vy += (ay - b.py) * k * dt;
          b.vx *= damp; b.vy *= damp;
          b.px += b.vx * dt; b.py += b.vy * dt;
        }
      }
      // connectors
      for (const b of O.bodies) {
        const lit = O.pinned === b || O.hover === b;
        ctx.strokeStyle = 'rgba(57,255,20,' + (lit ? 0.45 : 0.10) + ')';
        ctx.lineWidth = lit ? 1.4 : 0.8;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(b.px, b.py); ctx.stroke();
      }
      // bodies
      for (const b of O.bodies) {
        const lit = O.hover === b || O.pinned === b;
        const named = !!b.t.name;
        const base = named ? '232,163,61' : '124,152,182';
        const g = ctx.createRadialGradient(b.px, b.py, 1, b.px, b.py, b.size);
        g.addColorStop(0, 'rgba(' + base + ',' + (lit ? 1 : 0.9) + ')');
        g.addColorStop(0.65, 'rgba(' + base + ',' + (lit ? 0.6 : 0.3) + ')');
        g.addColorStop(1, 'rgba(' + base + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.px, b.py, b.size * (lit ? 1.2 : 1), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = named ? '#b6ff8f' : '#dfe8f2';
        ctx.beginPath(); ctx.arc(b.px, b.py, Math.max(2, b.size * 0.3), 0, Math.PI * 2); ctx.fill();
        if (b.size > 15 || lit) {
          ctx.font = '600 ' + (b.size > 22 ? 11 : 9) + 'px ' + this.MONO;
          ctx.fillStyle = lit ? C.txt : C.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(b.t.name || this.maskId(b.t.id), b.px, b.py + b.size + 4);
        }
      }
      // sun
      const pulse = 1 + Math.sin(performance.now() / 600) * 0.05;
      const sg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 38 * pulse);
      sg.addColorStop(0, '#fff4e0'); sg.addColorStop(0.45, '#39ff14'); sg.addColorStop(1, 'rgba(57,255,20,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, 38 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10001f'; ctx.font = '700 11px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('DAN', cx, cy);

      // hover detect
      O.hover = null;
      let best = 1e9;
      for (const b of O.bodies) { const d = Math.hypot(this.mouse.x - b.px, this.mouse.y - b.py); if (d < b.size + 8 && d < best) { best = d; O.hover = b; } }
      if (this.cv) this.cv.style.cursor = O.drag ? 'grabbing' : (O.hover ? 'grab' : 'crosshair');

      const show = O.pinned || O.hover;
      if (show) this.drawDossier(ctx, show, show === O.pinned);
    },

    drawDossier(ctx, b, pinned) {
      const C = this.COL, t = b.t;
      const x = 18, y = 64, w = 256, h = 158;
      ctx.fillStyle = 'rgba(13,17,24,0.95)'; ctx.strokeStyle = pinned ? C.amber : C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 15px ' + this.GROT; ctx.fillStyle = t.name ? C.amberHi : C.txt;
      ctx.fillText(t.name || this.maskId(t.id), x + 14, y + 26);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText(this.fmt(t.tot) + ' MESSAGES \u00b7 ' + (b.recencyDays < 30 ? 'ACTIVE' : this.fmt(Math.round(b.recencyDays / 30.4)) + ' MO SILENT'), x + 14, y + 43);
      const bw = w - 28, by = y + 54, sr = t.s / (t.s + t.r);
      ctx.fillStyle = C.amber; ctx.fillRect(x + 14, by, bw * sr, 6);
      ctx.fillStyle = C.cyan; ctx.fillRect(x + 14 + bw * sr, by, bw * (1 - sr), 6);
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.amber; ctx.fillText(this.fmt(t.s) + ' SENT', x + 14, by + 17);
      ctx.textAlign = 'right'; ctx.fillStyle = C.cyan; ctx.fillText(this.fmt(t.r) + ' RECV', x + 14 + bw, by + 17);
      ctx.textAlign = 'left';
      // monthly sparkline
      const monthly = t.monthly || [];
      if (monthly.length > 1) {
        const spX = x + 14, spY = y + 88, spW = w - 28, spH = 34;
        let mxm = 1; for (const mm of monthly) mxm = Math.max(mxm, mm[1]);
        ctx.strokeStyle = 'rgba(57,255,20,0.9)'; ctx.lineWidth = 1.3; ctx.beginPath();
        monthly.forEach((mm, i) => {
          const px = spX + (i / (monthly.length - 1)) * spW;
          const py = spY + spH - Math.sqrt(mm[1] / mxm) * spH;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.stroke();
      }
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText(t.first + '  \u2192  ' + t.last, x + 14, y + h - 12);
      if (pinned) { ctx.fillStyle = C.amber; ctx.textAlign = 'right'; ctx.fillText('\u25c9 PINNED', x + w - 14, y + h - 12); ctx.textAlign = 'left'; }
    },

    pt_orbits(type, p) {
      const O = this.M.orbits; if (!O) return;
      if (type === 'down') {
        let hit = null, best = 1e9;
        for (const b of O.bodies) { const d = Math.hypot(p.x - b.px, p.y - b.py); if (d < b.size + 10 && d < best) { best = d; hit = b; } }
        if (hit) { O.drag = hit; O.downPos = { x: p.x, y: p.y }; hit.vx = 0; hit.vy = 0; }
      } else if (type === 'move') {
        if (O.drag && this.mouse.down) { O.drag.vx = p.dx * 26; O.drag.vy = p.dy * 26; }
      } else if (type === 'up') {
        if (O.drag) {
          const moved = O.downPos ? Math.hypot(p.x - O.downPos.x, p.y - O.downPos.y) : 0;
          if (moved < 5) O.pinned = (O.pinned === O.drag ? null : O.drag);
          O.drag = null;
        } else O.pinned = null;
      } else if (type === 'leave') { O.drag = null; }
    },

    orbitsScatter() {
      const O = this.M.orbits; if (!O) return;
      for (const b of O.bodies) { const a = Math.random() * Math.PI * 2; const f = 700 + Math.random() * 1100; b.vx = Math.cos(a) * f; b.vy = Math.sin(a) * f; }
    },

    // ============================================================
    // MODULE 04 — ATLAS  (replay a decade of movement)
    // ============================================================
    // Geographic vector data for the NE US corridor Dan inhabits.
    // Simplified polygons/polylines encoded as [lat, lng] pairs.
    ATLAS_GEO: {
      states: [
        { name: 'PA', label: [40.6, -77.2],
          poly: [[42.00,-80.52],[42.00,-79.76],[42.00,-78.70],[42.00,-77.00],
                 [42.00,-75.34],[41.85,-75.26],[41.48,-74.87],[41.08,-74.86],
                 [40.78,-75.04],[40.56,-75.14],[40.30,-74.90],[39.87,-75.44],
                 [39.72,-75.79],[39.72,-76.00],[39.72,-76.98],[39.72,-78.00],
                 [39.72,-79.48],[39.72,-80.52],[40.52,-80.52]] },
        { name: 'NY', label: [43.0, -75.5],
          poly: [[42.00,-79.76],[42.10,-79.76],[43.27,-79.20],[43.63,-76.22],
                 [44.70,-76.00],[45.01,-74.87],[45.01,-72.00],[45.01,-71.50],
                 [44.50,-73.20],[42.80,-73.27],[42.05,-73.50],[41.43,-74.72],
                 [41.22,-74.69],[42.00,-79.76]] },
        { name: 'NJ', label: [40.2, -74.5],
          poly: [[41.36,-74.69],[41.00,-74.84],[40.73,-75.04],
                 [40.37,-74.93],[39.90,-75.04],[39.45,-75.57],
                 [38.93,-75.05],[38.78,-74.90],[39.20,-74.35],
                 [40.07,-73.90],[40.65,-74.00],[40.85,-73.98],
                 [41.36,-74.22],[41.36,-74.69]] },
        { name: 'CT', label: [41.65, -72.7],
          poly: [[42.05,-73.50],[42.05,-71.80],[41.30,-71.80],
                 [41.22,-72.55],[41.10,-73.66],[41.36,-73.72]] },
        { name: 'DE', label: [39.15, -75.5],
          poly: [[39.72,-75.79],[39.72,-75.57],[39.55,-75.57],
                 [38.45,-75.05],[38.45,-75.55]] },
        { name: 'MD', label: [38.8, -77.0],
          poly: [[39.72,-79.48],[39.72,-77.47],[39.72,-75.79],
                 [38.45,-75.05],[37.90,-75.24],[37.90,-76.00],
                 [38.30,-77.00],[38.90,-77.12],[39.60,-77.47]] }
      ],
      rivers: [
        { name: 'HUDSON',      w: 1.8, col: 'rgba(64,140,210,0.50)',
          path: [[40.70,-74.02],[40.80,-73.97],[40.92,-73.95],
                 [41.25,-73.97],[41.52,-73.97],[41.71,-73.95],
                 [42.02,-73.89],[42.64,-73.76],[42.76,-73.64],
                 [43.09,-73.70],[43.27,-73.66],[43.52,-73.37],
                 [44.19,-73.33],[44.73,-73.45],[45.00,-73.34]] },
        { name: 'DELAWARE',    w: 1.4, col: 'rgba(64,140,210,0.42)',
          path: [[42.00,-75.34],[41.50,-74.87],[41.16,-74.88],
                 [40.80,-75.03],[40.55,-75.15],[40.30,-74.92],
                 [40.14,-74.94],[39.88,-75.18],[39.55,-75.56],
                 [39.20,-75.32],[38.80,-75.05]] },
        { name: 'SUSQUEHANNA', w: 1.4, col: 'rgba(64,140,210,0.38)',
          path: [[42.00,-76.83],[41.65,-76.46],[41.27,-76.52],
                 [40.97,-76.46],[40.87,-76.85],[40.55,-76.98],
                 [40.35,-76.75],[40.27,-76.72],[39.97,-76.44],
                 [39.72,-76.40]] },
        { name: 'ALLEGHENY',   w: 1.2, col: 'rgba(64,140,210,0.35)',
          path: [[41.50,-79.30],[40.88,-79.60],[40.78,-79.78],
                 [40.55,-80.05],[40.44,-80.02]] },
        { name: 'MONONGAHELA', w: 1.2, col: 'rgba(64,140,210,0.35)',
          path: [[39.82,-79.95],[39.97,-79.90],[40.10,-79.87],
                 [40.25,-79.90],[40.44,-80.02]] }
      ],
      roads: [
        { name: 'I-76',
          path: [[40.75,-74.97],[40.50,-75.16],[40.12,-75.36],[40.04,-75.49],
                 [40.08,-76.31],[40.04,-76.71],[40.06,-77.05],[40.07,-77.76],
                 [40.07,-78.45],[40.20,-78.76],[40.40,-79.10],[40.44,-80.02]] },
        { name: 'I-80',
          path: [[40.85,-74.00],[40.87,-74.40],[40.88,-75.00],
                 [40.99,-75.64],[41.00,-76.46],[41.02,-77.05],
                 [41.05,-77.75],[41.05,-78.45],[41.08,-79.30],
                 [41.10,-79.76],[41.08,-80.52]] },
        { name: 'I-87',
          path: [[41.43,-73.97],[41.73,-73.97],[42.00,-73.89],
                 [42.45,-73.76],[42.65,-73.76],[43.09,-73.70],
                 [43.27,-73.68],[43.63,-73.56],[44.19,-73.80]] },
        { name: 'I-95',
          path: [[41.35,-74.22],[40.85,-73.98],[40.65,-74.00],
                 [40.07,-74.93],[39.90,-75.04],[39.45,-75.57],
                 [39.10,-75.52],[38.93,-75.05]] }
      ]
    },

    _drawAtlasMap(ctx, W, H, px, py) {
      const GEO = this.ATLAS_GEO;
      ctx.save();

      // land fill — slightly lighter than void bg to distinguish from ocean
      for (const s of GEO.states) {
        ctx.beginPath();
        s.poly.forEach(([la, ln], i) => i ? ctx.lineTo(px(ln), py(la)) : ctx.moveTo(px(ln), py(la)));
        ctx.closePath();
        ctx.fillStyle = 'rgba(18,26,40,0.70)';
        ctx.fill();
      }

      // state outlines — dim cyan glow
      ctx.shadowColor = 'rgba(176,38,255,0.35)';
      ctx.shadowBlur = 5;
      ctx.strokeStyle = 'rgba(176,38,255,0.22)';
      ctx.lineWidth = 1;
      for (const s of GEO.states) {
        ctx.beginPath();
        s.poly.forEach(([la, ln], i) => i ? ctx.lineTo(px(ln), py(la)) : ctx.moveTo(px(ln), py(la)));
        ctx.closePath();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // rivers — blue polylines
      for (const r of GEO.rivers) {
        ctx.beginPath();
        r.path.forEach(([la, ln], i) => i ? ctx.lineTo(px(ln), py(la)) : ctx.moveTo(px(ln), py(la)));
        ctx.strokeStyle = r.col;
        ctx.lineWidth = r.w;
        ctx.stroke();
      }

      // highways — dim dashed lines
      ctx.setLineDash([5, 7]);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(52,66,92,0.32)';
      for (const rd of GEO.roads) {
        ctx.beginPath();
        rd.path.forEach(([la, ln], i) => i ? ctx.lineTo(px(ln), py(la)) : ctx.moveTo(px(ln), py(la)));
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // state labels
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 11px ' + this.MONO;
      for (const s of GEO.states) {
        if (!s.label) continue;
        const x = px(s.label[1]), y = py(s.label[0]);
        if (x < 0 || x > W || y < 0 || y > H) continue;
        ctx.fillStyle = 'rgba(68,88,124,0.60)';
        ctx.fillText(s.name, x, y);
      }

      // river name labels at path midpoints
      ctx.font = '8px ' + this.MONO;
      for (const r of GEO.rivers) {
        const mid = r.path[Math.floor(r.path.length / 2)];
        const x = px(mid[1]), y = py(mid[0]);
        if (x < 10 || x > W - 10 || y < 10 || y > H - 60) continue;
        ctx.fillStyle = 'rgba(50,82,128,0.50)';
        ctx.textAlign = 'center';
        ctx.fillText(r.name, x, y - 7);
      }

      ctx.restore();
    },

    initAtlas() {
      const D = this.D, pl = D.plc.places, tl = D.plc.tl;
      let latMin = 1e9, latMax = -1e9, lngMin = 1e9, lngMax = -1e9, maxDay = 0;
      for (const p of pl) { latMin = Math.min(latMin, p.lat); latMax = Math.max(latMax, p.lat); lngMin = Math.min(lngMin, p.lng); lngMax = Math.max(lngMax, p.lng); }
      for (const v of tl) maxDay = Math.max(maxDay, v[0]);
      const latMid = (latMin + latMax) / 2, lngMid = (lngMin + lngMax) / 2;
      const cosM = Math.cos(latMid * Math.PI / 180);
      const fit = Math.min((this.W * 0.8) / Math.max(0.2, (lngMax - lngMin) * cosM), (this.H * 0.8) / Math.max(0.2, latMax - latMin));
      this.atlasViews = {
        FULL: { lat: latMid, lng: lngMid, zoom: fit },
        FAYETTE: { lat: 39.9, lng: -79.73, zoom: fit * 11 },
        NYC: { lat: 40.765, lng: -73.96, zoom: fit * 13 }
      };
      this.M.atlas = {
        view: { ...this.atlasViews.FULL }, target: { ...this.atlasViews.FULL },
        playDay: maxDay, maxDay, scrub: false, drag: false, heat: new Float32Array(pl.length), hover: -1
      };
    },

    atlasFly(name) { if (this.M.atlas && this.atlasViews[name]) Object.assign(this.M.atlas.target, this.atlasViews[name]); },

    draw_atlas(ctx, W, H, dt) {
      if (!this.M.atlas) this.initAtlas();
      const C = this.COL, A = this.M.atlas, D = this.D, pl = D.plc.places, tl = D.plc.tl;
      const v = A.view, tg = A.target;
      const eFly = Math.min(1, dt * (this.state.atlasLock ? 2.8 : 4.5));
      v.lat  += (tg.lat  - v.lat)  * eFly;
      v.lng  += (tg.lng  - v.lng)  * eFly;
      v.zoom += (tg.zoom - v.zoom) * Math.min(1, dt * (this.state.atlasLock ? 2.2 : 4.5));
      const cx = W / 2, cy = H / 2, cosL = Math.cos(v.lat * Math.PI / 180);
      const px = (lng) => cx + (lng - v.lng) * v.zoom * cosL;
      const py = (lat) => cy - (lat - v.lat) * v.zoom;

      const locked = this.state.atlasLock;
      if (this.state.atlasPlay && !A.scrub) {
        // lock-on mode throttles playback to 6 days/sec so individual days are legible
        const speed = locked ? Math.min(this.state.atlasSpeed, 6) : this.state.atlasSpeed;
        A.playDay += speed * dt;
        if (A.playDay >= A.maxDay) { A.playDay = A.maxDay; this.setState({ atlasPlay: false }); }
      }
      A.heat.fill(0);
      let idx = 0;
      for (; idx < tl.length; idx++) { if (tl[idx][0] > A.playDay) break; A.heat[tl[idx][1]] += tl[idx][3] || 30; }

      // LOCK-ON: every frame recompute today's bounding box and fly the camera to fit it
      if (locked && !A.scrub && !A.drag) {
        const day0 = Math.floor(A.playDay), day1 = day0 + 1;
        let laMin = 1e9, laMax = -1e9, lnMin = 1e9, lnMax = -1e9, found = false;
        for (let i = 0; i < tl.length; i++) {
          const d = tl[i][0];
          if (d < day0 || d >= day1) continue;
          const p = pl[tl[i][1]];
          laMin = Math.min(laMin, p.lat); laMax = Math.max(laMax, p.lat);
          lnMin = Math.min(lnMin, p.lng); lnMax = Math.max(lnMax, p.lng);
          found = true;
        }
        if (found) {
          const pad = 0.04; // degrees padding
          const laSpan = Math.max(laMax - laMin + pad * 2, 0.02);
          const lnSpan = Math.max(lnMax - lnMin + pad * 2, 0.02);
          const cosM = Math.cos(((laMin + laMax) / 2) * Math.PI / 180);
          const fitZoom = Math.min((W * 0.82) / (lnSpan * cosM), (H * 0.82) / laSpan);
          // cap zoom: never wider than the FULL view, never tighter than street-level
          const { FULL } = this.atlasViews;
          const clampedZoom = Math.max(FULL.zoom, Math.min(fitZoom, 28000));
          tg.lat = (laMin + laMax) / 2;
          tg.lng = (lnMin + lnMax) / 2;
          tg.zoom = clampedZoom;
        }
      }

      // terrain map (drawn before dots so dots sit on top)
      if (this.state.atlasMap) this._drawAtlasMap(ctx, W, H, px, py);

      // graticule \u2014 slightly more subtle when map is showing
      const gAlpha = this.state.atlasMap ? 0.5 : 0.9;
      ctx.strokeStyle = `rgba(22,28,38,${gAlpha})`; ctx.lineWidth = 1;
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = 'rgba(61,69,84,0.7)'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      const latStep = v.zoom > 2000 ? 0.1 : 0.5, lngStep = v.zoom > 2000 ? 0.1 : 1;
      for (let lat = 38; lat <= 43; lat += latStep) { const y = py(lat); if (y < 0 || y > H) continue; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); if (!this.state.atlasMap) ctx.fillText(lat.toFixed(1) + '\u00b0N', 6, y - 2); }
      for (let lng = -81; lng <= -72; lng += lngStep) { const x = px(lng); if (x < 0 || x > W) continue; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

      // accumulated places
      let maxHeat = 1; for (let i = 0; i < pl.length; i++) if (A.heat[i] > maxHeat) maxHeat = A.heat[i];
      A.screen = A.screen || new Float32Array(pl.length * 2);
      for (let i = 0; i < pl.length; i++) {
        const x = px(pl[i].lng), y = py(pl[i].lat);
        A.screen[i * 2] = x; A.screen[i * 2 + 1] = y;
        if (A.heat[i] === 0 || x < -24 || x > W + 24 || y < -24 || y > H + 24) continue;
        const t = A.heat[i] / maxHeat;
        const r = 1.8 + Math.sqrt(t) * 17;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(176,38,255,' + (0.08 + t * 0.30).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, r * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = i === A.hover ? '#ffffff' : 'rgba(166,230,255,0.85)'; ctx.fill();
      }
      // travelling pen trail
      const trailN = 70, start = Math.max(1, idx - trailN);
      ctx.lineWidth = 1.2;
      for (let i = start; i < idx; i++) {
        const a = tl[i - 1][1], b = tl[i][1];
        if (a === b) continue;
        const age = (i - start) / trailN;
        ctx.strokeStyle = 'rgba(57,255,20,' + (age * 0.55).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(A.screen[a * 2], A.screen[a * 2 + 1]); ctx.lineTo(A.screen[b * 2], A.screen[b * 2 + 1]); ctx.stroke();
      }
      if (idx > 0) {
        const last = tl[idx - 1][1];
        const x = A.screen[last * 2], y = A.screen[last * 2 + 1];
        const pr = 6 + Math.sin(performance.now() / 180) * 2;
        // radar pulse rings — amber normally, cyan when locked for visual distinction
        const t = performance.now() / 1000;
        const ringHz = locked ? 0.9 : 0.45;
        const ringR  = locked ? 60  : 90;
        const ringCol = locked ? '79,195,232' : '232,163,61';
        for (let ring = 0; ring < 4; ring++) {
          const phase = ((t * ringHz + ring * 0.25) % 1);
          const rr = 14 + phase * ringR;
          const al = (1 - phase) * (ring === 0 ? 0.55 : 0.32);
          ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${ringCol},${al.toFixed(3)})`; ctx.lineWidth = ring === 0 ? 1.5 : 0.9;
          ctx.stroke();
        }
        // crosshair lines through current position
        ctx.strokeStyle = 'rgba(57,255,20,0.10)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 55); ctx.stroke();
        ctx.setLineDash([]);
        // current position dot + ring
        ctx.strokeStyle = C.amberHi; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, pr + 3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = C.amberHi; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
        // coordinate readout at current position
        if (this.state.atlasMap) {
          const cosLc = Math.cos(v.lat * Math.PI / 180);
          const cLat = v.lat - (y - cy) / v.zoom, cLng = v.lng + (x - cx) / (v.zoom * cosLc);
          ctx.font = '8px ' + this.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.fillStyle = 'rgba(255,210,138,0.55)';
          ctx.fillText(Math.abs(cLat).toFixed(3) + '°N  ' + Math.abs(cLng).toFixed(3) + '°W', x + 14, y - 4);
        }
      }
      // LOCK-ON HUD — badge + today's fix count and date span
      if (locked) {
        const day0 = Math.floor(A.playDay);
        let fixes = 0, todayPlaces = new Set();
        for (let i = 0; i < tl.length; i++) {
          const d = tl[i][0];
          if (d < day0 || d >= day0 + 1) continue;
          fixes++; todayPlaces.add(tl[i][1]);
        }
        const ms = Date.UTC(2014, 0, 1) + A.playDay * 86400000;
        const dd = new Date(ms);
        const MO = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const dateStr = MO[dd.getUTCMonth()] + ' ' + String(dd.getUTCDate()).padStart(2,'0') + ' ' + dd.getUTCFullYear();
        // badge background
        ctx.fillStyle = 'rgba(8,12,22,0.78)';
        ctx.fillRect(W - 210, 14, 196, 48);
        ctx.strokeStyle = 'rgba(176,38,255,0.45)'; ctx.lineWidth = 1;
        ctx.strokeRect(W - 210 + 0.5, 14.5, 195, 47);
        // label
        ctx.font = '600 9px ' + this.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = C.cyan;
        ctx.fillText('⊕ LOCK ON · ' + dateStr, W - 202, 22);
        ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(fixes + ' FIX' + (fixes !== 1 ? 'ES' : '') + ' · ' + todayPlaces.size + ' LOCATION' + (todayPlaces.size !== 1 ? 'S' : '') + ' · ' + (fixes === 0 ? 'NO DATA' : 'TRACKING'), W - 202, 38);
      }
      // live crosshair at mouse when not hovering a point (map mode)
      if (this.state.atlasMap && A.hover < 0 && this.mouse.x > 0 && this.mouse.y < H - 56) {
        const cosLm = Math.cos(v.lat * Math.PI / 180);
        const mLat = v.lat - (this.mouse.y - cy) / v.zoom;
        const mLng = v.lng + (this.mouse.x - cx) / (v.zoom * cosLm);
        ctx.strokeStyle = 'rgba(176,38,255,0.10)'; ctx.lineWidth = 1;
        ctx.setLineDash([3, 7]);
        ctx.beginPath(); ctx.moveTo(0, this.mouse.y); ctx.lineTo(W, this.mouse.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(this.mouse.x, 0); ctx.lineTo(this.mouse.x, H - 56); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '8px ' + this.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(176,38,255,0.48)';
        ctx.fillText(Math.abs(mLat).toFixed(3) + '°N  ' + Math.abs(mLng).toFixed(3) + '°W', this.mouse.x + 7, this.mouse.y + 4);
      }
      // hub labels
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '8.5px ' + this.MONO;
      for (let i = 0; i < Math.min(pl.length, 60); i++) {
        if (pl[i].c < 100 || A.heat[i] === 0) continue;
        const x = A.screen[i * 2], y = A.screen[i * 2 + 1];
        if (x < 30 || x > W - 30 || y < 20 || y > H) continue;
        ctx.fillStyle = 'rgba(232,230,225,0.5)';
        ctx.fillText(((pl[i].n || (pl[i].a || '').split(',')[0]) + '').slice(0, 24), x, y - 9);
      }

      // hover
      A.hover = -1; let best = 13;
      if (this.mouse.y < H - 56) {
        for (let i = 0; i < pl.length; i++) {
          if (A.heat[i] === 0) continue;
          const d = Math.hypot(this.mouse.x - A.screen[i * 2], this.mouse.y - A.screen[i * 2 + 1]);
          if (d < best) { best = d; A.hover = i; }
        }
      }
      if (A.hover >= 0) {
        const p = pl[A.hover];
        this.card(ctx, this.mouse.x, this.mouse.y, [
          [((p.n || (p.a || '').split(',')[0]) + '').slice(0, 30), C.txt, '600 11px ' + this.MONO],
          [(p.a || '').slice(0, 38), C.dim, '9px ' + this.MONO],
          [this.fmt(p.c) + ' VISITS \u00b7 ' + this.fmtHrs(p.min) + ' OF LIFE', C.cyan],
          [p.first + ' \u2192 ' + p.last, C.faint, '8px ' + this.MONO]
        ]);
      }
      this.atlasScrubber(ctx, W, H);
    },

    fmtHrs(min) { const h = min / 60; return h >= 72 ? this.fmt(Math.round(h / 24)) + ' DAYS' : this.fmt(Math.round(h)) + ' HRS'; },

    atlasScrubber(ctx, W, H) {
      const C = this.COL, A = this.M.atlas;
      const x = 20, w = W - 40, y = H - 34, h = 6;
      A.scrubGeo = { x, w, y };
      ctx.fillStyle = '#2a0a45'; ctx.fillRect(x, y, w, h);
      const f = A.playDay / A.maxDay;
      ctx.fillStyle = 'rgba(57,255,20,0.85)'; ctx.fillRect(x, y, w * f, h);
      ctx.fillStyle = C.amberHi; ctx.beginPath(); ctx.arc(x + w * f, y + h / 2, 7, 0, Math.PI * 2); ctx.fill();
      const ms = Date.UTC(2014, 0, 1) + A.playDay * 86400000;
      const d = new Date(ms);
      const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(M[d.getUTCMonth()] + ' ' + String(d.getUTCDate()).padStart(2, '0') + ' ' + d.getUTCFullYear(), x, y - 10);
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint; ctx.textAlign = 'right';
      ctx.fillText('AUG 2014 \u2014 JUN 2026 \u00b7 6,185 FIXES', x + w, y - 10);
    },

    pt_atlas(type, p, e) {
      const A = this.M.atlas; if (!A) return;
      const g = A.scrubGeo;
      if (type === 'down') {
        if (g && p.y > g.y - 14) {
          A.scrub = true;
          A.playDay = Math.max(0, Math.min(1, (p.x - g.x) / g.w)) * A.maxDay;
        } else A.drag = true;
      } else if (type === 'move' && this.mouse.down) {
        if (A.scrub && g) {
          A.playDay = Math.max(0, Math.min(1, (p.x - g.x) / g.w)) * A.maxDay;
        } else if (A.drag) {
          const cosL = Math.cos(A.view.lat * Math.PI / 180);
          A.target.lng -= p.dx / (A.view.zoom * cosL); A.target.lat += p.dy / A.view.zoom;
          A.view.lng = A.target.lng; A.view.lat = A.target.lat;
        }
      } else if (type === 'up' || type === 'leave') {
        A.scrub = false; A.drag = false;
      } else if (type === 'wheel') {
        const f = Math.exp(-e.deltaY * 0.0016);
        const cosL = Math.cos(A.view.lat * Math.PI / 180);
        const wx = A.view.lng + (p.x - this.W / 2) / (A.view.zoom * cosL);
        const wy = A.view.lat - (p.y - this.H / 2) / A.view.zoom;
        A.target.zoom = Math.max(20, Math.min(80000, A.view.zoom * f));
        A.target.lng = wx - (p.x - this.W / 2) / (A.target.zoom * cosL);
        A.target.lat = wy + (p.y - this.H / 2) / A.target.zoom;
      } else if (type === 'dbl') {
        Object.assign(A.target, this.atlasViews.FULL);
      }
    },

    // ============================================================
    // MODULE 05 — LEXICON  (physics word cloud + caps seismograph)
    // ============================================================
    initLexicon() {
      const D = this.D, W = this.W, H = this.H;
      const words = D.msg.words.slice(0, 90);
      const maxC = words[0][1];
      const seisH = 96;
      const nodes = words.map(([w, c], i) => {
        const fs = 11 + Math.sqrt(c / maxC) * 46;
        return {
          w, c, fs, r: fs * (0.36 + w.length * 0.052),
          x: W / 2 + (Math.random() - 0.5) * W * 0.7,
          y: (H - seisH) / 2 + (Math.random() - 0.5) * (H - seisH) * 0.6,
          vx: 0, vy: 0, sig: ['fucking', 'lol', 'love', 'sorry', 'annie', 'shit', 'fuck'].includes(w)
        };
      });
      this.M.lexicon = { nodes, seisH, drag: null, pinned: null, hover: null, mode: this.state.lexMode };
    },

    lexSetMode(mode) {
      const L = this.M.lexicon; if (!L) return;
      L.mode = mode;
      if (mode === 'rain') for (const n of L.nodes) { n.y = -Math.random() * this.H * 1.5; n.vy = 0; n.vx = 0; }
    },

    draw_lexicon(ctx, W, H, dt) {
      if (!this.M.lexicon || this._lexW !== W + 'x' + H) { this._lexW = W + 'x' + H; this.initLexicon(); }
      const C = this.COL, L = this.M.lexicon;
      dt = Math.min(dt, 0.03);
      const floor = H - L.seisH - 8;
      const cx = W / 2, cy = floor / 2;
      // physics
      for (const n of L.nodes) {
        if (L.drag === n) { n.x = this.mouse.x; n.y = this.mouse.y; continue; }
        if (L.mode === 'pack') {
          n.vx += (cx - n.x) * 0.9 * dt;
          n.vy += (cy - n.y) * 0.9 * dt;
        } else {
          n.vy += 600 * dt; // gravity
          if (n.y + n.r * 0.45 > floor) { n.y = floor - n.r * 0.45; n.vy *= -0.35; n.vx *= 0.92; }
          if (n.x - n.r < 0) { n.x = n.r; n.vx *= -0.5; }
          if (n.x + n.r > W) { n.x = W - n.r; n.vx *= -0.5; }
        }
        const damp = Math.pow(L.mode === 'pack' ? 0.86 : 0.995, dt * 60);
        n.vx *= damp; n.vy *= damp;
        n.x += n.vx * dt; n.y += n.vy * dt;
      }
      // collisions (3 passes, ellipse-ish via radius)
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < L.nodes.length; i++) {
          const a = L.nodes[i];
          for (let j = i + 1; j < L.nodes.length; j++) {
            const b = L.nodes[j];
            const dx = b.x - a.x, dy = (b.y - a.y) * 1.9;
            const d = Math.hypot(dx, dy) || 0.01;
            const min = (a.r + b.r) * 0.62;
            if (d < min) {
              const push = (min - d) / d * 0.5;
              const pxx = dx * push, pyy = dy * push / 1.9;
              if (L.drag !== a) { a.x -= pxx; a.y -= pyy; }
              if (L.drag !== b) { b.x += pxx; b.y += pyy; }
            }
          }
        }
      }
      // hover
      L.hover = null;
      for (const n of L.nodes) {
        if (Math.abs(this.mouse.x - n.x) < n.r * 0.62 && Math.abs(this.mouse.y - n.y) < n.fs * 0.65) { L.hover = n; break; }
      }
      if (this.cv) this.cv.style.cursor = L.drag ? 'grabbing' : (L.hover ? 'grab' : 'crosshair');
      // draw words
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const n of L.nodes) {
        const lit = n === L.hover || n === L.pinned;
        ctx.font = (n.fs > 26 ? '700 ' : '500 ') + n.fs.toFixed(1) + 'px ' + this.GROT;
        if (lit) ctx.fillStyle = C.amberHi;
        else if (n.sig) ctx.fillStyle = 'rgba(57,255,20,0.95)';
        else { const t = Math.min(1, n.fs / 40); ctx.fillStyle = 'rgba(' + Math.round(140 + t * 92) + ',' + Math.round(146 + t * 84) + ',' + Math.round(160 + t * 65) + ',' + (0.5 + t * 0.5).toFixed(2) + ')'; }
        ctx.fillText(n.w, n.x, n.y);
      }
      const show = L.pinned || L.hover;
      if (show) {
        const per = show.c / this.D.msg.totals.sent;
        this.card(ctx, this.mouse.x >= 0 ? this.mouse.x : show.x, this.mouse.y >= 0 ? this.mouse.y : show.y, [
          ['\u201c' + show.w + '\u201d', C.amberHi, '700 14px ' + this.GROT],
          [this.fmt(show.c) + ' USES IN SENT MESSAGES', C.txt],
          ['ONCE EVERY ' + Math.round(1 / per) + ' MESSAGES', C.dim, '9px ' + this.MONO]
        ], { border: show === L.pinned ? C.amber : C.line });
      }
      this.lexSeismograph(ctx, W, H);
    },

    lexSeismograph(ctx, W, H) {
      const C = this.COL, D = this.D, L = this.M.lexicon;
      const sy = H - L.seisH, sh = L.seisH;
      ctx.fillStyle = '#1a0033'; ctx.fillRect(0, sy, W, sh);
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(0, sy + 0.5); ctx.lineTo(W, sy + 0.5); ctx.stroke();
      const caps = D.msg.caps;
      if (!caps || !caps.length) return;
      const m0 = caps[0][0], m1 = caps[caps.length - 1][0];
      const mIdx = (m) => (+m.slice(0, 4) - +m0.slice(0, 4)) * 12 + (+m.slice(5, 7) - +m0.slice(5, 7));
      const span = mIdx(m1) + 1;
      let mx = 1; for (const [, c] of caps) mx = Math.max(mx, c);
      const base = sy + sh - 16;
      // hover
      let hoverI = -1;
      if (this.mouse.y > sy) hoverI = Math.floor(this.mouse.x / W * span);
      for (const [m, c] of caps) {
        const i = mIdx(m);
        const x = (i / span) * W, bw = Math.max(1.5, W / span - 1);
        const hh = Math.pow(c / mx, 0.6) * (sh - 26);
        const isH = i === hoverI;
        ctx.fillStyle = isH ? C.amberHi : 'rgba(224,26,255,' + (0.35 + (c / mx) * 0.6).toFixed(2) + ')';
        ctx.fillRect(x, base - hh, bw, hh);
        if (isH) {
          this.card(ctx, this.mouse.x, sy - 4, [
            [m, C.txt, '600 11px ' + this.MONO],
            [this.fmt(c) + ' ALL-CAPS BURSTS', C.red]
          ]);
        }
      }
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('SHOUT SEISMOGRAPH \u00b7 ALL-CAPS EVENTS PER MONTH \u00b7 2011 \u2192 2026', 10, sy + 14);
      // year ticks
      ctx.textAlign = 'center';
      for (let y = 2012; y <= 2026; y += 2) {
        const i = mIdx(y + '-01');
        if (i < 0 || i > span) continue;
        ctx.fillStyle = C.faint;
        ctx.fillText("'" + String(y).slice(2), (i / span) * W, base + 12);
      }
    },

    pt_lexicon(type, p) {
      const L = this.M.lexicon; if (!L) return;
      if (type === 'down') {
        let hit = null;
        for (const n of L.nodes) if (Math.abs(p.x - n.x) < n.r * 0.62 && Math.abs(p.y - n.y) < n.fs * 0.65) { hit = n; break; }
        if (hit) { L.drag = hit; L.downPos = { x: p.x, y: p.y }; hit.vx = 0; hit.vy = 0; }
      } else if (type === 'move') {
        if (L.drag && this.mouse.down) { L.drag.vx = p.dx * 30; L.drag.vy = p.dy * 30; }
      } else if (type === 'up') {
        if (L.drag) {
          const moved = L.downPos ? Math.hypot(p.x - L.downPos.x, p.y - L.downPos.y) : 0;
          if (moved < 5) L.pinned = (L.pinned === L.drag ? null : L.drag);
          L.drag = null;
        } else L.pinned = null;
      } else if (type === 'leave') { L.drag = null; }
    },

    // ============================================================
    // MODULE 06 — SHELF  (1,121 rated works: him vs the world)
    // ============================================================
    CAT_COLORS: { Music: '#39ff14', Book: '#b026ff', Movie: '#e01aff', Art: '#00ffa3', Other: '#7b2dff' },

    catOf(c) {
      if (/music|album|song/i.test(c)) return 'Music';
      if (/book|lit/i.test(c)) return 'Book';
      if (/movie|film/i.test(c)) return 'Movie';
      if (/art|paint/i.test(c)) return 'Art';
      return 'Other';
    },

    initShelf() {
      const D = this.D;
      const items = D.fav.filter(f => f.m > 0 && f.g > 0).map(f => ({
        ...f, cat: this.catOf(f.c),
        jx: (Math.random() - 0.5), jy: (Math.random() - 0.5),
        born: Math.random()
      }));
      this.M.shelf = { items, pinned: null, hover: null, reveal: 0 };
    },

    draw_shelf(ctx, W, H, dt) {
      if (!this.M.shelf) this.initShelf();
      const C = this.COL, S = this.M.shelf;
      S.reveal = Math.min(1, S.reveal + dt * 0.55);
      const padL = 70, padR = 40, padT = 46, padB = 64;
      const pw = W - padL - padR, ph = H - padT - padB;
      const fcat = this.state.shelfCat;
      // axes: x = world avg (1..10), y = my rating (1..10)
      const X = (g) => padL + ((g - 1) / 9) * pw;
      const Y = (m) => padT + (1 - (m - 1) / 9) * ph;
      // grid
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
      for (let v = 1; v <= 10; v++) {
        ctx.beginPath(); ctx.moveTo(X(v), padT); ctx.lineTo(X(v), padT + ph); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(padL + pw, Y(v)); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(String(v), X(v), padT + ph + 8);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(v), padL - 8, Y(v));
      }
      // agreement diagonal
      ctx.strokeStyle = 'rgba(232,230,225,0.22)'; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(X(1), Y(1)); ctx.lineTo(X(10), Y(10)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '9px ' + this.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.save();
      ctx.translate(X(5.4), Y(5.9)); ctx.rotate(-Math.atan2(ph / 9, pw / 9));
      ctx.fillStyle = 'rgba(232,230,225,0.35)';
      ctx.fillText('PERFECT AGREEMENT WITH THE WORLD', 0, -6);
      ctx.restore();
      // zone labels
      ctx.fillStyle = 'rgba(0,255,163,0.5)'; ctx.font = '10px ' + this.MONO;
      ctx.fillText('DEFENDED \u2014 LOVED MORE THAN THE WORLD DID', padL + 10, padT + 16);
      ctx.fillStyle = 'rgba(224,26,255,0.5)'; ctx.textAlign = 'right';
      ctx.fillText('BETRAYED \u2014 THE WORLD OVERRATES THESE', padL + pw - 6, padT + ph - 10);
      ctx.textAlign = 'left';
      // axis titles
      ctx.fillStyle = C.dim; ctx.font = '9px ' + this.MONO;
      ctx.textAlign = 'center';
      ctx.fillText('THE WORLD\u2019S AVERAGE RATING \u2192', padL + pw / 2, H - 18);
      ctx.save(); ctx.translate(20, padT + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('HIS RATING \u2192', 0, 0); ctx.restore();

      // dots
      S.hover = null;
      let best = 12;
      const mx = this.mouse.x, my = this.mouse.y;
      for (const it of S.items) {
        if (it.born > S.reveal) continue;
        const on = fcat === 'ALL' || it.cat.toUpperCase() === fcat;
        const x = X(Math.min(10, it.g)) + it.jx * 7, y = Y(Math.min(10, it.m)) + it.jy * 7;
        it._x = x; it._y = y;
        if (on) {
          const d = Math.hypot(mx - x, my - y);
          if (d < best) { best = d; S.hover = it; }
        }
      }
      for (const it of S.items) {
        if (it.born > S.reveal) continue;
        const on = fcat === 'ALL' || it.cat.toUpperCase() === fcat;
        const lit = it === S.hover || it === S.pinned;
        const col = this.CAT_COLORS[it.cat];
        const pop = Math.min(1, (S.reveal - it.born) * 8);
        const r = (lit ? 6.5 : 2.6 + (it.n > 1000 ? 1.2 : 0)) * pop;
        ctx.beginPath(); ctx.arc(it._x, it._y, r, 0, Math.PI * 2);
        if (!on) { ctx.fillStyle = 'rgba(60,68,82,0.25)'; }
        else if (lit) { ctx.fillStyle = '#ffffff'; }
        else {
          const dev = it.m - it.g; // + defended, - betrayed
          const alpha = 0.35 + Math.min(0.6, Math.abs(dev) * 0.13);
          ctx.fillStyle = col + Math.round(alpha * 255).toString(16).padStart(2, '0');
        }
        ctx.fill();
        if (lit && on) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it._x, it._y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
      }
      // legend
      let lx = padL;
      ctx.textBaseline = 'middle'; ctx.font = '9px ' + this.MONO;
      for (const [cat, col] of Object.entries(this.CAT_COLORS)) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx + 4, 24, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.dim; ctx.textAlign = 'left'; ctx.fillText(cat.toUpperCase(), lx + 12, 24);
        lx += 12 + ctx.measureText(cat.toUpperCase()).width + 22;
      }
      const show = S.pinned || S.hover;
      if (show) {
        const dev = show.m - show.g;
        this.card(ctx, mx >= 0 ? mx : show._x, my >= 0 ? my : show._y, [
          [show.t.slice(0, 40), C.txt, '700 12px ' + this.GROT],
          [(show.a || '').slice(0, 36), C.dim, '9px ' + this.MONO],
          ['HIM ' + show.m.toFixed(1) + '  \u00b7  WORLD ' + show.g.toFixed(1) + '  (' + this.fmt(show.n) + ' RATINGS)', this.CAT_COLORS[show.cat]],
          [dev > 0.4 ? '\u25b2 DEFENDED BY ' + dev.toFixed(1) : dev < -0.4 ? '\u25bc DISSENTS BY ' + (-dev).toFixed(1) : '\u25cf IN AGREEMENT', dev > 0.4 ? C.green : dev < -0.4 ? C.red : C.dim, '9px ' + this.MONO]
        ], { border: show === S.pinned ? C.amber : C.line });
      }
    },

    pt_shelf(type, p) {
      const S = this.M.shelf; if (!S) return;
      if (type === 'down') {
        if (S.hover) S.pinned = (S.pinned === S.hover ? null : S.hover);
        else S.pinned = null;
      }
    },

    // ============================================================
    // MODULE 07 — WEATHER  (rhetorical climate streamgraph + lightning)
    // ============================================================
    WLAYERS: [
      ['love', 'LOVE', '#c77dff'],
      ['prof', 'PROFANITY', '#e01aff'],
      ['sorry', 'APOLOGY', '#00ffa3'],
      ['qual', 'HEDGING', '#b026ff'],
      ['imp', 'COMMAND', '#39ff14'],
      ['caps', 'SHOUT', '#e9ffe6']
    ],

    initWeather() {
      const D = this.D, rd = D.rhet;
      const day0 = this.d2i(rd[0].date);
      const dayN = this.d2i(rd[rd.length - 1].date);
      const nW = Math.floor((dayN - day0) / 7) + 1;
      const keys = this.WLAYERS.map(l => l[0]);
      const sums = {}, msgs = new Float32Array(nW);
      for (const k of keys) sums[k] = new Float32Array(nW);
      for (const d of rd) {
        const w = Math.floor((this.d2i(d.date) - day0) / 7);
        msgs[w] += d.total;
        for (const k of keys) sums[k][w] += d[k] || 0;
      }
      // 3-week smoothing into raw + rate matrices
      const smooth = (arr) => {
        const out = new Float32Array(nW);
        for (let i = 0; i < nW; i++) {
          let s = 0, n = 0;
          for (let j = Math.max(0, i - 1); j <= Math.min(nW - 1, i + 1); j++) { s += arr[j]; n++; }
          out[i] = s / n;
        }
        return out;
      };
      const raw = {}, rate = {};
      const msgsS = smooth(msgs);
      for (const k of keys) {
        raw[k] = smooth(sums[k]);
        rate[k] = new Float32Array(nW);
        for (let i = 0; i < nW; i++) rate[k][i] = msgsS[i] > 3 ? raw[k][i] / msgsS[i] * 100 : 0;
      }
      const events = D.rhetEvents.map(ev => ({ ...ev, w: (this.d2i(ev.date) - day0) / 7 })).sort((a, b) => b.intensity_score - a.intensity_score);
      this.M.weather = { day0, nW, raw, rate, msgs, events, a: 0, b: nW, ta: 0, tb: nW, hoverEv: null };
    },

    draw_weatherStorm(ctx, W, H, dt) {
      if (!this.M.weather) this.initWeather();
      const C = this.COL, Wt = this.M.weather, st = this.state;
      Wt.a += (Wt.ta - Wt.a) * Math.min(1, dt * 10);
      Wt.b += (Wt.tb - Wt.b) * Math.min(1, dt * 10);
      const span = Math.max(2, Wt.b - Wt.a);
      const padT = 60, padB = 60;
      const mid = (H - padB + padT) / 2, halfH = (H - padB - padT) / 2 - 10;
      const xOf = (w) => ((w - Wt.a) / span) * W;
      const data = st.weatherMode === 'rate' ? Wt.rate : Wt.raw;
      const on = this.WLAYERS.filter(l => st.weatherLayers[l[0]]);
      // max stack
      let mx = 0.001;
      for (let i = Math.max(0, Math.floor(Wt.a)); i < Math.min(Wt.nW, Math.ceil(Wt.b)); i++) {
        let s = 0; for (const [k] of on) s += data[k][i];
        mx = Math.max(mx, s);
      }
      const SC = (halfH * 2) / mx;
      // year grid
      ctx.font = '10px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let y = 2011; y <= 2027; y++) {
        const w = (this.d2i(y + '-01-01') - Wt.day0) / 7;
        const x = xOf(w);
        if (x < -30 || x > W + 30) continue;
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x, padT - 14); ctx.lineTo(x, H - padB + 10); ctx.stroke();
        ctx.fillStyle = C.dim; ctx.fillText(String(y), x, H - padB + 16);
      }
      // streamgraph: centered stack
      const i0 = Math.max(0, Math.floor(Wt.a) - 1), i1 = Math.min(Wt.nW - 1, Math.ceil(Wt.b) + 1);
      const totalAt = (i) => { let s = 0; for (const [k] of on) s += data[k][i]; return s; };
      let baseline = new Float32Array(i1 - i0 + 1);
      for (let i = i0; i <= i1; i++) baseline[i - i0] = mid - totalAt(i) * SC / 2;
      for (const [k, label, col] of on) {
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const x = xOf(i), y = baseline[i - i0];
          i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        for (let i = i1; i >= i0; i--) {
          const y = baseline[i - i0] + data[k][i] * SC;
          ctx.lineTo(xOf(i), y);
        }
        ctx.closePath();
        ctx.fillStyle = col + 'cc';
        ctx.fill();
        for (let i = i0; i <= i1; i++) baseline[i - i0] += data[k][i] * SC;
      }
      // lightning strikes
      Wt.hoverEv = null;
      const evShow = Wt.events.slice(0, 50);
      for (const ev of evShow) {
        const x = xOf(ev.w);
        if (x < -10 || x > W + 10) continue;
        const inten = Math.min(1, ev.intensity_score / 405);
        const topY = padT - 8, botY = mid - totalAt(Math.max(i0, Math.min(i1, Math.round(ev.w)))) * SC / 2 - 6;
        const near = Math.abs(this.mouse.x - x) < 8 && this.mouse.y < mid;
        if (near) Wt.hoverEv = { ...ev, x };
        const flick = near ? 1 : (0.55 + 0.45 * Math.sin(performance.now() / 300 + ev.w));
        ctx.strokeStyle = 'rgba(255,235,180,' + (0.25 + inten * 0.6) * flick + ')';
        ctx.lineWidth = near ? 2 : 1 + inten;
        ctx.beginPath();
        let yy = topY, xx = x;
        ctx.moveTo(xx, yy);
        const segs = 4;
        for (let s2 = 1; s2 <= segs; s2++) {
          yy = topY + (botY - topY) * (s2 / segs);
          xx = x + (s2 === segs ? 0 : (s2 % 2 ? -1 : 1) * (3 + inten * 5));
          ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      // legend
      let lx = 14;
      ctx.textBaseline = 'middle'; ctx.font = '9px ' + this.MONO; ctx.textAlign = 'left';
      for (const [k, label, col] of this.WLAYERS) {
        const onL = st.weatherLayers[k];
        ctx.fillStyle = onL ? col : '#2a3240';
        ctx.fillRect(lx, 22, 9, 9);
        ctx.fillStyle = onL ? C.dim : C.faint;
        ctx.fillText(label, lx + 14, 27);
        lx += 14 + ctx.measureText(label).width + 20;
      }
      ctx.fillStyle = C.faint;
      ctx.fillText(st.weatherMode === 'rate' ? 'PER 100 MESSAGES \u00b7 WEEKLY' : 'RAW COUNTS \u00b7 WEEKLY', lx + 10, 27);
      // hover
      const mxx = this.mouse.x, myy = this.mouse.y;
      if (Wt.hoverEv) {
        const ev = Wt.hoverEv;
        this.card(ctx, ev.x, padT + 30, [
          ['\u26a1 ' + ev.date + ' \u00b7 INTENSITY ' + Math.round(ev.intensity_score), C.amberHi, '600 11px ' + this.MONO],
          [this.fmt(ev.total) + ' MSGS IN ONE DAY \u00b7 ' + Math.round(ev.sent_ratio * 100) + '% HIM', C.txt],
          [ev.prof + ' PROFANITIES \u00b7 ' + ev.caps + ' SHOUTS \u00b7 ' + ev.love + ' LOVES', C.red],
          [ev.qual + ' HEDGES \u00b7 ' + ev.imp + ' COMMANDS \u00b7 ' + ev.q + ' QUESTIONS', C.cyan]
        ], { border: C.amber });
      } else if (mxx >= 0 && myy > padT && myy < H - padB) {
        const wi = Math.round(Wt.a + (mxx / W) * span);
        if (wi >= 0 && wi < Wt.nW) {
          ctx.strokeStyle = 'rgba(232,230,225,0.2)'; ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(mxx, padT); ctx.lineTo(mxx, H - padB); ctx.stroke();
          ctx.setLineDash([]);
          const d = this.i2d(Wt.day0 + wi * 7);
          const lines = [[this.fmtDate(Wt.day0 + wi * 7), C.txt, '600 11px ' + this.MONO]];
          for (const [k, label, col] of on) {
            const v = data[k][wi];
            if (v > 0.01) lines.push([label + '  ' + (st.weatherMode === 'rate' ? v.toFixed(1) + ' /100' : Math.round(v) + '/wk'), col]);
          }
          lines.push([Math.round(Wt.msgs[wi]) + ' MSGS THAT WEEK', C.faint, '8px ' + this.MONO]);
          this.card(ctx, mxx, myy, lines);
        }
      }
    },

    pt_weatherStorm(type, p, e) {
      const Wt = this.M.weather; if (!Wt) return;
      const span = Wt.tb - Wt.ta;
      if (type === 'move' && this.mouse.down) {
        const d = (p.dx / this.W) * span;
        Wt.ta -= d; Wt.tb -= d;
        this.weatherClamp();
      } else if (type === 'wheel') {
        const f = Math.exp(e.deltaY * 0.0016);
        const pivot = Wt.ta + (p.x / this.W) * span;
        Wt.ta = pivot - (pivot - Wt.ta) * f;
        Wt.tb = pivot + (Wt.tb - pivot) * f;
        this.weatherClamp();
      } else if (type === 'dbl') {
        Wt.ta = 0; Wt.tb = Wt.nW;
      } else if (type === 'down' && Wt.hoverEv) {
        const c = Wt.hoverEv.w;
        Wt.ta = c - 10; Wt.tb = c + 10;
        this.weatherClamp();
      }
    },

    weatherClamp() {
      const Wt = this.M.weather;
      const span = Math.max(6, Math.min(Wt.nW, Wt.tb - Wt.ta));
      if (Wt.ta < -span * 0.1) Wt.ta = -span * 0.1;
      Wt.tb = Wt.ta + span;
      if (Wt.tb > Wt.nW + span * 0.1) { Wt.tb = Wt.nW + span * 0.1; Wt.ta = Wt.tb - span; }
    },

    // ============================================================
    // MODULE 08 — POLYGRAPH  (the full-corpus four-pen instrument ·
    // same Annie-pattern pens, every thread, 181,650 messages)
    // ============================================================
    APENS: [
      ['love', 'LOVE', '#c77dff'],
      ['prof', 'PROFANITY', '#e01aff'],
      ['sorry', 'APOLOGY', '#00ffa3'],
      ['caps', 'SHOUT', '#e9ffe6']
    ],

    initAnnie() {
      const D = this.D;
      const mIdx = (m) => +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1);
      // month range = the full message corpus (2011 → 2026)
      const m0 = mIdx(D.msg.monthly[0][0]);
      const m1 = mIdx(D.msg.monthly[D.msg.monthly.length - 1][0]);
      const nM = m1 - m0 + 1;
      // volume: every message, sent + received
      const vol = new Float32Array(nM);
      for (const [m, s, r] of D.msg.monthly) {
        const i = mIdx(m) - m0;
        if (i >= 0 && i < nM) vol[i] = s + r;
      }
      // pens: rhetorical features aggregated monthly across the whole record
      const tot = new Float32Array(nM);
      const sums = {};
      for (const [k] of this.APENS) sums[k] = new Float32Array(nM);
      for (const d of D.rhet) {
        const i = mIdx(d.date) - m0;
        if (i < 0 || i >= nM) continue;
        tot[i] += d.total || 0;
        for (const [k] of this.APENS) sums[k][i] += d[k] || 0;
      }
      const rates = {};
      for (const [k] of this.APENS) {
        rates[k] = new Float32Array(nM);
        for (let i = 0; i < nM; i++) rates[k][i] = tot[i] > 20 ? sums[k][i] / tot[i] * 100 : 0;
      }
      const maxRate = {};
      for (const [k] of this.APENS) { let m = 0.001; for (let i = 0; i < nM; i++) m = Math.max(m, rates[k][i]); maxRate[k] = m; }
      let maxVol = 1;
      for (let i = 0; i < nM; i++) maxVol = Math.max(maxVol, vol[i]);
      // high-signal fragments (full record) → month float positions
      const fragSrc = (this.D.crossFrags && this.D.crossFrags.length) ? this.D.crossFrags : this.D.frags;
      const frags = fragSrc.map(f => ({
        pos: (mIdx(f.day.slice(0, 7)) - m0) + (+f.day.slice(8, 10) - 1) / 30.5,
        text: f.text,
        tag: f.day,
        shownAt: 0
      })).filter(f => f.pos >= 0 && f.pos < nM).sort((a, b) => a.pos - b.pos);
      this.penAttributeFrags(frags, this.APENS, rates, maxRate);
      const monthLabel = (i) => {
        const y = Math.floor((m0 + i) / 12), mo = (m0 + i) % 12;
        return y + '-' + String(mo + 1).padStart(2, '0');
      };
      this.M.annie = { nM, m0, rates, maxRate, vol, maxVol, frags, monthLabel, play: 0.001, scrub: false, scrubGeo: null };
    },

    draw_annie(ctx, W, H, dt) {
      if (!this.M.annie) this.initAnnie();
      const C = this.COL, An = this.M.annie, st = this.state;
      if (st.anniePlay && !An.scrub) {
        An.play += st.annieSpeed * dt;
        if (An.play >= An.nM - 0.01) { An.play = An.nM - 0.01; this.setState({ anniePlay: false }); }
      }
      const chartR = W * 0.62;
      const padL = 110, padT = 64, padB = 74;
      const laneGap = 10;
      const nLanes = this.APENS.length + 1;
      const laneH = (H - padT - padB - laneGap * (nLanes - 1)) / nLanes;
      const xOf = (m) => padL + (m / (An.nM - 1)) * (chartR - padL - 20);
      const playX = xOf(An.play);
      const geo = { padL, padT, laneH, laneGap, x0: padL, x1: chartR - 20, xOf };
      const vy0 = padT + this.APENS.length * (laneH + laneGap);

      // era bands (NYC ONE → UNIONTOWN → NYC TWO → RETURN)
      this.drawEraBands(ctx, xOf, (di) => {
        const d = this.i2d(this.D.day0 + di);
        return (d.getUTCFullYear() * 12 + d.getUTCMonth()) - An.m0 + (d.getUTCDate() - 1) / 30.5;
      }, padT - 14, vy0 + laneH);

      // header
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = C.amberHi;
      ctx.fillText('POLYGRAPH', 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('FULL CORPUS · 181,650 MESSAGES · 568 THREADS · 2011 → 2026 · FOUR PENS, EVERY WORD', 18, 48);
      // playhead readout
      const mi = Math.min(An.nM - 1, Math.floor(An.play));
      const my2 = An.monthLabel(mi);
      const MN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      ctx.font = '600 13px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
      ctx.fillText(MN[+my2.slice(5, 7) - 1] + ' ' + my2.slice(0, 4) + ' · ' + this.fmt(An.vol[mi]) + ' MSGS', chartR - 20, 32);
      ctx.textAlign = 'left';

      // four pens + volume (generic primitives — same instrument as 07 WEATHER)
      const lanes = this.APENS.map(([k, label, col]) => ({
        data: An.rates[k], label, unit: '/100 MSG', color: col, max: An.maxRate[k]
      }));
      this.drawPenLanes(ctx, geo, lanes, An.play, st.anniePlay);
      this.drawVolumeLane(ctx, geo, vy0, An.vol, An.maxVol, An.play, C.amber);

      // playhead needle
      ctx.strokeStyle = 'rgba(232,230,225,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(playX, padT - 6); ctx.lineTo(playX, vy0 + laneH + 8); ctx.stroke();
      // year ticks
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let i = 0; i < An.nM; i++) {
        if ((An.m0 + i) % 12 === 0) ctx.fillText(String(Math.floor((An.m0 + i) / 12)), xOf(i), vy0 + laneH + 12);
      }
      An.scrubGeo = { x0: padL, x1: chartR - 20, y1: vy0 + laneH };

      // fragment surfacer — verbatim high-emotion lines from the whole record
      const fx = chartR + 8, fw = W - fx - 16;
      this.drawFragmentFeed(ctx, { fx, fy: padT - 22, fw, fh: H - padT - 36 }, An.frags, An.play, 'HIGH-EMOTION FRAGMENTS · VERBATIM · FULL RECORD', '#39ff14');
    },

    pt_annie(type, p) {
      const An = this.M.annie; if (!An) return;
      const g = An.scrubGeo; if (!g) return;
      if (type === 'down' && p.x < g.x1 + 20 && p.x > g.x0 - 20) {
        An.scrub = true;
        An.play = Math.max(0.001, Math.min(An.nM - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (An.nM - 1)));
      } else if (type === 'move' && An.scrub && this.mouse.down) {
        An.play = Math.max(0.001, Math.min(An.nM - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (An.nM - 1)));
      } else if (type === 'up' || type === 'leave') {
        An.scrub = false;
      }
    },

    // ============================================================
    // MODULE 09 — SIGNAL  (YouTube spectrogram + artist tuner)
    // ============================================================
    initSignal() {
      const D = this.D, yt = D.yt;
      const mIdx = (m) => +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1);
      const m0 = mIdx('2010-01'), m1 = mIdx('2025-07');
      const nM = m1 - m0 + 1;
      const watch = new Float32Array(nM), music = new Float32Array(nM);
      const titles = new Array(nM).fill(null);
      for (const d of yt.daily) {
        const i = mIdx(d.day.slice(0, 7)) - m0;
        if (i < 0 || i >= nM) continue;
        watch[i] += d.total_watches; music[i] += d.music_watches;
        if (!titles[i] && d.sample_titles && d.sample_titles[0]) {
          titles[i] = d.sample_titles[0].replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').slice(0, 44);
        }
      }
      // msgs per month from D.msg.monthly
      const msgs = new Float32Array(nM);
      for (const [m, s, r] of D.msg.monthly) {
        const i = mIdx(m) - m0;
        if (i >= 0 && i < nM) msgs[i] = s + r;
      }
      let maxW = 1, maxM = 1;
      for (let i = 0; i < nM; i++) { maxW = Math.max(maxW, watch[i]); maxM = Math.max(maxM, msgs[i]); }
      // stations sorted by count desc already; give each a matched influencer if any
      const stations = D.yt.artists.map(a => {
        const low = a.name.toLowerCase();
        const inf = D.yt.infl.find(x => low.includes(x.artist.toLowerCase()) || x.artist.toLowerCase().includes(low));
        return { ...a, inf };
      });
      this.M.signal = { m0, nM, watch, music, msgs, titles, maxW, maxM, stations, pos: 0, vel: 0, dragDial: false, snapT: 0 };
    },

    draw_signal(ctx, W, H, dt) {
      if (!this.M.signal) this.initSignal();
      const C = this.COL, S = this.M.signal, st = this.state;
      dt = Math.min(dt, 0.04);
      const dialH = 168;
      const specB = H - dialH - 14;
      const padT = 56;
      const midY = padT + (specB - padT) * 0.56;
      const xOf = (i) => 14 + (i / (S.nM - 1)) * (W - 28);
      const bw = Math.max(2, (W - 28) / S.nM - 1.5);
      // year grid
      ctx.font = '9px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let y = 2010; y <= 2025; y++) {
        const i = (y * 12) - S.m0;
        const x = xOf(i);
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x, padT - 8); ctx.lineTo(x, specB); ctx.stroke();
        if (y % 2 === 0) { ctx.fillStyle = C.faint; ctx.fillText("'" + String(y).slice(2), x, specB + 4); }
      }
      // midline
      ctx.strokeStyle = '#5b1a8f'; ctx.beginPath(); ctx.moveTo(14, midY); ctx.lineTo(W - 14, midY); ctx.stroke();
      // hover month
      let hoverI = -1;
      if (this.mouse.x >= 14 && this.mouse.x <= W - 14 && this.mouse.y > padT - 10 && this.mouse.y < specB) {
        hoverI = Math.round(((this.mouse.x - 14) / (W - 28)) * (S.nM - 1));
      }
      // spectrogram bars
      for (let i = 0; i < S.nM; i++) {
        const x = xOf(i);
        const wv = S.watch[i], mv = S.music[i], gv = S.msgs[i];
        const isH = i === hoverI;
        if (wv > 0 && (!st.signalMusic || mv > 0)) {
          const hh = Math.sqrt((st.signalMusic ? mv : wv) / S.maxW) * (midY - padT);
          ctx.fillStyle = isH ? C.violetHi : 'rgba(123,45,255,0.55)';
          ctx.fillRect(x - bw / 2, midY - hh, bw, hh);
          if (!st.signalMusic && mv > 0) {
            const mh = Math.sqrt(mv / S.maxW) * (midY - padT);
            ctx.fillStyle = isH ? '#ffffff' : 'rgba(207,196,255,0.95)';
            ctx.fillRect(x - bw / 2, midY - mh, bw, mh);
          }
        }
        if (gv > 0) {
          const gh = Math.sqrt(gv / S.maxM) * (specB - midY - 8);
          ctx.fillStyle = isH ? 'rgba(57,255,20,0.9)' : 'rgba(57,255,20,0.28)';
          ctx.fillRect(x - bw / 2, midY, bw, gh);
        }
      }
      // labels
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 15px ' + this.GROT; ctx.fillStyle = C.violetHi;
      ctx.fillText('SIGNAL', 18, 30);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('12,863 YOUTUBE WATCHES \u25b2  vs  MESSAGE VOLUME \u25bc \u00b7 2010 \u2192 2025 \u00b7 BRIGHT CORE = MUSIC', 18, 46);
      if (hoverI >= 0) {
        const y = Math.floor((S.m0 + hoverI) / 12), mo = (S.m0 + hoverI) % 12;
        const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const lines = [
          [M[mo] + ' ' + y, C.txt, '600 11px ' + this.MONO],
          [this.fmt(S.watch[hoverI]) + ' WATCHES \u00b7 ' + this.fmt(S.music[hoverI]) + ' MUSIC', C.violet],
          [this.fmt(S.msgs[hoverI]) + ' MESSAGES', C.amber]
        ];
        if (S.titles[hoverI]) lines.push(['\u201c' + S.titles[hoverI] + '\u2026\u201d', C.dim, '9px ' + this.MONO]);
        this.card(ctx, this.mouse.x, this.mouse.y, lines);
      }

      // ---- TUNER ----
      const dy = H - dialH;
      ctx.fillStyle = '#1a0033'; ctx.fillRect(0, dy, W, dialH);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(0, dy + 0.5); ctx.lineTo(W, dy + 0.5); ctx.stroke();
      const cx = W / 2;
      const spacing = 150;
      const n = S.stations.length;
      // physics
      if (!S.dragDial) {
        S.pos += S.vel * dt; S.vel *= Math.pow(0.92, dt * 60);
        const snap = Math.round(S.pos);
        S.pos += (Math.max(0, Math.min(n - 1, snap)) - S.pos) * Math.min(1, dt * 6);
      }
      S.pos = Math.max(-0.49, Math.min(n - 0.51, S.pos));
      const cur = S.stations[Math.max(0, Math.min(n - 1, Math.round(S.pos)))];
      // frequency ruler
      const rulerY = dy + 118;
      ctx.strokeStyle = '#5b1a8f'; ctx.beginPath(); ctx.moveTo(0, rulerY); ctx.lineTo(W, rulerY); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const x = cx + (i - S.pos) * spacing;
        if (x < -spacing || x > W + spacing) continue;
        const d = Math.abs(i - S.pos);
        const a = Math.max(0, 1 - d * 0.30);
        // tick
        ctx.strokeStyle = 'rgba(123,45,255,' + (0.3 + a * 0.7) + ')';
        ctx.lineWidth = d < 0.5 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(x, rulerY - 8 - a * 10); ctx.lineTo(x, rulerY + 8 + a * 10); ctx.stroke();
        // name
        ctx.font = (d < 0.5 ? '700 13px ' : '500 10px ') + this.GROT;
        ctx.fillStyle = d < 0.5 ? C.violetHi : 'rgba(139,148,164,' + a + ')';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(S.stations[i].name.slice(0, 24), x, rulerY - 16 - a * 8);
        // count
        ctx.font = '8px ' + this.MONO; ctx.fillStyle = 'rgba(91,100,114,' + a + ')';
        ctx.fillText(S.stations[i].count + ' WATCHES', x, rulerY + 22);
      }
      // center needle
      ctx.strokeStyle = C.amberHi; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, rulerY - 30); ctx.lineTo(cx, rulerY + 14); ctx.stroke();
      // readout
      ctx.textAlign = 'center';
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText('STATION ' + (Math.round(S.pos) + 1) + ' / ' + n + ' \u00b7 DRAG THE DIAL', cx, dy + 16);
      if (cur && cur.inf) {
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.amber;
        ctx.fillText('\u26a1 BLEEDS INTO HIS TEXTS \u00b7 INFLUENCE ' + cur.inf.influence_score.toFixed(0) + ' \u00b7 ' + cur.inf.days_active + ' HIGH-BLEED DAYS', cx, dy + 146);
      } else {
        ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.fillText('NO MEASURED LANGUAGE BLEED', cx, dy + 146);
      }
      S.dialGeo = { y: dy };
    },

    pt_signal(type, p, e) {
      const S = this.M.signal; if (!S) return;
      const g = S.dialGeo;
      if (type === 'down') {
        if (g && p.y > g.y) { S.dragDial = true; S.vel = 0; }
      } else if (type === 'move' && S.dragDial && this.mouse.down) {
        S.pos -= p.dx / 150;
        S.vel = -p.dx / 150 * 30;
        S.pos = Math.max(-0.49, Math.min(S.stations.length - 0.51, S.pos));
      } else if (type === 'up' || type === 'leave') {
        S.dragDial = false;
      } else if (type === 'wheel' && g && p.y > g.y) {
        S.vel += (e.deltaY > 0 ? 1 : -1) * 6;
      }
    },

    // ---------- UI builders ----------
    // ============================================================
    // MODULE 10 — MIRROR  (he becomes who he talks to)
    // ============================================================
    MMODES: {
      affection: { x: 'prof', y: 'love', xl: 'PROFANITY PER 100 SENT \u2192', yl: 'AFFECTION PER 100 SENT', xc: '#e01aff', yc: '#c77dff' },
      ego: { x: 'you', y: 'i', xl: '\u201cYOU\u201d PER 100 SENT \u2192', yl: '\u201cI\u201d PER 100 SENT', xc: '#b026ff', yc: '#39ff14', diag: true },
      caution: { x: 'imp', y: 'qual', xl: 'COMMANDS PER 100 SENT \u2192', yl: 'HEDGES PER 100 SENT', xc: '#39ff14', yc: '#b026ff' }
    },

    initMirror() {
      const D = this.D;
      let maxTot = 1;
      const items = D.tprof.filter(t => t.sent_features && t.sent_features.n >= 50).map(t => {
        const f = t.sent_features, n = f.n;
        maxTot = Math.max(maxTot, t.total);
        return {
          t, n,
          love: f.love / n * 100, prof: f.prof / n * 100,
          i: f.i / n * 100, you: f.you / n * 100,
          qual: f.qual / n * 100, imp: f.imp / n * 100,
          name: D.nameOf[t.id] || null,
          _x: null, _y: null
        };
      });
      this.M.mirror = { items, maxTot, pinned: null, hover: null, reveal: 0 };
    },

    draw_mirror(ctx, W, H, dt) {
      if (!this.M.mirror) this.initMirror();
      const C = this.COL, Mi = this.M.mirror, mode = this.MMODES[this.state.mirrorMode];
      Mi.reveal = Math.min(1, Mi.reveal + dt * 0.9);
      const padL = 86, padR = 46, padT = 54, padB = 64;
      const pw = W - padL - padR, ph = H - padT - padB;
      let mxX = 0.001, mxY = 0.001;
      for (const it of Mi.items) { mxX = Math.max(mxX, it[mode.x]); mxY = Math.max(mxY, it[mode.y]); }
      mxX *= 1.1; mxY *= 1.1;
      const X = (v) => padL + (v / mxX) * pw;
      const Y = (v) => padT + ph - (v / mxY) * ph;
      // grid + ticks
      ctx.lineWidth = 1;
      const ticks = 5;
      for (let i = 0; i <= ticks; i++) {
        const vx = mxX * i / ticks, vy = mxY * i / ticks;
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(X(vx), padT); ctx.lineTo(X(vx), padT + ph); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(padL, Y(vy)); ctx.lineTo(padL + pw, Y(vy)); ctx.stroke();
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(vx.toFixed(1), X(vx), padT + ph + 8);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(vy.toFixed(1), padL - 8, Y(vy));
      }
      // medians
      const med = (key) => { const a = Mi.items.map(x => x[key]).sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; };
      const mX = med(mode.x), mY = med(mode.y);
      ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(232,230,225,0.18)';
      ctx.beginPath(); ctx.moveTo(X(mX), padT); ctx.lineTo(X(mX), padT + ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, Y(mY)); ctx.lineTo(padL + pw, Y(mY)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = 'rgba(232,230,225,0.3)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('MEDIAN', X(mX) + 5, padT + 12);
      ctx.fillText('MEDIAN', padL + 6, Y(mY) - 5);
      // ego diagonal
      if (mode.diag) {
        const m = Math.min(mxX, mxY);
        ctx.strokeStyle = 'rgba(57,255,20,0.3)'; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(m), Y(m)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.save();
        ctx.translate(X(m * 0.62), Y(m * 0.62));
        ctx.rotate(-Math.atan((ph / mxY) / (pw / mxX)));
        ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = 'rgba(57,255,20,0.55)'; ctx.textAlign = 'center';
        ctx.fillText('ABOVE: TALKS ABOUT HIMSELF \u00b7 BELOW: TALKS ABOUT THEM', 0, -7);
        ctx.restore();
      }
      // axis titles
      ctx.fillStyle = mode.xc; ctx.font = '9px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(mode.xl, padL + pw / 2, H - 18);
      ctx.save(); ctx.translate(24, padT + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = mode.yc;
      ctx.fillText(mode.yl + ' \u2192', 0, 0); ctx.restore();
      // dots — eased toward mode position
      Mi.hover = null;
      let best = 14;
      const mxm = this.mouse.x, mym = this.mouse.y;
      for (const it of Mi.items) {
        const tx = X(it[mode.x]), ty = Y(it[mode.y]);
        if (it._x === null) { it._x = tx; it._y = ty; }
        const e = Math.min(1, dt * 8);
        it._x += (tx - it._x) * e; it._y += (ty - it._y) * e;
        const d = Math.hypot(mxm - it._x, mym - it._y);
        if (d < best) { best = d; Mi.hover = it; }
      }
      // Matched by name, not by raw thread id: `it.name` already resolves through
      // D.nameOf (built from the decrypted bundle), so the identifier stays inside
      // leviathan.enc instead of shipping in cleartext to every visitor.
      for (const it of Mi.items) {
        const lit = it === Mi.hover || it === Mi.pinned;
        const isAnnie = (it.name || '').toLowerCase() === 'annie';
        const r = (3 + Math.sqrt(it.t.total / Mi.maxTot) * 14) * Math.min(1, Mi.reveal * 2);
        ctx.beginPath(); ctx.arc(it._x, it._y, lit ? r + 2.5 : r, 0, Math.PI * 2);
        if (lit) ctx.fillStyle = '#ffffff';
        else if (isAnnie) ctx.fillStyle = 'rgba(199,125,255,0.95)';
        else if (it.name) ctx.fillStyle = 'rgba(57,255,20,0.85)';
        else ctx.fillStyle = 'rgba(124,152,182,0.55)';
        ctx.fill();
        if (lit) { ctx.strokeStyle = isAnnie ? C.rose : C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(it._x, it._y, r + 6, 0, Math.PI * 2); ctx.stroke(); }
        if ((it.t.total > 8000 || lit) && r > 3) {
          ctx.font = '8.5px ' + this.MONO; ctx.fillStyle = lit ? C.txt : C.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(it.name || this.maskId(it.t.id), it._x, it._y + r + 5);
        }
      }
      if (this.cv) this.cv.style.cursor = Mi.hover ? 'pointer' : 'crosshair';
      const show = Mi.pinned || Mi.hover;
      if (show) {
        const labX = mode.xl.replace(' \u2192', ''), labY = mode.yl;
        this.card(ctx, mxm >= 0 ? mxm : show._x, mym >= 0 ? mym : show._y, [
          [show.name || this.maskId(show.t.id), show.name ? C.amberHi : C.txt, '700 13px ' + this.GROT],
          [this.fmt(show.n) + ' SENT MESSAGES', C.dim],
          [labY + '  ' + show[mode.y].toFixed(1), mode.yc],
          [labX + '  ' + show[mode.x].toFixed(1), mode.xc],
          [show.t.first + ' \u2192 ' + show.t.last, C.faint, '8px ' + this.MONO]
        ], { border: show === Mi.pinned ? C.amber : C.line });
      }
    },

    pt_mirror(type) {
      const Mi = this.M.mirror; if (!Mi) return;
      if (type === 'down') Mi.pinned = (Mi.hover && Mi.pinned !== Mi.hover) ? Mi.hover : null;
    },

    // ============================================================
    // MODULE 11 — GRAVITY  (people who pull the same language out of him)
    // ============================================================
    initGravity() {
      const D = this.D, W = this.W, H = this.H;
      const prof = {}; for (const t of D.tprof) prof[t.id] = t;
      const idSet = new Set();
      for (const c of D.clusters) { idSet.add(c.thread); for (const s of c.similar) if (s.similarity >= 0.3) idSet.add(s.thread); }
      let maxTot = 1;
      for (const id of idSet) { const p = prof[id]; if (p) maxTot = Math.max(maxTot, p.total); }
      const nodes = new Map();
      let k = 0;
      for (const id of idSet) {
        const p = prof[id], tot = p ? p.total : 120;
        const a = (k * 2.399963) % (Math.PI * 2), rr = 90 + (k % 6) * 55; k++;
        nodes.set(id, {
          id, tot, p,
          label: id === 'Orphaned/System' ? 'SYSTEM' : (D.nameOf[id] || this.maskId(id)),
          named: !!D.nameOf[id],
          r: 7 + Math.sqrt(tot / maxTot) * 28,
          x: W / 2 + Math.cos(a) * rr, y: H / 2 + Math.sin(a) * rr * 0.7,
          vx: 0, vy: 0
        });
      }
      const edges = [], seen = new Set();
      for (const c of D.clusters) for (const s of c.similar) {
        if (s.similarity < 0.3) continue;
        const key = c.thread < s.thread ? c.thread + '|' + s.thread : s.thread + '|' + c.thread;
        if (seen.has(key)) continue; seen.add(key);
        edges.push({ a: nodes.get(c.thread), b: nodes.get(s.thread), sim: s.similarity });
      }
      const simOf = {}; for (const c of D.clusters) simOf[c.thread] = c.similar;
      this.M.gravity = { nodes: [...nodes.values()], edges, simOf, byId: nodes, drag: null, hover: null, pinned: null };
    },

    gravityShake() {
      const G = this.M.gravity; if (!G) return;
      for (const n of G.nodes) { const a = Math.random() * Math.PI * 2, f = 500 + Math.random() * 900; n.vx += Math.cos(a) * f; n.vy += Math.sin(a) * f; }
    },

    draw_gravity(ctx, W, H, dt) {
      if (!this.M.gravity) this.initGravity();
      const C = this.COL, G = this.M.gravity;
      dt = Math.min(dt, 0.03);
      // forces: centering + all-pairs repulsion + edge springs
      for (let i = 0; i < G.nodes.length; i++) {
        const a = G.nodes[i];
        a.vx += (W / 2 - a.x) * 0.3 * dt; a.vy += (H / 2 - a.y) * 0.3 * dt;
        for (let j = i + 1; j < G.nodes.length; j++) {
          const b = G.nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy + 400;
          const f = 320000 / d2 * dt;
          const d = Math.sqrt(d2);
          dx /= d; dy /= d;
          a.vx -= dx * f; a.vy -= dy * f;
          b.vx += dx * f; b.vy += dy * f;
        }
      }
      for (const e of G.edges) {
        const rest = 70 + (1 - e.sim) * 380;
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = (d - rest) * 2.4 * dt / d;
        e.a.vx += dx * f; e.a.vy += dy * f;
        e.b.vx -= dx * f; e.b.vy -= dy * f;
      }
      for (const n of G.nodes) {
        if (G.drag === n) { n.x = this.mouse.x; n.y = this.mouse.y; continue; }
        const damp = Math.pow(0.88, dt * 60);
        n.vx *= damp; n.vy *= damp;
        n.x += n.vx * dt; n.y += n.vy * dt;
        n.x = Math.max(30, Math.min(W - 30, n.x)); n.y = Math.max(40, Math.min(H - 30, n.y));
      }
      const focus = G.pinned || G.hover;
      // edges
      for (const e of G.edges) {
        const lit = focus && (e.a === focus || e.b === focus);
        ctx.strokeStyle = lit ? 'rgba(57,255,20,' + (0.25 + e.sim * 0.6).toFixed(3) + ')' : 'rgba(124,152,182,' + (0.05 + e.sim * 0.22).toFixed(3) + ')';
        ctx.lineWidth = lit ? 1 + e.sim * 2.4 : 0.7 + e.sim * 1.4;
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
        if (lit) {
          ctx.font = '8px ' + this.MONO; ctx.fillStyle = 'rgba(255,210,138,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(Math.round(e.sim * 100) + '%', (e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2 - 3);
        }
      }
      // nodes
      for (const n of G.nodes) {
        const lit = n === G.hover || n === G.pinned;
        const neighbor = focus && !lit && G.edges.some(e => (e.a === focus && e.b === n) || (e.b === focus && e.a === n));
        const base = n.named ? '232,163,61' : '124,152,182';
        const g = ctx.createRadialGradient(n.x, n.y, 1, n.x, n.y, n.r);
        g.addColorStop(0, 'rgba(' + base + ',' + (lit ? 1 : neighbor ? 0.85 : 0.8) + ')');
        g.addColorStop(0.65, 'rgba(' + base + ',' + (lit ? 0.55 : 0.25) + ')');
        g.addColorStop(1, 'rgba(' + base + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (lit ? 1.25 : 1), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = n.named ? '#b6ff8f' : '#dfe8f2';
        ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(2, n.r * 0.28), 0, Math.PI * 2); ctx.fill();
        if (n.r > 13 || lit || neighbor) {
          ctx.font = (lit ? '600 10px ' : '9px ') + this.MONO;
          ctx.fillStyle = lit ? C.txt : neighbor ? '#aeb7c6' : C.dim;
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(n.label, n.x, n.y + n.r + 3);
        }
      }
      // hover detect
      G.hover = null;
      let best = 1e9;
      for (const n of G.nodes) { const d = Math.hypot(this.mouse.x - n.x, this.mouse.y - n.y); if (d < n.r + 8 && d < best) { best = d; G.hover = n; } }
      if (this.cv) this.cv.style.cursor = G.drag ? 'grabbing' : (G.hover ? 'grab' : 'crosshair');
      const show = G.pinned || G.hover;
      if (show) {
        const sims = G.simOf[show.id] || [];
        const lines = [
          [show.label, show.named ? C.amberHi : C.txt, '700 13px ' + this.GROT],
          [show.p ? this.fmt(show.p.total) + ' MESSAGES \u00b7 ' + show.p.first + ' \u2192 ' + show.p.last : 'LOW-VOLUME THREAD', C.dim, '9px ' + this.MONO]
        ];
        for (const s of sims.slice(0, 5)) {
          const nb = G.byId.get(s.thread);
          lines.push(['\u2194 ' + (nb ? nb.label : this.maskId(s.thread)) + '  ' + Math.round(s.similarity * 100) + '% SAME VOCABULARY', C.amber, '9px ' + this.MONO]);
        }
        if (!sims.length) lines.push(['PULLED IN BY OTHERS\u2019 SIMILARITY', C.faint, '8px ' + this.MONO]);
        this.card(ctx, this.mouse.x >= 0 ? this.mouse.x : show.x, this.mouse.y >= 0 ? this.mouse.y : show.y, lines, { border: show === G.pinned ? C.amber : C.line });
      }
    },

    pt_gravity(type, p) {
      const G = this.M.gravity; if (!G) return;
      if (type === 'down') {
        let hit = null, best = 1e9;
        for (const n of G.nodes) { const d = Math.hypot(p.x - n.x, p.y - n.y); if (d < n.r + 10 && d < best) { best = d; hit = n; } }
        if (hit) { G.drag = hit; G.downPos = { x: p.x, y: p.y }; hit.vx = 0; hit.vy = 0; }
      } else if (type === 'move') {
        if (G.drag && this.mouse.down) { G.drag.vx = p.dx * 26; G.drag.vy = p.dy * 26; }
      } else if (type === 'up') {
        if (G.drag) {
          const moved = G.downPos ? Math.hypot(p.x - G.downPos.x, p.y - G.downPos.y) : 0;
          if (moved < 5) G.pinned = (G.pinned === G.drag ? null : G.drag);
          G.drag = null;
        } else G.pinned = null;
      } else if (type === 'leave') { G.drag = null; }
    },

    // ============================================================
    // MODULE 12 — FORENSIC  (four composite scores, daily, with evidence)
    // ============================================================
    FLANES: [
      ['plead', 'PLEADING', '#39ff14'],
      ['apol', 'APOLOGY', '#00ffa3'],
      ['bomb', 'LOVE-BOMB', '#c77dff'],
      ['den', 'DENIAL', '#e01aff']
    ],

    initForensic() {
      const cross = this.D.cross;
      const day0 = this.d2i(cross[0].day);
      const N = this.d2i(cross[cross.length - 1].day) - day0 + 1;
      const ch = { plead: new Float32Array(N), apol: new Float32Array(N), bomb: new Float32Array(N), den: new Float32Array(N) };
      const rec = new Array(N).fill(null);
      for (const d of cross) {
        const i = this.d2i(d.day) - day0;
        if (i < 0 || i >= N) continue;
        rec[i] = d;
        ch.plead[i] = d.pleading_score; ch.apol[i] = d.apology_score;
        ch.bomb[i] = d.love_bomb_score; ch.den[i] = d.denial_score;
      }
      const mx = {};
      for (const [k] of this.FLANES) { let m = 0.001; const A = ch[k]; for (let i = 0; i < N; i++) if (A[i] > m) m = A[i]; mx[k] = m; }
      this.M.forensic = { day0, N, ch, rec, mx, a: 0, b: N, ta: 0, tb: N, pin: -1, hover: -1, downPos: null };
    },

    draw_forensic(ctx, W, H, dt) {
      if (!this.M.forensic) this.initForensic();
      const C = this.COL, F = this.M.forensic, st = this.state;
      F.a += (F.ta - F.a) * Math.min(1, dt * 10);
      F.b += (F.tb - F.b) * Math.min(1, dt * 10);
      const span = Math.max(4, F.b - F.a);
      const lanesOn = this.FLANES.filter(l => st.forensicOn[l[0]]);
      const nL = Math.max(1, lanesOn.length);
      const evH = F.pin >= 0 && F.rec[F.pin] ? 132 : 0;
      const padL = 100, padR = 18, padT = 30, padB = 50 + evH;
      const laneGap = 9;
      const laneH = (H - padT - padB - laneGap * (nL - 1)) / nL;
      const cw = W - padL - padR;
      const xOf = (i) => padL + ((i - F.a) / span) * cw;
      const iOf = (x) => F.a + ((x - padL) / cw) * span;
      // year grid
      ctx.font = '9px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let y = 2011; y <= 2027; y++) {
        const i = this.d2i(y + '-01-01') - F.day0;
        const x = xOf(i);
        if (x < padL - 20 || x > W - padR + 20) continue;
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x, padT - 6); ctx.lineTo(x, H - padB + 8); ctx.stroke();
        ctx.fillStyle = C.dim; ctx.fillText(String(y), x, H - padB + 14);
      }
      // lanes
      lanesOn.forEach(([k, label, col], li) => {
        const y0 = padT + li * (laneH + laneGap), base = y0 + laneH - 2;
        ctx.fillStyle = 'rgba(13,17,24,0.6)';
        ctx.fillRect(padL, y0, cw, laneH);
        ctx.strokeStyle = C.grid; ctx.strokeRect(padL + 0.5, y0 + 0.5, cw, laneH);
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = col; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(label, padL - 12, y0 + laneH / 2 - 6);
        ctx.fillStyle = C.faint; ctx.font = '7.5px ' + this.MONO;
        ctx.fillText('MAX ' + Math.round(F.mx[k]) + '/DAY', padL - 12, y0 + laneH / 2 + 8);
        // spikes — column max
        const A = F.ch[k], mxk = F.mx[k];
        for (let x = 0; x < cw; x++) {
          const i0 = Math.max(0, Math.floor(iOf(padL + x))), i1 = Math.min(F.N - 1, Math.max(i0, Math.floor(iOf(padL + x + 1))));
          if (i0 >= F.N || i1 < 0) continue;
          let v = 0;
          for (let i = i0; i <= i1; i++) if (A[i] > v) v = A[i];
          if (v <= 0) continue;
          const t = Math.sqrt(v / mxk);
          ctx.fillStyle = col + Math.round((0.3 + t * 0.7) * 255).toString(16).padStart(2, '0');
          ctx.fillRect(padL + x, base - t * (laneH - 10), 1, t * (laneH - 10));
        }
      });
      // hover — snap to nearest recorded day
      F.hover = -1;
      const mxp = this.mouse.x, myp = this.mouse.y;
      if (mxp > padL && mxp < W - padR && myp > padT && myp < H - padB) {
        const ci = Math.round(iOf(mxp));
        const reach = Math.max(2, Math.ceil(span / cw * 3));
        for (let o = 0; o <= reach; o++) {
          if (ci - o >= 0 && F.rec[ci - o]) { F.hover = ci - o; break; }
          if (ci + o < F.N && F.rec[ci + o]) { F.hover = ci + o; break; }
        }
      }
      if (F.hover >= 0) {
        const x = xOf(F.hover);
        ctx.strokeStyle = 'rgba(232,230,225,0.25)'; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
        ctx.setLineDash([]);
        const d = F.rec[F.hover];
        const lines = [
          [this.fmtDate(F.day0 + F.hover, true) + ' \u00b7 ' + this.fmt(d.msg_total) + ' MSGS', C.txt, '600 11px ' + this.MONO],
          ['PLEADING ' + d.pleading_score + ' \u00b7 APOLOGY ' + d.apology_score, C.amber],
          ['LOVE-BOMB ' + d.love_bomb_score + ' \u00b7 DENIAL ' + d.denial_score, C.rose]
        ];
        if (d.top_motifs && d.top_motifs.length) lines.push(['MOTIFS: ' + d.top_motifs.slice(0, 3).join(' / '), C.dim, '9px ' + this.MONO]);
        if (d.high_signal_fragments && d.high_signal_fragments.length) lines.push(['\u201c' + d.high_signal_fragments[0].slice(0, 46) + '\u2026\u201d', C.cyan, '9px ' + this.MONO]);
        lines.push([F.pin === F.hover ? 'CLICK TO UNPIN' : 'CLICK TO PIN THE EVIDENCE', C.faint, '8px ' + this.MONO]);
        this.card(ctx, mxp, myp, lines);
      }
      if (evH) {
        // pinned marker
        const xp = xOf(F.pin);
        if (xp > padL && xp < W - padR) {
          ctx.strokeStyle = C.amber; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(xp, padT); ctx.lineTo(xp, H - padB); ctx.stroke();
        }
        this.forensicEvidence(ctx, W, H, evH);
      }
    },

    forensicEvidence(ctx, W, H, evH) {
      const C = this.COL, F = this.M.forensic, d = F.rec[F.pin];
      const y0 = H - 44 - evH + 4, x0 = 16, w = W - 32, h = evH - 8;
      ctx.fillStyle = 'rgba(11,15,21,0.92)';
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = 'rgba(57,255,20,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '600 11px ' + this.MONO; ctx.fillStyle = C.amberHi;
      ctx.fillText('EVIDENCE \u00b7 ' + this.fmtDate(F.day0 + F.pin, true) + ' \u00b7 ' + this.fmt(d.msg_total) + ' MESSAGES \u00b7 SENT BY HIM, VERBATIM', x0 + 14, y0 + 20);
      const frags = (d.high_signal_fragments || []).slice(0, 3);
      if (!frags.length) {
        ctx.font = '10px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.fillText('NO HIGH-SIGNAL FRAGMENTS PRESERVED FOR THIS DAY', x0 + 14, y0 + 46);
        return;
      }
      const colW = (w - 28 - (frags.length - 1) * 18) / frags.length;
      frags.forEach((f, i) => {
        const fx = x0 + 14 + i * (colW + 18);
        let fy = y0 + 44;
        ctx.font = '11.5px ' + this.GROT; ctx.fillStyle = 'rgba(232,230,225,0.92)';
        const words = ('\u201c' + f + '\u201d').split(' ');
        let line = '';
        let clipped = false;
        for (const wd of words) {
          if (ctx.measureText(line + wd).width > colW) {
            ctx.fillText(line, fx, fy); fy += 15; line = wd + ' ';
            if (fy > y0 + h - 8) { clipped = true; break; }
          } else line += wd + ' ';
        }
        if (!clipped && fy <= y0 + h - 4) ctx.fillText(line, fx, fy);
      });
    },

    pt_forensic(type, p, e) {
      const F = this.M.forensic; if (!F) return;
      const span = F.tb - F.ta;
      const cw = Math.max(50, this.W - 118);
      if (type === 'down') {
        F.downPos = { x: p.x, y: p.y };
      } else if (type === 'move' && this.mouse.down) {
        const d = (p.dx / cw) * span;
        F.ta -= d; F.tb -= d;
        this.forensicClamp();
      } else if (type === 'up') {
        const moved = F.downPos ? Math.hypot(p.x - F.downPos.x, p.y - F.downPos.y) : 99;
        if (moved < 4) F.pin = (F.hover >= 0 && F.pin !== F.hover) ? F.hover : -1;
        F.downPos = null;
      } else if (type === 'wheel') {
        const f = Math.exp(e.deltaY * 0.0016);
        const pivot = F.ta + ((p.x - 100) / cw) * span;
        F.ta = pivot - (pivot - F.ta) * f;
        F.tb = pivot + (F.tb - pivot) * f;
        this.forensicClamp();
      } else if (type === 'dbl') {
        F.ta = 0; F.tb = F.N;
      }
    },

    forensicClamp() {
      const F = this.M.forensic;
      const span = Math.max(14, Math.min(F.N, F.tb - F.ta));
      if (F.ta < -span * 0.1) F.ta = -span * 0.1;
      F.tb = F.ta + span;
      if (F.tb > F.N + span * 0.1) { F.tb = F.N + span * 0.1; F.ta = F.tb - span; }
    },

    // ============================================================
    // MODULE 13 — RINGS  (sixteen years coiled into circles)
    // ============================================================
    initRings() {
      const D = this.D;
      let maxAll = 1, maxS = 1, maxR = 1;
      for (let i = 0; i < D.N; i++) {
        maxAll = Math.max(maxAll, D.S[i] + D.R[i]);
        maxS = Math.max(maxS, D.S[i]); maxR = Math.max(maxR, D.R[i]);
      }
      this.M.rings = { y0: 2011, y1: 2026, nY: 16, maxAll, maxS, maxR, reveal: 0, pin: -1, hoverI: -1, cache: null, cacheKey: '' };
    },

    ringsGeom(W, H) {
      const cx = W / 2, cy = H / 2 + 4;
      const rMax = Math.min(W, H) / 2 - 46;
      const rMin = rMax * 0.2;
      return { cx, cy, rMin, rMax, ringW: (rMax - rMin) / this.M.rings.nY };
    },

    ringsDayXY(i, g) {
      const D = this.D, Rg = this.M.rings;
      const abs = D.day0 + i;
      const d = this.i2d(abs), y = d.getUTCFullYear();
      const j0 = Date.UTC(y, 0, 1) / 86400000;
      const yLen = Date.UTC(y + 1, 0, 1) / 86400000 - j0;
      const ang = ((abs - j0) / yLen) * Math.PI * 2 - Math.PI / 2;
      const r = g.rMin + (y - Rg.y0 + 0.5) * g.ringW;
      return { ang, r, x: g.cx + Math.cos(ang) * r, y: g.cy + Math.sin(ang) * r, yLen };
    },

    ringsRender(W, H) {
      const D = this.D, C = this.COL, Rg = this.M.rings, st = this.state;
      const g = this.ringsGeom(W, H);
      const cv = document.createElement('canvas');
      cv.width = Math.round(W * this.dpr); cv.height = Math.round(H * this.dpr);
      const ctx = cv.getContext('2d');
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // month spokes
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
      const MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      for (let m = 0; m < 12; m++) {
        const a = (m / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(g.cx + Math.cos(a) * g.rMin, g.cy + Math.sin(a) * g.rMin);
        ctx.lineTo(g.cx + Math.cos(a) * g.rMax, g.cy + Math.sin(a) * g.rMax);
        ctx.stroke();
        const lr = g.rMax + 16;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(MO[m], g.cx + Math.cos(a + 0.045) * lr, g.cy + Math.sin(a + 0.045) * lr);
      }
      // ring guides
      for (let k = 0; k < Rg.nY; k++) {
        const r = g.rMin + (k + 0.5) * g.ringW;
        ctx.beginPath(); ctx.arc(g.cx, g.cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(20,26,35,0.9)'; ctx.lineWidth = g.ringW * 0.8; ctx.stroke();
      }
      // day arcs
      const mode = st.ringsMode;
      const maxRef = mode === 'sent' ? Rg.maxS : mode === 'recv' ? Rg.maxR : Rg.maxAll;
      const col = mode === 'recv' ? C.cyan : C.amber;
      ctx.lineWidth = g.ringW * 0.72;
      for (let i = 0; i < D.N; i++) {
        const v = mode === 'sent' ? D.S[i] : mode === 'recv' ? D.R[i] : D.S[i] + D.R[i];
        if (v <= 0) continue;
        const p = this.ringsDayXY(i, g);
        const step = Math.PI * 2 / p.yLen;
        const alpha = 0.14 + 0.86 * Math.sqrt(v / maxRef);
        ctx.strokeStyle = col + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath(); ctx.arc(g.cx, g.cy, p.r, p.ang - step * 0.62, p.ang + step * 0.62);
        ctx.stroke();
      }
      // year labels up the top axis
      ctx.font = '7.5px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < Rg.nY; k++) {
        const r = g.rMin + (k + 0.5) * g.ringW;
        const tx = g.cx, ty = g.cy - r;
        ctx.fillStyle = C.bg; ctx.fillRect(tx - 10, ty - 5, 20, 10);
        ctx.fillStyle = k % 2 ? C.dim : C.faint;
        ctx.fillText("'" + String(Rg.y0 + k).slice(2), tx, ty);
      }
      // center
      ctx.fillStyle = C.dim; ctx.font = '700 13px ' + this.GROT; ctx.textAlign = 'center';
      ctx.fillText('16 YEARS', g.cx, g.cy - 4);
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText('COILED', g.cx, g.cy + 10);
      return cv;
    },

    draw_rings(ctx, W, H, dt) {
      if (!this.M.rings) this.initRings();
      const C = this.COL, Rg = this.M.rings, D = this.D;
      Rg.reveal = Math.min(1, Rg.reveal + dt * 0.7);
      const key = W + 'x' + H + 'x' + this.state.ringsMode + 'x' + this.dpr;
      if (Rg.cacheKey !== key) { Rg.cacheKey = key; Rg.cache = this.ringsRender(W, H); }
      const g = this.ringsGeom(W, H);
      // sweep reveal
      const e = 1 - Math.pow(1 - Rg.reveal, 3);
      ctx.save();
      if (e < 1) {
        ctx.beginPath(); ctx.moveTo(g.cx, g.cy);
        ctx.arc(g.cx, g.cy, g.rMax + 40, -Math.PI / 2, -Math.PI / 2 + e * Math.PI * 2);
        ctx.closePath(); ctx.clip();
      }
      ctx.drawImage(Rg.cache, 0, 0, W, H);
      ctx.restore();
      // hover: invert mouse → day
      Rg.hoverI = -1;
      const mx = this.mouse.x, my = this.mouse.y;
      if (mx >= 0) {
        const dist = Math.hypot(mx - g.cx, my - g.cy);
        const k = Math.floor((dist - g.rMin) / g.ringW);
        if (k >= 0 && k < Rg.nY) {
          const y = Rg.y0 + k;
          const a = (Math.atan2(my - g.cy, mx - g.cx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
          const j0 = Date.UTC(y, 0, 1) / 86400000;
          const yLen = Date.UTC(y + 1, 0, 1) / 86400000 - j0;
          const i = j0 + Math.floor((a / (Math.PI * 2)) * yLen) - D.day0;
          if (i >= 0 && i < D.N) Rg.hoverI = i;
        }
      }
      const showI = Rg.hoverI >= 0 ? Rg.hoverI : Rg.pin;
      if (showI >= 0 && e >= 0.999) {
        const p = this.ringsDayXY(showI, g);
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 8.5, 0, Math.PI * 2);
        ctx.strokeStyle = showI === Rg.pin ? C.amber : C.txt; ctx.lineWidth = 1.5; ctx.stroke();
        const era = D.eras.find(er => showI >= er.i0 && showI < er.i1);
        const s = D.S[showI], r = D.R[showI];
        this.card(ctx, mx >= 0 ? mx : p.x, my >= 0 ? my : p.y, [
          [this.fmtDate(D.day0 + showI, true), C.txt, '700 12px ' + this.GROT],
          ['SENT ' + this.fmt(s) + '  \u00b7  RECEIVED ' + this.fmt(r), s + r > 0 ? C.amber : C.faint],
          [s + r === 0 ? 'A SILENT DAY' : (era ? era.label : '\u2014'), C.dim, '9px ' + this.MONO]
        ], { border: showI === Rg.pin ? C.amber : C.line });
      }
    },

    pt_rings(type) {
      const Rg = this.M.rings; if (!Rg) return;
      if (type === 'down') Rg.pin = (Rg.hoverI >= 0 && Rg.hoverI !== Rg.pin) ? Rg.hoverI : -1;
    },

    // ============================================================
    // MODULE 14 — SILENCE  (the negative space of the record)
    // ============================================================
    initSilence() {
      const D = this.D;
      const gaps = [];
      let run = 0;
      for (let i = 0; i < D.N; i++) {
        const v = D.S[i] + D.R[i];
        if (v === 0) run++;
        else { if (run > 0) gaps.push({ i0: i - run, i1: i - 1, len: run, broke: v, brokeI: i }); run = 0; }
      }
      if (run > 0) gaps.push({ i0: D.N - run, i1: D.N - 1, len: run, broke: 0, brokeI: -1 });
      let silent = 0, maxLen = 1;
      for (const g of gaps) { silent += g.len; maxLen = Math.max(maxLen, g.len); }
      this.M.silence = { gaps, silent, maxLen, reveal: 0, hover: null, pin: null };
    },

    silenceDur(len) {
      if (len >= 365) return this.fmt(len) + ' DAYS \u00b7 ' + (len / 365.25).toFixed(1) + ' YEARS';
      if (len >= 60) return this.fmt(len) + ' DAYS \u00b7 ' + (len / 30.44).toFixed(1) + ' MONTHS';
      return len + ' DAYS';
    },

    draw_silence(ctx, W, H, dt) {
      if (!this.M.silence) this.initSilence();
      const C = this.COL, Si = this.M.silence, D = this.D;
      Si.reveal = Math.min(1, Si.reveal + dt * 0.6);
      const e = 1 - Math.pow(1 - Si.reveal, 3);
      const base = 118, topA = 46;
      const X = (i) => (i / D.N) * W;
      // era band
      ctx.font = '8px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const er of D.eras) {
        const x0 = X(er.i0), x1 = X(er.i1);
        ctx.fillStyle = er.tone === 'amber' ? 'rgba(57,255,20,0.07)' : 'rgba(91,100,114,0.07)';
        ctx.fillRect(x0, 8, x1 - x0, 18);
        ctx.fillStyle = er.tone === 'amber' ? 'rgba(57,255,20,0.6)' : C.dim;
        if (x1 - x0 > 60) ctx.fillText(er.label, (x0 + x1) / 2, 17);
      }
      // activity strip (what sound there was)
      ctx.strokeStyle = 'rgba(57,255,20,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let px = 0; px < W; px++) {
        const a = Math.floor((px / W) * D.N), b = Math.floor(((px + 1) / W) * D.N);
        let m = 0;
        for (let i = a; i <= Math.min(b, D.N - 1); i++) m = Math.max(m, D.S[i] + D.R[i]);
        if (m > 0) {
          const h = Math.sqrt(m / D.maxDay) * (base - topA) * e;
          ctx.moveTo(px + 0.5, base); ctx.lineTo(px + 0.5, base - h);
        }
      }
      ctx.stroke();
      // baseline
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(W, base); ctx.stroke();
      // icicles
      const minLen = this.state.silenceMin;
      const depthMax = H - base - 96;
      const mx = this.mouse.x, my = this.mouse.y;
      Si.hover = null;
      const shown = Si.gaps.filter(g => g.len >= minLen);
      for (const g of shown) {
        const x0 = X(g.i0), x1 = Math.max(X(g.i1 + 1), x0 + 2);
        const depth = Math.sqrt(g.len / Si.maxLen) * depthMax * e;
        g._x0 = x0; g._x1 = x1; g._d = depth;
        if (mx >= x0 - 3 && mx <= x1 + 3 && my > base && my < base + depth + 8) Si.hover = g;
      }
      for (const g of shown) {
        const lit = g === Si.hover || g === Si.pin;
        const giant = g.len >= 150;
        const cx = (g._x0 + g._x1) / 2;
        ctx.beginPath();
        ctx.moveTo(g._x0, base); ctx.lineTo(g._x1, base); ctx.lineTo(cx, base + g._d);
        ctx.closePath();
        const col = giant ? C.red : g.len >= 30 ? C.amber : C.dim;
        ctx.fillStyle = lit ? col : col + (giant ? '66' : '4d');
        ctx.fill();
        if (lit) { ctx.strokeStyle = C.txt; ctx.lineWidth = 1; ctx.stroke(); }
        // burst tick where silence broke
        if (g.brokeI >= 0) {
          ctx.strokeStyle = lit ? C.amberHi : 'rgba(57,255,20,0.35)';
          ctx.beginPath(); ctx.moveTo(X(g.brokeI), base - 3); ctx.lineTo(X(g.brokeI), base + 5); ctx.stroke();
        }
        // label the giants
        if (giant && e > 0.95) {
          ctx.font = '9px ' + this.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = lit ? C.txt : C.dim;
          ctx.fillText(this.silenceDur(g.len), cx, base + g._d + 10);
          ctx.fillStyle = C.faint; ctx.font = '8px ' + this.MONO;
          ctx.fillText(this.fmtDate(D.day0 + g.i0) + ' \u2192 ' + this.fmtDate(D.day0 + g.i1), cx, base + g._d + 24);
        }
      }
      // stats
      ctx.font = '9px ' + this.MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.dim;
      ctx.fillText(this.fmt(Si.silent) + ' OF ' + this.fmt(D.N) + ' DAYS SILENT \u2014 ' + Math.round(Si.silent / D.N * 100) + '% OF THE RECORD', 16, H - 28);
      ctx.fillStyle = C.faint;
      ctx.fillText(shown.length + ' SILENCES \u2265 ' + minLen + ' DAYS SHOWN', 16, H - 14);
      const show = Si.hover || Si.pin;
      if (show) {
        const era = D.eras.find(er => show.i0 >= er.i0 && show.i0 < er.i1);
        this.card(ctx, mx >= 0 ? mx : (show._x0 + show._x1) / 2, my >= 0 ? my : base + 30, [
          ['SILENCE \u2014 ' + this.silenceDur(show.len), C.txt, '700 12px ' + this.GROT],
          [this.fmtDate(D.day0 + show.i0, true) + ' \u2192 ' + this.fmtDate(D.day0 + show.i1, true), C.dim],
          [era ? 'DURING ' + era.label : '\u2014', C.faint, '9px ' + this.MONO],
          [show.brokeI >= 0 ? 'BROKEN BY ' + this.fmt(show.broke) + ' MESSAGES ON ' + this.fmtDate(D.day0 + show.brokeI, true) : 'UNBROKEN AT END OF RECORD', show.brokeI >= 0 ? C.amber : C.red, '9px ' + this.MONO]
        ], { border: show === Si.pin ? C.amber : C.line });
      }
    },

    pt_silence(type) {
      const Si = this.M.silence; if (!Si) return;
      if (type === 'down') Si.pin = (Si.hover && Si.hover !== Si.pin) ? Si.hover : null;
    },

    // ============================================================
    // MODULE 15 — PSYCHE  (56 rated works × the language around them)
    // ============================================================
    PSY_COLORS: { prof: '#e01aff', love: '#c77dff', both: '#7b2dff', quiet: '#6f8a5e' },

    PSY_LABELS: { prof: 'PROFANE', love: 'TENDER', both: 'CHARGED BOTH WAYS', quiet: 'QUIET' },

    initPsyche() {
      const D = this.D;
      let i0 = Infinity, i1 = -Infinity;
      const items = D.favCtx.map(f => {
        const i = this.d2i(f.date) - D.day0;
        i0 = Math.min(i0, i); i1 = Math.max(i1, i);
        const kind = f.nearby_avg_prof > 0 && f.nearby_avg_love > 0 ? 'both'
          : f.nearby_avg_prof > 0 ? 'prof' : f.nearby_avg_love > 0 ? 'love' : 'quiet';
        return { ...f, i, kind, charge: Math.max(Math.min(1, f.nearby_avg_prof / 3), Math.min(1, f.nearby_avg_love)), jy: (Math.random() - 0.5), born: Math.random() };
      });
      this.M.psyche = { items, i0: i0 - 40, i1: i1 + 40, hover: null, pinned: null, reveal: 0 };
    },

    draw_psyche(ctx, W, H, dt) {
      if (!this.M.psyche) this.initPsyche();
      const C = this.COL, P = this.M.psyche, D = this.D, kindF = this.state.psycheKind;
      P.reveal = Math.min(1, P.reveal + dt * 0.55);
      const padL = 64, padR = 40, padT = 52, padB = 60;
      const pw = W - padL - padR, ph = H - padT - padB;
      const X = (i) => padL + ((i - P.i0) / (P.i1 - P.i0)) * pw;
      const Y = (r) => padT + (1 - r / 5) * ph;
      // rating rows
      ctx.font = '9px ' + this.MONO;
      for (let r = 0; r <= 5; r++) {
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, Y(r)); ctx.lineTo(padL + pw, Y(r)); ctx.stroke();
        ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(r + ' \u2605', padL - 10, Y(r));
      }
      // year ticks
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let y = 2023; y <= 2025; y++) {
        const i = this.d2i(y + '-01-01') - D.day0;
        if (i < P.i0 || i > P.i1) continue;
        ctx.strokeStyle = 'rgba(29,36,48,0.9)';
        ctx.beginPath(); ctx.moveTo(X(i), padT); ctx.lineTo(X(i), padT + ph); ctx.stroke();
        ctx.fillStyle = C.dim; ctx.fillText(String(y), X(i), padT + ph + 10);
      }
      // axis titles
      ctx.fillStyle = C.dim; ctx.font = '9px ' + this.MONO; ctx.textAlign = 'center';
      ctx.fillText('DATE RATED \u2192', padL + pw / 2, H - 18);
      ctx.save(); ctx.translate(18, padT + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'alphabetic'; ctx.fillText('HIS RATING \u2192', 0, 0); ctx.restore();
      // legend
      let lx = padL;
      ctx.font = '9px ' + this.MONO; ctx.textBaseline = 'middle';
      for (const [k, col] of Object.entries(this.PSY_COLORS)) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx + 4, 28, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.dim; ctx.textAlign = 'left'; ctx.fillText(this.PSY_LABELS[k], lx + 12, 28);
        lx += 12 + ctx.measureText(this.PSY_LABELS[k]).width + 22;
      }
      // dots
      P.hover = null;
      let best = 14;
      const mx = this.mouse.x, my = this.mouse.y;
      for (const it of P.items) {
        if (it.born > P.reveal) continue;
        const on = kindF === 'ALL' || it.kind === kindF || (kindF === 'prof' && it.kind === 'both') || (kindF === 'love' && it.kind === 'both');
        const x = X(it.i), y = Y(Math.min(5, it.rating)) + it.jy * 14;
        it._x = x; it._y = y; it._on = on;
        if (on) { const d = Math.hypot(mx - x, my - y); if (d < best) { best = d; P.hover = it; } }
      }
      for (const it of P.items) {
        if (it.born > P.reveal) continue;
        const lit = it === P.hover || it === P.pinned;
        const col = this.PSY_COLORS[it.kind];
        const pop = Math.min(1, (P.reveal - it.born) * 8);
        if (!it._on) {
          ctx.beginPath(); ctx.arc(it._x, it._y, 2.5 * pop, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(60,68,82,0.25)'; ctx.fill();
          continue;
        }
        // charge halo
        if (it.charge > 0) {
          ctx.beginPath(); ctx.arc(it._x, it._y, (7 + it.charge * 13) * pop, 0, Math.PI * 2);
          ctx.strokeStyle = col + '55'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(it._x, it._y, (lit ? 6.5 : 4) * pop, 0, Math.PI * 2);
        ctx.fillStyle = lit ? '#ffffff' : col; ctx.fill();
        if (lit) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it._x, it._y, 9.5 * pop, 0, Math.PI * 2); ctx.stroke(); }
      }
      const show = P.pinned || P.hover;
      if (show) {
        const verdicts = {
          prof: 'RATED WHILE SWEARING \u2014 ' + show.nearby_avg_prof.toFixed(1) + ' PROFANITIES/DAY NEARBY',
          love: 'RATED IN A TENDER STRETCH \u2014 ' + show.nearby_avg_love.toFixed(1) + ' LOVES/DAY NEARBY',
          both: 'PROFANITY AND LOVE IN THE SAME FORTNIGHT',
          quiet: 'RATED IN RHETORICAL SILENCE'
        };
        this.card(ctx, mx >= 0 ? mx : show._x, my >= 0 ? my : show._y, [
          [show.title.slice(0, 44), C.txt, '700 12px ' + this.GROT],
          [this.fmtDate(D.day0 + show.i, true) + '  \u00b7  RATED ' + show.rating + '/5', C.amber],
          ['\u00b114D \u00b7 PROF ' + show.nearby_avg_prof.toFixed(1) + '/DAY \u00b7 LOVE ' + show.nearby_avg_love.toFixed(1) + '/DAY \u00b7 ' + show.nearby_days + ' ACTIVE DAYS', C.dim, '9px ' + this.MONO],
          [verdicts[show.kind], this.PSY_COLORS[show.kind], '9px ' + this.MONO]
        ], { border: show === P.pinned ? C.amber : C.line });
      }
    },

    pt_psyche(type) {
      const P = this.M.psyche; if (!P) return;
      if (type === 'down') {
        if (P.hover) P.pinned = (P.pinned === P.hover ? null : P.hover);
        else P.pinned = null;
      }
    },

    // ============================================================
    // MODULE 16 — SYNC  (linguistic style matching, him vs them)
    // ============================================================
    LSM_CATS: [
      ['i', 'FIRST PERSON', '#39ff14'],
      ['you', 'SECOND PERSON', '#b026ff'],
      ['qual', 'HEDGES', '#7b2dff'],
      ['imp', 'COMMANDS', '#e01aff'],
      ['q', 'QUESTIONS', '#00ffa3'],
      ['ex', 'EXCLAMATION', '#b6ff8f'],
      ['prof', 'PROFANITY', '#e01aff'],
      ['love', 'LOVE', '#c77dff'],
      ['sorry', 'APOLOGY', '#e0aaff'],
      ['caps', 'ALL-CAPS', '#cfa8ff']
    ],

    initSync() {
      const D = this.D;
      const items = [];
      for (const t of D.tprof) {
        if (!t.sent_features || !t.features) continue;
        const hn = t.sent_features.n, tn = t.features.n - hn;
        if (hn < 150 || tn < 150) continue;
        const him = {}, them = {}, lsm = {};
        let sum = 0, used = 0;
        for (const [k] of this.LSM_CATS) {
          const a = (t.sent_features[k] || 0) / hn * 100;
          const b = ((t.features[k] || 0) - (t.sent_features[k] || 0)) / tn * 100;
          him[k] = a; them[k] = b;
          if (a + b > 0.01) { lsm[k] = 1 - Math.abs(a - b) / (a + b); sum += lsm[k]; used++; }
          else lsm[k] = null;
        }
        if (used < 5) continue;
        items.push({
          id: t.id, named: !!D.nameOf[t.id], label: D.nameOf[t.id] || this.maskId(t.id),
          total: t.total, span: t.span_days, him, them, lsm, score: sum / used, used
        });
      }
      items.sort((a, b) => a.score - b.score);
      let lo = 1, hi = 0, maxTot = 1;
      for (const it of items) { lo = Math.min(lo, it.score); hi = Math.max(hi, it.score); maxTot = Math.max(maxTot, it.total); }
      this.M.sync = { items, lo: lo - 0.02, hi: hi + 0.02, maxTot, layoutKey: '', hover: null, pinned: null, reveal: 0 };
    },

    syncLayout(W, H) {
      const S = this.M.sync;
      const shown = S.items.filter(it => it.total >= this.state.syncMin);
      const padL = 60, padR = S.pinned ? 340 : 60;
      const pw = W - padL - padR, midY = (H - 60) / 2 + 26;
      const placed = [];
      // biggest first so heavy threads sit on the axis
      for (const it of [...shown].sort((a, b) => b.total - a.total)) {
        const r = 4 + Math.sqrt(it.total / S.maxTot) * 22;
        const x = padL + ((it.score - S.lo) / (S.hi - S.lo)) * pw;
        let y = midY, step = 0;
        const fits = (yy) => placed.every(p => Math.hypot(p.x - x, p.y - yy) >= p.r + r + 2);
        while (!fits(y)) { step++; y = midY + (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 8; }
        it._x = x; it._y = y; it._r = r;
        placed.push({ x, y, r });
      }
      S.shown = shown; S.padL = padL; S.pw = pw; S.midY = midY;
    },

    draw_sync(ctx, W, H, dt) {
      if (!this.M.sync) this.initSync();
      const C = this.COL, S = this.M.sync;
      S.reveal = Math.min(1, S.reveal + dt * 0.8);
      const e = 1 - Math.pow(1 - S.reveal, 3);
      const key = W + 'x' + H + 'x' + this.state.syncMin + 'x' + (S.pinned ? 1 : 0);
      if (S.layoutKey !== key) { S.layoutKey = key; this.syncLayout(W, H); }
      // axis
      const axisY = H - 46;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(S.padL, axisY); ctx.lineTo(S.padL + S.pw, axisY); ctx.stroke();
      ctx.font = '9px ' + this.MONO; ctx.textBaseline = 'top';
      for (let v = Math.ceil(S.lo * 20) / 20; v <= S.hi; v += 0.05) {
        const x = S.padL + ((v - S.lo) / (S.hi - S.lo)) * S.pw;
        ctx.strokeStyle = C.grid;
        ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, axisY); ctx.stroke();
        ctx.fillStyle = C.faint; ctx.textAlign = 'center';
        ctx.fillText('.' + Math.round(v * 100), x, axisY + 8);
      }
      ctx.fillStyle = C.dim; ctx.textAlign = 'left';
      ctx.fillText('\u2190 DIFFERENT REGISTERS', S.padL, 26);
      ctx.textAlign = 'right';
      ctx.fillText('THEY SPEAK HIS LANGUAGE \u2192', S.padL + S.pw, 26);
      ctx.textAlign = 'center';
      ctx.fillText('STYLE MATCH \u2014 MEAN OF TEN CHANNELS', S.padL + S.pw / 2, axisY + 22);
      // dots
      S.hover = null;
      const mx = this.mouse.x, my = this.mouse.y;
      for (const it of S.shown) {
        if (mx >= 0 && Math.hypot(mx - it._x, my - it._y) <= it._r + 2) S.hover = it;
      }
      for (const it of S.shown) {
        const lit = it === S.hover || it === S.pinned;
        const r = it._r * e;
        ctx.beginPath(); ctx.arc(it._x, it._y, r, 0, Math.PI * 2);
        const base = it.named ? C.amber : C.violet;
        ctx.fillStyle = lit ? base : base + '3d';
        ctx.fill();
        ctx.strokeStyle = lit ? C.txt : base + '88'; ctx.lineWidth = lit ? 1.5 : 1;
        ctx.stroke();
        if ((it.named || it._r > 14 || lit) && e > 0.9) {
          ctx.font = (lit ? '700 ' : '') + '9px ' + this.MONO;
          ctx.fillStyle = lit ? C.txt : C.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(it.label, it._x, it._y - r - 9);
        }
      }
      // breakdown panel (pinned) or hover card
      if (S.pinned) this.syncPanel(ctx, W, H, S.pinned);
      else if (S.hover) {
        this.card(ctx, mx, my, [
          [S.hover.label, S.hover.named ? C.amberHi : C.txt, '700 12px ' + this.GROT],
          ['STYLE MATCH ' + S.hover.score.toFixed(3) + '  \u00b7  ' + this.fmt(S.hover.total) + ' MESSAGES', C.amber],
          ['CLICK FOR THE TEN-CHANNEL BREAKDOWN', C.faint, '9px ' + this.MONO]
        ]);
      }
    },

    syncPanel(ctx, W, H, it) {
      const C = this.COL;
      const px = W - 324, py = 40, pwid = 304, ph = H - 96;
      ctx.fillStyle = 'rgba(13,17,24,0.96)';
      ctx.strokeStyle = C.line;
      ctx.beginPath(); ctx.rect(px, py, pwid, ph); ctx.fill(); ctx.stroke();
      ctx.font = '700 13px ' + this.GROT; ctx.fillStyle = it.named ? C.amberHi : C.txt;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(it.label, px + 16, py + 26);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('STYLE MATCH ' + it.score.toFixed(3) + ' \u00b7 ' + this.fmt(it.total) + ' MSGS \u00b7 ' + this.fmt(it.span) + ' DAYS', px + 16, py + 44);
      ctx.fillStyle = C.faint;
      ctx.fillText('RATES PER 100 MESSAGES \u00b7 \u25a0 HIM  \u25a0 THEM', px + 16, py + 60);
      const rowH = Math.min(42, (ph - 90) / this.LSM_CATS.length);
      let y = py + 78;
      for (const [k, label] of this.LSM_CATS) {
        const a = it.him[k], b = it.them[k], m = Math.max(a, b, 0.001);
        const bw = pwid - 120;
        ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(label, px + 16, y + 8);
        const v = it.lsm[k];
        ctx.fillStyle = v === null ? C.faint : v > 0.8 ? C.green : v > 0.55 ? C.amber : C.red;
        ctx.textAlign = 'right';
        ctx.fillText(v === null ? '\u2014' : v.toFixed(2), px + pwid - 14, y + 8);
        ctx.textAlign = 'left';
        ctx.fillStyle = C.amber;
        ctx.fillRect(px + 100, y + 2, (a / m) * bw * 0.55, 5);
        ctx.fillStyle = C.cyan;
        ctx.fillRect(px + 100, y + 9, (b / m) * bw * 0.55, 5);
        ctx.font = '7.5px ' + this.MONO; ctx.fillStyle = C.faint;
        ctx.fillText(a.toFixed(1), px + 100 + (a / m) * bw * 0.55 + 5, y + 7);
        ctx.fillText(b.toFixed(1), px + 100 + (b / m) * bw * 0.55 + 5, y + 14);
        y += rowH;
      }
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText('CLICK ELSEWHERE TO CLOSE', px + 16, py + ph - 12);
    },

    pt_sync(type) {
      const S = this.M.sync; if (!S) return;
      if (type === 'down') {
        S.pinned = (S.hover && S.hover !== S.pinned) ? S.hover : null;
        S.layoutKey = '';
      }
    },

    // ============================================================
    // MODULE 17 — DRIFT  (month × month rhetorical self-similarity)
    // ============================================================
    DRIFT_FEATS: ['caps', 'prof', 'sorry', 'love', 'you', 'i', 'qual', 'imp', 'q', 'ex'],

    initDrift() {
      const D = this.D, min = this.state.driftMin;
      // aggregate rhetoric by month
      const agg = new Map();
      for (const d of D.rhet) {
        const m = d.date.slice(0, 7);
        let a = agg.get(m);
        if (!a) { a = { m, total: 0 }; for (const k of this.DRIFT_FEATS) a[k] = 0; agg.set(m, a); }
        a.total += d.total;
        for (const k of this.DRIFT_FEATS) a[k] += d[k] || 0;
      }
      const months = [...agg.values()].filter(a => a.total >= min).sort((a, b) => a.m < b.m ? -1 : 1);
      const nM = months.length, nF = this.DRIFT_FEATS.length;
      // per-message rates, then z-score each feature across months
      const vecs = months.map(a => this.DRIFT_FEATS.map(k => a[k] / a.total * 100));
      for (let f = 0; f < nF; f++) {
        let mu = 0; for (const v of vecs) mu += v[f]; mu /= nM;
        let sd = 0; for (const v of vecs) sd += (v[f] - mu) ** 2; sd = Math.sqrt(sd / nM) || 1;
        for (const v of vecs) v[f] = (v[f] - mu) / sd;
      }
      const cos = (a, b) => {
        let d = 0, na = 0, nb = 0;
        for (let f = 0; f < nF; f++) { d += a[f] * b[f]; na += a[f] * a[f]; nb += b[f] * b[f]; }
        return d / (Math.sqrt(na * nb) || 1);
      };
      const sim = new Float32Array(nM * nM);
      for (let i = 0; i < nM; i++) for (let j = 0; j < nM; j++) sim[i * nM + j] = cos(vecs[i], vecs[j]);
      // self-consistency: mean similarity to every other month
      const cons = months.map((_, i) => {
        let s = 0; for (let j = 0; j < nM; j++) if (j !== i) s += sim[i * nM + j];
        return s / (nM - 1);
      });
      this.M.drift = { months, vecs, sim, cons, nM, min, cacheKey: '', cache: null, hover: null, pin: null, reveal: 0 };
    },

    driftRender(size) {
      const Dr = this.M.drift, nM = Dr.nM;
      const cv = document.createElement('canvas');
      const px = Math.max(1, Math.floor(size * this.dpr / nM));
      cv.width = px * nM; cv.height = px * nM;
      const ctx = cv.getContext('2d');
      for (let i = 0; i < nM; i++) for (let j = 0; j < nM; j++) {
        const s = Dr.sim[i * nM + j];
        const a = Math.min(1, Math.abs(s)) * 0.92 + 0.06;
        ctx.fillStyle = s >= 0 ? 'rgba(57,255,20,' + a.toFixed(3) + ')' : 'rgba(176,38,255,' + (a * 0.9).toFixed(3) + ')';
        ctx.fillRect(j * px, i * px, px, px);
      }
      return cv;
    },

    draw_drift(ctx, W, H, dt) {
      if (!this.M.drift || this.M.drift.min !== this.state.driftMin) this.initDrift();
      const C = this.COL, Dr = this.M.drift, nM = Dr.nM;
      Dr.reveal = Math.min(1, Dr.reveal + dt * 0.9);
      const e = 1 - Math.pow(1 - Dr.reveal, 3);
      const size = Math.min(W - 320, H - 110);
      const ox = 70, oy = 58;
      const key = size + 'x' + nM + 'x' + this.dpr;
      if (Dr.cacheKey !== key) { Dr.cacheKey = key; Dr.cache = this.driftRender(size); }
      ctx.save();
      ctx.globalAlpha = e;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(Dr.cache, ox, oy, size, size);
      ctx.restore();
      ctx.strokeStyle = C.line; ctx.strokeRect(ox + 0.5, oy + 0.5, size, size);
      // year ticks on both axes
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.dim;
      let lastY = '';
      for (let i = 0; i < nM; i++) {
        const y = Dr.months[i].m.slice(0, 4);
        if (y !== lastY) {
          lastY = y;
          const t = (i / nM) * size;
          ctx.strokeStyle = 'rgba(7,9,13,0.55)';
          ctx.beginPath(); ctx.moveTo(ox + t, oy); ctx.lineTo(ox + t, oy + size); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ox, oy + t); ctx.lineTo(ox + size, oy + t); ctx.stroke();
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillStyle = C.dim;
          ctx.fillText("'" + y.slice(2), ox - 8, oy + t + 4);
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText("'" + y.slice(2), ox + t + 6, oy - 6);
        }
      }
      // consistency spine at right of matrix
      const sx = ox + size + 24, sw = 74;
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('SOUNDS LIKE', sx, oy - 16);
      ctx.fillText('HIMSELF \u2192', sx, oy - 6);
      let cLo = 1, cHi = -1;
      for (const c of Dr.cons) { cLo = Math.min(cLo, c); cHi = Math.max(cHi, c); }
      for (let i = 0; i < nM; i++) {
        const t = ((i + 0.5) / nM) * size;
        const w = ((Dr.cons[i] - cLo) / (cHi - cLo || 1)) * sw * e;
        ctx.fillStyle = Dr.cons[i] < cLo + (cHi - cLo) * 0.25 ? C.red : 'rgba(57,255,20,0.55)';
        ctx.fillRect(sx, oy + t - Math.max(1, size / nM / 2 - 1) / 2, w, Math.max(1, size / nM - 2));
      }
      // hover
      Dr.hover = null;
      const mx = this.mouse.x, my = this.mouse.y;
      if (mx >= ox && mx < ox + size && my >= oy && my < oy + size) {
        const j = Math.floor((mx - ox) / size * nM), i = Math.floor((my - oy) / size * nM);
        Dr.hover = { i, j };
      }
      const show = Dr.hover || Dr.pin;
      if (show) {
        const { i, j } = show;
        const cs = size / nM;
        ctx.strokeStyle = C.txt; ctx.lineWidth = 1;
        ctx.strokeRect(ox + j * cs, oy + i * cs, cs, cs);
        ctx.strokeStyle = 'rgba(232,230,225,0.25)';
        ctx.strokeRect(ox, oy + i * cs, size, cs);
        ctx.strokeRect(ox + j * cs, oy, cs, size);
        const s = Dr.sim[i * nM + j];
        // top diverging / agreeing feature
        let worst = 0, wf = 0;
        for (let f = 0; f < this.DRIFT_FEATS.length; f++) {
          const d = Math.abs(Dr.vecs[i][f] - Dr.vecs[j][f]);
          if (d > worst) { worst = d; wf = f; }
        }
        const FN = { caps: 'ALL-CAPS', prof: 'PROFANITY', sorry: 'APOLOGY', love: 'LOVE', you: 'YOU', i: 'I', qual: 'HEDGES', imp: 'COMMANDS', q: 'QUESTIONS', ex: 'EXCLAMATION' };
        const mA = Dr.months[i], mB = Dr.months[j];
        const fm = (m) => this.fmtDate(this.d2i(m.m + '-15'));
        this.card(ctx, mx >= 0 ? mx : ox + j * cs, my >= 0 ? my : oy + i * cs, [
          [fm(mA) + '  \u00d7  ' + fm(mB), C.txt, '700 12px ' + this.GROT],
          [i === j ? 'IDENTITY \u2014 SAME MONTH' : 'VOICE SIMILARITY ' + s.toFixed(2), i === j ? C.dim : s >= 0 ? C.amber : C.cyan],
          [this.fmt(mA.total) + ' vs ' + this.fmt(mB.total) + ' MESSAGES', C.dim, '9px ' + this.MONO],
          [i === j ? '\u2014' : 'BIGGEST SHIFT: ' + FN[this.DRIFT_FEATS[wf]] + ' (\u0394 ' + worst.toFixed(1) + '\u03c3)', C.faint, '9px ' + this.MONO]
        ], { border: Dr.pin && show === Dr.pin ? C.amber : C.line });
      }
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(nM + ' ACTIVE MONTHS \u00b7 TEN RHETORICAL CHANNELS, Z-SCORED \u00b7 COSINE SIMILARITY', ox, H - 18);
    },

    pt_drift(type) {
      const Dr = this.M.drift; if (!Dr) return;
      if (type === 'down') Dr.pin = (Dr.hover && (!Dr.pin || Dr.hover.i !== Dr.pin.i || Dr.hover.j !== Dr.pin.j)) ? Dr.hover : null;
    },

    // ============================================================
    // MODULE 07 — WEATHER  (real weather · non-Annie corpus ·
    // four pens · needle scrubber · fragment surfacer · void link)
    // ============================================================
    WPENS: [
      ['cold', 'COLD', '#b026ff'],
      ['hot', 'HOT', '#e01aff'],
      ['precip', 'PRECIP', '#7b2dff'],
      ['travel', 'TRAVEL', '#00ffa3']
    ],

    SEASON_COL: { winter: '#b026ff', spring: '#00ffa3', summer: '#e01aff', fall: '#39ff14' },

    initWeather07() {
      const wx = this.D.wx || {};
      const weeks = wx.weeks || [];
      if (!weeks.length) { this.M.wx = { nW: 0 }; return; }
      const day0 = this.d2i(weeks[0].week);
      const nW = Math.floor((this.d2i(weeks[weeks.length - 1].week) - day0) / 7) + 1;
      const keys = this.WPENS.map(p => p[0]);
      const rate = {}, msgs = new Float32Array(nW), rhetInt = new Float32Array(nW);
      const locNyc = new Float32Array(nW), locUt = new Float32Array(nW);
      for (const k of keys) rate[k] = new Float32Array(nW);
      const weekAt = new Array(nW).fill(null);
      for (const w of weeks) {
        const i = Math.floor((this.d2i(w.week) - day0) / 7);
        if (i < 0 || i >= nW) continue;
        weekAt[i] = w;
        msgs[i] = w.count || 0;
        rhetInt[i] = (w.rhet && w.rhet.intensity) || 0;
        locNyc[i] = (w.rate_weather && w.rate_weather.loc_nyc) || 0;
        locUt[i] = (w.rate_weather && w.rate_weather.loc_ut) || 0;
        for (const k of keys) rate[k][i] = (w.rate_weather && w.rate_weather[k]) || 0;
      }
      // 3-week smoothing for legible pens (raw kept on weekAt for the readout)
      const smooth = (arr) => {
        const out = new Float32Array(nW);
        for (let i = 0; i < nW; i++) {
          let s = 0, n = 0;
          for (let j = Math.max(0, i - 1); j <= Math.min(nW - 1, i + 1); j++) { s += arr[j]; n++; }
          out[i] = s / n;
        }
        return out;
      };
      for (const k of keys) rate[k] = smooth(rate[k]);
      const maxRate = {};
      for (const k of keys) { let m = 0.001; for (let i = 0; i < nW; i++) m = Math.max(m, rate[k][i]); maxRate[k] = m; }
      let maxMsgs = 1, maxRhet = 0.001;
      for (let i = 0; i < nW; i++) { maxMsgs = Math.max(maxMsgs, msgs[i]); maxRhet = Math.max(maxRhet, rhetInt[i]); }
      // fragments → week float positions
      const frags = (wx.fragments || []).map(f => ({
        pos: (this.d2i(f.week) - day0) / 7 + 0.5,
        text: f.text,
        tag: f.week + (f.type === 'high_signal' ? ' · HIGH SIGNAL' : ''),
        shownAt: 0
      })).filter(f => f.pos >= 0 && f.pos < nW + 1).sort((a, b) => a.pos - b.pos);
      this.penAttributeFrags(frags, this.WPENS, rate, maxRate);
      // high-volatility days → lightning markers
      const an = wx.analysis || {};
      const bolts = (an.high_volatility_weather_days || []).map(d => ({
        ...d,
        pos: (this.d2i(d.date) - day0) / 7
      })).filter(b => b.pos >= 0 && b.pos < nW);
      // analysis microcopy
      const corr = an.correlations || {};
      const bySeason = (an.seasonal_monthly_rhetoric_shifts && an.seasonal_monthly_rhetoric_shifts.by_season) || {};
      this.M.wx = {
        day0, nW, rate, maxRate, msgs, maxMsgs, rhetInt, maxRhet, locNyc, locUt, weekAt,
        frags, bolts, corr, bySeason,
        insights: an.insights || [],
        play: 0.001, scrub: false, hoverBolt: null, scrubGeo: null
      };
    },

    draw_weather(ctx, W, H, dt) {
      if (this.state.weatherView === 'storm') { this.draw_weatherStorm(ctx, W, H, dt); return; }
      if (!this.M.wx) this.initWeather07();
      const C = this.COL, X = this.M.wx, st = this.state;
      if (!X.nW) {
        ctx.font = '11px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
        ctx.fillText('WEATHER DATA NOT LOADED — run analyze_weather.py', W / 2, H / 2);
        return;
      }
      if (st.weatherPlay && !X.scrub) {
        X.play += st.weatherSpeed * dt;
        if (X.play >= X.nW - 0.01) { X.play = X.nW - 0.01; this.setState({ weatherPlay: false }); }
      }
      const chartR = W * 0.62;
      const padL = 110, padT = 64, padB = 74;
      const laneGap = 10;
      const nLanes = this.WPENS.length + 1;
      const laneH = (H - padT - padB - laneGap * (nLanes - 1)) / nLanes;
      const xOf = (m) => padL + (m / (X.nW - 1)) * (chartR - padL - 20);
      const playX = xOf(X.play);
      const geo = { padL, padT, laneH, laneGap, x0: padL, x1: chartR - 20, xOf };
      const vy0 = padT + this.WPENS.length * (laneH + laneGap);

      // era bands behind everything (location context: NYC ↔ Uniontown)
      this.drawEraBands(ctx, xOf, (di) => di / 7 - (X.day0 - this.D.day0) / 7, padT - 14, vy0 + laneH);

      // header
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = C.cyanHi;
      ctx.fillText('WEATHER', 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('NON-ANNIE CORPUS · ' + X.nW + ' WEEKS · KEYWORD CLIMATE × RHETORIC', 18, 48);
      // playhead readout + season chip
      const wi = Math.max(0, Math.min(X.nW - 1, Math.floor(X.play)));
      const d = this.i2d(X.day0 + wi * 7);
      const MN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mo = d.getUTCMonth();
      const season = (mo === 11 || mo <= 1) ? 'winter' : mo <= 4 ? 'spring' : mo <= 7 ? 'summer' : 'fall';
      const sCol = this.SEASON_COL[season];
      ctx.font = '600 13px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
      ctx.fillText(MN[mo] + ' ' + d.getUTCFullYear() + ' · ' + this.fmt(X.msgs[wi]) + ' MSGS', chartR - 86, 32);
      ctx.fillStyle = sCol;
      ctx.fillRect(chartR - 78, 21, 58, 14);
      ctx.fillStyle = '#10001f'; ctx.font = '600 8px ' + this.MONO; ctx.textAlign = 'center';
      ctx.fillText(season.toUpperCase(), chartR - 49, 31);
      ctx.textAlign = 'left';

      // four pens + volume (the Annie instrument, generalized)
      const lanes = this.WPENS.map(([k, label, col]) => ({
        data: X.rate[k], label, unit: '/100 MSG', color: col, max: X.maxRate[k]
      }));
      this.drawPenLanes(ctx, geo, lanes, X.play, st.weatherPlay);
      this.drawVolumeLane(ctx, geo, vy0, X.msgs, X.maxMsgs, X.play, C.amber);

      // playhead needle
      ctx.strokeStyle = 'rgba(232,230,225,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(playX, padT - 6); ctx.lineTo(playX, vy0 + laneH + 8); ctx.stroke();
      // year ticks
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let y = 2011; y <= 2027; y++) {
        const m = (this.d2i(y + '-01-01') - X.day0) / 7;
        if (m < 0 || m > X.nW - 1) continue;
        ctx.fillText(String(y), xOf(m), vy0 + laneH + 12);
      }
      X.scrubGeo = { x0: padL, x1: chartR - 20, y1: vy0 + laneH };

      // ⚡ high-volatility day strikes above the lanes
      X.hoverBolt = null;
      for (const b of X.bolts) {
        const x = xOf(b.pos);
        const near = Math.abs(this.mouse.x - x) < 7 && this.mouse.y < padT;
        if (near) X.hoverBolt = { ...b, x };
        const flick = near ? 1 : (0.5 + 0.5 * Math.sin(performance.now() / 280 + b.pos));
        ctx.strokeStyle = 'rgba(255,235,180,' + (0.35 + 0.55 * flick) + ')';
        ctx.lineWidth = near ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x, padT - 22); ctx.lineTo(x - 3, padT - 13); ctx.lineTo(x + 2, padT - 11); ctx.lineTo(x, padT - 4);
        ctx.stroke();
      }
      if (X.hoverBolt) {
        const b = X.hoverBolt;
        this.card(ctx, b.x, padT + 16, [
          ['⚡ ' + b.date + ' · COMPOSITE ' + Math.round(b.composite_vol), C.amberHi, '600 11px ' + this.MONO],
          ['COLD ' + b.weather_hits.cold + ' · HOT ' + b.weather_hits.hot + ' · PRECIP ' + b.weather_hits.precip + ' · TRAVEL ' + b.weather_hits.travel, C.cyan],
          ['RHET INTENSITY ' + b.rhet_intensity + ' · ' + this.fmt(b.msg_total) + ' MSGS', C.red],
          [(b.samples && b.samples[0] ? '“' + b.samples[0].slice(0, 64) + '…”' : 'no verbatim sample'), C.dim, 'italic 9px ' + this.GROT]
        ], { border: C.amber });
      }

      // ---- right rail: conditions readout + fragment surfacer + analysis strip ----
      const fx = chartR + 8, fw = W - fx - 16;
      // conditions
      const cy0 = padT - 22, ch = 128;
      ctx.fillStyle = 'rgba(11,15,21,0.85)';
      ctx.fillRect(fx, cy0, fw, ch);
      ctx.strokeStyle = C.line; ctx.strokeRect(fx + 0.5, cy0 + 0.5, fw, ch);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText('CONDITIONS AT NEEDLE · RATES /100 MSG', fx + 14, cy0 + 16);
      let cx2 = fx + 14;
      this.WPENS.forEach(([k, label, col]) => {
        const v = X.rate[k][wi];
        ctx.font = '600 15px ' + this.MONO; ctx.fillStyle = col;
        ctx.fillText(v.toFixed(1), cx2, cy0 + 44);
        ctx.font = '7.5px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(label, cx2, cy0 + 56);
        cx2 += (fw - 28) / 4;
      });
      // rhet intensity bar
      const rv = X.rhetInt[wi] / X.maxRhet;
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('RHETORICAL PRESSURE', fx + 14, cy0 + 78);
      ctx.fillStyle = '#1a2029'; ctx.fillRect(fx + 14, cy0 + 84, fw - 28, 5);
      ctx.fillStyle = C.red; ctx.fillRect(fx + 14, cy0 + 84, (fw - 28) * Math.min(1, rv), 5);
      // location lean bar NYC ↔ UT
      const nycV = X.locNyc[wi], utV = X.locUt[wi];
      const lean = (nycV + utV) > 0.01 ? nycV / (nycV + utV) : 0.5;
      ctx.fillStyle = C.dim;
      ctx.fillText('UNIONTOWN', fx + 14, cy0 + 104);
      ctx.textAlign = 'right'; ctx.fillText('NYC', fx + fw - 14, cy0 + 104); ctx.textAlign = 'left';
      ctx.fillStyle = '#1a2029'; ctx.fillRect(fx + 14, cy0 + 110, fw - 28, 5);
      ctx.fillStyle = C.amber;
      ctx.fillRect(fx + 14 + (fw - 28) * lean - 2, cy0 + 109, 4, 7);

      // fragment surfacer (weather verbatims, typewriter)
      const fgy = cy0 + ch + 10;
      const analysisH = 96;
      const fgh = H - fgy - analysisH - 24;
      this.drawFragmentFeed(ctx, { fx, fy: fgy, fw, fh: fgh }, X.frags, X.play, 'WEATHER FRAGMENTS · VERBATIM · NON-ANNIE', '#b026ff');

      // analysis strip: seasonal means + correlations from the one-pass
      const ay0 = fgy + fgh + 10;
      ctx.fillStyle = 'rgba(11,15,21,0.85)';
      ctx.fillRect(fx, ay0, fw, analysisH);
      ctx.strokeStyle = C.line; ctx.strokeRect(fx + 0.5, ay0 + 0.5, fw, analysisH);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.faint;
      ctx.fillText('ONE-PASS FINDINGS · ' + X.bolts.length + ' HIGH-VOL DAYS PLOTTED', fx + 14, ay0 + 16);
      let sy = ay0 + 34;
      const seasons = ['winter', 'spring', 'summer', 'fall'];
      let sx2 = fx + 14;
      for (const s of seasons) {
        const v = X.bySeason[s];
        if (!v) continue;
        ctx.font = '600 12px ' + this.MONO; ctx.fillStyle = this.SEASON_COL[s];
        ctx.fillText((v.mean != null ? v.mean.toFixed(1) : '–'), sx2, sy);
        ctx.font = '7px ' + this.MONO; ctx.fillStyle = C.dim;
        ctx.fillText(s.toUpperCase() + ' RHET', sx2, sy + 11);
        ctx.fillText('σ ' + (v.volatility != null ? v.volatility.toFixed(1) : '–'), sx2, sy + 21);
        sx2 += (fw - 28) / 4;
      }
      sy += 38;
      ctx.font = '8px ' + this.MONO; ctx.fillStyle = C.dim;
      const cPrecip = X.corr.precip_vs_rhet_int, cCold = X.corr.cold_vs_apology, cTravel = X.corr.travel_vs_rhet_int;
      ctx.fillText('r  PRECIP×RHET ' + (cPrecip != null ? cPrecip.toFixed(2) : '–')
        + '  ·  COLD×APOLOGY ' + (cCold != null ? cCold.toFixed(2) : '–')
        + '  ·  TRAVEL×RHET ' + (cTravel != null ? cTravel.toFixed(2) : '–'), fx + 14, sy);
    },

    pt_weather(type, p, e) {
      if (this.state.weatherView === 'storm') { this.pt_weatherStorm(type, p, e); return; }
      const X = this.M.wx; if (!X || !X.scrubGeo) return;
      const g = X.scrubGeo;
      if (type === 'down') {
        if (X.hoverBolt) {
          X.play = Math.max(0.001, Math.min(X.nW - 0.01, X.hoverBolt.pos));
          for (const f of X.frags) f.shownAt = f.pos <= X.play ? (f.shownAt || performance.now()) : 0;
          this.setState({ weatherPlay: false });
          return;
        }
        if (p.x < g.x1 + 20 && p.x > g.x0 - 20) {
          X.scrub = true;
          X.play = Math.max(0.001, Math.min(X.nW - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (X.nW - 1)));
        }
      } else if (type === 'move' && X.scrub && this.mouse.down) {
        X.play = Math.max(0.001, Math.min(X.nW - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (X.nW - 1)));
      } else if (type === 'up' || type === 'leave') {
        X.scrub = false;
      }
    },

    // ============================================================
    // MODULE 18 — ORACLE  (the same full-corpus record as POLYGRAPH ·
    // all six rhetorical channels, read as a rotating radar instead
    // of parallel lanes — one hexagon per month, ghosted trail behind it)
    // ============================================================
    OPENS: [
      ['love', 'LOVE', '#c77dff'],
      ['sorry', 'APOLOGY', '#00ffa3'],
      ['qual', 'HEDGE', '#b026ff'],
      ['imp', 'COMMAND', '#39ff14'],
      ['prof', 'PROFANITY', '#e01aff'],
      ['caps', 'SHOUT', '#e9ffe6']
    ],

    initOracle() {
      const D = this.D;
      const mIdx = (m) => +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1);
      const m0 = mIdx(D.msg.monthly[0][0]);
      const m1 = mIdx(D.msg.monthly[D.msg.monthly.length - 1][0]);
      const nM = m1 - m0 + 1;
      const vol = new Float32Array(nM);
      for (const [m, s, r] of D.msg.monthly) { const i = mIdx(m) - m0; if (i >= 0 && i < nM) vol[i] = s + r; }
      const tot = new Float32Array(nM);
      const sums = {};
      for (const [k] of this.OPENS) sums[k] = new Float32Array(nM);
      for (const d of D.rhet) {
        const i = mIdx(d.date) - m0;
        if (i < 0 || i >= nM) continue;
        tot[i] += d.total || 0;
        for (const [k] of this.OPENS) sums[k][i] += d[k] || 0;
      }
      const rates = {};
      for (const [k] of this.OPENS) {
        rates[k] = new Float32Array(nM);
        for (let i = 0; i < nM; i++) rates[k][i] = tot[i] > 20 ? sums[k][i] / tot[i] * 100 : 0;
      }
      const maxRate = {};
      for (const [k] of this.OPENS) { let m = 0.001; for (let i = 0; i < nM; i++) m = Math.max(m, rates[k][i]); maxRate[k] = m; }
      let maxVol = 1;
      for (let i = 0; i < nM; i++) maxVol = Math.max(maxVol, vol[i]);
      const fragSrc = (D.crossFrags && D.crossFrags.length) ? D.crossFrags : D.frags;
      const frags = fragSrc.map(f => ({
        pos: (mIdx(f.day.slice(0, 7)) - m0) + (+f.day.slice(8, 10) - 1) / 30.5,
        text: f.text, tag: f.day, shownAt: 0
      })).filter(f => f.pos >= 0 && f.pos < nM).sort((a, b) => a.pos - b.pos);
      this.penAttributeFrags(frags, this.OPENS, rates, maxRate);
      const monthLabel = (i) => { const y = Math.floor((m0 + i) / 12), mo = (m0 + i) % 12; return y + '-' + String(mo + 1).padStart(2, '0'); };
      this.M.oracle = { nM, m0, rates, maxRate, vol, maxVol, frags, monthLabel, play: 0.001, scrub: false, scrubGeo: null };
    },

    draw_oracle(ctx, W, H, dt) {
      if (!this.M.oracle) this.initOracle();
      const C = this.COL, Or = this.M.oracle, st = this.state;
      if (st.oraclePlay && !Or.scrub) {
        Or.play += st.oracleSpeed * dt;
        if (Or.play >= Or.nM - 0.01) { Or.play = Or.nM - 0.01; this.setState({ oraclePlay: false }); }
      }
      const railW = W * 0.6, fx = railW + 8, fw = W - fx - 16;
      const stripH = 84, radarB = H - stripH - 10;
      const cx = railW / 2, cy = (54 + radarB) / 2 + 6;
      const R = Math.max(40, Math.min(railW * 0.36, (radarB - 60) * 0.42));

      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = C.violetHi;
      ctx.fillText('ORACLE', 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('FULL CORPUS · SIX RHETORICAL CHANNELS · ONE HEXAGON PER MONTH · 2011 → 2026', 18, 48);
      const mi = Math.min(Or.nM - 1, Math.floor(Or.play));
      const my2 = Or.monthLabel(mi);
      const MN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      ctx.font = '600 13px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
      ctx.fillText(MN[+my2.slice(5, 7) - 1] + ' ' + my2.slice(0, 4) + ' · ' + this.fmt(Or.vol[mi]) + ' MSGS', railW - 8, 32);
      ctx.textAlign = 'left';

      // axes + grid rings
      const angleOf = (i) => -Math.PI / 2 + i * (Math.PI * 2 / this.OPENS.length);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        this.OPENS.forEach(([, , ], i) => {
          const a = angleOf(i), r = R * ring / 4;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath(); ctx.stroke();
      }
      this.OPENS.forEach(([k, label, col], i) => {
        const a = angleOf(i);
        ctx.strokeStyle = 'rgba(232,230,225,0.12)';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
        const lx = cx + Math.cos(a) * (R + 14), ly = cy + Math.sin(a) * (R + 14);
        ctx.font = '9px ' + this.MONO; ctx.fillStyle = col;
        ctx.textAlign = Math.cos(a) > 0.3 ? 'left' : Math.cos(a) < -0.3 ? 'right' : 'center';
        ctx.textBaseline = Math.sin(a) > 0.3 ? 'top' : Math.sin(a) < -0.3 ? 'bottom' : 'middle';
        ctx.fillText(label, lx, ly);
      });
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

      // ghost trail — the six months behind the playhead, fading
      const vertexAt = (play) => {
        const v = this.oracleValAtGiven(Or, play);
        return this.OPENS.map(([k], i) => {
          const a = angleOf(i), r = Math.min(1, v[k] / Or.maxRate[k]) * R;
          return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
        });
      };
      for (let g = 6; g >= 1; g--) {
        const p = Or.play - g * 1.15;
        if (p < 0) continue;
        const verts = vertexAt(p);
        ctx.beginPath();
        verts.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
        ctx.closePath();
        ctx.strokeStyle = 'rgba(123,45,255,' + (0.05 + (6 - g) * 0.02).toFixed(3) + ')';
        ctx.lineWidth = 1; ctx.stroke();
      }
      // current hexagon
      const verts = vertexAt(Or.play);
      ctx.beginPath();
      verts.forEach((v, i) => i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(123,45,255,0.14)'; ctx.fill();
      ctx.strokeStyle = C.violetHi; ctx.lineWidth = 1.6; ctx.stroke();
      const curVal = this.oracleValAtGiven(Or, Or.play);
      verts.forEach((v, i) => {
        const [k, , col] = this.OPENS[i];
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(v.x, v.y, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.font = '600 9px ' + this.MONO;
        ctx.fillText(curVal[k].toFixed(1), v.x + 6, v.y - 6);
      });

      // scrub strip along the bottom — volume + era bands + playhead
      const stripY = radarB + 10;
      const geo = { padL: 46, padT: stripY, laneH: stripH - 22, laneGap: 0, x0: 46, x1: railW - 12, xOf: (m) => 46 + (m / (Or.nM - 1)) * (railW - 12 - 46) };
      this.drawEraBands(ctx, geo.xOf, (di) => {
        const d = this.i2d(this.D.day0 + di);
        return (d.getUTCFullYear() * 12 + d.getUTCMonth()) - Or.m0 + (d.getUTCDate() - 1) / 30.5;
      }, stripY - 12, stripY + geo.laneH);
      this.drawVolumeLane(ctx, geo, stripY, Or.vol, Or.maxVol, Or.play, C.violet);
      const playX = geo.xOf(Or.play);
      ctx.strokeStyle = 'rgba(232,230,225,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(playX, stripY - 6); ctx.lineTo(playX, stripY + geo.laneH + 4); ctx.stroke();
      Or.scrubGeo = { x0: geo.x0, x1: geo.x1, y1: stripY + geo.laneH };

      this.drawFragmentFeed(ctx, { fx, fy: 8, fw, fh: H - 24 }, Or.frags, Or.play, 'HIGH-SIGNAL FRAGMENTS · FULL RECORD', '#cfa8ff');
    },

    oracleValAtGiven(Or, play) {
      const i0 = Math.floor(Math.min(Or.nM - 1, Math.max(0, play))), f = Math.max(0, play) - i0;
      const out = {};
      for (const [k] of this.OPENS) { const a = Or.rates[k]; out[k] = a[i0] * (1 - f) + a[Math.min(Or.nM - 1, i0 + 1)] * f; }
      return out;
    },

    pt_oracle(type, p) {
      const Or = this.M.oracle; if (!Or) return;
      const g = Or.scrubGeo; if (!g) return;
      if (type === 'down' && p.x < g.x1 + 20 && p.x > g.x0 - 20 && p.y > g.y1 - 30) {
        Or.scrub = true;
        Or.play = Math.max(0.001, Math.min(Or.nM - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (Or.nM - 1)));
      } else if (type === 'move' && Or.scrub && this.mouse.down) {
        Or.play = Math.max(0.001, Math.min(Or.nM - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (Or.nM - 1)));
      } else if (type === 'up' || type === 'leave') {
        Or.scrub = false;
      }
    },

    // ============================================================
    // MODULE 19 — AUTHORITY  (who's asserting, who's deferring ·
    // command vs hedge, monthly, full corpus, with a diverging
    // balance lane between them — same instrument shell as POLYGRAPH)
    // ============================================================
    initAuthority() {
      const D = this.D;
      const mIdx = (m) => +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1);
      const m0 = mIdx(D.msg.monthly[0][0]);
      const m1 = mIdx(D.msg.monthly[D.msg.monthly.length - 1][0]);
      const nM = m1 - m0 + 1;
      const vol = new Float32Array(nM);
      for (const [m, s, r] of D.msg.monthly) { const i = mIdx(m) - m0; if (i >= 0 && i < nM) vol[i] = s + r; }
      const tot = new Float32Array(nM);
      const sums = { imp: new Float32Array(nM), qual: new Float32Array(nM) };
      for (const d of D.rhet) {
        const i = mIdx(d.date) - m0;
        if (i < 0 || i >= nM) continue;
        tot[i] += d.total || 0;
        sums.imp[i] += d.imp || 0; sums.qual[i] += d.qual || 0;
      }
      const rates = { imp: new Float32Array(nM), qual: new Float32Array(nM) };
      const bal = new Float32Array(nM);
      for (let i = 0; i < nM; i++) {
        rates.imp[i] = tot[i] > 20 ? sums.imp[i] / tot[i] * 100 : 0;
        rates.qual[i] = tot[i] > 20 ? sums.qual[i] / tot[i] * 100 : 0;
        bal[i] = rates.imp[i] - rates.qual[i];
      }
      const maxRate = { imp: 0.001, qual: 0.001 };
      let maxBal = 0.001, maxVol = 1;
      for (let i = 0; i < nM; i++) {
        maxRate.imp = Math.max(maxRate.imp, rates.imp[i]); maxRate.qual = Math.max(maxRate.qual, rates.qual[i]);
        maxBal = Math.max(maxBal, Math.abs(bal[i])); maxVol = Math.max(maxVol, vol[i]);
      }
      const fragSrc = (D.crossFrags && D.crossFrags.length) ? D.crossFrags : D.frags;
      const frags = fragSrc.map(f => ({
        pos: (mIdx(f.day.slice(0, 7)) - m0) + (+f.day.slice(8, 10) - 1) / 30.5,
        text: f.text, tag: f.day, shownAt: 0
      })).filter(f => f.pos >= 0 && f.pos < nM).sort((a, b) => a.pos - b.pos);
      this.penAttributeFrags(frags, [['imp', 'COMMAND', this.COL.amber], ['qual', 'HEDGE', this.COL.cyan]], rates, maxRate);
      const monthLabel = (i) => { const y = Math.floor((m0 + i) / 12), mo = (m0 + i) % 12; return y + '-' + String(mo + 1).padStart(2, '0'); };
      this.M.authority = { nM, m0, rates, maxRate, bal, maxBal, vol, maxVol, frags, monthLabel, play: 0.001, scrub: false, scrubGeo: null };
    },

    draw_authority(ctx, W, H, dt) {
      if (!this.M.authority) this.initAuthority();
      const C = this.COL, Au = this.M.authority, st = this.state;
      if (st.authorityPlay && !Au.scrub) {
        Au.play += st.authoritySpeed * dt;
        if (Au.play >= Au.nM - 0.01) { Au.play = Au.nM - 0.01; this.setState({ authorityPlay: false }); }
      }
      const chartR = W * 0.62;
      const padL = 110, padT = 64, padB = 74;
      const laneGap = 10;
      const nLanes = 4; // command, hedge, balance, volume
      const laneH = (H - padT - padB - laneGap * (nLanes - 1)) / nLanes;
      const xOf = (m) => padL + (m / (Au.nM - 1)) * (chartR - padL - 20);
      const playX = xOf(Au.play);
      const geo = { padL, padT, laneH, laneGap, x0: padL, x1: chartR - 20, xOf };

      this.drawEraBands(ctx, xOf, (di) => {
        const d = this.i2d(this.D.day0 + di);
        return (d.getUTCFullYear() * 12 + d.getUTCMonth()) - Au.m0 + (d.getUTCDate() - 1) / 30.5;
      }, padT - 14, padT + 3 * (laneH + laneGap) + laneH);

      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 17px ' + this.GROT; ctx.fillStyle = C.amberHi;
      ctx.fillText('AUTHORITY', 18, 32);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim;
      ctx.fillText('FULL CORPUS · COMMAND VS HEDGE, MONTHLY · WHO IS ASSERTING, WHO IS DEFERRING', 18, 48);
      const mi = Math.min(Au.nM - 1, Math.floor(Au.play));
      const my2 = Au.monthLabel(mi);
      const MN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      ctx.font = '600 13px ' + this.MONO; ctx.fillStyle = C.txt; ctx.textAlign = 'right';
      ctx.fillText(MN[+my2.slice(5, 7) - 1] + ' ' + my2.slice(0, 4) + ' · ' + this.fmt(Au.vol[mi]) + ' MSGS', chartR - 20, 32);
      ctx.textAlign = 'left';

      const lanes = [
        { data: Au.rates.imp, label: 'COMMAND', unit: '/100 MSG', color: C.amber, max: Au.maxRate.imp },
        { data: Au.rates.qual, label: 'HEDGE', unit: '/100 MSG', color: C.cyan, max: Au.maxRate.qual }
      ];
      this.drawPenLanes(ctx, geo, lanes, Au.play, st.authorityPlay);

      // diverging balance lane — amber up (asserting), cyan down (deferring)
      const balY0 = padT + 2 * (laneH + laneGap);
      ctx.fillStyle = 'rgba(13,17,24,0.6)';
      ctx.fillRect(geo.x0, balY0, geo.x1 - geo.x0, laneH);
      ctx.strokeStyle = C.grid; ctx.strokeRect(geo.x0 + 0.5, balY0 + 0.5, geo.x1 - geo.x0, laneH);
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('BALANCE', geo.x0 - 12, balY0 + laneH / 2);
      ctx.textAlign = 'left';
      const midY = balY0 + laneH / 2;
      ctx.strokeStyle = 'rgba(232,230,225,0.2)';
      ctx.beginPath(); ctx.moveTo(geo.x0, midY); ctx.lineTo(geo.x1, midY); ctx.stroke();
      const n = Au.nM, bw = Math.max(1.4, (geo.x1 - geo.x0) / n - 1);
      for (let i = 0; i < n; i++) {
        const x = xOf(i), v = Au.bal[i], hh = Math.min(1, Math.abs(v) / Au.maxBal) * (laneH / 2 - 4);
        const past = i <= Au.play;
        ctx.fillStyle = v >= 0 ? (past ? C.amber + 'cc' : C.amber + '29') : (past ? C.cyan + 'cc' : C.cyan + '29');
        if (v >= 0) ctx.fillRect(x - bw / 2, midY - hh, bw, hh);
        else ctx.fillRect(x - bw / 2, midY, bw, hh);
      }
      const bi0 = Math.floor(Math.min(n - 1, Au.play)), bf = Au.play - bi0;
      const bv = Au.bal[bi0] * (1 - bf) + Au.bal[Math.min(n - 1, bi0 + 1)] * bf;
      ctx.font = '600 10px ' + this.MONO; ctx.fillStyle = bv >= 0 ? C.amber : C.cyan; ctx.textAlign = 'left';
      ctx.fillText((bv >= 0 ? '+' : '') + bv.toFixed(1) + (bv >= 0 ? ' ASSERTING' : ' DEFERRING'), playX + 8, midY - (bv >= 0 ? 8 : -18));

      const vy0 = padT + 3 * (laneH + laneGap);
      this.drawVolumeLane(ctx, geo, vy0, Au.vol, Au.maxVol, Au.play, C.faint);

      ctx.strokeStyle = 'rgba(232,230,225,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(playX, padT - 6); ctx.lineTo(playX, vy0 + laneH + 8); ctx.stroke();
      ctx.font = '9px ' + this.MONO; ctx.fillStyle = C.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let i = 0; i < Au.nM; i++) {
        if ((Au.m0 + i) % 12 === 0) ctx.fillText(String(Math.floor((Au.m0 + i) / 12)), xOf(i), vy0 + laneH + 12);
      }
      Au.scrubGeo = { x0: padL, x1: chartR - 20, y1: vy0 + laneH };

      const fx = chartR + 8, fw = W - fx - 16;
      this.drawFragmentFeed(ctx, { fx, fy: padT - 22, fw, fh: H - padT - 36 }, Au.frags, Au.play, 'AUTHORITY FRAGMENTS · VERBATIM · FULL RECORD', C.amber);
    },

    pt_authority(type, p) {
      const Au = this.M.authority; if (!Au) return;
      const g = Au.scrubGeo; if (!g) return;
      if (type === 'down' && p.x < g.x1 + 20 && p.x > g.x0 - 20) {
        Au.scrub = true;
        Au.play = Math.max(0.001, Math.min(Au.nM - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (Au.nM - 1)));
      } else if (type === 'move' && Au.scrub && this.mouse.down) {
        Au.play = Math.max(0.001, Math.min(Au.nM - 0.01, ((p.x - g.x0) / (g.x1 - g.x0)) * (Au.nM - 1)));
      } else if (type === 'up' || type === 'leave') {
        Au.scrub = false;
      }
    },

    // ---------- section controls ----------
    // The chip rail and the hint line for every CORPUS tab. The shell calls
    // these the same way it calls wikiChips/WHINTS, so neither section has to
    // know what the other one puts on screen.
    CHINTS: {
      pulse: 'DRAG TO PAN · SCROLL TO ZOOM · DOUBLE-CLICK TO RESET · MINIMAP IS GRABBABLE · DIAMONDS ARE EVENTS',
      clock: 'GRAB THE DIAL AND SPIN IT · HOVER A SECTOR · THE NEEDLE SWEEPS A 20-YEAR AVERAGE DAY',
      orbits: 'GRAB A BODY AND FLING IT · CLICK FOR THE DOSSIER · DISTANCE FROM CENTER = TIME SINCE LAST MESSAGE',
      atlas: 'SPACE OR ▶ TO REPLAY · ⊕ LOCK ON = FOLLOWS EACH DAY · DRAG SCRUBBER · SCROLL TO ZOOM · ⬡ MAP TOGGLES TERRAIN',
      lexicon: 'FLICK THE WORDS · CLICK TO PIN ONE · TRY RAIN · SEISMOGRAPH BELOW = ALL-CAPS EVENTS',
      shelf: 'EVERY DOT IS A RATED WORK · ABOVE THE LINE = LOVED MORE THAN THE WORLD DID · CLICK TO PIN',
      annie: 'PRESS PLAY · FOUR PENS TRACE THE FULL 15-YEAR RECORD · FRAGMENTS SURFACE AS THE NEEDLE CROSSES THEM · DRAG TO SCRUB',
      signal: 'HOVER THE SPECTROGRAM \u00b7 DRAG THE TUNER DIAL THROUGH 40 ARTISTS \u00b7 \u26a1 = LANGUAGE BLEED INTO HIS TEXTS',
      mirror: 'EVERY DOT IS A THREAD \u00b7 HIS SENT MESSAGES ONLY \u00b7 RATES PER 100 MESSAGES \u00b7 SWITCH AXES \u00b7 CLICK TO PIN',
      gravity: 'PEOPLE WHO PULL THE SAME LANGUAGE OUT OF HIM SIT CLOSER \u00b7 GRAB A NODE AND FLING IT \u00b7 CLICK FOR OVERLAP',
      forensic: 'FOUR COMPOSITE SCORES, DAILY \u00b7 DRAG TO PAN \u00b7 SCROLL TO ZOOM \u00b7 CLICK A DAY TO PIN ITS EVIDENCE',
      rings: 'SIXTEEN YEARS COILED \u00b7 EACH RING IS A YEAR, JAN 1 AT THE TOP \u00b7 HOVER A DAY \u00b7 CLICK TO PIN',
      silence: 'THE NEGATIVE SPACE \u00b7 3,353 OF 5,563 DAYS HAVE NO MESSAGES \u00b7 DEPTH = LENGTH OF SILENCE \u00b7 CLICK TO PIN',
      psyche: 'WHAT HE RATED \u00d7 HOW HE WAS TALKING \u00b7 HALO = RHETORICAL CHARGE WITHIN \u00b114 DAYS \u00b7 CLICK TO PIN',
      sync: 'LINGUISTIC STYLE MATCHING \u00b7 TEN GRAMMAR CHANNELS, HIM VS THEM \u00b7 RIGHT = THEY SPEAK HIS LANGUAGE \u00b7 CLICK TO PIN THE BREAKDOWN',
      drift: 'EVERY ACTIVE MONTH COMPARED TO EVERY OTHER \u00b7 AMBER = SAME VOICE \u00b7 CYAN = OPPOSITE VOICE \u00b7 THE DIAGONAL IS IDENTITY \u00b7 HOVER A CELL',
      oracle: 'PRESS PLAY \u00b7 SIX RHETORICAL PENS AS A ROTATING RADAR, ONE READING PER MONTH \u00b7 GHOST RINGS ARE THE MONTHS BEHIND IT \u00b7 DRAG THE STRIP TO SCRUB',
      authority: 'PRESS PLAY \u00b7 COMMAND VS HEDGE, MONTHLY \u00b7 THE BALANCE LANE TIPS AMBER WHEN HE ASSERTS, CYAN WHEN HE DEFERS \u00b7 DRAG TO SCRUB'
    },

    corpusHint(s) {
      // WEATHER is the one tab whose hint depends on which view is up.
      if (s.tab === 'weather') {
        return s.weatherView === 'pens'
          ? 'PRESS PLAY \u00b7 FOUR PENS TRACE 15 YEARS OF REAL WEATHER TALK \u00b7 \u26a1 = HIGH-VOLATILITY DAYS \u00b7 DRAG TO SCRUB'
          : 'SIX RHETORICAL CHANNELS, STACKED \u00b7 LIGHTNING = THE 50 MOST INTENSE DAYS \u00b7 CLICK A BOLT TO ZOOM \u00b7 SCROLL TO ZOOM';
      }
      return this.CHINTS[s.tab] || '';
    },

    corpusChips(s, C) {
      let chips = [];
      if (s.tab === 'pulse') {
        chips = ['FULL', 'NYC ONE', 'UNIONTOWN', 'NYC TWO', 'RETURN'].map(l => ({
          label: l, onClick: () => this.pulseJump(l), style: this.chipStyle(false)
        }));
      } else if (s.tab === 'clock') {
        chips = [['all', 'ALL'], ['sent', 'SENT'], ['recv', 'RECEIVED']].map(([id, l]) => ({
          label: l, onClick: () => this.setState({ clockMode: id }), style: this.chipStyle(s.clockMode === id, id === 'recv' ? C.cyan : C.amber)
        }));
      } else if (s.tab === 'orbits') {
        chips = [{ label: 'SCATTER', onClick: () => { if (this.orbitsScatter) this.orbitsScatter(); }, style: this.chipStyle(false) }];
      } else if (s.tab === 'atlas') {
        chips = [
          { label: s.atlasPlay ? '❚❚ PAUSE' : '▶ PLAY', onClick: () => this.setState(st => ({ atlasPlay: !st.atlasPlay })), style: this.chipStyle(s.atlasPlay) },
          ...[[30, '×1'], [120, '×4'], [365, '×12']].map(([v, l]) => ({
            label: l, onClick: () => this.setState({ atlasSpeed: v }), style: this.chipStyle(s.atlasSpeed === v)
          })),
          ...['FULL', 'FAYETTE', 'NYC'].map(l => ({
            label: l, onClick: () => { this.setState({ atlasView: l }); if (this.atlasFly) this.atlasFly(l); }, style: this.chipStyle(s.atlasView === l, C.cyan)
          })),
          { label: s.atlasMap ? '⬡ MAP' : '⬡ VOID', onClick: () => this.setState(st => ({ atlasMap: !st.atlasMap })), style: this.chipStyle(s.atlasMap, C.amber) },
          { label: s.atlasLock ? '⊕ LOCKED' : '⊕ LOCK ON', onClick: () => this.setState(st => ({ atlasLock: !st.atlasLock })), style: this.chipStyle(s.atlasLock, C.cyan) }
        ];
      } else if (s.tab === 'lexicon') {
        chips = [['pack', 'CLUSTER'], ['rain', 'RAIN']].map(([id, l]) => ({
          label: l, onClick: () => { this.setState({ lexMode: id }); if (this.lexSetMode) this.lexSetMode(id); }, style: this.chipStyle(s.lexMode === id)
        }));
      } else if (s.tab === 'shelf') {
        chips = ['ALL', 'MUSIC', 'BOOK', 'MOVIE', 'ART'].map(l => ({
          label: l, onClick: () => this.setState({ shelfCat: l }), style: this.chipStyle(s.shelfCat === l)
        }));
      } else if (s.tab === 'weather') {
        if (s.weatherView === 'pens') {
          chips = [
            { label: s.weatherPlay ? '❚❚ PAUSE' : '▶ PLAY', onClick: () => this.setState(st => ({ weatherPlay: !st.weatherPlay })), style: this.chipStyle(s.weatherPlay, C.cyan) },
            { label: '↺ RESTART', onClick: () => this.penRestart('wx', 'weatherPlay'), style: this.chipStyle(false) },
            ...[[3, 'SLOW'], [9, 'NORMAL'], [26, 'FAST']].map(([v, l]) => ({
              label: l, onClick: () => this.setState({ weatherSpeed: v }), style: this.chipStyle(s.weatherSpeed === v, C.cyan)
            })),
            { label: '⛈ STORM VIEW', onClick: () => this.setState({ weatherView: 'storm' }), style: this.chipStyle(false, C.amber) }
          ];
        } else {
          chips = [
            { label: '✎ PENS VIEW', onClick: () => this.setState({ weatherView: 'pens' }), style: this.chipStyle(false, C.cyan) },
            ...[['rate', 'RATE'], ['raw', 'RAW']].map(([id, l]) => ({
              label: l, onClick: () => this.setState({ weatherMode: id }), style: this.chipStyle(s.weatherMode === id)
            })),
            ...this.WLAYERS.map(([k, label, col]) => ({
              label, onClick: () => this.setState(st => ({ weatherLayers: { ...st.weatherLayers, [k]: !st.weatherLayers[k] } })),
              style: this.chipStyle(s.weatherLayers[k], col)
            }))
          ];
        }
      } else if (s.tab === 'annie') {
        chips = [
          { label: s.anniePlay ? '❚❚ PAUSE' : '▶ PLAY', onClick: () => this.setState(st => ({ anniePlay: !st.anniePlay })), style: this.chipStyle(s.anniePlay) },
          { label: '↺ RESTART', onClick: () => this.penRestart('annie', 'anniePlay'), style: this.chipStyle(false) },
          ...[[1.5, 'SLOW'], [4, 'NORMAL'], [12, 'FAST']].map(([v, l]) => ({
            label: l, onClick: () => this.setState({ annieSpeed: v }), style: this.chipStyle(s.annieSpeed === v, this.COL.rose)
          }))
        ];
      } else if (s.tab === 'signal') {
        chips = [
          { label: 'ALL WATCHES', onClick: () => this.setState({ signalMusic: false }), style: this.chipStyle(!s.signalMusic, this.COL.violet) },
          { label: 'MUSIC ONLY', onClick: () => this.setState({ signalMusic: true }), style: this.chipStyle(s.signalMusic, this.COL.violet) }
        ];
      } else if (s.tab === 'mirror') {
        chips = [['affection', 'LOVE \u00d7 PROFANITY'], ['ego', 'I \u00d7 YOU'], ['caution', 'HEDGE \u00d7 COMMAND']].map(([id, l]) => ({
          label: l, onClick: () => this.setState({ mirrorMode: id }), style: this.chipStyle(s.mirrorMode === id)
        }));
      } else if (s.tab === 'gravity') {
        chips = [{ label: 'SHAKE', onClick: () => { if (this.gravityShake) this.gravityShake(); }, style: this.chipStyle(false) }];
      } else if (s.tab === 'forensic') {
        chips = this.FLANES.map(([k, label, col]) => ({
          label, onClick: () => this.setState(st => ({ forensicOn: { ...st.forensicOn, [k]: !st.forensicOn[k] } })),
          style: this.chipStyle(s.forensicOn[k], col)
        }));
      } else if (s.tab === 'rings') {
        chips = [['all', 'ALL'], ['sent', 'SENT'], ['recv', 'RECEIVED']].map(([id, l]) => ({
          label: l, onClick: () => this.setState({ ringsMode: id }), style: this.chipStyle(s.ringsMode === id, id === 'recv' ? C.cyan : C.amber)
        }));
      } else if (s.tab === 'silence') {
        chips = [[3, '\u2265 3 DAYS'], [7, '\u2265 7 DAYS'], [30, '\u2265 30 DAYS']].map(([v, l]) => ({
          label: l, onClick: () => this.setState({ silenceMin: v }), style: this.chipStyle(s.silenceMin === v)
        }));
      } else if (s.tab === 'psyche') {
        chips = [['ALL', 'ALL'], ['prof', 'PROFANE'], ['love', 'TENDER'], ['quiet', 'QUIET']].map(([id, l]) => ({
          label: l, onClick: () => this.setState({ psycheKind: id }),
          style: this.chipStyle(s.psycheKind === id, id === 'prof' ? C.red : id === 'love' ? C.rose : C.amber)
        }));
      } else if (s.tab === 'sync') {
        chips = [[0, 'ALL THREADS'], [1000, '\u2265 1K MSGS'], [5000, '\u2265 5K MSGS']].map(([v, l]) => ({
          label: l, onClick: () => this.setState({ syncMin: v }), style: this.chipStyle(s.syncMin === v, C.violet)
        }));
      } else if (s.tab === 'drift') {
        chips = [[30, '\u2265 30 MSGS/MO'], [100, '\u2265 100'], [300, '\u2265 300']].map(([v, l]) => ({
          label: l, onClick: () => this.setState({ driftMin: v }), style: this.chipStyle(s.driftMin === v)
        }));
      } else if (s.tab === 'oracle') {
        chips = [
          { label: s.oraclePlay ? '\u275a\u275a PAUSE' : '\u25b6 PLAY', onClick: () => this.setState(st => ({ oraclePlay: !st.oraclePlay })), style: this.chipStyle(s.oraclePlay, C.violet) },
          { label: '\u21ba RESTART', onClick: () => this.penRestart('oracle', 'oraclePlay'), style: this.chipStyle(false) },
          ...[[1.5, 'SLOW'], [4, 'NORMAL'], [12, 'FAST']].map(([v, l]) => ({
            label: l, onClick: () => this.setState({ oracleSpeed: v }), style: this.chipStyle(s.oracleSpeed === v, C.violet)
          }))
        ];
      } else if (s.tab === 'authority') {
        chips = [
          { label: s.authorityPlay ? '\u275a\u275a PAUSE' : '\u25b6 PLAY', onClick: () => this.setState(st => ({ authorityPlay: !st.authorityPlay })), style: this.chipStyle(s.authorityPlay) },
          { label: '\u21ba RESTART', onClick: () => this.penRestart('authority', 'authorityPlay'), style: this.chipStyle(false) },
          ...[[1.5, 'SLOW'], [4, 'NORMAL'], [12, 'FAST']].map(([v, l]) => ({
            label: l, onClick: () => this.setState({ authoritySpeed: v }), style: this.chipStyle(s.authoritySpeed === v)
          }))
        ];
      }
      return chips;
    },
  };
})();
