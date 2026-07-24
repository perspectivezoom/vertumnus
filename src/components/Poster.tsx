import { Ribbons } from '@/src/components/Ribbons';
import type { Region } from '@/src/data/types';
import { useQueryParams } from '@/src/lib/params';

/**
 * The poster is laid out in "poster units": always POSTER_W wide, with the height set by the
 * chosen paper's aspect ratio. The SVG then scales uniformly to whatever size it is displayed
 * or printed at, so every constant below is inherently proportional — nothing is measured, and
 * what you see on screen is exactly what prints.
 */
const POSTER_W = 1000;

const FRAME = 32; // sage border, same thickness on all four sides
const TITLE_SIZE = 30;
const TITLE_H = 36; // the title's line box
const TITLE_GAP = 24; // space between the title and the chart card
const CARD_PAD = 12;
const CARD_RADIUS = 12;

const FRAME_COLOR = '#cbd7be';
const TITLE_COLOR = '#14532d';

/** The printable poster: a faded sage frame at the paper's aspect ratio, titled, wrapping the chart. */
export function Poster({ region }: { region: Region }) {
  const { w, h } = useQueryParams();
  const posterH = (POSTER_W * h) / w;

  const cardY = FRAME + TITLE_H + TITLE_GAP;
  const cardW = POSTER_W - FRAME * 2;
  const cardH = posterH - cardY - FRAME;

  // The SVG fits the viewport on both axes: wide posters cap at max-w, tall ones cap at the
  // screen height (less the shell's padding), with width shrinking to keep the paper's ratio.
  return (
    <svg
      className="mx-auto block h-auto max-h-[calc(100vh-3rem)] w-full max-w-5xl font-sans shadow-lg"
      viewBox={`0 0 ${POSTER_W} ${posterH}`}
      role="img"
      aria-label={`In-season produce for ${region.name}`}
    >
      <rect width={POSTER_W} height={posterH} fill={FRAME_COLOR} />

      <text
        x={POSTER_W / 2}
        y={FRAME + TITLE_H / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={TITLE_SIZE}
        fontWeight={600}
        fill={TITLE_COLOR}
      >
        {region.name}
      </text>

      <rect x={FRAME} y={cardY} width={cardW} height={cardH} rx={CARD_RADIUS} fill="#ffffff" />
      <g transform={`translate(${FRAME + CARD_PAD} ${cardY + CARD_PAD})`}>
        <Ribbons items={region.items} width={cardW - CARD_PAD * 2} height={cardH - CARD_PAD * 2} />
      </g>

      {/* TODO: footer — source citations as fine print + a link back to vertumnus */}
    </svg>
  );
}
