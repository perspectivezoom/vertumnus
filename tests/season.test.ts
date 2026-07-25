import { describe, expect, test } from 'bun:test';

import { scoreByWeek, spansFromCounts } from '@/scripts/mars/season';

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

// Dates below pair non-leap years (2023/2025) so the same calendar date lands in the same
// week — a leap year shifts day-of-year by one and can push it into the next bucket.
describe('scoreByWeek', () => {
  /** Repeat a date `n` times, as `n` listings reported that day. */
  const listings = (date: string, n: number) => Array.from({ length: n }, () => date);

  test("scores a season's own busiest week as 1", () => {
    const scores = scoreByWeek(['05/09/2023', '05/09/2025']);
    expect(scores[19]).toBe(1);
  });

  test('discards a week that appears in only one season', () => {
    // A stray August quote in a single year — real seasons recur, one-off listings do not.
    const scores = scoreByWeek(['05/09/2023', '05/09/2025', '08/08/2022']);
    expect(scores[32]).toBe(0);
    // Week 19 survives, but 2022 has nothing there and votes 0, so it scores 2 of 3 seasons.
    expect(scores[19]).toBeCloseTo(2 / 3, 5);
  });

  test('keeps a low-volume week that recurs, where a magnitude cutoff would not', () => {
    // One listing per year is a genuine shoulder week; two seasons corroborate it.
    const scores = scoreByWeek(['04/25/2023', '04/25/2025']);
    expect(scores[17]).toBe(1);
  });

  test('gives each season an equal vote regardless of its reporting volume', () => {
    // 2023 reports 20x more than 2024, but week 19 is 2023's peak and week 20 is 2024's,
    // so both weeks score alike — raw summing would have let 2023 bury week 20.
    const scores = scoreByWeek([
      ...listings('05/09/2023', 100),
      ...listings('05/16/2023', 50),
      ...listings('05/09/2025', 5),
      ...listings('05/16/2025', 10),
    ]);
    expect(scores[19]).toBeCloseTo((1 + 0.5) / 2, 5);
    expect(scores[20]).toBeCloseTo((0.5 + 1) / 2, 5);
  });

  test('accepts every week when only one season is cached', () => {
    const scores = scoreByWeek(['05/09/2024', '08/08/2024']);
    expect(scores[19]).toBe(1);
    expect(scores[32]).toBe(1);
  });
});
