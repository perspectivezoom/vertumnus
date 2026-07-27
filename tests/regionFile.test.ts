import { describe, expect, test } from 'bun:test';

import { type GeneratedProduce, rewriteRegionSource, type Span } from '@/scripts/lib/regionFile';

/** A region source with one generated entry and one hand-authored entry carrying comments. */
const source = `export default {
  id: 'test',
  name: 'Test Region',
  generatedAt: '2026-01-01T00:00:00Z',
  schemaVersion: 1,
  items: [
    {
      name: 'Cherries',
      color: '#7a1f2b',
      generated: true,
      spans: [
        { level: 'peak', from: 20, to: 24 }, // May 14 – Jun 17
      ],
      sources: [
        { title: 'USDA', url: 'https://example.test' },
      ],
    },
    // A hand-authored entry: these comments must survive verbatim.
    {
      name: 'Strawberries',
      color: '#d1495b',
      generated: false,
      spans: [
        { level: 'peak', from: 23, to: 33 }, // early June – mid-August
      ],
      sources: [
        { title: 'A paper', url: null },
      ],
    },
  ],
};
`;

const currentSpans = new Map<string, Span[]>([
  ['Cherries', [{ level: 'peak', from: 20, to: 24 }]],
  ['Strawberries', [{ level: 'peak', from: 23, to: 33 }]],
]);

/** Every crop the region claims — derived and hand-authored alike. */
const known = new Set(['Cherries', 'Strawberries', 'Kiwis']);

const cherries = (spans: Span[]): GeneratedProduce => ({
  name: 'Cherries',
  color: '#7a1f2b',
  spans,
  sources: [{ title: 'USDA', url: 'https://example.test' }],
});

/** The exact text of a produce entry, from its `{` through its closing `},`. */
function block(text: string, name: string): string {
  const at = text.indexOf(`name: '${name}'`);
  const open = text.lastIndexOf('{', at);
  const close = text.indexOf('\n    },', open);
  return text.slice(open, close);
}

describe('rewriteRegionSource', () => {
  test('leaves a hand-authored entry byte-identical, comments included', () => {
    const out = rewriteRegionSource(
      source,
      [cherries([{ level: 'peak', from: 20, to: 24 }])],
      currentSpans,
      known,
    );
    expect(block(out, 'Strawberries')).toBe(block(source, 'Strawberries'));
    expect(out).toContain('// A hand-authored entry: these comments must survive verbatim.');
    expect(out).toContain('// early June – mid-August');
  });

  test('replaces the generated entry with freshly derived spans', () => {
    const out = rewriteRegionSource(
      source,
      [cherries([{ level: 'peak', from: 18, to: 21 }])],
      currentSpans,
      known,
    );
    expect(out).toContain("{ level: 'peak', from: 18, to: 21 }");
    expect(out).not.toContain("{ level: 'peak', from: 20, to: 24 }");
  });

  test('annotates generated spans with their date range', () => {
    const out = rewriteRegionSource(
      source,
      [cherries([{ level: 'peak', from: 20, to: 24 }])],
      currentSpans,
      known,
    );
    expect(out).toContain('// May 14 – Jun 17');
  });

  test('reorders when a regenerated season shifts past a manual entry, keeping its comments', () => {
    // Cherries now peaks in autumn: midpoint 42 sorts after strawberries' 28.
    const out = rewriteRegionSource(
      source,
      [cherries([{ level: 'peak', from: 40, to: 44 }])],
      currentSpans,
      known,
    );
    expect(out.indexOf("name: 'Strawberries'")).toBeLessThan(out.indexOf("name: 'Cherries'"));
    expect(block(out, 'Strawberries')).toBe(block(source, 'Strawberries'));
  });

  test('is idempotent — rewriting unchanged data reproduces the same source', () => {
    const spans: Span[] = [{ level: 'peak', from: 20, to: 24 }];
    const once = rewriteRegionSource(source, [cherries(spans)], currentSpans, known);
    expect(rewriteRegionSource(once, [cherries(spans)], currentSpans, known)).toBe(once);
  });

  test('inserts a brand-new generated crop at its sorted position', () => {
    const kiwi: GeneratedProduce = {
      name: 'Kiwis',
      color: '#8ab547',
      spans: [{ level: 'peak', from: 45, to: 50 }],
      sources: [{ title: 'USDA', url: null }],
    };
    const out = rewriteRegionSource(source, [kiwi], currentSpans, known);
    expect(out.indexOf("name: 'Kiwis'")).toBeGreaterThan(out.indexOf("name: 'Strawberries'"));
    expect(block(out, 'Strawberries')).toBe(block(source, 'Strawberries'));
  });

  test('a produce with no peak span sorts last', () => {
    const out = rewriteRegionSource(
      source,
      [cherries([{ level: 'available', from: 5, to: 9 }])],
      currentSpans,
      known,
    );
    expect(out.indexOf("name: 'Strawberries'")).toBeLessThan(out.indexOf("name: 'Cherries'"));
  });

  describe('adversarial source text', () => {
    test('is not fooled by braces or apostrophes inside a citation string', () => {
      const tricky = source.replace(
        "{ title: 'A paper', url: null }",
        "{ title: 'Figure {3}, O\\'Neal\\'s survey — see } and {', url: null }",
      );
      const out = rewriteRegionSource(
        tricky,
        [cherries([{ level: 'peak', from: 20, to: 24 }])],
        currentSpans,
        known,
      );
      expect(block(out, 'Strawberries')).toBe(block(tricky, 'Strawberries'));
      expect(out).toContain("Figure {3}, O\\'Neal\\'s survey");
    });

    test('is not fooled by braces inside a comment', () => {
      const tricky = source.replace(
        '// early June – mid-August',
        '// spans { and } appear here, unbalanced: {{{',
      );
      const out = rewriteRegionSource(
        tricky,
        [cherries([{ level: 'peak', from: 20, to: 24 }])],
        currentSpans,
        known,
      );
      expect(block(out, 'Strawberries')).toBe(block(tricky, 'Strawberries'));
      expect(out).toContain('unbalanced: {{{');
    });

    test('refuses to overwrite a hand-authored entry rather than clobbering it', () => {
      // Strawberries is hand-authored from a better source; a crop list naming it must fail
      // loudly instead of quietly replacing a cited entry.
      const collision: GeneratedProduce = {
        name: 'Strawberries',
        color: '#d1495b',
        spans: [{ level: 'peak', from: 30, to: 40 }],
        sources: [{ title: 'derived', url: null }],
      };
      expect(() => rewriteRegionSource(source, [collision], currentSpans, known)).toThrow(
        /hand-authored/,
      );
    });

    test('keeps a claimed crop this run produced no data for', () => {
      // Another source may own it, or its cache may simply be missing — either way the crop is
      // still claimed, so its entry stands.
      const out = rewriteRegionSource(source, [], currentSpans, known);
      expect(block(out, 'Cherries')).toBe(block(source, 'Cherries'));
      expect(block(out, 'Strawberries')).toBe(block(source, 'Strawberries'));
    });

    test('retires an entry the region no longer claims', () => {
      // The crop list is comprehensive, so dropping a crop from it retires the entry rather
      // than leaving produce behind that nothing accounts for.
      const withoutCherries = new Set(['Strawberries']);
      const out = rewriteRegionSource(source, [], currentSpans, withoutCherries);
      expect(out).not.toContain("name: 'Cherries'");
      expect(block(out, 'Strawberries')).toBe(block(source, 'Strawberries'));
    });
  });
});
