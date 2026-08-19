/**
 * The written sections' shared building blocks.
 *
 * Separate from AboutShell, which is layout and navigation: these are what the writing is made
 * of, and every section reaches for the same three. Keeping them in one place is what stops the
 * pages drifting into slightly different headings and slightly different link colours.
 */

/** A section's heading and body, at a measure that stays readable. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="flex max-w-[65ch] flex-col gap-6">
      <h1 className="font-poster text-3xl font-bold text-neutral-900">{title}</h1>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-neutral-700">
        {children}
      </div>
    </article>
  );
}

/** A subheading within a section. */
export function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-lg font-semibold text-neutral-900">{children}</h2>;
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
