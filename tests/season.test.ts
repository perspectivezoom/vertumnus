import { describe, expect, test } from 'bun:test';

import {
  type Sample,
  spansFromSeasons,
  toCalendarWeeks,
  weeklyVolumeBySeason,
  weekOf,
} from '@/data/regions/sources/mars';

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
  const YEARS = [2023, 2024];

  /** A crop harvested November to January, once per listed year. */
  const winterCrop = (years: number[]): Sample[] =>
    years.flatMap((year) => [
      ...['11/07', '11/28', '12/19'].map((d) => ({ date: `${d}/${year}`, weight: 100 })),
      ...['01/09', '01/30'].map((d) => ({ date: `${d}/${year + 1}`, weight: 100 })),
    ]);

  test('keeps each season separate rather than pooling them', () => {
    const { weeks } = weeklyVolumeBySeason(
      [
        { date: '05/09/2023', weight: 100 },
        { date: '05/09/2024', weight: 25 },
      ],
      YEARS,
    );
    const shipped = weeks.map((season) => season.reduce((sum, v) => sum + v, 0));
    expect(shipped).toEqual([100, 25]);
  });

  test('a harvest running through the New Year becomes one unbroken run', () => {
    // Cut on January 1st, each bucket holds the tail of one harvest and the head of the next.
    // Cut in the empty summer and each holds one harvest — which in season coordinates is a
    // single stretch of weeks, so nothing downstream has to know the calendar turned over.
    const { weeks, start } = weeklyVolumeBySeason(
      winterCrop([2021, 2022, 2023]),
      [2021, 2022, 2023, 2024],
    );
    expect(weeks).toHaveLength(3);
    expect(start).toBeGreaterThan(20); // somewhere in the summer, not January
    for (const season of weeks) {
      const shipped = season.flatMap((v, week) => (v > 0 ? [week] : []));
      expect(Math.max(...shipped) - Math.min(...shipped)).toBeLessThan(26);
    }
  });

  test('drops a season whose far half was never fetched', () => {
    // The same crop, but the range stops at the end of 2022: the harvest opening in November
    // 2022 finishes in a January nobody fetched. Counted, that half-season would report its own
    // busiest weeks as a peak with as much confidence as a whole one.
    expect(weeklyVolumeBySeason(winterCrop([2021, 2022]), [2021, 2022]).weeks).toHaveLength(1);
  });

  test('a summer crop still gets one season per calendar year', () => {
    // Its dead weeks are already around New Year, so the cut barely moves and no year is lost.
    const summer = [2019, 2020, 2021].flatMap((year) =>
      ['06/06', '07/04', '08/01'].map((d) => ({ date: `${d}/${year}`, weight: 100 })),
    );
    expect(weeklyVolumeBySeason(summer, [2019, 2020, 2021]).weeks).toHaveLength(3);
  });
});

describe('toCalendarWeeks', () => {
  test('a span running off the end of a winter season comes back wrapped', () => {
    // `to < from` is how the schema says a span crosses the New Year, and it is produced here
    // and nowhere else — every step before this one counts from the start of the season.
    const spans = toCalendarWeeks([{ level: 'peak', from: 20, to: 30 }], 40);
    expect(spans[0]).toMatchObject({ from: 7, to: 17 }); // week 40 + 19 = 7, + 29 = 17
  });

  test('leaves a season that already starts in January alone', () => {
    const spans: { level: 'peak'; from: number; to: number }[] = [
      { level: 'peak', from: 20, to: 30 },
    ];
    expect(toCalendarWeeks(spans, 1)).toEqual(spans);
  });
});

describe('spansFromSeasons', () => {
  test('marks the weeks a majority of seasons call peak', () => {
    const spans = spansFromSeasons([peakingAt(20, 24), peakingAt(20, 24), peakingAt(20, 24)]);
    expect(spans).toContainEqual({ level: 'peak', from: 20, to: 24 });
  });

  test('a crop that peaks on the same weeks every year gets no uncertain band', () => {
    const spans = spansFromSeasons([peakingAt(20, 24), peakingAt(20, 24), peakingAt(20, 24)]);
    expect(spans.some((s) => s.level === 'uncertain')).toBe(false);
  });

  test('a peak that drifts year to year keeps a certain core and uncertain shoulders', () => {
    // Two of three seasons peak in weeks 22-26; the weeks either side are claimed by one season
    // each. That spread is the uncertainty — no separate confidence number needed to see it.
    expect(spansFromSeasons([peakingAt(20, 24), peakingAt(22, 26), peakingAt(24, 28)])).toEqual([
      { level: 'uncertain', from: 20, to: 21 },
      { level: 'peak', from: 22, to: 26 },
      { level: 'uncertain', from: 27, to: 28 },
    ]);
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
    // A crop that lands somewhere different every year: three seasons spiking in weeks 10, 26
    // and 42, sharing not one week between them. A strict majority would leave it with no peak
    // at all and sort it to the end of the poster; a span covering all three would claim a
    // 33-week peak no season actually had. Volume-share bands make this rarer than it was —
    // half a season's harvest is wide enough that merely drifting peaks still overlap — but a
    // crop scattered this far still has to be given an answer.
    const spike = (at: number): number[] => {
      const weeks = new Array<number>(53).fill(0);
      for (let w = at - 1; w <= at + 1; w++) if (w >= 1 && w <= 52) weeks[w] = 20;
      weeks[at] = 100;
      return weeks;
    };
    const peaks = spansFromSeasons([spike(10), spike(26), spike(42)]).filter(
      (s) => s.level === 'peak',
    );
    expect(peaks).toHaveLength(1);
    expect(peaks[0]).toMatchObject({ from: 26, to: 26 }); // mean of 10/26/42
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

  test('a week carrying almost none of the harvest is out of season', () => {
    // California ships a trickle of many crops year-round; a trickle is not a season. It falls
    // outside the band by carrying negligible *volume*, not by sitting under a per-week
    // threshold — which is why it holds for a crop whose peak dwarfs its tail as well as one
    // whose season is flat.
    const trickle = peakingAt(20, 24);
    trickle[45] = 10; // a rounding error next to the ~700 the season ships
    const spans = spansFromSeasons([trickle, trickle, trickle]);
    expect(spans.every((s) => s.to < 45)).toBe(true);
  });

  test('peak is the weeks carrying half the harvest, not the weeks near the tallest', () => {
    // The failure this replaced: sweet corn's best week is four times a typical shipping week,
    // so asking for 75% of it yielded a one-week peak; tomatoes' is under twice, so the same
    // question called most of the season peak. Volume share asks both the same thing. Here the
    // best week ships 40% of the year and the next 20%, so half the harvest is reached two
    // weeks in — the peak is those two, not the spike alone and not the whole shoulder.
    const spiky = season({ 24: 140, 25: 200, 26: 400, 27: 150, 28: 110 });
    const peaks = spansFromSeasons([spiky, spiky, spiky]).filter((s) => s.level === 'peak');
    expect(peaks).toHaveLength(1);
    expect(peaks[0]!.to - peaks[0]!.from + 1).toBe(2);
    expect(peaks[0]!.from).toBeLessThanOrEqual(26);
    expect(peaks[0]!.to).toBeGreaterThanOrEqual(26);
  });

  test('a short dip inside a peak is bridged; a longer one separates two harvests', () => {
    // A crop that ships steadily has many weeks of near-equal volume, so which of them falls
    // inside the busiest half is decided by trivial differences, and the vote turns that into
    // holes. Bridging a dip of a couple of weeks closes them. Real harvests are separated by
    // months, so nothing this narrow is a genuine break.
    const withHole = (gap: number): number[] => {
      const weeks = new Array<number>(53).fill(0);
      for (let w = 20; w <= 32; w++) weeks[w] = 100;
      for (let w = 26; w < 26 + gap; w++) weeks[w] = 1; // ships, but nowhere near its best
      return weeks;
    };
    const runs = (gap: number) =>
      spansFromSeasons([withHole(gap), withHole(gap), withHole(gap)]).filter(
        (s) => s.level === 'peak',
      ).length;
    expect(runs(2)).toBe(1);
    expect(runs(3)).toBe(2);
  });

  test('uncertainty stranded in the tail is demoted, not left floating', () => {
    // A couple of seasons shipping well in the same late week can raise it above the uncertain
    // threshold while the weeks around it stay flat. The pale band means "the peak may reach
    // here", so detached from any peak it promises abundance its neighbours do not have.
    const late = (bump: number): number[] => {
      const weeks = new Array<number>(53).fill(0);
      for (let w = 20; w <= 24; w++) weeks[w] = 100; // the peak
      for (let w = 25; w <= 40; w++) weeks[w] = 8; // a long, flat tail
      weeks[35] = bump;
      return weeks;
    };
    // Two of six seasons surge in week 35 — enough to clear the uncertain threshold. A shoulder
    // that does touch its peak stays uncertain; that case is covered by the drift test above.
    const spans = spansFromSeasons([late(60), late(60), late(8), late(8), late(8), late(8)]);
    expect(spans.some((s) => s.level === 'uncertain')).toBe(false);
    expect(spans).toContainEqual({ level: 'available', from: 25, to: 40 });
  });

  test('no shipments yields no spans', () => {
    expect(spansFromSeasons([])).toEqual([]);
  });
});
