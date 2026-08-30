/**
 * The written sections' shared building blocks.
 *
 * Separate from AboutShell, which is layout and navigation: these are what the writing is made
 * of, and every section reaches for the same three. Keeping them in one place is what stops the
 * pages drifting into slightly different headings and slightly different link colours.
 */

/**
 * A written section, held to a comfortable reading measure.
 *
 * The constraint lives here rather than in the shell so that a section can decline it: prose
 * wants a narrow column, but a transcript or a table wants the page. Anything that is mostly
 * words should reach for this; anything that is mostly data should not.
 */
export function Article({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto flex w-full max-w-[65ch] flex-col gap-6 px-6">{children}</article>
  );
}

/** How the three heading levels look, shared by the components below and by Markdown. */
export const SECTION_TITLE = 'font-poster text-3xl font-bold text-neutral-900';
export const HEADING = 'pt-6 text-xl font-semibold text-neutral-900';
export const SUBHEADING = 'pt-2 text-base font-semibold text-neutral-800';

/** A section's title. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h1 className={SECTION_TITLE}>{children}</h1>;
}

/** A run of prose, at the size and rhythm the sections are written in. */
export function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-neutral-700">
      {children}
    </div>
  );
}

/** A subheading within a section — a region, or a topic that spans them. */
export function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className={HEADING}>{children}</h2>;
}

/**
 * A heading below {@link Heading}, for a topic within one of them.
 *
 * Two regions describe the same things — where the data came from, how a season is drawn out of
 * it, what to distrust — about entirely different sources. Nesting those under the region keeps
 * a reader from having to hold "which source was this paragraph about" in their head.
 */
export function Subheading({ children }: { children: React.ReactNode }) {
  return <h3 className={SUBHEADING}>{children}</h3>;
}

/**
 * A disclosure at the head of a section, set apart from the writing around it.
 */
export function Notice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <aside className="flex flex-col gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-2 text-sm text-neutral-600">{children}</div>
    </aside>
  );
}

/** Worn by any link in prose, so one that stays on the site matches one that leaves it. */
export const LINK_CLASS = 'text-green-700 underline underline-offset-2 hover:text-green-900';

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK_CLASS}>
      {children}
    </a>
  );
}

export const REPO = 'https://github.com/perspectivezoom/vertumnus';

const BRANCH = 'main';

/** Link to a file in the repository. */
export function repoFile(path: string): string {
  return `${REPO}/blob/${BRANCH}/${path}`;
}

/** Link to a directory in the repository. */
export function repoDir(path: string): string {
  return `${REPO}/tree/${BRANCH}/${path}`;
}
