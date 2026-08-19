import { Ribbons } from '@/src/components/Ribbons';
import type { Region } from '@/data/regions/schema';
import { useQueryParams } from '@/src/lib/params';
import { type Plate, PLATES } from '@/src/lib/plates';

/**
 * Laid out in "poster units": always POSTER_W wide, height from the paper's aspect ratio. The
 * SVG scales uniformly to any display or print size, so every constant below is proportional —
 * nothing is measured, and what is on screen is what prints.
 */
const POSTER_W = 1000;

const MARGIN = 32; // paper margin, same on all four sides
const HEADER_GAP = 24; // between the header and the chart card

// Shared because the paper, the header and the fine print have to read as one voice. Anything
// used in only one place lives with the piece that uses it.
const PAPER = '#ffffff';
const INK = '#14532d';
const INK_MUTED = '#2f6b47';

/**
 * The printable poster: a header, the chart on its card, and fine print, on white paper at
 * the chosen aspect ratio.
 *
 * Only placement lives here. What the header says and how the fine print is set belong to
 * those pieces; this decides how much room each gets and hands the rest to the chart.
 */
export function Poster({ region }: { region: Region }) {
  const { w, h } = useQueryParams();
  const posterH = (POSTER_W * h) / w;

  // One line per distinct source, so a region drawing on several says so and the usual case of
  // one shared derivation says it once.
  const credits = [...new Set(region.items.flatMap((item) => item.sources.map((s) => s.credit)))];

  const cardY = MARGIN + HEADER_H + HEADER_GAP;
  const cardW = POSTER_W - MARGIN * 2;
  const cardH = posterH - cardY - footerHeight(credits.length) - MARGIN;

  // Fit both axes by capping *width* from the paper ratio: max-height would clamp the height
  // while leaving width maximal, letterboxing the poster and casting the shadow round the box.
  const maxWidth = `min(64rem, calc((100vh - 3rem) * ${w} / ${h}))`;
  return (
    <svg
      className="font-poster mx-auto block h-auto w-full shadow-lg"
      style={{ maxWidth }}
      viewBox={`0 0 ${POSTER_W} ${posterH}`}
      role="img"
      aria-label={`In-season produce for ${region.name}`}
    >
      <rect width={POSTER_W} height={posterH} fill={PAPER} />

      <Header region={region.name} y={MARGIN} />
      <Card
        items={region.items}
        plates={PLATES[region.id] ?? []}
        x={MARGIN}
        y={cardY}
        width={cardW}
        height={cardH}
      />
      <Footer credits={credits} y={cardY + cardH} />
    </svg>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────────────────

// On a wall the poster announces what it is before where it applies, so the region sits above
// as a tracked overline rather than heading the block. No year: these are typical seasons
// across six of them, not a forecast. The colloquial phrasing only holds up in the display
// face — the workhorse sets these same words as prose.
const HEADLINE = 'What’s in season at the farmers’ market'; // typographic apostrophes
const HEADLINE_SIZE = 33;
const HEADLINE_H = 38; // the headline's line box
const REGION_SIZE = 12;
const REGION_TRACKING = 3; // a short line takes tracking well, and reads as a stamp
const REGION_GAP = 12; // between the overline and the headline's box

/** What the header occupies, so the layout can place the card below it. */
const HEADER_H = REGION_SIZE + REGION_GAP + HEADLINE_H;

function Header({ region, y }: { region: string; y: number }) {
  return (
    <g textAnchor="middle" dominantBaseline="central">
      <text
        x={POSTER_W / 2}
        y={y + REGION_SIZE / 2}
        fontSize={REGION_SIZE}
        fontWeight={600}
        letterSpacing={REGION_TRACKING}
        fill={INK_MUTED}
      >
        {region.toUpperCase()}
      </text>
      <text
        x={POSTER_W / 2}
        y={y + REGION_SIZE + REGION_GAP + HEADLINE_H / 2}
        className="font-headline"
        fontSize={HEADLINE_SIZE}
        fontWeight={700}
        fill={INK}
      >
        {HEADLINE}
      </text>
    </g>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────────────────────

const CARD_PAD = 12; // inset between the card's edge and the chart it holds
const CARD_RADIUS = 12;
// Ribbons paints its separator hairlines and its drift tint against this same colour, where it
// is CHART_BG. The two have to agree, or overlapping ridges stop reading as separate shapes.
const CARD_COLOR = '#ffffff';

/**
 * The card the chart sits on, inset from its own edges.
 *
 * Invisible while the paper is also white, but it is the chart's ground rather than decoration:
 * the moment the paper carries a tint or an illustration, this is what keeps the ridges legible
 * and what CARD_COLOR above has to agree with.
 */
function Card({
  items,
  plates,
  x,
  y,
  width,
  height,
}: {
  items: Region['items'];
  plates: readonly Plate[];
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <>
      <rect x={x} y={y} width={width} height={height} rx={CARD_RADIUS} fill={CARD_COLOR} />
      <g transform={`translate(${x + CARD_PAD} ${y + CARD_PAD})`}>
        <Ribbons
          items={items}
          plates={plates}
          width={width - CARD_PAD * 2}
          height={height - CARD_PAD * 2}
        />
      </g>
    </>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────────────────────

// One URL only: on paper every address is dead weight unless someone would type it, so that
// page carries the method, the repo and the per-crop citations rather than the poster.
const SOURCES_URL = 'vertumnus.fyi/about/sources';
const FOOTER_SIZE = 8;
const FOOTER_LEAD = 11; // between credit lines
const FOOTER_GAP = 14; // between the card and the first credit

/** What `lines` of fine print occupy, so the card can yield exactly that much. */
function footerHeight(lines: number): number {
  return FOOTER_GAP + lines * FOOTER_LEAD;
}

/**
 * Provenance on the left, where to go on the right.
 *
 * The headline claims a farmers' market; the data is wholesale shipment volume from named
 * growing districts, and this is where that gets said plainly. Shares the overline's colour so
 * the words read as one voice — 6.3:1 on white, which the sage frame it replaced could not
 * manage at this size.
 */
function Footer({ credits, y }: { credits: string[]; y: number }) {
  const first = y + FOOTER_GAP + FOOTER_SIZE / 2;
  return (
    <g fontSize={FOOTER_SIZE} fill={INK_MUTED}>
      {credits.map((credit, i) => (
        <text key={credit} x={MARGIN} y={first + i * FOOTER_LEAD}>
          {credit}
        </text>
      ))}
      <text x={POSTER_W - MARGIN} y={first} textAnchor="end">
        {SOURCES_URL}
      </text>
    </g>
  );
}
