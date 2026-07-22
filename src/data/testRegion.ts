// Synthetic 6-produce region used for layout development and the schema test.
// NOT real seasonality data — spans are chosen to spread peaks across the year
// (and include a year-wrapping winter peak) so the streamgraph exercises every
// case. It is validated like any real region but kept out of the production
// `regions` list.
export const testRegion = {
  id: 'test',
  name: 'Test Region (layout dev)',
  generatedAt: '2026-07-21T00:00:00Z',
  schemaVersion: 1,
  items: [
    {
      name: 'Meyer Lemon',
      color: '#2a78d6',
      spans: [
        { level: 'available', from: 45, to: 48 }, // late Nov
        { level: 'peak', from: 49, to: 6 }, // early Dec – mid Feb (wraps)
        { level: 'available', from: 7, to: 12 }, // late Feb – late Mar
      ],
      sources: [{ title: 'Synthetic sample data (layout dev)', url: null }],
    },
    {
      name: 'Asparagus',
      color: '#3aa76d',
      spans: [
        { level: 'available', from: 11, to: 13 },
        { level: 'peak', from: 14, to: 19 }, // spring
        { level: 'available', from: 20, to: 24 },
      ],
      sources: [{ title: 'Synthetic sample data (layout dev)', url: null }],
    },
    {
      name: 'Strawberries',
      color: '#e0902b',
      spans: [
        { level: 'available', from: 18, to: 22 },
        { level: 'peak', from: 23, to: 33 }, // early summer
        { level: 'available', from: 34, to: 40 },
      ],
      sources: [{ title: 'Synthetic sample data (layout dev)', url: null }],
    },
    {
      name: 'Tomatoes',
      color: '#d1495b',
      spans: [
        { level: 'available', from: 26, to: 29 },
        { level: 'peak', from: 30, to: 38 }, // late summer
        { level: 'available', from: 39, to: 43 },
      ],
      sources: [{ title: 'Synthetic sample data (layout dev)', url: null }],
    },
    {
      name: 'Winter Squash',
      color: '#7a5bd0',
      spans: [
        { level: 'available', from: 37, to: 39 },
        { level: 'peak', from: 40, to: 48 }, // fall
        { level: 'available', from: 49, to: 2 }, // storage tail (wraps)
      ],
      sources: [{ title: 'Synthetic sample data (layout dev)', url: null }],
    },
    {
      name: 'Jerusalem Artichoke',
      color: '#2f9c95',
      spans: [
        { level: 'available', from: 44, to: 46 },
        { level: 'peak', from: 47, to: 52 }, // early winter — long name on the right edge
      ],
      sources: [{ title: 'Synthetic sample data (layout dev)', url: null }],
    },
  ],
};
