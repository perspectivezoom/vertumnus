import type { MarsCrop } from '@/scripts/mars/produce';
import { sfbay } from '@/scripts/regions/sfbay';

/** A crop's data source. Discriminated by `type` so other sources can join MARS later. */
export type Crop = MarsCrop;

export interface RegionSources {
  id: string; // matches src/data/regions/<id>.ts
  crops: Crop[];
}

/**
 * Explicit list of regions with generated produce. Add new regions here; nothing is
 * auto-discovered. A region whose produce is entirely hand-authored needs no entry.
 */
export const regionSources: RegionSources[] = [sfbay];
