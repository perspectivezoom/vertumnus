import type { MarsCrop } from '@/scripts/mars/produce';
import type { Crop, RegionSources } from '@/scripts/regions/index';

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
    why: 'hand-authored from Salinas-Watsonville production volume, a better source than the movement reports, which union districts with staggered seasons into a ~9-month band',
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
 * San Francisco Bay Area. The region owns its source list (pull-based — the region decides
 * what it pulls, so nothing central can clobber a produce). Only the crops listed here are
 * written to src/data/regions/sfbay.ts, and only as `generated: true` entries; hand-authored
 * produce in that file is left alone.
 */
export const sfbay: RegionSources = { id: 'sfbay', crops };
