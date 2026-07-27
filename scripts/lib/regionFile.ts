import { peakMidpoint } from '@/src/lib/season';

export interface Span {
  level: 'peak' | 'available';
  from: number;
  to: number;
}

export interface Source {
  title: string;
  url: string | null;
}

/** A produce entry a region trigger owns and writes (always `generated: true`). */
export interface GeneratedProduce {
  name: string;
  color: string;
  spans: Span[];
  sources: Source[];
}

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

/** Approximate calendar date of a week's first day, in a non-leap reference year. */
function dayLabel(dayOfYear: number): string {
  const date = new Date(Date.UTC(2025, 0, dayOfYear));
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** Human-readable date range for a span, for the generated inline comment. */
function spanLabel(span: Span): string {
  return `${dayLabel((span.from - 1) * 7 + 1)} – ${dayLabel(span.to * 7)}`;
}

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** Serialize a produce entry as TS source (oxfmt normalizes the indentation afterwards). */
function serializeProduce(produce: GeneratedProduce): string {
  const spans = produce.spans
    .map((s) => `{ level: ${quote(s.level)}, from: ${s.from}, to: ${s.to} }, // ${spanLabel(s)}`)
    .join('\n');
  const sources = produce.sources
    .map((s) => `{ title: ${quote(s.title)}, url: ${s.url === null ? 'null' : quote(s.url)} },`)
    .join('\n');
  return [
    '{',
    `name: ${quote(produce.name)},`,
    `color: ${quote(produce.color)},`,
    'generated: true,',
    'spans: [',
    spans,
    '],',
    'sources: [',
    sources,
    '],',
    '},',
  ].join('\n');
}

/** Index of the bracket matching the one at `open`, skipping strings and comments. */
function matchBracket(text: string, open: number): number {
  const closer = text[open] === '[' ? ']' : '}';
  const opener = text[open] as string;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '/' && next === '/') {
      i = text.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (char === '/' && next === '*') {
      i = text.indexOf('*/', i) + 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      for (i++; i < text.length; i++) {
        if (text[i] === '\\') i++;
        else if (text[i] === char) break;
      }
      continue;
    }
    if (char === opener) depth++;
    else if (char === closer && --depth === 0) return i;
  }
  throw new Error('unbalanced brackets in region file');
}

interface Segment {
  name: string;
  generated: boolean; // false marks a hand-authored entry this writer must not touch
  text: string; // the entry's source, including any comments that lead it
}

/**
 * Split the inner text of an `items: [...]` array into one segment per produce. A segment
 * runs from just after the previous entry's comma through its own, so comments sitting above
 * an entry travel with it when entries are reordered.
 */
function splitEntries(inner: string): Segment[] {
  const segments: Segment[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    const next = inner[i + 1];
    if (char === '/' && next === '/') {
      i = inner.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (char === '/' && next === '*') {
      i = inner.indexOf('*/', i) + 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      for (i++; i < inner.length; i++) {
        if (inner[i] === '\\') i++;
        else if (inner[i] === char) break;
      }
      continue;
    }
    if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      let end = i + 1;
      while (end < inner.length && /\s/.test(inner[end] as string)) end++;
      if (inner[end] === ',') end++;
      const text = inner.slice(start, end).trim();
      segments.push({
        name: /name:\s*'([^']*)'/.exec(text)?.[1] ?? '',
        generated: /generated:\s*true/.test(text),
        text,
      });
      start = end;
    }
  }
  return segments;
}

/**
 * Rewrite a region source's generated produce entries, returning the new source.
 *
 * Entries are handled as text blocks: `generated: false` blocks are kept verbatim (comments
 * and all), generated ones are reserialized from freshly derived data, and every block is
 * re-sorted by the peak midpoint of its *final* spans — so a generated crop whose season
 * shifted moves to its new position without disturbing the hand-authored entries.
 *
 * `currentSpans` supplies the spans of entries that aren't being regenerated, since their
 * midpoints can't be read from the text.
 */
export function rewriteRegionSource(
  text: string,
  generated: GeneratedProduce[],
  currentSpans: Map<string, Span[]>,
  known: ReadonlySet<string>,
): string {
  const arrayStart = text.indexOf('[', text.indexOf('items:'));
  const arrayEnd = matchBracket(text, arrayStart);
  const segments = splitEntries(text.slice(arrayStart + 1, arrayEnd));

  const pending = new Map(generated.map((produce) => [produce.name, produce]));
  // `known` lists every crop the region claims, hand-authored ones included, so an entry
  // missing from it has been retired rather than merely unhandled by this run. Dropping it
  // keeps the file from accumulating produce nothing accounts for.
  const blocks = segments
    .filter((segment) => known.has(segment.name))
    .map((segment) => {
      const fresh = pending.get(segment.name);
      // A hand-authored entry outranks anything a source can derive — it exists precisely
      // because someone found better data. Refuse rather than silently replace it: losing a
      // cited entry to a name collision would be near-invisible in review.
      if (fresh && !segment.generated) {
        throw new Error(
          `'${segment.name}' is hand-authored (generated: false) in the region file, but a ` +
            `source also produces it. Refusing to overwrite. Either remove '${segment.name}' ` +
            `from the region's crop list, or delete the hand-authored entry to let the source own it.`,
        );
      }
      pending.delete(segment.name);
      const spans = fresh ? fresh.spans : (currentSpans.get(segment.name) ?? []);
      return {
        midpoint: peakMidpoint(spans),
        text: fresh ? serializeProduce(fresh) : segment.text,
      };
    });
  // Generated crops not yet in the file get inserted at their sorted position.
  for (const produce of pending.values()) {
    blocks.push({ midpoint: peakMidpoint(produce.spans), text: serializeProduce(produce) });
  }
  blocks.sort((a, b) => a.midpoint - b.midpoint);

  const body = blocks.map((block) => block.text).join('\n');
  return `${text.slice(0, arrayStart + 1)}\n${body}\n${text.slice(arrayEnd)}`;
}

/** Apply {@link rewriteRegionSource} to a region file in place, then format it. */
export async function updateRegionFile(
  regionId: string,
  generated: GeneratedProduce[],
  known: ReadonlySet<string>,
): Promise<void> {
  const path = `src/data/regions/${regionId}.ts`;
  const text = await Bun.file(path).text();

  // Current parsed data supplies the peak midpoints of the entries we aren't regenerating.
  const region = (await import(`${process.cwd()}/${path}`)) as {
    default: { items: { name: string; spans: Span[] }[] };
  };
  const currentSpans = new Map(region.default.items.map((item) => [item.name, item.spans]));

  await Bun.write(path, rewriteRegionSource(text, generated, currentSpans, known));
  await Bun.$`bunx oxfmt ${path}`.quiet(); // only the file we wrote
}
