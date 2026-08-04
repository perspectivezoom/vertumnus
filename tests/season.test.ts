import { describe, expect, test } from 'bun:test';

import { spansFromSeasons, weeklyVolumeBySeason, weekOf } from '@/data/regions/sources/mars';

/** A season's weekly volumes (index 0 unused) from {week: pounds} entries. */
function season(byWeek: Record<number, number>): number[] {
  const out = new Array<number>(53).fill(0);
  for (const [week, pounds] of Object.entries(byWeek)) out[Number(week)] = pounds;
  return out;
}

/** A season peaking across `weeks`, with half-strength shoulders either side. */
function peakingAt(from: number, to: number): number[] {
  const out = new Array<number>(53).fill(0);
  for (let w = from - 2; w <= to + 2; w++) if (w >= 1 && w <= 52) out[w] = 50;
  for (let w = from; w <= to; w++) out[w] = 100;
  return out;
}

describe('weekOf', () => {
  test('maps the year onto weeks 1..52, clamping the tail', () => {
    expect(weekOf('01/01/2024')).toBe(1);
    expect(weekOf('01/07/2024')).toBe(1);
    expect(weekOf('01/08/2024')).toBe(2);
    expect(weekOf('12/31/2024')).toBe(52); // day 366 would be week 53
  });
});

describe('weeklyVolumeBySeason', () => {
  test('keeps each season separate rather than pooling them', () => {
    const seasons = weeklyVolumeBySeason([
      { date: '05/09/2023', weight: 100 },
      { date: '05/09/2024', weight: 25 },
    ]);
    expect(seasons).toHaveLength(2);
    expect(seasons[0]?.[19]).toBe(100);
    expect(seasons[1]?.[19]).toBe(25);
  });
});

describe('spansFromSeasons', () => {
  test('marks the weeks a majority of seasons call peak', () => {
    const spans = spansFromSeasons([peakingAt(20, 24), peakingAt(20, 24), peakingAt(20, 24)]);
    expect(spans).toContainEqual({ level: 'peak', from: 20, to: 24 });
  });

  test('narrows the peak to where shifted seasons agree', () => {
    // The real failure: peaches peaked in weeks 21-31, 24-34 and 29-35 — one clean peak each,
    // but eight weeks apart. Pooling first smeared them into a band full of holes.
    const spans = spansFromSeasons([peakingAt(21, 31), peakingAt(24, 34), peakingAt(29, 35)]);
    const peaks = spans.filter((s) => s.level === 'peak');
    expect(peaks).toHaveLength(1);
    expect(peaks[0]?.from).toBeGreaterThanOrEqual(24);
    expect(peaks[0]?.to).toBeLessThanOrEqual(34);
  });

  test('averages the peaks when no two seasons agree, rather than reporting none', () => {
    // Blueberries peaked in weeks 20-22, 24 and 23 — overlapping in no single week. A strict
    // majority would leave the crop with no peak at all, and sort it to the end of the poster;
    // spanning 20-24 to cover them all would claim a five-week peak no season actually had.
    const spans = spansFromSeasons([peakingAt(20, 22), peakingAt(24, 24), peakingAt(23, 23)]);
    const peaks = spans.filter((s) => s.level === 'peak');
    expect(peaks).toHaveLength(1);
    expect(peaks[0]).toMatchObject({ from: 22, to: 23 }); // mean of 20/24/23 and of 22/24/23
  });

  test('averages around each season best week, not across a two-harvest gap', () => {
    // Every season harvests twice and no two agree on when. Measuring each season from its
    // first peak week to its last would reach over the quiet middle, averaging out to one
    // 23-week "peak" spanning both harvests and the lull between them.
    const twoHarvests = (first: number) => {
      const weeks = new Array<number>(53).fill(0);
      for (let w = first; w <= first + 2; w++) weeks[w] = 100;
      for (let w = first + 20; w <= first + 22; w++) weeks[w] = 60; // a lesser second harvest
      return weeks;
    };

    const peaks = spansFromSeasons([twoHarvests(20), twoHarvests(24), twoHarvests(28)]).filter(
      (s) => s.level === 'peak',
    );
    expect(peaks).toHaveLength(1);
    expect(peaks[0]).toMatchObject({ from: 24, to: 26 }); // mean of the 20-22/24-26/28-30 runs
  });

  test('bridges a short mid-season gap where the seasons briefly disagree', () => {
    const dip = peakingAt(20, 30);
    for (let w = 25; w <= 26; w++) dip[w] = 0; // one season goes quiet mid-run
    const spans = spansFromSeasons([dip, peakingAt(20, 30), peakingAt(20, 30)]);
    expect(spans.filter((s) => s.level === 'peak')).toHaveLength(1);
  });

  test('keeps two harvests far apart as separate peaks', () => {
    const twice = new Array<number>(53).fill(0);
    for (let w = 20; w <= 23; w++) twice[w] = 100;
    for (let w = 40; w <= 43; w++) twice[w] = 100;
    expect(spansFromSeasons([twice, twice, twice]).filter((s) => s.level === 'peak')).toHaveLength(
      2,
    );
  });

  test('ignores a season carrying almost no data', () => {
    // A stray row or two must not vote as loudly as a full season.
    const stray = season({ 1: 5 });
    const spans = spansFromSeasons([peakingAt(20, 24), peakingAt(20, 24), stray]);
    expect(spans.every((s) => s.from > 5)).toBe(true);
  });

  test('a week below the season floor is out of season', () => {
    // California ships a trickle of many crops year-round; a trickle is not a season.
    const trickle = peakingAt(20, 24);
    trickle[45] = 10; // 10% of the season's best week
    const spans = spansFromSeasons([trickle, trickle, trickle]);
    expect(spans.every((s) => s.to < 45)).toBe(true);
  });

  test('no shipments yields no spans', () => {
    expect(spansFromSeasons([])).toEqual([]);
  });
});
