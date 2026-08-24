import { describe, expect, test } from 'bun:test';

import type { Produce } from '@/data/regions/schema';
import { cropSlug, cropsParam, selectCrops } from '@/src/lib/crops';
import { platesFor } from '@/src/lib/plates';

const crop = (name: string, byDefault = true): Produce =>
  ({
    name,
    color: '#000000',
    spans: [],
    sources: [],
    generated: true,
    default: byDefault,
  }) as unknown as Produce;

const ITEMS = [crop('Cherries'), crop('Peaches'), crop('Grapes')];
/** A region carrying a crop it does not lead with, like the melons on the Bay Area poster. */
const WITH_EXTRA = [...ITEMS, crop('Watermelons', false)];

describe('cropSlug', () => {
  test('lowercases and hyphenates so a name can ride in a URL', () => {
    expect(cropSlug('Tomatoes')).toBe('tomatoes');
    expect(cropSlug('Peppers, Bell Type')).toBe('peppers-bell-type');
  });
});

describe('selectCrops', () => {
  test('shows the region default when nothing is named', () => {
    // A bare /sfbay is the poster's front door: it should show what someone expects to find at
    // a market, not every crop we happen to hold data for.
    expect(selectCrops(WITH_EXTRA, []).map((p) => p.name)).toEqual([
      'Cherries',
      'Peaches',
      'Grapes',
    ]);
  });

  test('shows a non-default crop when a URL asks for it', () => {
    expect(selectCrops(WITH_EXTRA, ['watermelons']).map((p) => p.name)).toEqual(['Watermelons']);
  });

  test('keeps the region’s own order, not the order named', () => {
    const picked = selectCrops(ITEMS, ['grapes', 'cherries']);
    expect(picked.map((p) => p.name)).toEqual(['Cherries', 'Grapes']);
  });

  test('ignores slugs it does not recognise', () => {
    expect(selectCrops(ITEMS, ['cherries', 'durian']).map((p) => p.name)).toEqual(['Cherries']);
  });

  test('falls back to the default when a link outlives every crop it named', () => {
    // Better a sensible poster than a blank one.
    expect(selectCrops(WITH_EXTRA, ['durian']).map((p) => p.name)).toEqual([
      'Cherries',
      'Peaches',
      'Grapes',
    ]);
  });
});

describe('cropsParam', () => {
  test('leaves no trace in the URL when the selection is the default', () => {
    expect(cropsParam(WITH_EXTRA, ITEMS)).toBeNull();
  });

  test('names the selection when it merely happens to be everything', () => {
    // Every crop including the ones held back is a real choice, so the link has to carry it.
    expect(cropsParam(WITH_EXTRA, WITH_EXTRA)).toBe('cherries,peaches,grapes,watermelons');
  });

  test('names the selection otherwise', () => {
    expect(cropsParam(ITEMS, [ITEMS[0]!, ITEMS[2]!])).toBe('cherries,grapes');
  });
});

describe('platesFor', () => {
  const shown = (...names: string[]) => names.map((n) => ({ name: n }));

  test('puts plates depicting a shown crop first', () => {
    const order = platesFor('sfbay', shown('Persimmons', 'Cherries')).map((p) => p.subject);
    expect(order.slice(0, 2).sort()).toEqual(['Cherry', 'Persimmon']);
  });

  test('still offers the rest, so a gap is never left bare for want of a match', () => {
    const all = platesFor('sfbay', []);
    expect(all.length).toBeGreaterThan(0);
    expect(platesFor('sfbay', shown('Cherries'))).toHaveLength(all.length);
  });

  test('keeps the curated order within each group', () => {
    // Grape outranks Plum in the library, and that should hold when both are depicted.
    const order = platesFor('sfbay', shown('Plums', 'Grapes')).map((p) => p.subject);
    expect(order.indexOf('Grape')).toBeLessThan(order.indexOf('Plum'));
  });

  test('a region with no plates yields none', () => {
    // A new region has no imagery until someone finds some, and the poster has to render anyway.
    expect(platesFor('nowhere', shown('Blueberries'))).toEqual([]);
  });

  test('a plate depicting nothing on the poster still comes last, not never', () => {
    // New York's persimmon depicts no New York crop, so it can only fill a leftover gap — but
    // it must still be offered, or the last gap goes empty while a usable plate sits unused.
    const order = platesFor('ny', shown('Apples')).map((p) => p.subject);
    expect(order[0]).toBe('Apple');
    expect(order).toContain('Persimmon');
    expect(order.indexOf('Persimmon')).toBeGreaterThan(order.indexOf('Apple'));
  });
});
