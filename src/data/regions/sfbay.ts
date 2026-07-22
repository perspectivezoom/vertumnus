export default {
  id: 'sfbay',
  name: 'San Francisco Bay Area',
  generatedAt: '2026-07-20T00:00:00Z',
  schemaVersion: 1,
  items: [
    {
      name: 'Strawberries',
      color: '#d1495b',
      spans: [
        { level: 'available', from: 18, to: 22 }, // 30-Apr – early June (ramp-up, >=25% of peak volume)
        { level: 'peak', from: 23, to: 33 }, // early June – mid-August (4-Jun to 13-Aug on Fig. 5)
        { level: 'available', from: 34, to: 40 }, // late August – early October (tail-off, >=25% of peak volume)
      ],
      sources: [
        {
          title:
            'The California Strawberry Industry: Current Trends and Future Prospects (2024), Fig. 5 — Salinas-Watsonville district weekly production volume, three-year average',
          url: 'https://www.tandfonline.com/doi/full/10.1080/15538362.2024.2342900',
        },
      ],
    },
  ],
};
