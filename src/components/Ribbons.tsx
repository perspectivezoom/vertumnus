import { area, curveBasis } from 'd3-shape';

import type { Produce } from '@/src/data/types';
import {
  LEVEL_WEIGHT,
  Level,
  MONTHS,
  peakMidpoint,
  spanWidth,
  WEEKS_PER_YEAR,
  weeklyWeights,
} from '@/src/lib/season';

// All lengths are poster units (see Poster.tsx), which scale with the printed poster.
const PAD_X = 12;
const PAD_TOP = 40; // room for the month axis
const PAD_BOTTOM = 16;
const ROW_GAP = 6; // min spacing between ribbons (keeps flat lines distinct)

// Label sizing/placement.
const MAX_FONT = 12; // ceiling font size
const MIN_FONT = 8; // floor before a label is unreadable
const AXIS_FONT = 11; // month labels
const CHAR_W_RATIO = 0.6; // approx glyph advance ÷ font size for the medium sans
const LABEL_WINDOW = 3; // ± weeks around the peak midpoint to average the label's y
const LINE_H = 1.15; // line-height multiple for wrapped labels

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
  path: string;
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
          <path
            d={r.path}
            fill={r.color}
            stroke={r.color}
            strokeWidth={1.5}
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
 * Stack the (pre-sorted) produce into ribbons that fill the box. The scale is derived
 * so the fattest week exactly fills the content height; each week's slack is spread as
 * equal inter-ribbon gaps, so the bottom row stays anchored and lean weeks fan into an
 * even grid instead of collapsing upward.
 */
function buildStreamgraph(
  items: Produce[],
  width: number,
  height: number,
): { ribbons: Ribbon[]; months: { label: string; x: number }[] } {
  const gridW = width - PAD_X * 2;
  const weekToX = (week: number) => PAD_X + ((week - 1) / WEEKS_PER_YEAR) * gridW;

  const n = items.length;
  const weights = items.map((item) => weeklyWeights(item.spans));
  const sumPerWeek = Array.from({ length: WEEKS_PER_YEAR }, (_, wk) =>
    weights.reduce((acc, w) => acc + (w[wk] ?? 0), 0),
  );
  const maxWeight = Math.max(0, ...sumPerWeek);

  // Derive the scale so the fattest week fills the content height (ribbons fill the paper).
  const content = height - PAD_TOP - PAD_BOTTOM;
  const scale = maxWeight > 0 ? Math.max(0, content - Math.max(0, n - 1) * ROW_GAP) / maxWeight : 0;
  const geometry: Geometry = {
    cellW: gridW / WEEKS_PER_YEAR,
    gridW,
    peakHeight: LEVEL_WEIGHT[Level.Peak] * scale,
    weekToX,
  };

  const maxSum = maxWeight * scale;
  const gapAt = (wk: number) =>
    n > 1 ? ROW_GAP + (maxSum - (sumPerWeek[wk] ?? 0) * scale) / (n - 1) : 0;

  const runningTop = new Array<number>(WEEKS_PER_YEAR).fill(PAD_TOP);
  const ribbons = items.map((item, i) => {
    const w = weights[i] ?? [];
    const slices: Slice[] = [];
    for (let wk = 0; wk < WEEKS_PER_YEAR; wk++) {
      const top = runningTop[wk] ?? PAD_TOP;
      const bottom = top + (w[wk] ?? 0) * scale;
      slices.push({ x: weekToX(wk + 1), top, bottom });
      runningTop[wk] = bottom + (i < n - 1 ? gapAt(wk) : 0);
    }

    // Extend a flat step to the year-end edge so the fill spans the full width.
    const last = slices.at(-1);
    const fullSlices = last
      ? [...slices, { x: weekToX(WEEKS_PER_YEAR + 1), top: last.top, bottom: last.bottom }]
      : slices;

    return {
      name: item.name,
      color: item.color,
      path: areaGen(fullSlices) ?? '',
      label: placeLabel(item, slices, geometry),
    };
  });

  const months = MONTHS.map((label, m) => ({
    label,
    x: weekToX(1 + ((m + 0.5) * WEEKS_PER_YEAR) / 12),
  }));

  return { ribbons, months };
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
