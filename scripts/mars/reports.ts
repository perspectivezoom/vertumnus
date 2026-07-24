export interface MarsReport {
  slug: number; // MARS report slug (the API's numeric id)
  name: string; // human-readable title, used in generated citations
  origin: string; // namespaces the raw cache ('ca', 'ny') — the produce origin, not the consuming region
}

/**
 * MARS shipping-point reports we pull from, keyed by their AMS report code. Regions point
 * at a report by code, so the slug/origin mapping lives here rather than in region triggers.
 */
export const MARS_REPORTS = {
  FR_FV110: { slug: 2390, name: 'Fresno Shipping Point Fruit Prices', origin: 'ca' },
  FR_FV120: { slug: 2391, name: 'Fresno Shipping Point Vegetables Prices', origin: 'ca' },
} as const satisfies Record<string, MarsReport>;

export type MarsReportId = keyof typeof MARS_REPORTS;
