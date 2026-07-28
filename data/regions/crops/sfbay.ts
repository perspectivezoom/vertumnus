import type { MarsCrop } from '@/data/regions/sources/mars';
import type { Crop, RegionSources } from '@/data/regions/crops';

const YEARS = [2022, 2023, 2024];

// Fresno carries berries, stone fruit and grapes; El Centro carries vegetables and melons.
// The two reports share no commodities, so each crop has exactly one source.
const fresno = (name: string, color: string, commodity = name): MarsCrop => ({
  type: 'mars',
  name,
  color,
  report: 'FR_FV170',
  commodity,
  years: YEARS,
});
const elCentro = (name: string, color: string, commodity = name): MarsCrop => ({
  type: 'mars',
  name,
  color,
  report: 'EL_FV170',
  commodity,
  years: YEARS,
});

/**
 * Crops derived from MARS movement data, at varietal level — farmers-market shoppers look for
 * a specific varietal, so these are separate rows rather than "stone fruit" or "berries".
 *
 * Movement reports measure shipped pounds by growing district. That matters: the price reports
 * cover far more commodities, but a row there is a price quote, so counting rows measures how
 * long a crop is *offered* rather than how much arrives — it stretched strawberries to a
 * 30-week peak against a published 11.
 *
 * This list is deliberately short. It holds only crops whose season the naive derivation
 * describes well on inspection — one contiguous season, at a believable time of year. Crops
 * that came out wrong are left out rather than patched around, because every fix that rescued
 * them (smoothing, recurrence filters, contrast-relative thresholds) distorted the crops that
 * already worked. Deferred to a yet-to-be-chosen source:
 *
 * - **Citrus** (oranges, tangerines, satsuma, grapefruit) — too sparse here to derive at all;
 *   El Centro carries only ~13 satsuma rows a year, and its peak landed in August. This is the
 *   painful gap, since citrus is what a Bay Area winter poster is made of.
 * - **Artichokes** — shipped every week of the year, so no season emerges.
 * - **Sweet corn, sugar snap peas, bell peppers** — fragmented into slivers.
 *
 * The list is comprehensive: hand-authored crops are declared here too, so anything in the
 * region file that appears nowhere below has been retired and the writer removes it.
 */
const crops: Crop[] = [
  {
    type: 'manual',
    name: 'Strawberries',
    color: '#d1495b',
    why: 'derived from Salinas-Watsonville production volume, a better source than the movement reports: California grows strawberries in districts with staggered seasons (Oxnard, Santa Maria, Salinas-Watsonville), which those reports union into a ~9-month band',
    spans: [
      { level: 'available', from: 18, to: 22 }, // ramp-up, >=25% of peak volume
      { level: 'peak', from: 23, to: 33 }, // 4-Jun to 13-Aug on Fig. 5
      { level: 'available', from: 34, to: 40 }, // tail-off, >=25% of peak volume
    ],
    sources: [
      {
        title:
          'The California Strawberry Industry: Current Trends and Future Prospects (2024), Fig. 5 — Salinas-Watsonville district weekly production volume, three-year average',
        url: 'https://www.tandfonline.com/doi/full/10.1080/15538362.2024.2342900',
      },
    ],
  },
  // spring
  fresno('Cherries', '#7a1f2b'),
  fresno('Blueberries', '#4a6fa5'),
  fresno('Apricots', '#f0a83c'),
  // summer
  fresno('Raspberries', '#c73e5a'),
  fresno('Peaches', '#f2a25c'),
  fresno('Nectarines', '#e8703a'),
  fresno('Plums', '#8e3b5a'),
  fresno('Blackberries', '#3d2b45'),
  elCentro('Watermelons', '#e05c6e'),
  elCentro('Cantaloupes', '#eda15e'),
  // autumn
  elCentro('Tomatoes', '#d1402f'),
  fresno('Grapes', '#7b4397'),
  fresno('Pomegranates', '#9e2b3a'),
  fresno('Persimmons', '#d95f18'),
];

/**
 * San Francisco Bay Area. Every crop the poster shows is listed above — derived and
 * hand-authored alike — and data/regions/__generated__/sfbay.ts is built from it.
 */
export const sfbay: RegionSources = { id: 'sfbay', name: 'San Francisco Bay Area', crops };
