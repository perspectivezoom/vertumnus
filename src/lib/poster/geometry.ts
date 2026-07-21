import { MONTHS, WEEKS_PER_YEAR } from '@/lib/calendar';

export interface Dimensions {
  width: number;
  height: number;
  gridLeft: number;
  gridRight: number;
  gridTop: number;
  rowHeight: number;
}

const LABEL_WIDTH = 120;
const CELL_WIDTH = 16;
const RIGHT_MARGIN = 24;
const AXIS_HEIGHT = 48;
const ROW_HEIGHT = 44;
const BOTTOM_MARGIN = 24;

export function dimensions(itemCount: number): Dimensions {
  const gridLeft = LABEL_WIDTH;
  const gridRight = gridLeft + WEEKS_PER_YEAR * CELL_WIDTH;
  const gridTop = AXIS_HEIGHT;
  return {
    width: gridRight + RIGHT_MARGIN,
    height: gridTop + itemCount * ROW_HEIGHT + BOTTOM_MARGIN,
    gridLeft,
    gridRight,
    gridTop,
    rowHeight: ROW_HEIGHT,
  };
}

/** Week 1..53 → x, where 53 marks the end of week 52. Internally 0-indexed. */
export function weekToX(week: number, d: Dimensions): number {
  const gridWidth = d.gridRight - d.gridLeft;
  return d.gridLeft + ((week - 1) / WEEKS_PER_YEAR) * gridWidth;
}

/** Placeholder palette — real art direction is deferred. */
export const LEVEL_FILL: Record<'available' | 'peak', string> = {
  available: '#9ec9a4',
  peak: '#2f6b3f',
};

export function monthTicks(d: Dimensions): { label: string; x: number }[] {
  return MONTHS.map((label, i) => ({
    label,
    x: weekToX(1 + ((i + 0.5) * WEEKS_PER_YEAR) / 12, d),
  }));
}

/** A span from..to as drawable rects, splitting on year-wrap (to < from). */
export function spanRects(from: number, to: number, d: Dimensions): { x: number; width: number }[] {
  const rect = (f: number, t: number) => {
    const x = weekToX(f, d);
    return { x, width: weekToX(t + 1, d) - x };
  };
  return from <= to ? [rect(from, to)] : [rect(from, WEEKS_PER_YEAR), rect(1, to)];
}
