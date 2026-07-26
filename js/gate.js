// LEVIATHAN · THE GATE — one passphrase in front of the whole deployment.
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
    '#lv-gate .ft{margin-top:16px;font-size:9px;letter-spacing:0.18em;color:#4f8a63;line-height:1.9}'
  ].join('');

  // The house style for turning someone away. Kept in one place so it is
  // edited here and nowhere else.
  var GREETING = 'awww are you sad lil bro? she’s never going to truly be yours. '
    + 'Go away with your little babydick';

  function paintGate() {
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var ov = document.createElement('div');
    ov.id = 'lv-gate';
    ov.innerHTML = '<div class="bx">'
      + '<div class="tag">⬢ LEVIATHAN · SEALED</div>'
      + '<div class="say"></div>'
      + '<input type="password" autocomplete="off" aria-label="Passphrase" placeholder="passphrase">'
      + '<div class="err" role="alert"></div>'
      + '<button type="button">UNSEAL ►</button>'
      + '<div class="ft">AES-256-GCM · PBKDF2-SHA256 · 250,000 ITERATIONS<br>'
      + 'NO PASSPHRASE RECOVERY — THERE IS NOTHING HERE TO RECOVER IT FROM</div>'
      + '</div>';
    // textContent, not innerHTML: the greeting is copy, never markup.
    ov.querySelector('.say').textContent = GREETING;
    document.body.appendChild(ov);

    var input = ov.querySelector('input');
    var err = ov.querySelector('.err');
    var go = ov.querySelector('button');

    var submit = async function () {
      var v = input.value;
      if (!v) return;
      err.textContent = ''; go.disabled = true; go.textContent = 'CHECKING…';
      try {
        await tryPassphrase(v);
        unlock();
      } catch (e) {
        err.textContent = '✕ WRONG PASSPHRASE — ACCESS DENIED';
        go.disabled = false; go.textContent = 'UNSEAL ►';
        input.select();
      }
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    setTimeout(function () { input.focus(); }, 30);
  }

  // A passphrase carried over from an earlier page in this tab still has to
  // clear the same check — sessionStorage is not itself trusted.
  async function boot() {
    if (pw) {
      try { await tryPassphrase(pw); unlock(); return; }
      catch (e) { pw = null; try { sessionStorage.removeItem(SKEY); } catch (e2) {} }
    }
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
    decrypt: decrypt
  };
})();
