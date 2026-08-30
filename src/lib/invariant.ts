/**
 * A thing the code is entitled to assume, stated so that being wrong is loud.
 *
 * Not defence. Code holding data it was already given has no useful answer for "what if this is
 * missing" — `chapter?.title` quietly renders a page with a hole in it, where a throw names the
 * assumption that failed. What genuinely might be absent is checked where it enters instead.
 *
 * Five lines rather than a dependency, which would cost a licence entry and a version to track.
 */
export function invariant(condition: unknown, because: string): asserts condition {
  if (!condition) throw new Error(because);
}

/** The same, for a value that should exist — returns it narrowed, so it reads inline. */
export function present<T>(value: T | null | undefined, because: string): T {
  invariant(value != null, because);
  return value;
}
