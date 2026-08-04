import { area, curveBasis } from 'd3-shape';

import type { Produce } from '@/data/regions/schema';
import {
  Level,
  MONTHS,
  PEAK_HEIGHT,
  peakMidpoint,
  spanWidth,
  WEEKS_PER_YEAR,
  weeklyBand,
} from '@/src/lib/season';

// All lengths are poster units (see Poster.tsx), which scale with the printed poster.
const PAD_X = 12;
const PAD_TOP = 40; // room for the month axis
const PAD_BOTTOM = 16;

// Label sizing/placement.
const MAX_FONT = 12; // ceiling font size
const MIN_FONT = 8; // floor before a label is unreadable
const AXIS_FONT = 11; // month labels

// How many row-spacings tall a full peak ridge is. Above 1 the ridges overlap, which is what
// reclaims the empty space one-row-per-crop would otherwise waste.
const RIDGE_OVERLAP = 1.5;
const CHAR_W_RATIO = 0.6; // approx glyph advance ÷ font size for the medium sans
const LABEL_WINDOW = 3; // ± weeks around the peak midpoint to average the label's y
const LINE_H = 1.15; // line-height multiple for wrapped labels

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
  font: number;
  lines: string[];
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
  cellW: number;
  gridW: number;
  peakHeight: number;
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
          <RibbonLabel {...r.label} />
        </g>
      ))}
    </g>
  );
}

/** The produce name, word-wrapped, centered at its resolved position. */
function RibbonLabel({ x, y, font, lines }: Label) {
  return (
    <text
      x={x}
      y={y}
      fontSize={font}
      fontWeight={500}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
    >
      {lines.map((line, li) => (
        <tspan
          key={line}
          x={x}
          dy={li === 0 ? -(((lines.length - 1) / 2) * font * LINE_H) : font * LINE_H}
        >
          {line}
        </tspan>
      ))}
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

  const geometry: Geometry = {
    cellW: gridW / WEEKS_PER_YEAR,
    gridW,
    peakHeight: ridgeHeight,
    weekToX,
  };

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
    const solid = slice(lower);
    const drifts = item.spans.some((s) => s.level === Level.Uncertain);

    return {
      name: item.name,
      color: item.color,
      path: areaGen(solid) ?? '',
      driftPath: drifts ? (areaGen(slice(upper)) ?? '') : null,
      driftColor: mix(item.color, CHART_BG, UNCERTAIN_TINT),
      label: placeLabel(item, solid, geometry),
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

/** Resolve a produce label's font, wrapped lines, and centered position. */
function placeLabel(item: Produce, slices: Slice[], geo: Geometry): Label {
  const pm = peakMidpoint(item.spans);
  const mid = Number.isFinite(pm) ? pm : WEEKS_PER_YEAR / 2;
  const midIdx = clamp(Math.round(mid) - 1, 0, WEEKS_PER_YEAR - 1);

  // Fit the name into the widest peak span — the tall region it sits in.
  const peakWeeks = Math.max(
    0,
    ...item.spans.filter((s) => s.level === Level.Peak).map((s) => spanWidth(s.from, s.to)),
  );
  const { lines, font } = fitLabel(item.name, peakWeeks * geo.cellW, geo.peakHeight);

  // Center on the peak midpoint (x) and the peak's visual center (y), keeping the
  // widest line in-frame.
  const half = (Math.max(...lines.map((line) => line.length)) * font * CHAR_W_RATIO) / 2;
  const x = clamp(geo.weekToX(mid), PAD_X + half, PAD_X + geo.gridW - half);
  const y = averageCenter(slices, midIdx);

  return { x, y, font, lines };
}

/** Average ribbon center over the in-season weeks within LABEL_WINDOW of `centerIdx`. */
function averageCenter(slices: Slice[], centerIdx: number): number {
  let sum = 0;
  let count = 0;
  for (let d = -LABEL_WINDOW; d <= LABEL_WINDOW; d++) {
    const s = slices[centerIdx + d];
    if (s && s.bottom - s.top > 0) {
      sum += (s.top + s.bottom) / 2;
      count += 1;
    }
  }
  if (count > 0) return sum / count;
  const at = slices[centerIdx];
  return at ? (at.top + at.bottom) / 2 : PAD_TOP;
}

/** Largest font (with word-wrapped lines) that fits the name inside the peak box. */
function fitLabel(
  name: string,
  peakPx: number,
  peakHeight: number,
): { lines: string[]; font: number } {
  const words = name.split(/\s+/);
  for (let font = MAX_FONT; font > MIN_FONT; font -= 0.5) {
    const maxChars = peakPx / (font * CHAR_W_RATIO);
    const lines = wrapWords(words, maxChars);
    const widest = Math.max(...lines.map((line) => line.length));
    if (widest <= maxChars && lines.length * font * LINE_H <= peakHeight) return { lines, font };
  }
  return { lines: wrapWords(words, peakPx / (MIN_FONT * CHAR_W_RATIO)), font: MIN_FONT };
}

/** Greedily pack words into lines no wider than `maxChars` (a long word overflows alone). */
function wrapWords(words: string[], maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (!current || trial.length <= maxChars) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
