// LEVIATHAN . THE QUIZ - between the terms and the curtain.
// Asks 2+2. The RIGHT answer is an EMPTY submit. Any text = the trap:
// a fake transcript.html that matches the real page's layout — grid rows
// with line numbers, timestamps, DAN/ANNIE labels, green/pink coloring,
// the slime drips, sticky search bar, legend, and footer note — all
// loading one row at a time over TRAP_MS. When done, fires the
// callback (which drops into the forever curtain).
(function () {
  if (window.LVQuiz) return;
  var TRAP_MS = 90000; // 90-second decoy loading time
  // CSS for the quiz and the decoy loading bar + transcript layout.
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
    '#lv-decoy .ldfill{height:100%;width:0%;background:#39ff14;box-shadow:0 0 10px rgba(57,255,20,0.8)}',
    // ── transcript row styles (mirror transcript.html exactly) ──
    '#lv-decoy .wrap{max-width:1120px;margin:0 auto;padding:0 20px 80px}',
    '#lv-decoy header{border-bottom:1px solid #14471f;padding:22px 0 14px}',
    '#lv-decoy h1{font-family:Space Grotesk,sans-serif;font-size:24px;letter-spacing:.12em;color:#39ff14;margin:0 0 6px;font-weight:700}',
    '#lv-decoy .sub{font-size:11.5px;letter-spacing:.14em;color:#8fae7c}',
    '#lv-decoy .bar{position:sticky;top:0;z-index:5;background:rgba(4,18,6,.96);border-bottom:1px solid #14471f;',
    'padding:10px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '#lv-decoy .bar input[type=search]{flex:1 1 280px;min-width:200px;background:#0a2410;border:1px solid #1c6b2e;color:#e9ffe6;',
    'font-family:inherit;font-size:13px;padding:8px 10px;border-radius:3px;outline:none}',
    '#lv-decoy .bar input[type=search]:focus{border-color:#b026ff}',
    '#lv-decoy .btn{background:#0a2410;border:1px solid #1c6b2e;color:#cfe6c4;font-family:inherit;font-size:11px;',
    'letter-spacing:.08em;padding:8px 10px;border-radius:3px}',
    '#lv-decoy .btn[aria-pressed=true]{border-color:#39ff14;color:#39ff14}',
    '#lv-decoy .count{font-size:11px;color:#6f8a5e;letter-spacing:.06em;white-space:nowrap}',
    '#lv-decoy .legend{display:flex;flex-wrap:wrap;gap:18px;align-items:center;padding:12px 0 2px;',
    "font-family:Space Grotesk,sans-serif;font-size:13px;color:#cfe6c4}",
    '#lv-decoy .legend b{font-family:IBM Plex Mono,monospace;font-size:12px;letter-spacing:.1em;',
    'padding:3px 8px;border-radius:3px;font-weight:600}',
    '#lv-decoy .key-dan{background:#0d3308;color:#39ff14;border:1px solid #39ff14}',
    '#lv-decoy .key-annie{background:#0b2f12;color:#ff86c9;border:1px solid #ff2f9d}',
    '#lv-decoy #doc{padding-top:10px}',
    '#lv-decoy .row{display:grid;grid-template-columns:58px 112px 78px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid #082310;',
    'content-visibility:auto;contain-intrinsic-size:auto 40px}',
    '#lv-decoy .ln{color:#2f6b45;font-size:11px;text-align:right;padding-top:3px;user-select:none;',
    'text-decoration:none;display:block}',
    '#lv-decoy .ts{color:#6f8a5e;font-size:11px;padding-top:3px;white-space:nowrap}',
    '#lv-decoy .who{font-size:12px;font-weight:600;letter-spacing:.09em;padding-top:2px;white-space:nowrap}',
    '#lv-decoy .row.dan .who{color:#39ff14}',
    '#lv-decoy .row.annie .who{color:#ff86c9}',
    '#lv-decoy .tx{font-family:Space Grotesk,sans-serif;font-size:15.5px;line-height:1.58;white-space:pre-wrap;',
    'overflow-wrap:anywhere;color:#e9ffe6}',
    '#lv-decoy .row.dan .tx{color:#e9ffe6}',
    '#lv-decoy .row.annie .tx{color:#ffe1f2}',
    '#lv-decoy .row.dan .tx{border-left:3px solid #39ff14;padding-left:11px}',
    '#lv-decoy .row.annie .tx{border-left:3px solid #ff2f9d;padding-left:11px}',
    '#lv-decoy .note{font-size:12.5px;line-height:1.6;font-family:Space Grotesk,sans-serif;color:#9db38f;',
    'padding:16px 0;max-width:80ch}'
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
  // ── the trap: a fake transcript.html that matches the real page ──
  // Builds the full transcript.html DOM structure — slime drips, header,
  // legend, sticky bar, grid rows — and fills it one row at a time over
  // TRAP_MS. Each row mirrors the real .row layout: line number, timestamp,
  // DAN/ANNIE label (green/pink), and message text. When done, the callback
  // drops into the forever curtain.
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

    var n = rows.length;
    var i = 0;
    var iv = setInterval(function () {
      var r = rows[i];
      var row = document.createElement('div');
      var isAnnie = r[1] === 1;
      row.className = 'row ' + (isAnnie ? 'annie' : 'dan');
      var ln = document.createElement('a');
      ln.className = 'ln';
      ln.href = '#L' + (i + 1);
      ln.title = 'link to this message';
      ln.textContent = i + 1;
      var ts = document.createElement('div');
      ts.className = 'ts';
      ts.textContent = r[0].slice(0, 16);
      var who = document.createElement('div');
      who.className = 'who';
      who.textContent = isAnnie ? 'ANNIE' : 'DAN';
      var tx = document.createElement('div');
      tx.className = 'tx';
      tx.textContent = r[2];
      row.appendChild(ln);
      row.appendChild(ts);
      row.appendChild(who);
      row.appendChild(tx);
      doc.appendChild(row);

      fill.style.width = ((i + 1) / n * 100).toFixed(1) + '%';
      i++;
      if (i >= n) {
        clearInterval(iv);
        fill.style.width = '100%';
        // Update metadata and footer to look real
        meta.textContent = n.toLocaleString() + ' MESSAGES  ·  2025-01-01 → 2026-07-26  ·  ' +
          Math.floor(n / 2).toLocaleString() + ' FROM DAN / ' + Math.ceil(n / 2).toLocaleString() + ' FROM ANNIE';
        countEl.textContent = n.toLocaleString() + ' messages';
        foot.textContent = 'This is a partial record retrieved for verification purposes — ' +
          'some messages may be redacted or unavailable. The full archive requires passphrase access.';
        setTimeout(done, 1500);
      }
    }, TRAP_MS / n);
  }
  // ── the ever-raining curtain ──
  // Same flash, same taunts, but with opts.forever = true.
  // The promise never resolves; the only exit is closing the tab.
  function curtainForever(resolve) {
    sOnce();
    var ov = document.getElementById('lv-quiz');
    if (ov) ov.remove();
    if (window.LVGate && typeof LVGate.punish === 'function') {
      LVGate.punish();
      if (resolve) resolve();
      return;
    }
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