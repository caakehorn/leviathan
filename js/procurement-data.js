// LEVIATHAN · PROCUREMENT — the evidence pool
//
// Every record below is a citation, not a claim. The five instruments in
// js/procurement.js do nothing but order this pool, count it, and read it back
// verbatim. Nothing here is inferred, summarised into a new fact, or softened:
// where the underlying wiki flags a line as unresolved, dossier-only, or
// contradicted, the flag travels with the line and shows up in the feed.
//
// SOURCE. Everything is drawn from the public wiki at
// github.com/caakehorn/wiki-brain (served at caakehorn.github.io/wiki-brain and
// shipped unencrypted in this repo as data/wiki-data.json). That is why this
// page needs no passphrase: it quotes nothing the wiki does not already quote
// in the open. The `page` field on each record is the wiki page that carries
// it, so any line here can be walked back to its source in one hop.
//
// TIERS. The provenance ladder is the wiki's own, extended by one rung
// (THREAD) for lines the wiki places in a named message export but does not
// publish a per-row direction tag for:
//
//   RAW-CSV   verbatim row located in an on-disk message CSV — file + timestamp
//             + direction all published
//   RAW-DUMP  verbatim row in the raw pipe-delimited all_imessages dump
//   THREAD    verbatim line quoted from a named message export, attributed by
//             the wiki to a speaker, per-row direction tag not published
//   WIKI      a finding stated on a wiki page, sourced there but not reduced to
//             a single quoted row
//   DOSSIER   transcribed in a dossier/markdown source, not independently
//             located in an on-disk export — secondary until a primary row is
//             found
//   DERIVED   an aggregate count, not recomputed from raw in the cited pass
//
// The last two are weak on purpose, and the PROVENANCE instrument sorts them
// last so a reader can see exactly how much of the case rests on them.
(function () {
  // weight = how hard the evidence is. Drives the PROOF volume lane and the
  // ordering in PROVENANCE. It is a display of confidence, not a measurement.
  const TIER_W = { 'RAW-CSV': 4, 'RAW-DUMP': 4, THREAD: 3, WIKI: 2, DOSSIER: 1, DERIVED: 1 };

  // lane keys, used by the instruments to bin records
  //   init     she asks for, goes to get, or arranges a substance
  //   node     she operates a supplier relationship of her own
  //   broker   she routes someone else's request
  //   offer    he offers or delivers, unprompted or on request
  //   hold     he withholds supply as leverage or punishment
  //   her      her own account of herself, in her own words
  //   third    someone else routes a request through her
  //   witness  a statement about her by someone who is neither of them
  //   hostile  Dan turning on her, in his own words
  //   adverse  a finding the record publishes against Dan
  //   ctx      context: money, employment, structure

  const R = [
    // ---------------------------------------------------------------
    // BEFORE THE RELATIONSHIP, AND HOW IT STARTED
    // ---------------------------------------------------------------
    {
      d: '2014-06', approx: true, lane: 'node', who: 'annie', tier: 'DOSSIER',
      tag: 'ORIGIN ACCOUNT · SHE IS THE SELLER',
      text: 'Alexis, as Annie’s coworker, sending Dan to buy drugs from her, with the two of them hooking up during the transaction.',
      src: 'CATO_BOOTLOADER_DANFRANK.md', dir: 'dossier prose, dated loosely "~2014-15"',
      page: 'wiki/people/annie-ulmer',
      note: 'FLAGGED BY THE WIKI: contradicts the corpus-anchored Nov 28 2015 start, which is the stronger source. Kept on record rather than discarded. If it happened at all, the first drug transaction between them ran from her to him.'
    },
    {
      d: '2015-01', approx: true, lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'HER ACCOUNT OF THE YEARS BEFORE HIM',
      text: 'That’s when I started camming. Because I didn’t care about myself. I wanted to be looked at.',
      src: 'wiki/people/annie-ulmer · "Before Dan"', dir: 'Annie, unprompted, more than once',
      page: 'wiki/people/annie-ulmer',
      note: 'Her own framing of a dissociative period following her prior relationship — a trajectory already running before Dan was introduced to her. Not procurement; establishes that the self-destructive arc is not his authorship.'
    },

    // ---------------------------------------------------------------
    // 2018–19 · THE JOHNNY ERA — her own supplier, her own runs
    // Thread: +1 724 920 4125 (Annie handle) / imessage_7249204125_both_all_now.csv
    // The wiki attributes these lines to Annie's facilitation on both
    // wiki/people/johnny-dealer and wiki/mind/synthesis/supply-network.
    // ---------------------------------------------------------------
    {
      d: '2018-04-14', lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SUPPLY FAILURE, REPORTED BY HER',
      text: 'Johnny is mia. “Joby is in hospital”.',
      k: 'chase',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2018-11-27', lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'SHE IS INSIDE THE TRADE, AND JOKING ABOUT IT',
      text: 'have fun don’t forget to pull out',
      src: 'wiki/people/emaly-minerd · the in-person window',
      dir: 'Annie → Dan, texted from inside the apartment while he ran pills out to a buyer’s car',
      page: 'wiki/people/emaly-minerd',
      note: 'Nov 27 2018. Dan is selling adderall to Emaly Minerd at the couple’s own address. Annie’s documented reaction is a joke, not an objection.'
    },
    {
      d: '2018-12-01', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE GOES TO THE SOURCE',
      text: 'I’m going to get something from johnny',
      k: 'travel',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: 'The wiki’s window for this cluster is 2018-12 through 2019.'
    },
    {
      d: '2018-12-10', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE IS AT THE DEALER’S HOUSE',
      text: 'I’m at Johnny’s',
      k: 'travel',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2018-12-20', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE SETS THE PICKUP',
      text: 'Seeing Johnny now',
      k: 'travel',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2019-01-05', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE ROUTES THE MONEY',
      text: 'Drop money with Johnny',
      k: 'pay',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2019-01-20', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE PLACES THE ORDER, BY SIZE',
      text: 'tell Johnny to have 100 ready',
      k: 'pay',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2019-02-10', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'THE DEALER CONTACTS HER, NOT HIM',
      text: 'Johnny just asked me to call him?',
      k: 'chase',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2019-02-20', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE WAITS ON HIS SCHEDULE',
      text: 'I’m waiting at my moms for Johnny to get ready',
      k: 'travel',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2019-03-01', approx: true, lane: 'broker', who: 'annie', tier: 'THREAD',
      tag: 'SHE INTRODUCES A NEW BUYER',
      text: 'introduce her to Johnny',
      k: 'broker',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer',
      note: 'Brokerage, not consumption: the request is to bring somebody else into the node.'
    },
    {
      d: '2019-04-15', lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'HER CARD, HIS ACCESS',
      text: 'Remember Johnny had my card',
      k: 'pay',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer',
      note: 'The wiki logs the incident as "Johnny had my card and got money out after midnight" — a credit relationship of her own with the supplier.'
    },
    {
      d: '2019-05-03', lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE TAKES THE LOSS HERSELF',
      text: 'got completely beat by johnny',
      k: 'chase',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer',
      note: 'Being "beat" is a principal’s complaint — a courier does not absorb the loss.'
    },
    {
      d: '2019-05-30', lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE CHASES A DEAD LINE',
      text: 'johnny phone still has been off',
      k: 'chase',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer', note: ''
    },
    {
      d: '2019-08-01', lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE MOVES AHEAD OF A SUPPLY GAP',
      text: 'Anddddd Johnny is leaving for vacation tonight. I’m going to get 1.',
      k: 'travel',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer',
      note: 'Anticipatory buying against an announced outage — the behaviour of someone managing her own supply.'
    },
    {
      d: '2019-08-02', approx: true, lane: 'node', who: 'annie', tier: 'THREAD',
      tag: 'SHE PRICES THE DEAL',
      text: 'I just got back from Johnny. Got a “80” for 70',
      k: 'pay',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'Annie thread',
      page: 'wiki/people/johnny-dealer',
      note: 'She reports the transaction, the unit and the discount. The wiki logs her follow-on — "Whatever that means" — which is the only softening anywhere in this cluster.'
    },
    {
      d: '2019-08-03', approx: true, lane: 'ctx', who: 'dan', tier: 'THREAD',
      tag: 'HIS SIDE OF THE SAME OUTAGE',
      text: 'I have no other person I can get z from. Johnny leaving for the beach.',
      src: 'imessage_7249204125_both_all_now.csv', dir: 'attributed to Dan',
      page: 'wiki/people/johnny-dealer',
      note: 'Included against interest: his own dependence on the same node is the constant of the whole record. "z" is the suboxone line he has been on daily since Feb 17 2010.'
    },
    {
      d: '2018-07-01', approx: true, lane: 'broker', who: 'third', tier: 'DOSSIER',
      tag: 'A THIRD PARTY ROUTES A REQUEST THROUGH HER',
      text: 'You should put in a word with your boy Johnny for me and give me his number so I can procure party supplies for my birthday celebration this weekend',
      k: 'broker',
      src: 'LIFE_EVENTS_CALENDAR.md', dir: 'attributed to Ally Lubin, routed via Annie — the wiki marks the routing with a question mark',
      page: 'wiki/people/johnny-dealer',
      note: 'FLAGGED: dossier-only, and the wiki itself writes "Ally Lubin via Annie?" rather than asserting it.'
    },

    // ---------------------------------------------------------------
    // 2024 · THE INVERSION — she earns, he is the dependent
    // ---------------------------------------------------------------
    {
      d: '2024-10-12', approx: true, lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'HER OWN ACCOUNT, THE DAY OF',
      text: 'Numb. I’m cool',
      src: 'wiki/people/annie-ulmer · the October 2024 incident', dir: 'Annie',
      page: 'wiki/people/annie-ulmer',
      note: 'Her description of being exhausted and chemically depleted — and choosing to proceed anyway. The earlier reading of that night as coercion is one the wiki has since retracted.'
    },
    {
      d: '2024-10-13', approx: true, lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'SHE RE-AFFIRMS THE NEXT DAY',
      text: 'I enjoy doing these things I promise... I am happy that you find pleasure in these things I honestly do Dan',
      src: 'wiki/people/annie-ulmer', dir: 'Annie → Dan, the following day',
      page: 'wiki/people/annie-ulmer', note: ''
    },
    {
      d: '2024-10-20', approx: true, lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'HER INTERIOR STATE, EIGHT DAYS LATER',
      text: 'I’ve lost all morals at this point… I don’t care or feel anything anymore',
      src: 'wiki/people/annie-ulmer', dir: 'Annie',
      page: 'wiki/people/annie-ulmer',
      note: 'Four months before the move to Uniontown, and ten months before any supply relationship with Dan existed.'
    },
    {
      d: '2024-11-03', lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'HER RETROSPECTIVE ON THE ARRANGEMENT',
      text: 'I did enjoy our relationship/situation/arrangement we had with him',
      src: 'wiki/people/annie-ulmer', dir: 'Annie, November 3 2024',
      page: 'wiki/people/annie-ulmer', note: ''
    },
    {
      d: '2024-11-15', lane: 'ctx', who: 'annie', tier: 'WIKI',
      tag: 'SHE IS THE EARNER, COMPLAINING ABOUT HIS USE',
      text: 'I WORK 6 FUCKING DAYS A WEEK... You worry about having drugs. That’s it',
      src: 'wiki/people/annie-ulmer · "What the money did"', dir: 'Annie → Dan, November 15 2024',
      page: 'wiki/people/annie-ulmer',
      note: 'In 2024 Annie was the household’s sole earner — rent, phone, a PNC loan, and the shared drug budget — after Dan’s involuntary Au Za’atar exit. The direction of dependency in this year runs the other way.'
    },

    // ---------------------------------------------------------------
    // FEB 2025 · THE MOVE SHE CHOSE
    // ---------------------------------------------------------------
    {
      d: '2025-02-20', approx: true, lane: 'ctx', who: 'annie', tier: 'WIKI',
      tag: 'SHE ENDS THE SHARED HOUSEHOLD, AND DECLINES THE ALTERNATIVE',
      text: 'Annie unilaterally ended eight years of shared living and returned to her parents’ house in Uniontown — and declined Dan’s open-ended offer to fund an apartment of her choosing instead.',
      src: 'wiki/people/annie-ulmer · "The move that solved nothing"', dir: 'wiki finding',
      page: 'wiki/people/annie-ulmer',
      note: 'The dependency that defines the terminal phase begins with a move she made and an offer she refused. Every condition that later made her reliant on his supply is downstream of this.'
    },
    {
      d: '2025-02-22', lane: 'her', who: 'annie', tier: 'RAW-DUMP',
      tag: 'HER OWN ATTRIBUTION OF CAUSE',
      text: 'I feel so alone… I am so sorry i caused this disaster',
      src: 'all_imessages_complete_dump.txt', dir: '2025-02-22 20:46:33 | Received',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict', note: ''
    },

    // ---------------------------------------------------------------
    // AUG 2025 – MAY 2026 · THE TERMINAL WINDOW
    // ---------------------------------------------------------------
    {
      d: '2025-10-26', lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'SELF-CONDEMNATION, UNPROMPTED',
      text: 'I hate myself and I hate the person I have become',
      src: 'wiki/people/annie-ulmer', dir: 'Annie, October 26 2025',
      page: 'wiki/people/annie-ulmer',
      note: 'One of forty-six documented instances across seven months. The wiki’s own softer reading: someone watching herself do things she knows are wrong and unable to stop.'
    },
    {
      d: '2026-01-24', lane: 'offer', who: 'dan', tier: 'RAW-CSV',
      tag: 'WHAT ARRIVED, AND FROM WHOM',
      text: 'Tom showed uo at 2am with a half ounce of z and a bunch of ketaminenlol',
      src: 'imessage_2124702449_both_all_now.csv', dir: '2026-01-24 07:54:29 | Sent',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'Tom is the supplier. Dan is a customer relaying what a customer got.'
    },
    {
      d: '2026-01-24', lane: 'offer', who: 'dan', tier: 'RAW-CSV',
      tag: 'THE GRAMMAR OF THE OFFER',
      text: 'I grabbed some ketamine for us but if you want some of the other stuff you shoukld come soon he probably give you some to take',
      src: 'imessage_2124702449_both_all_now.csv', dir: '2026-01-24 10:15:16 | Sent',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: '"if you want" · "you should come" · "he probably give you some". An invitation conditioned on her wanting it and her driving to it. Nothing in the sentence is a push.'
    },
    {
      d: '2026-02-07', lane: 'her', who: 'annie', tier: 'WIKI',
      tag: 'SELF-CONDEMNATION, UNPROMPTED',
      text: 'I don’t know what’s going on, what the hell is wrong with me, why can’t I communicate',
      src: 'wiki/people/annie-ulmer', dir: 'Annie, February 7 2026',
      page: 'wiki/people/annie-ulmer', note: ''
    },
    {
      d: '2026-03-10', lane: 'her', who: 'annie', tier: 'RAW-CSV',
      tag: 'HER CHARACTER REFERENCE FOR HERSELF',
      text: 'Dan you know that I am always completely understanding and try to be as helpful as I can when you are going through this',
      src: 'imessage_2124702449_both_all_now.csv', dir: '2026-03-10 18:56:39 | Received',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'Sent mid-burst, on a night Dan’s own suboxone source had just refused him and he sent 37 unanswered messages in two hours.'
    },
    {
      d: '2026-03-11', lane: 'init', who: 'annie', tier: 'RAW-CSV',
      tag: 'THE CENTRAL EXHIBIT · SHE OPENS THE RE-ENTRY WITH THE ASK',
      text: 'So is there anything I can get for you or your mom at the gas station so I can get a line or two. You can tell me no',
      src: 'imessage_2124702449_both_all_now.csv', dir: '2026-03-11 17:25:03 | Received',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'Seventeen hours after his most contained goodbye on record. She initiates. She proposes the errand as the consideration. And she writes his right of refusal into the message herself — "You can tell me no" — which is not a sentence anyone under coercion composes.'
    },
    {
      d: '2026-03-12', lane: 'offer', who: 'dan', tier: 'WIKI',
      tag: 'HOLDING THE CONFESSION, HE STILL DRIVES',
      text: 'Ok let me get the keys',
      src: 'wiki/people/annie-ulmer · "March 2026: the confession"',
      dir: 'Dan, minutes after Annie answered "YES" twice under sustained pressure',
      page: 'wiki/people/annie-ulmer',
      note: 'The single moment in the record where withholding would have been justified, expected, and effective. His first move was another delivery run.'
    },
    {
      d: '2026-03-13', approx: true, lane: 'offer', who: 'dan', tier: 'WIKI',
      tag: 'DELIVERY, HOURS AFTER THE WORST THING HE SAID',
      text: 'So tomorrow you’re going to come pick up your clippers and I will get you what you want from bop one last time',
      src: 'wiki/people/annie-ulmer', dir: 'Dan, hours after telling her "I hope you someday realize how much you really did ruin my life"',
      page: 'wiki/people/annie-ulmer',
      note: 'The hostility and the provision are hours apart and unlinked. Supply never became the instrument of the anger.'
    },
    {
      d: '2026-03-09', lane: 'hostile', who: 'dan', tier: 'RAW-CSV',
      tag: 'HIS APOLOGY, TWO DAYS BEFORE THE ASK',
      text: 'i’m very sorry. that last message is not your problem…',
      src: 'imessage_2124702449_both_all_now.csv', dir: '2026-03-09 20:24:34 | sent',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'His in-window "I’m sorry" count is 121 against 74 "fuck you". Both numbers are on the same page and both are his.'
    },
    {
      d: '2026-03-13', approx: true, lane: 'hostile', who: 'dan', tier: 'WIKI',
      tag: 'THE WORST THING HE SAID — AND THE DELIVERY THAT FOLLOWED IT',
      text: 'I hope you someday realize how much you really did ruin my life',
      src: 'wiki/people/annie-ulmer', dir: 'Dan, hours before the "one last time" supply run',
      page: 'wiki/people/annie-ulmer',
      note: 'Paired deliberately with the clippers message. This is what the hostility looked like at full volume, and it changed nothing about what he handed over.'
    },
    {
      d: '2026-05-05', lane: 'hostile', who: 'dan', tier: 'RAW-CSV',
      tag: 'HOSTILITY, SAME DAY AS A COLLECTION',
      text: 'stay away from me you liar I can not believe you would give someone else your location after what you did to me',
      src: 'imessage_2124702449_both_all_now.csv', dir: '2026-05-05 15:09:50 | sent',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: '"Stay away from me" at 3:09 PM on the same day she arrived, collected supply, and left.'
    },
    {
      d: '2026-06-01', lane: 'hostile', who: 'dan', tier: 'RAW-CSV',
      tag: 'HOSTILITY AT THE END',
      text: 'You are not capable of love and I really did try to not make you look like the treacherous person you are.',
      src: 'THE END FIGHT.csv', dir: '2026-06-01 00:24:59 | Sent',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict', note: ''
    },
    {
      d: '2026-03-16', lane: 'hold', who: 'record', tier: 'WIKI',
      tag: 'THE COUNT THAT DEFINES THE LANE',
      text: 'Not one documented instance, across the entire window, of Dan withholding the drug supply as leverage or punishment — including hours after his own most hostile outbursts. His provision was unconditional in practice.',
      src: 'wiki/people/annie-ulmer · "What Dan’s side did"', dir: 'wiki finding, Aug 2025 – Mar 2026 window',
      page: 'wiki/people/annie-ulmer',
      note: 'Stated on the page whose verdict is that Annie is the primary agent of harm — and stated there against the interest of the person the page is defending, because the same sentence continues: "and it is also the reason nothing in this relationship ever imposed a real cost on Annie’s behavior."'
    },
    {
      d: '2026-05-04', lane: 'init', who: 'annie', tier: 'WIKI',
      tag: 'WARMTH, THEN THE ASK, NEXT MORNING',
      text: 'On May 4, warmth the prior evening was followed the next morning by a cardless-ATM-code request.',
      src: 'wiki/timeline/events/april-may-2026-final-weeks', dir: 'wiki finding',
      page: 'wiki/timeline/events/april-may-2026-final-weeks',
      note: 'FLAGGED: that page is sourced from a single chat-analysis session and says so; its dated, quoted messages are separately raw-verified, the surrounding claims are not.'
    },
    {
      d: '2026-05-05', lane: 'init', who: 'annie', tier: 'WIKI',
      tag: 'THE REQUEST PRECEDES THE JOB ANNOUNCEMENT',
      text: 'Annie mentions starting work at "Marucas" on the morning of May 5 — in the same message exchange where she opens with a drug-supply-chain logistics request, meaning the request preceded the job announcement in sequence.',
      src: 'wiki/timeline/events/april-may-2026-final-weeks', dir: 'wiki finding',
      page: 'wiki/timeline/events/april-may-2026-final-weeks', note: ''
    },
    {
      d: '2026-05-05', lane: 'init', who: 'annie', tier: 'WIKI',
      tag: 'SHE DRIVES TO IT, COLLECTS, AND LEAVES',
      text: 'On May 5, Annie arrived without her phone, collected supply, and left.',
      src: 'wiki/timeline/events/april-may-2026-final-weeks', dir: 'wiki finding',
      page: 'wiki/timeline/events/april-may-2026-final-weeks', note: ''
    },
    {
      d: '2026-05-06', lane: 'ctx', who: 'annie', tier: 'WIKI',
      tag: 'SHE ENDS HER OWN DEPENDENCY, THEN ENDS IT',
      text: 'Her May 2026 job at "Marucas," reducing her dependency weeks before the June 1 closure, belongs in any account of why the end became possible.',
      src: 'wiki/mind/synthesis/supply-network', dir: 'wiki finding',
      page: 'wiki/mind/synthesis/supply-network',
      note: 'The block-unblock page makes the same point as a prediction: June 1 is the first exit attempted after her material dependency on his supply ended, and it is the first one in a decade that held.'
    },

    // ---------------------------------------------------------------
    // WHERE HE ACTUALLY DID REFUSE
    // ---------------------------------------------------------------
    {
      d: '2025-12-20', approx: true, lane: 'third', who: 'third', tier: 'WIKI',
      tag: 'THE ONE DOCUMENTED WITHHOLDING RUNS AGAINST SOMEONE ELSE',
      text: 'James (Danielle’s BF) requests cocaine through Annie; Dan withholds.',
      src: 'wiki/people/danielle-onesi · Gemini HTML; _21.md', dir: 'wiki finding, ~2025–2026',
      page: 'wiki/people/danielle-onesi',
      note: 'Two things at once: a third party using Annie as the channel to reach supply, and the only refusal in the record — aimed at him, not at her.'
    },

    // ---------------------------------------------------------------
    // JUNE 2026 · CLOSURE AND OUTSIDE CORROBORATION
    // ---------------------------------------------------------------
    {
      d: '2026-06-01', lane: 'ctx', who: 'dan', tier: 'RAW-CSV',
      tag: 'HIS CLAIM, IN RAW — AND IT IS ONLY HIS',
      text: 'I saved you from fucking DYING when you were shooting coke and you would sell me out to virtue signal your loyalty to someone else?',
      src: 'THE END FIGHT.csv', dir: '2026-06-01 00:25:59 | Sent',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'FLAGGED: the row is raw-verified, the event inside it is not. This is the corpus’s only reference to intravenous cocaine use and it is undated, uncorroborated, and made by Dan mid-fight. It belongs in the weakest lane, not the strongest.'
    },
    {
      d: '2026-06-01', lane: 'her', who: 'annie', tier: 'RAW-CSV',
      tag: 'HER EXIT LINE',
      text: 'Goodbye forever. This was not how it should have ended but. sic semper lupanis.',
      src: 'THE END FIGHT.csv / imessage_2124702449_both_all_now.csv / ANNIETEXTS.csv',
      dir: '2026-06-01 00:27:49 | Sent (Received by Dan)',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict', note: ''
    },
    {
      d: '2026-06-05', lane: 'her', who: 'annie', tier: 'RAW-CSV',
      tag: 'HER ONLY UNPROMPTED ACKNOWLEDGMENT',
      text: 'Daniel, i just want to say that i am extremely sorry.',
      src: 'imessage_2124702449_both_all_now.csv', dir: '2026-06-05 00:37:42 | Received',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict', note: ''
    },
    {
      d: '2026-06-15', lane: 'witness', who: 'third', tier: 'RAW-CSV',
      tag: 'THE HOSTILE WITNESS, FOURTEEN DAYS LATER',
      text: 'She’s a compulsive liar with a drug addiction',
      src: 'imessage_export_7248123683_20260624.csv', dir: '2026-06-15 13:15:12 | Received',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'Tuquick — the man Annie left Dan for, who had savaged Dan in her defence on June 1 — naming the addiction as hers, unprompted, to the person with the least claim on his loyalty. The single most independent piece of evidence on this page.'
    },
    {
      d: '2026-06-15', lane: 'witness', who: 'third', tier: 'RAW-CSV',
      tag: 'SAME WITNESS, ONE MINUTE EARLIER',
      text: 'You can have her back ? She’s no good trauma bond to the cuck',
      src: 'imessage_export_7248123683_20260624.csv', dir: '2026-06-15 13:14:58 | Received',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'Included with the contempt intact. A witness who despises Dan is worth more here than one who likes him.'
    },

    // ---------------------------------------------------------------
    // THE RECORD AGAINST ITS OWN AUTHOR
    // Published in the same corpus, on the same pages, unprompted.
    // ---------------------------------------------------------------
    {
      d: '2026-07-18', lane: 'adverse', who: 'record', tier: 'RAW-CSV',
      tag: 'IT RETIRED HIS BEST STATISTIC',
      text: 'The 187:4 love-to-request ratio does not survive a controlled recomputation. 97.2% of a random sample of ALL her messages are equally request-adjacent at ±24h — the adjacency carries no information about love specifically. The directional test inverts it: 3.2% against a 16.2% baseline.',
      src: 'wiki/mind/synthesis/dan-annie-fallout-verdict · REVISED [2026-07-18]',
      dir: 'primary recount, imessage_7244346811+2124702449_both_all_now.csv',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'The "procurement instrument" reading was the strongest single number in the case, and the corpus killed it itself. This page does not use it.'
    },
    {
      d: '2026-07-18', lane: 'adverse', who: 'record', tier: 'RAW-CSV',
      tag: 'IT COUNTED HIS ABUSE EXACTLY',
      text: 'Verbal abuse escalated 9 (Aug 2025) → 36 (Feb 2026): 74 "fuck you" / 17 "piece of shit" / 11 "worthless" — all three counts reproduce EXACTLY. Her side in the same window: 0 / 1 / 0. The asymmetry is complete.',
      src: 'wiki/mind/synthesis/dan-annie-fallout-verdict · REVISED [2026-07-18]',
      dir: 'primary recount, Aug 1 2025 – Mar 16 2026',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict', note: ''
    },
    {
      d: '2026-07-18', lane: 'adverse', who: 'record', tier: 'RAW-DUMP',
      tag: 'IT REFUSED A NUMBER THAT FLATTERED THE STORY',
      text: 'Sent "I’m sorry" = 435 through Aug 2025 alone — more than double the claimed 180. Under any plain lexicon he apologizes MORE than he attacks, not "least of all". The apology-deficit ordering does not survive.',
      src: 'wiki/mind/synthesis/dan-annie-fallout-verdict · REVISED [2026-07-18]',
      dir: 'recount from all_imessages_complete_dump.txt',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict', note: ''
    },
    {
      d: '2026-07-13', lane: 'adverse', who: 'record', tier: 'WIKI',
      tag: 'IT NAMES HIM AS THE ARCHITECT',
      text: 'He was the supply-chain architect. The terminal-phase retention mechanism — Dan controlling the drug supply while Annie was unemployed and dependent — was his, operating independently of love or strategy.',
      src: 'wiki/mind/synthesis/dan-annie-fallout-verdict · "what was his responsibility"',
      dir: 'wiki finding',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'The counter-case, stated by the record at full strength. Structuring a supply relationship is not the same as manufacturing an addiction — but the structure is his, and this page does not pretend otherwise.'
    },
    {
      d: '2026-07-14', lane: 'adverse', who: 'record', tier: 'WIKI',
      tag: 'IT LOGGED THE SURVEILLANCE ESCALATION',
      text: 'He went on to have Claude build, then built without Claude’s help, three fake surveillance-TUI scripts hardcoded with Annie’s real name and home streets — the restraint and the escalation are both documented; the arc points toward control, not just detection.',
      src: 'wiki/people/annie-ulmer · REVISED [2026-07-14]', dir: 'wiki finding',
      page: 'wiki/mind/synthesis/ai-collaborative-analysis', note: ''
    },
    {
      d: '2026-07-15', lane: 'ctx', who: 'record', tier: 'DOSSIER',
      tag: 'THE DIRECTION THE MONEY RAN',
      text: 'Across Cash App and Venmo, Dan sent Annie on the order of ~$139K and received back only ~$16–20K — a net outflow to her of roughly $119K–$123K over the relationship.',
      src: 'operator-provided payment-app screenshots, 2026-07-15',
      dir: 'two separate app ledgers — NOT archived in raw/, per the wiki’s own caveat',
      page: 'wiki/people/annie-ulmer',
      note: 'FLAGGED: the weakest sourcing on this page. Kept because the six-to-one asymmetry is load-bearing for the dependency argument, and flagged because it has not been archived.'
    }
  ];

  // ---- normalisation ------------------------------------------------
  // dates are ISO strings at day, month or year precision; sort key is a
  // day number so approximate records still land in the right place.
  const dayNum = (s) => {
    const p = String(s).split('-').map(Number);
    const y = p[0], m = (p[1] || 1) - 1, d = p[2] || 1;
    return Math.round(Date.UTC(y, m, d) / 86400000);
  };

  R.forEach((r, i) => {
    r.i = i;
    r.day = dayNum(r.d);
    r.w = TIER_W[r.tier] || 1;
    r.shownAt = 0;
  });
  R.sort((a, b) => a.day - b.day || a.i - b.i);

  // per-year message volume, published on wiki/people/annie-ulmer. Years the
  // table does not carry are absent here rather than zeroed — the CLOCK draws
  // the gap as a gap.
  const YEAR_MSGS = {
    2015: { dan: 7242, annie: 6394 },
    2016: { dan: 13954, annie: 14395 },
    2017: { dan: 6552, annie: 7413 },
    2018: { dan: 9137, annie: 11459 },
    2019: { dan: 3084, annie: 4542 },
    2023: { dan: 1320, annie: 1784 },
    2024: { dan: 5273, annie: 11467 },
    2025: { dan: 9565, annie: 10074 }
  };

  // Dan's own documented verbal-abuse instances per month, as published on
  // wiki/people/annie-ulmer. The series stops in February because that is where
  // the wiki stops counting — the months after it are absent, not zero, and the
  // UNCONDITIONAL volume lane draws them as absent.
  const ABUSE_MO = {
    '2025-08': 9, '2025-09': 0, '2025-10': 5, '2025-11': 14,
    '2025-12': 22, '2026-01': 25, '2026-02': 36
  };

  // the documented phases of who paid and who could reach supply. Boundaries
  // are the ones the wiki dates; the labels are its language.
  const PHASES = [
    {
      a: '2015-11-28', b: '2020-12-31',
      label: 'DAN FUNDS THE HOUSEHOLD · SHE RUNS HER OWN NODE',
      income: 0.35, route: 1, danSrc: 0,
      note: 'Dan funds the first five New York years drawing on Suz; Annie moves between jobs — and runs the Johnny relationship herself through 2018–19.'
    },
    {
      a: '2021-01-01', b: '2022-12-31',
      label: 'HER OWN INCOME · AU ZA’ATAR',
      income: 1, route: 1, danSrc: 0,
      note: 'Dan gets her the hostess job at Au Za’atar a month into his own hire there. NYC supply runs through Menore, a professional operator, not through him.'
    },
    {
      a: '2023-01-01', b: '2024-05-31',
      label: 'BOTH WORKING · JOINT LANDLORD DEBT',
      income: 0.7, route: 1, danSrc: 0,
      note: 'Roughly $10,000 owed to the landlord, paid down at $650 a week.'
    },
    {
      a: '2024-06-01', b: '2025-01-31',
      label: 'SHE IS THE SOLE EARNER · HE IS THE DEPENDENT',
      income: 1, route: 1, danSrc: 0,
      note: 'After Dan’s involuntary Au Za’atar exit she carries rent, phone, a PNC loan and the shared drug budget. The only extended stretch in the decade with the dependency running his way.'
    },
    {
      a: '2025-02-01', b: '2026-04-30',
      label: 'UNIONTOWN · SHE IS UNEMPLOYED AND SOURCING THROUGH HIM',
      income: 0, route: 0, danSrc: 1,
      note: 'The window the manipulation claim is actually about. It begins with her move back to her parents’ house and her refusal of a funded apartment.'
    },
    {
      a: '2026-05-01', b: '2026-06-01',
      label: 'MARUCAS · SHE EXITS THE DEPENDENCY, THEN EXITS',
      income: 1, route: 0.5, danSrc: 0.5,
      note: 'She takes a job. Four weeks later the relationship closes — the first exit in a decade that held.'
    }
  ];

  window.ProcurementData = {
    records: R,
    tierWeight: TIER_W,
    yearMsgs: YEAR_MSGS,
    abuseMo: ABUSE_MO,
    phases: PHASES.map(p => ({ ...p, da: dayNum(p.a), db: dayNum(p.b) })),
    dayNum,
    start: dayNum('2015-11-28'),
    end: dayNum('2026-06-01')
  };
})();
