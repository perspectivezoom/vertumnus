import { describe, expect, test } from 'bun:test';

import type { Produce } from '@/data/regions/schema';
import { cropSlug, cropsParam, selectCrops } from '@/src/lib/crops';

const crop = (name: string): Produce =>
  ({ name, color: '#000000', spans: [], sources: [], generated: true }) as unknown as Produce;

const ITEMS = [crop('Cherries'), crop('Peaches'), crop('Grapes')];

describe('cropSlug', () => {
  test('lowercases and hyphenates so a name can ride in a URL', () => {
    expect(cropSlug('Tomatoes')).toBe('tomatoes');
    expect(cropSlug('Peppers, Bell Type')).toBe('peppers-bell-type');
  });
});

describe('selectCrops', () => {
  test('shows everything when nothing is named', () => {
    // A bare /sfbay is the poster's front door, so an absent selection has to mean all.
    expect(selectCrops(ITEMS, [])).toHaveLength(3);
  });

  test('keeps the region’s own order, not the order named', () => {
    const picked = selectCrops(ITEMS, ['grapes', 'cherries']);
    expect(picked.map((p) => p.name)).toEqual(['Cherries', 'Grapes']);
  });

  test('ignores slugs it does not recognise', () => {
    expect(selectCrops(ITEMS, ['cherries', 'durian']).map((p) => p.name)).toEqual(['Cherries']);
  });

  test('falls back to everything when a link outlives every crop it named', () => {
    // Better a sensible poster than a blank one.
    expect(selectCrops(ITEMS, ['durian'])).toHaveLength(3);
  });
});

describe('cropsParam', () => {
  test('leaves no trace in the URL when everything is selected', () => {
    expect(cropsParam(ITEMS, ITEMS)).toBeNull();
  });

  test('names the selection otherwise', () => {
    expect(cropsParam(ITEMS, [ITEMS[0]!, ITEMS[2]!])).toBe('cherries,grapes');
  });
});
