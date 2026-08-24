import { area, curveBasis } from 'd3-shape';
import { useEffect, useState } from 'react';

import type { Produce } from '@/data/regions/schema';
import { type Plate, PLATE_ASPECT } from '@/src/lib/plates';
import { type Box, findVoids, occupancyOf, toUnits } from '@/src/lib/whitespace';
import {
  coveredWeeks,
  LEVEL_BAND,
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

/** The share of a full ridge that a merely-available week stands at. */
const AVAILABLE_SHARE = LEVEL_BAND[Level.Available].lower / PEAK_HEIGHT;

/**
 * How many row-spacings tall a full peak ridge is. Above 1 the ridges overlap, which is what
 * reclaims the empty space one-row-per-crop would otherwise waste.
 *
 * How far above 1 has a ceiling, though, and it is worth deriving rather than guessing. A row's
 * available weeks stand AVAILABLE_SHARE of a ridge above its baseline, while the row below rises
 * to `RIDGE_OVERLAP - 1` spacings above that same baseline. Equate them and the limit is
 * `1 / (1 - AVAILABLE_SHARE)`: at or beyond it, a neighbour's peak swallows a crop's shoulder
 * season whole. We sit just under, so the band still reads as a band rather than a hairline.
 *
 * Raising the available level would lift the ceiling too, and buy more overlap — but that height
 * is a claim about how strongly the crop is in season, not a dial for winning back space.
 */
const RIDGE_OVERLAP = (1 / (1 - AVAILABLE_SHARE)) * 0.9;

// Label sizing/placement.
// Sized against the display face's own metrics rather than a nominal size, since x-height and
// width vary enough between candidates to change how big the same setting actually looks.
const LABEL_FONT = 14;
// A real weight, not a synthesised one: small text on a busy poster needs the extra stroke, and
// faux-bolding would also desync the measured chip widths from what actually renders.
const LABEL_WEIGHT = 700;
const LABEL_GAP = 7; // clear space between a name's chip and the ribbon it sits beside
// A name sits on a card of its own, so a month rule passing behind it does not run through the
// text. The outline is the crop's colour, which ties the name to its ribbon a second time.
const CHIP_PAD_X = 7;
const CHIP_PAD_Y = 4;
const CHIP_RADIUS = 5;
const CURVE_LEAD = 1; // weeks the smoothed curve starts climbing before the week it belongs to
/**
 * How far past the plot a ribbon is given to reach the baseline.
 *
 * A crop in season through the final week has nowhere left to fall, so the fill meets the frame
 * at full height and reads as cut off rather than ended. Landing it exactly PAD_X out puts the
 * taper in the month-axis margin — the one strip of the chart box that carries nothing at these
 * x positions — so the ribbon runs off the edge without a clip path or any overhang to trim.
 */
const EDGE_RUNOFF = PAD_X;
const MIN_CONTRAST = 4.5; // WCAG AA for body text, against CHART_BG
const AXIS_FONT = 11; // month labels
// Advance ÷ font size, used only where there is no DOM to measure against. Deliberately generous:
// a chip narrower than its name clips it, whereas a wide one just carries roomier padding.
const FALLBACK_CHAR_W = 0.65;
const FONT_STACK_VAR = '--font-poster'; // declared in global.css @theme; the poster SVG wears it

/**
 * How far above its own baseline a name sits, in row spacings.
 *
 * Ridges rise RIDGE_OVERLAP spacings from their baselines, so the row below tops out
 * `RIDGE_OVERLAP - 1` above this row's baseline and the row above bottoms out `1` above it.
 * Between those is a strip no neighbour can paint into, whatever any of them are doing; a name
 * in the middle of it needs no collision test, only to clear its own ridge.
 */
const LABEL_RISE = (RIDGE_OVERLAP - 1 + 1) / 2;

// Whitespace search. The grid is coarse on purpose: it only has to find where art fits, and a
// finer one would chase pixels the eye does not read as a gap anyway.
const VOID_COLS = 120;
const VOID_MAX_H = 0.34; // tallest a plate may be, as a share of the chart
const VOID_MIN_H = 0.14; // below this the gap is left empty rather than filled badly

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
  /** Per-week silhouette, kept so the whitespace search can see what the chart covers. */
  slices: Slice[];
  cellW: number;
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
  plates = [],
}: {
  items: Produce[];
  width: number;
  height: number;
  plates?: readonly Plate[];
}) {
  useFontsReady();
  const { ribbons, months, grid, plot, art } = buildStreamgraph(items, width, height, plates);

  return (
    <g>
      <MonthGrid at={grid} top={plot.top} bottom={plot.bottom} />

      {/* Over the month rules but under the ribbons: the rules are recessive furniture, and the
          chart is the subject. */}
      {art.map((a) => (
        <PlateArt key={a.plate.accession} {...a} />
      ))}

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

/**
 * A watercolour plate.
 *
 * The fade at its edges is baked into the file's own alpha rather than applied here as a mask
 * over a blurred rectangle. Two reasons: SVG filters have no equivalent in PDF, so exporting one
 * depends on the renderer rasterising it and some viewers end up with nothing at all; and an
 * alpha fade dissolves into whatever is behind it, where a mask had to be told what colour the
 * paper was.
 */
function PlateArt({ plate, box }: { plate: Plate; box: Box }) {
  return (
    <image
      href={plate.src}
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      preserveAspectRatio="xMidYMid slice"
    >
      <title>{`${plate.subject}, ${plate.origin} — USDA Pomological Watercolor Collection`}</title>
    </image>
  );
}

/**
 * One crop: the season an early or late year would run, with the season that always holds over it.
 */
function Ribbon({ color, path, driftPath, driftColor }: Ribbon) {
  return (
    <g>
      {driftPath && <path d={driftPath} fill={driftColor} />}
      <path d={path} fill={color} />
    </g>
  );
}

/**
 * The calendar, labelled at the centre of each month.
 *
 * Inherits the poster's face rather than overriding it. The override this replaced existed only
 * because the poster was briefly set in a script, where Jan/Jun/Jul blurred at this size. A
 * workhorse face costs nothing in legibility here, and matching reads as one decision, not two.
 */
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
  plates: readonly Plate[],
): {
  ribbons: Ribbon[];
  months: Month[];
  grid: number[];
  plot: { top: number; bottom: number };
  art: { plate: Plate; box: Box }[];
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
      const full = last
        ? [...slices, { x: weekToX(WEEKS_PER_YEAR + 1), top: last.top, bottom: last.bottom }]
        : slices;
      const ground = { top: baseline, bottom: baseline };
      // Runway either side, so a crop still in season on the last week of December falls away
      // past the frame instead of being sheared off by it. The landing points sit exactly on
      // the chart's own edges, so the taper fills the month-axis margin and no further — see
      // EDGE_RUNOFF. This is presentation only: it adds no week the data does not have, and
      // both points are flat on the baseline, so the whitespace search ignores them.
      return [
        { x: weekToX(1) - EDGE_RUNOFF, ...ground },
        ...full,
        { x: weekToX(WEEKS_PER_YEAR + 1) + EDGE_RUNOFF, ...ground },
      ];
    };

    const { lower, upper } = weeklyBand(item.spans);
    const drifts = item.spans.some((s) => s.level === Level.Uncertain);

    const upperSlices = slice(upper);
    return {
      name: item.name,
      color: item.color,
      slices: upperSlices,
      cellW: gridW / WEEKS_PER_YEAR,
      path: areaGen(slice(lower)) ?? '',
      driftPath: drifts ? (areaGen(upperSlices) ?? '') : null,
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
    art: placeArt(ribbons, plates, { width, height }),
  };
}

/**
 * Fit plates into whatever the chart leaves empty.
 *
 * Obstacles come from the geometry already computed above rather than from the rendered DOM, so
 * the search is exact, runs before paint, and needs no second pass. Ridges are reported a week
 * at a time — a column of boxes under the drift curve, which is the taller of the two.
 */
function placeArt(
  ribbons: Ribbon[],
  plates: readonly Plate[],
  size: { width: number; height: number },
): { plate: Plate; box: Box }[] {
  if (plates.length === 0) return [];

  const obstacles: Box[] = [];
  for (const r of ribbons) {
    for (const s of r.slices) {
      if (s.bottom > s.top) obstacles.push({ x: s.x, y: s.top, w: r.cellW, h: s.bottom - s.top });
    }
    const l = r.label;
    obstacles.push({ x: l.x - l.width / 2, y: l.y - LABEL_FONT, w: l.width, h: LABEL_FONT * 2 });
  }
  // The axes are text the search cannot see, so reserve their bands explicitly.
  obstacles.push({ x: 0, y: 0, w: size.width, h: PAD_TOP });
  obstacles.push({ x: 0, y: size.height - PAD_BOTTOM, w: size.width, h: PAD_BOTTOM });

  const occ = occupancyOf(obstacles, size, VOID_COLS);
  const boxes = findVoids(occ, {
    aspect: PLATE_ASPECT,
    maxHeight: Math.round(occ.rows * VOID_MAX_H),
    minHeight: Math.round(occ.rows * VOID_MIN_H),
  });
  return boxes
    .slice(0, plates.length)
    .map((box, i) => ({ plate: plates[i]!, box: toUnits(box, occ, size) }));
}

let measurer: CanvasRenderingContext2D | null | undefined;
let fontFamily: string | undefined;

/**
 * How wide `text` will actually be set, in poster units.
 *
 * The stack is read from the theme variable the poster itself wears, so the measurement follows
 * whatever CSS declares rather than a family name duplicated into the source. Measuring beats a
 * baked ratio here because that ratio would be specific to one font at one weight.
 */
function textWidth(text: string, size: number, weight: number): number {
  if (typeof document === 'undefined') return text.length * size * FALLBACK_CHAR_W;
  measurer ??= document.createElement('canvas').getContext('2d');
  fontFamily ??=
    getComputedStyle(document.documentElement).getPropertyValue(FONT_STACK_VAR).trim() ||
    getComputedStyle(document.body).fontFamily;
  if (!measurer) return text.length * size * FALLBACK_CHAR_W;
  measurer.font = `${weight} ${size}px ${fontFamily}`;
  return measurer.measureText(text).width;
}

/**
 * Re-render once webfonts have loaded.
 *
 * Chip widths come from measuring text, and during the `font-display: swap` window the browser
 * measures the fallback — so a first render mid-swap would size every chip to the wrong font and
 * then keep those numbers. Re-measuring once fixes it. This is exactly the cost a precomputed
 * metrics table would avoid, and it only exists because the poster now uses a webfont.
 */
function useFontsReady(): void {
  const [, setReady] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let live = true;
    void document.fonts.ready.then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
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
