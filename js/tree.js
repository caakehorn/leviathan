// ─────────────────────────────────────────────────────────────────────────────
// THE LINE — the family tree, drawn.
//
// One dataset (data/tree.json, built by tools/build-tree.py from a GEDCOM
// export) and three ways into it:
//
//   TREE    an hourglass around one focus person — ancestors climbing away
//           above, descendants spreading below, spouses beside. Click anyone to
//           make them the focus; the whole diagram re-forms around them.
//   INDEX   every person in the file, searchable, filterable, sorted.
//   PERSON  the panel: every recorded fact about the focused person, with each
//           relative a link that re-focuses the tree.
//
// The whole thing is built to be re-run. Nothing here knows how many people
// there are, how deep the tree goes, or which surnames exist — it reads all of
// that out of the data every load. Add fifty people to the GEDCOM, rebuild, and
// this file does not change.
//
// No dependencies. SVG, hand-rolled layout, no framework.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  // ── geometry ───────────────────────────────────────────────────────────────
  var CARD_W = 178, CARD_H = 62;
  var SPOUSE_GAP = 26;       // between a person and their spouse in a couple
  var UNIT_GAP = 34;         // between neighbouring families on a row
  var ROW_H = 132;           // generation to generation

  var DEFAULT_UP = 3, DEFAULT_DOWN = 3, MAX_SPAN = 12;
  var MIN_READABLE = 0.34;   // below this the cards are illegible, so FIT stops there
  var RULER_W = 210;         // gutter on the left for the generation labels

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ── state ──────────────────────────────────────────────────────────────────
  var DATA = null;           // the parsed tree.json
  var P = {};                // id -> person
  var F = {};                // id -> family
  var CHILD_OF = {};         // id -> [family ids they are a child in]
  var focus = null;
  var up = DEFAULT_UP, down = DEFAULT_DOWN;
  var view = { x: 0, y: 0, k: 1 };
  var nodes = [];            // laid-out cards for the current diagram
  var history = [];

  var el = {};

  // ── small helpers ──────────────────────────────────────────────────────────
  function $(sel, root) { return (root || document).querySelector(sel); }
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }
  function esc(s) { return String(s == null ? '' : s); }

  // A person's year range as the diagram shows it: "1884–1951", "b. 1884",
  // "1884–" for someone living, "—" when the file has no dates at all. An
  // estimated year is never printed bare; it gets a bracket so the page never
  // launders an inference into a fact.
  function lifespan(p) {
    var b = p.birth && p.birth.date ? p.birth.date.year : null;
    var d = p.death && p.death.date ? p.death.date.year : null;
    if (b && d) return b + '–' + d;
    if (b) return p.living ? b + '–' : 'b. ' + b;
    if (d) return 'd. ' + d;
    if (p.estBirth) return '[c. ' + p.estBirth + ']';
    return '—';
  }

  // Row labels, relative to whoever is in focus. "GRANDPARENTS" tells you where
  // you are on a wide pedigree in a way "GEN −2" does not.
  function genLabel(g) {
    if (g === 0) return 'FOCUS';
    var n = Math.abs(g), up = g < 0;
    var base = up ? ['', 'PARENTS', 'GRANDPARENTS', 'GT-GRANDPARENTS']
                  : ['', 'CHILDREN', 'GRANDCHILDREN', 'GT-GRANDCHILDREN'];
    if (n < base.length) return base[n];
    return (n - 2) + '× GT-' + (up ? 'GRANDPARENTS' : 'GRANDCHILDREN');
  }

  function dateText(ev) {
    if (!ev) return '';
    if (!ev.date) return '';
    return ev.date.text || (ev.date.year != null ? String(ev.date.year) : '');
  }

  function factLine(ev) {
    if (!ev) return '';
    var d = dateText(ev), pl = ev.place || '';
    if (d && pl) return d + ' · ' + pl;
    return d || pl;
  }

  // Ancestry exports routinely carry the same couple as two FAM records, so a
  // person can reach one parent or spouse down two paths. Every relation lookup
  // therefore dedupes by person id, not by family.
  function spousesOf(pid) {
    var out = [], seen = {}, p = P[pid];
    if (!p) return out;
    (p.fams || []).forEach(function (fid) {
      var f = F[fid];
      if (!f) return;
      var sp = f.husband === pid ? f.wife : (f.wife === pid ? f.husband : null);
      if (sp && P[sp] && !seen[sp]) { seen[sp] = 1; out.push({ id: sp, fam: fid }); }
    });
    return out;
  }

  function parentsOf(pid) {
    var out = [], seen = {};
    (CHILD_OF[pid] || []).forEach(function (fid) {
      var f = F[fid];
      if (!f) return;
      [f.husband, f.wife].forEach(function (x) {
        if (x && P[x] && !seen[x]) { seen[x] = 1; out.push(x); }
      });
    });
    return out;
  }

  function childrenOf(pid) {
    var out = [], p = P[pid];
    if (!p) return out;
    (p.fams || []).forEach(function (fid) {
      var f = F[fid];
      if (f) (f.children || []).forEach(function (c) { if (P[c] && out.indexOf(c) < 0) out.push(c); });
    });
    return sortByBirth(out);
  }

  function siblingsOf(pid) {
    var out = [];
    (CHILD_OF[pid] || []).forEach(function (fid) {
      var f = F[fid];
      if (f) (f.children || []).forEach(function (c) {
        if (c !== pid && P[c] && out.indexOf(c) < 0) out.push(c);
      });
    });
    return sortByBirth(out);
  }

  function birthKey(id) {
    var p = P[id];
    if (!p) return 1e9;
    if (p.birth && p.birth.date && p.birth.date.sort != null) return p.birth.date.sort;
    if (p.estBirth) return p.estBirth * 10000;
    return 1e9;
  }
  function sortByBirth(ids) {
    return ids.slice().sort(function (a, b) { return birthKey(a) - birthKey(b); });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYOUT
  //
  // Two recursive passes off the focus person, then a shared tidy-up.
  //
  // Down, the unit of layout is a *couple*, not a person: children hang from the
  // union between two cards, so a married descendant and their spouse have to
  // move together. Up, the unit is a single person, because a pedigree already
  // puts each pair of parents side by side.
  //
  // Both passes place leaves left to right on a cursor and put every internal
  // node over the middle of its children. That alone can overlap when a wide
  // couple sits above one narrow child, so `separate()` walks each row in order
  // afterwards and pushes right, then re-centres parents over the result. Push-
  // right is monotone, so the rows come out sorted and non-overlapping; the
  // cost is that a parent can end up slightly off-centre, which is the normal
  // trade in every tidy-tree implementation.
  // ─────────────────────────────────────────────────────────────────────────────

  function buildDescendants(pid, depth, seen) {
    var p = P[pid];
    var unit = { people: [pid], fams: [], kids: [], depth: depth };
    if (!p) return unit;

    var kidIds = [];
    (p.fams || []).forEach(function (fid) {
      var f = F[fid];
      if (!f) return;
      var sp = f.husband === pid ? f.wife : (f.wife === pid ? f.husband : null);
      if (sp && P[sp] && unit.people.indexOf(sp) < 0) unit.people.push(sp);
      unit.fams.push(fid);
      if (depth < down) {
        (f.children || []).forEach(function (c) {
          if (P[c] && !seen[c]) kidIds.push(c);
        });
      }
    });

    sortByBirth(kidIds).forEach(function (c) {
      if (seen[c]) return;
      seen[c] = 1;
      unit.kids.push(buildDescendants(c, depth + 1, seen));
    });
    return unit;
  }

  function buildAncestors(pid, depth, seen) {
    var node = { people: [pid], kids: [], depth: -depth, up: true };
    if (depth >= up) return node;
    parentsOf(pid).forEach(function (par) {
      if (seen[par]) return;      // pedigree collapse: a shared ancestor is drawn once
      seen[par] = 1;
      node.kids.push(buildAncestors(par, depth + 1, seen));
    });
    return node;
  }

  function unitWidth(u) {
    return u.people.length * CARD_W + (u.people.length - 1) * SPOUSE_GAP;
  }

  function placeTree(root) {
    var cursor = 0, rows = {};
    (function place(u) {
      u.w = unitWidth(u);
      if (!u.kids.length) {
        u.x = cursor + u.w / 2;
        cursor += u.w + UNIT_GAP;
      } else {
        u.kids.forEach(place);
        var a = u.kids[0], b = u.kids[u.kids.length - 1];
        u.x = (a.x + b.x) / 2;
        cursor = Math.max(cursor, u.x + u.w / 2 + UNIT_GAP);
      }
      (rows[u.depth] = rows[u.depth] || []).push(u);
    })(root);
    separate(rows);
    return root;
  }

  function separate(rows) {
    var depths = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });
    // Deepest rows first: they were placed by the cursor and are already sane,
    // so fixing shallower rows against them keeps the leaves where they are.
    var order = depths.slice().sort(function (a, b) { return Math.abs(b) - Math.abs(a); });
    for (var pass = 0; pass < 2; pass++) {
      order.forEach(function (d) {
        var row = rows[d].slice().sort(function (a, b) { return a.x - b.x; });
        for (var i = 1; i < row.length; i++) {
          var need = row[i - 1].x + row[i - 1].w / 2 + UNIT_GAP + row[i].w / 2;
          if (row[i].x < need) row[i].x = need;
        }
        row.forEach(function (u) {
          if (!u.kids.length) return;
          var a = u.kids[0], b = u.kids[u.kids.length - 1];
          u.x = (a.x + b.x) / 2;
        });
      });
    }
  }

  // Flatten the two trees into drawable cards and connectors, aligned so the
  // focus person's card sits at x = 0 in both halves.
  function layout() {
    var seenDown = {}; seenDown[focus] = 1;
    var descRoot = placeTree(buildDescendants(focus, 0, seenDown));

    var seenUp = {}; seenUp[focus] = 1;
    var ancRoot = placeTree(buildAncestors(focus, 0, seenUp));

    var descFocusX = descRoot.x - descRoot.w / 2 + CARD_W / 2;
    var ancFocusX = ancRoot.x;
    var shift = ancFocusX - descFocusX;

    nodes = [];
    var edges = [];
    var placed = {};

    function cardsFor(u, dx) {
      var out = [];
      for (var i = 0; i < u.people.length; i++) {
        var id = u.people[i];
        out.push({
          id: id,
          x: u.x - u.w / 2 + i * (CARD_W + SPOUSE_GAP) + dx,
          y: u.depth * ROW_H,
          spouse: i > 0
        });
      }
      return out;
    }

    // Descendants (and the focus row itself).
    (function walkDown(u) {
      var cards = cardsFor(u, shift);
      cards.forEach(function (c) {
        if (placed[c.id]) return;
        placed[c.id] = c;
        nodes.push(c);
      });

      // Marriage bar between each adjacent pair in the unit.
      for (var i = 1; i < cards.length; i++) {
        edges.push({
          type: 'union',
          x1: cards[i - 1].x + CARD_W, x2: cards[i].x,
          y: cards[i - 1].y + CARD_H / 2
        });
      }

      if (u.kids.length) {
        // Children descend from the middle of the couple when there is one,
        // and from under the single card when there is not.
        var from = cards.length > 1
          ? (cards[0].x + CARD_W + cards[1].x) / 2
          : cards[0].x + CARD_W / 2;
        var busY = u.depth * ROW_H + CARD_H + (ROW_H - CARD_H) / 2;
        edges.push({ type: 'stem', x1: from, y1: cards[0].y + CARD_H, x2: from, y2: busY });
        u.kids.forEach(function (k) {
          var kx = k.x - k.w / 2 + CARD_W / 2 + shift;
          edges.push({ type: 'drop', x1: from, y1: busY, x2: kx, y2: k.depth * ROW_H });
          walkDown(k);
        });
      }
    })(descRoot);

    // Ancestors. The focus card is already placed; only its forebears are new.
    (function walkUp(u) {
      var cards = cardsFor(u, 0);
      cards.forEach(function (c) {
        if (placed[c.id]) return;
        placed[c.id] = c;
        nodes.push(c);
      });
      if (!u.kids.length) return;
      var me = placed[u.people[0]];
      var busY = u.depth * ROW_H - (ROW_H - CARD_H) / 2;
      var mx = me.x + CARD_W / 2;
      edges.push({ type: 'stem', x1: mx, y1: me.y, x2: mx, y2: busY });
      u.kids.forEach(function (k) {
        var kx = k.x + CARD_W / 2;
        edges.push({ type: 'drop', x1: mx, y1: busY, x2: kx, y2: k.depth * ROW_H + CARD_H });
        walkUp(k);
      });
    })(ancRoot);

    return edges;
  }

  // ── drawing ────────────────────────────────────────────────────────────────

  function draw() {
    var edges = layout();
    var g = el.scene;
    while (g.firstChild) g.removeChild(g.firstChild);

    // Generation rulers. In a pedigree wide enough to need panning, the only
    // way to know which row you are looking at is to label it.
    var b = bounds();
    var rows = {};
    nodes.forEach(function (n) { rows[n.y] = 1; });
    var gRule = svg('g', { class: 'rulers' });
    Object.keys(rows).map(Number).sort(function (a, c) { return a - c; }).forEach(function (y) {
      var gen = Math.round(y / ROW_H);
      gRule.appendChild(svg('line', {
        x1: b.x - RULER_W + 20, y1: y + CARD_H / 2, x2: b.x + b.w + 60, y2: y + CARD_H / 2, class: 'rule'
      }));
      var t = svg('text', { x: b.x - RULER_W + 10, y: y + CARD_H / 2 + 4, class: 'rule-label' });
      t.textContent = genLabel(gen);
      gRule.appendChild(t);
    });
    g.appendChild(gRule);

    var gEdges = svg('g', { class: 'edges' });
    edges.forEach(function (e) {
      if (e.type === 'union') {
        gEdges.appendChild(svg('line', {
          x1: e.x1, y1: e.y, x2: e.x2, y2: e.y, class: 'e-union'
        }));
      } else if (e.type === 'stem') {
        gEdges.appendChild(svg('line', { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, class: 'e-link' }));
      } else {
        gEdges.appendChild(svg('path', {
          d: 'M' + e.x1 + ',' + e.y1 + ' H' + e.x2 + ' V' + e.y2,
          class: 'e-link', fill: 'none'
        }));
      }
    });
    g.appendChild(gEdges);

    nodes.forEach(function (n) { g.appendChild(card(n)); });
  }
  // draw() deliberately does not touch the viewport. Changing how much tree is
  // drawn should re-frame it (fit); moving the focus within the same tree should
  // hold the zoom the reader chose and slide to the new person (centerOn).

  function card(n) {
    var p = P[n.id] || { name: '(unknown)' };
    var cls = 'card';
    if (n.id === focus) cls += ' is-focus';
    if (p.living) cls += ' is-living';
    if (p.added) cls += ' is-added';
    if (n.spouse) cls += ' is-spouse';

    var gEl = svg('g', { class: cls, transform: 'translate(' + n.x + ',' + n.y + ')',
                         tabindex: '0', role: 'button' });
    gEl.appendChild(svg('rect', { width: CARD_W, height: CARD_H, rx: 2, class: 'card-bg' }));
    gEl.appendChild(svg('rect', { width: 3, height: CARD_H, class: 'card-sex sex-' + (p.sex || 'U') }));

    var name = svg('text', { x: 13, y: 25, class: 'card-name' });
    name.textContent = clip(p.name, 22);
    gEl.appendChild(name);

    var life = svg('text', { x: 13, y: 43, class: 'card-life' });
    life.textContent = lifespan(p);
    gEl.appendChild(life);

    var pl = (p.birth && p.birth.place) || (p.death && p.death.place) || '';
    if (pl) {
      var place = svg('text', { x: 13, y: 55, class: 'card-place' });
      place.textContent = clip(shortPlace(pl), 30);
      gEl.appendChild(place);
    }

    var title = svg('title');
    title.textContent = p.name + ' · ' + lifespan(p) + (pl ? '\n' + pl : '');
    gEl.appendChild(title);

    gEl.addEventListener('click', function () { go(n.id); });
    gEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(n.id); }
    });
    return gEl;
  }

  function clip(s, n) {
    s = esc(s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  // Places arrive finest-first and fully qualified ("Uniontown, Fayette,
  // Pennsylvania, USA"). On a card there is room for the ends, not the middle.
  function shortPlace(s) {
    var parts = esc(s).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (parts.length <= 2) return parts.join(', ');
    return parts[0] + ', ' + parts[parts.length - 2];
  }

  // ── pan / zoom ─────────────────────────────────────────────────────────────

  function applyView() {
    el.scene.setAttribute('transform',
      'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
    el.zoomLabel.textContent = Math.round(view.k * 100) + '%';
  }

  function bounds() {
    if (!nodes.length) return { x: 0, y: 0, w: 1, h: 1 };
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    nodes.forEach(function (n) {
      x1 = Math.min(x1, n.x); y1 = Math.min(y1, n.y);
      x2 = Math.max(x2, n.x + CARD_W); y2 = Math.max(y2, n.y + CARD_H);
    });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  // A deep pedigree doubles in width every generation, so "fit the whole thing"
  // means "shrink the cards to specks". FIT therefore stops at MIN_READABLE and
  // frames the focus person instead — the diagram is pannable, and a legible
  // slice of it beats an illegible whole.
  function fit() {
    var b = bounds(), r = el.svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var pad = 64;
    // The generation labels hang off the left of the cards; fit has to frame
    // them too or they sit outside the viewport at every zoom.
    b = { x: b.x - RULER_W, y: b.y, w: b.w + RULER_W, h: b.h };
    var k = Math.min((r.width - pad * 2) / b.w, (r.height - pad * 2) / b.h, 1.15);
    if (k < MIN_READABLE) {
      view.k = MIN_READABLE;
      applyView();
      return centerOn(focus);
    }
    view.k = k;
    view.x = r.width / 2 - (b.x + b.w / 2) * view.k;
    view.y = r.height / 2 - (b.y + b.h / 2) * view.k;
    applyView();
  }

  // Centre on one card without changing the zoom — used when the focus moves so
  // the eye keeps its place instead of the whole diagram jumping scale.
  function centerOn(id) {
    var n = null;
    for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) { n = nodes[i]; break; }
    // The focus is always drawn, so this is belt and braces — but it must not
    // fall back to fit(), which calls this function and would loop.
    if (!n) { var bb = bounds(); n = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 }; }
    var r = el.svg.getBoundingClientRect();
    view.x = r.width / 2 - (n.x + CARD_W / 2) * view.k;
    view.y = r.height / 2 - (n.y + CARD_H / 2) * view.k;
    applyView();
  }

  function zoomAt(cx, cy, factor) {
    var k2 = Math.min(3, Math.max(0.08, view.k * factor));
    var r = el.svg.getBoundingClientRect();
    var px = (cx - r.left - view.x) / view.k;
    var py = (cy - r.top - view.y) / view.k;
    view.k = k2;
    view.x = cx - r.left - px * k2;
    view.y = cy - r.top - py * k2;
    applyView();
  }

  function wirePanZoom() {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;

    el.svg.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.card')) return;
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY; ox = view.x; oy = view.y;
      el.svg.setPointerCapture(e.pointerId);
      el.svg.classList.add('grabbing');
    });
    el.svg.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      view.x = ox + (e.clientX - sx);
      view.y = oy + (e.clientY - sy);
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) moved = true;
      applyView();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      el.svg.addEventListener(ev, function () {
        dragging = false; el.svg.classList.remove('grabbing');
      });
    });
    el.svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    // Pinch: two pointers, scale by the change in their separation.
    var pts = {}, lastDist = 0;
    el.svg.addEventListener('pointerdown', function (e) { pts[e.pointerId] = e; });
    el.svg.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in pts)) return;
      pts[e.pointerId] = e;
      var ids = Object.keys(pts);
      if (ids.length !== 2) return;
      var a = pts[ids[0]], b = pts[ids[1]];
      var d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (lastDist) zoomAt((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, d / lastDist);
      lastDist = d;
      dragging = false;
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      el.svg.addEventListener(ev, function (e) { delete pts[e.pointerId]; lastDist = 0; });
    });
  }

  // ── the person panel ───────────────────────────────────────────────────────

  function chip(id, label) {
    var b = make('button', 'chip');
    var p = P[id];
    b.innerHTML = '';
    b.appendChild(make('b', null, p ? p.name : id));
    b.appendChild(make('i', null, p ? lifespan(p) : ''));
    if (label) b.title = label;
    b.addEventListener('click', function () { go(id); });
    return b;
  }

  function relBlock(title, ids) {
    if (!ids.length) return null;
    var box = make('div', 'rel');
    box.appendChild(make('h4', null, title + ' · ' + ids.length));
    var row = make('div', 'chips');
    ids.forEach(function (id) { row.appendChild(chip(id)); });
    box.appendChild(row);
    return box;
  }

  function factRow(label, value) {
    if (!value) return null;
    var r = make('div', 'fact');
    r.appendChild(make('span', 'k', label));
    r.appendChild(make('span', 'v', value));
    return r;
  }

  function renderPanel() {
    var p = P[focus];
    var box = el.panel;
    box.innerHTML = '';
    if (!p) return;

    var head = make('div', 'p-head');
    head.appendChild(make('div', 'p-kicker',
      (p.sex === 'M' ? 'MALE' : p.sex === 'F' ? 'FEMALE' : 'SEX UNRECORDED') +
      (p.gen != null ? ' · GENERATION ' + (p.gen === 0 ? '0' : (p.gen > 0 ? '+' : '') + p.gen) : '')));
    head.appendChild(make('h2', null, p.name));
    head.appendChild(make('div', 'p-life', lifespan(p)));

    var tags = make('div', 'p-tags');
    if (p.living) tags.appendChild(make('span', 'tag t-living', 'LIVING'));
    if (p.added) tags.appendChild(make('span', 'tag t-added', 'ADDED IN RESEARCH'));
    if (p.redacted) tags.appendChild(make('span', 'tag t-living', 'DETAILS WITHHELD'));
    if (!p.sources) tags.appendChild(make('span', 'tag t-thin', 'NO SOURCES'));
    else tags.appendChild(make('span', 'tag', p.sources + ' SOURCE' + (p.sources > 1 ? 'S' : '')));
    if (tags.children.length) head.appendChild(tags);
    box.appendChild(head);

    var facts = make('div', 'p-facts');
    [['BORN', factLine(p.birth)],
     ['DIED', factLine(p.death)],
     ['BURIED', factLine(p.burial)],
     ['BAPTISED', factLine(p.baptism)]].forEach(function (f) {
      var r = factRow(f[0], f[1]);
      if (r) facts.appendChild(r);
    });
    (p.events || []).forEach(function (ev) {
      var r = factRow((ev.type || 'EVENT').toUpperCase(), factLine(ev));
      if (r) facts.appendChild(r);
    });
    if (p.altNames && p.altNames.length) {
      facts.appendChild(factRow('ALSO', p.altNames.join(' · ')));
    }
    if (p.estBirth && !(p.birth && p.birth.date)) {
      facts.appendChild(factRow('BORN', 'no record — estimated c. ' + p.estBirth +
        ' from the dated people around them'));
    }
    if (facts.children.length) box.appendChild(facts);

    if (p.residences && p.residences.length) {
      var res = make('div', 'p-block');
      res.appendChild(make('h4', null, 'RESIDENCES · ' + p.residences.length));
      var list = make('div', 'p-list');
      p.residences.forEach(function (r) {
        var line = make('div', 'p-li');
        line.appendChild(make('b', null, dateText(r) || '—'));
        line.appendChild(make('span', null, r.place || ''));
        list.appendChild(line);
      });
      res.appendChild(list);
      box.appendChild(res);
    }

    var rels = make('div', 'p-rels');
    [['PARENTS', parentsOf(focus)],
     ['SPOUSES', spousesOf(focus).map(function (s) { return s.id; })],
     ['SIBLINGS', siblingsOf(focus)],
     ['CHILDREN', childrenOf(focus)]].forEach(function (r) {
      var b = relBlock(r[0], r[1]);
      if (b) rels.appendChild(b);
    });
    if (!rels.children.length) rels.appendChild(make('div', 'p-none', 'No linked relatives in the file.'));
    box.appendChild(rels);

    if (p.sourceTitles && p.sourceTitles.length) {
      var src = make('details', 'p-src');
      src.appendChild(make('summary', null, 'SOURCES CITED · ' + p.sourceTitles.length));
      var ul = make('ul');
      p.sourceTitles.forEach(function (t) { ul.appendChild(make('li', null, t)); });
      src.appendChild(ul);
      box.appendChild(src);
    }

    var idline = make('div', 'p-id', 'ID ' + p.id);
    box.appendChild(idline);

    $('#peek-name').textContent = p.name + ' · ' + lifespan(p);
  }

  // ── the index ──────────────────────────────────────────────────────────────

  var indexState = { q: '', surname: '', sort: 'name', only: '' };

  function matches(p) {
    var s = indexState;
    if (s.surname && p.surname !== s.surname) return false;
    if (s.only === 'living' && !p.living) return false;
    if (s.only === 'undated' && (p.birth && p.birth.date)) return false;
    if (s.only === 'unsourced' && p.sources) return false;
    if (s.only === 'added' && !p.added) return false;
    if (!s.q) return true;
    var q = s.q.toLowerCase();
    if (p.name.toLowerCase().indexOf(q) >= 0) return true;
    if ((p.altNames || []).join(' ').toLowerCase().indexOf(q) >= 0) return true;
    var places = [p.birth && p.birth.place, p.death && p.death.place]
      .concat((p.residences || []).map(function (r) { return r.place; }))
      .filter(Boolean).join(' ').toLowerCase();
    return places.indexOf(q) >= 0;
  }

  function renderIndex() {
    var list = DATA.people.filter(matches);
    if (indexState.sort === 'birth') {
      list.sort(function (a, b) { return birthKey(a.id) - birthKey(b.id); });
    } else if (indexState.sort === 'sources') {
      list.sort(function (a, b) { return (b.sources || 0) - (a.sources || 0); });
    } else {
      list.sort(function (a, b) {
        return (a.surname || '~').localeCompare(b.surname || '~') ||
               (a.given || '').localeCompare(b.given || '');
      });
    }

    el.count.textContent = list.length + ' OF ' + DATA.people.length;
    var body = el.rows;
    body.innerHTML = '';
    var frag = document.createDocumentFragment();
    list.slice(0, 800).forEach(function (p) {
      var row = make('button', 'row' + (p.id === focus ? ' on' : ''));
      row.appendChild(make('span', 'r-name', p.name));
      row.appendChild(make('span', 'r-life', lifespan(p)));
      var pl = (p.birth && p.birth.place) || (p.death && p.death.place) || '';
      row.appendChild(make('span', 'r-place', pl ? shortPlace(pl) : ''));
      row.addEventListener('click', function () { go(p.id); setView('tree'); });
      frag.appendChild(row);
    });
    if (list.length > 800) {
      frag.appendChild(make('div', 'r-more', 'showing the first 800 — narrow the search'));
    }
    if (!list.length) frag.appendChild(make('div', 'r-more', 'nobody matches that.'));
    body.appendChild(frag);
  }

  // ── navigation ─────────────────────────────────────────────────────────────

  function go(id, skipHistory) {
    if (!P[id] || id === focus) { if (P[id]) renderPanel(); return; }
    if (!skipHistory && focus) history.push(focus);
    focus = id;
    location.hash = id;
    draw();
    centerOn(id);
    renderPanel();
    renderIndex();
    el.back.disabled = !history.length;
    document.title = P[id].name + ' — THE LINE';
  }

  function setView(v) {
    document.body.setAttribute('data-view', v);
    el.tabs.forEach(function (t) { t.classList.toggle('on', t.dataset.view === v); });
    if (v === 'tree') requestAnimationFrame(function () { centerOn(focus); });
  }

  function wireChrome() {
    el.tabs.forEach(function (t) {
      t.addEventListener('click', function () { setView(t.dataset.view); });
    });
    el.back.addEventListener('click', function () {
      var prev = history.pop();
      if (prev) go(prev, true);
      el.back.disabled = !history.length;
    });
    el.home.addEventListener('click', function () { go(DATA.meta.root); });
    $('#peek').addEventListener('click', function () { setView('person'); });
    $('#fit').addEventListener('click', fit);
    $('#zin').addEventListener('click', function () {
      var r = el.svg.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.25);
    });
    $('#zout').addEventListener('click', function () {
      var r = el.svg.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.25);
    });

    el.up.addEventListener('input', function () {
      up = Math.min(MAX_SPAN, +el.up.value);
      $('#upv').textContent = up;
      draw(); fit();
    });
    el.down.addEventListener('input', function () {
      down = Math.min(MAX_SPAN, +el.down.value);
      $('#downv').textContent = down;
      draw(); fit();
    });

    el.q.addEventListener('input', function () {
      indexState.q = el.q.value.trim();
      renderIndex();
    });
    el.sort.addEventListener('change', function () {
      indexState.sort = el.sort.value; renderIndex();
    });
    el.surname.addEventListener('change', function () {
      indexState.surname = el.surname.value; renderIndex();
    });
    el.only.addEventListener('change', function () {
      indexState.only = el.only.value; renderIndex();
    });

    window.addEventListener('resize', function () {
      if (document.body.getAttribute('data-view') === 'tree') centerOn(focus);
    });
    window.addEventListener('hashchange', function () {
      var id = location.hash.slice(1);
      if (id && P[id] && id !== focus) go(id, true);
    });
    document.addEventListener('keydown', function (e) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === '/') { e.preventDefault(); setView('index'); el.q.focus(); }
      if (e.key === 'Escape') setView('tree');
      if (e.key === 'f') fit();
      if (e.key === 'h') go(DATA.meta.root);
      if (e.key === 'Backspace') { e.preventDefault(); el.back.click(); }
    });
  }

  // ── boot ───────────────────────────────────────────────────────────────────

  function fillChrome() {
    var m = DATA.meta, c = m.counts;
    $('#stat-people').textContent = c.people;
    $('#stat-fams').textContent = c.families;
    $('#stat-gens').textContent = Math.abs(m.generations[0]) + Math.abs(m.generations[1]) + 1;
    $('#stat-span').textContent = m.span ? m.span[0] + '–' + m.span[1] : '—';
    $('#stat-sourced').textContent =
      Math.round(100 * DATA.people.filter(function (p) { return p.sources; }).length / c.people) + '%';
    $('#built').textContent = 'BUILT ' + m.generated.slice(0, 10) + ' FROM ' + m.source.toUpperCase();

    var sel = el.surname;
    (m.surnames || []).forEach(function (s) {
      var o = make('option', null, s[0] + ' (' + s[1] + ')');
      o.value = s[0];
      sel.appendChild(o);
    });
  }

  function fail(msg) {
    el.svg.style.display = 'none';
    var b = make('div', 'boot-err');
    b.appendChild(make('h3', null, 'THE LINE COULD NOT LOAD'));
    b.appendChild(make('p', null, msg));
    b.appendChild(make('p', null,
      'data/tree.json is built by tools/build-tree.py from a GEDCOM export. ' +
      'If it is missing, run: tools/build-tree.py path/to/export.ged'));
    $('#stage').appendChild(b);
  }

  function boot() {
    el = {
      svg: $('#canvas'), scene: $('#scene'), panel: $('#panel'),
      rows: $('#rows'), count: $('#count'), q: $('#q'), sort: $('#sort'),
      surname: $('#surname'), only: $('#only'), back: $('#back'), home: $('#home'),
      up: $('#up'), down: $('#down'), zoomLabel: $('#zoomv'),
      tabs: Array.prototype.slice.call(document.querySelectorAll('.tab'))
    };

    fetch('./data/tree.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        DATA = d;
        d.people.forEach(function (p) { P[p.id] = p; });
        d.families.forEach(function (f) {
          F[f.id] = f;
          (f.children || []).forEach(function (c) {
            (CHILD_OF[c] = CHILD_OF[c] || []).push(f.id);
          });
        });

        fillChrome();
        wireChrome();
        wirePanZoom();

        var hash = location.hash.slice(1);
        focus = (hash && P[hash]) ? hash : d.meta.root;
        draw();
        fit();
        renderPanel();
        renderIndex();
        setView('tree');
        el.back.disabled = true;
        document.body.classList.add('ready');
      })
      .catch(function (e) { fail(String(e && e.message || e)); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
