/**
 * Finding the open space on the poster, so an illustration can be dropped into it.
 *
 * The chart is a diagonal band — crops are ordered by peak, so early months of late crops and
 * late months of early crops are structurally empty. Where exactly those gaps fall depends on
 * which crops a region carries, and will depend on what a reader picks once the produce picker
 * exists, so the placement has to be measured rather than chosen once by eye.
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
    // Seeds start against the poster's outer edge, where the art will sit, and at two depths so
    // a side split into an upper and a lower gap is found as two rather than one. A seed landing
    // on a ribbon is fine — settleSeeds steps it to open ground before climbing.
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
 * Every seed steps to open ground, climbs to the most open point it can reach, and claims a box
 * there. Each claim is marked on a private copy before the next seed runs, so seeds that would
 * have settled together instead find that gap taken — which is how "one gap or two" gets
 * answered by the grid rather than assumed by us. Pure: `occ` is never modified.
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

  const placed: Box[] = [];
  for (const seed of seeds) {
    const from = nearestEmpty(working, seed, bounds);
    if (!from) continue;
    const peak = climb(distanceField(working), working, from, bounds);
    const box = growAspect(working, peak, bounds, opts);
    if (!box || box.h < opts.minHeight) continue;
    placed.push(box);
    mark(box, 1);
  }

  // Centre only once every box exists. Done as each is placed, the first would centre itself in
  // the whole run — taking the middle of the side — and later ones would take what was left over
  // and read as pushed aside. Lifting each box out of the grid before measuring its own space is
  // what lets two plates down one side settle at a share of it each.
  return placed.map((box) => {
    mark(box, 0);
    const centred = centreVertically(working, box, bounds);
    mark(centred, 1);
    return centred;
  });
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
 * Distance from every empty cell to the nearest drawn cell or edge, by two-pass chamfer.
 *
 * The local maxima of this field are the visual centres of the open areas — "put it in the
 * middle of the gap", computed instead of eyeballed.
 */
export function distanceField(occ: Occupancy): Float32Array {
  const { cols, rows, cells } = occ;
  const d = new Float32Array(cols * rows);
  const FAR = 1e6;
  for (let i = 0; i < cells.length; i++) d[i] = cells[i] ? 0 : FAR;

  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= cols || y >= rows ? 0 : (d[y * cols + x] ?? 0);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      d[i] = Math.min(
        d[i] ?? FAR,
        at(x - 1, y) + 1,
        at(x, y - 1) + 1,
        at(x - 1, y - 1) + Math.SQRT2,
        at(x + 1, y - 1) + Math.SQRT2,
      );
    }
  }
  for (let y = rows - 1; y >= 0; y--) {
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      d[i] = Math.min(
        d[i] ?? FAR,
        at(x + 1, y) + 1,
        at(x, y + 1) + 1,
        at(x + 1, y + 1) + Math.SQRT2,
        at(x - 1, y + 1) + Math.SQRT2,
      );
    }
  }
  return d;
}

/**
 * Slide a box to sit in the middle of the clear run above and below it.
 *
 * A box is grown from the most open *point*, which is not the middle of the gap it ends up in:
 * growth stops as soon as any one side is blocked, so the box keeps whatever bias the peak had
 * and can end up hard against a ribbon with a band of paper left over on the other side. Reading
 * down a column of art, that lopsidedness is what the eye notices.
 */
function centreVertically(occ: Occupancy, box: Box, bounds: Box): Box {
  const rowClear = (y: number): boolean => {
    if (y < bounds.y || y >= bounds.y + bounds.h) return false;
    for (let x = box.x; x < box.x + box.w; x++) if (occ.cells[y * occ.cols + x]) return false;
    return true;
  };
  let top = box.y;
  let bottom = box.y + box.h - 1;
  while (rowClear(top - 1)) top--;
  while (rowClear(bottom + 1)) bottom++;
  const slack = bottom - top + 1 - box.h;
  return slack > 0 ? { ...box, y: top + Math.floor(slack / 2) } : box;
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

/** Walk uphill on the distance field until no neighbour is more open. */
function climb(
  d: Float32Array,
  occ: Occupancy,
  seed: [number, number],
  bounds: Box,
): [number, number] {
  let [x, y] = seed;
  for (let step = 0; step < occ.cols * occ.rows; step++) {
    let best = d[y * occ.cols + x] ?? 0;
    let bx = x;
    let by = y;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx < bounds.x ||
          ny < bounds.y ||
          nx >= bounds.x + bounds.w ||
          ny >= bounds.y + bounds.h
        )
          continue;
        const v = d[ny * occ.cols + nx] ?? 0;
        if (v > best) {
          best = v;
          bx = nx;
          by = ny;
        }
      }
    }
    if (bx === x && by === y) break;
    x = bx;
    y = by;
  }
  return [x, y];
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
