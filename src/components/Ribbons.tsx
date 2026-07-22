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

// Placeholder categorical palette (pending dataviz validation with the art pass).
const PALETTE = ['#2a78d6', '#3aa76d', '#e0902b', '#d1495b', '#7a5bd0', '#2f9c95', '#b5651d'];

interface Ribbon {
  name: string;
  color: string;
  path: string;
  labelX: number;
  labelY: number;
  labelSize: number;
  lines: string[];
}

/** Week 1..53 (53 = year end) -> x. */
function weekToX(week: number): number {
  return PAD_X + ((week - 1) / WEEKS_PER_YEAR) * GRID_W;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const areaGen = area<{ x: number; hi: number; lo: number }>()
  .x((d) => d.x)
  .y0((d) => d.lo)
  .y1((d) => d.hi)
  .curve(curveBasis);

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
    const samples: { x: number; hi: number; lo: number }[] = [];
    for (let wk = 0; wk < WEEKS_PER_YEAR; wk++) {
      const hi = runningTop[wk] ?? PAD_TOP;
      const lo = hi + (h[wk] ?? 0);
      samples.push({ x: weekToX(wk + 1), hi, lo });
      runningTop[wk] = lo + (i < n - 1 ? gapAt(wk) : 0);
    }

    // Extend a flat step to the year-end edge so the fill spans the full width.
    const last = samples.at(-1);
    const full = last
      ? [...samples, { x: weekToX(WEEKS_PER_YEAR + 1), hi: last.hi, lo: last.lo }]
      : samples;

    const pm = peakMidpoint(item.spans);
    const mid = Number.isFinite(pm) ? pm : WEEKS_PER_YEAR / 2;
    const midIdx = clamp(Math.round(mid) - 1, 0, WEEKS_PER_YEAR - 1);

    // Fit the name inside the widest peak span (the tall region the label sits in):
    // word-wrap across lines, dropping the font only if a line still won't fit.
    const peakSpans = item.spans.filter((s) => s.level === Level.Peak);
    const peakPx = Math.max(0, ...peakSpans.map((s) => spanWidth(s.from, s.to))) * CELL_W;
    const { lines, font: labelSize } = fitLabel(item.name, peakPx);

    // Center vertically on the average ribbon center across nearby in-season weeks,
    // so a peak that drifts week-to-week doesn't pull the label off-center.
    let ySum = 0;
    let yCount = 0;
    for (let d = -LABEL_WINDOW; d <= LABEL_WINDOW; d++) {
      const idx = midIdx + d;
      const s = idx >= 0 && idx < WEEKS_PER_YEAR ? samples[idx] : undefined;
      if (s && (h[idx] ?? 0) > 0) {
        ySum += (s.hi + s.lo) / 2;
        yCount += 1;
      }
    }
    const atMid = samples[midIdx];
    const labelY = yCount > 0 ? ySum / yCount : atMid ? (atMid.hi + atMid.lo) / 2 : PAD_TOP;

    // Keep the widest line inside the grid instead of clipping at the edges.
    const widest = Math.max(...lines.map((line) => line.length));
    const half = (widest * labelSize * CHAR_W_RATIO) / 2;
    const labelX = clamp(weekToX(mid), PAD_X + half, PAD_X + GRID_W - half);

    return {
      name: item.name,
      color: PALETTE[i % PALETTE.length] ?? '#888888',
      path: areaGen(full) ?? '',
      labelX,
      labelY,
      labelSize,
      lines,
    };
  });

  return { height, ribbons };
}

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
          <text
            className="fill-white font-medium"
            x={r.labelX}
            y={r.labelY}
            fontSize={r.labelSize}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {r.lines.map((line, li) => (
              <tspan
                key={line}
                x={r.labelX}
                dy={
                  li === 0
                    ? -(((r.lines.length - 1) / 2) * r.labelSize * LINE_H)
                    : r.labelSize * LINE_H
                }
              >
                {line}
              </tspan>
            ))}
          </text>
        </g>
      ))}
    </svg>
  );
}
