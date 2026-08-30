import { describe, expect, test } from 'bun:test';

import { ID_LENGTH, shortId } from '@/src/components/transcript/selection';

/**
 * A citation carries only the first {@link ID_LENGTH} characters of an exchange id, so two
 * exchanges sharing a prefix would point a published link at the wrong one — silently, since both
 * ids resolve to something that exists. The margin shrinks every time the transcript grows, which
 * is why this is a test rather than a sentence in a comment that was true when it was written.
 *
 * On failure: raise `ID_LENGTH`. Links already published stay valid, since a longer prefix still
 * begins with the shorter one.
 */
describe('cited exchange ids', () => {
  test('are distinct at the length a URL carries', async () => {
    const { exchanges } = await Bun.file('data/transcript/__generated__/transcript.json').json();
    const short = exchanges.map((e: { id: string }) => shortId(e.id));
    expect(new Set(short).size).toBe(exchanges.length);
    expect(short.every((id: string) => id.length === ID_LENGTH)).toBe(true);
  });
});
