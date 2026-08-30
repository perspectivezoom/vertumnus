/**
 * A written section, authored as Markdown and rendered with this site's own prose components.
 *
 * Deliberately not shared with the transcript's renderer, which reads the same library with the
 * opposite intent: that one is displaying model output, so it renders headings as paragraphs and
 * treats everything as untrusted. These pages are written by hand, so a heading is a heading and
 * the file is allowed to say what it means.
 *
 * What it will not do is let the writer choose a component. A link's behaviour follows from its
 * href — see {@link Anchor} — so prose stays prose, and there is one way to write a link.
 */
import Markdown from 'markdown-to-jsx';
import { Link } from 'react-router';

import {
  Body,
  ExternalLink,
  HEADING,
  LINK_CLASS,
  SECTION_TITLE,
  SUBHEADING,
  repoDir,
  repoFile,
} from '@/src/components/about/Prose';

export function AboutMarkdown({ children }: { children: string }) {
  return <Markdown options={OPTIONS}>{children}</Markdown>;
}

/**
 * What a link does, decided by where it points.
 *
 * Four kinds, and the writer names none of them. `repo:` is the one invention: writing the full
 * GitHub URL in prose would copy the repository name and branch into every file that cites a
 * source, and they would all rot together the day either changes.
 */
function Anchor({ href = '', children }: { href?: string; children?: React.ReactNode }) {
  if (href.startsWith(REPO_SCHEME)) {
    const path = href.slice(REPO_SCHEME.length);
    // A trailing slash means a directory, the way it does everywhere else.
    const url = path.endsWith('/') ? repoDir(path.slice(0, -1)) : repoFile(path);
    return <ExternalLink href={url}>{children}</ExternalLink>;
  }
  if (/^[a-z]+:/.test(href)) return <ExternalLink href={href}>{children}</ExternalLink>;
  // Left to the browser: an anchor within the page this link is already on.
  if (href.startsWith('#')) {
    return (
      <a href={href} className={LINK_CLASS}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={LINK_CLASS}>
      {children}
    </Link>
  );
}

const REPO_SCHEME = 'repo:';

const OPTIONS = {
  // The section's prose wrapper *is* the wrapper, so paragraphs are its direct children and the
  // rhythm between them comes from one `gap` rather than a margin on each.
  wrapper: Body,
  forceWrapper: true,
  // Off, as in the transcript, though for a duller reason: nothing here needs raw HTML, and a
  // page that never parses it cannot be the page that regrets parsing it.
  disableParsingRawHTML: true,
  overrides: {
    h1: { props: { className: SECTION_TITLE } },
    h2: { props: { className: HEADING } },
    h3: { props: { className: SUBHEADING } },
    a: { component: Anchor },
    ul: { props: { className: 'flex list-disc flex-col gap-3 pl-5' } },
    ol: { props: { className: 'flex list-decimal flex-col gap-3 pl-5' } },
    strong: { props: { className: 'font-medium text-neutral-900' } },
    hr: { props: { className: 'border-neutral-300' } },
    code: { props: { className: 'rounded bg-neutral-100 px-1 py-0.5 text-[13px]' } },
  },
};
