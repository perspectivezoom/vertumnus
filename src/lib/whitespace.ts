/**
 * Finding the open space on the poster, so an illustration can be dropped into it.
 *
 * The chart is a diagonal band — crops are ordered by peak, so early months of late crops and
 * late months of early crops are structurally empty. Where exactly those gaps fall depends on
 * which crops a region carries and on what a reader picks in the produce picker, so the
 * placement has to be measured rather than chosen once by eye.
 */

/** A coarse grid over the chart box; 1 where something is drawn. */
export interface Occupancy {
  cells: Uint8Array;
  cols: number;
  rows: number;
}

/** A rectangle, in grid cells or in chart units depending on who made it. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VoidOptions {
  /** Shape of the art that will fill the gap, width ÷ height. */
  aspect: number;
  /** Tallest a placement may be, in cells. */
  maxHeight: number;
  /** Below this a gap is left empty rather than filled badly. */
  minHeight: number;
}

const SEED_INSET = 2; // cells in from the outer edge, so a seed starts in the margin's own space
const SEED_DEPTHS = [0.25, 0.75]; // where down each side the seeds start

/**
 * Where to put art on this chart, in grid cells.
 *
 * The two halves are searched separately, each with its own seeds. Run as one search instead,
 * every seed walks into whichever gap is largest and one side of the poster gets all the art —
 * splitting it is what makes the result balance.
 */
export function findVoids(occ: Occupancy, opts: VoidOptions): Box[] {
  const mid = Math.floor(occ.cols / 2);
  const halves: Box[] = [
    { x: 0, y: 0, w: mid, h: occ.rows },
    { x: mid, y: 0, w: occ.cols - mid, h: occ.rows },
  ];

  return halves.flatMap((half, side) => {
    // Against the outer edge, where the art will sit, at two depths so a side split into an
    // upper and a lower gap is found as two. Landing on a ribbon is fine; claim steps off it.
    const edge = side === 0 ? half.x + SEED_INSET : half.x + half.w - 1 - SEED_INSET;
    const seeds = SEED_DEPTHS.map((depth): [number, number] => [
      edge,
      Math.round(half.y + half.h * depth),
    ]);
    return settleSeeds(occ, seeds, half, opts);
  });
}

/**
 * Settle each seed into the gap it belongs to, within one region of the grid.
 *
 * A seed takes a foothold on open ground, then walks and grows to fill the gap around it.
 * Pure: `occ` is never modified.
 */
export function settleSeeds(
  occ: Occupancy,
  seeds: readonly [number, number][],
  bounds: Box,
  opts: VoidOptions,
): Box[] {
  const working: Occupancy = { ...occ, cells: Uint8Array.from(occ.cells) };
  const mark = (box: Box, value: 0 | 1): void => {
    for (let y = box.y; y < box.y + box.h; y++) {
      for (let x = box.x; x < box.x + box.w; x++) working.cells[y * working.cols + x] = value;
    }
  };
  const footholds: Box[] = [];
  for (const seed of seeds) {
    const foot = claim(working, seed, bounds);
    if (!foot) continue;
    footholds.push(foot);
    mark(foot, 1);
  }

  // Each settles with the others in place but itself lifted out, so it measures the room it can
  // have rather than counting its own foothold against itself. Art runs down a margin, so a
  // placement is kept only if it stacks clear of the ones before it: boxes sharing rows would
  // read as a row of pictures, and the gap is better spent on one larger plate.
  const kept: Box[] = [];
  for (const foot of footholds) {
    mark(foot, 0);
    const box = settle(working, foot, bounds, opts);
    const sharesRows = kept.some((k) => box.y < k.y + k.h && k.y < box.y + box.h);
    if (box.h < opts.minHeight || sharesRows) continue;
    mark(box, 1);
    kept.push(box);
  }
  return kept;
}

/**
 * A foothold on open ground, which {@link settle} then walks and grows.
 *
 * Deliberately the smallest thing that can be walked — anything more would be a second, weaker
 * copy of the search settle already does.
 */
function claim(occ: Occupancy, seed: [number, number], bounds: Box): Box | null {
  const from = nearestEmpty(occ, seed, bounds);
  return from ? { x: from[0], y: from[1], w: 1, h: 1 } : null;
}

/**
 * The largest clear rectangle reachable by pushing each of `box`'s four sides outwards — not the
 * region's largest, but the one this box can reach, which is what makes it *its* gap.
 */
function freeAround(occ: Occupancy, box: Box, bounds: Box): Box {
  const rowClear = (y: number, l: number, r: number) => {
    if (y < bounds.y || y >= bounds.y + bounds.h) return false;
    for (let x = l; x <= r; x++) if (occ.cells[y * occ.cols + x]) return false;
    return true;
  };
  const colClear = (x: number, t: number, b: number) => {
    if (x < bounds.x || x >= bounds.x + bounds.w) return false;
    for (let y = t; y <= b; y++) if (occ.cells[y * occ.cols + x]) return false;
    return true;
  };
  let { x: l, y: t } = box;
  let r = box.x + box.w - 1;
  let b = box.y + box.h - 1;
  for (let grew = true; grew;) {
    grew = false;
    if (rowClear(t - 1, l, r)) {
      t--;
      grew = true;
    }
    if (rowClear(b + 1, l, r)) {
      b++;
      grew = true;
    }
    if (colClear(l - 1, t, b)) {
      l--;
      grew = true;
    }
    if (colClear(r + 1, t, b)) {
      r++;
      grew = true;
    }
  }
  return { x: l, y: t, w: r - l + 1, h: b - t + 1 };
}

/** Passes of centre-then-regrow. Three is the most any current poster has needed. */
const SETTLE_PASSES = 6;

/**
 * Walk a box to the middle of its gap and grow it there, until it stops moving.
 *
 * Growing puts it somewhere new, so it repeats. Growing once and never re-examining left New
 * York's apple at 23×35 cells in a corner of a gap with room for 33×49. Each pass lands in space
 * at least as open, so the box never shrinks and this reaches a fixed point.
 */
function settle(occ: Occupancy, box: Box, bounds: Box, opts: VoidOptions): Box {
  let current = box;
  for (let pass = 0; pass < SETTLE_PASSES; pass++) {
    const room = freeAround(occ, current, bounds);
    const centre: [number, number] = [
      room.x + Math.floor(room.w / 2),
      room.y + Math.floor(room.h / 2),
    ];
    const grown = growAspect(occ, centre, bounds, opts);
    if (!grown) return current;
    if (grown.x === current.x && grown.y === current.y && grown.h === current.h) return grown;
    current = grown;
  }
  return current;
}

/**
 * Mark a coarse grid from the rectangles the chart draws.
 *
 * Rectangles rather than the real curves: at this resolution a ridge is a column of week-wide
 * boxes, which is simpler and conservative — it can only over-report what is covered, so art
 * never lands on top of something the grid missed.
 */
export function occupancyOf(
  rects: readonly Box[],
  size: { width: number; height: number },
  cols: number,
): Occupancy {
  const rows = Math.max(1, Math.round((cols * size.height) / size.width));
  const cells = new Uint8Array(cols * rows);
  const sx = cols / size.width;
  const sy = rows / size.height;

  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x * sx));
    const x1 = Math.min(cols - 1, Math.ceil((r.x + r.w) * sx));
    const y0 = Math.max(0, Math.floor(r.y * sy));
    const y1 = Math.min(rows - 1, Math.ceil((r.y + r.h) * sy));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) cells[y * cols + x] = 1;
    }
  }
  return { cells, cols, rows };
}

/** Convert a grid box back into the coordinate space the rectangles came from. */
export function toUnits(box: Box, occ: Occupancy, size: { width: number; height: number }): Box {
  const sx = size.width / occ.cols;
  const sy = size.height / occ.rows;
  return { x: box.x * sx, y: box.y * sy, w: box.w * sx, h: box.h * sy };
}

/**
 * Grow a box of the art's own proportions outward from a peak until any side is blocked.
 *
 * Growing a *maximal* rectangle instead would leave the art floating inside a box far wider
 * than itself whenever the gap is a different shape than the art is.
 */
function growAspect(
  occ: Occupancy,
  at: [number, number],
  bounds: Box,
  opts: VoidOptions,
): Box | null {
  const [cx, cy] = at;
  const clear = (l: number, t: number, r: number, b: number): boolean => {
    for (let y = t; y <= b; y++) {
      for (let x = l; x <= r; x++) if (occ.cells[y * occ.cols + x]) return false;
    }
    return true;
  };
  /** Slide a span back inside its bounds, so a peak near an edge still gets a box. */
  const fit = (centre: number, half: number, lo: number, hi: number): [number, number] | null => {
    const span = half * 2 + 1;
    if (span > hi - lo + 1) return null;
    let start = centre - half;
    if (start < lo) start = lo;
    if (start + span - 1 > hi) start = hi - span + 1;
    return [start, start + span - 1];
  };

  let found: Box | null = null;
  for (let half = 1; half * 2 <= opts.maxHeight; half++) {
    const rowSpan = fit(cy, half, bounds.y, bounds.y + bounds.h - 1);
    const colSpan = fit(cx, Math.round(half * opts.aspect), bounds.x, bounds.x + bounds.w - 1);
    if (!rowSpan || !colSpan) break;
    if (!clear(colSpan[0], rowSpan[0], colSpan[1], rowSpan[1])) break;
    found = {
      x: colSpan[0],
      y: rowSpan[0],
      w: colSpan[1] - colSpan[0] + 1,
      h: rowSpan[1] - rowSpan[0] + 1,
    };
  }
  return found;
}

/**
 * The nearest open cell to `from`, or null if that half is entirely drawn over.
 *
 * Seeds are placed by rule, so one lands on a ribbon whenever a crop happens to be in season
 * there — an early crop still shipping in January puts one right on top of a ridge. Such a seed
 * cannot climb: the distance field is a flat zero across everything drawn, with no uphill to
 * follow. Stepping to open ground first is what gives the climb a gradient to work with.
 */
function nearestEmpty(
  occ: Occupancy,
  from: [number, number],
  bounds: Box,
): [number, number] | null {
  const [sx, sy] = from;
  const maxR = Math.max(bounds.w, bounds.h);
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = sx + dx;
        const y = sy + dy;
        if (x < bounds.x || y < bounds.y || x >= bounds.x + bounds.w || y >= bounds.y + bounds.h)
          continue;
        if (!occ.cells[y * occ.cols + x]) return [x, y];
      }
    }
  }
  return null;
}
