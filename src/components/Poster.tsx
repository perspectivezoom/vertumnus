import { Ribbons } from '@/src/components/Ribbons';
import type { Region } from '@/data/regions/schema';
import { useQueryParams } from '@/src/lib/params';

/**
 * Laid out in "poster units": always POSTER_W wide, height from the paper's aspect ratio. The
 * SVG scales uniformly to any display or print size, so every constant below is proportional —
 * nothing is measured, and what is on screen is what prints.
 */
const POSTER_W = 1000;

const FRAME = 32; // sage border, same thickness on all four sides

// On a wall the poster announces what it is before where it applies, so the region sits above
// as a tracked overline rather than heading the masthead. No year: these are typical seasons
// across six of them, not a forecast. The colloquial phrasing only holds up in the display
// face — the workhorse sets these same words as prose.
const HEADLINE = 'What’s in season at the farmers’ market'; // typographic apostrophes
const HEADLINE_SIZE = 33;
const HEADLINE_H = 38; // the headline's line box
const REGION_SIZE = 12;
const REGION_TRACKING = 3; // a short line takes tracking well, and reads as a stamp
const REGION_GAP = 12; // between the overline and the headline's box
const MASTHEAD_H = REGION_SIZE + REGION_GAP + HEADLINE_H;

const TITLE_GAP = 24; // space between the masthead and the chart card
const CARD_PAD = 12;
const CARD_RADIUS = 12;

// Fine print. One URL only: on paper every address is dead weight unless someone would type it,
// so that page carries the method, the repo and the per-crop citations rather than the poster.
const SOURCES_URL = 'vertumnus.fyi/about/sources';
const FOOTER_SIZE = 8;
const FOOTER_LEAD = 11; // between credit lines
const FOOTER_GAP = 14; // between the card and the first credit

const FRAME_COLOR = '#cbd7be';
const HEADLINE_COLOR = '#14532d';
const REGION_COLOR = '#2f6b47'; // lighter than the headline, still print-safe on the frame

/** The printable poster: a faded sage frame at the paper's aspect ratio, titled, wrapping the chart. */
export function Poster({ region }: { region: Region }) {
  const { w, h } = useQueryParams();
  const posterH = (POSTER_W * h) / w;

  // One line per distinct source, so a region drawing on several says so and the usual case of
  // one shared derivation says it once.
  const credits = [...new Set(region.items.flatMap((item) => item.sources.map((s) => s.credit)))];
  const footerH = FOOTER_GAP + credits.length * FOOTER_LEAD;

  const cardY = FRAME + MASTHEAD_H + TITLE_GAP;
  const cardW = POSTER_W - FRAME * 2;
  const cardH = posterH - cardY - footerH - FRAME;
  const footerY = cardY + cardH + FOOTER_GAP + FOOTER_SIZE / 2;

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
      <rect width={POSTER_W} height={posterH} fill={FRAME_COLOR} />

      <text
        x={POSTER_W / 2}
        y={FRAME + REGION_SIZE / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={REGION_SIZE}
        fontWeight={600}
        letterSpacing={REGION_TRACKING}
        fill={REGION_COLOR}
      >
        {region.name.toUpperCase()}
      </text>
      <text
        x={POSTER_W / 2}
        y={FRAME + REGION_SIZE + REGION_GAP + HEADLINE_H / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-headline"
        fontSize={HEADLINE_SIZE}
        fontWeight={700}
        fill={HEADLINE_COLOR}
      >
        {HEADLINE}
      </text>

      <rect x={FRAME} y={cardY} width={cardW} height={cardH} rx={CARD_RADIUS} fill="#ffffff" />
      <g transform={`translate(${FRAME + CARD_PAD} ${cardY + CARD_PAD})`}>
        <Ribbons items={region.items} width={cardW - CARD_PAD * 2} height={cardH - CARD_PAD * 2} />
      </g>

      {/* Provenance on the left, where to go on the right. The headline claims a farmers'
          market; the data is wholesale shipment volume from named districts, and this is where
          that gets said plainly. Shares the overline's colour so the frame reads as one voice —
          4.2:1 on the sage, just under AA, which the print size is doing the rest of. */}
      <g fontSize={FOOTER_SIZE} fill={REGION_COLOR}>
        {credits.map((credit, i) => (
          <text key={credit} x={FRAME} y={footerY + i * FOOTER_LEAD}>
            {credit}
          </text>
        ))}
        <text x={POSTER_W - FRAME} y={footerY} textAnchor="end">
          {SOURCES_URL}
        </text>
      </g>
    </svg>
  );
}
