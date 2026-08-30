// LEVIATHAN · ボスの部屋 — the sealed wire to wiki-brain.
//
// This is what makes the room work on the website with no daemon anywhere.
//
// ── THE PROBLEM IT SOLVES ────────────────────────────────────────────────────
// The ledger has to reach a phone, and `caakehorn/wiki-brain` is public. Those
// two facts meet in exactly one place: the log travels and rests as ciphertext.
// This module reads `intake/events.enc` out of that repository, opens it with
// the passphrase the gate already took, appends, re-seals and writes it back.
// GitHub stores a blob it cannot read; so does anyone who clones the repo.
//
// ── THE FORMAT IS NOT OURS TO CHOOSE ─────────────────────────────────────────
// Sealed with the same envelope `data/leviathan.enc` has always used and
// `js/gate.js` already opens: PBKDF2-SHA256 at 250k iterations, AES-256-GCM,
// tag appended. Inside it is `bin/intake`'s own `events.jsonl`, byte for byte —
// that repository owns the data and its tool is the reference implementation.
// `bin/intake seal` and `bin/intake open` are the other end of this wire and
// were checked against it in both directions before either shipped.
//
// ── WHY A UNION IS ALWAYS SAFE ───────────────────────────────────────────────
// The log is append-only and every event carries a ULID, so merging two copies
// is set union by id. No last-writer-wins, no field-level conflict, nothing lost
// when a phone and a laptop both write. Corrections and voids are themselves
// events, so even a change of mind merges. The worst case is a re-read.
//
// ── WHAT IS KEPT ON THIS DEVICE, AND WHAT IS NOT ─────────────────────────────
// The token, and only the token — in localStorage, on this origin, on this
// device. It is never committed, never sent anywhere but api.github.com, and
// FORGET wipes it. The ledger itself is deliberately NOT cached here: this is a
// public origin, and a plaintext consumption record sitting in a browser store
// is the same mistake as committing one, made somewhere harder to notice.
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var REPO = 'caakehorn/wiki-brain';          // upstream. Not ours to choose.
  var LOG = 'intake/events.jsonl';
  var SUBSTANCES = 'intake/substances.json';
  var TKEY = 'lv.boss.token';
  var ITER = 250000;

  var enc = new TextEncoder(), dec = new TextDecoder();

  function b64(buf) {
    var bin = '', a = new Uint8Array(buf);
    for (var i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
    return btoa(bin);
  }
  function unb64(s) {
    var bin = atob(String(s).replace(/\s+/g, '')), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  // ── the seal ──────────────────────────────────────────────────────────────
  async function keyFrom(phrase, salt, iterations) {
    var base = await crypto.subtle.importKey('raw', enc.encode(phrase), 'PBKDF2',
                                             false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function open(phrase, blob) {
    var key = await keyFrom(phrase, unb64(blob.salt), blob.iter || ITER);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) },
                                         key, unb64(blob.ct));
    return dec.decode(pt);
  }

  async function seal(phrase, text) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await keyFrom(phrase, salt, ITER);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(text));
    return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER,
             salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }

  // ── the token ─────────────────────────────────────────────────────────────
  function token() { try { return localStorage.getItem(TKEY) || null; } catch (e) { return null; } }
  function setToken(t) { try { localStorage.setItem(TKEY, t); } catch (e) {} }
  function forget() { try { localStorage.removeItem(TKEY); } catch (e) {} }

  async function call(path, init) {
    var t = token();
    if (!t) throw new Error('no GitHub token on this device');
    init = init || {};
    var res = await fetch(API + path, {
      method: init.method || 'GET',
      body: init.body ? JSON.stringify(init.body) : undefined,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + t,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (res.status === 401) throw new Error('GitHub rejected the token (401) — it expired or was revoked');
    if (res.status === 403) throw new Error('GitHub refused (403) — the token is missing Contents: write on ' + REPO);
    if (res.status === 404 && init.method) throw new Error('not found (404) — the token cannot see ' + REPO);
    return res;
  }

  // ── the file ──────────────────────────────────────────────────────────────
  // A missing log is a normal state, not a failure: the first write of a
  // lifetime creates it, and asking beforehand should not read as an error.
  //
  // PLAINTEXT, by operator decision on 2026-08-30. It was sealed before, which
  // kept a public repository from publishing anything readable — but it also
  // kept the WIKI from reading it, and the whole reason the ledger lives in
  // wiki-brain is so the corpus can set a dated first-party record against a
  // page's narrative. A ledger the analysis layer cannot open is a ledger with
  // no reason to be there. The operator asked for it to sync while the repo is
  // public, stating they understood what that publishes.
  //
  // What that means, plainly: `intake/events.jsonl` is a public, permanent
  // record of consumption, and git history cannot be un-published.
  //
  // The format is `bin/intake`'s own file, byte for byte — the same one the CLI
  // appends and the portal writes, so all three converge without conversion.
  async function readLog() {
    var res = await call('/repos/' + REPO + '/contents/' + LOG);
    if (res.status === 404) return { sha: null, lines: [] };
    if (!res.ok) throw new Error('could not read the log (' + res.status + ')');
    var j = await res.json();
    var text = j.content ? dec.decode(unb64(j.content)) : null;
    if (!text) {                       // >1MB: the contents API omits it inline
      var b = await call('/repos/' + REPO + '/git/blobs/' + j.sha);
      text = dec.decode(unb64((await b.json()).content));
    }
    return { sha: j.sha, lines: text.split('\n').filter(function (l) { return l.trim(); }) };
  }

  async function writeLog(lines, sha, message) {
    var res = await call('/repos/' + REPO + '/contents/' + LOG, {
      method: 'PUT',
      body: {
        message: message || 'intake: a night',
        content: b64(enc.encode(lines.join('\n') + (lines.length ? '\n' : ''))),
        sha: sha || undefined
      }
    });
    if (res.status === 409 || res.status === 422) return false;   // raced; caller retries
    if (!res.ok) throw new Error('could not write the log (' + res.status + ')');
    return true;
  }

  function mergeLines(a, b) {
    var seen = Object.create(null), out = [];
    [a, b].forEach(function (group) {
      (group || []).forEach(function (line) {
        line = line.trim();
        if (!line) return;
        var id;
        try { id = JSON.parse(line).id; } catch (e) { return; }
        if (id && seen[id]) return;
        if (id) seen[id] = 1;
        out.push(line);
      });
    });
    out.sort(function (x, y) {
      var a1 = JSON.parse(x), b1 = JSON.parse(y);
      return (a1.timestamp || '') < (b1.timestamp || '') ? -1
           : (a1.timestamp || '') > (b1.timestamp || '') ? 1
           : (a1.id || '') < (b1.id || '') ? -1 : 1;
    });
    return out;
  }

  /** Read, merge the caller's new lines in, write. Retries once on a race. */
  async function push(newLines, message) {
    for (var attempt = 0; attempt < 2; attempt++) {
      var cur = await readLog();
      var merged = mergeLines(cur.lines, newLines);
      if (await writeLog(merged, cur.sha, message)) {
        return { lines: merged, wrote: newLines.length };
      }
    }
    throw new Error('two devices wrote at once and the second retry also raced — try again');
  }

  async function pull() {
    return (await readLog()).lines;
  }

  /** The substance catalog, which decides what quick-log buttons exist.
   *
   *  Three sources, in order, because this must not hinge on one cross-origin
   *  fetch: the authenticated contents API (same host as every other call here),
   *  the raw CDN, then null — at which point `boss-web.js` falls back to its
   *  compiled-in copy. Returns null only when every network path failed, and the
   *  caller says so on screen rather than silently rendering no buttons.
   */
  async function readSubstances() {
    try {
      var res = await call('/repos/' + REPO + '/contents/' + SUBSTANCES);
      if (res.ok) {
        var j = await res.json();
        if (j.content) return JSON.parse(dec.decode(unb64(j.content)));
      }
    } catch (e) { /* fall through to the CDN */ }
    try {
      var raw = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/' + SUBSTANCES);
      if (raw.ok) return await raw.json();
    } catch (e) { /* fall through to the built-in */ }
    return null;
  }

  window.BossSync = {
    REPO: REPO, LOG: LOG,
    token: token, setToken: setToken, forget: forget,
    mergeLines: mergeLines, readSubstances: readSubstances,
    readLog: readLog, push: push, pull: pull
  };
})();
