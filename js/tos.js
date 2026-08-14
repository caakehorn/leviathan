// LEVIATHAN · TERMS OF SERVICE — step zero, in front of everything.
//
// One document, two surfaces: terms.html renders it in the open (terms you
// cannot read before agreeing to them are not terms), and LVTerms.require()
// serves it as a blocking acceptance dialog before the gate. Acceptance is
// recorded in localStorage under TOS_KEY, keyed to TOS_VERSION — bump the
// version and every device is asked again.
(function () {
  if (window.LVTerms) return;

  var TOS_VERSION = '1.0';
  var EFFECTIVE = 'JULY 27, 2026';
  var TOS_KEY = 'lv.tos.accepted';
  var TITLE = 'TERMS OF SERVICE — VOID + LEVIATHAN';
  var CONTACT = 'dfrank88@gmail.com';

  // Each entry: [heading, paragraph, paragraph, ...]. Plain strings only —
  // everything is rendered with textContent, never innerHTML.
  var SECTIONS = [
    ['1. ACCEPTANCE OF THESE TERMS',
      'This website, together with all pages, subpages, archives, consoles, documents, data files and tools served from this deployment (the "Site"), is operated by its owner (the "Operator"). By accessing or using the Site in any way you agree to be bound by these Terms of Service (the "Terms"). If you do not agree to every provision of these Terms, you are not licensed to access the Site and must leave immediately.',
      'Acceptance is indicated affirmatively, by checking the acceptance box and selecting "I AGREE — ENTER". Continued access after acceptance constitutes continuing agreement. These Terms are presented in full before any access is granted.'],

    ['2. ELIGIBILITY',
      'The Site is offered only to persons who are at least 18 years of age and who have the legal capacity to enter into a binding contract. By accepting these Terms you represent and warrant that you meet both conditions.'],

    ['3. LICENCE',
      'Subject to your complete and continuing compliance with these Terms, the Operator grants you a personal, revocable, non-exclusive, non-transferable, non-sublicensable licence to view the Site in a standard web browser for private, non-commercial purposes only. No other right or licence is granted. The Operator may revoke this licence at any time, for any reason or no reason, with or without notice.'],

    ['4. THE MATERIAL',
      'The Site is a personal archive. It contains documentary, expressive and editorial material assembled by the Operator, including quotation, commentary, criticism, satire and opinion. Opinion is presented as opinion. Nothing on the Site is presented as, or should be relied upon as, legal, medical, financial or professional advice.'],

    ['5. INTELLECTUAL PROPERTY',
      'The Site and its original content, arrangement, selection, code and design are the property of the Operator and are protected by copyright and other laws. You may not copy, reproduce, republish, upload, post, transmit, scrape, mirror, frame, distribute or create derivative works from any part of the Site without the Operator\'s prior written consent, except as strictly necessary for ordinary browser rendering.'],

    ['6. CONSENT TO RECORDING AND LOGGING',
      'You consent to the collection and retention of technical records of your visit, including without limitation your IP address, user-agent string, device characteristics, referrer, timestamps, pages requested, inputs submitted to any interactive element of the Site, and analytics events. You consent to the Operator\'s use and retention of those records for security, audit, evidentiary and legal purposes, and to their disclosure to legal counsel, courts and law enforcement.',
      'If you do not consent to this Section, do not accept these Terms and do not use the Site.'],

    ['7. PROHIBITED CONDUCT',
      'You shall not: (a) probe, scan, or test the vulnerability of the Site or circumvent any access control, passphrase gate, or encryption; (b) use any robot, spider, scraper, or automated means to access the Site; (c) impersonate any person or misrepresent your identity or affiliation; (d) use the Site or anything on it to harass, threaten, stalk, or intimidate any person; (e) republish any portion of the Site out of context or in a manner designed to mislead; (f) interfere with the operation of the Site or the enjoyment of it by any other authorised visitor.'],

    ['8. CONSENT TO CONTACT AND PROCESS',
      'You consent to receive notices from the Operator at any address, account or identity from which you have contacted the Operator or accessed the Site. You agree that notice delivered to any such address, account or identity is effective notice for all purposes, including service of pre-suit demand letters and preservation notices, to the fullest extent permitted by law.',
      'If you do not consent to this Section, do not accept these Terms and do not use the Site.'],

    ['9. PRIVACY',
      'The Site sets local values on your device (localStorage and sessionStorage) to record your acceptance of these Terms and the state of the access gate. Clearing your browser\'s site data removes them and withdraws your recorded acceptance. Third-party analytics, where present, are governed by their own terms.'],

    ['10. NO WARRANTY',
      'THE SITE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY OR AVAILABILITY. THE OPERATOR DOES NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE OR SECURE.'],

    ['11. LIMITATION OF LIABILITY',
      'TO THE FULLEST EXTENT PERMITTED BY LAW, THE OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, GOODWILL OR EMOTIONAL TRANQUILLITY, ARISING OUT OF OR RELATING TO YOUR ACCESS TO OR USE OF, OR INABILITY TO ACCESS OR USE, THE SITE. THE OPERATOR\'S TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SITE SHALL NOT EXCEED ONE UNITED STATES DOLLAR (US $1.00).'],

    ['12. INDEMNIFICATION',
      'You agree to defend, indemnify and hold harmless the Operator from and against any and all claims, damages, losses, liabilities, costs and expenses (including reasonable attorneys\' fees) arising out of or relating to your use of the Site, your violation of these Terms, or your violation of any right of any third party.'],

    ['13. ARBITRATION AGREEMENT',
      'PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR RIGHTS. Except for claims properly brought in small-claims court and claims for injunctive relief under Section 21, any dispute, claim or controversy arising out of or relating to these Terms or the Site shall be resolved exclusively by binding individual arbitration administered by a mutually agreed arbitrator under the rules of the American Arbitration Association, seated in the Operator\'s county of residence. Judgment on the award may be entered in any court of competent jurisdiction. YOU AND THE OPERATOR EACH WAIVE THE RIGHT TO A TRIAL BY JURY.'],

    ['14. CLASS ACTION WAIVER',
      'ALL CLAIMS MUST BE BROUGHT IN THE PARTIES\' INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate more than one person\'s claims.'],

    ['15. GOVERNING LAW AND VENUE',
      'These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard to its conflict-of-laws rules. For any matter not subject to arbitration, you consent to the exclusive jurisdiction and venue of the state and federal courts located in Pennsylvania.'],

    ['16. TERMINATION',
      'The Operator may suspend or terminate your access to the Site at any time, with or without cause and with or without notice. Sections 4 through 22 survive any termination of these Terms or of your access.'],

    ['17. CHANGES TO THESE TERMS',
      'The Operator may revise these Terms at any time by posting a new version with a new version number and effective date. Your acceptance is recorded against the version you accepted; a new version will be presented for acceptance before further access is granted.'],

    ['18. SEVERABILITY',
      'If any provision of these Terms is held invalid or unenforceable, that provision shall be enforced to the maximum extent permissible and the remaining provisions shall remain in full force and effect. If the class action waiver in Section 14 is found unenforceable as to a particular claim, then that claim, and only that claim, shall proceed in court rather than in arbitration.'],

    ['19. NO WAIVER; ASSIGNMENT',
      'No failure or delay by the Operator in exercising any right under these Terms operates as a waiver of it. You may not assign these Terms or any rights under them; the Operator may assign freely.'],

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
            + 'justify-content:center;background:#0b0219;color:#00e1ff;text-align:center;padding:24px;'
            + "font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;letter-spacing:0.24em;line-height:2.2");
          b.textContent = 'TERMS DECLINED — NO LICENCE GRANTED — CLOSE THIS TAB';
        });
        setTimeout(function () { ov.querySelector('.doc').focus(); }, 30);
      });
    }
  };

  var CSS = [
    '#lv-tos{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;',
    'justify-content:center;padding:20px;background:#0b0219;visibility:visible!important;',
    "font-family:'IBM Plex Mono',ui-monospace,monospace}",
    '#lv-tos::before{content:"";position:absolute;inset:0;pointer-events:none;background:',
    'radial-gradient(ellipse 70% 55% at 20% 16%,rgba(0,225,255,0.16),transparent 66%),',
    'radial-gradient(ellipse 55% 45% at 84% 80%,rgba(176,38,255,0.13),transparent 62%),',
    'radial-gradient(ellipse 45% 38% at 74% 12%,rgba(255,47,191,0.10),transparent 64%)}',
    '#lv-tos .bx{position:relative;z-index:1;width:min(860px,96vw);max-height:94vh;display:flex;',
    'flex-direction:column;gap:14px;border:1px solid rgba(0,225,255,0.55);background:rgba(14,3,32,0.97);',
    'padding:22px 24px;box-shadow:0 0 90px rgba(0,225,255,0.2)}',
    '#lv-tos .tag{font-size:11px;letter-spacing:0.3em;color:#00e1ff;text-shadow:0 0 14px rgba(0,225,255,0.7)}',
    '#lv-tos .doc{flex:1;overflow-y:auto;border:1px solid rgba(0,225,255,0.25);background:rgba(0,0,0,0.45);',
    'padding:20px 22px;outline:none}',
    '#lv-tos .doc:focus-visible{border-color:#b026ff}',
    "#lv-tos h1{font-family:'Chakra Petch',sans-serif;font-size:16px;letter-spacing:0.14em;color:#7ff4ff;",
    'margin:0 0 4px;font-weight:700}',
    '#lv-tos .eff{font-size:9.5px;letter-spacing:0.22em;color:#7a5aa8;margin:0 0 18px}',
    '#lv-tos h2{font-size:10.5px;letter-spacing:0.2em;color:#00e1ff;margin:20px 0 8px;font-weight:600}',
    "#lv-tos p{font-family:'Chakra Petch',sans-serif;font-size:12.5px;line-height:1.75;color:#d6bcf5;",
    'margin:0 0 10px;text-wrap:pretty}',
    '#lv-tos .ck{display:flex;gap:10px;align-items:flex-start;font-size:11px;line-height:1.7;color:#f0e2ff;cursor:pointer}',
    '#lv-tos .ck input{margin-top:2px;accent-color:#00e1ff;width:15px;height:15px;flex:none;cursor:pointer}',
    '#lv-tos .row{display:flex;gap:10px;flex-wrap:wrap}',
    '#lv-tos button{flex:1 1 200px;cursor:pointer;font-family:inherit;font-weight:700;font-size:11px;',
    'letter-spacing:0.2em;padding:13px}',
    '#lv-tos .yes{background:#00e1ff;border:1px solid #00e1ff;color:#0b0219}',
    '#lv-tos .yes:hover:not([disabled]){background:#7ff4ff}',
    '#lv-tos .yes[disabled]{opacity:0.35;cursor:not-allowed}',
    '#lv-tos .no{background:none;border:1px solid rgba(255,47,191,0.6);color:#ff9de8}',
    '#lv-tos .no:hover{background:rgba(255,47,191,0.14);border-color:#ff2fbf}',
    '#lv-tos .ft{font-size:9px;letter-spacing:0.18em;color:#7a5aa8;line-height:1.8}',
    '@media (max-width:640px){#lv-tos .bx{padding:16px 14px}#lv-tos .doc{padding:14px 15px}}'
  ].join('');
})();
