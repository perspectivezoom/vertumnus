import { area, curveBasis } from 'd3-shape';

import type { Produce } from '@/data/regions/schema';
import {
  coveredWeeks,
  Level,
  MONTHS,
  PEAK_HEIGHT,
  WEEKS_PER_YEAR,
  weeklyBand,
} from '@/src/lib/season';

// All lengths are poster units (see Poster.tsx), which scale with the printed poster.
const PAD_X = 12;
const PAD_TOP = 40; // room for the month axis
const PAD_BOTTOM = 16;

// How many row-spacings tall a full peak ridge is. Above 1 the ridges overlap, which is what
// reclaims the empty space one-row-per-crop would otherwise waste.
const RIDGE_OVERLAP = 1.5;

// Label sizing/placement.
const LABEL_FONT = 12;
const LABEL_GAP = 7; // clear space between a name and the ribbon it sits beside
const CURVE_LEAD = 1; // weeks the smoothed curve starts climbing before the week it belongs to
const MIN_CONTRAST = 4.5; // WCAG AA for body text, against CHART_BG
const AXIS_FONT = 11; // month labels
const CHAR_W_RATIO = 0.6; // approx glyph advance ÷ font size for the medium sans

/**
 * How far above its own baseline a name sits, in row spacings.
 *
 * Ridges rise RIDGE_OVERLAP spacings from their baselines, so the row below tops out
 * `RIDGE_OVERLAP - 1` above this row's baseline and the row above bottoms out `1` above it.
 * Between those is a strip no neighbour can paint into, whatever any of them are doing; a name
 * in the middle of it needs no collision test, only to clear its own ridge.
 */
const LABEL_RISE = (RIDGE_OVERLAP - 1 + 1) / 2;

const CHART_BG = '#ffffff'; // the card the ribbons sit on, and the colour uncertainty fades toward
const UNCERTAIN_TINT = 0.55; // how far the drift curve's fill moves toward CHART_BG

/** One week's vertical slice of a ribbon: its top and bottom edges at position x. */
interface Slice {
  x: number;
  top: number;
  bottom: number;
}

interface Label {
  x: number;
  y: number;
  text: string;
  color: string;
  anchor: 'start' | 'end';
}

interface Ribbon {
  name: string;
  color: string;
  /** The season as it holds whichever way the year goes — drawn solid. */
  path: string;
  /** The season an early or late year would run; null when the two curves coincide. */
  driftPath: string | null;
  driftColor: string;
  label: Label;
}

/** Horizontal scale + label geometry derived from the chart box. */
interface Geometry {
  gridW: number;
  weekToX: (week: number) => number;
}

const areaGen = area<Slice>()
  .x((d) => d.x)
  .y0((d) => d.bottom)
  .y1((d) => d.top)
  .curve(curveBasis);

/** The streamgraph, drawn to fill `width` × `height` of the enclosing poster's coordinate space. */
export function Ribbons({
  items,
  width,
  height,
}: {
  items: Produce[];
  width: number;
  height: number;
}) {
  const { ribbons, months } = buildStreamgraph(items, width, height);

  return (
    <g>
      {months.map((m) => (
        <text key={m.label} x={m.x} y={24} textAnchor="middle" fontSize={AXIS_FONT} fill="#888888">
          {m.label}
        </text>
      ))}

      {ribbons.map((r) => (
        <g key={r.name}>
          {r.driftPath && (
            <path
              d={r.driftPath}
              fill={r.driftColor}
              stroke={CHART_BG}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          )}
          <path
            d={r.path}
            fill={r.color}
            stroke={CHART_BG}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* After every ribbon: rows are painted in order, so a label drawn with its own row
          would be buried by the next one down. Placement keeps them clear regardless. */}
      {ribbons.map((r) => (
        <RibbonLabel key={r.name} {...r.label} />
      ))}
    </g>
  );
}

/** The produce name, set in its own colour beside the ridge it belongs to. */
function RibbonLabel({ x, y, text, color, anchor }: Label) {
  return (
    <text
      x={x}
      y={y}
      fontSize={LABEL_FONT}
      fontWeight={600}
      fill={color}
      textAnchor={anchor}
      dominantBaseline="central"
    >
      {text}
    </text>
  );
}

/**
 * Lay the (pre-sorted) produce out as a ridgeline: one crop per row, each on a **fixed**
 * baseline, rising above it in proportion to how strongly it is in season.
 *
 * A stacked layout puts every ribbon on top of the sum of the ones above it, so a crop coming
 * into season shoves everything below it down — measured at over 40% of the poster's height
 * for the middle rows, even for crops whose own season never changes. Fixed baselines remove
 * that entirely: a row's position encodes only which crop it is.
 *
 * Rows are spaced closer than a peak ribbon is tall (RIDGE_OVERLAP), so peaks rise into the
 * row above and the drawing reclaims the vertical space that plain lanes would waste. Later
 * rows paint over earlier ones, which is what makes the overlaps read as depth. Out-of-season
 * weeks sit flat on the baseline, so an empty January reads as "nothing yet" rather than as a
 * hole left by the mass drifting elsewhere.
 *
 * Each crop is drawn as two curves rather than one: the pale one is the season as an early or
 * late year would run it, rising sooner and falling later, and the solid one is the part that
 * holds whichever way the year goes. Where a crop keeps to the same weeks every year the two
 * coincide and only the solid one is drawn, so the pale margin appears exactly where the
 * harvest is known to wander — and its width is how far. Both fills are opaque: the ridges
 * overlap by design, and a transparent margin would let the neighbour behind it show through,
 * making the least certain parts of the poster the muddiest and printing as a screen rather
 * than as a lighter ink.
 */
function buildStreamgraph(
  items: Produce[],
  width: number,
  height: number,
): { ribbons: Ribbon[]; months: { label: string; x: number }[] } {
  const gridW = width - PAD_X * 2;
  const weekToX = (week: number) => PAD_X + ((week - 1) / WEEKS_PER_YEAR) * gridW;

  const n = items.length;
  const content = height - PAD_TOP - PAD_BOTTOM;
  // Reserve room for the topmost ridge to rise above its baseline without leaving the box.
  const spacing = content / (n - 1 + RIDGE_OVERLAP);
  const ridgeHeight = spacing * RIDGE_OVERLAP;
  const baselineOf = (i: number) => PAD_TOP + ridgeHeight + i * spacing;

  const geometry: Geometry = { gridW, weekToX };

  const ribbons = items.map((item, i) => {
    const baseline = baselineOf(i);
    const slice = (weekly: number[]): Slice[] => {
      const slices = Array.from({ length: WEEKS_PER_YEAR }, (_, wk) => ({
        x: weekToX(wk + 1),
        top: baseline - ((weekly[wk] ?? 0) / PEAK_HEIGHT) * ridgeHeight,
        bottom: baseline,
      }));
      // Extend a flat step to the year-end edge so the fill spans the full width.
      const last = slices.at(-1);
      return last
        ? [...slices, { x: weekToX(WEEKS_PER_YEAR + 1), top: last.top, bottom: last.bottom }]
        : slices;
    };

    const { lower, upper } = weeklyBand(item.spans);
    const drifts = item.spans.some((s) => s.level === Level.Uncertain);

    return {
      name: item.name,
      color: item.color,
      path: areaGen(slice(lower)) ?? '',
      driftPath: drifts ? (areaGen(slice(upper)) ?? '') : null,
      driftColor: mix(item.color, CHART_BG, UNCERTAIN_TINT),
      label: placeLabel(item, geometry, baseline - spacing * LABEL_RISE),
    };
  });

  const months = MONTHS.map((label, m) => ({
    label,
    x: weekToX(1 + ((m + 0.5) * WEEKS_PER_YEAR) / 12),
  }));

  return { ribbons, months };
}

/** Blend two #rrggbb colours, `amount` of the way from `from` to `to`. */
function mix(from: string, to: string, amount: number): string {
  const channels = [1, 3, 5].map((i) => {
    const a = parseInt(from.slice(i, i + 2), 16);
    const b = parseInt(to.slice(i, i + 2), 16);
    return Math.round(a + (b - a) * amount)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

/**
 * Put the crop's name in the margin beside its ridge, on that ridge's own baseline.
 *
 * Names used to sit inside the peak, which is where the ink is — but the rows deliberately
 * overlap, so a tall neighbour rising from below buries the name of the crop above it, and the
 * fix is not more spacing (that gives back the space the overlap exists to reclaim). Out here
 * nothing can cover them: ridges only ever rise from their baselines, so the one row that can
 * reach into this band is the next one down, and in the empty margin it is out of season and
 * lying flat.
 *
 * At LABEL_RISE only a full-height ridge reaches the text, so the crop's own available weeks
 * pass harmlessly beneath it and the name only has to clear the weeks it is at — or might be
 * at — its best. The name goes to the left of those, which is empty for all but the earliest
 * crops, and falls back to the right of them otherwise. Set in the crop's own colour, darkened
 * only as far as legibility against the card demands, so it reads as belonging to its ribbon.
 */
function placeLabel(item: Produce, geo: Geometry, y: number): Label {
  const weeks = item.spans
    .filter((s) => s.level !== Level.Available)
    .flatMap((s) => coveredWeeks(s.from, s.to));
  const first = weeks.length > 0 ? Math.min(...weeks) : 1;
  const last = weeks.length > 0 ? Math.max(...weeks) : WEEKS_PER_YEAR;
  const width = item.name.length * LABEL_FONT * CHAR_W_RATIO;

  const before = geo.weekToX(Math.max(1, first - CURVE_LEAD)) - LABEL_GAP;
  const after = geo.weekToX(Math.min(WEEKS_PER_YEAR + 1, last + 1 + CURVE_LEAD)) + LABEL_GAP;
  const [x, anchor]: [number, Label['anchor']] =
    before - width >= PAD_X
      ? [before, 'end']
      : after + width <= PAD_X + geo.gridW
        ? [after, 'start']
        : [PAD_X, 'start']; // a season filling the year leaves no margin; keep it on the canvas

  return { x, y, text: item.name, color: readable(item.color), anchor };
}

/** Darken a colour until it clears MIN_CONTRAST against the card, keeping its hue. */
function readable(color: string): string {
  let out = color;
  while (contrast(out, CHART_BG) < MIN_CONTRAST && out !== '#000000') {
    out = mix(out, '#000000', 0.08);
  }
  return out;
}

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)] as [number, number];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
