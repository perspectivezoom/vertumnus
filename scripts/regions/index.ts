import type { MarsCrop } from '@/scripts/mars/produce';
import { sfbay } from '@/scripts/regions/sfbay';

/**
 * A crop whose spans are hand-authored in the region file rather than derived. Declared here
 * anyway so a region's crop list stays a complete statement of what belongs on its poster.
 */
export interface ManualCrop {
  type: 'manual';
  name: string; // must match the entry in src/data/regions/<id>.ts
  why: string; // why no source derives this one
}

/** A crop's data source. Discriminated by `type` so other sources can join MARS later. */
export type Crop = MarsCrop | ManualCrop;

export interface RegionSources {
  id: string; // matches src/data/regions/<id>.ts
  /**
   * Every crop the region's poster shows — derived and hand-authored alike. Because this is
   * comprehensive, an entry in the region file that appears nowhere here has been retired,
   * and the writer removes it.
   */
  crops: Crop[];
}

/**
 * Explicit list of regions with generated produce. Add new regions here; nothing is
 * auto-discovered. A region whose produce is entirely hand-authored needs no entry.
 */
export const regionSources: RegionSources[] = [sfbay];
