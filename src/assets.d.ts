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
