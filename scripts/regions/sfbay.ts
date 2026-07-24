import type { RegionSources } from '@/scripts/regions/index';

/**
 * San Francisco Bay Area. The region owns its source list (pull-based — the region decides
 * what it pulls, so nothing central can clobber a produce). Only the crops listed here are
 * written to src/data/regions/sfbay.ts, and only as `generated: true` entries; hand-authored
 * produce in that file is left alone.
 */
export const sfbay: RegionSources = {
  id: 'sfbay',
  crops: [
    {
      type: 'mars',
      name: 'Cherries',
      color: '#7a1f2b',
      report: 'FR_FV110',
      commodity: 'Cherries',
      years: [2023, 2024, 2025],
    },
  ],
};
