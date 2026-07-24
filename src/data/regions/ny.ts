export default {
  id: 'ny',
  name: 'New York State',
  generatedAt: '2026-07-23T00:00:00Z',
  schemaVersion: 1,
  items: [
    {
      name: 'Blueberries',
      color: '#4a6fa5',
      spans: [
        { level: 'available', from: 28, to: 29 }, // mid-July: farms open, first pickings (Hall's Hill 9-Jul, Vern Negus 11-Jul, Glenhaven 15-Jul)
        { level: 'peak', from: 30, to: 33 }, // late July – mid-August: main abundance
        { level: 'available', from: 34, to: 35 }, // late Aug – early Sept: tail (Cherry Knoll "late Aug"; Giancarelli "picking thru September")
      ],
      sources: [
        {
          title:
            'Cornell Cooperative Extension Tompkins County — "U-Pick Blueberry Farms", Finger Lakes region farm picking windows (openings 9–15 Jul, running mid-Aug into September)',
          url: 'https://ccetompkins.org/agriculture/buy-local/u-pick-blueberry-farms',
        },
      ],
    },
  ],
};
