export interface Columnar {
  constants: Record<string, unknown>;
  fields: string[];
  rows: unknown[][];
}

/**
 * What every cache records, whatever wrote it. A source adds its own provenance on top — what
 * it asked for, and how it narrowed the answer — and this module neither knows nor cares what
 * those fields are; it only round-trips them.
 */
export interface CacheMeta {
  url: string;
  fetchedAt: string;
}

/**
 * Split rows-of-objects into hoisted `constants` (columns identical across every row),
 * the varying `fields`, and per-row value arrays aligned to those fields.
 */
export function toColumnar(rows: Record<string, unknown>[]): Columnar {
  const first = rows[0];
  if (!first) return { constants: {}, fields: [], rows: [] };
  const constants: Record<string, unknown> = {};
  const fields: string[] = [];
  for (const key of Object.keys(first)) {
    const distinct = new Set(rows.map((row) => JSON.stringify(row[key] ?? null)));
    if (distinct.size <= 1) constants[key] = first[key] ?? null;
    else fields.push(key);
  }
  return { constants, fields, rows: rows.map((row) => fields.map((f) => row[f] ?? null)) };
}

/** Inverse of toColumnar: rebuild rows-of-objects, merging constants back into each row. */
export function rehydrate(c: Columnar): Record<string, unknown>[] {
  return c.rows.map((row) => {
    const obj: Record<string, unknown> = { ...c.constants };
    c.fields.forEach((f, i) => {
      obj[f] = row[i];
    });
    return obj;
  });
}

/**
 * Serialize a columnar cache as `.jsonc`: a `//` comment header over the JSON body. Layout
 * is left to oxfmt (see `pull`, which formats the file it writes), so this only has to emit
 * something valid and readable — no hand-rolled line breaking.
 */
export function serializeCache<M extends CacheMeta>(
  header: string[],
  meta: M,
  c: Columnar
): string {
  const comments = header.map((line) => (line ? `// ${line}` : '//')).join('\n');
  const body = { ...meta, constants: c.constants, fields: c.fields, rows: c.rows };
  return `${comments}\n${JSON.stringify(body, null, 2)}\n`;
}

/** Parse a `.jsonc` cache written by serializeCache (drops the leading `//` comment lines). */
export function parseCache<M extends CacheMeta = CacheMeta>(text: string): M & Columnar {
  const json = text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
  return JSON.parse(json) as M & Columnar;
}
