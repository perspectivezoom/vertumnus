import type { Crop, RegionSources } from '@/data/regions/crops';

/**
 * New York State. Entirely hand-authored so far — the MARS movement reports we use for
 * California cover California districts, so nothing here is derived yet.
 */
const crops: Crop[] = [
  {
    type: 'manual',
    name: 'Blueberries',
    color: '#4a6fa5',
    why: 'no movement report covers New York growers; picking windows come from a Cornell extension listing instead',
    spans: [
      { level: 'available', from: 28, to: 29 }, // farms open (Hall's Hill 9-Jul, Vern Negus 11-Jul, Glenhaven 15-Jul)
      { level: 'peak', from: 30, to: 33 }, // main abundance
      { level: 'available', from: 34, to: 35 }, // tail (Cherry Knoll 'late Aug'; Giancarelli 'picking thru September')
    ],
    sources: [
      {
        credit: 'Cornell Cooperative Extension, Tompkins County',
        url: 'https://ccetompkins.org/agriculture/buy-local/u-pick-blueberry-farms',
      },
    ],
  },
];

export const ny: RegionSources = { id: 'ny', name: 'New York State', crops };
