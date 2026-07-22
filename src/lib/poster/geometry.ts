import { area, curveBasis } from 'd3-shape';

import type { Region } from '@/data/types';
import { MONTHS, WEEKS_PER_YEAR } from '@/lib/calendar';

type Level = 'available' | 'peak';
type Span = { level: Level; from: number; to: number };

const LEVEL_WEIGHT: Record<Level, number> = { available: 25, peak: 100 };

// Logical SVG units.
const PAD_X = 12;
const PAD_TOP = 40; // room for the month axis
const PAD_BOTTOM = 16;
const CELL_W = 18; // x-width per week
const ROW_GAP = 14; // min spacing between ribbons (keeps flat lines distinct)
const WEIGHT_SCALE = 0.42; // logical px per weight unit (peak 100 -> 42px tall)

const GRID_W = WEEKS_PER_YEAR * CELL_W;
const WIDTH = PAD_X * 2 + GRID_W;

// Placeholder categorical palette (pending dataviz validation with the art pass).
const PALETTE = ['#2a78d6', '#3aa76d', '#e0902b', '#d1495b', '#7a5bd0', '#2f9c95', '#b5651d'];

export interface Ribbon {
  name: string;
  color: string;
  path: string;
  labelX: number;
  labelY: number;
}

export interface PosterModel {
  width: number;
  height: number;
  months: { label: string; x: number }[];
  ribbons: Ribbon[];
}

/** Week 1..53 (53 = year end) -> x. */
function weekToX(week: number): number {
  return PAD_X + ((week - 1) / WEEKS_PER_YEAR) * GRID_W;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Span length in weeks, wrap-aware (to < from wraps the year). */
function spanWidth(from: number, to: number): number {
  return from <= to ? to - from + 1 : WEEKS_PER_YEAR - from + 1 + to;
}

/** Weeks 1..52 a span covers, wrap-aware. */
function coveredWeeks(from: number, to: number): number[] {
  const weeks: number[] = [];
  if (from <= to) {
    for (let w = from; w <= to; w++) weeks.push(w);
  } else {
    for (let w = from; w <= WEEKS_PER_YEAR; w++) weeks.push(w);
    for (let w = 1; w <= to; w++) weeks.push(w);
  }
  return weeks;
}

/** Per-week weight (0 / 25 / 100), index 0 = week 1. */
function weeklyWeights(spans: Span[]): number[] {
  const weights = new Array<number>(WEEKS_PER_YEAR).fill(0);
  for (const s of spans) {
    for (const w of coveredWeeks(s.from, s.to)) weights[w - 1] = LEVEL_WEIGHT[s.level];
  }
  return weights;
}

/** Midpoint week of the widest peak span (earliest wins ties); Infinity if no peak. */
function peakMidpoint(spans: Span[]): number {
  let best: Span | undefined;
  let bestWidth = -1;
  for (const s of spans) {
    if (s.level !== 'peak') continue;
    const width = spanWidth(s.from, s.to);
    if (width > bestWidth) {
      bestWidth = width;
      best = s;
    }
  }
  if (!best) return Number.POSITIVE_INFINITY;
  const mid = best.from + (spanWidth(best.from, best.to) - 1) / 2;
  return mid > WEEKS_PER_YEAR ? mid - WEEKS_PER_YEAR : mid;
}

const areaGen = area<{ x: number; hi: number; lo: number }>()
  .x((d) => d.x)
  .y0((d) => d.lo)
  .y1((d) => d.hi)
  .curve(curveBasis);

export function buildPoster(region: Region): PosterModel {
  // Sort by peak midpoint ascending -> top-left to bottom-right peak diagonal.
  const sorted = region.items
    .map((item, i) => ({
      name: item.name,
      spans: item.spans,
      color: PALETTE[i % PALETTE.length] ?? '#888888',
      weights: weeklyWeights(item.spans),
      peakMid: peakMidpoint(item.spans),
    }))
    .sort((a, b) => a.peakMid - b.peakMid);

  const n = sorted.length;
  const heights = sorted.map((s) => s.weights.map((w) => w * WEIGHT_SCALE));

  // Total ribbon height per week; the year's fattest week sets the fixed envelope.
  const sumPerWeek = Array.from({ length: WEEKS_PER_YEAR }, (_, wk) =>
    heights.reduce((acc, h) => acc + (h[wk] ?? 0), 0),
  );
  const maxSum = Math.max(0, ...sumPerWeek);

  // Fixed total height: content = maxSum + (n-1) minimum gaps. Each week's slack is
  // spread as equal gaps, so the stack always fills `content` — the bottom row stays
  // put and lean weeks spread into an even grid instead of collapsing upward. It also
  // stabilizes each ribbon: a sibling thinning out is offset by the gaps widening.
  const content = maxSum + Math.max(0, n - 1) * ROW_GAP;
  const height = PAD_TOP + content + PAD_BOTTOM;
  const gapAt = (wk: number) => (n > 1 ? ROW_GAP + (maxSum - (sumPerWeek[wk] ?? 0)) / (n - 1) : 0);

  const runningTop = new Array<number>(WEEKS_PER_YEAR).fill(PAD_TOP);
  const stacked = sorted.map((item, i) => {
    const h = heights[i] ?? [];
    const samples: { x: number; hi: number; lo: number }[] = [];
    for (let wk = 0; wk < WEEKS_PER_YEAR; wk++) {
      const hi = runningTop[wk] ?? PAD_TOP;
      const lo = hi + (h[wk] ?? 0);
      samples.push({ x: weekToX(wk + 1), hi, lo });
      runningTop[wk] = lo + (i < n - 1 ? gapAt(wk) : 0);
    }
    return { ...item, samples };
  });

  const ribbons: Ribbon[] = stacked.map((item) => {
    const last = item.samples.at(-1);
    const full = last
      ? [...item.samples, { x: weekToX(WEEKS_PER_YEAR + 1), hi: last.hi, lo: last.lo }]
      : item.samples;
    const mid = Number.isFinite(item.peakMid) ? item.peakMid : WEEKS_PER_YEAR / 2;
    const at = item.samples[clamp(Math.round(mid) - 1, 0, WEEKS_PER_YEAR - 1)];
    return {
      name: item.name,
      color: item.color,
      path: areaGen(full) ?? '',
      labelX: weekToX(mid),
      labelY: at ? (at.hi + at.lo) / 2 : PAD_TOP,
    };
  });

  const months = MONTHS.map((label, m) => ({
    label,
    x: weekToX(1 + ((m + 0.5) * WEEKS_PER_YEAR) / 12),
  }));

  return { width: WIDTH, height, months, ribbons };
}
