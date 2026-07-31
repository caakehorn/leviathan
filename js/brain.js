// ─────────────────────────────────────────────────────────────────────────────
// THE SINGULARITY BRAIN — the renderer. Phase 2.
//
// It reads data/brain.json (the opaque projection, docs/SINGULARITY-BRAIN.md)
// and draws the mind as a rotating point-cloud you fall into:
//
//   · ALTITUDE IS DEPTH.   doctrine burns near the core, junctions mid-shell,
//                          ground orbits the rim. You descend toward meaning.
//   · DOMAINS ARE DISTRICTS. each domain is a longitude wedge whose ANGULAR
//                          WIDTH is its share of the nodes — so an over-built
//                          district is visibly huge and a thin one is a sliver.
//   · MASS IS SIZE + LIGHT. load-bearing nodes are bigger and brighter.
//   · EDGES ARE ARGUMENTS. every line is a typed relationship; select a node
//                          and its arguments light up, the rest dim.
//   · FRONTIERS PULL.      the thinnest districts are marked as the holes to fill.
//
// Nothing here is readable content — there is none in brain.json. The one
// readable surface is the curated self-portrait at the core, passed in by the
// page. Determinism holds: every position is seeded by the node's own id, so the
// same brain always renders the same mind.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  if (window.LVBrain) return;

  function cyrb128(str) {
    var h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (var i = 0, c; i < str.length; i++) {
      c = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ c, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ c, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ c, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ c, 2716044179);
    }
    return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Nine districts, nine hues. Slime/cerulean/purple/pink and their neighbours.
  var DOMAIN_COL = {
    self: [57, 255, 20], mind: [176, 38, 255], people: [255, 47, 157],
    interests: [0, 183, 255], work: [255, 196, 60], timeline: [0, 255, 163],
    places: [123, 45, 255], health: [255, 90, 90], legal: [160, 200, 180]
  };
  var ALT_R = { doctrine: 0.34, junction: 0.66, ground: 1.0 };

  var cv, g, DPR, W, H, cx, cy, R;
  var data = null, N = [], E = [], domainArc = {}, frontierTop = [];
  var rotY = 0.5, rotX = -0.18, autoRot = true, spin = 0.0018;
  var drag = null, hover = -1, sel = -1;
  var reduce = false, onPick = null, raf = 0;

  function build(canvas, brain, opts) {
    cv = canvas; g = cv.getContext('2d'); data = brain; opts = opts || {};
    onPick = opts.onPick || null;
    reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    layout();
    resize();
    addEventListener('resize', resize);
    wire();
    if (reduce) { autoRot = false; draw(); } else loop();
    return api;
  }

  // ── layout: seeded 3D positions ────────────────────────────────────────────
  function layout() {
    var doms = data.domains || {};
    var total = 0; for (var k in doms) total += doms[k];
    // Order districts by size so big ones are contiguous; assign each a wedge of
    // the equator proportional to its node count.
    var order = Object.keys(doms).sort(function (a, b) { return doms[b] - doms[a]; });
    var acc = 0;
    order.forEach(function (d) {
      var frac = doms[d] / total;
      domainArc[d] = { a0: acc * Math.PI * 2, a1: (acc + frac) * Math.PI * 2, col: DOMAIN_COL[d] || [180, 200, 190] };
      acc += frac;
    });

    N = data.nodes.map(function (n) {
      var r = mulberry32(cyrb128(n.id));
      var arc = domainArc[n.domain] || { a0: 0, a1: Math.PI * 2, col: [180, 200, 190] };
      // longitude inside the district wedge; latitude uniform on the sphere
      var lon = arc.a0 + r() * (arc.a1 - arc.a0);
      var lat = Math.acos(2 * r() - 1);
      var rad = (ALT_R[n.altitude] || 1) * (0.82 + r() * 0.2);
      var sinLat = Math.sin(lat);
      return {
        id: n.id, domain: n.domain, altitude: n.altitude, mass: n.mass,
        col: arc.col, deg: 0,
        x: rad * sinLat * Math.cos(lon),
        y: rad * Math.cos(lat),
        z: rad * sinLat * Math.sin(lon),
        sx: 0, sy: 0, sz: 0, sr: 1
      };
    });

    var idx = {}; N.forEach(function (n, i) { idx[n.id] = i; });
    E = [];
    (data.edges || []).forEach(function (e) {
      var a = idx[e.from], b = idx[e.to];
      if (a == null || b == null) return;
      E.push([a, b]); N[a].deg++; N[b].deg++;
    });

    frontierTop = (data.frontier || []).slice(0, 3).map(function (f) { return f.domain; });
  }

  // ── projection ───────────────────────────────────────────────────────────
  function resize() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2; cy = H * 0.5; R = Math.min(W, H) * 0.42;
    if (reduce) draw();
  }
  var PERSP = 2.6;
  function project() {
    var cyw = Math.cos(rotY), syw = Math.sin(rotY), cxw = Math.cos(rotX), sxw = Math.sin(rotX);
    for (var i = 0; i < N.length; i++) {
      var n = N[i];
      var x = n.x * cyw - n.z * syw;
      var z = n.x * syw + n.z * cyw;
      var y = n.y * cxw - z * sxw;
      z = n.y * sxw + z * cxw;
      var p = PERSP / (PERSP - z);
      n.sx = cx + x * R * p;
      n.sy = cy + y * R * p;
      n.sz = z; n.sr = p;
    }
  }

  // ── draw ───────────────────────────────────────────────────────────────────
  function draw() {
    project();
    g.clearRect(0, 0, W, H);

    // core glow — the self-model everything falls toward
    var core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
    core.addColorStop(0, 'rgba(255,255,240,0.16)');
    core.addColorStop(0.3, 'rgba(176,38,255,0.10)');
    core.addColorStop(1, 'rgba(3,4,10,0)');
    g.fillStyle = core; g.fillRect(0, 0, W, H);

    // edges — faint web behind, selected node's arguments bright on top
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 1;
    g.beginPath();
    for (var e = 0; e < E.length; e++) {
      var a = N[E[e][0]], b = N[E[e][1]];
      if (sel >= 0 && E[e][0] !== sel && E[e][1] !== sel) continue;
      if (sel < 0) { g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); }
    }
    if (sel < 0) { g.strokeStyle = 'rgba(120,150,200,0.05)'; g.stroke(); }

    if (sel >= 0) {
      g.beginPath();
      for (var e2 = 0; e2 < E.length; e2++) {
        if (E[e2][0] !== sel && E[e2][1] !== sel) continue;
        var a2 = N[E[e2][0]], b2 = N[E[e2][1]];
        g.moveTo(a2.sx, a2.sy); g.lineTo(b2.sx, b2.sy);
      }
      var sc = N[sel].col;
      g.strokeStyle = 'rgba(' + sc[0] + ',' + sc[1] + ',' + sc[2] + ',0.5)';
      g.lineWidth = 1.2; g.stroke();
    }

    // nodes — depth-sorted so near motes draw over far
    var order = N.map(function (_, i) { return i; }).sort(function (i, j) { return N[i].sz - N[j].sz; });
    for (var o = 0; o < order.length; o++) {
      var i = order[o], n = N[i];
      var depth = (n.sz + 1) / 2;            // 0 far .. 1 near
      var size = (1.4 + n.mass * 7) * n.sr;
      var neighbour = sel >= 0 && (adj(sel, i));
      var dim = sel >= 0 && i !== sel && !neighbour;
      var al = (0.25 + 0.6 * depth) * (dim ? 0.12 : 1) * (n.altitude === 'doctrine' ? 1.15 : 1);
      var c = n.col;
      if (i === sel || i === hover) { al = 1; size *= 1.6; }
      g.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + al.toFixed(3) + ')';
      g.beginPath(); g.arc(n.sx, n.sy, Math.max(0.6, size), 0, 7); g.fill();
      if (i === sel || i === hover) {
        g.strokeStyle = 'rgba(255,255,255,' + (0.5 * al) + ')'; g.lineWidth = 1;
        g.beginPath(); g.arc(n.sx, n.sy, Math.max(0.6, size) + 3, 0, 7); g.stroke();
      }
    }
    g.globalCompositeOperation = 'source-over';
  }
  function adj(s, i) {
    for (var e = 0; e < E.length; e++) {
      if (E[e][0] === s && E[e][1] === i) return true;
      if (E[e][1] === s && E[e][0] === i) return true;
    }
    return false;
  }

  function loop() {
    if (autoRot && !drag) rotY += spin;
    draw();
    raf = requestAnimationFrame(loop);
  }

  // ── interaction ────────────────────────────────────────────────────────────
  function wire() {
    cv.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX, moved: false };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', function (e) {
      if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        rotY = drag.ry + dx * 0.006;
        rotX = Math.max(-1.2, Math.min(1.2, drag.rx + dy * 0.006));
        if (reduce) draw();
      } else {
        pickHover(e.clientX, e.clientY);
      }
    });
    cv.addEventListener('pointerup', function (e) {
      if (drag && !drag.moved) { pickSelect(e.clientX, e.clientY); }
      drag = null;
    });
    cv.addEventListener('pointerleave', function () { if (hover !== -1) { hover = -1; if (reduce) draw(); } });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); PERSP = Math.max(1.6, Math.min(4.2, PERSP + (e.deltaY > 0 ? 0.12 : -0.12))); if (reduce) draw(); }, { passive: false });
  }
  function nearest(mx, my) {
    var best = -1, bd = 22 * 22;
    for (var i = 0; i < N.length; i++) {
      var dx = N[i].sx - mx, dy = N[i].sy - my, d = dx * dx + dy * dy;
      var rr = Math.max(6, (1.4 + N[i].mass * 7) * N[i].sr) + 6;
      if (d < rr * rr && d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function pickHover(mx, my) {
    var i = nearest(mx, my);
    if (i !== hover) { hover = i; cv.style.cursor = i >= 0 ? 'pointer' : 'grab'; if (reduce) draw(); }
  }
  function pickSelect(mx, my) {
    var i = nearest(mx, my);
    sel = (i === sel) ? -1 : i;
    if (onPick) onPick(sel >= 0 ? info(sel) : null);
    if (reduce) draw();
  }
  function info(i) {
    var n = N[i];
    var types = {};
    for (var e = 0; e < E.length; e++) {
      var s = E[e][0] === i, t = E[e][1] === i;
      if (!s && !t) continue;
      // edge type isn't stored per-pair here; recover from data.edges by index order
    }
    // recover typed neighbours from the source edge list (kept aligned with E)
    var byType = {}, nb = [];
    (data.edges || []).forEach(function (ed) {
      if (ed.from === n.id) { byType[ed.type] = (byType[ed.type] || 0) + 1; }
      else if (ed.to === n.id) { byType[ed.type] = (byType[ed.type] || 0) + 1; }
    });
    return { domain: n.domain, altitude: n.altitude, mass: n.mass, degree: n.deg, types: byType };
  }

  var api = {
    build: build,
    focusDomain: function (d) {
      // spin the district to the front
      var arc = domainArc[d]; if (!arc) return;
      rotY = -((arc.a0 + arc.a1) / 2) + Math.PI / 2; autoRot = false;
    },
    setAuto: function (v) { autoRot = v; },
    frontier: function () { return frontierTop.slice(); },
    domains: function () { return domainArc; },
    counts: function () { return data ? data.counts : null; },
    deselect: function () { sel = -1; if (onPick) onPick(null); if (reduce) draw(); }
  };
  window.LVBrain = api;
})();
