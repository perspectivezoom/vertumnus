import { describe, expect, test } from 'bun:test';

import { z } from 'zod';

import { ProduceSchema, RegionSchema } from '@/src/data/types';

type Span = { level: 'available' | 'peak'; from: number; to: number };

const produceWith = (spans: Span[]) => ({
  name: 'Widget',
  color: '#2a78d6',
  generated: false,
  spans,
  sources: [{ title: 'src', url: null }],
});

describe('RegionSchema', () => {
  test('accepts a minimal valid region', () => {
    const region = {
      id: 'test',
      name: 'Test Region',
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

  describe('peak-midpoint ordering', () => {
    type ProduceInput = z.input<typeof ProduceSchema>;
    const ORDER_ERROR = 'items must be ordered by ascending peak midpoint';

    const peakProduce = (name: string, from: number, to: number): ProduceInput => ({
      name,
      color: '#2a78d6',
      generated: false,
      spans: [{ level: 'peak', from, to }],
      sources: [{ title: 'src', url: null }],
    });

    const region = (items: ProduceInput[]): z.input<typeof RegionSchema> => ({
      id: 'sort',
      name: 'Sort',
      schemaVersion: 1,
      items,
    });

    test('valid: items in ascending peak-midpoint order', () => {
      expect(() =>
        RegionSchema.parse(
          region([
            peakProduce('Early', 4, 8),
            peakProduce('Mid', 22, 26),
            peakProduce('Late', 40, 44),
          ]),
        ),
      ).not.toThrow();
    });

    test('invalid: items out of peak-midpoint order', () => {
      expect(() =>
        RegionSchema.parse(
          region([
            peakProduce('Late', 40, 44),
            peakProduce('Early', 4, 8),
            peakProduce('Mid', 22, 26),
          ]),
        ),
      ).toThrow(ORDER_ERROR);
    });

    test('invalid: a produce with no peak span must be authored last', () => {
      const noPeak: ProduceInput = {
        name: 'NoPeak',
        color: '#2a78d6',
        generated: false,
        spans: [{ level: 'available', from: 1, to: 10 }],
        sources: [{ title: 'src', url: null }],
      };
      expect(() => RegionSchema.parse(region([noPeak, peakProduce('HasPeak', 20, 24)]))).toThrow(
        ORDER_ERROR,
      );
    });
  });
});
