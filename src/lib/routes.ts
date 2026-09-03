import { defaultRegion, regions } from '@/data/regions';

/**
 * Every page the site has, and what to say about it.
 *
 * One list, read by three things that would otherwise each keep their own: the navigation, the
 * title a section sets, and the per-route files the build writes for crawlers. A crawler runs no
 * JavaScript, so what `useTitle` sets never reaches it — the build has to write the words into
 * the file it serves, and this is where it gets them.
 *
 * No React here on purpose: `scripts/build.ts` imports it, and a build script has no business
 * pulling in a component.
 */

/** The written sections. Order is the order they answer a reader's questions. */
export const Section = {
  About: 'about',
  Sources: 'sources',
  Ai: 'ai',
  Transcript: 'transcript',
  Licenses: 'licenses',
} as const;

export type Section = (typeof Section)[keyof typeof Section];

/** What a written section is called, in each of the places it is named. */
export interface Page {
  /** Under `/about`; empty for the section that is `/about` itself. */
  path: string;
  /** In the navigation. */
  label: string;
  /** In the browser tab, already set the way it should read. */
  title: string;
  /**
   * One sentence about the page.
   *
   * Two jobs, because they turned out to be the same job: the summary under each link on the
   * About page, and the description a search result or an unfurled link shows.
   */
  blurb: string;
}

export const SECTIONS: Record<Section, Page> = {
  about: {
    path: '',
    label: 'About',
    title: 'about',
    blurb: 'Vertumnus overview and section summaries.',
  },
  sources: {
    path: 'sources',
    label: 'Sources',
    title: 'sources',
    blurb:
      'Where the raw data comes from, and the methodology and heuristics used to interpret the data.',
  },
  ai: {
    path: 'ai',
    label: 'AI usage',
    title: 'ai usage',
    blurb: 'Write up on how AI was used in this project, and thoughts on coding with AI in 2026.',
  },
  transcript: {
    path: 'transcript',
    label: 'AI transcript',
    title: 'ai transcript',
    blurb:
      'The ~700 prompt AI conversation that built this project. Searchable, and grouped by chronological chapters and work items.',
  },
  licenses: {
    path: 'licenses',
    label: 'Licenses',
    title: 'licenses',
    blurb: 'License declaration for typefaces, software, and public-domain artwork.',
  },
};

/** A page worth its own file: where it is, what it is called, and one sentence about it. */
export interface Route {
  path: string;
  title: string;
  description: string;
  /** The card an unfurled link shows, as an absolute path. */
  image: string;
}

/** Where a region's sharing card is written. Named for the region, since each shows its own. */
export const cardFor = (regionId: string): string => `/og-${regionId}.png`;

/**
 * Every route, regions first.
 *
 * A region gets its own card and a sentence built from its name — they are a family, alike by
 * construction, and writing five near-identical sentences would only invite them to drift. The
 * sections are individuals and say their own piece, and they share the default region's card:
 * a photograph of prose is illegible at the size a feed draws it, where the poster is the site.
 */
export const ROUTES: Route[] = [
  ...regions.map((region) => ({
    path: region.id === defaultRegion.id ? '/' : `/${region.id}`,
    title: region.pageTitle,
    description: `A printable poster of what is in season at ${region.name} farmers' markets, week by week.`,
    image: cardFor(region.id),
  })),
  ...Object.values(SECTIONS).map((section) => ({
    path: section.path ? `/about/${section.path}` : '/about',
    title: section.title,
    description: section.blurb,
    image: cardFor(defaultRegion.id),
  })),
];
