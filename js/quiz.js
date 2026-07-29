// LEVIATHAN . THE QUIZ - between the terms and the curtain.
// Asks 2+2. The RIGHT answer is an EMPTY submit. Any text = the trap:
// a fake transcript.html that loads slow as hell, then a curtain that
// never opens. window.LVQuiz.run() resolves only on the empty submit.
(function () {
  if (window.LVQuiz) return;
  var TRAP_MS = 90000; // 90-second decoy loading time
  // CSS for the quiz and the decoy loading bar, shared with the trap.
  var _QS = [
    '#lv-quiz{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;',
    'justify-content:center;padding:24px;background:#041206;visibility:visible!important;',
    "font-family:'IBM Plex Mono',ui-monospace,monospace}",
    '#lv-quiz .bx{position:relative;z-index:1;width:min(520px,92vw);border:1px solid rgba(57,255,20,0.55);',
    'background:rgba(3,13,7,0.96);padding:34px 30px;box-shadow:0 0 90px rgba(57,255,20,0.22)}',
    '#lv-quiz .tag{font-size:11px;letter-spacing:0.3em;color:#39ff14;text-shadow:0 0 14px rgba(57,255,20,0.7)}',
    '#lv-quiz .say{margin:16px 0 22px;font-size:15px;line-height:1.75;color:#e9ffe6;',
    "font-family:'Space Grotesk',sans-serif;text-wrap:pretty}",
    '#lv-quiz input{width:100%;box-sizing:border-box;background:rgba(0,0,0,0.55);',
    'border:1px solid rgba(57,255,20,0.45);color:#b6ff8f;font-family:inherit;font-size:13px;',
    'padding:12px 13px;letter-spacing:0.05em;outline:none}',
    '#lv-quiz input:focus{border-color:#00b7ff;box-shadow:0 0 0 1px rgba(0,183,255,0.35)}',
    '#lv-quiz input[disabled]{opacity:0.5;cursor:default}',
    '#lv-quiz .err{min-height:16px;font-size:10px;letter-spacing:0.1em;color:#ff2f9d;margin:9px 2px 0}',
    '#lv-quiz button{width:100%;margin-top:10px;cursor:pointer;background:#39ff14;border:1px solid #39ff14;',
    'color:#041206;font-family:inherit;font-weight:700;font-size:11px;letter-spacing:0.22em;padding:13px}',
    '#lv-quiz button:hover{background:#b6ff8f}',
    '#lv-quiz button[disabled]{opacity:0.6;cursor:default}',
    '#lv-decoy{position:fixed;inset:0;z-index:2147483647;background:#041206;overflow:auto;visibility:visible!important}',
    '#lv-decoy .ldbar{position:fixed;top:0;left:0;right:0;height:26px;z-index:3;background:rgba(3,13,7,0.97);',
    'border-bottom:1px solid #14471f;display:flex;align-items:center;gap:10px;padding:0 12px;',
    "font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:0.2em;color:#39ff14}",
    '#lv-decoy .ldtrack{flex:1;height:6px;background:#0a2410;border:1px solid #1c6b2e}',
    '#lv-decoy .ldfill{height:100%;width:0%;background:#39ff14;box-shadow:0 0 10px rgba(57,255,20,0.8)}'
  ].join('');
  function sOnce() {
    if (document.getElementById('lv-quiz-style')) return;
    var s = document.createElement('style');
    s.id = 'lv-quiz-style';
    s.textContent = _QS;
    (document.head || document.documentElement).appendChild(s);
  }
  // Paint the "solve 2+2" input that looks exactly like the
  // encryption passphrase box. The RIGHT answer is submitting with
  // an empty input (no visible hint).
  function paintQuiz(cb) {
    sOnce();
    var ov = document.createElement('div');
    ov.id = 'lv-quiz';
    ov.innerHTML =
      '<div class="bx">' +
      '<div class="tag">⬢ LEVITY CHECK</div>' +
      '<div class="say">Please verify you are a human visitor.</div>' +
      '<input type="text" autocomplete="off" aria-label="Answer" placeholder="answer">' +
      '<div class="err" role="alert"></div>' +
      '<button type="button">SEND</button>' +
      '</div>';
    document.body.appendChild(ov);
    if (cb) cb();
  }
  // Wire input + clicks. Empty = pass through. Any text = trap.
  function wireQuiz(resolve) {
    var ov = document.getElementById('lv-quiz');
    if (!ov) return resolve();
    var input = ov.querySelector('input');
    var err = ov.querySelector('.err');
    var go = ov.querySelector('button');
    go.addEventListener('click', function () {
      var v = input.value;
      if (v && v.trim().length > 0) {
        go.disabled = true;
        go.textContent = 'LOADING…';
        err.textContent = '';
        input.disabled = true;
        LVQuiz.trap(function () { curtainForever(resolve); });
      } else {
        ov.remove();
        sOnce(); // keep styles for trap fallback
        resolve();
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go.click(); }
    });
    setTimeout(function () { input.focus(); }, 30);
  }
  // ── the trap: a fake transcript.html that loads very slowly ──
  // Shows transcript.html's chrome (header, bar, legend) but fills
  // the body with nonsense paragraphs one-by-one over TRAP_MS.
  // When done, fires the callback (which drops into the forever curtain).
  function trap(done) {
    sOnce();
    var existing = document.getElementById('lv-quiz');
    if (existing) existing.remove();
    var decoy = document.createElement('div');
    decoy.id = 'lv-decoy';
    decoy.innerHTML =
      '<div class="ldbar">' +
      '  <span>LIVE IMESSAGE VIEWER…</span>' +
      '  <div class="ldtrack"><div class="ldfill"></div></div>' +
      '</div>' +
      '<div class="wrap" style="padding-top:50px">' +
      '  <header><h1> REALTIME TEXT MONITOR</h1><div class="sub" id="meta"> CONNECTION TO NETWORK SERVER FROM SECURE SOURCE…</div></header>' +
      '  <div class="legend"><span><b class="key-dan">DAN</b> &nbsp;messages Dan sent</span><span><b class="key-annie">ANNIE</b> &nbsp;messages Annie sent</span></div>' +
      '  <div class="bar"><input type="search" disabled placeholder="search…"/><button class="btn" disabled>BOTH</button><span class="count">0 results</span></div>' +
      '  <div id="decoy-body"></div>' +
      '</div>';
    document.body.appendChild(decoy);
    var fill = decoy.querySelector('.ldfill');
    var body = decoy.querySelector('#decoy-body');
    var phrashes = [
      'hey you',
      'hiiii bb',
      'whatcha doin loser?',
      'im thinking about sommeething... ',
      'what? olive garden? lmao',
      'your big d',
      'you wanna come play? i stop watching this congressional testimony for you',
      'i cant - otto and alice are here',
      'what about later?.',
      'i will be in touch ',
      'do not refresh. it will break the current session.',
      'we have reason to believe the record was altered.',
      'the most recent fragment does not match the earlier ones.',
      'i have seen the transcript. i have a lot to say about it.',
      'this whole thing reminds me of something i used to say.',
      'the mirror is only a mirror. it does not know what it reflects.',
      'i keep coming back to the phrase that started it.',
      'the numbers add up on some level. not all levels.',
      'someone is watching the logs in real time i think.',
      'the system is functioning. nothing else i can tell you.'
    ];
    var n = phrashes.length;
    var i = 0;
    var iv = setInterval(function () {
      var p = document.createElement('p');
      p.style.cssText = 'font-family:Space Grotesk,sans-serif;font-size:14px;line-height:1.75;color:#cfe6c4;margin:0 0 12px;max-width:76ch;';
      p.textContent = phrashes[i % n];
      body.appendChild(p);
      fill.style.width = ((i + 1) / n * 100).toFixed(1) + '%';
      i++;
      if (i >= n) { clearInterval(iv); fill.style.width = '100%'; setTimeout(done, 1500); }
    }, TRAP_MS / n);
  }
  // ── the ever-raining curtain ──
  // Same flash, same taunts, but with opts.forever = true.
  // The promise never resolves; the only exit is closing the tab.
  function curtainForever(resolve) {
    sOnce();
    var ov = document.getElementById('lv-quiz');
    if (ov) ov.remove();
    var fd = { until: Date.now() + 30000, forever: true };
    // Reuse the trap logic: opts.forever makes flash() never resolve.
    // We call flash inside gate.js's scope, so we need to do it here
    // with a self-contained approach that doesn't gate.js internals.
    if (window.LVGate && typeof LVGate.punish === 'function') {
      // Use the same punishment but permanent
      LVGate.punish();
      if (resolve) resolve();
      return;
    }
    // Fallback without gate.js loaded yet
    if (resolve) resolve();
  }
  // ── public API ──
  window.LVQuiz = {
    run: function () {
      return new Promise(function (resolve) {
        if (!document.body) {
          document.addEventListener('DOMContentLoaded', function () { LVQuiz.run().then(resolve); }, { once: true });
          return;
        }
        paintQuiz(function () { wireQuiz(resolve); });
      });
    },
    trap: trap,
    FOREVER_MS: TRAP_MS
  };
})();
