// LEVIATHAN · WIKI READER — full rebuild
//
// A reading surface built for THIS corpus and the ENTER THE VOID motif:
// chromatic aberration, glitch, scanlines, Unbounded mastheads carried over
// from the splash — wrapped around a prose column that stays genuinely
// readable. The rule throughout: the CHROME is loud, the PROSE is calm.
// Every effect lives in the masthead, the furniture, and the interactions;
// nothing strobes underneath the sentences you are actually reading.
//
// Owns its whole subtree. index.html hands it one empty div; this module
// builds the nav, the article, the link previews and the progress rail.
// Replaces the previous reader wholesale (nav + markdown renderer + page
// renderer); nothing here is layered on top of the old one.
(function () {
  // SLIME: the nine domains spread across a purple↔green ramp. Confined to two
  // hue families they can't be told apart by hue alone, so the five greens and
  // four purples alternate and are separated by lightness and saturation
  // instead — and no two adjacent domains share a family.
  const DOM_NEON = {
    self:      '#39ff14',   // electric lime
    timeline:  '#b026ff',   // vivid purple
    people:    '#ccff00',   // acid yellow-green
    mind:      '#7b2dff',   // violet
    work:      '#00ffa3',   // spring green
    interests: '#e0aaff',   // pale lilac
    health:    '#7dffb0',   // mint
    places:    '#c77dff',   // light purple
    legal:     '#9ecb4a'    // olive
  };
  const DOMS = ['self', 'timeline', 'people', 'mind', 'work', 'interests', 'health', 'places', 'legal'];

  // Edge types, coloured by what they DO to an argument. contradicts gets the
  // hottest purple in the ramp — it is the alarm, and must not collide with
  // the merely-structural edges.
  const EDGE_NEON = {
    causes: '#ccff00', 'caused-by': '#ccff00',
    evidences: '#39ff14', 'evidenced-by': '#39ff14',
    instantiates: '#7b2dff', 'instance-of': '#7b2dff',
    precedes: '#7dffb0', follows: '#7dffb0',
    parallels: '#00ffa3', mirrors: '#00ffa3', resolves: '#00ffa3',
    contradicts: '#e01aff',
    'co-occurs': '#8fa878', 'component-of': '#8fa878', contains: '#8fa878',
    supplies: '#c77dff', 'supplied-by': '#c77dff',
    contextualizes: '#e0aaff', escalates: '#b026ff', related: '#5f7a4e'
  };

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const CSS = `
/* ══════════ LEVIATHAN READER ══════════ */
.rdr{position:absolute;inset:0;display:flex;background:#03000a;z-index:5;
  font-family:'IBM Plex Mono',monospace;--ac:#39ff14;--ac2:#b026ff}
.rdr *{box-sizing:border-box}
.rdr ::selection{background:#b026ff;color:#040010}

/* ── the CRT this whole thing is read through ──
   scanlines, mesh, a sweeping tracking band, grain and a mains flicker.
   All of it sits ABOVE the layout and below nothing you need to click. */
.rdr-veil{position:absolute;inset:0;z-index:40;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,10,.42) 0 1px,transparent 1px 3px);
  animation:rdrFlick 5.5s steps(1) infinite}
@keyframes rdrFlick{0%,96%,100%{opacity:1}97%{opacity:.72}98%{opacity:1}99%{opacity:.85}}
.rdr-mesh{position:absolute;inset:0;z-index:31;pointer-events:none;opacity:.5;
  background:
    repeating-linear-gradient(90deg,rgba(123,45,255,.10) 0 1px,transparent 1px 46px),
    repeating-linear-gradient(0deg,rgba(57,255,20,.06) 0 1px,transparent 1px 46px)}
.rdr-vig{position:absolute;inset:0;z-index:32;pointer-events:none;
  background:radial-gradient(ellipse at 50% 40%,transparent 58%,rgba(2,0,8,.72) 100%)}
/* VHS tracking band, drifts down the screen */
.rdr-track{position:absolute;left:0;right:0;height:120px;z-index:41;pointer-events:none;
  background:linear-gradient(180deg,transparent,rgba(57,255,20,.09) 30%,rgba(176,38,255,.11) 55%,transparent);
  mix-blend-mode:screen;animation:rdrTrack 7.5s linear infinite}
@keyframes rdrTrack{0%{top:-140px;opacity:0}6%{opacity:1}94%{opacity:1}100%{top:100%;opacity:0}}
/* grain */
.rdr-grain{position:absolute;inset:0;z-index:30;pointer-events:none;opacity:.20;
  background-image:radial-gradient(rgba(255,255,255,.55) .5px,transparent .5px);
  background-size:3px 3px;animation:rdrGrain .55s steps(1) infinite}
@keyframes rdrGrain{0%{background-position:0 0}25%{background-position:2px 1px}
  50%{background-position:1px 2px}75%{background-position:2px 2px}100%{background-position:0 1px}}

/* ── SLIME DRIPS ──
   Sporadic ooze creeping down both edges. Each strand has its own length,
   offset, duration and delay so they never march in step; the bulb at the tip
   swells before the strand fades and starts over somewhere else. */
.rdr-drips{position:absolute;top:0;bottom:0;width:34px;z-index:36;pointer-events:none;overflow:hidden}
.rdr-drips.l{left:0}
.rdr-drips.r{right:0}
.rdr-drips i{position:absolute;top:-4px;width:6px;height:0;border-radius:0 0 7px 7px;
  background:linear-gradient(180deg,#39ff14,#00ffa3 45%,#b026ff);
  box-shadow:0 0 12px #39ff14,0 0 30px rgba(57,255,20,.55),0 0 60px rgba(176,38,255,.35);
  animation:rdrDrip var(--dur,15s) cubic-bezier(.35,0,.25,1) var(--del,0s) infinite}
.rdr-drips i::after{content:'';position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);
  width:12px;height:13px;border-radius:0 0 50% 50%/0 0 60% 60%;
  background:radial-gradient(circle at 50% 35%,#b6ff8f,#39ff14 55%,#00ffa3);
  box-shadow:0 0 16px #39ff14,0 0 34px rgba(57,255,20,.6)}
@keyframes rdrDrip{
  0%,6%{height:0;opacity:0}
  10%{opacity:1}
  60%{height:var(--h,190px);opacity:1}
  86%{height:var(--h,190px);opacity:1}
  100%{height:var(--h,190px);opacity:0}}
@media (prefers-reduced-motion:reduce){.rdr-drips{display:none}}

/* ── reading progress rail ── */
.rdr-rail{position:absolute;top:0;left:0;right:0;height:2px;z-index:41;pointer-events:none;background:rgba(255,255,255,.05)}
.rdr-rail i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7b2dff,#39ff14 40%,#b026ff);
  box-shadow:0 0 10px var(--ac);transition:width .1s linear}

/* ══════════ NAV ══════════ */
.rdr-nav{width:296px;min-width:296px;display:flex;flex-direction:column;
  background:linear-gradient(180deg,#0a0420,#050116);border-right:1px solid rgba(123,45,255,.30);position:relative;z-index:35}
.rdr-nav::after{content:'';position:absolute;top:0;right:-1px;bottom:0;width:1px;
  background:linear-gradient(180deg,transparent,#7b2dff,#39ff14,transparent);opacity:.7}
.rdr-srch{padding:14px 14px 10px;border-bottom:1px solid rgba(123,45,255,.18)}
.rdr-srch input{width:100%;background:rgba(0,0,0,.55);border:1px solid rgba(57,255,20,.28);
  color:#e9ffe6;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;
  padding:9px 11px;outline:none;transition:border-color .15s,box-shadow .15s}
.rdr-srch input::placeholder{color:#4d6a3c;letter-spacing:.14em}
.rdr-srch input:focus{border-color:#b026ff;box-shadow:0 0 0 1px rgba(176,38,255,.35),0 0 22px rgba(176,38,255,.28),inset 0 0 18px rgba(123,45,255,.15)}
.rdr-count{margin-top:8px;font-size:8.5px;letter-spacing:.26em;color:#4d6a3c}
.rdr-list{flex:1;overflow-y:auto;padding:4px 0 40px;scrollbar-width:thin;scrollbar-color:#7b2dff #06021a}
.rdr-list::-webkit-scrollbar{width:8px}
.rdr-list::-webkit-scrollbar-track{background:#06021a}
.rdr-list::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#7b2dff,#39ff14)}

/* ── tree ──
   343 pages will not fit in a flat list, so the nav is a real collapsible
   tree over the id paths: nine domains at rest, everything else folded away
   until asked for. The path to the open page auto-expands. */
.rdr-grp{border-bottom:1px solid rgba(123,45,255,.10)}
.rdr-drow{display:flex;align-items:center;gap:9px;width:100%;background:none;border:0;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.26em;color:var(--d);
  padding:11px 13px;text-align:left;transition:background .12s}
.rdr-drow:hover{background:color-mix(in srgb,var(--d) 13%,transparent)}
.rdr-drow i{font-style:normal;font-size:8px;width:9px;opacity:.85;transition:transform .16s}
.rdr-drow.open i{transform:rotate(90deg)}
.rdr-drow s{flex:1;text-decoration:none}
.rdr-drow u{text-decoration:none;font-size:9px;opacity:.95;color:#fff;
  background:color-mix(in srgb,var(--d) 30%,transparent);padding:2px 6px;letter-spacing:.06em}
.rdr-drow.has{text-shadow:0 0 12px var(--d)}

.rdr-kids{display:none;padding-bottom:5px}
.rdr-kids.open{display:block}
.rdr-kids .rdr-kids{margin-left:11px;border-left:1px solid rgba(123,45,255,.22)}

.rdr-frow{display:flex;align-items:center;gap:8px;width:100%;background:none;border:0;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#93a884;letter-spacing:.06em;
  padding:5px 12px 5px 16px;text-align:left;transition:color .12s,background .12s}
.rdr-frow:hover{color:#fff;background:rgba(123,45,255,.16)}
.rdr-frow i{font-style:normal;font-size:7.5px;width:8px;color:var(--d);transition:transform .16s}
.rdr-frow.open i{transform:rotate(90deg)}
.rdr-frow s{flex:1;text-decoration:none}
.rdr-frow u{text-decoration:none;font-size:8.5px;opacity:.75;color:#c9a8ff}
.rdr-frow.ltr s{font-weight:700;letter-spacing:.2em;color:var(--d)}

.rdr-it{display:block;width:100%;text-align:left;background:none;border:0;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-size:10.5px;line-height:1.42;color:#93a884;
  padding:5px 12px 5px 22px;border-left:2px solid transparent;position:relative;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .12s,background .12s}
.rdr-it:hover{color:#fff;background:linear-gradient(90deg,rgba(123,45,255,.24),transparent);border-left-color:var(--d)}
.rdr-it.on{color:#040010;background:var(--d);border-left-color:#fff;font-weight:600;
  text-shadow:none;box-shadow:0 0 26px -6px var(--d)}
.rdr-it.on::after{content:'◄';position:absolute;right:9px;font-size:8px}
.rdr-it.idx{color:#d6ffc7}
.rdr-it .k{opacity:.4;margin-right:6px}
.rdr-it mark{background:none;color:#39ff14;text-shadow:0 0 10px #39ff14}
.rdr-it.on mark{color:#040010;text-shadow:none;text-decoration:underline}
.rdr-sub{display:block;font-size:8.5px;letter-spacing:.05em;color:#5f7a4e;margin-top:2px}
.rdr-it.on .rdr-sub{color:rgba(2,0,8,.65)}
.rdr-empty{padding:26px 16px;font-size:10px;letter-spacing:.18em;color:#4d6a3c;line-height:2}
.rdr-hits{padding:11px 14px 6px;font-size:8.5px;letter-spacing:.26em;color:#7b2dff}

/* ══════════ ARTICLE ══════════ */
.rdr-scroll{flex:1;overflow-y:auto;position:relative;z-index:10;
  scrollbar-width:thin;scrollbar-color:#7b2dff #03000a}
.rdr-scroll::-webkit-scrollbar{width:11px}
.rdr-scroll::-webkit-scrollbar-track{background:#03000a}
.rdr-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#b026ff,#7b2dff,#39ff14)}
/* full-bleed article; only the text columns are constrained */
.rdr-art{max-width:none;margin:0;padding:0 0 220px;user-select:text;-webkit-user-select:text}
.rdr-in{max-width:1080px;margin:0 auto;padding:0 56px;position:relative;z-index:2}

/* ── masthead: full bleed, and LOUD ── */
.rdr-head{position:relative;padding:66px 0 40px;overflow:hidden;isolation:isolate;
  background:
    /* reading scrim, listed first so it sits ON TOP of the wash: five of the
       nine domains are bright greens, and white eyebrow text on acid yellow
       is unreadable without it. Fades out to the right so the watermark and
       the aurora stay at full strength where no text sits. */
    linear-gradient(100deg,rgba(3,0,10,.80) 0%,rgba(3,0,10,.55) 38%,rgba(3,0,10,.12) 68%,transparent 88%),
    radial-gradient(ellipse 120% 150% at 8% -30%,color-mix(in srgb,var(--d) 62%,transparent),transparent 60%),
    radial-gradient(ellipse 90% 120% at 92% 0%,color-mix(in srgb,#7b2dff 44%,transparent),transparent 62%),
    linear-gradient(180deg,color-mix(in srgb,var(--d) 20%,transparent),rgba(3,1,9,.2) 70%,transparent)}
/* drifting aurora wash */
.rdr-head::before{content:'';position:absolute;inset:-40%;z-index:-2;pointer-events:none;opacity:.55;
  background:conic-gradient(from 0deg,transparent,color-mix(in srgb,var(--d) 55%,transparent),
    transparent 38%,rgba(57,255,20,.34) 55%,transparent 70%,rgba(176,38,255,.34) 86%,transparent);
  animation:rdrSpin 26s linear infinite;filter:blur(46px)}
@keyframes rdrSpin{to{transform:rotate(360deg)}}
.rdr-head::after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.075) 0 1px,transparent 1px 4px)}
/* giant outlined domain watermark behind the title */
.rdr-wm{position:absolute;right:-2%;top:50%;transform:translateY(-50%);z-index:-1;pointer-events:none;
  font-family:'Unbounded',sans-serif;font-weight:900;font-size:clamp(70px,15vw,210px);line-height:.8;
  letter-spacing:-.03em;color:transparent;-webkit-text-stroke:2px color-mix(in srgb,var(--d) 42%,transparent);
  opacity:.5;white-space:nowrap}
/* corner brackets */
.rdr-head .br{position:absolute;width:26px;height:26px;border:2px solid var(--d);z-index:3;opacity:.9;
  box-shadow:0 0 18px var(--d)}
.rdr-head .br.tl{top:16px;left:16px;border-right:0;border-bottom:0}
.rdr-head .br.tr{top:16px;right:16px;border-left:0;border-bottom:0}
.rdr-head .br.bl{bottom:16px;left:16px;border-right:0;border-top:0}
.rdr-head .br.br2{bottom:16px;right:16px;border-left:0;border-top:0}

.rdr-eyebrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  font-size:9.5px;letter-spacing:.42em;color:#fff;margin-bottom:22px;
  text-shadow:0 0 4px var(--d),0 0 18px var(--d),0 0 40px var(--d)}
.rdr-eyebrow s{text-decoration:none;opacity:.45}
.rdr-eyebrow em{font-style:normal;padding:3px 9px;background:var(--d);color:#040010;font-weight:700;
  letter-spacing:.24em;box-shadow:0 0 22px var(--d)}

/* the title: Unbounded 900 (same family as the splash) sitting WHITE and legible
   with a permanent chromatic fringe; the RGB-split ghosts only flash on the
   rare glitch frames so the headline never becomes mush to read */
.rdr-title{position:relative;margin:0;font-family:'Unbounded',sans-serif;font-weight:900;
  font-size:clamp(36px,5.6vw,76px);line-height:1.02;letter-spacing:-.018em;color:#fff;
  text-wrap:balance;
  text-shadow:3px 0 rgba(176,38,255,.85),-3px 0 rgba(57,255,20,.85),
    0 0 28px color-mix(in srgb,var(--d) 70%,transparent),
    0 0 90px color-mix(in srgb,var(--d) 55%,transparent)}
.rdr-title::before,.rdr-title::after{content:attr(data-t);position:absolute;left:0;top:0;width:100%;
  pointer-events:none;opacity:0;text-shadow:none}
.rdr-title::before{color:#b026ff;animation:rdrGa 7s steps(1) infinite}
.rdr-title::after{color:#39ff14;animation:rdrGb 7s steps(1) infinite}
@keyframes rdrGa{
  0%,87%,100%{opacity:0;transform:none;clip-path:inset(0 0 0 0)}
  88%{opacity:.95;transform:translate(-9px,2px);clip-path:inset(10% 0 58% 0)}
  90%{opacity:.95;transform:translate(7px,-2px);clip-path:inset(62% 0 8% 0)}
  92%{opacity:.75;transform:translate(-4px,0);clip-path:inset(34% 0 42% 0)}}
@keyframes rdrGb{
  0%,87%,100%{opacity:0;transform:none;clip-path:inset(0 0 0 0)}
  88%{opacity:.95;transform:translate(8px,-2px);clip-path:inset(46% 0 24% 0)}
  90%{opacity:.95;transform:translate(-7px,2px);clip-path:inset(4% 0 70% 0)}
  92%{opacity:.75;transform:translate(5px,0);clip-path:inset(70% 0 4% 0)}}

.rdr-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
.rdr-chip{font-size:9px;letter-spacing:.22em;padding:6px 12px;position:relative;
  border:1px solid var(--c,#7b2dff);color:#fff;
  background:color-mix(in srgb,var(--c,#7b2dff) 22%,transparent);
  box-shadow:0 0 20px -4px var(--c,#7b2dff),inset 0 0 18px -8px var(--c,#7b2dff);
  text-shadow:0 0 12px var(--c,#7b2dff)}
.rdr-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}
.rdr-tag{font-size:9px;letter-spacing:.16em;color:#dcffc8;
  border:1px dashed rgba(123,45,255,.85);padding:4px 10px;background:rgba(123,45,255,.14);
  text-shadow:0 0 10px rgba(123,45,255,.9)}
.rdr-tag::before{content:'#';opacity:.6}

/* chromatic rule under the masthead — full bleed, animated */
.rdr-rule{position:relative;height:3px;margin:0;overflow:hidden;
  background:linear-gradient(90deg,#b026ff,var(--d) 26%,#39ff14 58%,#7b2dff 82%,#b026ff);
  background-size:200% 100%;animation:rdrSlide 5s linear infinite;
  box-shadow:0 0 26px color-mix(in srgb,var(--d) 85%,transparent)}
@keyframes rdrSlide{to{background-position:-200% 0}}

/* ── body ── */
.rdr-body{padding:44px 0 0;font-family:'Space Grotesk',sans-serif;position:relative}
.rdr-body p{margin:0 0 19px;font-size:16.2px;line-height:1.88;color:#d2e8cb;max-width:72ch}
/* lead-in: weight and a domain rule rather than a drop cap, which straddles
   two lines and reads as if it belongs to both */
.rdr-body p.lead{position:relative;font-size:18.4px;line-height:1.78;color:#eeffe8;
  padding-left:22px;margin-bottom:26px}
.rdr-body p.lead::before{content:'';position:absolute;left:0;top:.34em;bottom:.24em;width:3px;
  background:linear-gradient(180deg,var(--d),transparent);
  box-shadow:0 0 16px color-mix(in srgb,var(--d) 75%,transparent)}
.rdr-body strong{color:#fff;font-weight:700;
  text-shadow:0 0 18px color-mix(in srgb,var(--d) 45%,transparent)}
.rdr-body em{color:#c9ff9e;font-style:italic}
.rdr-body code{font-family:'IBM Plex Mono',monospace;font-size:12.5px;background:#100a26;
  border:1px solid rgba(123,45,255,.4);padding:1px 6px;color:#ccff00}

.rdr-body h2{position:relative;margin:52px 0 20px;padding-left:18px;
  font-family:'Unbounded',sans-serif;font-weight:700;font-size:clamp(19px,2.3vw,27px);
  line-height:1.2;color:#fff;letter-spacing:-.005em;
  text-shadow:2px 0 rgba(176,38,255,.55),-2px 0 rgba(57,255,20,.55)}
.rdr-body h2::before{content:'';position:absolute;left:0;top:.1em;bottom:.1em;width:4px;
  background:linear-gradient(180deg,var(--d),transparent);box-shadow:0 0 14px var(--d)}
.rdr-body h3{margin:34px 0 13px;font-family:'IBM Plex Mono',monospace;font-weight:600;
  font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--d);
  text-shadow:0 0 14px var(--d)}
.rdr-body h4,.rdr-body h5,.rdr-body h6{margin:24px 0 10px;font-family:'IBM Plex Mono',monospace;
  font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#9d94c8}

.rdr-body ul,.rdr-body ol{margin:0 0 20px;padding-left:24px;max-width:72ch}
.rdr-body li{font-size:15.6px;line-height:1.82;color:#cde8c6;margin-bottom:7px}
.rdr-body li::marker{color:var(--d)}

.rdr-body hr{border:0;height:1px;margin:36px 0;
  background:linear-gradient(90deg,transparent,rgba(123,45,255,.7),transparent)}

/* tables — 2,634 rows in this corpus, so they are a first-class citizen */
.rdr-tw{overflow-x:auto;margin:0 0 26px;border:1px solid rgba(123,45,255,.3);background:rgba(6,3,16,.75)}
.rdr-body table{border-collapse:collapse;width:100%;font-family:'IBM Plex Mono',monospace;font-size:12px}
.rdr-body th{text-align:left;padding:10px 14px;background:color-mix(in srgb,var(--d) 16%,#0b0620);
  color:var(--d);font-weight:600;letter-spacing:.16em;font-size:9.5px;text-transform:uppercase;
  border-bottom:1px solid color-mix(in srgb,var(--d) 45%,transparent);white-space:nowrap}
.rdr-body td{padding:10px 14px;color:#c2bcda;line-height:1.66;border-bottom:1px solid rgba(123,45,255,.13);vertical-align:top}
.rdr-body tr:last-child td{border-bottom:0}
.rdr-body tbody tr:hover td{background:rgba(123,45,255,.10);color:#eeffe8}

/* quotes — and the CONTRADICTION callout the corpus actually uses */
.rdr-body blockquote{margin:0 0 24px;padding:15px 22px;max-width:72ch;
  border-left:2px solid var(--d);background:linear-gradient(90deg,color-mix(in srgb,var(--d) 11%,transparent),transparent);
  font-size:15.4px;line-height:1.82;color:#cbe8c4}
.rdr-body blockquote.contra{border-left-color:#b026ff;background:linear-gradient(90deg,rgba(176,38,255,.16),transparent);
  color:#f0d9ff;box-shadow:inset 0 0 44px rgba(176,38,255,.10)}
.rdr-body blockquote.contra::before{content:'⚠ CONTRADICTION';display:block;margin-bottom:9px;
  font-family:'IBM Plex Mono',monospace;font-size:8.5px;letter-spacing:.3em;color:#b026ff;
  text-shadow:0 0 14px #b026ff;animation:rdrBlink 2.4s steps(1) infinite}
@keyframes rdrBlink{0%,72%,100%{opacity:1}80%{opacity:.35}}

/* wikilinks — the signature interaction, 2,723 of them */
.rdr-wl{color:var(--d);text-decoration:none;cursor:pointer;position:relative;
  border-bottom:1px solid color-mix(in srgb,var(--d) 45%,transparent);
  transition:text-shadow .12s,background .12s}
.rdr-wl:hover{color:#fff;background:color-mix(in srgb,var(--d) 20%,transparent);
  text-shadow:2px 0 #b026ff,-2px 0 #39ff14;border-bottom-color:#fff}
.rdr-wl.dead{color:#5d7a4a;border-bottom:1px dotted #3d5230;cursor:not-allowed}
.rdr-wl.dead:hover{background:none;text-shadow:none;color:#7d7398}
.rdr-body a[href]{color:#39ff14;text-decoration:none;border-bottom:1px solid rgba(57,255,20,.4)}
.rdr-body a[href]:hover{color:#fff;text-shadow:2px 0 #b026ff,-2px 0 #39ff14}

/* ── dossier (infobox) ── */
.rdr-dossier{float:right;width:298px;margin:6px 0 24px 30px;border:1px solid color-mix(in srgb,var(--d) 45%,transparent);
  background:linear-gradient(180deg,rgba(8,4,20,.96),rgba(4,2,12,.96));
  box-shadow:0 0 40px -12px color-mix(in srgb,var(--d) 70%,transparent)}
.rdr-dossier h4{margin:0;padding:9px 13px;font-family:'IBM Plex Mono',monospace;font-size:8.5px;
  letter-spacing:.3em;color:#040010;background:var(--d);text-transform:none}
.rdr-dl{display:flex;gap:10px;padding:8px 13px;border-top:1px solid rgba(123,45,255,.16)}
.rdr-dl dt{flex:0 0 88px;font-size:8.5px;letter-spacing:.12em;color:#6f8a5e;padding-top:2px;text-transform:uppercase}
.rdr-dl dd{margin:0;flex:1;font-size:11px;line-height:1.6;color:#dcf5d4;font-family:'IBM Plex Mono',monospace}

/* ── signal manifest (typed connections) ── */
.rdr-manifest{margin:0 0 30px;border:1px solid rgba(123,45,255,.32);background:rgba(6,3,16,.6)}
.rdr-mhead{display:flex;align-items:center;gap:10px;padding:10px 16px;
  border-bottom:1px solid rgba(123,45,255,.28);font-size:8.5px;letter-spacing:.3em;color:#c9a8ff}
.rdr-mhead b{flex:1;height:1px;background:linear-gradient(90deg,#7b2dff,transparent);opacity:.6}
.rdr-edge{display:grid;grid-template-columns:132px 1fr;gap:0;border-top:1px solid rgba(123,45,255,.14)}
.rdr-edge:first-of-type{border-top:0}
.rdr-edge:hover{background:rgba(123,45,255,.07)}
.rdr-etype{padding:11px 12px;font-size:8px;letter-spacing:.16em;color:var(--e);
  border-right:1px solid color-mix(in srgb,var(--e) 30%,transparent);text-align:right;line-height:1.5}
.rdr-ebody{padding:11px 16px}
.rdr-ebody .t{display:block;font-family:'IBM Plex Mono',monospace;font-size:11.5px;margin-bottom:5px}
.rdr-ebody .c{font-family:'Space Grotesk',sans-serif;font-size:13.2px;line-height:1.7;color:#a9c98f;font-style:italic}

/* ── inbound / footer ── */
.rdr-foot{max-width:1080px;margin:66px auto 0;padding:26px 56px 0;border-top:1px solid rgba(123,45,255,.45);
  position:relative;z-index:2}
.rdr-flabel{font-size:8.5px;letter-spacing:.3em;color:#6f8a5e;margin-bottom:13px}
.rdr-back{display:flex;flex-wrap:wrap;gap:7px}
.rdr-bl{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.05em;color:var(--d);
  border:1px solid color-mix(in srgb,var(--d) 40%,transparent);padding:5px 11px;cursor:pointer;
  background:none;transition:all .12s}
.rdr-bl:hover{background:var(--d);color:#040010;box-shadow:0 0 22px -4px var(--d)}
.rdr-src{margin-top:26px}
.rdr-src div{font-size:9.5px;line-height:1.9;color:#5f7a4e;font-family:'IBM Plex Mono',monospace;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rdr-src div::before{content:'▸ ';color:#7b2dff}

/* ── hover preview for wikilinks ── */
.rdr-pv{position:fixed;z-index:120;width:310px;pointer-events:none;opacity:0;
  border:1px solid var(--d);background:rgba(5,2,14,.98);
  box-shadow:0 0 50px -10px var(--d),0 18px 50px rgba(0,0,0,.75);transition:opacity .11s}
.rdr-pv.on{opacity:1}
.rdr-pv .h{padding:8px 12px;font-size:8.5px;letter-spacing:.26em;color:#040010;background:var(--d)}
.rdr-pv .t{padding:11px 12px 4px;font-family:'Unbounded',sans-serif;font-weight:700;font-size:14px;color:#fff;line-height:1.25}
.rdr-pv .s{padding:0 12px 12px;font-family:'Space Grotesk',sans-serif;font-size:12px;line-height:1.62;color:#a9c98f}
.rdr-pv .m{padding:7px 12px;border-top:1px solid rgba(123,45,255,.28);font-size:8.5px;letter-spacing:.16em;color:#6f8a5e}

/* ── 404 ── */
.rdr-404{padding:120px 56px;text-align:center}
.rdr-404 div:first-child{font-family:'Unbounded',sans-serif;font-weight:900;font-size:54px;color:#b026ff;
  text-shadow:3px 0 #39ff14,-3px 0 #7b2dff;animation:rdrGa 3s steps(1) infinite}
.rdr-404 div:last-child{margin-top:18px;font-size:10px;letter-spacing:.3em;color:#4d6a3c}

@media (max-width:1100px){
  .rdr-dossier{float:none;width:auto;margin:0 0 24px}
  .rdr-head{padding:44px 0 26px}.rdr-body{padding:32px 0 0}
  .rdr-in{padding:0 26px}.rdr-foot{margin:44px auto 0;padding:24px 26px 0}
  .rdr-wm{font-size:clamp(54px,18vw,120px)}
}
@media (prefers-reduced-motion:reduce){
  .rdr-title::before,.rdr-title::after,.rdr-body blockquote.contra::before,.rdr-404 div:first-child{animation:none}
}
`;

  window.WikiReader = {
    RDR_DOM_NEON: DOM_NEON,

    // ── mount ────────────────────────────────────────────────────────────
    // index.html hands us one empty div; everything below it is ours.
    readerRef(el) {
      this._rdrEl = el || null;
      if (!el) return;
      if (!document.getElementById('rdr-css')) {
        const st = document.createElement('style');
        st.id = 'rdr-css';
        st.textContent = CSS;
        document.head.appendChild(st);
      }
      if (el.dataset.built !== '1') this.rdrBuildShell(el);
      this.rdrRenderNav();
      this.renderReaderBody();
    },

    rdrBuildShell(el) {
      el.className = 'rdr';
      el.dataset.built = '1';
      el.innerHTML =
        '<div class="rdr-nav">'
        + '<div class="rdr-srch"><input type="text" spellcheck="false" placeholder="SEARCH THE RECORD"><div class="rdr-count"></div></div>'
        + '<div class="rdr-list"></div>'
        + '</div>'
        + '<div class="rdr-scroll"><div class="rdr-rail"><i></i></div><div class="rdr-art"></div></div>'
        + '<div class="rdr-grain"></div><div class="rdr-mesh"></div><div class="rdr-vig"></div>'
        + this.rdrDrips('l') + this.rdrDrips('r')
        + '<div class="rdr-veil"></div><div class="rdr-track"></div>'
        + '<div class="rdr-pv"></div>';

      this._rdrList = el.querySelector('.rdr-list');
      this._rdrArt = el.querySelector('.rdr-art');
      this._rdrScroll = el.querySelector('.rdr-scroll');
      this._rdrCount = el.querySelector('.rdr-count');
      this._rdrPv = el.querySelector('.rdr-pv');
      this._rdrRail = el.querySelector('.rdr-rail i');

      const input = el.querySelector('.rdr-srch input');
      input.value = this._rdrQ || '';
      input.addEventListener('input', (e) => { this._rdrQ = e.target.value; this.rdrRenderNav(); });

      // one delegated click for nav items, folder toggles, wikilinks and chips
      el.addEventListener('click', (e) => {
        const tog = e.target.closest('[data-tog]');
        if (tog) {
          e.preventDefault();
          const k = tog.getAttribute('data-tog');
          if (!this._rdrOpen) this._rdrOpen = new Set();
          if (this._rdrOpen.has(k)) this._rdrOpen.delete(k); else this._rdrOpen.add(k);
          this._rdrKeepScroll = this._rdrList.scrollTop;
          this.rdrRenderNav();
          if (this._rdrKeepScroll != null) this._rdrList.scrollTop = this._rdrKeepScroll;
          return;
        }
        const t = e.target.closest('[data-go]');
        if (!t) return;
        e.preventDefault();
        this.rdrGo(t.getAttribute('data-go'));
      });

      // wikilink hover previews
      el.addEventListener('mouseover', (e) => {
        const a = e.target.closest('.rdr-wl[data-go]');
        if (a) this.rdrPreview(a);
      });
      el.addEventListener('mouseout', (e) => {
        if (e.target.closest('.rdr-wl')) this._rdrPv.classList.remove('on');
      });

      this._rdrScroll.addEventListener('scroll', () => {
        const s = this._rdrScroll;
        const max = s.scrollHeight - s.clientHeight;
        this._rdrRail.style.width = (max > 20 ? (s.scrollTop / max) * 100 : 0) + '%';
      });
    },

    // one edge's worth of ooze; irregular by construction so the two sides
    // never look like a matched pair
    rdrDrips(side) {
      const seed = side === 'l' ? 7 : 23;
      let s = '<div class="rdr-drips ' + side + '">';
      for (let i = 0; i < 7; i++) {
        const r = (n) => ((Math.sin(seed * (i + 1) * n) + 1) / 2);
        const x = Math.round(2 + r(1.7) * 24);
        const h = Math.round(90 + r(2.3) * 260);
        const dur = (11 + r(3.1) * 16).toFixed(1);
        const del = (r(4.7) * 22).toFixed(1);
        const w = (4 + r(5.3) * 4).toFixed(1);
        s += '<i style="left:' + x + 'px;width:' + w + 'px;--h:' + h + 'px;--dur:' + dur + 's;--del:' + del + 's"></i>';
      }
      return s + '</div>';
    },

    rdrGo(id) {
      if (!this.WK || !this.WK.byId[id]) return;
      this.setState({ section: 'wiki', tab: 'reader', wikiPage: id });
      // state lands async; paint immediately so the click feels instant
      this._rdrForce = id;
      this.rdrRenderNav();
      this.renderReaderBody();
    },

    // ── nav ──────────────────────────────────────────────────────────────
    // Builds a folder tree from the page ids once, then renders it collapsed.
    rdrTree() {
      if (this._rdrTreeCache) return this._rdrTreeCache;
      const mk = (key, label) => ({ key, label, folders: new Map(), pages: [], count: 0 });
      const roots = new Map();
      for (const d of DOMS) roots.set(d, mk(d, d));
      for (const p of this.WK.pages) {
        const seg = p.id.split('/');          // wiki / <domain> / …rest
        const dom = p.domain;
        let node = roots.get(dom);
        if (!node) { node = mk(dom, dom); roots.set(dom, node); }
        const rest = seg.slice(2);
        for (let i = 0; i < rest.length - 1; i++) {
          const key = seg.slice(0, 3 + i).join('/');
          if (!node.folders.has(rest[i])) node.folders.set(rest[i], mk(key, rest[i]));
          node = node.folders.get(rest[i]);
        }
        node.pages.push(p);
      }
      const tally = (n) => {
        n.count = n.pages.length;
        for (const f of n.folders.values()) n.count += tally(f);
        // index pages first, then alphabetical by title
        n.pages.sort((a, b) => {
          const ai = /\/index$/.test(a.id) ? 0 : 1, bi = /\/index$/.test(b.id) ? 0 : 1;
          return ai - bi || a.title.localeCompare(b.title);
        });
        return n.count;
      };
      for (const n of roots.values()) tally(n);
      this._rdrTreeCache = [...roots.values()].filter(n => n.count);
      return this._rdrTreeCache;
    },

    rdrRenderNav() {
      if (!this._rdrList || !this.WK) return;
      const WK = this.WK;
      const active = this._rdrForce || this.state.wikiPage;
      const q = (this._rdrQ || '').trim().toLowerCase();
      if (!this._rdrOpen) this._rdrOpen = new Set();

      // always reveal the path to the page being read
      if (active) {
        const seg = active.split('/');
        for (let i = 2; i < seg.length; i++) this._rdrOpen.add(seg.slice(0, i).join('/').replace(/^wiki\//, '') || seg[1]);
        this._rdrOpen.add(seg[1]);
        for (let i = 3; i <= seg.length - 1; i++) this._rdrOpen.add(seg.slice(0, i).join('/'));
      }

      if (q) { this.rdrRenderSearch(q, active); return; }

      let html = '';
      for (const node of this.rdrTree()) {
        const d = DOM_NEON[node.key] || '#8fa878';
        const open = this._rdrOpen.has(node.key);
        const has = active && active.split('/')[1] === node.key;
        html += '<div class="rdr-grp" style="--d:' + d + '">'
          + '<button class="rdr-drow' + (open ? ' open' : '') + (has ? ' has' : '') + '" data-tog="' + esc(node.key) + '">'
          + '<i>▶</i><s>' + node.label.toUpperCase() + '</s><u>' + node.count + '</u></button>'
          + '<div class="rdr-kids' + (open ? ' open' : '') + '">'
          + (open ? this.rdrBranch(node, active, d) : '')
          + '</div></div>';
      }
      this._rdrList.innerHTML = html;
      this._rdrCount.textContent = WK.pages.length + ' PAGES · ' + WK.typed.length + ' TYPED EDGES';
      this.rdrScrollActiveIntoView();
    },

    // Folders first, then loose pages — a folder stranded under 135 siblings
    // is a folder nobody finds. Long runs of loose pages (people has 135) get
    // bucketed A–Z so no single list is an endless scroll.
    rdrBranch(node, active, d) {
      let s = '';
      for (const f of node.folders.values()) {
        const open = this._rdrOpen.has(f.key);
        s += '<button class="rdr-frow' + (open ? ' open' : '') + '" data-tog="' + esc(f.key) + '">'
          + '<i>▶</i><s>' + esc(f.label.replace(/-/g, ' ')) + '</s><u>' + f.count + '</u></button>'
          + '<div class="rdr-kids' + (open ? ' open' : '') + '">'
          + (open ? this.rdrBranch(f, active, d) : '') + '</div>';
      }
      const pages = node.pages;
      if (pages.length <= 40) {
        for (const p of pages) s += this.rdrNavItem(p, active, d);
        return s;
      }
      const buckets = new Map();
      for (const p of pages) {
        if (/\/index$/.test(p.id)) { s += this.rdrNavItem(p, active, d); continue; }
        const c = (p.title.match(/[a-z0-9]/i) || ['#'])[0].toUpperCase();
        if (!buckets.has(c)) buckets.set(c, []);
        buckets.get(c).push(p);
      }
      // titles that open with punctuation ("Annoying", "New Jim Shaffer") sort
      // ahead of letters, so bucket by first alphanumeric then order A→Z
      const ordered = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      for (const [letter, list] of ordered) {
        const key = node.key + '#' + letter;
        const open = this._rdrOpen.has(key) || list.some(p => p.id === active);
        s += '<button class="rdr-frow ltr' + (open ? ' open' : '') + '" data-tog="' + esc(key) + '">'
          + '<i>▶</i><s>' + letter + '</s><u>' + list.length + '</u></button>'
          + '<div class="rdr-kids' + (open ? ' open' : '') + '">'
          + (open ? list.map(p => this.rdrNavItem(p, active, d)).join('') : '') + '</div>';
      }
      return s;
    },

    rdrNavItem(p, active, d, mark) {
      const col = d || DOM_NEON[p.domain] || '#8fa878';
      const idx = /\/index$/.test(p.id);
      let label = esc(p.title);
      if (mark) {
        const i = p.title.toLowerCase().indexOf(mark);
        if (i >= 0) label = esc(p.title.slice(0, i)) + '<mark>' + esc(p.title.slice(i, i + mark.length))
          + '</mark>' + esc(p.title.slice(i + mark.length));
      }
      return '<button class="rdr-it' + (p.id === active ? ' on' : '') + (idx ? ' idx' : '')
        + '" data-go="' + esc(p.id) + '" style="--d:' + col + '" title="' + esc(p.title) + '">'
        + (idx ? '<span class="k">▣</span>' : '') + label + '</button>';
    },

    rdrRenderSearch(q, active) {
      const WK = this.WK;
      const meta = WK.pages.filter(p =>
        p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
        || (p.summary || '').toLowerCase().includes(q)
        || (p.tags || []).some(t => t.toLowerCase().includes(q))
        || (p.aliases || []).some(a => a.toLowerCase().includes(q)));
      const seen = new Set(meta.map(p => p.id));
      const body = q.length >= 3
        ? WK.pages.filter(p => !seen.has(p.id) && (this.WT[p.id] || '').toLowerCase().includes(q))
        : [];
      let html = '';
      if (!meta.length && !body.length) {
        html = '<div class="rdr-empty">NO SIGNAL.<br>NOTHING IN THE RECORD MATCHES.</div>';
      } else {
        const grp = (list, label, withDomain) => {
          if (!list.length) return '';
          let s = '<div class="rdr-hits">' + label + ' · ' + list.length + '</div>';
          for (const p of list.slice(0, 150)) {
            s += this.rdrNavItem(p, active, DOM_NEON[p.domain], q).replace('</button>',
              '<span class="rdr-sub">' + esc(p.domain) + (withDomain && p.id.split('/').length > 3
                ? ' / ' + esc(p.id.split('/').slice(2, -1).join(' / ')) : '') + '</span></button>');
          }
          return s;
        };
        html = grp(meta, 'TITLE · TAG · ALIAS', true) + grp(body, 'IN PAGE TEXT', true);
      }
      this._rdrList.innerHTML = html;
      this._rdrCount.textContent = (meta.length + body.length) + ' / ' + WK.pages.length + ' PAGES MATCH';
    },

    rdrScrollActiveIntoView() {
      const on = this._rdrList && this._rdrList.querySelector('.rdr-it.on');
      if (!on) return;
      const box = this._rdrList.getBoundingClientRect();
      const r = on.getBoundingClientRect();
      if (r.top < box.top + 8 || r.bottom > box.bottom - 8) {
        this._rdrList.scrollTop += (r.top - box.top) - box.height / 2 + r.height / 2;
      }
    },

    // ── link preview ─────────────────────────────────────────────────────
    rdrPreview(a) {
      const p = this.WK && this.WK.byId[a.getAttribute('data-go')];
      if (!p) return;
      const d = DOM_NEON[p.domain] || '#8fa878';
      const pv = this._rdrPv;
      pv.style.setProperty('--d', d);
      pv.innerHTML =
        '<div class="h">' + esc(p.domain.toUpperCase()) + (p.page_type ? ' // ' + esc(p.page_type.toUpperCase()) : '') + '</div>'
        + '<div class="t">' + esc(p.title) + '</div>'
        + (p.summary ? '<div class="s">' + esc(p.summary.slice(0, 190)) + (p.summary.length > 190 ? '…' : '') + '</div>' : '')
        + '<div class="m">' + (p.words || 0).toLocaleString() + ' WORDS'
        + (p.connections && p.connections.length ? ' · ' + p.connections.length + ' TYPED' : '') + '</div>';
      const r = a.getBoundingClientRect();
      pv.classList.add('on');
      const h = pv.offsetHeight || 150;
      let top = r.bottom + 10;
      if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 10);
      pv.style.top = top + 'px';
      pv.style.left = Math.min(Math.max(10, r.left), window.innerWidth - 322) + 'px';
    },

    // ── markdown ─────────────────────────────────────────────────────────
    // Handles exactly what this corpus contains: h1-h6, tables, blockquotes
    // (incl. the CONTRADICTION callout), bullet/numbered lists, rules, bold,
    // italic, inline code, wikilinks and bare links. No images, HTML blocks,
    // footnotes or fenced code appear anywhere in the 343 pages.
    rdrInline(t) {
      t = esc(t);
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (m, p1, p2) => this.rdrLink(p1, p2));
      t = t.replace(/\[\[([^\]]+)\]\]/g, (m, p1) => this.rdrLink(p1, null));
      t = t.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
      return t;
    },

    rdrLink(path, label) {
      let id = path.trim().replace(/\.md$/, '');
      if (!id.startsWith('wiki/')) id = 'wiki/' + id;
      const p = this.WK && this.WK.byId[id];
      const txt = esc(label || (p ? p.title : path.split('/').pop().replace(/-/g, ' ')));
      if (!p) return '<span class="rdr-wl dead" title="not in the record">' + txt + '</span>';
      return '<a class="rdr-wl" data-go="' + esc(id) + '" style="--d:'
        + (DOM_NEON[p.domain] || '#8fa878') + '">' + txt + '</a>';
    },

    rdrMarkdown(src, opts) {
      const o = opts || {};
      if (src.startsWith('---')) { const e = src.indexOf('\n---', 3); if (e > 0) src = src.slice(e + 4); }
      src = src.replace(/<!--[\s\S]*?-->/g, '');
      const out = [];
      const lines = src.split('\n');
      let i = 0, firstH1 = true, leadDone = false;

      while (i < lines.length) {
        const l = lines[i];

        if (/^\s*\|/.test(l)) {
          const rows = [];
          while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
          const cells = rows.map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
          const body = cells.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)));
          if (!body.length) continue;
          let t = '<div class="rdr-tw"><table><thead><tr>';
          for (const c of body[0]) t += '<th>' + this.rdrInline(c) + '</th>';
          t += '</tr></thead><tbody>';
          for (const r of body.slice(1)) {
            t += '<tr>';
            for (const c of r) t += '<td>' + this.rdrInline(c) + '</td>';
            t += '</tr>';
          }
          out.push(t + '</tbody></table></div>');
          continue;
        }

        if (/^#{1,6}\s/.test(l)) {
          const lv = l.match(/^#+/)[0].length;
          const txt = l.replace(/^#+\s*/, '');
          i++;
          // the masthead already carries the title; drop the duplicate H1
          if (lv === 1 && firstH1) { firstH1 = false; continue; }
          const tag = lv <= 1 ? 'h2' : 'h' + Math.min(6, lv);
          out.push('<' + tag + '>' + this.rdrInline(txt) + '</' + tag + '>');
          continue;
        }

        if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { out.push('<hr>'); i++; continue; }

        if (/^\s*>/.test(l)) {
          const buf = [];
          while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
          const joined = buf.join(' ');
          const contra = /CONTRADICTION/i.test(joined);
          const cleaned = contra
            ? buf.map(b => b.replace(/\*\*CONTRADICTION[^:]*:\*\*\s*/i, '').replace(/CONTRADICTION[^:]*:\s*/i, ''))
            : buf;
          out.push('<blockquote' + (contra ? ' class="contra"' : '') + '>'
            + cleaned.filter(x => x.trim()).map(x => this.rdrInline(x)).join('<br>') + '</blockquote>');
          continue;
        }

        if (/^\s*[-*+]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
          const ordered = /^\s*\d+\./.test(l);
          const buf = [];
          while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
            if (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i])) {
              buf.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
            } else if (buf.length) {
              buf[buf.length - 1] += ' ' + lines[i].trim();
            }
            i++;
          }
          const tag = ordered ? 'ol' : 'ul';
          out.push('<' + tag + '>' + buf.map(b => '<li>' + this.rdrInline(b) + '</li>').join('') + '</' + tag + '>');
          continue;
        }

        if (!l.trim()) { i++; continue; }

        const buf = [];
        while (i < lines.length && lines[i].trim() !== ''
          && !/^(#{1,6}\s|\s*\||\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i])
          && !/^\s*(---+|\*\*\*+)\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        if (!buf.length) continue;
        // first real paragraph gets the drop cap
        const lead = !leadDone && o.lead !== false;
        leadDone = true;
        out.push('<p' + (lead ? ' class="lead"' : '') + '>' + this.rdrInline(buf.join(' ')) + '</p>');
      }
      return out.join('\n');
    },

    // ── article ──────────────────────────────────────────────────────────
    renderReaderBody() {
      const art = this._rdrArt;
      if (!art || !this.WK) return;
      const id = this._rdrForce || this.state.wikiPage;
      this._rdrForce = null;
      const p = this.WK.byId[id];
      const md = this.WT[id];

      if (!p || md == null) {
        art.innerHTML = '<div class="rdr-404"><div>404</div><div>NO SUCH PAGE IN THE RECORD · ' + esc(id || '') + '</div></div>';
        return;
      }
      const d = DOM_NEON[p.domain] || '#8fa878';
      let h = '';

      // ── masthead ──
      h += '<div class="rdr-head" style="--d:' + d + '">';
      h += '<div class="rdr-wm">' + esc(p.domain.toUpperCase()) + '</div>';
      h += '<i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br br2"></i>';
      h += '<div class="rdr-in">';
      h += '<div class="rdr-eyebrow"><em>' + esc(p.domain.toUpperCase()) + '</em>'
        + (p.page_type ? ' <s>//</s> ' + esc(p.page_type.toUpperCase()) : '')
        + (p.status ? ' <s>//</s> ' + esc(p.status.toUpperCase()) : '') + '</div>';
      h += '<h1 class="rdr-title" data-t="' + esc(p.title) + '">' + esc(p.title) + '</h1>';

      const chips = [];
      if (p.drs) chips.push([(p.drs + (p.dre ? ' → ' + p.dre : '')), d]);
      chips.push([(p.words || 0).toLocaleString() + ' WORDS', '#7b2dff']);
      if (p.connections && p.connections.length) chips.push([p.connections.length + ' TYPED EDGES', '#39ff14']);
      if (p.sources && p.sources.length) chips.push([p.sources.length + ' SOURCES', '#00ffa3']);
      if (p.aliases && p.aliases.length) chips.push(['AKA ' + p.aliases.join(' · '), '#ccff00']);
      h += '<div class="rdr-meta">' + chips.map(([t, c]) =>
        '<span class="rdr-chip" style="--c:' + c + '">' + esc(t) + '</span>').join('') + '</div>';
      if (p.tags && p.tags.length) {
        h += '<div class="rdr-tags">' + p.tags.map(t => '<span class="rdr-tag">' + esc(t) + '</span>').join('') + '</div>';
      }
      h += '</div></div><div class="rdr-rule" style="--d:' + d + '"></div>';

      // ── body ──
      h += '<div class="rdr-body" style="--d:' + d + '"><div class="rdr-in">';

      if (p.infobox) {
        const unwl = (s) => String(s).replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
          .replace(/\[\[([^\]]+)\]\]/g, (m, p1) => p1.split('/').pop().replace(/-/g, ' '));
        const rows = Object.entries(p.infobox)
          .filter(([, v]) => v && (typeof v !== 'object' || Array.isArray(v)));
        if (rows.length) {
          h += '<aside class="rdr-dossier"><h4>▚ DOSSIER</h4>';
          for (const [k, v] of rows) {
            h += '<dl class="rdr-dl"><dt>' + esc(k.replace(/_/g, ' ')) + '</dt><dd>'
              + esc(Array.isArray(v) ? v.map(unwl).join(', ') : unwl(v)) + '</dd></dl>';
          }
          h += '</aside>';
        }
      }

      // typed connections — the argued claims are the best content in this
      // corpus, so they lead rather than hide in a list
      if (p.connections && p.connections.length) {
        h += '<div class="rdr-manifest"><div class="rdr-mhead">▚ SIGNAL MANIFEST <b></b>'
          + p.connections.length + ' TYPED</div>';
        for (const c of p.connections) {
          const ec = EDGE_NEON[c.type] || '#8fa878';
          const tgt = this.WK.byId[c.page];
          h += '<div class="rdr-edge" style="--e:' + ec + '">';
          h += '<div class="rdr-etype">' + esc(c.type.toUpperCase()) + '</div><div class="rdr-ebody">';
          h += '<span class="t">' + (tgt
            ? '<a class="rdr-wl" data-go="' + esc(c.page) + '" style="--d:' + (DOM_NEON[tgt.domain] || '#8fa878') + '">' + esc(tgt.title) + '</a>'
            : '<span class="rdr-wl dead">' + esc(c.page) + '</span>') + '</span>';
          if (c.claim) h += '<span class="c">' + this.rdrInline(c.claim) + '</span>';
          h += '</div></div>';
        }
        h += '</div>';
      }

      h += this.rdrMarkdown(md);
      h += '<div style="clear:both"></div></div></div>';

      // ── footer ──
      const back = [...new Set([
        ...this.WK.prose.filter(e => e.b === id).map(e => e.a),
        ...this.WK.typed.filter(e => e.b === id).map(e => e.a)
      ])].filter(b => b !== id && this.WK.byId[b]);

      if (back.length || (p.sources && p.sources.length)) {
        h += '<div class="rdr-foot" style="--d:' + d + '">';
        if (back.length) {
          h += '<div class="rdr-flabel">▚ INBOUND · ' + back.length + ' PAGES POINT HERE</div><div class="rdr-back">';
          for (const b of back) {
            const bp = this.WK.byId[b];
            h += '<button class="rdr-bl" data-go="' + esc(b) + '" style="--d:'
              + (DOM_NEON[bp.domain] || '#8fa878') + '">' + esc(bp.title) + '</button>';
          }
          h += '</div>';
        }
        if (p.sources && p.sources.length) {
          h += '<div class="rdr-src"><div class="rdr-flabel">▚ DRAWN FROM · ' + p.sources.length + ' RAW SOURCES</div>';
          for (const s of p.sources) h += '<div>' + esc(s.replace(/^raw\//, '')) + '</div>';
          h += '</div>';
        }
        h += '</div>';
      }

      art.innerHTML = h;
      if (this._rdrScroll) this._rdrScroll.scrollTop = 0;
      if (this._rdrRail) this._rdrRail.style.width = '0%';
    }
  };
})();
