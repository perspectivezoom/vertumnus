import type { Source, Span } from '@/data/regions/render';
import type { MarsCrop } from '@/data/regions/sources/mars';
import type { NyHarvestCrop } from '@/data/regions/sources/nyHarvest';
import { ny } from '@/data/regions/crops/ny';
import { sfbay } from '@/data/regions/crops/sfbay';

/**
 * A crop whose spans no source derives, authored here by hand. This is the crop's only
 * definition — everything under __generated__ is output and must not be edited.
 */
export interface ManualCrop {
  type: 'manual';
  name: string;
  color: string;
  /** Whether the poster shows this crop unless a URL says otherwise. See Produce.default. */
  default: boolean;
  why: string; // why no source derives this one
  spans: Span[];
  sources: Source[];
}

/** Where a crop's spans come from. Discriminated by `type` so other sources can join. */
export type Crop = MarsCrop | NyHarvestCrop | ManualCrop;

export interface RegionSources {
  id: string; // becomes __generated__/<id>.ts, and the URL path
  name: string; // poster title
  crops: Crop[]; // every crop the region shows — derived and hand-authored alike
}

/** Explicit list of regions. Add new regions here; nothing is auto-discovered. */
export const regionSources: RegionSources[] = [sfbay, ny];
