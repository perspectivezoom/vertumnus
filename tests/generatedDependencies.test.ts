import { describe, expect, test } from 'bun:test';

import { OUTPUT, renderDependencies } from '@/scripts/dependencies';

describe('generated dependency list', () => {
  test('matches what the packages currently say', async () => {
    // The licences page is only as honest as this file. Regenerating and comparing means a
    // dependency added, removed or upgraded without rerunning the script fails here rather than
    // shipping a page that quietly misdescribes what the site is made of.
    const committed = await Bun.file(OUTPUT).text();
    expect(await renderDependencies()).toBe(committed);
  });
});
