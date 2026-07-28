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
 * arrives. Checked against an independently published Salinas-Watsonville strawberry curve,
 * shipped volume put the peak at weeks 23–34 against that curve's 23–33, while counting quotes
 * stretched it to 18–48. Prefer volume; if a crop is missing here, find another source rather
 * than falling back to quote counting.
 *
 * The two reports share no commodities: Fresno carries berries, stone fruit and grapes; El
 * Centro carries vegetables, melons and citrus (despite its name, its largest district is
 * Salinas-Watsonville).
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
