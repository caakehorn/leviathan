// ─────────────────────────────────────────────────────────────────────────────
// THE SINGULARITY GATE — three checks, in this order, on purpose.
//
//   1. CONSENT   the visitor is told their IP address will be recorded, and
//                agrees to it.
//   2. NAME      they type a name. The name and the IP are LOGGED HERE — before
//                the passphrase is ever shown.
//   3. PASSPHRASE the same passphrase as the Temple side. Pass and the content
//                opens; fail and it does not.
//
// The ordering is the design: identification completes before the visitor learns
// whether they have access, so a failed passphrase attempt is still a logged
// attempt. There is no step that retracts a completed log.
//
// ── WHAT THIS HONESTLY IS ────────────────────────────────────────────────────
// GitHub Pages is static hosting: there is no server here to write a log file.
// So the log is shipped to the site's own analytics (GoatCounter) as an event,
// and the IP is read from a public echo service because a static page cannot see
// its own visitor's address. That means: (a) the IP is obtained from a third
// party, api.ipify.org, which the consent text names; (b) if analytics or the
// echo service is blocked, the attempt is recorded with whatever is available —
// the gate never fails open, but the log can be incomplete. Anything stronger
// needs a real backend.
//
// The name field is free text. It is whatever the visitor chooses to type and is
// not verified against anything.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  if (window.LVSinGate) return;

  var VERIFY = './data/verify.enc';
  var BUNDLE = './data/leviathan.enc';
  var SKEY = 'lv.sin.pw';        // session: passphrase that worked
  var CKEY = 'lv.sin.consent';   // local: consent given
  var NKEY = 'lv.sin.name';      // local: the name they gave

  // ── hide the document before first paint ─────────────────────────────────
  var hide = document.createElement('style');
  hide.textContent = 'html.lv-sealed body{visibility:hidden!important}'
    + 'html.lv-sealed{background:#03040a!important}';
  (document.head || document.documentElement).appendChild(hide);
  document.documentElement.classList.add('lv-sealed');

  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  // Same format, same passphrase as the Temple gate. A wrong passphrase fails
  // GCM authentication and throws — that failure IS the check.
  async function decrypt(blob, phrase) {
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(blob.salt), iterations: blob.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(blob.iv) }, key, b64(blob.ct)));
  }
  var challenge = null;
  async function getChallenge() {
    if (challenge) return challenge;
    var res = await fetch(VERIFY, { cache: 'force-cache' });
    if (!res.ok) res = await fetch(BUNDLE, { cache: 'force-cache' });
    if (!res.ok) throw new Error('no challenge blob');
    challenge = await res.json();
    return challenge;
  }

  // ── the log ────────────────────────────────────────────────────────────────
  // Fired at step 2 and awaited before step 3 is painted, so the record is
  // written while the visitor still does not know whether the passphrase will
  // work. Never rejects: a blocked analytics script or echo service must not
  // become a way to reach the content without being logged.
  function ip() {
    return new Promise(function (done) {
      var settled = false;
      var finish = function (v) { if (!settled) { settled = true; done(v); } };
      setTimeout(function () { finish('(timeout)'); }, 4000);
      fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) { finish(j && j.ip ? j.ip : '(none)'); })
        .catch(function () { finish('(blocked)'); });
    });
  }
  // The sink. Nothing on a static host can write a log, so the record goes to
  // the site's own GoatCounter as an event. Loaded here rather than assumed:
  // without this the whole feature is silently a no-op.
  var sink = null;
  function loadCounter() {
    if (sink) return sink;
    sink = new Promise(function (done) {
      if (window.goatcounter && window.goatcounter.count) return done(true);
      var existing = document.querySelector('script[data-goatcounter]');
      var s = existing || document.createElement('script');
      var settled = false;
      var finish = function (ok) { if (!settled) { settled = true; done(ok); } };
      setTimeout(function () { finish(false); }, 5000);
      s.addEventListener('load', function () { finish(true); });
      s.addEventListener('error', function () { finish(false); });
      if (!existing) {
        s.async = true;
        s.src = '//gc.zgo.at/count.js';
        s.setAttribute('data-goatcounter', 'https://danfrank.goatcounter.com/count');
        (document.head || document.documentElement).appendChild(s);
      }
    });
    return sink;
  }
  function record(name, addr) {
    var line = name + ' @ ' + addr;
    try {
      var ev = { path: 'sin-entry/' + encodeURIComponent(name).slice(0, 60), title: 'ENTRY ' + line, event: true };
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(ev);
    } catch (e) { /* logging must never block the gate */ }
    try { localStorage.setItem('lv.sin.last', line + ' | ' + new Date().toISOString()); } catch (e) { }
  }
  // Both the address and the sink are awaited, so by the time this resolves the
  // record has actually been sent — not merely queued behind a script that may
  // never arrive. Step 3 is not painted until it does.
  async function logAttempt(name) {
    var pair = await Promise.all([ip(), loadCounter()]);
    record(name, pair[0]);
    return pair[0];
  }
  loadCounter();   // start fetching the sink during step 1

  // ── chrome ─────────────────────────────────────────────────────────────────
  var CSS = [
    '#lv-sin{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;',
    "padding:24px;background:#03040a;font-family:'IBM Plex Mono',ui-monospace,monospace;visibility:visible!important}",
    '#lv-sin::before{content:"";position:absolute;inset:0;pointer-events:none;background:',
    'radial-gradient(ellipse 60% 50% at 50% 40%,rgba(176,38,255,0.16),transparent 68%),',
    'radial-gradient(ellipse 50% 40% at 20% 80%,rgba(0,183,255,0.10),transparent 64%)}',
    '#lv-sin .bx{position:relative;z-index:1;width:min(540px,94vw);border:1px solid rgba(176,38,255,0.45);',
    'background:rgba(6,8,16,0.96);padding:34px 30px;box-shadow:0 0 90px rgba(176,38,255,0.2)}',
    '#lv-sin .step{font-size:9px;letter-spacing:.4em;color:#cf9dff}',
    "#lv-sin h2{margin:14px 0 0;font-family:'Luckiest Guy',cursive;font-weight: 400;font-size:clamp(22px,5vw,38px);",
    'line-height:.98;color:#fff;letter-spacing:-.02em}',
    "#lv-sin .say{margin:16px 0 0;font-family:'Nunito',sans-serif;font-size:14px;line-height:1.8;",
    'color:#b9add0;text-wrap:pretty}',
    '#lv-sin .terms{margin:18px 0 0;border:1px solid rgba(176,38,255,.24);background:rgba(0,0,0,.4);',
    'padding:14px 16px;font-size:10.5px;letter-spacing:.04em;line-height:1.95;color:#8f96b2}',
    '#lv-sin .terms b{color:#cf9dff}',
    '#lv-sin input{width:100%;box-sizing:border-box;margin-top:18px;background:rgba(0,0,0,.55);',
    'border:1px solid rgba(176,38,255,.5);color:#fff;padding:13px 14px;font:inherit;font-size:14px;letter-spacing:.04em}',
    '#lv-sin input:focus{outline:none;border-color:#00b7ff;box-shadow:0 0 0 1px rgba(0,183,255,.35)}',
    '#lv-sin .err{min-height:16px;font-size:10px;letter-spacing:.1em;color:#ff2f9d;margin:9px 2px 0}',
    '#lv-sin button{width:100%;margin-top:10px;cursor:pointer;background:#cf9dff;border:1px solid #cf9dff;',
    'color:#03040a;padding:14px;font:inherit;font-size:11px;letter-spacing:.24em;font-weight:700}',
    '#lv-sin button:hover{background:#fff;border-color:#fff}',
    '#lv-sin button[disabled]{opacity:.6;cursor:default}',
    '#lv-sin .ft{margin-top:18px;font-size:8.5px;letter-spacing:.14em;line-height:1.9;color:#55607a}',
    '#lv-sin a.out{display:block;margin-top:14px;font-size:9.5px;letter-spacing:.2em;color:#5a6b60;text-decoration:none;text-align:center}',
    '#lv-sin a.out:hover{color:#b6ff8f}'
  ].join('');
  function styleOnce() {
    if (document.getElementById('lv-sin-css')) return;
    var s = document.createElement('style');
    s.id = 'lv-sin-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  var ov;
  function shell(step, title) {
    styleOnce();
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'lv-sin';
      ov.innerHTML = '<div class="bx"></div>';
      (document.body || document.documentElement).appendChild(ov);
    }
    var bx = ov.querySelector('.bx');
    bx.innerHTML = '<div class="step">' + step + '</div><h2>' + title + '</h2>';
    return bx;
  }

  // ── step 1 · consent ───────────────────────────────────────────────────────
  function askConsent() {
    return new Promise(function (done) {
      try { if (localStorage.getItem(CKEY) === '1') return done(); } catch (e) { }
      var bx = shell('CHECK 1 OF 3 · CONSENT', 'YOU ARE BEING RECORDED');
      var p = document.createElement('div');
      p.className = 'say';
      p.textContent = 'This side of the site does not let anyone through anonymously. '
        + 'Before you are asked for anything else, you are being told exactly what is taken.';
      var t = document.createElement('div');
      t.className = 'terms';
      t.innerHTML = 'By continuing you agree that: <b>·</b> your <b>IP address</b> is recorded, '
        + 'obtained via the third-party service <b>api.ipify.org</b>; <b>·</b> the <b>name</b> you '
        + 'give on the next screen is recorded and stored alongside it; <b>·</b> this happens '
        + '<b>before</b> you find out whether you have access, and <b>·</b> once recorded it '
        + 'cannot be withdrawn. If you do not want this, close the tab now — that is the only '
        + 'way to leave without being logged.';
      var go = document.createElement('button');
      go.type = 'button'; go.textContent = 'I AGREE — RECORD ME ►';
      var out = document.createElement('a');
      out.className = 'out'; out.href = './'; out.textContent = 'no — take me back';
      bx.appendChild(p); bx.appendChild(t); bx.appendChild(go); bx.appendChild(out);
      go.addEventListener('click', function () {
        try { localStorage.setItem(CKEY, '1'); } catch (e) { }
        done();
      });
    });
  }

  // ── step 2 · name, and the log ─────────────────────────────────────────────
  function askName() {
    return new Promise(function (done) {
      var bx = shell('CHECK 2 OF 3 · IDENTIFY', 'WHO ARE YOU');
      var p = document.createElement('div');
      p.className = 'say';
      p.textContent = 'Type a name. It is stored with your IP address the moment you submit it, '
        + 'and it is stored whether or not you get any further than the next screen.';
      var input = document.createElement('input');
      input.type = 'text'; input.autocomplete = 'off'; input.placeholder = 'your name';
      input.setAttribute('aria-label', 'Your name');
      var prev = '';
      try { prev = localStorage.getItem(NKEY) || ''; } catch (e) { }
      if (prev) input.value = prev;
      var err = document.createElement('div'); err.className = 'err'; err.setAttribute('role', 'alert');
      var go = document.createElement('button');
      go.type = 'button'; go.textContent = 'SUBMIT ►';
      var ft = document.createElement('div');
      ft.className = 'ft';
      ft.textContent = 'RECORDED AT SUBMIT · NOT REVERSIBLE · NOT VERIFIED';
      bx.appendChild(p); bx.appendChild(input); bx.appendChild(err); bx.appendChild(go); bx.appendChild(ft);
      setTimeout(function () { input.focus(); }, 30);

      var submit = async function () {
        var v = (input.value || '').trim().slice(0, 80);
        if (!v) { err.textContent = '✕ A NAME IS REQUIRED'; input.focus(); return; }
        if (go.disabled) return;
        go.disabled = true; go.textContent = 'RECORDING…'; err.textContent = '';
        try { localStorage.setItem(NKEY, v); } catch (e) { }
        var addr = await logAttempt(v);          // the log completes before step 3
        ft.textContent = 'RECORDED: ' + v + ' @ ' + addr;
        go.textContent = 'RECORDED ✓';
        setTimeout(function () { done(v); }, 700);
      };
      go.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    });
  }

  // ── step 3 · the passphrase ────────────────────────────────────────────────
  function askPass() {
    return new Promise(function (done) {
      var bx = shell('CHECK 3 OF 3 · PASSPHRASE', 'NOW THE LOCK');
      var p = document.createElement('div');
      p.className = 'say';
      p.textContent = 'Same passphrase as the other side. You are already in the log either way.';
      var input = document.createElement('input');
      input.type = 'password'; input.autocomplete = 'off'; input.placeholder = 'passphrase';
      input.setAttribute('aria-label', 'Passphrase');
      var err = document.createElement('div'); err.className = 'err'; err.setAttribute('role', 'alert');
      var go = document.createElement('button');
      go.type = 'button'; go.textContent = 'UNSEAL ►';
      var ft = document.createElement('div');
      ft.className = 'ft';
      var who = '';
      try { who = localStorage.getItem(NKEY) || ''; } catch (e) { }
      ft.textContent = who ? ('LOGGED AS: ' + who.toUpperCase()) : 'LOGGED';
      bx.appendChild(p); bx.appendChild(input); bx.appendChild(err); bx.appendChild(go); bx.appendChild(ft);
      setTimeout(function () { input.focus(); }, 30);

      var submit = async function () {
        var v = input.value;
        if (!v || go.disabled) return;
        go.disabled = true; go.textContent = 'CHECKING…'; err.textContent = '';
        try {
          await decrypt(await getChallenge(), v);
          try { sessionStorage.setItem(SKEY, v); } catch (e) { }
          done();
        } catch (e) {
          input.value = '';
          err.textContent = '✕ WRONG PASSPHRASE — YOUR ATTEMPT IS ON RECORD';
          go.disabled = false; go.textContent = 'UNSEAL ►';
          input.focus();
        }
      };
      go.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    });
  }

  function unlock() {
    document.documentElement.classList.remove('lv-sealed');
    if (ov) { ov.remove(); ov = null; }
    window.dispatchEvent(new CustomEvent('lv-sin-unlocked'));
  }

  async function boot() {
    var pw = null;
    try { pw = sessionStorage.getItem(SKEY); } catch (e) { }
    if (pw) {
      try { await decrypt(await getChallenge(), pw); unlock(); return; }
      catch (e) { try { sessionStorage.removeItem(SKEY); } catch (e2) { } }
    }
    await askConsent();
    await askName();      // logs before the lock is shown
    await askPass();
    unlock();
  }

  window.LVSinGate = {
    forget: function () {
      try { sessionStorage.removeItem(SKEY); localStorage.removeItem(CKEY); localStorage.removeItem(NKEY); } catch (e) { }
    },
    lastLogged: function () { try { return localStorage.getItem('lv.sin.last'); } catch (e) { return null; } }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
