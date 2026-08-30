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
 * Threads may overlap topics freely. A commit that appears only here and in no topic is work with
 * no place in the narrative — upkeep — and is deliberately kept out of the chapters.
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
      'Committing this conversation to the repository, and repeatedly cutting it down as it grew. Housekeeping rather than a chapter of the story, which is why it appears here and nowhere else.',
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
    blurb: 'Exchanges where the model turned up something neither of us knew going in.',
    entries: [],
  },
  pushback: {
    title: 'Where I pushed back',
    blurb:
      'Exchanges where Claude took the wrong direction, asserted something untrue, or assumed what it should have asked — and I said so.',
    entries: [],
  },
  praise: {
    title: 'Where Claude got it right',
    blurb:
      'Work I said was good, found by the prompt that followed it. Each entry links to the work rather than to the compliment.',
    entries: [],
  },
  verbosity: {
    title: 'Where I asked for less',
    blurb:
      'Requests to cut the comments down, running from the first chapter to the last. The one correction that never stopped being necessary.',
    entries: [],
  },
  measured: {
    title: 'Where a guess became a measurement',
    blurb:
      'Exchanges where a claim one of us was confident about got tested, and the answer came back different.',
    entries: [],
  },
  sources: {
    title: "What the sources wouldn't say",
    blurb:
      'Exchanges where the data would not support what the poster wanted to claim. The standing rule against invented sources was written here.',
    entries: [],
  },
  abandoned: {
    title: 'What we tried first',
    blurb:
      'Approaches built far enough to judge, then dropped: Astro, Playwright, Biome, jsonc, the streamgraph, imitation watercolour, and a browser written all at once.',
    entries: [],
  },
  mmm: {
    title: 'Prompts that begin with "Mmm,"',
    blurb:
      'Selected by that rule alone rather than by hand, and comprehensive. It turns out to mark a particular thing: a position already arrived at, with some reluctance about it.',
    entries: [],
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
    blurb: 'An Astro install with React bolted on, before any of it had been questioned.',
    title: 'Standing up the project',
    commits: ['7e433f4', '93be98b', '81e8420'],
  },
  {
    id: 'first-data',
    blurb: 'Hand-written Bay Area seasons, a schema to hold them, and tests to keep them honest.',
    title: 'First data and a schema',
    commits: ['f2be5df', '51f489d', '3647c38'],
  },
  {
    id: 'toolchain',
    blurb:
      'Biome, then oxlint; Astro, then bun native; TypeScript 6, then 7 — most of the initial stack replaced inside a day.',
    title: 'Settling the toolchain',
    commits: ['38e2125', 'cd0be06', '74ad57f', 'f923725', '8066ed7', '358fdb7'],
  },
  {
    id: 'streamgraph',
    blurb: 'The first attempt at drawing a year of produce, as stacked bands.',
    title: 'First pass: a streamgraph',
    commits: ['d75fc5f'],
  },
  {
    id: 'ribbons',
    blurb:
      'Turning the bands into ribbons that could carry a label, and cleaning up twice on the way.',
    title: 'Ribbons take shape',
    commits: ['8c375ba', 'e5996a4', '37ff719', '25b9e45', '601ee01'],
  },
  {
    id: 'banner',
    blurb: 'The floating card that introduces the poster and holds its controls.',
    title: 'The banner',
    commits: ['1bfc740', '4148309', 'd366311', '5f5bdb3'],
  },
  {
    id: 'paper-size',
    blurb: 'Letting a reader pick the sheet, and making the poster take its proportions from it.',
    title: 'Choosing the paper',
    commits: ['db8ac1c', '9d58c43'],
  },
  {
    id: 'routing',
    blurb: 'A second region stubbed out, and URLs that can name which one you are looking at.',
    title: 'Regions and routing',
    commits: ['bc5d243', 'afe4b18', 'b8b143c', 'b331ed3'],
  },
  {
    id: 'mars-first',
    blurb: 'Finding that USDA Market News publishes shipment data at all.',
    title: 'Finding USDA MARS',
    commits: ['d7ad261'],
  },
  {
    id: 'svg-poster',
    blurb: 'Abandoning HTML for the poster, so that what is on screen is what prints.',
    title: 'All the way to SVG',
    commits: ['4d7dd3e', '48b8d30'],
  },
  {
    id: 'mars-terminal',
    blurb: 'Switching to terminal reports, and turning the sheet upright.',
    title: 'Terminal data, and portrait',
    commits: ['1a32a3c', '523b2e5'],
  },
  {
    id: 'mars-movement',
    blurb: 'Discovering the terminal reports were the wrong ones, and rebuilding around movement.',
    title: 'Movement reports, not prices',
    commits: ['ea78335', '4d45795', 'eac0893'],
  },
  {
    id: 'ridgeline',
    blurb: 'Giving each crop its own baseline, so a quiet season reads as quiet rather than thin.',
    title: 'Streamgraph to ridgeline',
    commits: ['06d8a69'],
  },
  {
    id: 'peak-voting',
    blurb:
      'A first answer to which weeks are peak, six years of data to vote on it, and a band for where the years disagree.',
    title: 'Deciding what "peak" means',
    commits: ['5fee654', '0fcd929', '06a6506', '251c265'],
  },
  {
    id: 'chart-labels',
    blurb: 'Labels moved off the ridges, gridlines behind them, and a serif to set it all in.',
    title: 'Labels, gridlines and a serif',
    commits: ['ee0bd55', 'f1b4d61', '633de99', 'cb95a5f'],
  },
  {
    id: 'district-filter',
    blurb:
      'Narrowing statewide volume to the districts a vendor could drive in from — and giving up on citrus.',
    title: 'Filtering to local districts',
    commits: ['6527b18', '1d96ca6', 'ab39b1b', 'b4cda6c', '1a21e14'],
  },
  {
    id: 'playfair',
    blurb: 'A display face for the headline, and nothing else.',
    title: 'Playfair for the headline',
    commits: ['66c5857'],
  },
  {
    id: 'poster-furniture',
    blurb: 'The fine print, the parts the poster is assembled from, and one border removed.',
    title: 'Footer, frame and parts',
    commits: ['c211566', 'd510101', '5283b95'],
  },
  {
    id: 'colors',
    blurb: 'Pulling the saturation out of every crop, so twelve of them can sit together.',
    title: 'Desaturating the crops',
    commits: ['fa81f8a'],
  },
  {
    id: 'whitespace',
    blurb: 'Measuring the space the chart leaves empty, and putting the first watercolours in it.',
    title: 'Placing the watercolours',
    commits: ['867a67b', '4796e0b'],
  },
  {
    id: 'crop-picker',
    blurb:
      'Letting a reader choose which crops appear, and keeping the plates tied to what is shown.',
    title: 'Choosing crops',
    commits: ['4d337b2', '678d93b'],
  },
  {
    id: 'about-scaffold',
    blurb: 'Somewhere to explain the project, and a namespace to keep the poster separate from it.',
    title: 'An about section',
    commits: ['e7d2efd', 'd1a4b9a'],
  },
  {
    id: 'licenses',
    blurb: 'What this is built from, and what anyone may do with it.',
    title: 'Licensing',
    commits: ['50717ed', '15098ee'],
  },
  {
    id: 'sources-page',
    blurb: 'Where the data came from, how it was interpreted, and where a model wrote the words.',
    title: 'Saying where it came from',
    commits: ['e05d4a2', '8f96690'],
  },
  {
    id: 'print',
    blurb: 'Making the browser print dialog produce the artifact the whole project is for.',
    title: 'Printing, and better plates',
    commits: ['9782829', 'd930e31'],
  },
  {
    id: 'crop-defaults',
    blurb: 'Deciding which crops a reader sees before choosing anything, declared crop by crop.',
    title: 'Which crops show by default',
    commits: ['06cfffb', '6efa4d0'],
  },
  {
    id: 'season-smoothing',
    blurb:
      'Second thoughts about the algorithm: one-week spikes, a crop ending on Dec 31, and weeks counted from zero.',
    title: 'Spikes, dips and the year boundary',
    commits: ['41183d4', '80021f4', 'c2b1a7c', '96b9780', '0ffa40e'],
  },
  {
    id: 'ny-data',
    blurb: 'New York, from a state harvest chart, because no shipment report covers it.',
    title: 'A second region',
    commits: ['49ad669'],
  },
  {
    id: 'ny-plates',
    blurb: 'Plates for the second region, and the resolution to print them at.',
    title: 'New York plates, at print resolution',
    commits: ['3fdc0cc', '18be289', 'ff1110f', '73c7f8b'],
  },
  {
    id: 'ny-provenance',
    blurb: 'What a state agency chart permits, which is not what a federal one does.',
    title: 'What New York data may be republished',
    commits: ['332d94a', '4dabc0b', '5310c07'],
  },
  {
    id: 'perf-mobile',
    blurb: 'Measuring what the poster actually costs to load, and making it work on a phone.',
    title: 'Performance and small screens',
    commits: ['620812b', '6bd998d'],
  },
  {
    id: 'curation',
    title: 'Reading the session back',
    blurb:
      'Cutting the log into chapters and topics, so the conversation could be navigated rather than scrolled.',
    commits: ['6c536b9'],
  },
  {
    id: 'code-splitting',
    title: 'Splitting the bundle',
    blurb:
      'Putting the written sections behind their own chunks, so a browser over a 1.4 MB transcript costs the poster nothing.',
    commits: ['8f3086c'],
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
    commits: ['7d8ce41', 'a2be6c9', '4cb1e74', '9f26535'],
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: 'start',
    title: 'Getting started',
    blurb: 'A blank directory, a first region of hand-written seasons, and a schema to hold them.',
    topics: ['scaffold', 'first-data'],
  },
  {
    id: 'toolchain-chart',
    title: 'A toolchain and a chart',
    blurb: 'Replacing most of the initial stack, and getting the first shapes onto a page.',
    topics: ['toolchain', 'streamgraph', 'ribbons'],
  },
  {
    id: 'controls',
    title: 'Controls',
    blurb: 'The banner, the paper picker, and the routing that lets a URL name a region.',
    topics: ['banner', 'paper-size', 'routing'],
  },
  {
    id: 'real-data',
    title: 'Real data',
    blurb:
      'Finding USDA shipment volume, moving the poster to SVG, and settling on movement reports.',
    topics: ['mars-first', 'svg-poster', 'mars-terminal', 'mars-movement', 'ridgeline'],
  },
  {
    id: 'seasons-first',
    title: 'What a season is',
    blurb: 'A first answer to which weeks count as peak, and the labels to read it by.',
    topics: ['peak-voting', 'chart-labels'],
  },
  {
    id: 'local-design',
    title: 'Local data, and a look',
    blurb:
      'Narrowing statewide volume to districts a vendor drives in from, then typography and colour.',
    topics: ['district-filter', 'playfair', 'poster-furniture', 'colors'],
  },
  {
    id: 'plates-provenance',
    title: 'Watercolours and provenance',
    blurb: 'Filling the empty space with USDA plates, and writing down where all of it came from.',
    topics: ['whitespace', 'crop-picker', 'about-scaffold', 'licenses', 'sources-page'],
  },
  {
    id: 'print-seasons',
    title: 'Print, and second thoughts',
    blurb: 'Making the paper output right, then reopening the season algorithm and not liking it.',
    topics: ['print', 'crop-defaults', 'season-smoothing'],
  },
  {
    id: 'newyork',
    title: 'New York, and polish',
    blurb:
      'A region with no shipment data, built from a state harvest chart — then performance and small screens.',
    topics: ['ny-data', 'ny-plates', 'ny-provenance', 'perf-mobile'],
  },
  {
    id: 'browser',
    title: 'The transcript browser',
    blurb:
      'Publishing this conversation as something readable: chapters over the log, a chat to read it in, and links into any part of it.',
    topics: [
      'curation',
      'code-splitting',
      'browser-start',
      'browser-reading',
      'browser-contents',
      'browser-citing',
      'browser-search',
    ],
  },
];
