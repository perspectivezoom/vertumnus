/**
 * Importing a non-code file, and what you get back.
 *
 * Two different things depending on the kind: a binary asset resolves to the URL the bundler
 * emitted it at, while a text file resolves to its contents. Both are Bun's defaults — the
 * declarations exist so TypeScript knows about them, not to configure anything.
 */

/** An image resolves to its emitted URL, content-hashed and copied into dist. */
declare module '*.webp' {
  const src: string;
  export default src;
}

/** A text file resolves to its contents, so a licence can ship with what it covers. */
declare module '*.txt' {
  const contents: string;
  export default contents;
}

/**
 * A written section resolves to its Markdown source — but only when imported
 * `with { type: 'text' }`.
 *
 * Bun's default loader for `.md` renders it to HTML, which is not what any of these imports want:
 * the sections go through this site's own prose components, and HTML arrives too late for that.
 * Forgetting the attribute is not subtle — the renderer escapes the tags and the page prints its
 * own markup as text — but it is easy to do, which is why it is written down here.
 */
declare module '*.md' {
  const source: string;
  export default source;
}
