export const UNITS = ['in', 'cm'] as const;
export type Unit = (typeof UNITS)[number];

export interface PaperSize {
  name: string;
  w: number;
  h: number;
  unit: Unit;
}

// Landscape (the poster is wide, so w >= h). US sizes in inches, ISO A-series in cm.
export const PAPER_SIZES = [
  { name: 'Letter', w: 11, h: 8.5, unit: 'in' },
  { name: 'Legal', w: 14, h: 8.5, unit: 'in' },
  { name: 'Tabloid', w: 17, h: 11, unit: 'in' },
  { name: 'A5', w: 21, h: 14.8, unit: 'cm' },
  { name: 'A4', w: 29.7, h: 21, unit: 'cm' },
  { name: 'A3', w: 42, h: 29.7, unit: 'cm' },
] as const satisfies readonly PaperSize[];

export const DEFAULT_PAPER = PAPER_SIZES[0]; // Letter, 11 × 8.5 in

const MATCH_EPSILON = 0.05;
const CM_PER_IN = 2.54;

/** Name of the preset exactly matching (w, h, unit), or null for a custom size. */
export function matchPaperSize(w: number, h: number, unit: Unit): string | null {
  const match = PAPER_SIZES.find(
    (size) =>
      size.unit === unit &&
      Math.abs(size.w - w) < MATCH_EPSILON &&
      Math.abs(size.h - h) < MATCH_EPSILON,
  );
  return match ? match.name : null;
}

/** Convert a length between units (preserving physical size), rounded to 2 decimals. */
export function convertLength(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const converted = to === 'cm' ? value * CM_PER_IN : value / CM_PER_IN;
  return Math.round(converted * 100) / 100;
}
