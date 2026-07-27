import { describe, expect, test } from 'bun:test';

import { spansFromVolume, weeklyVolume, weekOf } from '@/scripts/mars/season';

/** Build a 53-slot weekly-volume array (index 0 unused) from {week: pounds} entries. */
function volume(byWeek: Record<number, number>): number[] {
  const out = new Array<number>(53).fill(0);
  for (const [week, pounds] of Object.entries(byWeek)) out[Number(week)] = pounds;
  return out;
}

describe('weekOf', () => {
  test('maps the year onto weeks 1..52, clamping the tail', () => {
    expect(weekOf('01/01/2024')).toBe(1);
    expect(weekOf('01/07/2024')).toBe(1);
    expect(weekOf('01/08/2024')).toBe(2);
    expect(weekOf('12/31/2024')).toBe(52); // day 366 would be week 53
    expect(weekOf('12/31/2023')).toBe(52);
  });

  test('a leap year shifts a date by one week after February', () => {
    // Worth knowing when comparing the same calendar date across seasons.
    expect(weekOf('05/06/2023')).toBe(18);
    expect(weekOf('05/06/2024')).toBe(19);
  });
});

describe('weeklyVolume', () => {
  test('sums shipped weight into its week, across every season', () => {
    const weeks = weeklyVolume([
      { date: '05/09/2023', weight: 100 },
      { date: '05/10/2023', weight: 50 },
      { date: '05/09/2025', weight: 25 },
    ]);
    expect(weeks[19]).toBe(175);
  });

  test('weighs by quantity, not by how many times a week was reported', () => {
    // Four small reports must not outrank one large shipment — the error that inflated
    // seasons when this counted rows instead of pounds.
    const weeks = weeklyVolume([
      { date: '05/09/2023', weight: 40_000 },
      ...[8, 9, 10, 11].map((d) => ({ date: `08/0${d}/2023`, weight: 100 })),
    ]);
    expect(weeks[19]).toBeGreaterThan(weeks[32] as number);
  });
});

describe('spansFromVolume', () => {
  test('splits a season into available shoulders around a peak', () => {
    // max 100 → out below 25, peak at or above 75.
    expect(spansFromVolume(volume({ 20: 30, 21: 80, 22: 100, 23: 30 }))).toEqual([
      { level: 'available', from: 20, to: 20 },
      { level: 'peak', from: 21, to: 22 },
      { level: 'available', from: 23, to: 23 },
    ]);
  });

  test('drops a year-round trickle below the season floor', () => {
    // California ships small volumes of many crops every week; without the floor those weeks
    // would put berries in season in January.
    const spans = spansFromVolume(volume({ 3: 5, 25: 100, 26: 100, 44: 5 }));
    expect(spans).toEqual([{ level: 'peak', from: 25, to: 26 }]);
  });

  test('merges contiguous weeks of the same level', () => {
    expect(spansFromVolume(volume({ 20: 100, 21: 100, 22: 100 }))).toEqual([
      { level: 'peak', from: 20, to: 22 },
    ]);
  });

  test('splits spans across a gap of out-of-season weeks', () => {
    expect(spansFromVolume(volume({ 20: 100, 21: 100, 25: 100 }))).toEqual([
      { level: 'peak', from: 20, to: 21 },
      { level: 'peak', from: 25, to: 25 },
    ]);
  });

  test('a season crossing the new year yields two spans, not one wrapping span', () => {
    // Known limitation: the merge runs weeks 1..52 without wrapping. Renders identically, but
    // shifts the peak midpoint used to order the poster.
    expect(spansFromVolume(volume({ 51: 100, 52: 100, 1: 100, 2: 100 }))).toEqual([
      { level: 'peak', from: 1, to: 2 },
      { level: 'peak', from: 51, to: 52 },
    ]);
  });

  test('no shipments yields no spans', () => {
    expect(spansFromVolume(volume({}))).toEqual([]);
  });
});
