/**
 * Importing an image yields the URL the bundler emits for it. Bun's HTML bundler copies the file
 * into dist with a content hash, so the poster references it like any other asset.
 */
declare module '*.webp' {
  const src: string;
  export default src;
}
