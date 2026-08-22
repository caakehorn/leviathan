// ╔══════════════════════════════════════════════════════════════════════╗
// ║  LEVIATHAN · THE TEMPLE — an oracle that answers in your own words.   ║
// ╚══════════════════════════════════════════════════════════════════════╝
//
// TempleOS shipped with an oracle. Terry Davis wired a hardware RNG to a
// dictionary, drew words out of it, and read what came back as God talking.
// The mechanism was trivial. The idea was not: a machine that speaks, whose
// vocabulary is fixed, whose selection you do not control, and whose output
// means whatever you are willing to see in it.
//
// This is that, with one substitution. The dictionary is 134,348 messages
// between two people across eleven years — the whole record, verbatim, the
// same corpus transcript.html renders in order. The oracle does not generate
// language. It cannot. Every word it returns was already written by someone,
// on a real date, about something real. It only chooses.
//
// ── HOW IT CHOOSES ──────────────────────────────────────────────────────
// The draw is seeded by the question, so it is deterministic: the same words
// asked twice return the same passages, forever. That is the whole difference
// between a divination and a shuffle. An oracle you can re-ask and get a new
// answer from is a slot machine. An oracle that says the same thing every
// time is making a claim.
//
// Everything else is downstream of that seed — which verses surface, the
// sigil drawn for the question, the pitch of the bell each verse rings on,
// the colour the field turns. One number, and the temple's whole response to
// you follows from it.
//
// ── WHAT IS ACTUALLY HERE ───────────────────────────────────────────────
//   · a WebGL field: kaleidoscopic domain-warped fbm, in the SLIME palette
//   · a seeded oracle over the full corpus, with three rites
//   · a Web Audio voice: drone + per-verse bells, pitched from the passage
//   · a sigil renderer: one unique glyph per question, from the same seed
//
// Nothing is fetched but the corpus. Nothing is sent anywhere. The whole
// thing runs in the tab.
(function () {
  if (window.LVTemple) return;

  var CORPUS = './data/transcript.json';

  // ── seeded randomness ──────────────────────────────────────────────────
  // cyrb128 for the string→seed step, mulberry32 for the stream. Both are
  // small, both are well-distributed, and neither is cryptographic — which is
  // correct here. The oracle must be reproducible, not unpredictable.
  function seedFrom(str) {
    var h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (var i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── the corpus ─────────────────────────────────────────────────────────
  var CORP = null;          // { m: [[ts, dir, text, flags], …] }
  var VOCAB = null;         // unique words, for the WORD rite

  function normaliseWord(w) {
    return w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
  }

  // The WORD rite needs a vocabulary. Walking all 134k messages to build one
  // costs about a second of blocked main thread, which would be felt — so it
  // is built from a strided sample instead. A stride rather than a slice, so
  // the vocabulary spans all eleven years rather than whichever end we cut.
  function buildVocab(m) {
    var seen = Object.create(null), out = [];
    var stride = Math.max(1, Math.floor(m.length / 24000));
    for (var i = 0; i < m.length; i += stride) {
      var txt = m[i] && m[i][2];
      if (!txt) continue;
      var parts = txt.split(/\s+/);
      for (var j = 0; j < parts.length; j++) {
        var w = normaliseWord(parts[j]);
        if (w.length < 3 || w.length > 18) continue;
        if (seen[w]) continue;
        seen[w] = 1;
        out.push(w);
      }
    }
    return out;
  }

  function load() {
    if (CORP) return Promise.resolve(CORP);
    return fetch(CORPUS, { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('the record is unreachable (HTTP ' + r.status + ')');
        return r.json();
      })
      .then(function (d) {
        CORP = d;
        VOCAB = buildVocab(d.m || []);
        return d;
      });
  }

  // ── the rites ──────────────────────────────────────────────────────────
  // Three ways to interrogate the same record.
  //
  //   VERSE   — whole messages, as they were sent. The plain reading.
  //   WORD    — single words, stripped of their sentences. Terry's rite,
  //             exactly: the dictionary is the corpus and nothing else.
  //   CHORUS  — one message and the three that followed it in real time,
  //             so the answer arrives as an exchange rather than a line.
  var RITES = ['VERSE', 'WORD', 'CHORUS'];

  function pick(m, rand) {
    // Rejection-sample past the empty and the trivially short. A one-character
    // reply is real data but a terrible oracle response, and there are enough
    // of them in eleven years of texting to matter.
    for (var tries = 0; tries < 64; tries++) {
      var i = Math.floor(rand() * m.length);
      var row = m[i];
      if (row && row[2] && row[2].trim().length > 12) return i;
    }
    return Math.floor(rand() * m.length);
  }

  function draw(question, rite) {
    var q = (question || '').trim();
    var seed = seedFrom(rite + '::' + q.toLowerCase());
    var rand = rng(seed);
    var m = CORP.m;
    var verses = [];

    if (rite === 'WORD') {
      // Six words, no context, no dates. The purest form of the rite and the
      // least defensible — which is the point of including it.
      var n = 6;
      for (var i = 0; i < n; i++) {
        verses.push({ word: VOCAB[Math.floor(rand() * VOCAB.length)] || '—' });
      }
    } else if (rite === 'CHORUS') {
      var start = pick(m, rand);
      for (var k = 0; k < 4 && start + k < m.length; k++) {
        var r = m[start + k];
        if (!r || !r[2]) continue;
        verses.push({ ts: r[0], who: r[1] ? 'DAN' : 'ANNIE', text: r[2], line: start + k + 1 });
      }
    } else {
      for (var v = 0; v < 3; v++) {
        var idx = pick(m, rand);
        var row = m[idx];
        verses.push({ ts: row[0], who: row[1] ? 'DAN' : 'ANNIE', text: row[2], line: idx + 1 });
      }
    }
    return { seed: seed, rite: rite, question: q, verses: verses };
  }

  // ── the sigil ──────────────────────────────────────────────────────────
  // One glyph per question, drawn from the same seed as the passages. It is
  // not decoration: it is the seed made visible, so two identical questions
  // are visibly the same question and two different ones visibly are not.
  function sigil(canvas, seed) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var rand = rng(seed);
    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
    var nodes = 5 + Math.floor(rand() * 5);
    var pts = [];
    for (var i = 0; i < nodes; i++) {
      var a = (i / nodes) * Math.PI * 2 - Math.PI / 2;
      var rr = R * (0.55 + rand() * 0.45);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }

    ctx.strokeStyle = 'rgba(57,255,20,0.85)';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 12;

    // Chords across the ring — the skip is seed-derived, so the interior
    // lattice differs per question rather than being the same star every time.
    var skip = 1 + Math.floor(rand() * (nodes - 1));
    ctx.beginPath();
    for (var j = 0; j <= nodes; j++) {
      var p = pts[(j * skip) % nodes];
      j === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(176,38,255,0.7)';
    ctx.shadowColor = '#b026ff';
    ctx.beginPath();
    ctx.arc(cx, cy, R * (0.9 + rand() * 0.25), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,47,157,0.75)';
    ctx.shadowColor = '#ff2f9d';
    for (var k = 0; k < nodes; k++) {
      ctx.beginPath();
      ctx.arc(pts[k][0], pts[k][1], 2 + rand() * 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // A bar across the centre, angled by the seed. Gives each sigil an
    // orientation the eye can latch onto.
    ctx.strokeStyle = 'rgba(0,183,255,0.6)';
    ctx.shadowColor = '#00b7ff';
    var ang = rand() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(ang) * R, cy - Math.sin(ang) * R);
    ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── the field ──────────────────────────────────────────────────────────
  // WebGL1 so it runs anywhere. A kaleidoscopic fold over domain-warped fbm,
  // pushed through the SLIME palette. uCharge rises while the oracle is being
  // consulted and uReveal pulses when a verse lands, so the visuals are
  // driven by the divination rather than running independently of it.
  var VERT = [
    'attribute vec2 p;',
    'void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform vec2  uRes;',
    'uniform float uTime;',
    'uniform float uCharge;',
    'uniform float uReveal;',
    'uniform vec2  uMouse;',
    'uniform float uFold;',

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),',
    '             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 6; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }',
    '  return v;',
    '}',

    // The four site colours, walked as a loop. Same stops the galaxy and the
    // void engine use, so the temple is unmistakably part of the same site.
    'vec3 slime(float t){',
    '  t = fract(t) * 4.0;',
    '  vec3 c0 = vec3(0.224, 1.0, 0.078);',
    '  vec3 c1 = vec3(0.0, 0.718, 1.0);',
    '  vec3 c2 = vec3(0.69, 0.149, 1.0);',
    '  vec3 c3 = vec3(1.0, 0.184, 0.616);',
    '  if (t < 1.0) return mix(c0, c1, t);',
    '  if (t < 2.0) return mix(c1, c2, t - 1.0);',
    '  if (t < 3.0) return mix(c2, c3, t - 2.0);',
    '  return mix(c3, c0, t - 3.0);',
    '}',

    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);',
    '  uv += uMouse * 0.16;',

    // Kaleidoscope: fold the plane into uFold wedges. The fold count is
    // seed-derived per question, so the geometry of the field is part of the
    // oracle's answer too.
    '  float a = atan(uv.y, uv.x);',
    '  float r = length(uv);',
    '  float seg = 6.28318 / uFold;',
    '  a = abs(mod(a + uTime * 0.03, seg) - seg * 0.5);',
    '  vec2 k = vec2(cos(a), sin(a)) * r;',

    // Tunnel coordinates — log(r) pulls the horizon to infinity and gives the
    // endless-approach feeling without any camera maths.
    '  vec2 tun = vec2(k.x / (r + 0.22), log(r + 0.12) - uTime * 0.09);',

    // Domain warp. Two fbm lookups, the second steered by the first.
    '  float w1 = fbm(tun * 2.4 + uTime * 0.07);',
    '  float w2 = fbm(tun * 3.1 + vec2(w1 * 1.9, -uTime * 0.05));',
    '  float f  = fbm(tun * 1.7 + vec2(w2 * 2.2, w1 * 1.4));',

    '  float charge = uCharge;',
    '  float bands = sin((f * 9.0 + r * 3.0 - uTime * 0.55) * (1.0 + charge * 2.2));',
    '  bands = smoothstep(-0.25, 0.85, bands);',

    '  vec3 col = slime(f * 0.7 + uTime * 0.02 + charge * 0.35);',
    '  col *= 0.35 + 0.95 * bands;',
    '  col += slime(w2 + 0.5) * pow(1.0 - min(r, 1.0), 2.6) * (0.35 + charge * 1.4);',

    // The verse strike: a ring that expands out of the centre on reveal.
    '  float ring = exp(-abs(r - uReveal * 1.5) * 7.0) * uReveal;',
    '  col += slime(uTime * 0.1 + 0.25) * ring * 1.7;',

    // Vignette down to the site's ink, so the field sits in the page instead
    // of fighting the panels on top of it.
    '  col *= 1.0 - 0.55 * pow(min(r * 0.62, 1.0), 2.0);',
    '  col = mix(vec3(0.016, 0.071, 0.024), col, 0.82 + charge * 0.18);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var gl = null, prog = null, U = {}, raf = 0;
  var state = { charge: 0, tCharge: 0, reveal: 0, mx: 0, my: 0, fold: 6, t0: 0 };

  function compile(g, type, src) {
    var s = g.createShader(type);
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      throw new Error('shader: ' + g.getShaderInfoLog(s));
    }
    return s;
  }

  function initField(canvas) {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false })
      || canvas.getContext('experimental-webgl', { antialias: false, alpha: false });
    if (!gl) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes','uTime','uCharge','uReveal','uMouse','uFold'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
    state.t0 = performance.now();
    return true;
  }

  function resize(canvas) {
    // Capped DPR: the shader is six octaves of fbm per pixel and a retina
    // fullscreen at native density is a real cost for no visible gain here.
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(canvas.clientWidth * dpr);
    var h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      if (gl) gl.viewport(0, 0, w, h);
    }
  }

  function frame(canvas) {
    raf = requestAnimationFrame(function () { frame(canvas); });
    if (!gl || document.hidden) return;
    resize(canvas);
    state.charge += (state.tCharge - state.charge) * 0.045;
    state.reveal *= 0.955;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, (performance.now() - state.t0) / 1000);
    gl.uniform1f(U.uCharge, state.charge);
    gl.uniform1f(U.uReveal, state.reveal);
    gl.uniform2f(U.uMouse, state.mx, state.my);
    gl.uniform1f(U.uFold, state.fold);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  window.LVTemple = {
    load: load,
    draw: draw,
    sigil: sigil,
    seedFrom: seedFrom,
    rng: rng,
    RITES: RITES,
    corpus: function () { return CORP; },
    vocab: function () { return VOCAB; },
    initField: initField,
    startField: function (canvas) { cancelAnimationFrame(raf); frame(canvas); },
    stopField: function () { cancelAnimationFrame(raf); },
    state: state,
    // strike() used to ring a bell as well; the visual pulse is what is left.
    strike: function () { state.reveal = 1; }
  };
})();
