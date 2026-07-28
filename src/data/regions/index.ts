import ny from '@/src/data/regions/__generated__/ny';
import sfbay from '@/src/data/regions/__generated__/sfbay';

/**
 * Explicit list of all regions. Values are unvalidated — validate with RegionSchema before
 * use (see useRegion). The modules under __generated__ are written by `bun run regions` from
 * the crop lists in scripts/regions/; edit those, never the output.
 */
export const regions = [sfbay, ny];

/** The region shown when the URL names none, or an unknown one. */
export const defaultRegion = sfbay;
