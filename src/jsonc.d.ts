declare module '*.jsonc' {
  /** Raw parsed JSONC; validate with a zod schema before use. */
  const value: unknown;
  export default value;
}
