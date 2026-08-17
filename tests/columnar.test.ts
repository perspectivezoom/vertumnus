import { describe, expect, test } from 'bun:test';

import {
  type CacheMeta,
  parseCache,
  rehydrate,
  serializeCache,
  toColumnar,
} from '@/data/raw/format';

/** Stands in for whatever provenance a source adds; the codec should not care which fields. */
interface FakeSourceMeta extends CacheMeta {
  askedFor: string;
  narrowedTo: string[];
}

const meta: FakeSourceMeta = {
  url: 'https://example.test/reports/1',
  fetchedAt: '2026-01-01T00:00:00Z',
  askedFor: 'Cherries',
  narrowedTo: ['SOMEWHERE', 'ELSEWHERE'],
};

/** Shaped like real MARS rows: constant columns, nulls, and prose with quotes/newlines. */
const rows: Record<string, unknown>[] = [
  {
    commodity: 'Cherries',
    district: 'SAN JOAQUIN VALLEY CALIFORNIA',
    report_date: '05/16/2024',
    low_price: 40,
    supply_tone_comments: null,
    narrative: 'Fresno, CA: Sunny 65-93\nO\'Neals: it\'s "clear"',
  },
  {
    commodity: 'Cherries',
    district: 'SAN JOAQUIN VALLEY CALIFORNIA',
    report_date: '05/17/2024',
    low_price: null,
    supply_tone_comments: 'LIGHT',
    narrative: 'Lodi, CA: Clear 55-85',
  },
];

describe('toColumnar / rehydrate', () => {
  test('round-trips rows without losing any column', () => {
    expect(rehydrate(toColumnar(rows))).toEqual(rows);
  });

  test('hoists only the columns identical across every row', () => {
    const columnar = toColumnar(rows);
    expect(Object.keys(columnar.constants).sort()).toEqual(['commodity', 'district']);
    expect(columnar.fields.sort()).toEqual([
      'low_price',
      'narrative',
      'report_date',
      'supply_tone_comments',
    ]);
  });

  test('distinguishes a null from a missing value when hoisting', () => {
    // supply_tone_comments differs (null vs 'LIGHT'), so it must stay a varying field.
    expect(toColumnar(rows).constants).not.toHaveProperty('supply_tone_comments');
  });

  test('a single row makes every column constant', () => {
    const [only] = rows;
    const columnar = toColumnar([only as Record<string, unknown>]);
    expect(columnar.fields).toEqual([]);
    expect(columnar.rows).toEqual([[]]);
    expect(rehydrate(columnar)).toEqual([only as Record<string, unknown>]);
  });

  test('handles no rows at all', () => {
    expect(toColumnar([])).toEqual({ constants: {}, fields: [], rows: [] });
    expect(rehydrate(toColumnar([]))).toEqual([]);
  });
});

describe('serializeCache / parseCache', () => {
  test('round-trips through the on-disk .jsonc form', () => {
    const text = serializeCache(['a header', '', 'line two'], meta, toColumnar(rows));
    const parsed = parseCache<FakeSourceMeta>(text);
    expect(rehydrate(parsed)).toEqual(rows);
    expect(parsed.url).toBe(meta.url);
    expect(parsed.fetchedAt).toBe(meta.fetchedAt);
    // Whatever the source recorded comes back untouched, without the codec naming those fields.
    expect(parsed.askedFor).toBe(meta.askedFor);
    expect(parsed.narrowedTo).toEqual(meta.narrowedTo);
  });

  test('emits a comment header and stays valid JSON once comments are stripped', () => {
    const text = serializeCache(['a header'], meta, toColumnar(rows));
    expect(text.startsWith('// a header\n')).toBe(true);
    const stripped = text
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .join('\n');
    expect(() => JSON.parse(stripped)).not.toThrow();
  });

  test('emits no trailing commas, which strict JSON.parse would reject', () => {
    const text = serializeCache([], meta, toColumnar(rows));
    expect(text).not.toMatch(/,\s*[\]}]/);
  });
});
