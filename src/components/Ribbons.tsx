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
// The plot is inset by a month axis at each end. The last row's baseline lands exactly on the
// bottom inset, so both reserves are the same and the two axes sit the same distance out.
const PAD_TOP = 40;
const PAD_BOTTOM = 40;
const AXIS_INSET = 16; // from the plot edge out to the centre of the month labels

// How many row-spacings tall a full peak ridge is. Above 1 the ridges overlap, which is what
// reclaims the empty space one-row-per-crop would otherwise waste.
const RIDGE_OVERLAP = 1.5;

// Label sizing/placement.
const LABEL_FONT = 12;
const LABEL_WEIGHT = 600;
const LABEL_GAP = 7; // clear space between a name's chip and the ribbon it sits beside
// A name sits on a card of its own, so a month rule passing behind it does not run through the
// text. The outline is the crop's colour, which ties the name to its ribbon a second time.
const CHIP_PAD_X = 7;
const CHIP_PAD_Y = 4;
const CHIP_RADIUS = 5;
const CURVE_LEAD = 1; // weeks the smoothed curve starts climbing before the week it belongs to
const MIN_CONTRAST = 4.5; // WCAG AA for body text, against CHART_BG
const AXIS_FONT = 11; // month labels
// Advance ÷ font size, used only where there is no DOM to measure against. Deliberately generous:
// a chip narrower than its name clips it, whereas a wide one just carries roomier padding.
const FALLBACK_CHAR_W = 0.65;

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
const AXIS_COLOR = '#888888';
const GRID_COLOR = '#d9d9d9'; // recessive against the ribbons, but a hairline that survives print
const UNCERTAIN_TINT = 0.55; // how far the drift curve's fill moves toward CHART_BG

/** One week's vertical slice of a ribbon: its top and bottom edges at position x. */
interface Slice {
  x: number;
  top: number;
  bottom: number;
}

interface Label {
  /** Centre of the chip, so an imprecise width estimate shows as even padding either side. */
  x: number;
  y: number;
  width: number;
  text: string;
  color: string;
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

interface Month {
  label: string;
  x: number;
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
  const { ribbons, months, grid, plot } = buildStreamgraph(items, width, height);

  return (
    <g>
      <MonthGrid at={grid} top={plot.top} bottom={plot.bottom} />

      {ribbons.map((r) => (
        <Ribbon key={r.name} {...r} />
      ))}

      {/* After every ribbon: rows are painted in order, so a label drawn with its own row
          would be buried by the next one down. Placement keeps them clear regardless. */}
      {ribbons.map((r) => (
        <RibbonLabel key={r.name} {...r.label} />
      ))}

      <MonthAxis months={months} y={plot.top - AXIS_INSET} />
      {/* Repeated below the last row so a crop late in the year can be read against the
          calendar without tracking back up the full height of the poster. */}
      <MonthAxis months={months} y={plot.bottom + AXIS_INSET} />
    </g>
  );
}

/** One crop: the season an early or late year would run, with the season that always holds over it. */
function Ribbon({ color, path, driftPath, driftColor }: Ribbon) {
  return (
    <g stroke={CHART_BG} strokeWidth={1} strokeLinejoin="round">
      {driftPath && <path d={driftPath} fill={driftColor} />}
      <path d={path} fill={color} />
    </g>
  );
}

/** The calendar, labelled at the centre of each month. */
function MonthAxis({ months, y }: { months: Month[]; y: number }) {
  return (
    <g fill={AXIS_COLOR} fontSize={AXIS_FONT} textAnchor="middle" dominantBaseline="central">
      {months.map((m) => (
        <text key={m.label} x={m.x} y={y}>
          {m.label}
        </text>
      ))}
    </g>
  );
}

/**
 * The month divisions, drawn behind the ribbons — over them, a rule crossing a season would
 * read as a seam in that crop, and would compete with the pale/solid split carrying the drift.
 */
function MonthGrid({ at, top, bottom }: { at: number[]; top: number; bottom: number }) {
  return (
    <g stroke={GRID_COLOR} strokeWidth={1}>
      {at.map((x) => (
        <line key={x} x1={x} x2={x} y1={top} y2={bottom} />
      ))}
    </g>
  );
}

/** The produce name on an outlined card, set in its own colour beside the ridge it belongs to. */
function RibbonLabel({ x, y, width, text, color }: Label) {
  const height = LABEL_FONT + CHIP_PAD_Y * 2;
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx={CHIP_RADIUS}
        fill={CHART_BG}
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y}
        fontSize={LABEL_FONT}
        fontWeight={LABEL_WEIGHT}
        fill={color}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {text}
      </text>
    </g>
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
): {
  ribbons: Ribbon[];
  months: Month[];
  grid: number[];
  plot: { top: number; bottom: number };
} {
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

  const monthStart = (m: number) => weekToX(1 + (m * WEEKS_PER_YEAR) / 12);
  const months = MONTHS.map((label, m) => ({ label, x: monthStart(m + 0.5) }));
  // Interior divisions only: the outer two would land on the plot edges and box the chart in.
  const grid = MONTHS.slice(1).map((_, m) => monthStart(m + 1));

  return {
    ribbons,
    months,
    grid,
    plot: { top: PAD_TOP, bottom: height - PAD_BOTTOM },
  };
}

let measurer: CanvasRenderingContext2D | null | undefined;
let fontFamily: string | undefined;

/**
 * How wide `text` will actually be set, in poster units.
 *
 * The page asks for `ui-sans-serif, system-ui`, so this is not one font: the same name is a
 * different width on macOS, Windows and Android. No ratio baked into the source can be right for
 * all of them, and one calibrated to the current weight would go stale the moment the weight or
 * the font stack moved. Asking the browser costs one cached canvas and is correct by definition.
 */
function textWidth(text: string, size: number, weight: number): number {
  if (typeof document === 'undefined') return text.length * size * FALLBACK_CHAR_W;
  measurer ??= document.createElement('canvas').getContext('2d');
  fontFamily ??= getComputedStyle(document.body).fontFamily;
  if (!measurer) return text.length * size * FALLBACK_CHAR_W;
  measurer.font = `${weight} ${size}px ${fontFamily}`;
  return measurer.measureText(text).width;
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
  const width = textWidth(item.name, LABEL_FONT, LABEL_WEIGHT) + CHIP_PAD_X * 2;

  // Where the chip's near edge lands on each side, so LABEL_GAP stays true clear space.
  const before = geo.weekToX(Math.max(1, first - CURVE_LEAD)) - LABEL_GAP;
  const after = geo.weekToX(Math.min(WEEKS_PER_YEAR + 1, last + 1 + CURVE_LEAD)) + LABEL_GAP;
  const x =
    before - width >= PAD_X
      ? before - width / 2
      : after + width <= PAD_X + geo.gridW
        ? after + width / 2
        : PAD_X + width / 2; // a season filling the year leaves no margin; keep it on the canvas

  return { x, y, width, text: item.name, color: readable(item.color) };
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
