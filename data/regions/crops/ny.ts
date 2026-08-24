import type { Crop, RegionSources } from '@/data/regions/crops';
import type { NyHarvestCrop } from '@/data/regions/sources/nyHarvest';

/** A crop as the chart names it, unless the poster calls it something else. */
type Charted = Omit<NyHarvestCrop, 'default'>;
const from = (name: string, color: string, chartRow = name): Charted => ({
  type: 'nyHarvest',
  name,
  chartRow,
  color,
});

/**
 * New York State, from the state's own harvest chart.
 *
 * Nearly every crop the chart lists is here, because a stated harvest window is enough to earn a
 * place in the picker. Four are left out — see below. What `default` decides is the much shorter
 * list a poster opens on, and it answers two questions at once: is the crop grown here in
 * earnest, and does its quality swing enough with the season that somebody plans a market trip
 * around it. Both are needed, and they disagree more than expected —
 *
 * - **Cabbage** is New York's third most valuable crop at $59M a year and almost none of it
 *   reaches a market stall; it is grown for sauerkraut and coleslaw. Scale without the swing.
 * - **Potatoes, onions, garlic, herbs and dry beans** are sold all year, so knowing their
 *   harvest changes nobody's plans. Swing without the urgency.
 * - **Strawberries, tomatoes, peaches and asparagus** are the reason people come in June, and
 *   USDA NASS publishes no New York estimate for any of them — its state survey covers sixteen
 *   commodities, so absence there says nothing about what grows.
 *
 * So the default list is drawn from both: six crops NASS confirms at scale (apples at $352M,
 * four times the next; grapes, sweet corn, winter squash, pumpkins, peas) and seven the state
 * chart carries that no market shopper would leave out.
 *
 * **Dry beans, lima beans, celery and currants are on the chart but not here.** They belong to
 * the processing trade rather than the market: New York grows dry beans in earnest — 34,000
 * acres, tenth in the country — but they go to cans, and Cornell describes baby limas as a new
 * crop grown for processing. A crop nobody could buy from a stall is not merely undefaulted, it
 * is off the list, because the picker is meant to be worth reading through. Their readings stay
 * in the cache regardless: what the chart says is a fact about the chart, and dropping them here
 * is our editorial call, not a correction to the state's.
 *
 * Sources: seasons from the NYS Department of Agriculture and Markets chart cached under
 * data/raw/nyharvest/ — the same chart GrowNYC redistributes as its Greenmarket harvest
 * calendar, so the two are one source rather than two. Scale from the USDA NASS New York state
 * overview. There is no shipment-volume series for New York the way there is for California; see
 * data/raw/nyharvest/client.ts for why.
 */
const crops: Crop[] = [
  // spring — the short windows that empty a market stall by noon
  { ...from('Asparagus', '#6f8f4e'), default: true },
  { ...from('Rhubarb', '#b04a55'), default: true },
  { ...from('Radishes', '#bf5566'), default: false },
  { ...from('Spinach', '#4f7346'), default: false },
  { ...from('Lettuce', '#8fb35c'), default: false },
  { ...from('Beet Greens', '#5f7a45'), default: false },
  { ...from('Turnip Greens', '#5a7a44'), default: false },
  { ...from('Parsnips', '#cdb98a'), default: false }, // overwintered, so spring then autumn

  // early summer
  { ...from('Strawberries', '#b7636e'), default: true },
  { ...from('Peas', '#7fa552'), default: true },
  { ...from('Cherries, Sweet', '#693038'), default: false },
  { ...from('Cherries, Tart', '#a33f43'), default: false },
  { ...from('Garlic', '#cfc3ab'), default: false },
  { ...from('Broccoli', '#4f7a4a'), default: false },
  { ...from('Swiss Chard', '#a24a52'), default: false },
  { ...from('Mustard Greens', '#7d9445'), default: false },
  { ...from('Squash, Summer', '#ddc25a'), default: false },
  { ...from('Zucchini', '#6b8f4d'), default: false },
  { ...from('Herbs', '#6d8f5e'), default: false },
  { ...from('Beets', '#8c3550'), default: false },

  // high summer — the crops the whole calendar is arranged around
  { ...from('Blueberries', '#5b7294'), default: true },
  { ...from('Raspberries', '#ad5869'), default: true },
  { ...from('Blackberries', '#3b3040'), default: false },
  { ...from('Peaches', '#d5a479'), default: true },
  { ...from('Plums', '#7e4b5e'), default: false },
  { ...from('Prunes', '#4f3a44'), default: false },
  { ...from('Tomatoes', '#b2584e'), default: true },
  { ...from('Corn', '#e0c04a'), default: true },
  { ...from('Cucumbers', '#6f9457'), default: false },
  { ...from('Beans, Snap', '#6d9153'), default: false },
  { ...from('Peppers', '#7a8f4a'), default: false },
  { ...from('Eggplant', '#5b3f63'), default: false },
  { ...from('Cantaloupes', '#d2a379'), default: false },
  { ...from('Watermelon', '#c77580'), default: false },
  { ...from('Potatoes', '#a9855e'), default: false },
  { ...from('Onions', '#b98b6b'), default: false },
  { ...from('Carrots', '#d08243'), default: false },
  { ...from('Collard Greens', '#4a6b40'), default: false },
  { ...from('Kale', '#47603f'), default: false },

  // autumn — and the storage crops that carry a northern winter
  { ...from('Grapes', '#765387'), default: true },
  { ...from('Apples', '#a8443f'), default: true },
  { ...from('Pears', '#b3a45c'), default: false },
  { ...from('Squash, Winter', '#b7783c'), default: true },
  { ...from('Pumpkins', '#cf7b35'), default: true },
  { ...from('Cauliflower', '#d8cfa8'), default: false },
  { ...from('Brussels Sprouts', '#6b8a50'), default: false },
  { ...from('Cabbage', '#93a86b'), default: false },
  { ...from('Leeks', '#8fa86a'), default: false },
  { ...from('Turnips', '#a8798f'), default: false },
];

export const ny: RegionSources = { id: 'ny', name: 'New York State', crops };
