import { describe, expect, test } from 'bun:test';

import { z } from 'zod';

import { ProduceSchema, RegionSchema } from '@/data/types';

type Span = { level: 'available' | 'peak'; from: number; to: number };

const produceWith = (spans: Span[]) => ({
  name: 'Widget',
  spans,
  sources: [{ title: 'src', url: null }],
});

describe('RegionSchema', () => {
  test('accepts a minimal valid region', () => {
    const region = {
      id: 'test',
      name: 'Test Region',
      generatedAt: '2026-01-01T00:00:00Z',
      schemaVersion: 1,
      items: [produceWith([{ level: 'peak', from: 1, to: 10 }])],
    };
    expect(() => RegionSchema.parse(region)).not.toThrow();
  });

  describe('ProduceSchema', () => {
    function parseError(spans: Span[]): z.ZodError {
      try {
        ProduceSchema.parse(produceWith(spans));
      } catch (error) {
        if (error instanceof z.ZodError) return error;
        throw error;
      }
      throw new Error('expected ProduceSchema.parse to throw');
    }

    test('valid: non-overlapping spans', () => {
      expect(() =>
        ProduceSchema.parse(
          produceWith([
            { level: 'available', from: 1, to: 5 },
            { level: 'peak', from: 6, to: 10 },
          ]),
        ),
      ).not.toThrow();
    });

    test('valid: a year-wrapping span (to < from)', () => {
      expect(() =>
        ProduceSchema.parse(
          produceWith([
            { level: 'peak', from: 50, to: 3 },
            { level: 'available', from: 10, to: 20 },
          ]),
        ),
      ).not.toThrow();
    });

    test('invalid: overlapping spans', () => {
      const error = parseError([
        { level: 'available', from: 1, to: 5 },
        { level: 'peak', from: 5, to: 10 },
      ]);
      expect(error.issues[0]?.message).toBe('week spans overlap');
      expect(error.issues[0]?.path).toEqual(['spans']);
    });

    test('invalid: overlap across the year wrap', () => {
      const error = parseError([
        { level: 'peak', from: 50, to: 3 }, // covers 50, 51, 52, 1, 2, 3
        { level: 'available', from: 2, to: 8 }, // shares 2, 3
      ]);
      expect(error.issues[0]?.message).toBe('week spans overlap');
      expect(error.issues[0]?.path).toEqual(['spans']);
    });
  });
});
