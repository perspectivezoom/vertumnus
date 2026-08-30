import { describe, expect, test } from 'bun:test';

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { AboutIndex } from '@/src/components/about/AboutIndex';
import { Ai } from '@/src/components/about/Ai';
import { Licenses } from '@/src/components/about/Licenses';
import { Sources } from '@/src/components/about/Sources';

/**
 * Every tag a written section names is one the section can render.
 *
 * The sections are Markdown, and a Markdown file cannot import anything: a tag like
 * `<Dependencies />` is matched against the overrides its page passes, by name, at render time.
 * Nothing joins those two halves until a browser opens the page — a typo or a rename type-checks,
 * lints, passes every other test and builds, and the section is simply missing when it ships.
 *
 * React leaves an unmatched tag in the output under the name it was written with, so rendering
 * each section and looking for an element that is not HTML catches the whole class at once,
 * without this test having to know which components any page uses.
 */
const SECTIONS = { AboutIndex, Ai, Licenses, Sources };

/** The opening name of every element in the output — closing tags and comments excluded. */
const ELEMENT = /<([^\s/>!]+)/g;

/** What an element React understood looks like: `p`, `div`, `h2`. Never `Dependencies`. */
const HTML = /^[a-z][a-z0-9]*$/;

describe('written sections render every tag they name', () => {
  for (const [name, Section] of Object.entries(SECTIONS)) {
    test(name, () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <Section />
        </MemoryRouter>,
      );
      const unresolved = [...html.matchAll(ELEMENT)].flatMap(([, tag]) =>
        tag && !HTML.test(tag) ? [tag] : [],
      );
      expect([...new Set(unresolved)]).toEqual([]);
    });
  }
});
