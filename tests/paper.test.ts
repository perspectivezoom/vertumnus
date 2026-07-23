import { describe, expect, test } from 'bun:test';

import { convertLength, matchPaperSize } from '@/lib/paper';

describe('paper', () => {
  test('matchPaperSize names an exact preset, else null', () => {
    expect(matchPaperSize(11, 8.5, 'in')).toBe('Letter');
    expect(matchPaperSize(29.7, 21, 'cm')).toBe('A4');
    expect(matchPaperSize(10, 8, 'in')).toBeNull(); // not a preset
    expect(matchPaperSize(11, 8.5, 'cm')).toBeNull(); // right dims, wrong unit
  });

  test('convertLength preserves physical size and round-trips', () => {
    expect(convertLength(11, 'in', 'cm')).toBeCloseTo(27.94, 2);
    expect(convertLength(2.54, 'cm', 'in')).toBeCloseTo(1, 2);
    expect(convertLength(5, 'in', 'in')).toBe(5);
  });
});
