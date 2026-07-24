import { describe, expect, test } from 'bun:test';

import { spansFromCounts } from '@/scripts/mars/season';

/** Build a 53-slot week-count array (index 0 unused) from {week: count} entries. */
function counts(byWeek: Record<number, number>): number[] {
  const out = new Array<number>(53).fill(0);
  for (const [week, count] of Object.entries(byWeek)) out[Number(week)] = count;
  return out;
}

describe('spansFromCounts', () => {
  test('merges contiguous weeks of the same level into one span', () => {
    expect(spansFromCounts(counts({ 20: 100, 21: 100, 22: 100 }))).toEqual([
      { level: 'peak', from: 20, to: 22 },
    ]);
  });

  test('splits spans across a gap of unreported weeks', () => {
    expect(spansFromCounts(counts({ 20: 100, 21: 100, 25: 100 }))).toEqual([
      { level: 'peak', from: 20, to: 21 },
      { level: 'peak', from: 25, to: 25 },
    ]);
  });

  test('classifies a week at exactly the 50% threshold as peak', () => {
    // The real cherry pull hit this: max 110, week 20 exactly 55.
    expect(spansFromCounts(counts({ 20: 55, 23: 110 }))).toEqual([
      { level: 'peak', from: 20, to: 20 },
      { level: 'peak', from: 23, to: 23 },
    ]);
  });

  test('classifies a week just below the threshold as available', () => {
    expect(spansFromCounts(counts({ 20: 54, 23: 110 }))).toEqual([
      { level: 'available', from: 20, to: 20 },
      { level: 'peak', from: 23, to: 23 },
    ]);
  });

  test('starts a new span where the level changes', () => {
    expect(spansFromCounts(counts({ 19: 20, 20: 100, 21: 100, 22: 20 }))).toEqual([
      { level: 'available', from: 19, to: 19 },
      { level: 'peak', from: 20, to: 21 },
      { level: 'available', from: 22, to: 22 },
    ]);
  });

  test('an outlier week can leave the rest of the season with no peak at all', () => {
    // Documents a known sensitivity: `max` is a single global maximum, so one anomalous
    // week pushes every other week below the threshold — leaving a crop with no peak,
    // which sorts last on the poster (peakMidpoint returns Infinity).
    const spans = spansFromCounts(counts({ 20: 10, 21: 10, 22: 10, 40: 1000 }));
    expect(spans.filter((s) => s.level === 'peak')).toEqual([{ level: 'peak', from: 40, to: 40 }]);
    expect(spans).toContainEqual({ level: 'available', from: 20, to: 22 });
  });

  test('a season crossing the new year yields two spans, not one wrapping span', () => {
    // Known limitation: the merge runs weeks 1..52 without wrapping. Renders identically,
    // but shifts the peak midpoint used for poster ordering.
    expect(spansFromCounts(counts({ 51: 100, 52: 100, 1: 100, 2: 100 }))).toEqual([
      { level: 'peak', from: 1, to: 2 },
      { level: 'peak', from: 51, to: 52 },
    ]);
  });

  test('no reported weeks yields no spans', () => {
    expect(spansFromCounts(counts({}))).toEqual([]);
  });
});
