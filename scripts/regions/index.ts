import type { Source, Span } from '@/scripts/lib/regionFile';
import type { MarsCrop } from '@/scripts/mars/produce';
import { ny } from '@/scripts/regions/ny';
import { sfbay } from '@/scripts/regions/sfbay';

/**
 * A crop whose spans no source derives, authored here by hand. This is the crop's only
 * definition — src/data/regions/__generated__ is output, so nothing may be edited there.
 */
export interface ManualCrop {
  type: 'manual';
  name: string;
  color: string;
  why: string; // why no source derives this one
  spans: Span[];
  sources: Source[];
}

/** A crop's data source. Discriminated by `type` so other sources can join MARS later. */
export type Crop = MarsCrop | ManualCrop;

export interface RegionSources {
  id: string; // becomes src/data/regions/__generated__/<id>.ts, and the URL path
  name: string; // poster title
  crops: Crop[]; // every crop the region shows — derived and hand-authored alike
}

/**
 * Explicit list of regions. Add new regions here; nothing is auto-discovered.
 */
export const regionSources: RegionSources[] = [sfbay, ny];
