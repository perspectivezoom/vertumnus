import { describe, expect, test } from 'bun:test';

import {
  type Box,
  findVoids,
  occupancyOf,
  SEED_DEPTHS,
  settleSeeds,
  toUnits,
} from '@/src/lib/whitespace';

const SIZE = { width: 1000, height: 1000 };
const OPTS = { aspect: 0.65, maxHeight: 40, minHeight: 8 };

/** A chart with everything drawn in a band down the middle, leaving both sides open. */
function centreBand(): Box[] {
  return [{ x: 400, y: 0, w: 200, h: 1000 }];
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe('occupancyOf', () => {
  test('marks the cells a rectangle covers and leaves the rest clear', () => {
    const occ = occupancyOf([{ x: 0, y: 0, w: 500, h: 1000 }], SIZE, 100);
    expect(occ.cells[0]).toBe(1); // top-left, inside
    expect(occ.cells[occ.cols - 1]).toBe(0); // top-right, outside
  });

  test('over-reports rather than under-reports, so art never lands on a missed edge', () => {
    // A sliver far thinner than one cell still marks the cell it touches.
    const occ = occupancyOf([{ x: 500, y: 500, w: 0.5, h: 0.5 }], SIZE, 100);
    expect(Array.prototype.some.call(occ.cells, (c: number) => c === 1)).toBe(true);
  });
});

describe('findVoids', () => {
  test('places art in the open space, never over what is drawn', () => {
    const rects = centreBand();
    const occ = occupancyOf(rects, SIZE, 100);
    const boxes = findVoids(occ, OPTS).map((b) => toUnits(b, occ, SIZE));
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      for (const drawn of rects) expect(overlaps(box, drawn)).toBe(false);
    }
  });

  test('balances the poster by searching each half separately', () => {
    // Both sides are open, but the left gap is larger. Searching the whole chart at once would
    // send every seed into the left gap and leave the right side bare.
    const occ = occupancyOf([{ x: 300, y: 0, w: 80, h: 1000 }], SIZE, 100);
    const boxes = findVoids(occ, OPTS).map((b) => toUnits(b, occ, SIZE));
    expect(boxes.some((b) => b.x + b.w / 2 < 500)).toBe(true);
    expect(boxes.some((b) => b.x + b.w / 2 > 500)).toBe(true);
  });

  test('reports one placement for a half holding a single gap', () => {
    // The left side is drawn over except for one band across its middle. One plate fills that
    // band's height, so a second could only sit beside it — which is a row of pictures rather
    // than a margin, and the search drops it.
    const occ = occupancyOf(
      [
        { x: 500, y: 0, w: 500, h: 1000 },
        { x: 0, y: 0, w: 500, h: 380 },
        { x: 0, y: 620, w: 500, h: 380 },
      ],
      SIZE,
      100,
    );
    const left = findVoids(occ, OPTS).filter((b) => b.x < occ.cols / 2);
    expect(left).toHaveLength(1);
  });

  test('finds one plate per seed down a tall open column, rather than stacking on one', () => {
    // Nothing is drawn on the left, so every seed has room and each should be found where it was
    // placed. Counted against the seeds rather than a number, which would go stale when they move.
    const occ = occupancyOf([{ x: 500, y: 0, w: 500, h: 1000 }], SIZE, 100);
    const left = findVoids(occ, OPTS).filter((b) => b.x < occ.cols / 2);
    expect(left).toHaveLength(SEED_DEPTHS.length);
    for (const [i, box] of left.entries()) {
      for (const other of left.slice(i + 1)) expect(overlaps(box, other)).toBe(false);
    }
  });

  test('separates two gaps in the same half', () => {
    // A bar across the middle of the left side splits it into an upper and a lower gap.
    const occ = occupancyOf(
      [
        { x: 500, y: 0, w: 500, h: 1000 },
        { x: 0, y: 450, w: 500, h: 100 },
      ],
      SIZE,
      100,
    );
    const left = findVoids(occ, OPTS).filter((b) => b.x < occ.cols / 2);
    expect(left).toHaveLength(2);
    expect(overlaps(left[0]!, left[1]!)).toBe(false);
  });

  test('gives the art its own proportions rather than the gap’s', () => {
    const occ = occupancyOf(centreBand(), SIZE, 100);
    for (const box of findVoids(occ, { ...OPTS, aspect: 0.65 })) {
      expect(box.w / box.h).toBeCloseTo(0.65, 1);
    }
  });

  test('leaves a gap empty rather than filling it badly', () => {
    // Everything drawn but a sliver, which is too small to hold art at a sensible size.
    const occ = occupancyOf([{ x: 0, y: 0, w: 1000, h: 940 }], SIZE, 100);
    expect(findVoids(occ, OPTS)).toEqual([]);
  });

  test('a seed landing on a ribbon still finds its gap', () => {
    // Seeds are placed by rule, so one lands on a crop whenever that crop is in season there —
    // something still shipping in January puts a seed right on a ridge. The distance field is
    // flat across everything drawn, so such a seed has no uphill to follow until it steps off.
    const band = { x: 0, y: 200, w: 300, h: 100 }; // covers the left seed at 25% depth
    const occ = occupancyOf([{ x: 500, y: 0, w: 500, h: 1000 }, band], SIZE, 100);
    const boxes = findVoids(occ, OPTS).map((b) => toUnits(b, occ, SIZE));
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) expect(overlaps(box, band)).toBe(false);
  });

  test('centres art on the row it was seeded on, not in the middle of its gap', () => {
    // The gap runs from y=0 to y=700 on the left and the seed sits high in it. Re-centring on the
    // gap would drift the plate to y=350 and leave the top of the poster bare — which is what
    // every plate used to do, and why the seeds had to be tuned below the band they filled.
    const occ = occupancyOf(
      [
        { x: 500, y: 0, w: 500, h: 1000 },
        { x: 0, y: 700, w: 500, h: 300 },
      ],
      SIZE,
      100,
    );
    // One seed, so exactly one box is placed and nothing else competes for the space.
    const half = { x: 0, y: 0, w: 50, h: occ.rows };
    const row = 20;
    const [box] = settleSeeds(occ, [[2, row]], half, OPTS).map((b) => toUnits(b, occ, SIZE));
    expect(box).toBeDefined();
    const centre = box!.y + box!.h / 2;
    expect(Math.abs(centre - (row / occ.rows) * SIZE.height)).toBeLessThan(SIZE.height * 0.05);
  });

  test('a blank chart yields placements on both sides', () => {
    const occ = occupancyOf([], SIZE, 100);
    expect(findVoids(occ, OPTS).length).toBeGreaterThanOrEqual(2);
  });
});
