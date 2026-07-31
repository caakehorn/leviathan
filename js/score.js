// ─────────────────────────────────────────────────────────────────────────────
// THE SCORE — generative music on every page.
//
// There are no audio files and no MIDI files in this repo. Nothing here is a
// transcription of anybody's song. Every note is composed at load time out of
// the same two things the rest of the site is built from: a seed, and a count.
//
// ── THE RULE, APPLIED TO SOUND ───────────────────────────────────────────────
// The piece is a day. It walks hour 0 through hour 23 and loops. How busy the
// music is at any moment is Annie's real message density for that hour, and
// how the notes sit in the register is the real mean length of her messages in
// that hour. Both tables below are counts over her 68,998 messages with none
// excluded — no smoothing, no curve fitting, no hour weighted because of what
// it would sound like. Hour 06 is nearly silent because she was asleep, and
// hour 20 is dense because she was awake. Nobody composed that part.
//
// ── DETERMINISM ──────────────────────────────────────────────────────────────
// The seed is the page's own path. A page's music is therefore always the same
// music — the same key, the same progression, the same notes in the same order,
// forever. compose() is a pure function of that seed, which is why the whole
// day can be written out as a .mid file that matches what you just heard.
//
// The synthesis (pads, bells, bass, air) is Web Audio. The export is real MIDI.
// The air voice is filtered noise and has no pitch, so it is the one thing that
// plays but does not appear in the exported file.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';
  if (window.LVScore) return;

  // ── the counts ─────────────────────────────────────────────────────────────
  // Regenerate both with:
  //   node -e "const d=JSON.parse(require('fs').readFileSync('data/transcript.json','utf8'));
  //   const n=new Array(24).fill(0),w=new Array(24).fill(0);
  //   for(const r of d.m){if(r[1]!==0)continue;const h=+r[0].slice(11,13);n[h]++;
  //   w[h]+=(r[2]||'').trim().split(/\s+/).filter(Boolean).length;}
  //   const mx=Math.max(...n);console.log(n.map(v=>+(v/mx).toFixed(4)));"
  // Hours are read out of the timestamp string by character offset, never
  // through Date(), so no listener's timezone can move a message to a
  // different hour than the one it was actually sent in.

  // Share of her messages sent in each hour, scaled so the busiest hour is 1.
  var DENSITY = [
    0.3937, 0.2569, 0.1912, 0.1184, 0.0716, 0.0482, 0.0299, 0.0325,
    0.1031, 0.2382, 0.3459, 0.5164, 0.5849, 0.6248, 0.7219, 0.7993,
    0.8126, 0.8434, 0.9055, 0.9181, 1.0000, 0.9897, 0.8234, 0.5039
  ];
  // Mean words per message in each hour, scaled so the wordiest hour is 1.
  // Her longest messages are at 07:00, her shortest around 04:00 and 19:00.
  var LENGTH = [
    0.7051, 0.7241, 0.7911, 0.7656, 0.5806, 0.5958, 0.7172, 1.0000,
    0.8565, 0.7853, 0.7290, 0.7042, 0.6499, 0.6576, 0.6927, 0.7152,
    0.7016, 0.6716, 0.6342, 0.6262, 0.6509, 0.7024, 0.7357, 0.6909
  ];

  // ── the profile ────────────────────────────────────────────────────────────
  // This is the only place taste enters. Tempo, mode and register are not
  // anybody's copyright — they are the parameters a piece is written under, and
  // setting them to match a listening history borrows nothing from it.
  // Override before this script loads:  window.LV_SCORE = { bpm: 84, ... }
  var P = {
    bpm: 68,          // beats per minute
    dayMinutes: 8,    // real minutes for one full 24-hour cycle
    modes: null,      // null = pick from the dark set by seed; or e.g. ['dorian']
    root: null,       // null = pick by seed; or 0-11 with 0 = C
    brightness: 0.5,  // 0 muffled … 1 open. Moves the pad's filter.
    density: 0.85,    // scales her curve. 1 = as counted.
    volume: 0.42,     // master, 0-1
    swing: 0.14       // 0 straight … 0.3 heavily swung eighths
  };
  if (window.LV_SCORE) for (var k in window.LV_SCORE) if (k in P) P[k] = window.LV_SCORE[k];

  // TASTE, WITHOUT COPYRIGHT.
  // The one place a listening history enters. None of these are anybody's song
  // — they are the parameters a piece is written under, and matching them to a
  // set of artists borrows their feel, not their notes. Set window.LV_SCORE in
  // a <script> before this file loads to retune the whole site's music. Some
  // starting points, so the mapping is concrete rather than a promise:
  //
  //   ambient / drone (GAS, Stars of the Lid, Grouper):
  //     { bpm: 52, dayMinutes: 14, brightness: .32, density: .55, swing: 0 }
  //   trip-hop / downtempo (Portishead, Massive Attack, Burial):
  //     { bpm: 84, modes: ['dorian','aeolian'], brightness: .5, swing: .22 }
  //   dark synth / coldwave (Boards of Canada, Trentemøller):
  //     { bpm: 100, modes: ['phrygian','harmonic'], brightness: .6, density: .95 }
  //   plainly pretty (Nils Frahm, Ólafur Arnalds):
  //     { bpm: 66, modes: ['dorian','mixolydian'], brightness: .7, swing: .1 }
  //
  // Give me the artists and I'll set the numbers; until then the defaults hold
  // and the mode is chosen per page by its seed.

  var SCALES = {
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11]
  };
  // Weighted toward the minor modes because the rest of the site is.
  var DARK = ['aeolian', 'aeolian', 'dorian', 'phrygian', 'harmonic', 'mixolydian'];
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // ── seeded randomness ──────────────────────────────────────────────────────
  // Not cryptographic on purpose. The requirement is reproducibility, not
  // unpredictability: the same path must always yield the same piece.
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

  // ── the composition ────────────────────────────────────────────────────────
  // Pure. Same seed in, same notes out, every time, in every browser.
  // Times are in beats from the top; durations likewise. Nothing here reads the
  // clock, the DOM, or Math.random.
  function compose(seedStr) {
    var seed = cyrb128(seedStr);
    var rnd = mulberry32(seed);

    var mode = P.modes ? P.modes[Math.floor(rnd() * P.modes.length)]
      : DARK[Math.floor(rnd() * DARK.length)];
    var scale = SCALES[mode];
    var root = P.root === null || P.root === undefined ? Math.floor(rnd() * 12) : P.root;

    var beatsPerBar = 4;
    var totalBeats = Math.round(P.dayMinutes * 60 * P.bpm / 60);
    var totalBars = Math.max(8, Math.floor(totalBeats / beatsPerBar));
    var beatsPerHour = totalBars * beatsPerBar / 24;

    // A four-chord cycle drawn once. Always resolves to the tonic so the loop
    // point is not a seam.
    var pool = [5, 3, 6, 4, 2, 1];
    var prog = [0];
    for (var i = 0; i < 3; i++) prog.push(pool[Math.floor(rnd() * pool.length)]);

    var notes = [];
    function triad(deg, oct) {
      var out = [];
      for (var j = 0; j < 3; j++) {
        var d = deg + j * 2;
        var pc = scale[d % 7] + 12 * Math.floor(d / 7);
        out.push(12 * oct + root + pc);
      }
      return out;
    }

    for (var bar = 0; bar < totalBars; bar++) {
      var t0 = bar * beatsPerBar;
      // Which of her hours this bar falls in. The bar is the atom, so a bar
      // never straddles two hours' worth of density.
      var hour = Math.min(23, Math.floor(t0 / beatsPerHour));
      var dens = DENSITY[hour] * P.density;
      var lng = LENGTH[hour];
      var deg = prog[bar % prog.length];

      // PAD — the chord, held for the bar. Voiced low, and one voice thinner
      // in her sparse hours so the small hours actually sound small.
      var ch = triad(deg, 3);
      var voices = dens < 0.12 ? 2 : 3;
      for (var v = 0; v < voices; v++) {
        notes.push({ t: t0, dur: beatsPerBar * 0.98, pitch: ch[v], vel: 42 + Math.round(26 * dens), voice: 'pad' });
      }

      // BASS — the root, once a bar, an octave under the pad.
      notes.push({ t: t0, dur: beatsPerBar * 0.9, pitch: ch[0] - 12, vel: 58, voice: 'bass' });

      // BELL — eighth notes, each one gated by her real density for this hour.
      // This is the voice you actually hear thin out overnight.
      for (var s = 0; s < beatsPerBar * 2; s++) {
        if (rnd() >= dens) continue;
        var swung = (s % 2) ? P.swing : 0;
        var deg2 = Math.floor(rnd() * 7);
        // Wordier hours sit lower and slower; terse hours ring higher.
        var oct = lng > 0.8 ? 4 : (rnd() < 0.42 ? 5 : 4);
        var pc2 = scale[deg2 % 7];
        notes.push({
          t: t0 + s * 0.5 + swung,
          dur: 0.45 + 1.4 * lng,
          pitch: 12 * oct + root + pc2,
          vel: 46 + Math.round(40 * rnd() * (0.4 + 0.6 * dens)),
          voice: 'bell'
        });
      }
    }
    notes.sort(function (a, b) { return a.t - b.t; });

    return {
      seed: seedStr, mode: mode, root: root, key: NOTE_NAMES[root] + ' ' + mode,
      bpm: P.bpm, beatsPerBar: beatsPerBar, totalBars: totalBars,
      totalBeats: totalBars * beatsPerBar, beatsPerHour: beatsPerHour,
      prog: prog, notes: notes
    };
  }

  // ── MIDI ───────────────────────────────────────────────────────────────────
  // A minimal format-1 writer: one tempo track, one track per voice. The notes
  // it writes are exactly the notes compose() produced, so the file is the
  // piece — not a re-performance of it.
  var TPQ = 480;
  function vlq(n) {
    var b = [n & 0x7f];
    n >>= 7;
    while (n > 0) { b.unshift((n & 0x7f) | 0x80); n >>= 7; }
    return b;
  }
  function str(s) { return s.split('').map(function (c) { return c.charCodeAt(0); }); }
  function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function u16(n) { return [(n >>> 8) & 255, n & 255]; }
  function chunk(id, body) { return str(id).concat(u32(body.length), body); }

  function toMidi(piece) {
    var VOICES = [
      { name: 'pad', prog: 89, ch: 0 },   // warm pad
      { name: 'bass', prog: 38, ch: 1 },  // synth bass
      { name: 'bell', prog: 11, ch: 2 }   // vibraphone
    ];

    // Track 0: tempo and names only.
    var uspq = Math.round(60000000 / piece.bpm);
    var head = [].concat(
      vlq(0), [0xff, 0x51, 0x03, (uspq >> 16) & 255, (uspq >> 8) & 255, uspq & 255],
      vlq(0), [0xff, 0x58, 0x04, piece.beatsPerBar, 2, 24, 8],
      vlq(0), [0xff, 0x03], vlq(('LEVIATHAN — ' + piece.seed).length), str('LEVIATHAN — ' + piece.seed),
      vlq(0), [0xff, 0x2f, 0x00]
    );
    var tracks = [chunk('MTrk', head)];

    VOICES.forEach(function (V) {
      var evs = [];
      piece.notes.forEach(function (n) {
        if (n.voice !== V.name) return;
        var on = Math.round(n.t * TPQ);
        var off = Math.round((n.t + n.dur) * TPQ);
        if (off <= on) off = on + 1;
        evs.push({ tick: on, d: [0x90 | V.ch, n.pitch & 127, n.vel & 127] });
        evs.push({ tick: off, d: [0x80 | V.ch, n.pitch & 127, 0] });
      });
      // Note-offs must land before note-ons at the same tick, or a repeated
      // pitch silences itself the instant it restarts.
      evs.sort(function (a, b) {
        return a.tick - b.tick || ((a.d[0] & 0xf0) === 0x80 ? -1 : 1) - ((b.d[0] & 0xf0) === 0x80 ? -1 : 1);
      });
      var body = [].concat(
        vlq(0), [0xff, 0x03], vlq(V.name.length), str(V.name),
        vlq(0), [0xc0 | V.ch, V.prog]
      );
      var last = 0;
      evs.forEach(function (e) { body = body.concat(vlq(e.tick - last), e.d); last = e.tick; });
      body = body.concat(vlq(0), [0xff, 0x2f, 0x00]);
      tracks.push(chunk('MTrk', body));
    });

    var out = str('MThd').concat(u32(6), u16(1), u16(tracks.length), u16(TPQ));
    tracks.forEach(function (t) { out = out.concat(t); });
    return new Uint8Array(out);
  }

  // ── synthesis ──────────────────────────────────────────────────────────────
  var AC = null, master = null, wet = null, air = null, airFilt = null;
  var piece = null, playing = false, startedAt = 0, cursor = 0, timer = null;
  var LOOK = 0.35;   // schedule this far ahead, in seconds
  var TICK = 60;     // and wake up this often, in ms

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function spb() { return 60 / piece.bpm; }

  // A procedural impulse response. Exponentially decaying noise is a crude
  // reverb and a perfectly good one, and it means no asset to download.
  function makeIR(ctx, secs, decay) {
    var n = Math.floor(ctx.sampleRate * secs);
    var buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  function build() {
    if (AC) return AC;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    AC = new Ctx();

    master = AC.createGain();
    master.gain.value = 0;
    master.connect(AC.destination);

    var conv = AC.createConvolver();
    conv.buffer = makeIR(AC, 3.4, 2.6);
    wet = AC.createGain();
    wet.gain.value = 0.34;
    conv.connect(wet); wet.connect(master);
    wet.input = conv;

    // AIR — looping noise through a bandpass. No pitch, so it is the one voice
    // that does not survive into the MIDI export.
    var n = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    var d = n.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = AC.createBufferSource();
    src.buffer = n; src.loop = true;
    airFilt = AC.createBiquadFilter();
    airFilt.type = 'bandpass'; airFilt.frequency.value = 700; airFilt.Q.value = 1.1;
    air = AC.createGain(); air.gain.value = 0;
    src.connect(airFilt); airFilt.connect(air); air.connect(master); air.connect(conv);
    src.start();

    return AC;
  }

  function send(node, dry) {
    node.connect(master);
    if (wet && wet.input) {
      var g = AC.createGain();
      g.gain.value = dry === undefined ? 0.5 : dry;
      node.connect(g); g.connect(wet.input);
    }
  }

  function playPad(n, at) {
    var f = mtof(n.pitch), dur = n.dur * spb();
    var filt = AC.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320 + 2400 * P.brightness * (0.35 + 0.65 * (n.vel / 68));
    filt.Q.value = 3;
    var g = AC.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.0001 + n.vel / 127 * 0.06, at + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    filt.connect(g); send(g, 0.7);
    [0, 0.18, -0.15].forEach(function (det) {
      var o = AC.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f; o.detune.value = det * 100;
      o.connect(filt); o.start(at); o.stop(at + dur + 0.05);
    });
  }

  function playBass(n, at) {
    var dur = n.dur * spb();
    var o = AC.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(n.pitch);
    var g = AC.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(n.vel / 127 * 0.16, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); send(g, 0.16);
    o.start(at); o.stop(at + dur + 0.05);
  }

  function playBell(n, at) {
    var f = mtof(n.pitch), dur = n.dur * spb();
    // Three inharmonic partials. Enough to read as a struck object rather than
    // a sine beep, without a full FM stack.
    [[1, 0.5, 1], [2.76, 0.22, 0.6], [5.41, 0.09, 0.35]].forEach(function (p) {
      var o = AC.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * p[0];
      var g = AC.createGain();
      var amp = n.vel / 127 * 0.13 * p[1];
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(amp, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur * p[2] + 0.2);
      o.connect(g); send(g, 0.85);
      o.start(at); o.stop(at + dur * p[2] + 0.3);
    });
  }

  // Which of her hours the piece is currently in. Scheduling starts a moment
  // before startedAt, so this goes briefly negative on the first tick — the
  // modulo is taken twice to keep it in range rather than indexing off the
  // front of DENSITY and handing a NaN to the audio graph.
  function hourNow() {
    if (!piece || !AC) return 0;
    var tb = piece.totalBeats;
    var beats = (((AC.currentTime - startedAt) / spb()) % tb + tb) % tb;
    var h = Math.floor(beats / piece.beatsPerHour);
    return h < 0 ? 0 : (h > 23 ? 23 : h);
  }

  function schedule() {
    if (!playing || !AC) return;
    try { tick(); } catch (e) { stop(); }   // one bad frame must not wedge the loop
  }

  function tick() {
    var horizon = AC.currentTime + LOOK;
    var loop = piece.totalBeats * spb();

    while (true) {
      if (cursor >= piece.notes.length) {  // wrap to the top of the day
        cursor = 0;
        startedAt += loop;
      }
      var n = piece.notes[cursor];
      var at = startedAt + n.t * spb();
      if (at > horizon) break;
      if (at >= AC.currentTime - 0.05) {
        if (n.voice === 'pad') playPad(n, at);
        else if (n.voice === 'bass') playBass(n, at);
        else playBell(n, at);
      }
      cursor++;
    }

    // The air voice tracks her density directly, which is why the room itself
    // gets quieter overnight and not just the notes in it.
    var h = hourNow();
    air.gain.setTargetAtTime(0.006 + 0.02 * DENSITY[h], AC.currentTime, 1.5);
    airFilt.frequency.setTargetAtTime(420 + 1500 * DENSITY[h], AC.currentTime, 2);
    paint(h);
  }

  function begin() {
    if (playing) return;
    playing = true;
    startedAt = AC.currentTime + 0.12;
    cursor = 0;
    master.gain.setTargetAtTime(P.volume, AC.currentTime, 1.4);
    timer = setInterval(schedule, TICK);
    schedule();
  }

  // Create and resume the context from *inside* a user gesture, before any
  // await spends the activation. The gate calls this the instant a passphrase
  // is submitted, so by the time the page unlocks the context is already
  // running and the music can start with no second click. Silent on its own —
  // master stays at zero until begin().
  function prewarm() {
    if (!build()) return;
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) { } }
  }

  // Never schedule into a suspended context — the nodes would be built and then
  // discarded, and Chrome logs an autoplay warning for every one of them.
  function start() {
    if (!build()) return false;
    if (!piece) piece = compose(seedFor());
    if (AC.state === 'running') { begin(); return true; }
    AC.resume().then(function () {
      if (on() && AC.state === 'running') begin();
    }, function () { /* still blocked; the gesture handler will retry */ });
    armGesture();
    return false;
  }

  function stop() {
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (master && AC) master.gain.setTargetAtTime(0, AC.currentTime, 0.5);
  }

  // The path is the seed, so every page has its own permanent piece. Query
  // strings and fragments are stripped — /voice.html#x is the same room.
  function seedFor() {
    var p = location.pathname.replace(/\/+$/, '/');
    if (/\/$/.test(p)) p += 'index.html';
    return p;
  }

  // ── the transport ──────────────────────────────────────────────────────────
  var el = null, readout = null, btn = null;
  var CSS = [
    '#lv-score{position:fixed;left:34px;bottom:14px;z-index:9998;display:flex;align-items:center;',
    'gap:9px;padding:7px 11px;border:1px solid rgba(57,255,20,.34);background:rgba(3,13,7,.86);',
    "backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);font-family:'IBM Plex Mono',ui-monospace,monospace;",
    'font-size:9px;letter-spacing:.18em;color:#4f8a63;transition:border-color .2s,color .2s}',
    '#lv-score:hover{border-color:rgba(57,255,20,.8);color:#b6ff8f}',
    '#lv-score button{all:unset;cursor:pointer;color:#39ff14;font:inherit;letter-spacing:.18em;',
    'text-shadow:0 0 10px rgba(57,255,20,.7)}',
    '#lv-score button:focus-visible{outline:1px solid #39ff14;outline-offset:3px}',
    '#lv-score .rd{color:#00b7ff;min-width:44px}',
    '#lv-score .dl{color:#ff2f9d;opacity:.75}',
    '#lv-score .dl:hover{opacity:1}',
    '#lv-score.off{border-color:rgba(80,80,80,.3);color:#3a4a3e}',
    '#lv-score.off button{color:#6f8a5e;text-shadow:none}',
    '@media(max-width:640px){#lv-score{left:28px;bottom:10px;font-size:8px;padding:5px 8px}}',
    '@media(prefers-reduced-motion:reduce){#lv-score{transition:none}}'
  ].join('');

  function paint(h) {
    if (!readout) return;
    var lbl = (h < 10 ? '0' + h : h) + ':00';
    if (readout.textContent !== lbl) readout.textContent = lbl;
  }

  function ui() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);

    el = document.createElement('div');
    el.id = 'lv-score';
    el.setAttribute('aria-label', 'Generative score');
    btn = document.createElement('button');
    btn.type = 'button';
    readout = document.createElement('span');
    readout.className = 'rd';
    readout.textContent = '--:--';
    var dl = document.createElement('button');
    dl.type = 'button';
    dl.className = 'dl';
    dl.textContent = '.MID';
    dl.title = 'Download this page’s piece as a MIDI file';
    dl.addEventListener('click', download);

    el.appendChild(btn);
    el.appendChild(readout);
    el.appendChild(dl);
    document.body.appendChild(el);

    btn.addEventListener('click', function () { on() ? setOn(false) : setOn(true); });
    setOn(on(), true);
  }

  function on() { try { return localStorage.getItem('lv.score') !== 'off'; } catch (e) { return true; } }
  function setOn(v, quiet) {
    try { localStorage.setItem('lv.score', v ? 'on' : 'off'); } catch (e) { }
    if (el) el.classList.toggle('off', !v);
    if (btn) {
      btn.textContent = v ? '■ SCORE' : '▶ SCORE';
      btn.setAttribute('aria-pressed', v ? 'true' : 'false');
    }
    if (v) { if (!quiet || !start()) armGesture(); }
    else { stop(); if (readout) readout.textContent = '--:--'; }
  }

  // Autoplay policy: a context created without a gesture starts suspended.
  // Arriving through the gate always involves a gesture, but a cached session
  // can land straight on the page, so wait for the first one either way.
  var armed = false;
  function armGesture() {
    if (armed) return;
    armed = true;
    var go = function () {
      armed = false;
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) {
        window.removeEventListener(e, go, true);
      });
      if (on()) start();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) {
      window.addEventListener(e, go, true);
    });
  }

  function download() {
    if (!piece) piece = compose(seedFor());
    var blob = new Blob([toMidi(piece)], { type: 'audio/midi' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leviathan' + seedFor().replace(/[\/.]/g, '-') + '.mid';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  // Drop the level when the tab is hidden rather than stopping — coming back to
  // a piece mid-phrase is the point of it being a day rather than a track.
  document.addEventListener('visibilitychange', function () {
    if (!AC || !playing) return;
    master.gain.setTargetAtTime(document.hidden ? 0.02 : P.volume, AC.currentTime, 0.6);
  });

  // Exported before the UI is built. compose() and toMidi() are pure and always
  // work; if audio is unavailable or a frame throws, the piece is still
  // inspectable and still downloadable.
  window.LVScore = {
    compose: compose, toMidi: toMidi, download: download,
    prewarm: prewarm, start: start, stop: stop, setOn: setOn, isOn: on,
    piece: function () { return piece || (piece = compose(seedFor())); },
    hour: hourNow, profile: P, DENSITY: DENSITY, LENGTH: LENGTH, seed: seedFor
  };

  // The transport must not paint over the gate. If the page is still sealed,
  // hold it until unlock — at which point the context the gate pre-warmed is
  // already running, so start() begins immediately with no extra gesture.
  function mount() {
    if (document.getElementById('lv-score')) return;
    try { ui(); } catch (e) { /* no transport; the page is unaffected */ }
  }
  function gated() {
    return document.documentElement.classList.contains('lv-locked')
      || !!document.getElementById('lv-gate');
  }
  function init() {
    if (gated()) window.addEventListener('lv-unlocked', mount, { once: true });
    else mount();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
