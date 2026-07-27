// LEVIATHAN · THE GATE — two steps in front of the whole deployment.
//
//   1. THE CURTAIN. The flash screen is the first thing anyone sees, and it
//      does not time out. The only way past is a small button in the corner
//      at 7% opacity that comes up on hover or keyboard focus.
//   2. THE PASSPHRASE. Behind the curtain, the real lock.
//
// Both are re-served on every page load until a passphrase sticks; after that
// one unlock covers the tab.
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
    // ── the way through ──
    // Step one of two. It has to be findable by anyone who looks and invisible
    // to anyone who does not, so it sits in the bottom-right at 7% opacity and
    // comes up to full on hover or keyboard focus. It is a real <button>, so
    // Tab reaches it — a door nobody can find is not a door, it is a wall.
    // The glyph is a dot, but the hit area is a fat corner: 34px of padding
    // means sweeping the mouse into the bottom-right finds it without it ever
    // being visible enough to notice on arrival.
    '#lv-way{position:fixed;right:0;bottom:0;z-index:1;appearance:none;background:none;',
    'border:0;padding:30px 34px;cursor:pointer;font-family:\'IBM Plex Mono\',ui-monospace,monospace;',
    'font-size:12px;letter-spacing:0.3em;color:#39ff14;opacity:0.07;',
    'transition:opacity .18s ease,text-shadow .18s ease;mix-blend-mode:difference}',
    '#lv-way:hover,#lv-way:focus-visible{opacity:1;mix-blend-mode:normal;outline:none;',
    'text-shadow:0 0 14px rgba(57,255,20,0.95),0 0 40px rgba(57,255,20,0.6)}',
    '#lv-way .w{display:none}',
    '#lv-way:hover .w,#lv-way:focus-visible .w{display:inline}',
    '#lv-way:hover .d,#lv-way:focus-visible .d{display:none}',
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
    '#lv-taunt b{animation:none;color:#ff2f9d}}'
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
    'LMFAO SHE DONT LOVE YOU CUZ'
    // ← three more go here, one string per line, commas between
  ];
  var MSG_MS = 10000;                                // 10s a line
  var WAY_REST = '·';                                // the hidden way through, at rest
  var WAY_HOVER = 'ok fine ›';                       // …and once you have found it
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
    var close = function () { if (rot) clearInterval(rot); ov.remove(); };

    return new Promise(function (done) {
      if (opts.onWay) {
        // Step one of two. No countdown — this one waits as long as it takes.
        var way = document.createElement('button');
        way.id = 'lv-way';
        way.type = 'button';
        way.setAttribute('aria-label', 'Continue to the passphrase');
        way.innerHTML = '<span class="d"></span><span class="w"></span>';
        way.querySelector('.d').textContent = WAY_REST;
        way.querySelector('.w').textContent = WAY_HOVER;
        way.addEventListener('click', function () { close(); done(); });
        ov.appendChild(way);
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
        unlock();
      } catch (e) {
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

  // ── two steps, in order ─────────────────────────────────────────────────
  //   1. find the way through the curtain
  //   2. enter the passphrase
  // Both are re-served on every page load until a passphrase sticks. A
  // passphrase carried over from an earlier page in this tab still has to
  // clear the same decrypt — sessionStorage is not itself trusted — but it
  // does buy its way past the curtain, so one unlock covers the whole tab.
  async function boot() {
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
    greeting: GREETING,
    taunts: TAUNTS,
    decrypt: decrypt,
    // index.html's archive prompt serves the same sentence for a wrong
    // passphrase, so there is one punishment and one place that defines it.
    punish: function () { return flash({ until: Date.now() + LOCKOUT_MS }); },
    lockoutMs: LOCKOUT_MS
  };
})();
