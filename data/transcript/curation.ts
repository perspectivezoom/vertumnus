/**
 * The editorial layer over the transcript: which commits form a topic, which topics form a
 * chapter, and which exchanges are worth singling out.
 *
 * Hand-authored, and the one part of the session browser that is. Everything else — where a
 * prompt sits, which commit it led to, what was said — is derived by `bun run transcript` and
 * would be the same whoever ran it. Judgement about what any of it *meant* is not derivable,
 * and dressing a heuristic up as one would put a number on the AI page that no one could defend.
 *
 * Keyed by commit SHA and exchange id because both are stable: the generator is re-run every
 * time this file grows, and re-running must never invalidate what is already written here. A
 * commit named below that no longer exists is an error; a commit not named is simply unfiled,
 * and the build says so rather than guessing.
 */

/** A run of related commits — the finer of the two navigation levels. */
export interface Topic {
  id: string;
  title: string;
  /** What this run of commits was doing. One sentence. */
  blurb: string;
  /** Short SHAs, in history order. */
  commits: string[];
}

/** A story arc, holding topics. The table of contents a first-time reader sees. */
export interface Chapter {
  id: string;
  title: string;
  /** What this stretch of the project was trying to do. One or two sentences. */
  blurb: string;
  topics: string[];
}

/**
 * A run of work that crosses chapters, indexed on its own.
 *
 * Chapters are chronological, which is what makes the table of contents read as the shape of the
 * project — but some work is picked up and put down across months. The watercolours span three
 * chapters; keeping the transcript published is threaded through all ten. Rather than bend the
 * chronology around them, they are gathered here and the chapters stay in order.
 *
 * Structural, not editorial: a thread claims only that these commits belong to the same piece of
 * work, which is checkable against the commits themselves. Compare {@link Highlight}, which makes
 * a claim about what an exchange *meant*.
 *
 * Threads may overlap topics freely, and every commit is also filed under a topic: a thread is a
 * second way through the same history, not a place to put work that has none.
 */
export interface Thread {
  id: string;
  title: string;
  blurb: string;
  /** Short SHAs, in history order. */
  commits: string[];
}

/**
 * An exchange called out for a reason, gathered into the named collection.
 *
 * `note` is the claim being made about it and is what a reader is asked to believe, so it is
 * written by hand against the exchange it cites. The collections are counted on the page; the
 * count is only worth printing because this list is not generated.
 */
export interface Highlight {
  /** Exchange id, as emitted by the generator. */
  exchange: string;
  note: string;
}

/** A named set of highlights, keyed by the id it is linked to by. */
export interface Collection {
  title: string;
  blurb: string;
  entries: Highlight[];
}

/**
 * How each index introduces itself in the table of contents.
 *
 * Here rather than in the component for the same reason every blurb is: it is a claim about how
 * the transcript has been organised, and organising it is what this file does. The titles are
 * fixed by the code — there are three kinds because there are three types above — but what each
 * one means to a reader is an editorial matter.
 */
export const GROUPS = {
  chapters: { title: 'Chapters', note: 'Strictly chronological roughly grouped by topic.' },
  threads: { title: 'Threads', note: 'Work performed at multiple times across chapters.' },
  collections: { title: 'Collections', note: 'Interesting topics to highlight.' },
} as const;

export const THREADS: Thread[] = [
  {
    id: 'watercolours',
    title: 'The watercolours',
    blurb:
      'Choosing USDA pomological plates for locality, measuring the space the chart leaves empty, and getting them to print resolution — picked up three separate times.',
    commits: ['867a67b', '4796e0b', '678d93b', 'd930e31', '3fdc0cc', '18be289', '73c7f8b'],
  },
  {
    id: 'mars',
    title: 'The USDA MARS pipeline',
    blurb:
      'Finding the shipment data, discovering the first reports were the wrong ones, and narrowing what was left to districts near enough to matter.',
    commits: [
      'd7ad261',
      '1a32a3c',
      'ea78335',
      '4d45795',
      'eac0893',
      '6527b18',
      '1d96ca6',
      'ab39b1b',
      'b4cda6c',
      '1a21e14',
    ],
  },
  {
    id: 'season-algorithm',
    title: 'What counts as a season',
    blurb:
      'Deciding which weeks are peak and which are merely available — answered in August, then torn up and redone three weeks later.',
    commits: [
      '5fee654',
      '0fcd929',
      '06a6506',
      '251c265',
      '41183d4',
      '80021f4',
      '96b9780',
      '0ffa40e',
    ],
  },
  {
    id: 'about-pages',
    title: 'The written pages',
    blurb:
      'Explaining the sources, the licensing and the AI usage — written once, then reopened when New York arrived with different terms.',
    commits: [
      'e7d2efd',
      '50717ed',
      '15098ee',
      'e05d4a2',
      '8f96690',
      '332d94a',
      '4dabc0b',
      '5310c07',
    ],
  },
  {
    id: 'typography',
    title: 'Choosing the type',
    blurb: 'Noto Serif for the body, and a fortnight later Playfair Display for the headline.',
    commits: ['633de99', '66c5857'],
  },
  {
    id: 'refactors',
    title: 'Cleaning up as we went',
    blurb:
      'Recurring passes over code that already worked, usually right after a feature landed rather than long afterwards.',
    commits: ['8c375ba', '37ff719', 'b8b143c', 'd510101', 'd1a4b9a'],
  },
  {
    id: 'upkeep',
    title: 'Publishing the transcript',
    blurb:
      'Committing this conversation to the repository, and repeatedly cutting it down as it grew. Housekeeping rather than a chapter of the story, so each one sits at the end of whatever topic it interrupted; this thread is where they read as the one recurring chore they are.',
    commits: [
      'cf9e7d1',
      '376b232',
      'db2b3d3',
      '4623970',
      '8b6ec4e',
      '406eddf',
      '26fb3a8',
      '811d770',
      'cfa5b78',
      'bceb575',
    ],
  },
];

/**
 * Hand-picked, except where a blurb says otherwise.
 *
 * The count beside each one is printed on a public page, so it is only worth anything because a
 * person chose every entry. Where a collection is instead defined by a rule, the blurb states the
 * rule, and the reader can check it.
 */
export const COLLECTIONS: Record<string, Collection> = {
  discovery: {
    title: 'Where Claude found something',
    blurb:
      'Exchanges where the model turned up something neither of us knew going in. A selection with no total behind it: nothing here is decided by a rule a reader could apply. Most consequential first.',
    entries: [
      {
        exchange: '66899c90-d693-4973-90cc-5ecafb384a20',
        note: "The week-granular chart this poster needed does not exist anywhere. What exists is measured weekly shipment volume, which defines peak by supply rather than by a chart-maker's opinion — the whole data pipeline follows from this answer.",
      },
      {
        exchange: '16ac61dc-397d-4b45-8d90-b4ce475216fd',
        note: "Asked for a regional graphic and expecting a landmark, Claude proposed the USDA Pomological Watercolor Collection instead: 7,497 public-domain fruit paintings held by the same department that publishes the shipment data. It became the poster's whole look.",
      },
      {
        exchange: 'e4b9eba1-87a1-47b8-b2e4-da461e8c3643',
        note: "With tile-packing rejected and lanes too sparse, the ridgeline turned up as the form that buys density without letting one crop's curve move another's baseline. It is what the poster is today.",
      },
      {
        exchange: 'e150d1c6-05ee-408d-b530-8fa0bb6ea36f',
        note: 'The weekly curve did exist in one citable artifact after all: Figure 5 of an open-access 2024 paper, production volume by district and time of year.',
      },
      {
        exchange: '28f068a7-0298-4e25-9844-83d9062e2e21',
        note: 'Asking whether components work inside Markdown turned out to be the question that unlocked the written sections: a tag resolves against an overrides map, so a page can say `<Dependencies />` and mean it.',
      },
      {
        exchange: '2e48ee9d-f81e-405a-8047-c7bdf237944f',
        note: 'No linter can catch an Astro component that silently loses its click handlers, because the interactivity and the hydration directive live in different files. One of the reasons Astro did not survive.',
      },
      {
        exchange: 'ba426b03-9676-4008-9a22-c8b01c657ee7',
        note: "Bun's build result exposes no import graph at all, but Bun.Transpiler.scanImports parses one and names the static/dynamic distinction directly, replacing a regex run over the bundler's own output.",
      },
      {
        exchange: '630b9005-6933-43a0-ba2e-5d39eb72996b',
        note: 'Buttons had quietly stopped showing a pointer cursor. Grepping the installed package found the cause — Tailwind v4 dropped the rule from Preflight — so there was no override to delete.',
      },
      {
        exchange: '8ad9cc3d-5e74-4cd5-9cf9-cb50d2c5d343',
        note: "oxfmt's line-width ceiling is compiled into its native Rust core, and its JSON schema advertises a limit two hundred times higher than the validator will accept.",
      },
      {
        exchange: 'c5697a89-250c-4e7c-ac95-79f7307db186',
        note: "Reading d3's source rather than recalling it showed that stack offset and stack order are independent, so the wiggle baseline could be adopted without the ordering it usually ships with.",
      },
    ],
  },
  pushback: {
    title: 'Where I pushed back',
    blurb:
      'A selection from roughly seventy exchanges where Claude took the wrong direction, asserted something untrue, or assumed what it should have asked — and I said so. Most consequential first.',
    entries: [
      {
        exchange: 'ac474e79-f8a1-412d-aed2-f1db2b1b17b3',
        note: 'A source line reading "community judgment" with a null URL was an opaque synthesis dressed up as a citation. The standing rule against inventing sources dates from this exchange, and governs every claim the site makes.',
      },
      {
        exchange: '8bee2e18-31d7-4320-b740-ad5cbd1ff16e',
        note: 'Bay Area produce was being sourced from the Los Angeles terminal because that was the report Claude had already fetched. Local knowledge caught what the pipeline did not.',
      },
      {
        exchange: '05a2c66c-daa6-40e0-b5e2-579c71ffa406',
        note: '"There shouldn\'t be any top bias at all with the current approach. Where is the top bias coming from?" The explanation Claude had given did not follow from its own description, and the real mechanism was somewhere else entirely.',
      },
      {
        exchange: 'e8cb45de-90d6-4124-b27f-634e9dea10d3',
        note: "Claude had checked the live site and pronounced it fine. It had checked over one scheme and not the other, and the bare domain was serving GitHub's 404 to anyone who typed it.",
      },
      {
        exchange: '90b6b73c-70e9-4da4-8736-24b8fb8e2e97',
        note: 'Claude proposed upgrading to a version of Bun that does not exist, and kept recommending it after the install failed.',
      },
      {
        exchange: 'd2e30550-5f7d-4b3e-9fd5-5154b4ea0720',
        note: 'Titling was being done by parsing the URL and looking the answer up, with a fallback for when the lookup missed. A section knows what it is.',
      },
      {
        exchange: '4739ae75-5ae2-4cb9-8c1a-b39846437ff1',
        note: 'Claude could not reproduce its own image pipeline from the session history it had been told to read, and had reconstructed it by guesswork instead of saying so.',
      },
      {
        exchange: '837ef90a-d86b-4d4d-9b0a-3c7ee904e556',
        note: '"Wouldn\'t load-bearing attributes fail loudly?" The comment claimed the opposite of what the code did, and the failure turned out to be spectacularly loud.',
      },
      {
        exchange: '692b43f3-52ed-430e-bc61-ddff97fb31e8',
        note: "Claude reached for brew install to read a PDF. Installing software on someone's machine is not a step you take without asking.",
      },
      {
        exchange: 'c232af71-fa7e-4389-b666-a22015003d0a',
        note: 'display: contents worked, but it was cleverness covering for padding Claude had added itself. The robust fix was to match one gap at two levels.',
      },
      {
        exchange: '3c035802-8031-4c58-aa18-a910ba454a66',
        note: 'Asked to migrate one crop, Claude bundled citrus into the same change. Two things in one commit is one thing too many.',
      },
      {
        exchange: '9f2aedec-9bfa-420d-beb2-0e1811d6178e',
        note: 'Claude started changing a week-indexing convention mid-task instead of leaving a pre-existing one alone and proposing it separately.',
      },
      {
        exchange: '845c1bcd-aaa9-445c-976c-8ed18d8f1613',
        note: 'A cited URL for the watercolour archive returned a 404 for the person who clicked it.',
      },
      {
        exchange: 'fb5e3a36-a9f0-47d2-bdcf-bd47a9e786a3',
        note: 'A filter regex was silently excluding every report whose name began with Apr, which is also how April abbreviates.',
      },
    ],
  },
  praise: {
    title: 'Where Claude got it right',
    blurb:
      'Nearly all of the dozen times I said something was good, found by the prompt that followed it. Each entry links to the work rather than to the compliment. Most consequential first.',
    entries: [
      {
        exchange: 'cee4f050-4577-4c78-91e3-d1f321b8d0d1',
        note: 'The argument that a hand-drawn face would read as a printing defect at label size, which redirected the whole type search: "I can accept that pushback."',
      },
      {
        exchange: 'f91f7213-d204-4372-9a0b-640341a19dec',
        note: 'Splitting the sidebar into a presentation commit and a selection commit, so each was reviewable on its own: "Good call on splitting up presentation and functionality."',
      },
      {
        exchange: 'af2e81a2-1517-49f6-8490-b63ea2cdfe38',
        note: 'Proposing a test that renders each section and fails on any tag React did not resolve, rather than grepping the Markdown for tag names: "way better than what is effectively a regex test."',
      },
      {
        exchange: '4448aca4-8cb6-4d69-9359-1fbd5a8e1e5a',
        note: 'A controlled A/B of the bundle with splitting off and on, five runs each, showing the poster got smaller and stayed at one fetch wave: "Okay, great. No additional round trip waterfalls."',
      },
      {
        exchange: 'cba78245-7495-42fc-a01e-dcfcde980ba2',
        note: 'Explaining why a volume tolerance was badly conditioned on exactly the flat crops it was meant to fix, and proposing cumulative share instead: "Okay, this makes sense to me."',
      },
      {
        exchange: 'ce08d511-19c7-4a83-a34f-2cd174a9f56d',
        note: 'A configuration shape where regions and sections each stay their own source of truth and the route table is derived from both: "This makes sense to me."',
      },
      {
        exchange: 'c015a80a-bfcb-4036-9f71-ad7cc9501935',
        note: 'Flagging that overlap is a rule across spans rather than a property of one, so the exported schema had to be the array: "Ah, good call on the combination."',
      },
      {
        exchange: '11d79838-bdbc-4ed7-9aad-58761d414b54',
        note: 'Diagnosing the uneven chat spacing as structural — padding inside a turn against a gap between turns — rather than nudging numbers: "Mmm, okay. Good callout."',
      },
      {
        exchange: '5417e310-59d2-42cc-ba66-34ac75f44a78',
        note: 'Anchoring the streamgraph to a fixed total height so one crop\'s decline stopped shoving another\'s label around: "Yes, this is much better."',
      },
      {
        exchange: '5f5ac9dc-5185-4951-96df-b1b19680ef1e',
        note: 'Researching the state of Bun, Astro and TanStack Start rather than recommending from recall, which settled the stack for a month: "Okay, I\'m aligned on Astro 6 + Bun."',
      },
      {
        exchange: '0b61a02a-96fd-4eef-8655-a38db29e3c51',
        note: 'Starting the crop list from what is actually sold at Bay Area markets and filtering to what the data supports, rather than the other way round.',
      },
      {
        exchange: '59e56b5d-bb53-4723-a063-fc3951a10200',
        note: 'Naming what had to happen before the collections could be curated at all, rather than starting and producing something unfounded: "Okay, fair enough."',
      },
    ],
  },
  verbosity: {
    title: 'Where I asked for less',
    blurb:
      'Every request to cut the comments down, from the first chapter to the last. Comprehensive, and the one correction that never stopped being necessary. Most consequential first.',
    entries: [
      {
        exchange: '578d7de2-a462-4593-b273-649f19b45861',
        note: 'Calling the comprehensive pass: not one file this time, every comment in the project.',
      },
      {
        exchange: '5bba69c4-fb90-48ca-9945-4e9803fd2ff3',
        note: 'Corrections were not the point. "I don\'t think there\'s enough evaluation on the condensing / elimination of comments."',
      },
      {
        exchange: 'ca222943-4916-46d5-ba33-888cf702b78e',
        note: '"Again, please make a comment condense / elimination pass." The last chapter, and the same instruction as the first.',
      },
      {
        exchange: '4de73a64-4356-4a30-a7b6-8b0ea8a0bacf',
        note: '"Let\'s dial back the amount of commenting." The first time, in the opening chapter, before there was much code to comment.',
      },
      {
        exchange: '880e1364-7283-40b9-8a3e-7d94c3728e93',
        note: '"Let\'s take one pass at condensing touched comments again."',
      },
      {
        exchange: '1e6842a5-a05a-4b2c-a54f-39b7fa9285c3',
        note: '"Again, let\'s make a pass at condensing the code comment verbosity."',
      },
      {
        exchange: 'ad9bf213-7b8b-4738-9ade-68324736e054',
        note: '"Feels like too much explanation for what it is."',
      },
      {
        exchange: '96001264-b313-4c58-8fe2-341309b3db10',
        note: '"Please reduce the comment size explaining wraps; it\'s too verbose."',
      },
      {
        exchange: '28dbd6da-c605-4aa7-9d31-64b9067b1e28',
        note: 'A comment explaining what the algorithm used to be, which a first-time reader has no way to care about.',
      },
      {
        exchange: 'a1141aa5-a9fc-412a-b156-c7731b67c413',
        note: '"Can we make a comment pass again?"',
      },
      {
        exchange: '8de4afba-6cab-4b27-9aec-1e8b717f7a65',
        note: '"Can we make one pass at condensing and/or eliminating the comments that have been touched?"',
      },
      {
        exchange: 'a9169be8-11d8-430e-88bd-4548d190e1b9',
        note: '"Can we take one pass at condensing comments you\'ve added / edited?"',
      },
      {
        exchange: 'b66175b6-698c-432e-9c81-dc4ab56b3017',
        note: '"Can you make a pass at condensing the comments that you\'ve added?"',
      },
      {
        exchange: '4045734e-ddf9-4e07-9a3c-c9c972c94c9f',
        note: 'Prose, not code comments, but the same instinct: a section of the sources page that said more than it needed to.',
      },
      {
        exchange: 'd17493f9-6d7d-41e7-ac7e-a3039a73b879',
        note: 'A comment explaining a flag, deleted along with the optionality that made it need explaining.',
      },
      {
        exchange: '92fac2c9-50b6-477d-8237-175274610389',
        note: '"Remove the reasoning comment. I don\'t think we need to document the justification."',
      },
    ],
  },
  measured: {
    title: 'Where a guess became a measurement',
    blurb:
      'A selection from the exchanges where a claim one of us was confident about got tested, and the answer came back different. Most consequential first.',
    entries: [
      {
        exchange: '789e56a9-a1dc-4f53-a94b-b3d0583eaabf',
        note: 'One question — does an exchange have exactly one reply? — turned into a measurement: 95% span more than one message and 79% have text after a tool call. The data model was wrong and got rebuilt.',
      },
      {
        exchange: 'b0ef1d1a-9e19-4453-a75a-afe640f9e47f',
        note: 'A threshold sweep meant to tune one number showed that no threshold reproduces the ground truth, because the two sources were measuring different things.',
      },
      {
        exchange: '8bf6cb67-5e2d-4261-9c89-02bfa33e3af9',
        note: 'Late-August corn looked like an outlier against the poster. All six seasons on record shipped corn that week: the poster was wrong, not the intuition.',
      },
      {
        exchange: '9b9a3c6f-077e-42f1-ab81-541e6a9b78d3',
        note: '"I assume the build would fail?" It does not. A typo in a Markdown tag passes type-checking, linting, every test and a production build, and ships a page with a section missing.',
      },
      {
        exchange: '66b3b3b6-40fc-48fc-aa85-c9b19a6256ff',
        note: 'Asked whether the browser could handle section links natively, the measurement said it handles exactly one of the three ways in — and lands at the top of the page for the other two.',
      },
      {
        exchange: '07919222-5c4b-4154-a0bf-fda4a48a35c9',
        note: 'Six plates instead of four, tested across four seedings: the top third of the poster went from 3.4% covered to 9.3%, and the mechanism was not the one either of us had assumed.',
      },
      {
        exchange: '3b2a3365-4963-4d43-aa4c-66fecdc9893a',
        note: 'Asked how long the page takes to load, Claude measured the waterfall instead of estimating it: images are 68% of the bytes, and GitHub Pages serves gzip only even when brotli is offered.',
      },
      {
        exchange: '4448aca4-8cb6-4d69-9359-1fbd5a8e1e5a',
        note: "Code splitting was supposed to be free. The A/B showed the poster's critical path fell to 196,861 bytes and still fetched in a single wave.",
      },
      {
        exchange: '6ecb027c-c1a2-45da-8482-89e8eae21b15',
        note: 'The formatter was blamed for being slow. It formats the whole repo in 134 ms; the real problem was that it turned a 469-line data file into 11,221 lines.',
      },
      {
        exchange: 'c5524b06-b782-44c1-b7fb-d22b35b5ed9f',
        note: 'Persimmons were assumed to wrap around the year boundary. Pooled across six seasons they ship 4.0M lb in weeks 50–52 and 0.2M lb in weeks 1–8.',
      },
      {
        exchange: '11d79838-bdbc-4ed7-9aad-58761d414b54',
        note: "The chat spacing was fixed and then measured rather than eyeballed — one distinct gap of 12px, and the two voices' text starting at the same left edge.",
      },
    ],
  },
  sources: {
    title: "What the sources wouldn't say",
    blurb:
      'A selection from fifteen or so exchanges where the data would not support what the poster wanted to claim. The standing rule against invented sources was written here. Most consequential first.',
    entries: [
      {
        exchange: 'ac474e79-f8a1-412d-aed2-f1db2b1b17b3',
        note: "\"There's no community judgment here; that's some opaque synthesis that you created.\" The moment the project's rule about citations was set.",
      },
      {
        exchange: '66899c90-d693-4973-90cc-5ecafb384a20',
        note: 'Every published seasonality chart is month-granular by nature. The thing the poster promised could not be sourced from any chart, only from measurement.',
      },
      {
        exchange: 'c8732277-4f75-4b2a-afcf-2b1519878bed',
        note: 'Terminal data answers when you can buy California strawberries in San Francisco, not when they are harvested near it — and the district field is empty on 52,070 of 53,485 rows.',
      },
      {
        exchange: '6aa6b851-2d67-4168-bb68-1b0f30c935d0',
        note: 'The ideal source would be a forum post by someone who genuinely knows the region, which is exactly the kind of source that cannot be cited.',
      },
      {
        exchange: '6b22ec48-ed26-4ce9-899b-ee20d74460a0',
        note: 'A good regional source that only resolves to the month, for a poster whose entire premise is the week.',
      },
      {
        exchange: '3c05b2d6-8ab5-47ba-9edf-5f59dc323be4',
        note: 'Data from USDA offices that have since closed is still queryable, and still the best record of what those regions grew.',
      },
      {
        exchange: '2686f026-e1ec-47fd-820c-b96eb3fc176b',
        note: 'Asking whether one tomato report had quietly merged several varietals into a single curve.',
      },
      {
        exchange: '7bbc9ce2-f0ed-4053-a519-4f6481e9ccd8',
        note: 'Lima beans and dry beans appeared in the New York data. Asking whether they are really grown there removed them.',
      },
    ],
  },
  abandoned: {
    title: 'What we tried first',
    blurb:
      'A selection from about twenty approaches built far enough to judge, then dropped: Astro, Playwright, Biome, jsonc, the streamgraph, imitation watercolour, and a browser written all at once. Most consequential first.',
    entries: [
      {
        exchange: '696e379b-2ffb-4b03-b9f8-0439ad8011e4',
        note: 'Astro, questioned after most decisions had turned into compatibility checks against it, and dropped for plain Bun. The largest reversal in the project.',
      },
      {
        exchange: 'd7694b2b-3e17-41ff-9896-89550a425737',
        note: 'The transcript browser, written once in a single pass and then thrown away to be rebuilt in small commits.',
      },
      {
        exchange: 'aad614bf-b3a1-4718-995d-97fa5b268114',
        note: 'Three separate techniques for imitating watercolour — layered daubs, turbulence, single-pigment density — none of which beat flat desaturated colour.',
      },
      {
        exchange: 'd0407555-4402-409c-905f-b6f7723f5e37',
        note: "The streamgraph, which real data made illegible: one crop's hump made every band below it wiggle.",
      },
      {
        exchange: '9e524a37-8b2f-4005-8530-53dd90a0aa50',
        note: 'Playwright, abandoned once a Bun issue confirmed it cannot run under Bun at all. Screenshots moved to Bun.WebView.',
      },
      {
        exchange: 'ffa36c2d-5a04-4802-ad40-469a31c042f7',
        note: 'Hand-written heading ids and a hook to scroll to them, reset away an hour later when converting the licences page to Markdown made all of it unnecessary.',
      },
      {
        exchange: '391e8c4c-3312-4473-a4d2-ae83d544d12a',
        note: 'Biome, dropped for oxlint and oxfmt because neither it nor anything else could lint Tailwind class names.',
      },
      {
        exchange: '75d7526b-1e6a-444f-8085-4a15f02c95c6',
        note: 'jsonc as the region format, abandoned for plain TypeScript once the bundler shims needed to support it became the problem.',
      },
      {
        exchange: 'f2a668db-540d-4e99-8665-0cf42fcd6870',
        note: 'File-based routing, given up when nothing in the Bun ecosystem provided it and hand-maintaining a generator was worse than the problem.',
      },
      {
        exchange: 'b181a987-86fd-48c4-8275-77d83ca82e01',
        note: 'Stencil faces for the headline, rejected on inspection because the stencil breaks fall in places letters do not expect.',
      },
    ],
  },
  mmm: {
    title: 'Prompts that begin with "Mmm,"',
    blurb:
      'Selected by that rule alone rather than by hand, and comprehensive. It turns out to mark a particular thing: a position already arrived at, with some reluctance about it.',
    entries: [
      {
        exchange: '1cf0fbc6-7793-4447-81f3-7b753558091f',
        note: 'On a comment that fixated on how Markdown generates ids, for what is a standard mapping.',
      },
      {
        exchange: 'c232af71-fa7e-4389-b666-a22015003d0a',
        note: 'On being told display: contents was the clever answer.',
      },
      {
        exchange: 'e4b9eba1-87a1-47b8-b2e4-da461e8c3643',
        note: 'On tile-packing crops together: it injects judgement into the diagram.',
      },
      {
        exchange: 'c8732277-4f75-4b2a-afcf-2b1519878bed',
        note: 'On terminal data differing drastically from district harvest data.',
      },
      {
        exchange: '692b43f3-52ed-430e-bc61-ddff97fb31e8',
        note: 'On Claude installing poppler without asking.',
      },
      {
        exchange: 'd5153032-fe57-40e9-9be0-02d744922379',
        note: 'Uneasy about accepting that the component is not always the level of reuse.',
      },
      {
        exchange: '8556ebdd-11e8-4b4f-a0e7-882e5ff51c3b',
        note: 'On the .d.ts shim files accumulating to prop up jsonc imports.',
      },
      {
        exchange: '5e280af1-bd78-4dde-9f30-d4636144e279',
        note: 'Reaching for a faded pastel palette instead of an earthy one.',
      },
      {
        exchange: 'b181a987-86fd-48c4-8275-77d83ca82e01',
        note: 'On the stencil fonts, once they were on screen.',
      },
      {
        exchange: '3ce3e5f7-5e49-44a6-944e-6842087bba52',
        note: 'On being told the corn spike was real, having been told earlier it was not.',
      },
      {
        exchange: '899a237a-f9a9-4583-b029-676c533a02b4',
        note: 'On clearing a search reviving the previous selection instead of nothing.',
      },
      {
        exchange: '42d6dbd5-df68-4830-8ffd-869fcbd403ba',
        note: 'Closing the performance question: a 200 KB page is completely fine.',
      },
      {
        exchange: 'cc64c62a-b33c-47e4-af39-76b18a71ea6f',
        note: 'On whether zod should be allowed to apply a default rather than only validate.',
      },
      {
        exchange: '8a55c5ae-cd5b-4504-898f-7efea882ffa5',
        note: 'Accepting a name for the chart because none of the candidates spoke to him.',
      },
      {
        exchange: '69625cac-adf0-4cbb-b25e-ba7512afc1b3',
        note: 'On a default encoded as ?? true somewhere far from where it is declared.',
      },
      {
        exchange: '2f9e58a2-5cc6-45da-ac3a-782f7a31e951',
        note: 'On fetch.ts knowing things only the MARS client should know.',
      },
      {
        exchange: '20a12868-2d50-418a-9a68-332feba3826c',
        note: 'Redirecting from colocated CSS to moving the project to TypeScript 7 first.',
      },
      {
        exchange: '7a975418-2ca1-47d2-89d6-f4b3b12e264e',
        note: 'Setting the naming conventions the codebase still follows.',
      },
      {
        exchange: 'c2a92964-a972-4b2e-b550-88ea1bbd1ca0',
        note: 'On a two-directory import root being a code smell.',
      },
      {
        exchange: '73a56ebb-04f4-43fc-8376-66c473c0bf51',
        note: 'On a CSS rule branching by screen height rather than applying universally.',
      },
      {
        exchange: '0b61a02a-96fd-4eef-8655-a38db29e3c51',
        note: 'Proposing that the crop list start from Foodwise and filter down.',
      },
      {
        exchange: '81b55a62-022b-43dc-b3a1-da06a089a3ce',
        note: 'On a generated file needing to admit which entries were written by hand.',
      },
      {
        exchange: 'e9cb99e1-345c-42b0-b3a0-9490611b7158',
        note: 'Narrowing the refactor to the row styling rather than a shared component.',
      },
      {
        exchange: 'ec7441cf-a966-49d0-b93d-0afddf223d9a',
        note: 'Accepting a source as good enough for now, with a note to revisit it.',
      },
      {
        exchange: '2c6db9f4-982d-4a91-8bc0-79f79ded75ae',
        note: 'Asking the whitespace solver to treat the left and right margins separately.',
      },
      {
        exchange: 'c746f07f-aa28-476d-a27c-a2c1397dc14a',
        note: 'Wanting the month labels outlined so they separate from the gridlines.',
      },
      {
        exchange: '2af2d9c8-3db6-4470-8e3c-5e630acb6093',
        note: 'On a character-width constant that would silently drift if the font weight changed.',
      },
      {
        exchange: 'c49d4c6d-e2dd-4ef1-a66c-7b422605083b',
        note: 'On whether choosing a font means text width can be calculated instead of measured.',
      },
      {
        exchange: '8ffef500-ee93-49d5-97c4-d398168579b3',
        note: "On taking the watercolour plates from Wikimedia rather than the USDA's own site.",
      },
      {
        exchange: '521323f2-e1f5-452b-b29f-182302e267aa',
        note: 'On images.d.ts being the wrong name for a file that also types .txt.',
      },
      {
        exchange: '92fac2c9-50b6-477d-8237-175274610389',
        note: 'Cutting a comment that justified a decision nobody would question.',
      },
      {
        exchange: 'b5e4c4fd-13f8-4750-ba3f-45069631897d',
        note: 'On why the week index starts at 1, which ended with it starting at 0.',
      },
      {
        exchange: 'f20ee831-4512-4b0b-8840-1cf5ea4f55cd',
        note: 'Switching the ordering key to the first peak midpoint rather than the widest.',
      },
      {
        exchange: '687ac0b8-92a5-4a55-9cbe-3ba5e7aaccb6',
        note: 'Stashing the markdown work so the layout could land in its own commit.',
      },
      {
        exchange: '429ddd69-1ba6-4fa3-9958-573d1b4421d5',
        note: 'Allowing an incidental viewport change into a commit it did not belong in.',
      },
      {
        exchange: '299fec25-10a1-4938-ab7b-bd79b814014e',
        note: 'Asking for the hand-written strawberry entry to be restored after it was clobbered.',
      },
      {
        exchange: 'd17493f9-6d7d-41e7-ac7e-a3039a73b879',
        note: 'Making the generated flag required rather than optional with a comment.',
      },
      {
        exchange: '3b26d152-6e6d-4531-8923-62249bcc28f9',
        note: 'Asking whether the custom paper row should share the Option component.',
      },
      {
        exchange: 'd188ec3a-0776-45d3-be29-bb95dcc20e8e',
        note: 'Moving two week constants to sit beside the rest of the season logic.',
      },
      {
        exchange: '5e693dcc-48b5-4689-bbb2-61b18eb47b70',
        note: "Noticing the banner's hide animation had regressed.",
      },
      {
        exchange: '00724493-af0a-4a12-a33b-764714b3d902',
        note: 'Asking whether the jsonc problem was an Astro limitation, which it was.',
      },
    ],
  },
};

/**
 * FIRST DRAFT, proposed by Claude from the commit subjects — rewrite freely.
 *
 * The grouping is structural and the titles lean on what the commits already say, but where a
 * run of commits stops being one topic is a judgement call, and so is every chapter title here.
 */
export const TOPICS: Topic[] = [
  {
    id: 'scaffold',
    title: 'Standing up the project',
    blurb: 'An Astro install with React bolted on, before any of it had been questioned.',
    commits: ['7e433f4', '93be98b', '81e8420'],
  },
  {
    id: 'first-data',
    title: 'First data and a schema',
    blurb: 'Hand-written Bay Area seasons, a schema to hold them, and tests to keep them honest.',
    commits: ['f2be5df', '51f489d', '3647c38'],
  },
  {
    id: 'toolchain',
    title: 'Settling the toolchain',
    blurb:
      'Biome, then oxlint; Astro, then bun native; TypeScript 6, then 7 — most of the initial stack replaced inside a day.',
    commits: ['38e2125', 'cd0be06', '74ad57f', 'f923725', '8066ed7', 'cf9e7d1', '358fdb7'],
  },
  {
    id: 'ribbons',
    title: 'The first shapes on the page',
    blurb:
      'A streamgraph of hand-written seasons, then ribbons with fixed baselines once the peaks started shoving each other around.',
    commits: ['d75fc5f', '8c375ba', 'e5996a4', '37ff719', '25b9e45', '601ee01'],
  },
  {
    id: 'banner',
    title: 'The banner',
    blurb: 'The floating card that introduces the poster and holds its controls.',
    commits: ['1bfc740', '4148309', 'd366311', '5f5bdb3'],
  },
  {
    id: 'paper-size',
    title: 'Choosing the paper',
    blurb: 'Letting a reader pick the sheet, and making the poster take its proportions from it.',
    commits: ['db8ac1c', '9d58c43', '376b232'],
  },
  {
    id: 'routing',
    title: 'Regions and routing',
    blurb: 'A second region stubbed out, and URLs that can name which one you are looking at.',
    commits: ['bc5d243', 'afe4b18', 'b8b143c'],
  },
  {
    id: 'mars-first',
    title: 'Finding USDA MARS',
    blurb:
      'A month-granular source is not enough, and USDA Market News turns out to publish weekly shipment volume.',
    commits: ['b331ed3', 'd7ad261', 'db2b3d3'],
  },
  {
    id: 'svg-poster',
    title: 'All the way to SVG',
    blurb: 'Abandoning HTML for the poster, so that what is on screen is what prints.',
    commits: ['4d7dd3e', '48b8d30'],
  },
  {
    id: 'mars-terminal',
    title: 'Terminal data, and portrait',
    blurb: 'Switching to terminal reports, and turning the sheet upright.',
    commits: ['1a32a3c', '523b2e5'],
  },
  {
    id: 'mars-movement',
    title: 'Movement reports, not prices',
    blurb: 'Discovering the terminal reports were the wrong ones, and rebuilding around movement.',
    commits: ['ea78335', '4d45795', 'eac0893'],
  },
  {
    id: 'ridgeline',
    title: 'Streamgraph to ridgeline',
    blurb: 'Giving each crop its own baseline, so a quiet season reads as quiet rather than thin.',
    commits: ['06d8a69'],
  },
  {
    id: 'peak-voting',
    title: 'Deciding what "peak" means',
    blurb:
      'A first answer to which weeks are peak, six years of data to vote on it, and a band for where the years disagree.',
    commits: ['5fee654', '0fcd929', '06a6506', '251c265'],
  },
  {
    id: 'chart-labels',
    title: 'Labels, gridlines and a serif',
    blurb: 'Labels moved off the ridges, gridlines behind them, and a serif to set it all in.',
    commits: ['ee0bd55', 'f1b4d61', '633de99', 'cb95a5f'],
  },
  {
    id: 'district-filter',
    title: 'Filtering to local districts',
    blurb:
      'Narrowing statewide volume to the districts a vendor could drive in from — and giving up on citrus.',
    commits: ['6527b18', '1d96ca6', 'ab39b1b', 'b4cda6c', '1a21e14'],
  },
  {
    id: 'playfair',
    title: 'Playfair for the headline',
    blurb: 'A display face for the headline, and nothing else.',
    commits: ['66c5857'],
  },
  {
    id: 'poster-furniture',
    title: 'Footer, frame and parts',
    blurb: 'The fine print, the parts the poster is assembled from, and one border removed.',
    commits: ['c211566', 'd510101', '5283b95'],
  },
  {
    id: 'colors',
    title: 'Desaturating the crops',
    blurb: 'Pulling the saturation out of every crop, so twelve of them can sit together.',
    commits: ['fa81f8a'],
  },
  {
    id: 'whitespace',
    title: 'Placing the watercolours',
    blurb: 'Measuring the space the chart leaves empty, and putting the first watercolours in it.',
    commits: ['867a67b', '4796e0b', '4623970', '8b6ec4e'],
  },
  {
    id: 'crop-picker',
    title: 'Choosing crops',
    blurb:
      'Letting a reader choose which crops appear, and keeping the plates tied to what is shown.',
    commits: ['4d337b2', '678d93b'],
  },
  {
    id: 'about-scaffold',
    title: 'An about section',
    blurb: 'Somewhere to explain the project, and a namespace to keep the poster separate from it.',
    commits: ['e7d2efd', 'd1a4b9a'],
  },
  {
    id: 'licenses',
    title: 'Licensing',
    blurb: 'What this is built from, and what anyone may do with it.',
    commits: ['50717ed', '15098ee'],
  },
  {
    id: 'sources-page',
    title: 'Saying where it came from',
    blurb: 'Where the data came from, how it was interpreted, and where a model wrote the words.',
    commits: ['e05d4a2', '8f96690'],
  },
  {
    id: 'print',
    title: 'Printing, and better plates',
    blurb: 'Making the browser print dialog produce the artifact the whole project is for.',
    commits: ['9782829', 'd930e31'],
  },
  {
    id: 'crop-defaults',
    title: 'Which crops show by default',
    blurb: 'Deciding which crops a reader sees before choosing anything, declared crop by crop.',
    commits: ['06cfffb', '6efa4d0'],
  },
  {
    id: 'season-smoothing',
    title: 'Spikes, dips and the year boundary',
    blurb:
      'Second thoughts about the algorithm: one-week spikes, a crop ending on Dec 31, and weeks counted from zero.',
    commits: ['41183d4', '80021f4', 'c2b1a7c', '96b9780', '0ffa40e'],
  },
  {
    id: 'ny-data',
    title: 'A second region',
    blurb: 'New York, from a state harvest chart, because no shipment report covers it.',
    commits: ['49ad669'],
  },
  {
    id: 'ny-plates',
    title: 'New York plates, at print resolution',
    blurb: 'Plates for the second region, and the resolution to print them at.',
    commits: ['3fdc0cc', '18be289', 'ff1110f', '73c7f8b'],
  },
  {
    id: 'ny-provenance',
    title: 'What New York data may be republished',
    blurb: 'What a state agency chart permits, which is not what a federal one does.',
    commits: ['332d94a', '4dabc0b', '5310c07'],
  },
  {
    id: 'perf-mobile',
    title: 'Performance and small screens',
    blurb: 'Measuring what the poster actually costs to load, and making it work on a phone.',
    commits: ['620812b', '6bd998d', '406eddf'],
  },
  {
    id: 'curation',
    title: 'Reading the session back, and splitting the bundle',
    blurb:
      'Turning the raw log into something with chapters, and putting the browser behind its own chunk so the poster pays nothing for it.',
    commits: ['6c536b9', '8f3086c'],
  },
  {
    id: 'browser-start',
    title: 'A page, and the data behind it',
    blurb:
      'The section itself, the derived file it reads, and the decision to treat that file as a cache rather than a build step.',
    commits: ['26fb3a8', '5ba81af', '97b1c91'],
  },
  {
    id: 'browser-reading',
    title: 'Two panes, and a conversation',
    blurb:
      'The layout, then the transcript set as a chat in the monospace it was typed in, with the replies rendered as the Markdown they were written in.',
    commits: ['bac1319', '53503c8', '8adc867'],
  },
  {
    id: 'browser-contents',
    title: 'Finding your way around',
    blurb:
      'The table of contents, choosing what the right pane shows, and moving every blurb into the file that owns the curation.',
    commits: ['8c0cea6', 'ddd7a43', '2bcab79'],
  },
  {
    id: 'browser-citing',
    title: 'Citing a prompt, and collapsing the rest',
    blurb:
      'Timestamps that copy a link to one exchange, and controls for how much of each turn to draw.',
    commits: ['5874325', '9c9629e'],
  },
  {
    id: 'browser-search',
    title: 'Search, and URLs that fail loudly',
    blurb:
      'Search as another way in rather than a parameter beside them, links that say so when they name nothing, and opening a single collapsed reply.',
    commits: ['7d8ce41', 'a2be6c9', '4cb1e74', '9f26535', '811d770', 'cfa5b78'],
  },
  {
    id: 'collections',
    title: 'Collections, and what they claim',
    blurb:
      'Eight hand-picked sets over the session, each entry carrying a note that says why it is worth reading.',
    commits: ['df4f2f4', '38964bd', '5d1747d'],
  },
  {
    id: 'browser-polish',
    title: 'What it opens on, and a tidy-up',
    blurb:
      'A collection as the landing view, a density that follows from the kind of view, and then small screens, stale figures and unused exports.',
    commits: ['b5eceee', '7c9c2ab', '414d14d', 'c8ec501', '3aa364f'],
  },
  {
    id: 'written-markdown',
    title: 'The written sections in Markdown',
    blurb:
      'Moving the prose out of JSX so it can be written as prose: links that resolve by where they point, and headings anything can link to.',
    commits: ['01aa10a', '130514b', 'ee0449a', '5afbc54', 'e49370a'],
  },
  {
    id: 'identity',
    title: 'A wordmark, an icon, and copy written by hand',
    blurb:
      'The name set one way everywhere and the tab icon drawn from it, the last of the scaffolding cleared out, every comment checked for what had stopped being true — and then the pages written without a model.',
    commits: ['4ec1713', '04b406e', '0421a75', '5e0af21', 'bceb575'],
  },
  {
    id: 'transcript-finish',
    title: 'Chapters recut, and the plates rebalanced',
    blurb:
      'Six chapters over the whole session each opening on a prompt that names it, a footer that carries a reader onward, and five watercolours placed where they were asked for.',
    commits: ['7e16d5f', 'fba44f9', '4c1aa2f'],
  },
  {
    id: 'going-live',
    title: 'Going live',
    blurb:
      'A workflow that builds and deploys, a domain pointed at it, the retired API key added to what the transcript scrubs — then the banner tightened and a lint warning that turned out to be right.',
    commits: [
      '298b51a',
      'b3c9ac6',
      '08b7f2c',
      '715a05e',
      'e997ee4',
      'c725299',
      'dd54574',
      'e51019e',
    ],
  },
  {
    id: 'findable',
    title: 'Titles, cards, and a page a crawler can read',
    blurb:
      "A title per route, a sharing card rendered from each region's own poster, and a file per route so the site answers 200 with its own words rather than falling back to a 404.",
    commits: ['d8d4d24', '178fdf2', 'ab9a56a'],
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: 'prototype',
    title: 'Prototyping with faked data',
    blurb:
      'A blank directory to a chart that draws, on hand-written seasons for one region, while the stack underneath was still being argued about.',
    topics: ['scaffold', 'first-data', 'toolchain', 'ribbons', 'banner', 'paper-size', 'routing'],
  },
  {
    id: 'sfdata',
    title: 'Finding good San Francisco data',
    blurb:
      'Hunting for produce data at week resolution, finding USDA shipment volume, and working out which of those weeks a season is.',
    topics: [
      'mars-first',
      'svg-poster',
      'mars-terminal',
      'mars-movement',
      'ridgeline',
      'peak-voting',
      'chart-labels',
      'district-filter',
    ],
  },
  {
    id: 'watercolours',
    title: 'Designing with the USDA Pomological Watercolor Collection',
    blurb:
      'Making it a poster rather than a chart: type, colour, and fruit painted for the USDA a century ago, fitted into the space the crops leave empty. The written sections and a second look at the season algorithm follow on the end.',
    topics: [
      'playfair',
      'poster-furniture',
      'colors',
      'whitespace',
      'crop-picker',
      'about-scaffold',
      'licenses',
      'sources-page',
      'print',
      'crop-defaults',
      'season-smoothing',
    ],
  },
  {
    id: 'newyork',
    title: 'Generalizing the poster with New York data',
    blurb:
      'A second region with no shipment data behind it, built from a state harvest chart instead — and everything that had quietly assumed one region.',
    topics: ['ny-data', 'ny-plates', 'ny-provenance', 'perf-mobile'],
  },
  {
    id: 'transcript',
    title: 'Building out the AI session transcript',
    blurb:
      'Publishing this conversation as something readable: chapters over the log, a chat to read it in, links into any part of it, and collections picked by hand.',
    topics: [
      'curation',
      'browser-start',
      'browser-reading',
      'browser-contents',
      'browser-citing',
      'browser-search',
      'collections',
      'browser-polish',
    ],
  },
  {
    id: 'publishing',
    title: 'Polish and publishing',
    blurb:
      'The written sections moved to Markdown so they could be written as prose, a wordmark and an icon, and the last of the scaffolding cleared out.',
    topics: ['written-markdown', 'identity', 'transcript-finish', 'going-live', 'findable'],
  },
];
