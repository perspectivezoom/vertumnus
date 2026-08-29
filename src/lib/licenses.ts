import { type ShippedDependency, SHIPPED } from '@/src/lib/__generated__/dependencies';
import notoSerifOfl from '@/src/fonts/OFL-notoserif.txt';
import playfairOfl from '@/src/fonts/OFL-playfair.txt';

/**
 * What the site is built from, and the notices that have to travel with it.
 *
 * The font licences are imported rather than linked: the SIL Open Font License asks that a copy
 * of the licence accompany the font software, and this site serves the `.woff2` files. A link to
 * someone else's copy would not be that.
 */
export interface Typeface {
  name: string;
  /** Where it came from, so a reader can see the family this site only serves a subset of. */
  url: string;
  role: string;
  /**
   * The person who drew it, not the copyright holder.
   *
   * The licence names "The Noto Project Authors" and "The Playfair Display Project Authors",
   * which is boilerplate rather than credit — the copyright line is already in the licence text
   * below each entry, and repeating it would tell a reader nothing.
   */
  designer: string;
  license: string;
  text: string;
}

export const TYPEFACES: readonly Typeface[] = [
  {
    name: 'Noto Serif',
    url: 'https://fonts.google.com/specimen/Noto+Serif',
    role: 'Everything but the headline',
    designer: 'Steve Matteson, for Google and Monotype’s Noto project',
    license: 'SIL Open Font License 1.1',
    text: notoSerifOfl,
  },
  {
    name: 'Playfair Display',
    url: 'https://fonts.google.com/specimen/Playfair+Display',
    role: 'The poster headline',
    designer: 'Claus Eggers Sørensen',
    license: 'SIL Open Font License 1.1',
    text: playfairOfl,
  },
];

/**
 * What each shipped library is for, in the order a reader would care about them.
 *
 * The only part of a dependency that cannot be derived: names, versions and licences come from
 * the packages themselves via `bun run dependencies`, and duplicating those here would be a
 * second copy that goes stale without anything noticing. A package missing from this map still
 * appears on the page, just without an explanation — better an unexplained entry than a silently
 * omitted one, on a page whose whole job is completeness.
 */
const PURPOSE: Record<string, string> = {
  react: 'The interface',
  'react-dom': 'Rendering it to a page',
  'react-router': 'Regions and sections as URLs',
  'd3-shape': 'The curves the ribbons are drawn with',
  zod: 'Checking region data and URL options',
  motion: 'The controls panel opening and closing',
  'lucide-react': 'Icons',
  'markdown-to-jsx': 'Rendering the session transcript',
};

const ORDER = Object.keys(PURPOSE);

export interface Dependency extends ShippedDependency {
  what: string | null;
}

/** The shipped packages, described where we have a description, in a deliberate reading order. */
export const DEPENDENCIES: readonly Dependency[] = [...SHIPPED]
  .sort((a, b) => {
    const rank = (name: string) => {
      const i = ORDER.indexOf(name);
      return i === -1 ? ORDER.length : i;
    };
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
  })
  .map((dep) => ({ ...dep, what: PURPOSE[dep.name] ?? null }));
