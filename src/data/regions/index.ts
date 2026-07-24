import ny from '@/src/data/regions/ny';
import sfbay from '@/src/data/regions/sfbay';

/**
 * Explicit list of all regions. Raw values are unvalidated — validate with
 * RegionSchema before use (see useRegion). Add new regions here; nothing is
 * auto-discovered.
 */
export const regions = [sfbay, ny];

/** The region shown when the URL names none, or an unknown one. */
export const defaultRegion = sfbay;
