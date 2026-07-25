export interface MarsReport {
  slug: number; // MARS report slug (the API's numeric id)
  name: string; // human-readable title, used in generated citations
  origin: string; // namespaces the raw cache ('ca', 'ny') — the produce origin, not the consuming region
  originFilter?: string; // MARS `origin` value to filter on; terminal reports carry every origin
  note?: string; // provenance caveat worth carrying into citations
}

/**
 * MARS reports we pull from, keyed by their AMS report code. Regions point at a report by
 * code, so the slug/origin mapping lives here rather than in region triggers.
 *
 * Terminal reports (arrivals at a city's wholesale market) are preferred over shipping-point
 * reports: they measure produce where the shopper meets it rather than at the farm gate, and
 * a single market covers far more crops. They do carry every origin, so `originFilter` narrows
 * them to locally grown produce.
 */
export const MARS_REPORTS = {
  SX_FV010: {
    slug: 2322,
    name: 'San Francisco Terminal Market Fruit Prices',
    origin: 'ca',
    originFilter: 'California',
    note: 'discontinued 1 May 2025',
  },
  SX_FV020: {
    slug: 2323,
    name: 'San Francisco Terminal Market Vegetables Prices',
    origin: 'ca',
    originFilter: 'California',
    note: 'discontinued 1 May 2025',
  },
  FR_FV110: { slug: 2390, name: 'Fresno Shipping Point Fruit Prices', origin: 'ca' },
  FR_FV120: { slug: 2391, name: 'Fresno Shipping Point Vegetables Prices', origin: 'ca' },
} as const satisfies Record<string, MarsReport>;

export type MarsReportId = keyof typeof MARS_REPORTS;
