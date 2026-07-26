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

  // ===================================================================
  // THE ASK LEDGER — every request from her the record dates, Feb 2025 on
  //
  // A separate pool from the one above, because it answers a different
  // question and has a different failure mode. The corpus does NOT publish a
  // count of her requests. What it publishes is a base rate, discovered by
  // accident: running a control on the 187:4 love-to-request claim, the
  // 2026-07-18 recount found 97.2% of a random sample of ALL her messages in
  // the Aug 2025 – Mar 2026 window had a request within ±24h — "she made
  // requests nearly every day." That control deflated the love statistic and
  // simultaneously established the ask rate.
  //
  // So there are two numbers here and they must not be confused:
  //   · the ITEMISED count — discrete asks the wiki dates and describes. It is
  //     small because the corpus only narrates a handful of days closely, not
  //     because those were the only asks. `count: 1` marks these.
  //   · the RATE — near-daily, from the base-rate control. `count: 0` marks
  //     the pattern-level records that carry it.
  //
  // The instrument draws the documented windows as bands so the empty stretches
  // read as "no day-level record published," which is what they are, rather
  // than as "she asked for nothing."
  //
  // kind: sub (substance) · money · errand · presence
  const ASKS = [
    {
      d: '2025-04-21', span: ['2025-04-17', '2025-04-26'], count: 0, kind: 'sub', tier: 'WIKI',
      tag: 'A REPRESENTATIVE WEEK, NOT A SINGLE ASK',
      text: 'Drug-procurement logistics (a supplier called "Bop," a contact named John, Suz often facilitating delivery) generate friction over timing and money.',
      src: 'wiki/timeline/periods/feb-apr-2025-return-and-rupture',
      dir: 'day-by-day account of Apr 17–25 2025, from a ChatGPT session Dan ran Apr 27 2025',
      page: 'wiki/timeline/periods/feb-apr-2025-return-and-rupture',
      note: 'PATTERN, NOT AN ITEM — excluded from the itemised counter. The wiki calls it "a tight, repeating cycle" across ten days, two months after the move to Uniontown. The underlying message log is not on disk; only the analysis session is.'
    },
    {
      d: '2025-11-20', span: ['2025-08-01', '2026-03-16'], count: 1, kind: 'money', tier: 'WIKI',
      tag: 'THE LONGEST SILENCE ENDS WITH A MONEY REQUEST',
      text: 'Her longest documented silence ran 36.5 hours and ended with a money request.',
      src: 'wiki/people/annie-ulmer · wiki/timeline/events/march-2026-terminal-phase',
      dir: 'wiki finding — undated within the Aug 2025 – Mar 2026 window',
      page: 'wiki/timeline/events/march-2026-terminal-phase',
      note: 'UNDATED: the record fixes the duration and the re-entry vehicle but not the day. Plotted at the window midpoint and flagged; it is counted once because it is a specific documented event, not a rate.'
    },
    {
      d: '2026-01-24', count: 0, kind: 'sub', who: 'dan', tier: 'DOSSIER',
      tag: 'HIS OWN SUMMARY OF THE PATTERN, NAMED IN REAL TIME',
      text: 'You have never once said I love you and not needed something from me immediately after',
      src: 'report collection.txt / Honest assessment and value judgment analysis.md',
      dir: 'Dan, Jan 24 2026 — dossier-transcribed, not located in an on-disk CSV',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'PATTERN, NOT AN ITEM. His lived read, and the corpus lets it stand as exactly that — a subjective report, not a count. The statistic built on top of it (187:4) did not survive.'
    },
    {
      d: '2026-02-21', count: 1, kind: 'presence', tier: 'WIKI',
      tag: 'PRESSING FOR A COMMITMENT TO COME OVER',
      text: 'Annie pressing Dan for a straight answer on whether he’s coming over, Dan going quiet, Annie reading the silence as evasion.',
      src: 'wiki/timeline/events/march-2026-terminal-phase',
      dir: 'wiki finding — afternoon of Feb 21 2026, before the evening detonation',
      page: 'wiki/timeline/events/march-2026-terminal-phase',
      note: 'The only ask in the ledger that is for presence rather than for a thing. It ends with her threatening to "literally fucking tell your parents what you do," blocking, unblocking, and blocking again.'
    },
    {
      d: '2026-03-09', count: 1, kind: 'sub', tier: 'WIKI',
      tag: 'THE MORNING AFTER THE EULOGY',
      text: 'The morning of March 9 opened with Annie asking for a drug pickup as if the previous night had not occurred.',
      src: 'wiki/timeline/events/march-2026-terminal-phase',
      dir: 'wiki finding — morning of Mar 9 2026',
      page: 'wiki/timeline/events/march-2026-terminal-phase',
      note: 'The previous night, March 8, reads in the analysis as a relationship eulogy — Dan releasing her with the specificity of someone who has stopped hoping. The ask arrives the next morning with no reference to it.'
    },
    {
      d: '2026-03-10', count: 1, kind: 'sub', tier: 'WIKI',
      tag: 'THE BATHROOM INCIDENT',
      text: 'Dan. Calm down. Please. I will be over.',
      src: 'wiki/timeline/events/march-2026-terminal-phase',
      dir: 'Annie, 7:37 PM Mar 10 2026 — mid-burst, 37 unanswered messages in',
      page: 'wiki/timeline/events/march-2026-terminal-phase',
      note: 'She arrived, said she wanted to be together, went to the bathroom, and tried to leave through the front door without a word. The analysis calls it the whole dynamic in one physical action: "affirmation, extraction attempt, disappearance, compressed into under five minutes."'
    },
    {
      d: '2026-03-11', count: 1, kind: 'sub', tier: 'RAW-CSV',
      tag: 'THE CLEAREST ONE IN THE RECORD',
      text: 'So is there anything I can get for you or your mom at the gas station so I can get a line or two. You can tell me no',
      src: 'imessage_2124702449_both_all_now.csv',
      dir: '2026-03-11 17:25:03 | Received',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'Seventeen hours after his most contained goodbye on record ("You’ve been heard. Goodbye," 12:25 AM). No acknowledgment of the goodbye — the drug request IS the re-entry vehicle. She offers the errand as the consideration and writes his right of refusal in herself.'
    },
    {
      d: '2026-03-12', count: 1, kind: 'sub', tier: 'WIKI',
      tag: 'A COLLECTION, MINUTES AFTER THE CONFESSION',
      text: 'Ok let me get the keys',
      src: 'wiki/people/annie-ulmer',
      dir: 'Dan’s reply, minutes after Annie answered "YES" twice under sustained pressure',
      page: 'wiki/people/annie-ulmer',
      note: 'His words, her run. Holding the confirmation he had spent months seeking, his first move was one more delivery — "He could not stop providing even with the evidence in hand that had justified stopping long before."'
    },
    {
      d: '2026-03-13', approx: true, count: 1, kind: 'errand', tier: 'WIKI',
      tag: 'CLIPPERS, AND ONE LAST RUN',
      text: 'So tomorrow you’re going to come pick up your clippers and I will get you what you want from bop one last time',
      src: 'wiki/people/annie-ulmer',
      dir: 'Dan, hours after "I hope you someday realize how much you really did ruin my life"',
      page: 'wiki/people/annie-ulmer',
      note: 'Counted because "what you want" is a standing request being answered. The hostility and the provision are hours apart and unlinked.'
    },
    {
      d: '2026-03-19', count: 1, kind: 'money', tier: 'WIKI',
      tag: 'A $50 SHORTFALL, CLOSED THROUGH HER MOTHER',
      text: 'A $50 shortfall for supply that Annie tries to close by "magically" getting another fifty from her mother.',
      src: 'wiki/timeline/events/march-2026-terminal-phase',
      dir: 'wiki finding — Mar 19 2026, from a full-day thread sampled 2026-07-14',
      page: 'wiki/timeline/events/march-2026-terminal-phase',
      note: 'Her own mother as the fallback funding line. On Feb 21 she had already said the quiet part: "You think I’m worried people will find out I do drugs or my mom does and facilitated you doing them."'
    },
    {
      d: '2026-03-19', count: 1, kind: 'errand', tier: 'WIKI',
      tag: 'A BLACK-AND-MILD CANDY RUN',
      text: 'A black-and-mild candy run.',
      src: 'wiki/timeline/events/march-2026-terminal-phase',
      dir: 'wiki finding — Mar 19 2026',
      page: 'wiki/timeline/events/march-2026-terminal-phase',
      note: 'The ordinary end of the ledger. It sits in the same day as the $50 shortfall and a cancelled evening ("I cannot stay. My mom asked me to come home... Don’t hate me... Please").'
    },
    {
      d: '2026-05-04', count: 1, kind: 'money', tier: 'WIKI',
      tag: 'WARMTH AT NIGHT, AN ATM CODE IN THE MORNING',
      text: 'On May 4, warmth the prior evening was followed the next morning by a cardless-ATM-code request.',
      src: 'wiki/timeline/events/april-may-2026-final-weeks',
      dir: 'wiki finding — morning of May 4 2026',
      page: 'wiki/timeline/events/april-may-2026-final-weeks',
      note: 'The warmth in question was "I am not okay with that," her reply to a suicide statement. FLAGGED: this page is sourced from a single chat-analysis session and says so.'
    },
    {
      d: '2026-05-05', count: 1, kind: 'sub', tier: 'WIKI',
      tag: 'THE ASK ARRIVES BEFORE THE JOB NEWS',
      text: 'Annie mentions starting work at "Marucas" on the morning of May 5 — in the same message exchange where she opens with a drug-supply-chain logistics request, meaning the request preceded the job announcement in sequence.',
      src: 'wiki/timeline/events/april-may-2026-final-weeks',
      dir: 'wiki finding — morning of May 5 2026',
      page: 'wiki/timeline/events/april-may-2026-final-weeks',
      note: 'The job is the thing that ends her dependency four weeks later. The request still comes first in the thread.'
    },
    {
      d: '2026-05-05', count: 1, kind: 'sub', tier: 'WIKI',
      tag: 'ARRIVED, COLLECTED, LEFT',
      text: 'On May 5, Annie arrived without her phone, collected supply, and left.',
      src: 'wiki/timeline/events/april-may-2026-final-weeks',
      dir: 'wiki finding — May 5 2026',
      page: 'wiki/timeline/events/april-may-2026-final-weeks',
      note: 'Same day Dan wrote "stay away from me you liar" at 3:09 PM. The collection happened anyway.'
    },
    {
      d: '2026-05-31', approx: true, count: 1, kind: 'sub', tier: 'DOSSIER',
      tag: 'THE LAST ONE · A BLUE FOLDER IN A MAILBOX',
      text: 'Dan had dropped a blue folder containing drugs Annie had requested into a mailbox for her; moments after she retrieved it, Tuquick opened a roughly two-hour barrage of slurs, threats, and a demand to meet in person.',
      src: 'end-fight-notebooklm-podcast-transcript.md',
      dir: 'podcast dramatisation of the same message logs — REVISED 2026-07-20',
      page: 'wiki/people/tuquick-17248123683',
      note: 'FLAGGED: the account is a NotebookLM-style dramatisation of the logs, not a located row. If it holds, the final documented transaction of the relationship is a drug drop she asked for, hours before "Goodbye forever."'
    },
    {
      d: '2025-11-24', span: ['2025-08-01', '2026-03-16'], count: 0, kind: 'money', tier: 'RAW-CSV',
      tag: 'THE RATE, FOUND BY ACCIDENT',
      text: '97.2% of a random sample of ALL her messages in the window have a request within ±24h. She made requests nearly every day, so any class of her messages is ~96–97% "request-adjacent" at a 24-hour radius.',
      src: 'imessage_7244346811+2124702449_both_all_now.csv',
      dir: 'base-rate control, 2026-07-18 recount · Aug 1 2025 – Mar 16 2026 · her side = 8,293 messages',
      page: 'wiki/mind/synthesis/dan-annie-fallout-verdict',
      note: 'THIS IS THE REAL COUNTER, and it is a rate rather than a total. The control was run to test whether her love-declarations were procurement signals — it killed that claim and established the ask frequency in the same pass. No integer total of her requests exists anywhere in the corpus.'
    },
    {
      d: '2025-11-24', span: ['2025-08-01', '2026-03-16'], count: 0, kind: 'presence', tier: 'RAW-CSV',
      tag: 'THE INVERSE COUNTER — WHAT SHE ASKED ABOUT HIM',
      text: 'Annie’s own unprompted wellbeing checks on Dan across the full 222-day window: seven, three of which are perfunctory ("Thank you okay") responses to a favor he’d just done her. Net of those, four genuine checks survive — once every fifty-five days.',
      src: 'wiki/people/annie-ulmer · the 2026-07-18 audit',
      dir: 'recount over the 222-day terminal window',
      page: 'wiki/people/annie-ulmer',
      note: 'Set against hundreds of documented instances of Dan asking after her grandmother, her ankle, her legal situation, her car. Requests near-daily; enquiries after him, four.'
    }
  ];

  // Days the corpus actually narrates closely. Everything outside these bands
  // has no day-level record published — which is not the same as nothing
  // happening in it, and the instrument draws the difference.
  const ASK_WINDOWS = [
    ['2025-04-17', '2025-04-26', 'APR 2025 WEEK SAMPLE'],
    ['2026-02-21', '2026-02-21', 'FEB 21'],
    ['2026-03-01', '2026-03-16', 'MARCH TERMINAL PHASE'],
    ['2026-03-19', '2026-03-20', 'MAR 19–20'],
    ['2026-04-01', '2026-05-06', 'FINAL SEVEN WEEKS'],
    ['2026-05-31', '2026-06-01', 'THE END FIGHT']
  ];

  ASKS.forEach((r, i) => {
    r.i = i;
    r.who = r.who || 'annie'; // every ask is hers unless the record says otherwise
    r.day = dayNum(r.d);
    r.w = TIER_W[r.tier] || 1;
    r.shownAt = 0;
    if (r.span) { r.spanA = dayNum(r.span[0]); r.spanB = dayNum(r.span[1]); }
  });
  ASKS.sort((a, b) => a.day - b.day || a.i - b.i);

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
    asks: ASKS,
    askWindows: ASK_WINDOWS.map(([a, b, label]) => ({ a: dayNum(a), b: dayNum(b), label })),
    askStart: dayNum('2025-02-01'),
    askEnd: dayNum('2026-06-15'),
    tierWeight: TIER_W,
    yearMsgs: YEAR_MSGS,
    abuseMo: ABUSE_MO,
    phases: PHASES.map(p => ({ ...p, da: dayNum(p.a), db: dayNum(p.b) })),
    dayNum,
    start: dayNum('2015-11-28'),
    end: dayNum('2026-06-01')
  };
})();
