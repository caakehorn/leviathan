
    ['20. ENTIRE AGREEMENT',
      'These Terms are the entire agreement between you and the Operator concerning the Site, and supersede all prior or contemporaneous understandings. Headings are for convenience only.'],

    ['21. NO ENTRY, NO APPROACH, NO CONTACT',
      'As a condition of access, you covenant and agree that you shall not, at any time, enter upon or remain upon any real property owned, leased, rented, occupied or lawfully controlled by the Operator, including any residence, dwelling, yard, driveway, garage, outbuilding, common area, workplace, place of business, storage unit, or any vehicle owned or operated by the Operator, without the Operator\'s express written consent obtained in advance of each such entry.',
      'Any licence, invitation or permission to enter any such property that you may hold or may be presumed to hold, whether express, implied, customary or arising by course of dealing, is hereby expressly revoked. This paragraph constitutes written notice of that revocation. Entry after such notice is without licence or privilege.',
      'You further agree that you shall not approach, follow, surveil, photograph, record, wait outside, loiter near, or station yourself or any agent within sight of any such property, and that you shall not direct, encourage or procure any other person to do so on your behalf.',
      'You further agree that you shall not initiate contact with the Operator or with any person documented on the Site, by any means, direct or indirect, including in person, by telephone, by message, by electronic means, through any third party, or through any account or identity other than your own.',
      'You acknowledge that a breach of this Section would cause irreparable harm for which money damages would be inadequate, and you consent to the entry of injunctive relief without bond. Nothing in this Section limits any right or remedy the Operator has under any trespass, stalking, harassment, anti-surveillance or protective order statute, all of which are expressly reserved and cumulative.'],

    ['22. CONTACT',
      'Notices to the Operator may be sent to ' + CONTACT + '. The Operator undertakes no obligation to read, acknowledge or respond to them.']
  ];

  window.LVTerms = {
    TITLE: TITLE,
    SECTIONS: SECTIONS,
    VERSION: TOS_VERSION,
    EFFECTIVE: EFFECTIVE,

    accepted: function () {
      try { return localStorage.getItem(TOS_KEY) === TOS_VERSION; } catch (e) { return false; }
    },
    forget: function () {
      try { localStorage.removeItem(TOS_KEY); } catch (e) {}
    },

    // Renders the document into any element, for terms.html.
    render: function (host) {
      var h = document.createElement('h1');
      h.textContent = TITLE;
      host.appendChild(h);
      var eff = document.createElement('p');
      eff.className = 'eff';
      eff.textContent = 'Version ' + TOS_VERSION + ' · Effective ' + EFFECTIVE;
      host.appendChild(eff);
      SECTIONS.forEach(function (sec) {
        var hd = document.createElement('h2');
        hd.textContent = sec[0];
        host.appendChild(hd);
        for (var i = 1; i < sec.length; i++) {
          var p = document.createElement('p');
          p.textContent = sec[i];
          host.appendChild(p);
        }
      });
    },

    // Step zero. Resolves once accepted; never resolves if declined, because
    // declining ends the visit.
    require: function (onEvent) {
      if (this.accepted()) return Promise.resolve(false);   // false = was already accepted
      var self = this;
      return new Promise(function (done) {
        var st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);

        var ov = document.createElement('div');
        ov.id = 'lv-tos';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', TITLE);
        ov.innerHTML = '<div class="bx">'
          + '<div class="tag">⬢ LEVIATHAN · TERMS OF SERVICE</div>'
          + '<div class="doc" tabindex="0"></div>'
          + '<label class="ck"><input type="checkbox"> <span></span></label>'
          + '<div class="row">'
          + '<button type="button" class="no">DECLINE AND LEAVE</button>'
          + '<button type="button" class="yes" disabled>I AGREE — ENTER</button>'
          + '</div>'
          + '<div class="ft"></div>'
          + '</div>';

        self.render(ov.querySelector('.doc'));
        ov.querySelector('.ck span').textContent =
          'I have read these Terms in full, I am at least 18, and I agree to be bound by them, '
          + 'including the arbitration agreement, the class action waiver, and the consents in Sections 6 and 8.';
        ov.querySelector('.ft').textContent =
          'Version ' + TOS_VERSION + ' · Effective ' + EFFECTIVE + ' · Acceptance is recorded on this device.';
        document.body.appendChild(ov);

        var ck = ov.querySelector('input');
        var yes = ov.querySelector('.yes');
        var no = ov.querySelector('.no');

        ck.addEventListener('change', function () { yes.disabled = !ck.checked; });
        yes.addEventListener('click', function () {
          if (!ck.checked) return;
          try { localStorage.setItem(TOS_KEY, TOS_VERSION); } catch (e) { /* private mode: ask again next time */ }
          if (onEvent) onEvent('tos-agreed');
          ov.remove();
          st.remove();
          done(true);   // true = accepted just now
        });
        no.addEventListener('click', function () {
          if (onEvent) onEvent('tos-declined');
          // No licence, so no Site. Replace the document rather than trying to
          // close the tab, which a script is not allowed to do.
          document.title = 'DECLINED';
          document.documentElement.innerHTML =
            '<head><meta charset="utf-8"><title>DECLINED</title></head><body></body>';
          var b = document.body;
          b.setAttribute('style', 'margin:0;min-height:100vh;display:flex;align-items:center;'
            + 'justify-content:center;background:#041206;color:#39ff14;text-align:center;padding:24px;'
            + "font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;letter-spacing:0.24em;line-height:2.2");
          b.textContent = 'TERMS DECLINED — NO LICENCE GRANTED — CLOSE THIS TAB';
        });
        setTimeout(function () { ov.querySelector('.doc').focus(); }, 30);
      });
    }
  };

  var CSS = [
    '#lv-tos{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;',
    'justify-content:center;padding:20px;background:#041206;visibility:visible!important;',
    "font-family:'IBM Plex Mono',ui-monospace,monospace}",
    '#lv-tos::before{content:"";position:absolute;inset:0;pointer-events:none;background:',
    'radial-gradient(ellipse 70% 55% at 20% 16%,rgba(57,255,20,0.16),transparent 66%),',
    'radial-gradient(ellipse 55% 45% at 84% 80%,rgba(176,38,255,0.13),transparent 62%),',
    'radial-gradient(ellipse 45% 38% at 74% 12%,rgba(255,47,157,0.10),transparent 64%)}',
    '#lv-tos .bx{position:relative;z-index:1;width:min(860px,96vw);max-height:94vh;display:flex;',
    'flex-direction:column;gap:14px;border:1px solid rgba(57,255,20,0.55);background:rgba(3,13,7,0.97);',
    'padding:22px 24px;box-shadow:0 0 90px rgba(57,255,20,0.2)}',
    '#lv-tos .tag{font-size:11px;letter-spacing:0.3em;color:#39ff14;text-shadow:0 0 14px rgba(57,255,20,0.7)}',
    '#lv-tos .doc{flex:1;overflow-y:auto;border:1px solid rgba(57,255,20,0.25);background:rgba(0,0,0,0.45);',
    'padding:20px 22px;outline:none}',
    '#lv-tos .doc:focus-visible{border-color:#00b7ff}',
    "#lv-tos h1{font-family:'Space Grotesk',sans-serif;font-size:16px;letter-spacing:0.14em;color:#b6ff8f;",
    'margin:0 0 4px;font-weight:700}',
    '#lv-tos .eff{font-size:9.5px;letter-spacing:0.22em;color:#6f8a5e;margin:0 0 18px}',
    '#lv-tos h2{font-size:10.5px;letter-spacing:0.2em;color:#39ff14;margin:20px 0 8px;font-weight:600}',
    "#lv-tos p{font-family:'Space Grotesk',sans-serif;font-size:12.5px;line-height:1.75;color:#cfe6c4;",
    'margin:0 0 10px;text-wrap:pretty}',
    '#lv-tos .ck{display:flex;gap:10px;align-items:flex-start;font-size:11px;line-height:1.7;color:#e9ffe6;cursor:pointer}',
    '#lv-tos .ck input{margin-top:2px;accent-color:#39ff14;width:15px;height:15px;flex:none;cursor:pointer}',
    '#lv-tos .row{display:flex;gap:10px;flex-wrap:wrap}',
    '#lv-tos button{flex:1 1 200px;cursor:pointer;font-family:inherit;font-weight:700;font-size:11px;',
    'letter-spacing:0.2em;padding:13px}',
    '#lv-tos .yes{background:#39ff14;border:1px solid #39ff14;color:#041206}',
    '#lv-tos .yes:hover:not([disabled]){background:#b6ff8f}',
    '#lv-tos .yes[disabled]{opacity:0.35;cursor:not-allowed}',
    '#lv-tos .no{background:none;border:1px solid rgba(255,47,157,0.6);color:#ff86c9}',
    '#lv-tos .no:hover{background:rgba(255,47,157,0.14);border-color:#ff2f9d}',
    '#lv-tos .ft{font-size:9px;letter-spacing:0.18em;color:#4f8a63;line-height:1.8}',
    '@media (max-width:640px){#lv-tos .bx{padding:16px 14px}#lv-tos .doc{padding:14px 15px}}'
  ].join('');
})();
