// LEVIATHAN · THE QUIZ — between the terms and the curtain.
// Empty submit passes. Any text enters the decoy, then a chained archive maze.
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

  function wireQuiz(resolve, onEvent) {
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
        if (onEvent) onEvent('quiz-trapped');
        LVQuiz.trap(resolve);
      } else {
        if (onEvent) onEvent('quiz-passed');
        ov.remove();
        resolve();
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go.click(); }
    });
    setTimeout(function () { input.focus(); }, 30);
  }

  function copyTranscriptShell(decoy, parsed) {
    Array.prototype.forEach.call(parsed.head.querySelectorAll('link,style'), function (node) {
      var copy = document.importNode(node, true);
      if (copy.tagName === 'LINK' && copy.rel !== 'stylesheet' && !copy.href.includes('fonts.googleapis.com')) return;
      document.head.appendChild(copy);
    });

    var body = parsed.body.cloneNode(true);
    Array.prototype.forEach.call(body.querySelectorAll('script'), function (node) { node.remove(); });
    decoy.innerHTML = '';
    while (body.firstChild) decoy.appendChild(body.firstChild);
  }

  function makeRow(m, index) {
    var row = document.createElement('div');
    row.className = 'row ' + (m[1] ? 'tx-sent' : 'rx') + (m[3] & 1 ? ' att' : '') + (m[3] & 2 ? ' tap' : '');
    row.id = 'L' + (index + 1);

    var ln = document.createElement('a');
    ln.className = 'ln';
    ln.href = '#L' + (index + 1);
    ln.title = 'link to this message';
    ln.textContent = String(index + 1);

    var ts = document.createElement('div');
    ts.className = 'ts';
    ts.textContent = String(m[0] == null ? '' : m[0]).slice(0, 16);

    var who = document.createElement('div');
    who.className = 'who';
    who.textContent = m[1] ? 'DAN' : 'ANNIE';

    var tx = document.createElement('div');
    tx.className = 'tx';
    tx.textContent = String(m[2] == null ? '' : m[2]);

    row.appendChild(ln);
    row.appendChild(ts);
    row.appendChild(who);
    row.appendChild(tx);
    return row;
  }

  function renderSlowTranscript(decoy, data) {
    var doc = decoy.querySelector('#doc');
    var meta = decoy.querySelector('#meta');
    var foot = decoy.querySelector('#foot');
    var more = decoy.querySelector('#more');
    if (!doc) throw new Error('transcript shell missing #doc');

    var messages = Array.isArray(data.m) ? data.m : [];
    var sent = 0;
    for (var i = 0; i < messages.length; i++) if (messages[i][1]) sent++;
    if (meta) {
      meta.textContent = messages.length.toLocaleString() + ' MESSAGES  ·  ' +
        String(data.first || '').slice(0, 10) + ' → ' + String(data.last || '').slice(0, 10) +
        '  ·  ' + sent.toLocaleString() + ' FROM DAN / ' + (messages.length - sent).toLocaleString() + ' FROM ANNIE';
    }
    if (more) more.hidden = true;

    var index = 0;
    var fill = document.createElement('div');
    fill.className = 'ldbar';
    fill.innerHTML = '<span>ARCHIVE RECOVERY</span><div class="ldtrack"><div class="ldfill"></div></div>';
    decoy.appendChild(fill);
    var bar = fill.querySelector('.ldfill');

    function addNext() {
      if (index >= messages.length) {
        fill.remove();
        if (foot) foot.textContent = 'This is the message history between Dan and Annie, in the order it was sent — nothing removed and nothing edited.';
        return;
      }
      doc.appendChild(makeRow(messages[index], index));
      index++;
      bar.style.width = ((index / Math.max(messages.length, 1)) * 100) + '%';
      setTimeout(addNext, FAKE_ROW_DELAY);
    }

    addNext();
  }

  function trap(done) {
    sOnce();
    var existing = document.getElementById('lv-quiz');
    if (existing) existing.remove();

    var decoy = document.createElement('div');
    decoy.id = 'lv-decoy';
    document.body.appendChild(decoy);

    // Copy the real transcript's HTML/CSS shell, but render its data locally.
    // This avoids brittle string surgery against transcript.html's JavaScript.
    fetch('./transcript.html', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (source) {
      var parsed = new DOMParser().parseFromString(source, 'text/html');
      copyTranscriptShell(decoy, parsed);
      return fetch('./data/transcript.json', { cache: 'no-store' });
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' while loading transcript data');
      return r.json();
    }).then(function (data) {
      renderSlowTranscript(decoy, data);
      setTimeout(function () { location.href = './transcript2.html'; }, TRAP_MS);
    }).catch(function (e) {
      decoy.innerHTML = '<div style="padding:40px;font:14px/1.7 IBM Plex Mono,monospace;color:#e9ffe6">TRANSCRIPT INDEX ERROR — ' + String(e.message).replace(/[&<>]/g, '') + '</div>';
      setTimeout(function () { location.href = './transcript2.html'; }, TRAP_MS);
    });
  }

  window.LVQuiz = {
    run: function (onEvent) {
      return new Promise(function (resolve) {
        if (window.LVGate && typeof LVGate.passphrase === 'function' && LVGate.passphrase()) {
          resolve();
          return;
        }
        if (!document.body) {
          document.addEventListener('DOMContentLoaded', function () { LVQuiz.run(onEvent).then(resolve); }, { once: true });
          return;
        }
        paintQuiz(function () { wireQuiz(resolve, onEvent); });
      });
    },
    trap: trap,
    FOREVER_MS: TRAP_MS
  };
})();
