export interface MarsReport {
  slug: number; // MARS report slug (the API's numeric id)
  name: string; // human-readable title, used in generated citations
  origin: string; // namespaces the raw cache ('ca', 'ny') — the produce origin, not the consuming region
  originPrefix: string; // keep rows whose `origin` starts with this (the API cannot prefix-match)
  volumeField: string; // row field holding the shipped quantity
}

/**
 * MARS movement reports, keyed by their AMS report code. Movement reports state shipped
 * quantity by commodity and growing district, which is what peak season means — the weeks a
 * crop floods the market.
 *
 * MARS also publishes price reports covering far more commodities, but a row there is a price
 * *quote*, so counting rows measures how long a crop is offered rather than how much of it
 * arrives — counting quotes stretched strawberries to a peak of weeks 18–48. Prefer volume; if
 * a crop is missing here, find another source rather than falling back to quote counting.
 *
 * **A report is an AMS office, not a place.** Both cover the whole state, and neither name
 * describes where the produce grew — across all commodities in 2024, El Centro's rows came 52%
 * from San Joaquin Valley and 23% from Salinas-Watsonville against just 3% from its namesake
 * Imperial Valley, while Fresno's spread across Kern (26%), San Joaquin (21%),
 * Salinas-Watsonville (19%) and Santa Maria (15%). They also share districts, so picking a
 * report does nothing to narrow geography: that is what `MarsSource.districts` is for, and
 * skipping it silently answers "when is the state shipping this" instead of "when is it good
 * at my market". Filtered to Salinas-Watsonville, shipped volume puts the strawberry peak at
 * weeks 22–34 against an independently published curve's 23–33; unfiltered it lands at 18–28,
 * because the southern districts out-ship that one and harvest first.
 *
 * What the reports do partition is commodities, and they share none: Fresno carries berries,
 * stone fruit and grapes (17 commodities); El Centro carries vegetables, melons and citrus (60).
 */
export const MARS_REPORTS = {
  FR_FV170: {
    slug: 2899,
    name: 'Fresno, CA Truck, Air and Boat Movement Report',
    origin: 'ca',
    originPrefix: 'California',
    volumeField: '1 lb units'
  },
  EL_FV170: {
    slug: 3119,
    name: 'El Centro, CA Truck, Air and Boat Movement Report',
    origin: 'ca',
    originPrefix: 'California',
    volumeField: '1 lb units'
  }
} as const satisfies Record<string, MarsReport>;

export type MarsReportId = keyof typeof MARS_REPORTS;
