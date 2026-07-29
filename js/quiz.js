// LEVIATHAN · THE QUIZ — between the terms and the curtain.
// Empty submit passes. Any text enters the decoy, then a terminal curtain.
(function () {
  if (window.LVQuiz) return;

  var TRAP_MS = 90000;
  var FAKE_ROW_DELAY = 6500;
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
    '#lv-trap{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;text-align:center;padding:3vmin;gap:3vmin;',
    'background:#000;overflow:hidden;visibility:visible!important;',
    "font-family:'Unbounded','Space Grotesk',system-ui,sans-serif;animation:lvQuizTrapBg .34s steps(1) infinite}",
    '#lv-trap b{display:block;font-weight:900;line-height:.92;letter-spacing:-.01em;',
    'font-size:clamp(42px,12.5vw,230px);color:#ff2f9d;text-transform:uppercase;',
    'overflow-wrap:anywhere;text-shadow:0 0 30px #ff2f9d,0 0 90px rgba(255,47,157,.8);',
    'animation:lvQuizTrapTxt .34s steps(1) infinite}',
    '#lv-trap .cd{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:clamp(10px,1.5vw,15px);',
    'letter-spacing:.34em;color:#39ff14;text-shadow:0 0 16px rgba(57,255,20,.9)}',
    '@keyframes lvQuizTrapBg{0%{background:#000}50%{background:#ff2f9d}}',
    '@keyframes lvQuizTrapTxt{0%{color:#ff2f9d;transform:scale(1)}50%{color:#000;transform:scale(1.04)}}',
    '@media (prefers-reduced-motion:reduce){#lv-trap{animation:none;background:#0a0002}#lv-trap b{animation:none;color:#ff2f9d}}'
  ].join('');

  function sOnce() {
    if (document.getElementById('lv-quiz-style')) return;
    var s = document.createElement('style');
    s.id = 'lv-quiz-style';
    s.textContent = _QS;
    (document.head || document.documentElement).appendChild(s);
  }

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
        LVQuiz.trap(function () { curtainForever(); });
      } else {
        ov.remove();
        resolve();
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go.click(); }
    });
    setTimeout(function () { input.focus(); }, 30);
  }

  function trap(done) {
    sOnce();
    var existing = document.getElementById('lv-quiz');
    if (existing) existing.remove();

    var decoy = document.createElement('div');
    decoy.id = 'lv-decoy';
    document.body.appendChild(decoy);

    // Clone the real transcript's presentation instead of maintaining a
    // second hand-written imitation. This keeps the decoy visually in lockstep
    // with transcript.html as the real page evolves.
    fetch('./transcript.html', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (source) {
      var parsed = new DOMParser().parseFromString(source, 'text/html');

      // Copy the real transcript's fonts and styles, but deliberately omit
      // gate.js and the real page's data/render script.
      Array.prototype.forEach.call(parsed.head.querySelectorAll('link,style'), function (node) {
        var copy = document.importNode(node, true);
        if (copy.tagName === 'LINK' && copy.rel !== 'stylesheet' && !copy.href.includes('fonts.googleapis.com')) return;
        document.head.appendChild(copy);
      });

      Array.prototype.forEach.call(parsed.body.childNodes, function (node) {
        if (node.nodeType === 1 && node.tagName === 'SCRIPT') return;
        decoy.appendChild(document.importNode(node, true));
      });

      var doc = decoy.querySelector('#doc');
      var more = decoy.querySelector('#more');
      if (!doc) throw new Error('transcript shell missing #doc');

      // Use the exact transcript renderer/data, but slow its initial reveal.
      var original = Array.prototype.find.call(parsed.querySelectorAll('script'), function (s) {
        return s.textContent.indexOf('var CHUNK=1500;') !== -1;
      });
      if (!original) throw new Error('transcript renderer missing');

      var code = original.textContent;
      code = code.replace('var CHUNK=1500;', 'var CHUNK=1;');
      code = code.replace(
        'function render(reset){\n    if(reset){DOC.textContent=\'\';built=0;rows=[];}\n    grow();\n  }',
        'var slowTimer;\n  function slowFill(){\n    clearTimeout(slowTimer);\n    if(built>=M.length) return;\n    slowTimer=setTimeout(function(){grow();slowFill();},FAKE_ROW_DELAY);\n  }\n\n  function render(reset){\n    if(reset){DOC.textContent=\'\';built=0;rows=[];clearTimeout(slowTimer);}\n    grow();\n    slowFill();\n  }'
      );
      code = code.replace(
        "fetch('data/transcript.json').then(function(r){",
        "fetch('data/transcript.json', {cache:'no-store'}).then(function(r){"
      );

      // The cloned page is visually the real transcript. The only deliberate
      // behavioral difference is that rows arrive one at a time, every 6.5s.
      // Keep the fake's finite window so the terminal curtain remains reachable.
      var script = document.createElement('script');
      script.textContent = '(function(){var FAKE_ROW_DELAY=' + FAKE_ROW_DELAY + ';' + code.replace(/^\(function\(\)\{/, '') + '})();';
      decoy.appendChild(script);

      setTimeout(done, TRAP_MS);
    }).catch(function (e) {
      decoy.innerHTML = '<div style="padding:40px;font:14px/1.7 IBM Plex Mono,monospace;color:#e9ffe6">TRANSCRIPT INDEX ERROR — ' + String(e.message).replace(/[&<>]/g, '') + '</div>';
      setTimeout(done, TRAP_MS);
    });
  }

  // Terminal punishment: deliberately never resolves. This must not call
  // LVGate.punish(), whose 30-second promise resolves and lets boot continue.
  function curtainForever() {
    sOnce();
    var old = document.getElementById('lv-decoy');
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'lv-trap';
    ov.innerHTML = '<b></b><div class="cd">ACCESS DENIED</div>';
    document.body.appendChild(ov);
    var line = ov.querySelector('b');
    var cd = ov.querySelector('.cd');
    var taunts = (window.LVGate && LVGate.taunts) || ['ACCESS DENIED'];
    var i = 0;
    line.textContent = taunts[0] || '';
    if (taunts.length > 1) {
      setInterval(function () {
        i = (i + 1) % taunts.length;
        line.textContent = taunts[i];
      }, 3000);
    }
    cd.textContent = 'ACCESS DENIED · CLOSE THIS TAB';
    // No escape hatch by design.
  }

  window.LVQuiz = {
    run: function () {
      return new Promise(function (resolve) {
        // gate.js invokes the quiz before its passphrase check. If this tab
        // already holds a valid session passphrase, do not make the user solve
        // the quiz again on every page navigation.
        if (window.LVGate && typeof LVGate.passphrase === 'function' && LVGate.passphrase()) {
          resolve();
          return;
        }
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
