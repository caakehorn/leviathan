// ─────────────────────────────────────────────────────────────────────────────
// THE ENDLESS ENCYCLOPEDIA — the generator behind Wing II.
//
// A wiki of things that do not exist, with no bottom. Every entry is coined and
// written from a seed, and the seed is the entry's own name (its slug). So:
//
//   entry("the-ninth-recursion")
//
// always produces the identical article — same definition, same epigraph, same
// cross-links, in every browser, forever. That determinism is the single law
// this wing shares with the Temple. The only non-deterministic call in the file
// is coin(), which invents a NEW name at random when you choose to fall deeper;
// once a name exists, everything downstream of it is fixed.
//
// Nothing here describes anything real. It is a definition machine pointed at
// the empty set, and it refers to no one.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';
  if (window.LVEndless) return;

  // ── determinism ────────────────────────────────────────────────────────────
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
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function ipick(r, a, n) {                     // n distinct picks, order-stable
    var pool = a.slice(), out = [];
    for (var i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return out;
  }
  function chance(r, p) { return r() < p; }
  function irange(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }

  // ── the word-hoard ───────────────────────────────────────────────────────
  var ADJ = ['hollow', 'recursive', 'unlit', 'posthumous', 'asymptotic', 'drowned',
    'sacramental', 'vestigial', 'apocryphal', 'counterfeit', 'luminous', 'penitent',
    'immaculate', 'feral', 'liturgical', 'terminal', 'sidereal', 'cryogenic', 'gilded',
    'unspoken', 'inverse', 'brackish', 'sovereign', 'derelict', 'phantom', 'saturnine',
    'incorruptible', 'famished', 'nocturnal', 'threadbare', 'sunless', 'provisional',
    'obsidian', 'convalescent', 'apostate', 'weeping', 'gangrenous', 'ceremonial'];
  var NOUN = ['cartography', 'recursion', 'grief', 'cathedral', 'ligament', 'aperture',
    'remainder', 'covenant', 'silence', 'machinery', 'appetite', 'geometry', 'apostasy',
    'membrane', 'inventory', 'weather', 'arithmetic', 'confession', 'harvest', 'archive',
    'threshold', 'reliquary', 'debt', 'menagerie', 'gospel', 'anatomy', 'orbit', 'ledger',
    'tide', 'chorus', 'mercy', 'engine', 'lantern', 'wound', 'census', 'liturgy', 'hunger'];
  var NOUN2 = ['light', 'ash', 'salt', 'glass', 'bone', 'rain', 'ruin', 'iron', 'smoke',
    'honey', 'thorn', 'mirror', 'water', 'wire', 'sleep', 'flame', 'dust', 'frost',
    'the drowned', 'the unnamed', 'the leaving', 'forgetting', 'the interior', 'the almost'];
  var ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
    'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'final', 'null', 'nameless'];
  var FIELD = ['apophatic topology', 'negative liturgy', 'applied hauntology',
    'recursive theology', 'the forensic astronomy of the interior', 'the calculus of near-misses',
    'comparative silence', 'speculative anatomy', 'the grammar of leaving', 'sacred cartography',
    'the economics of grief', 'inverse archaeology', 'the physics of almost', 'terminal botany',
    'the arithmetic of the missing', 'ceremonial engineering', 'the study of unsent things'];
  var HEADINGS = ['Etymology', 'First Occurrence', 'Mechanism', 'Observed Effects',
    'In Practice', 'The Paradox', 'Controversy', 'Disappearance', 'Related Confusions',
    'The Proof', 'Aftermath', 'Warnings', 'On the Naming', 'What Remains', 'The Objection'];
  var NAMES = ['M. Vael', 'the Cartographer of Absence', 'A. Solenne', 'Brother Ovid',
    'the last archivist of the ' , 'D. Marrow', 'the Committee on Unfinished Things',
    'an anonymous hand', 'the Second Compiler', 'H. Zaether', 'the Widow of the Instrument',
    'a voice recorded but never identified', 'the Custodian', 'P. Nell', 'the drowned scribe'];
  var WORKS = ['the marginalia', 'a recovered index', 'the burned appendix', 'the last catalogue',
    'the abandoned proof', 'an unsent letter', 'the field notes', 'the confession', 'the ledger',
    'the incomplete gospel', 'the forbidden footnote', 'the erratum', 'the recovered transcript'];

  // ── coining names (slugs) ──────────────────────────────────────────────────
  // A slug is readable and lives in the URL. entry() derives the whole article
  // from it, and its display title is just the slug made legible — so the URL
  // and the headline are always the same string.
  function slugPattern(r) {
    var p = r();
    if (p < 0.30) return pick(r, ADJ) + '-' + pick(r, NOUN);
    if (p < 0.52) return 'the-' + pick(r, ORD) + '-' + pick(r, NOUN);
    if (p < 0.72) return pick(r, NOUN) + '-of-' + pick(r, NOUN2).replace(/^the /, '');
    if (p < 0.88) return pick(r, ADJ) + '-' + pick(r, ADJ) + '-' + pick(r, NOUN);
    return 'the-' + pick(r, ADJ) + '-' + pick(r, NOUN);
  }
  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  // A brand-new name, at random. The one non-deterministic function here.
  function coin() { return slugify(slugPattern(mulberry32((Math.random() * 4294967296) >>> 0))); }
  // A name derived deterministically from a stream — used for cross-links, so an
  // article's links are the same every time it is generated.
  function coinFrom(r) { return slugify(slugPattern(r)); }

  var SMALL = { of: 1, the: 1, and: 1, a: 1, an: 1, to: 1, in: 1, on: 1 };
  function titleCase(slug) {
    var w = slug.replace(/-/g, ' ').split(' ');
    return w.map(function (x, i) {
      if (i > 0 && SMALL[x]) return x;
      return x.charAt(0).toUpperCase() + x.slice(1);
    }).join(' ');
  }

  // ── prose ──────────────────────────────────────────────────────────────────
  // Sentences are built from templates whose slots are either words or a {LINK}
  // — a deterministically-coined term rendered as a doorway to its own article.
  // seg list: {t:'text',s} | {t:'link',slug,label}
  function T(s) { return { t: 'text', s: s }; }
  function L(r) { var slug = coinFrom(r); return { t: 'link', slug: slug, label: titleCase(slug) }; }

  var SENT = [
    ['{TITLE} is the ', A, ' ', N, ' that remains once ', LK, ' has finally been admitted.'],
    ['To the students of ', F, ', {TITLE} is indistinguishable from ', LK,
      ', except that it arrives already grieving.'],
    ['It is not ', LK, '. It is the ', A, ' silhouette ', LK, ' leaves on the wall after it goes.'],
    ['Every attempt to measure {TITLE} has instead produced ', LK,
      ', which is why the two are now catalogued together and trusted by no one.'],
    ['The ', A, ' ', N, ' of it cannot be held, only owed; those who carry it call the debt ', LK, '.'],
    ['Where ', LK, ' asks a question, {TITLE} is the ', A, ' shape of having stopped asking.'],
    ['Practitioners insist it is a ', N, '. The ', A, ' evidence suggests it is closer to ', LK, '.'],
    ['{TITLE} occurs wherever ', LK, ' and ', LK, ' are made to occupy the same ', N,
      ' — briefly, and never on purpose.'],
    ['You will know you have found it when ', LK, ' stops meaning anything and the ', N,
      ' in the room turns ', A, '.'],
    ['It has a ', A, ' half-life. What decays out of it is ', LK, '; what is left is a ', N,
      ' with your name already inside it.']
  ];
  function A(r) { return pick(r, ADJ); }
  function N(r) { return pick(r, NOUN); }
  function F(r) { return pick(r, FIELD); }
  function LK(r) { return L(r); }

  function sentence(r, title) {
    var tmpl = pick(r, SENT), out = [];
    for (var i = 0; i < tmpl.length; i++) {
      var part = tmpl[i];
      if (typeof part === 'string') out.push(T(part.replace('{TITLE}', title)));
      else if (part === A || part === N || part === F) out.push(T(part(r)));
      else if (part === LK) out.push(part(r));
    }
    return mergeText(out);
  }
  function mergeText(segs) {                     // fuse adjacent text nodes
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (s.t === 'text' && out.length && out[out.length - 1].t === 'text') out[out.length - 1].s += s.s;
      else out.push({ t: s.t, s: s.s, slug: s.slug, label: s.label });
    }
    return out;
  }
  function paragraph(r, title) {
    var n = irange(r, 2, 4), segs = [];
    for (var i = 0; i < n; i++) {
      if (i) segs.push(T(' '));
      segs = segs.concat(sentence(r, title));
    }
    return fixArticles(mergeText(segs));
  }

  // "a" → "an" before a vowel, including across a text→link boundary
  // ("a" then a linked term that starts with a vowel). Crude vowel rule, which
  // is exactly right for a vocabulary that is itself invented.
  function fixArticles(segs) {
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (s.t !== 'text') continue;
      s.s = s.s.replace(/\b([Aa]) (?=[aeiou])/g, function (m, a) { return a + 'n '; });
      if (/\b[Aa]\s*$/.test(s.s)) {
        var nxt = segs[i + 1];
        var head = nxt ? (nxt.t === 'text' ? nxt.s : (nxt.label || '')).replace(/[^a-z]/i, '').charAt(0) : '';
        if (head && /[aeiou]/i.test(head)) s.s = s.s.replace(/([Aa])(\s*)$/, function (m, a, sp) { return a + 'n' + (sp || ' '); });
      }
    }
    return segs;
  }

  // ── an entry ───────────────────────────────────────────────────────────────
  function entry(slug) {
    slug = slugify(slug) || coin();
    var r = mulberry32(cyrb128(slug));
    var title = titleCase(slug);

    var pos = pick(r, ['n.', 'n.', 'v.', 'adj.', 'archaic', 'pl. n.', 'n. (obs.)']);
    var pron = '/' + slug.replace(/-/g, ' ').split(' ').map(function (w) {
      return w.slice(0, Math.max(2, w.length - irange(r, 0, 2)));
    }).join('·') + '/';

    // epigraph
    var who = pick(r, NAMES);
    if (/the $/.test(who)) who += pick(r, NOUN);
    var epiText = capitalize(fixArticles(sentence(r, title)).map(function (s) { return s.s || s.label; }).join(''));
    var epigraph = { text: '“' + epiText + '”', who: '— ' + who + ', ' + pick(r, WORKS) };

    var nsec = irange(r, 3, 4);
    var headings = ipick(r, HEADINGS, nsec);
    var sections = headings.map(function (h) {
      var np = irange(r, 1, 2), paras = [];
      for (var i = 0; i < np; i++) paras.push(paragraph(r, title));
      return { heading: h, paras: paras };
    });

    var seealso = [];
    var seen = {};
    while (seealso.length < 4) {
      var s = coinFrom(r);
      if (s === slug || seen[s]) continue;
      seen[s] = 1;
      seealso.push({ slug: s, label: titleCase(s), n: 'ENTRY ' + hex(cyrb128(s)).slice(0, 6).toUpperCase() });
    }

    var coord = '∮ ' + hex(cyrb128(slug)).slice(0, 4).toUpperCase() + '·' +
      hex(cyrb128(slug + '/')).slice(0, 4).toUpperCase();

    return {
      slug: slug, title: title, coord: coord, pos: pos, pron: pron,
      epigraph: epigraph, sections: sections, seealso: seealso
    };
  }

  function hex(n) { return (n >>> 0).toString(16); }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── rendering ────────────────────────────────────────────────────────────
  function seg2node(seg, onLink) {
    if (seg.t === 'text') return document.createTextNode(seg.s);
    var a = document.createElement('a');
    a.className = 'link'; a.textContent = seg.label;
    a.href = '#/' + encodeURIComponent(seg.slug);
    a.addEventListener('click', function (e) { e.preventDefault(); onLink(seg.slug); });
    return a;
  }
  function toDOM(e, onLink) {
    var frag = document.createDocumentFragment();
    var ec = el('div', 'ec', e.coord + '  ·  THE ENDLESS ENCYCLOPEDIA  ·  ENTRY IS FALSE');
    frag.appendChild(ec);
    frag.appendChild(el('h2', 'title', e.title));
    var pron = el('div', 'pron');
    pron.innerHTML = '<span class="pos">' + e.pos + '</span>';
    pron.appendChild(document.createTextNode(e.pron));
    frag.appendChild(pron);

    var epi = el('div', 'epi');
    epi.appendChild(document.createTextNode(e.epigraph.text));
    epi.appendChild(el('span', 'who', e.epigraph.who));
    frag.appendChild(epi);

    var body = el('section', 'body');
    e.sections.forEach(function (sec) {
      body.appendChild(el('h3', null, sec.heading));
      sec.paras.forEach(function (para) {
        var p = document.createElement('p');
        para.forEach(function (s) { p.appendChild(seg2node(s, onLink)); });
        body.appendChild(p);
      });
    });
    frag.appendChild(body);

    var sa = el('div', 'seealso');
    sa.appendChild(el('div', 'lbl', 'SEE ALSO — EACH IS A DOOR'));
    var grid = el('div', 'grid');
    e.seealso.forEach(function (s) {
      var a = document.createElement('a');
      a.href = '#/' + encodeURIComponent(s.slug);
      a.innerHTML = '<span class="n">' + s.n + '</span>';
      a.appendChild(document.createTextNode(s.label));
      a.addEventListener('click', function (ev) { ev.preventDefault(); onLink(s.slug); });
      grid.appendChild(a);
    });
    sa.appendChild(grid);
    frag.appendChild(sa);
    return frag;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  window.LVEndless = { coin: coin, entry: entry, toDOM: toDOM, slugify: slugify, titleCase: titleCase };
})();
