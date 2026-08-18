import type { MarsCrop } from '@/data/regions/sources/mars';
import type { Crop, RegionSources } from '@/data/regions/crops';

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

/**
 * The growing districts a Bay Area market vendor can realistically drive in from. Watsonville
 * and the northern San Joaquin are an hour or two out; Bakersfield, Santa Maria and Oxnard are
 * half a day, and Imperial and Coachella most of one — that produce reaches supermarkets, not a
 * stall. MARS labels every one of them `California`, so without this the poster would answer
 * "when is the state shipping this" instead of "when is it good at my market". The two differ
 * by weeks: statewide strawberries peak seven weeks before Watsonville's own crop, because the
 * southern districts out-ship it and harvest first.
 */
// Exact MARS district names: the API matches them literally, with no prefix form.
const DISTRICTS = [
  'SALINAS-WATSONVILLE CALIFORNIA',
  'SAN JOAQUIN VALLEY CALIFORNIA',
  'CENTRAL DISTRICT CALIFORNIA',
];

// Which AMS office publishes the commodity, not where it grows: Fresno carries berries, stone
// fruit and grapes; El Centro carries vegetables and melons. They share no commodities, so each
// crop has exactly one source — but they do share growing districts (both report San Joaquin
// Valley and Central District), which is why DISTRICTS is filtered separately and identically.
const fresno = (name: string, color: string, commodity = name): MarsCrop => ({
  type: 'mars',
  name,
  color,
  report: 'FR_FV170',
  commodity,
  years: YEARS,
  districts: DISTRICTS,
});
const elCentro = (name: string, color: string, commodity = name): MarsCrop => ({
  type: 'mars',
  name,
  color,
  report: 'EL_FV170',
  commodity,
  years: YEARS,
  districts: DISTRICTS,
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
 * - **Citrus** (oranges, tangerines, lemons, grapefruit, clementines) — ample volume, but no
 *   weekly resolution: oranges alone out-ship everything else here. Every citrus commodity is
 *   reported on the same ~4 dates a year and only those — they share 100% of their reporting
 *   dates with each other, against 1% between oranges and peaches, which reports 23-26 weeks a
 *   year. Aggregates, not shipments, so no season can be derived however much is fetched. Needs
 *   a different source, and it is the painful gap: citrus is what a Bay Area winter is made of.
 * - **Artichokes** — shipped every week of the year, so no season emerges.
 * - **Sweet corn, sugar snap peas, bell peppers** — fragmented into slivers.
 *
 * The list is comprehensive: hand-authored crops are declared here too, so anything in the
 * region file that appears nowhere below has been retired and the writer removes it.
 */
const crops: Crop[] = [
  // spring
  fresno('Strawberries', '#b7636e'),
  fresno('Cherries', '#693038'),
  fresno('Blueberries', '#5b7294'),
  fresno('Apricots', '#cea15e'),
  // summer
  fresno('Raspberries', '#ad5869'),
  fresno('Peaches', '#d5a479'),
  fresno('Nectarines', '#c77d5b'),
  fresno('Plums', '#7e4b5e'),
  fresno('Blackberries', '#3b3040'),
  elCentro('Watermelons', '#c77580'),
  elCentro('Cantaloupes', '#d2a379'),
  // autumn
  elCentro('Tomatoes', '#b2584e'),
  fresno('Grapes', '#765387'),
  fresno('Pomegranates', '#88414a'),
  fresno('Persimmons', '#b4693d'),
];

/**
 * San Francisco Bay Area. Every crop the poster shows is listed above — derived and
 * hand-authored alike — and data/regions/__generated__/sfbay.ts is built from it.
 */
export const sfbay: RegionSources = { id: 'sfbay', name: 'San Francisco Bay Area', crops };
