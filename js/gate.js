// LEVIATHAN · THE GATE — four steps in front of the whole deployment.
//
//   0. THE TERMS. js/tos.js, loaded on demand. Nothing renders until agreed.
//   1. THE QUIZ. js/quiz.js, loaded on demand. Empty submit passes; anything
//      else is funnelled into the decoy maze instead of the real curtain.
//   2. THE CURTAIN. The flash screen. It does not time out — type SKIP_CODE
//      and hit Enter to cut it short, or wait WAIT_MS and it opens itself.
//   3. THE PASSPHRASE. Behind the curtain, the only one of the four that is
//      an actual lock.
//
// All four are re-served on every page load until a passphrase sticks; after
// that one unlock covers the tab.
//
// Same protocol the archive bundle has always used: PBKDF2-SHA256 (250k
// iterations) over the passphrase, AES-256-GCM for the payload. A wrong
// passphrase makes GCM authentication fail and throw, which is the check —
// there is no stored hash to compare against and nothing to leak.
//
// ── WHAT THIS DOES AND DOES NOT DO ────────────────────────────────────────
// It gates the *rendering* of every page. It does not encrypt the pages, and
// while data/transcript.json, data/wiki-data.json and js/*-data.js ship as
// plaintext, anyone who types their URL directly still gets them, gate or no
// gate. Real protection needs those payloads encrypted at rest, which needs
// the passphrase at build time — see tools/encrypt.py and the README.
// Until then this is a lock on the front door of a building with windows.
// ──────────────────────────────────────────────────────────────────────────
//
// Load it FIRST in <head>, before anything else. It hides the document
// synchronously, so nothing behind the gate paints even for a frame.
(function () {
  if (window.LVGate) return;

  var VERIFY = './data/verify.enc';   // small, written by tools/encrypt.py
  var BUNDLE = './data/leviathan.enc'; // fallback: the archive bundle itself
  var SKEY = 'lv.gate.pw';
  var LKEY = 'lv.gate.until';         // lockout deadline, survives a reload
  var LOCKOUT_MS = 30000;

  // ── hide the document before first paint ────────────────────────────────
  // A <style> in <head> beats setting inline styles on documentElement: it
  // applies to <body> the moment the parser reaches it, and one class removal
  // reverses the whole thing.
  var hide = document.createElement('style');
  hide.setAttribute('data-lv-gate', '');
  hide.textContent = 'html.lv-locked body { visibility: hidden !important; }'
    + 'html.lv-locked { background: #041206 !important; }';
  (document.head || document.documentElement).appendChild(hide);
  document.documentElement.classList.add('lv-locked');

  var pw = null;
  try { pw = sessionStorage.getItem(SKEY); } catch (e) { /* private mode */ }

  // ── counting ────────────────────────────────────────────────────────────
  // GoatCounter, loaded once here so every page that includes gate.js — which
  // is every page — gets both the ordinary pageview and the gate's own funnel,
  // without a second script tag anywhere else. It is the analytics equivalent
  // of the passphrase gate itself: this file is the one thing every page
  // already trusts to run first.
  //
  // GoatCounter is async, and the very first events (tos-shown, most of all)
  // fire the instant the page loads — before there has been time for a
  // network round trip, let alone the script executing. A guard that just
  // no-ops until the script is ready would systematically undercount exactly
  // the events that matter most, so unready calls queue instead and drain
  // once the script's onload fires. If the script never loads (blocked,
  // offline), the queue just sits there — counting is never allowed to block
  // or slow down the door.
  var qq = [];
  function tally(name) {
    try {
      var ev = { path: 'gate/' + name, title: 'gate: ' + name, event: true };
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(ev);
      else qq.push(ev);
    } catch (e) { /* counting is never allowed to affect the gate */ }
  }
  (function loadCounter() {
    if (document.querySelector('script[data-goatcounter]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = '//gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://danfrank.goatcounter.com/count');
    s.onload = function () {
      try {
        while (qq.length && window.goatcounter && window.goatcounter.count) {
          window.goatcounter.count(qq.shift());
        }
      } catch (e) { /* ditto */ }
    };
    (document.head || document.documentElement).appendChild(s);
  })();

  // ── re-locking ──────────────────────────────────────────────────────────
  // An unlock lasts as long as the tab, which is what makes the site usable —
  // but it also means the owner cannot see their own front door again without
  // opening a new tab. #lock (or ?lock) throws the bolt: it drops the stored
  // passphrase, strips itself out of the URL so a reload does not re-lock on
  // every refresh, and hands over to the curtain. LVGate.lock() does the same
  // thing from the console.
  function forget() {
    pw = null;
    try { sessionStorage.removeItem(SKEY); sessionStorage.removeItem(LKEY); } catch (e) {}
  }
  function wantsLock() { return /(^|[?&#])lock\b/.test(location.search + location.hash); }

  // Typing #lock into the address bar of a page that is already open is a
  // fragment navigation — the document never reloads, so nothing above would
  // ever run again. Catch it and reload by hand, or the escape hatch only
  // works from a cold URL.
  window.addEventListener('hashchange', function () {
    if (wantsLock()) { forget(); location.reload(); }
  });

  if (wantsLock()) {
    forget();
    // Strip only the lock token — index.html's #void and #archive deep links
    // have to survive being combined with it.
    try {
      var q = location.search.replace(/([?&])lock\b&?/, '$1').replace(/[?&]$/, '');
      var h = location.hash.replace(/([#&])lock\b&?/, '$1').replace(/[#&]$/, '');
      history.replaceState(null, '', location.pathname + q + h);
    } catch (e) { /* file:// and the like */ }
  }

  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  // Decrypt a blob in this project's format. Throws on a wrong passphrase.
  async function decrypt(blob, phrase) {
    var base = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(blob.salt), iterations: blob.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(blob.iv) }, key, b64(blob.ct));
    return new TextDecoder().decode(pt);
  }

  // The verifier is whatever small blob exists; the 8 MB archive bundle is the
  // fallback so the gate still works before tools/encrypt.py has ever run.
  var challenge = null;
  async function getChallenge() {
    if (challenge) return challenge;
    var res = await fetch(VERIFY, { cache: 'force-cache' });
    if (!res.ok) res = await fetch(BUNDLE, { cache: 'force-cache' });
    if (!res.ok) throw new Error('no challenge blob to check against');
    challenge = await res.json();
    return challenge;
  }

  async function tryPassphrase(phrase) {
    await decrypt(await getChallenge(), phrase); // throws if wrong
    pw = phrase;
    try { sessionStorage.setItem(SKEY, phrase); } catch (e) { /* private mode */ }
    return true;
  }

  function unlock() {
    document.documentElement.classList.remove('lv-locked');
    var ov = document.getElementById('lv-gate');
    if (ov) ov.remove();
    window.dispatchEvent(new CustomEvent('lv-unlocked'));
  }

  // ── the gate itself ─────────────────────────────────────────────────────
  var CSS = [
    '#lv-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;',
    'justify-content:center;padding:24px;background:#041206;',
    "font-family:'IBM Plex Mono',ui-monospace,monospace;visibility:visible!important}",
    '#lv-gate::before{content:"";position:absolute;inset:0;pointer-events:none;background:',
    'radial-gradient(ellipse 70% 55% at 22% 20%,rgba(57,255,20,0.20),transparent 66%),',
    'radial-gradient(ellipse 55% 45% at 82% 76%,rgba(255,47,157,0.14),transparent 62%),',
    'radial-gradient(ellipse 50% 42% at 70% 14%,rgba(176,38,255,0.14),transparent 64%),',
    'radial-gradient(ellipse 45% 38% at 10% 84%,rgba(0,183,255,0.12),transparent 62%)}',
    '#lv-gate::after{content:"";position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;',
    'background:repeating-linear-gradient(0deg,rgba(0,7,2,0.22) 0px,rgba(0,7,2,0.22) 1px,rgba(57,255,20,0.035) 1px,transparent 3px)}',
    '#lv-gate .bx{position:relative;z-index:1;width:min(520px,92vw);border:1px solid rgba(57,255,20,0.55);',
    'background:rgba(3,13,7,0.96);padding:34px 30px;box-shadow:0 0 90px rgba(57,255,20,0.22)}',
    '#lv-gate .tag{font-size:11px;letter-spacing:0.3em;color:#39ff14;text-shadow:0 0 14px rgba(57,255,20,0.7)}',
    '#lv-gate .say{margin:16px 0 22px;font-size:15px;line-height:1.75;color:#e9ffe6;',
    "font-family:'Space Grotesk',sans-serif;text-wrap:pretty}",
    '#lv-gate input{width:100%;box-sizing:border-box;background:rgba(0,0,0,0.55);',
    'border:1px solid rgba(57,255,20,0.45);color:#b6ff8f;font-family:inherit;font-size:13px;',
    'padding:12px 13px;letter-spacing:0.05em;outline:none}',
    '#lv-gate input:focus{border-color:#00b7ff;box-shadow:0 0 0 1px rgba(0,183,255,0.35)}',
    '#lv-gate .err{min-height:16px;font-size:10px;letter-spacing:0.1em;color:#ff2f9d;margin:9px 2px 0}',
    '#lv-gate button{width:100%;margin-top:10px;cursor:pointer;background:#39ff14;border:1px solid #39ff14;',
    'color:#041206;font-family:inherit;font-weight:700;font-size:11px;letter-spacing:0.22em;padding:13px}',
    '#lv-gate button:hover{background:#b6ff8f}',
    '#lv-gate button[disabled]{opacity:0.6;cursor:default}',
    '#lv-gate .ft{margin-top:16px;font-size:9px;letter-spacing:0.18em;color:#4f8a63;line-height:1.9}',
    // ── the taunt: 30 seconds of the whole viewport, for a wrong passphrase ──
    // Doubles as the rate limit. It is stored as a deadline rather than a
    // timer, so reloading the page does not skip the wait.
    '#lv-taunt{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;text-align:center;padding:3vmin;gap:3vmin;',
    'background:#000;overflow:hidden;visibility:visible!important;',
    "font-family:'Unbounded','Space Grotesk',system-ui,sans-serif;",
    'animation:lvTauntBg .34s steps(1) infinite}',
    '#lv-taunt b{display:block;font-weight:900;line-height:0.92;letter-spacing:-0.01em;',
    'font-size:clamp(42px,12.5vw,230px);color:#ff2f9d;text-transform:uppercase;',
    'overflow-wrap:anywhere;text-shadow:0 0 30px #ff2f9d,0 0 90px rgba(255,47,157,0.8);',
    'animation:lvTauntTxt .34s steps(1) infinite}',
    '#lv-taunt .cd{font-family:\'IBM Plex Mono\',ui-monospace,monospace;font-size:clamp(10px,1.5vw,15px);',
    'letter-spacing:0.34em;color:#39ff14;text-shadow:0 0 16px rgba(57,255,20,0.9)}',
    // The echo line: empty until someone starts typing the code, so the screen
    // gives nothing away to anyone who does not already know there is one.
    '#lv-taunt .cd.bad{color:#ff2f9d;text-shadow:0 0 16px rgba(255,47,157,0.9)}',
    // 0.34s per on-off cycle is ~2.9 flashes/second, just under the 3 Hz
    // general-flash threshold in WCAG 2.3.1 — the same line index.html's
    // enterflash comment draws. Fast enough to be unbearable, slow enough not
    // to be a seizure risk.
    '@keyframes lvTauntBg{0%{background:#000}50%{background:#ff2f9d}}',
    '@keyframes lvTauntTxt{0%{color:#ff2f9d;transform:scale(1)}50%{color:#000;transform:scale(1.04)}}',
    // Same contract as every other animation on this site: the OS setting wins.
    // The taunt still takes the whole page for the whole 30 seconds — it just
    // stops strobing.
    '@media (prefers-reduced-motion:reduce){',
    '#lv-taunt{animation:none;background:#0a0002}',
    '#lv-taunt b{animation:none;color:#ff2f9d}}',
    '#lv-decoy{position:fixed;inset:0;z-index:2147483647;background:#041206;overflow:auto;visibility:visible!important}',
    '#lv-decoy .ldbar{position:fixed;top:0;left:0;right:0;height:26px;z-index:3;background:rgba(3,13,7,0.97);',
    'border-bottom:1px solid #14471f;display:flex;align-items:center;gap:10px;padding:0 12px;',
    "font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:0.2em;color:#39ff14}",
    '#lv-decoy .ldtrack{flex:1;height:6px;background:#0a2410;border:1px solid #1c6b2e}',
    '#lv-decoy .ldfill{height:100%;width:0%;background:#39ff14;box-shadow:0 0 10px rgba(57,255,20,0.8)}'
  ].join('');

  // ── the copy ────────────────────────────────────────────────────────────
  // The house style for turning someone away, all of it in one place so it is
  // edited here and nowhere else.
  //
  // TAUNTS cycles on the curtain and through the punishment, one line every
  // MSG_MS. Add or remove lines freely — the rotation reads the array's
  // length, and a single line simply never changes. Keep them short: this is
  // set at up to 230px and has to survive a phone in portrait.
  var TAUNTS = [
    'LMFAO SHE DONT LOVE YOU CUZ',
    'BYE BYE BOZO',
    'HEY DON’T FEEL BAD! YOU TRIED! :)',
    'AWWW HES MAD. SO SCAWY IM SCAWWED',
    'SHE AINT WANT YR LIL BABYDICK ANYMORE'
  ];
  var MSG_MS = 3000; // change every 3s

  // Step one of two. Type the code and hit Enter to cut the curtain short;
  // anyone who does not know it sits through the whole WAIT_MS and is let
  // through anyway. Nothing on screen advertises either — the code is for
  // people who were told it, and the wait is for everyone else.
  var SKIP_CODE = '420666';
  var WAIT_MS = 60000;                               // a full minute, then it opens itself
  var GREETING = "oh look, it's this fucking weirdo again. hey yo she ain't want your unhinged violent tendencies or little babydick anymore. get fucked go away. ";

  // ── lockout ─────────────────────────────────────────────────────────────
  function lockedUntil() {
    try { return parseInt(sessionStorage.getItem(LKEY), 10) || 0; } catch (e) { return 0; }
  }
  function setLockout(until) {
    try { until ? sessionStorage.setItem(LKEY, String(until)) : sessionStorage.removeItem(LKEY); }
    catch (e) { /* private mode: the in-memory timer still runs */ }
  }

  // ── the flash screen ────────────────────────────────────────────────────
  // One screen, two jobs. As the CURTAIN it is the first thing anyone sees and
  // it stays until the hidden way through is clicked; as the PUNISHMENT it
  // holds for thirty seconds with a countdown and no way out. Same markup,
  // same flash, so the site says exactly one thing to anyone it does not know.
  //
  //   flash({ onWay: fn })   -> curtain: waits for the click
  //   flash({ until: ms })   -> punishment: resolves when the clock runs out
  function flash(opts) {
    styleOnce();
    if (opts.until) setLockout(opts.until);
    tally(opts.onWay ? 'curtain-shown' : opts.forever ? 'trap-shown' : 'punish-shown');

    var ov = document.getElementById('lv-taunt');
    if (ov) ov.remove();          // never stack two of these
    ov = document.createElement('div');
    ov.id = 'lv-taunt';
    ov.setAttribute('role', 'alert');
    ov.innerHTML = '<b></b><div class="cd"></div>';
    document.body.appendChild(ov);
    var cd = ov.querySelector('.cd');

    // The rotation. textContent, never innerHTML: these are copy, not markup.
    // One line is not a rotation, so the interval is only armed for two or
    // more — otherwise it would tick forever repainting the same string.
    var line = ov.querySelector('b'), at = 0, rot = 0;
    line.textContent = TAUNTS[0] || '';
    if (TAUNTS.length > 1) {
      rot = setInterval(function () {
        at = (at + 1) % TAUNTS.length;
        line.textContent = TAUNTS[at];
      }, MSG_MS);
    }

    // ── the trap curtain: permanent, no skip, no timeout ──────────────────
    // Used by the quiz's wrong-answer pathway. It shows the curtain the same
    // as ever but never opens — not on a code, not after a wait. The only way
    // out is closing the tab. The promise is intentionally left dangling.
    if (opts.forever) {
      return new Promise(function () {});
    }

    var timers = [];
    var onKey = null;
    var close = function () {
      if (rot) clearInterval(rot);
      timers.forEach(clearTimeout);
      if (onKey) window.removeEventListener('keydown', onKey, true);
      ov.remove();
    };

    return new Promise(function (done) {
      if (opts.onWay) {
        // ── step one of two ──
        // Type SKIP_CODE and hit Enter to cut it short. Do nothing and it lets
        // you through after WAIT_MS anyway. There is no field and no prompt:
        // keystrokes are read straight off the window, and the echo line stays
        // empty until the first digit, so the screen never advertises that a
        // code exists. Anyone on a phone, or anyone who was never told, simply
        // waits — which is the whole point of the minute.
        var buf = '';
        var pass = function (how) { tally('curtain-' + how); close(); done(); };
        timers.push(setTimeout(function () { pass('waited'); }, WAIT_MS));

        onKey = function (e) {
          if (e.metaKey || e.ctrlKey || e.altKey) return;   // leave shortcuts alone
          if (e.key === 'Enter') {
            e.preventDefault();
            if (buf === SKIP_CODE) { pass('code'); return; }
            buf = '';
            tally('curtain-badcode');
            cd.textContent = '✕';
            cd.className = 'cd bad';
            timers.push(setTimeout(function () { cd.textContent = ''; cd.className = 'cd'; }, 900));
            return;
          }
          if (e.key === 'Backspace') { e.preventDefault(); buf = buf.slice(0, -1); }
          else if (e.key === 'Escape') { buf = ''; }
          else if (e.key.length === 1 && /\S/.test(e.key)) {
            // Cap the buffer so a cat on the keyboard cannot grow it forever.
            buf = (buf + e.key).slice(-SKIP_CODE.length * 2);
          } else return;
          cd.className = 'cd';
          cd.textContent = buf;
        };
        window.addEventListener('keydown', onKey, true);
        return;
      }
      var tick = function () {
        var left = opts.until - Date.now();
        if (left <= 0) {
          clearInterval(iv);
          close();
          setLockout(0);
          done();
          return;
        }
        cd.textContent = 'TRY AGAIN IN ' + Math.ceil(left / 1000) + 'S';
      };
      var iv = setInterval(tick, 200);
      tick();
    });
  }

  var styled = false;
  function styleOnce() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function paintGate() {
    styleOnce();
    tally('passphrase-shown');

    var ov = document.createElement('div');
    ov.id = 'lv-gate';
    ov.innerHTML = '<div class="bx">'
      + '<div class="tag">⬢ LEVIATHAN · SEALED</div>'
      + '<div class="say"></div>'
      + '<input type="password" autocomplete="off" aria-label="Passphrase" placeholder="passphrase">'
      + '<div class="err" role="alert"></div>'
      + '<button type="button">UNSEAL ►</button>'
      + '<div class="ft">IF UR READING THIS UR GAY · AWWWW HE IS ANGRY HOW ADORABLE · GO PUNCH A WALL OR SOMETHING <br>'
      + 'ENJOY MY WEBSITE, BUCKO. I MADE IT FOR YOU.</div>'
      + '</div>';
    // textContent, not innerHTML: the greeting is copy, never markup.
    ov.querySelector('.say').textContent = GREETING;
    document.body.appendChild(ov);

    var input = ov.querySelector('input');
    var err = ov.querySelector('.err');
    var go = ov.querySelector('button');

    var submit = async function () {
      var v = input.value;
      if (!v || go.disabled) return;
      err.textContent = ''; go.disabled = true; go.textContent = 'CHECKING…';
      try {
        await tryPassphrase(v);
        tally('passphrase-ok');
        unlock();
      } catch (e) {
        tally('passphrase-fail');
        input.value = '';
        await flash({ until: Date.now() + LOCKOUT_MS });
        err.textContent = '✕ WRONG PASSPHRASE — ACCESS DENIED';
        go.disabled = false; go.textContent = 'UNSEAL ►';
        input.focus();
      }
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

    // A lockout carried over from a reload is served before anything is typed.
    if (lockedUntil() > Date.now()) {
      go.disabled = true; go.textContent = 'CHECKING…';
      flash({ until: lockedUntil() }).then(function () {
        go.disabled = false; go.textContent = 'UNSEAL ►';
        input.focus();
      });
      return;
    }
    setTimeout(function () { input.focus(); }, 30);
  }

  // ── step zero: the terms ────────────────────────────────────────────────
  // Nothing — not even the curtain — renders until the Terms of Service have
  // been accepted. js/tos.js owns the document and the dialog; here it is
  // loaded on demand so pages only have to include gate.js. Acceptance is in
  // localStorage, so a returning device resolves instantly; declining never
  // resolves, which is the whole point.
  function loadTerms() {
    if (window.LVTerms) return Promise.resolve();
    return new Promise(function (ok, bad) {
      var s = document.createElement('script');
      s.src = './js/tos.js';
      s.onload = function () { ok(); };
      s.onerror = function () { bad(new Error('js/tos.js failed to load')); };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  async function requireTerms() {
    try {
      await loadTerms();
      if (!window.LVTerms.accepted()) tally('tos-shown');
      await window.LVTerms.require(tally);   // tos.js calls tally('tos-agreed'/'tos-declined')
    } catch (e) {
      // tos.js missing or unloadable (file:// quirks, partial deploy): the
      // terms cannot be presented, so fail open to the gate rather than
      // bricking the whole site behind a 404.
    }
  }
  function loadQuiz() {
    if (window.LVQuiz) return Promise.resolve();
    return new Promise(function (ok, bad) {
      var s = document.createElement('script');
      s.src = './js/quiz.js';
      s.onload = function () { ok(); };
      s.onerror = function () { bad(new Error('js/quiz.js failed to load')); };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  async function requireQuiz() {
    try {
      await loadQuiz();
      tally('quiz-shown');
      await window.LVQuiz.run(tally);   // quiz.js calls tally('quiz-passed'/'quiz-trapped')
    } catch (e) {
      // quiz.js missing or unloadable: fail open to the curtain.
    }
  }

  // ── four steps, in order ──────────────────────────────────────
  //   0. accept the terms
  //   1. pass the quiz (empty submit = correct, any text = trap)
  //   2. find the way through the curtain
  //   3. enter the passphrase
  async function boot() {
    await requireTerms();
    await requireQuiz();
    if (pw) {
      try { await tryPassphrase(pw); unlock(); return; }
      catch (e) { pw = null; try { sessionStorage.removeItem(SKEY); } catch (e2) {} }
    }
    // A lockout outlives the curtain: someone who guessed wrong and reloaded
    // serves the rest of the sentence before they are offered the way through.
    if (lockedUntil() > Date.now()) await flash({ until: lockedUntil() });
    await flash({ onWay: true });
    paintGate();
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);

  // index.html's archive reads this so the console does not ask a second time
  // for a passphrase the visitor has already cleared at the door.
  window.LVGate = {
    passphrase: function () { return pw; },
    locked: function () { return !pw; },
    // Throw the bolt again without opening a new tab. Same thing #lock does.
    lock: function () { forget(); location.reload(); },
    greeting: GREETING,
    taunts: TAUNTS,
    decrypt: decrypt,
    // index.html's archive prompt serves the same sentence for a wrong
    // passphrase, so there is one punishment and one place that defines it.
    punish: function () { return flash({ until: Date.now() + LOCKOUT_MS }); },
    lockoutMs: LOCKOUT_MS
  };
})();
