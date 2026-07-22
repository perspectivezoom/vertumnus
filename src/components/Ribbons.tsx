import { area, curveBasis } from 'd3-shape';

import type { Produce, Region } from '@/data/types';
import {
  LEVEL_WEIGHT,
  Level,
  MONTHS,
  peakMidpoint,
  spanWidth,
  WEEKS_PER_YEAR,
  weeklyWeights,
} from '@/lib/season';

// Logical SVG units.
const PAD_X = 12;
const PAD_TOP = 40; // room for the month axis
const PAD_BOTTOM = 16;
const CELL_W = 18; // x-width per week
const ROW_GAP = 6; // min spacing between ribbons (keeps flat lines distinct)
const WEIGHT_SCALE = 0.55; // logical px per weight unit (peak 100 -> 55px tall)

// Label sizing/placement.
const MAX_FONT = 12; // ceiling font size (logical px)
const MIN_FONT = 8; // floor before a label is unreadable
const CHAR_W_RATIO = 0.6; // approx glyph advance ÷ font size for the medium sans
const LABEL_WINDOW = 3; // ± weeks around the peak midpoint to average the label's y
const LINE_H = 1.15; // line-height multiple for wrapped labels

const GRID_W = WEEKS_PER_YEAR * CELL_W;
const WIDTH = PAD_X * 2 + GRID_W;
const PEAK_HEIGHT = LEVEL_WEIGHT[Level.Peak] * WEIGHT_SCALE; // vertical room inside a peak

/** One week's vertical slice of a ribbon: its top and bottom edges at position x. */
interface Slice {
  x: number;
  top: number;
  bottom: number;
}

interface Ribbon {
  name: string;
  color: string;
  path: string;
  spans: Produce['spans'];
  slices: Slice[];
}

const areaGen = area<Slice>()
  .x((d) => d.x)
  .y0((d) => d.bottom)
  .y1((d) => d.top)
  .curve(curveBasis);

export function Ribbons({ region }: { region: Region }) {
  const { height, ribbons } = layout(region.items);
  const months = MONTHS.map((label, m) => ({
    label,
    x: weekToX(1 + ((m + 0.5) * WEEKS_PER_YEAR) / 12),
  }));

  return (
    <svg
      className="block h-auto w-full font-sans"
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={`In-season produce for ${region.name}`}
    >
      {months.map((m) => (
        <text key={m.label} className="fill-[#888] text-[11px]" x={m.x} y={24} textAnchor="middle">
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
          <RibbonLabel name={r.name} spans={r.spans} slices={r.slices} />
        </g>
      ))}
    </svg>
  );
}

/** The produce name, word-wrapped and centered inside its peak. */
function RibbonLabel({ name, spans, slices }: Pick<Ribbon, 'name' | 'spans' | 'slices'>) {
  const pm = peakMidpoint(spans);
  const mid = Number.isFinite(pm) ? pm : WEEKS_PER_YEAR / 2;
  const midIdx = clamp(Math.round(mid) - 1, 0, WEEKS_PER_YEAR - 1);

  // Fit the name into the widest peak span — the tall region it sits in.
  const peakWeeks = Math.max(
    0,
    ...spans.filter((s) => s.level === Level.Peak).map((s) => spanWidth(s.from, s.to)),
  );
  const { lines, font } = fitLabel(name, peakWeeks * CELL_W);

  // Center on the peak midpoint (x) and the peak's visual center (y), keeping the
  // widest line in-frame.
  const half = (Math.max(...lines.map((line) => line.length)) * font * CHAR_W_RATIO) / 2;
  const x = clamp(weekToX(mid), PAD_X + half, PAD_X + GRID_W - half);
  const y = averageCenter(slices, midIdx);

  return (
    <text
      className="fill-white font-medium"
      x={x}
      y={y}
      fontSize={font}
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
 * Stack the (pre-sorted) produce into constant-total-height ribbons. Each week's
 * slack is spread as equal inter-ribbon gaps, so the bottom row stays anchored and
 * lean weeks fan into an even grid instead of collapsing upward. It also stabilizes
 * each ribbon: a sibling thinning out is offset by the gaps above it widening.
 */
function layout(items: Produce[]): { height: number; ribbons: Ribbon[] } {
  const n = items.length;
  const heights = items.map((item) => weeklyWeights(item.spans).map((w) => w * WEIGHT_SCALE));

  // Total ribbon height per week; the year's fattest week sets the fixed envelope.
  const sumPerWeek = Array.from({ length: WEEKS_PER_YEAR }, (_, wk) =>
    heights.reduce((acc, h) => acc + (h[wk] ?? 0), 0),
  );
  const maxSum = Math.max(0, ...sumPerWeek);

  const content = maxSum + Math.max(0, n - 1) * ROW_GAP;
  const height = PAD_TOP + content + PAD_BOTTOM;
  const gapAt = (wk: number) => (n > 1 ? ROW_GAP + (maxSum - (sumPerWeek[wk] ?? 0)) / (n - 1) : 0);

  const runningTop = new Array<number>(WEEKS_PER_YEAR).fill(PAD_TOP);
  const ribbons = items.map((item, i) => {
    const h = heights[i] ?? [];
    const slices: Slice[] = [];
    for (let wk = 0; wk < WEEKS_PER_YEAR; wk++) {
      const top = runningTop[wk] ?? PAD_TOP;
      const bottom = top + (h[wk] ?? 0);
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
      spans: item.spans,
      slices,
    };
  });

  return { height, ribbons };
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
function fitLabel(name: string, peakPx: number): { lines: string[]; font: number } {
  const words = name.split(/\s+/);
  for (let font = MAX_FONT; font > MIN_FONT; font -= 0.5) {
    const maxChars = peakPx / (font * CHAR_W_RATIO);
    const lines = wrapWords(words, maxChars);
    const widest = Math.max(...lines.map((line) => line.length));
    if (widest <= maxChars && lines.length * font * LINE_H <= PEAK_HEIGHT) return { lines, font };
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

/** Week 1..53 (53 = year end) -> x. */
function weekToX(week: number): number {
  return PAD_X + ((week - 1) / WEEKS_PER_YEAR) * GRID_W;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
