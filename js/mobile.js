// mobile.js — THE DIAL's runtime. Three phases, five sections, two sheets.
//
// Deliberately plain: no framework, no build step, and — apart from the
// particle wordmark on phase 00 — no per-frame loop. The scrawl on the wall is
// painted once from a fixed seed and repainted only on a settled resize, so
// the page costs nothing to leave open.
//
// THE GATE. Every other page on the site loads js/gate.js first thing in
// <head>, which hides the document until the passphrase clears. This page
// cannot do that — the splash is the point of it — so the gate is fetched on
// demand when the seal is broken, and the dial waits for its `lv-unlocked`
// event. gate.js stores the cleared passphrase in sessionStorage, so every
// page opened from the dial afterwards finds it already there.
(function () {
  'use strict';

  var SECTIONS = [
    {
      no: 'I · THE RECORD, WRITTEN', title: 'THE WIKI',
      color: '#b026ff', glow: 'rgba(176,38,255,.6)', tint: 'rgba(176,38,255,.4)',
      label: 'THE<br>WIKI',
      meta: 'NINE DOMAINS · 320 PAGES · EVERY EDGE ARGUED',
      blurb: 'The compiled second brain in full — the written record itself, not a picture of it.',
      long: 'The compiled second brain, in full — every domain, every page, every typed connection between them. This is the written record itself, not a visualisation of it. Read it straight through or follow the links wherever they go.',
      href: './wiki.html', cta: 'READ IT ►', file: 'wiki.html'
    },
    {
      no: 'II · THE RECORD, RAW', title: 'THE CORPUS',
      color: '#00e1ff', glow: 'rgba(0,225,255,.6)', tint: 'rgba(0,225,255,.4)',
      label: 'THE<br>CORPUS',
      meta: '134,348 MESSAGES · 2011 — 2026 · SEARCHABLE',
      blurb: 'The complete message record, both sides, nothing excluded and nothing smoothed.',
      long: 'The complete message record — 134,348 messages across eleven years, both sides, searchable, with nothing excluded and nothing smoothed. Every instrument on this site is computed over exactly this.',
      href: './transcript.html', cta: 'OPEN THE TRANSCRIPT ►', file: 'transcript.html'
    },
    {
      no: 'III · THE INSTRUMENTS', title: 'THE VISUALIZERS',
      color: '#ff2fbf', glow: 'rgba(255,47,191,.6)', tint: 'rgba(255,47,191,.42)',
      label: 'VISUAL<br>IZERS',
      meta: '37 INSTRUMENTS · 3 CHAPELS · CORPUS / WIKI / ANNIE',
      blurb: 'Thirty-seven ways to look at the same counts. Grouped by which corpus they run on.',
      long: 'Thirty-seven instruments and three chapels, grouped by the corpus each one runs on. None of them score sentiment, curate vocabulary or pick a threshold because of what it would surface.',
      href: null, cta: 'INDEX THEM ►', file: '37 instruments'
    },
    {
      no: 'IV · THE PEOPLE', title: 'THE LINE',
      color: '#4d7cff', glow: 'rgba(77,124,255,.6)', tint: 'rgba(77,124,255,.4)',
      label: 'THE<br>LINE',
      meta: 'THE FAMILY TREE · DRAWN AND WALKABLE',
      blurb: 'An hourglass around one person: ancestors climbing away, descendants spreading below.',
      long: 'The family tree, drawn and walkable — every person the research has found, with the dates and places actually on record. Tap anyone to stand where they stood: ancestors climb away above them, descendants spread out below.',
      href: './tree.html', cta: 'WALK IT ►', file: 'tree.html'
    },
    {
      no: 'V · THE WAY IN', title: 'FACT / STORY',
      color: '#ff8ae8', glow: 'rgba(255,138,232,.6)', tint: 'rgba(255,138,232,.45)',
      label: 'FACT /<br>STORY',
      meta: 'FACT OR STORY · PENDING UNTIL INGESTED',
      blurb: 'The corpus only knows what was written down. Type in the things that were only ever said.',
      long: 'The manual ingestion queue. The corpus only knows what was already written down somewhere — every formative thing that was only ever said out loud is invisible to it. Type it here and it gets analysed, linked and written into the wiki as readable pages.',
      href: './factstory.html', cta: 'ADD SOMETHING ►', file: 'factstory.html'
    }
  ];

  var STEP = 360 / SECTIONS.length;
  var PHASE_TAG = {
    splash: 'PHASE 00 // THE NAME',
    seal: 'PHASE 01 // THE SEAL',
    hub: 'PHASE 02 // THE DIAL'
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { phase: 'splash', idx: 0, deg: 0, drag: false, sheet: null };

  var el = {
    phase: $('#phase'), flash: $('#flash'),
    splash: $('#splash'), seal: $('#seal'), hub: $('#hub'),
    wordmark: $('#wordmark'), sealnote: $('#sealnote'),
    dial: $('#dial'), ring: $('#ring'), go: $('#go'),
    plate: $('#plate'), dots: $('#dots'), openbtn: $('#openbtn'),
    brief: $('#brief'), vis: $('#vis'), scrawl: $('#scrawl')
  };

  // ── the wall ────────────────────────────────────────────────────────────
  // Crowns, tallies, cross-outs and arrows, from a fixed seed so the wall is
  // the same wall on every visit. One pass, no animation.
  var INK = ['#ffd400', '#ff2fbf', '#00e1ff', '#b026ff', '#ffffff'];

  function paintScrawl() {
    var cv = el.scrawl;
    if (!cv || !cv.getContext) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    var s = 20260814;
    var rnd = function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    var pick = function () { return INK[(rnd() * INK.length) | 0]; };

    // one mark per ~14,000px² of viewport, floored so a phone still gets a wall
    var density = Math.max(10, Math.min(40, Math.round((W * H) / 14000)));
    c.lineCap = 'round';

    for (var i = 0; i < density; i++) {
      var x = rnd() * W, y = rnd() * H, k = (rnd() * 6) | 0;
      c.strokeStyle = pick();
      c.globalAlpha = 0.10 + rnd() * 0.24;
      c.lineWidth = 1 + rnd() * 3;
      c.beginPath();
      if (k === 0) {                                        // scribble loop
        var r = 22 + rnd() * 70;
        for (var a = 0; a < 9; a += 0.22) {
          var rr = r * (0.55 + 0.45 * Math.sin(a * 2.3 + i));
          var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
          a === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
      } else if (k === 1) {                                 // crossing out
        var w1 = 60 + rnd() * 190;
        c.moveTo(x, y); c.lineTo(x + w1, y + (rnd() - 0.5) * 16);
        c.moveTo(x, y + 9); c.lineTo(x + w1 * 0.8, y + 9 + (rnd() - 0.5) * 12);
      } else if (k === 2) {                                 // box
        var w2 = 40 + rnd() * 130, h2 = 26 + rnd() * 90;
        c.moveTo(x, y); c.lineTo(x + w2, y + rnd() * 5);
        c.lineTo(x + w2 + rnd() * 4, y + h2); c.lineTo(x - rnd() * 4, y + h2 - rnd() * 5);
        c.closePath();
      } else if (k === 3) {                                 // tally
        for (var t = 0; t < 5; t++) {
          c.moveTo(x + t * 9, y); c.lineTo(x + t * 9 + rnd() * 5, y + 22 + rnd() * 8);
        }
        c.moveTo(x - 4, y + 16); c.lineTo(x + 44, y + 6);
      } else if (k === 4) {                                 // crown
        var w3 = 34 + rnd() * 40, h3 = w3 * 0.7;
        c.moveTo(x, y + h3); c.lineTo(x, y); c.lineTo(x + w3 * 0.25, y + h3 * 0.5);
        c.lineTo(x + w3 * 0.5, y); c.lineTo(x + w3 * 0.75, y + h3 * 0.5);
        c.lineTo(x + w3, y); c.lineTo(x + w3, y + h3); c.closePath();
      } else {                                              // arrow
        var w4 = 50 + rnd() * 150, dy = (rnd() - 0.5) * 90;
        c.moveTo(x, y); c.lineTo(x + w4, y + dy);
        c.moveTo(x + w4, y + dy); c.lineTo(x + w4 - 16, y + dy - 9);
        c.moveTo(x + w4, y + dy); c.lineTo(x + w4 - 14, y + dy + 11);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  var rzTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(paintScrawl, 250);
  });

  // ── marginalia ──────────────────────────────────────────────────────────
  // Tap any word carrying data-w to strike it out, tap again to bring it back.
  // It flashes a different ink on the way through, and nothing is remembered.
  var inkAt = 0;
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-w]') : null;
    if (!t) return;
    t.classList.toggle('struck');
    var was = t.style.color;
    inkAt = (inkAt + 1) % INK.length;
    t.style.transition = 'none';
    t.style.color = INK[inkAt];
    setTimeout(function () { t.style.transition = 'color .4s'; t.style.color = was; }, 120);
  });

  // ── the wordmark ────────────────────────────────────────────────────────
  // <particle-type> runs a requestAnimationFrame loop for as long as it is in
  // the document, so it is built when phase 00 opens and torn out when it
  // closes. Its disconnectedCallback cancels the frame; leaving the splash
  // leaves nothing simulating.
  function mountWordmark() {
    if (!el.wordmark || el.wordmark.firstChild) return;
    if (!window.customElements || !customElements.get('particle-type')) {
      // void-engine.js has not landed yet (or failed to): draw the name flat.
      el.wordmark.innerHTML = '<div class="lock lean fill-chrome" style="display:grid;'
        + 'place-items:center;height:100%;font-size:clamp(44px,15vw,96px)">@danfrank</div>';
      return;
    }
    // The element samples the glyphs the moment it connects, so it has to
    // connect after the face has actually arrived — sampling against a fallback
    // face measures one font and draws another, and the name comes out as
    // mush. document.fonts.load resolves either way; ready is the honest wait.
    var mount = function () {
      if (!el.wordmark || el.wordmark.firstChild) return;
      var pt = document.createElement('particle-type');
      pt.setAttribute('text', '@danfrank');
      pt.setAttribute('font', '400 Luckiest Guy');   // the approved display face
      el.wordmark.appendChild(pt);
    };
    if (document.fonts && document.fonts.load) {
      Promise.race([
        document.fonts.load('400 100px Luckiest Guy').then(function () { return document.fonts.ready; }),
        new Promise(function (r) { setTimeout(r, 2500); })
      ]).then(mount, mount);
    } else {
      mount();
    }
  }
  function unmountWordmark() {
    if (el.wordmark) el.wordmark.textContent = '';
  }

  // ── phases ──────────────────────────────────────────────────────────────
  function flash() {
    if (reduce || !el.flash) return;
    el.flash.classList.remove('go');
    void el.flash.offsetWidth;      // restart the animation
    el.flash.classList.add('go');
  }

  function setPhase(next) {
    state.phase = next;
    el.splash.classList.toggle('on', next === 'splash');
    el.seal.classList.toggle('on', next === 'seal');
    el.hub.classList.toggle('on', next === 'hub');
    el.phase.textContent = PHASE_TAG[next];
    document.documentElement.style.setProperty('--phase', next);
    if (next === 'splash') mountWordmark(); else unmountWordmark();
    if (next === 'hub') render();
    window.scrollTo(0, 0);
  }

  // ── the seal ────────────────────────────────────────────────────────────
  // Fetching gate.js starts the site's real four-step door: terms, quiz,
  // curtain, passphrase. It hides this document while it runs and fires
  // `lv-unlocked` when the passphrase clears, which is the only way to the
  // dial. If the script cannot be fetched at all, the seal says so and stays
  // shut rather than pretending to open.
  var gateAsked = false;

  function breakSeal() {
    if (state.phase !== 'seal') return;

    if (window.LVGate && !window.LVGate.locked()) { toHub(); return; }

    if (!gateAsked) {
      gateAsked = true;
      el.sealnote.textContent = 'RAISING THE GATE…';
      var s = document.createElement('script');
      s.src = './js/gate.js';
      s.onerror = function () {
        gateAsked = false;
        el.sealnote.textContent = 'THE GATE DID NOT LOAD. RELOAD AND TRY AGAIN.';
      };
      document.head.appendChild(s);
    }
  }

  window.addEventListener('lv-unlocked', function () {
    el.sealnote.textContent = 'THE SEAL IS BROKEN.';
    toHub();
  });

  function toHub() { setPhase('hub'); flash(); }

  // ── the dial ────────────────────────────────────────────────────────────
  function buildRing() {
    var frag = document.createDocumentFragment();
    SECTIONS.forEach(function (sec, i) {
      var sat = document.createElement('div');
      sat.className = 'sat';
      sat.style.transform = 'translate(-50%,-50%) rotate(' + (i * STEP) + 'deg) translate(0, calc(-1 * var(--r)))';

      var b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--edge', sec.color);
      b.style.setProperty('--tint', sec.tint);
      b.setAttribute('aria-label', sec.title);
      b.innerHTML = '<span>' + sec.label + '</span>';
      b.addEventListener('click', function () {
        if (state.idx === i) open(); else snap(i);
      });

      sat.appendChild(b);
      frag.appendChild(sat);
    });
    el.ring.appendChild(frag);

    var dfrag = document.createDocumentFragment();
    SECTIONS.forEach(function (sec, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', sec.title);
      d.innerHTML = '<i style="--edge:' + sec.color + '"></i>';
      d.addEventListener('click', function () { snap(i); });
      dfrag.appendChild(d);
    });
    el.dots.appendChild(dfrag);
  }

  function snap(i) {
    var n = ((i % SECTIONS.length) + SECTIONS.length) % SECTIONS.length;
    state.idx = n;
    state.deg = -n * STEP;
    state.drag = false;
    render();
  }
  function go(d) { snap(state.idx + d); }

  function open() {
    var sec = SECTIONS[state.idx];
    if (sec.href === null) openSheet('vis'); else openSheet('brief');
  }

  function render() {
    var sec = SECTIONS[state.idx];
    var dur = state.drag ? '0s' : '.5s cubic-bezier(.2,.95,.15,1)';

    el.ring.style.transition = 'transform ' + dur;
    el.ring.style.transform = 'rotate(' + state.deg + 'deg)';

    // each satellite counter-rotates so its label stays upright
    var sats = el.ring.children;
    for (var i = 0; i < sats.length; i++) {
      var b = sats[i].firstChild;
      b.style.transition = 'transform ' + dur;
      b.style.transform = 'rotate(' + (-(i * STEP) - state.deg) + 'deg) scale('
        + (state.idx === i ? 1.2 : 0.86) + ')';
      b.setAttribute('aria-current', state.idx === i ? 'true' : 'false');
    }

    var dots = el.dots.children;
    for (var j = 0; j < dots.length; j++) {
      dots[j].setAttribute('aria-current', state.idx === j ? 'true' : 'false');
    }

    el.hub.style.setProperty('--live', sec.color);
    el.hub.style.setProperty('--live-glow', sec.glow);

    // the hub button carries the numeral alone; the full billing is on the brief
    el.go.querySelector('.no').textContent = sec.no.split('·')[0].trim();
    el.plate.querySelector('.title').textContent = sec.title;
    el.plate.querySelector('.meta').textContent = sec.meta;
    el.plate.querySelector('.blurb').textContent = sec.blurb;
    el.openbtn.textContent = 'OPEN ' + sec.title + ' ►';
  }

  // drag: the ring follows the finger, then falls to the nearest detent
  var dragX = 0, dragDeg = 0, dragging = false;
  function onDown(e) {
    dragging = true; state.drag = true;
    dragX = e.clientX; dragDeg = state.deg;
    if (el.dial.setPointerCapture) { try { el.dial.setPointerCapture(e.pointerId); } catch (_) {} }
  }
  function onMove(e) {
    if (!dragging) return;
    var w = el.dial.getBoundingClientRect().width || 360;
    state.deg = dragDeg + ((e.clientX - dragX) / w) * 210;
    render();
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    snap(Math.round(-state.deg / STEP));
  }

  // ── the sheets ──────────────────────────────────────────────────────────
  function openSheet(which) {
    var sec = SECTIONS[state.idx];
    if (which === 'brief') {
      var b = el.brief;
      b.style.setProperty('--live', sec.color);
      b.style.setProperty('--live-glow', sec.glow);
      b.querySelector('.no').textContent = sec.no;
      b.querySelector('h1').textContent = sec.title;
      b.querySelector('.meta').textContent = sec.meta;
      b.querySelector('p').textContent = sec.long;
      var cta = b.querySelector('.cta');
      cta.href = sec.href;
      cta.textContent = sec.cta;
      b.querySelector('.file').textContent = sec.file;
    }
    state.sheet = which;
    el[which].classList.add('on');
    el[which].scrollTop = 0;
    document.body.style.overflow = 'hidden';
    var first = el[which].querySelector('[data-close]');
    if (first) first.focus();
  }

  function closeSheet() {
    if (!state.sheet) return;
    el[state.sheet].classList.remove('on');
    state.sheet = null;
    document.body.style.overflow = '';
    el.openbtn.focus();
  }

  // ── wiring ──────────────────────────────────────────────────────────────
  function init() {
    paintScrawl();
    buildRing();
    render();
    mountWordmark();

    $('#toSeal').addEventListener('click', function () { setPhase('seal'); flash(); });
    $('#sealBack').addEventListener('click', function () { setPhase('splash'); });
    $('#breakSeal').addEventListener('click', breakSeal);
    $('#hubBack').addEventListener('click', function () { closeSheet(); setPhase('splash'); });
    $('#prev').addEventListener('click', function () { go(-1); });
    $('#next').addEventListener('click', function () { go(1); });
    el.openbtn.addEventListener('click', open);
    el.go.addEventListener('click', open);

    el.dial.addEventListener('pointerdown', onDown);
    el.dial.addEventListener('pointermove', onMove);
    el.dial.addEventListener('pointerup', onUp);
    el.dial.addEventListener('pointercancel', onUp);

    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', closeSheet);
    });

    window.addEventListener('keydown', function (e) {
      if (state.sheet) { if (e.key === 'Escape') closeSheet(); return; }
      if (state.phase !== 'hub') return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Enter' && document.activeElement === document.body) open();
    });

    // Someone who cleared the gate earlier this session should not be asked to
    // break a seal that is already broken — the button says so instead.
    if (window.LVGate && !window.LVGate.locked()) {
      $('#breakSeal').textContent = 'THE SEAL IS BROKEN — GO ►';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
