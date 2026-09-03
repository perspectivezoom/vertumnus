import { Link } from 'react-router';

import { AboutMarkdown } from '@/src/components/about/AboutMarkdown';
import { Article, LINK_CLASS, Notice } from '@/src/components/about/Prose';
import source from '@/src/components/about/Sources.md' with { type: 'text' };
import { useTitle } from '@/src/lib/title';
import { SECTIONS } from '@/src/lib/routes';

export function Sources() {
  useTitle(SECTIONS.sources.title);
  return (
    <Article>
      <Notice label="AI usage">
        <p>
          Claude wrote the first pass of the copy on this page, and I rewrote the entire first
          section, with progressively less rewriting further down.
        </p>
        <p>
          See the{' '}
          <Link to="/about/ai" className={LINK_CLASS}>
            AI section
          </Link>{' '}
          for AI usage in general.
        </p>
      </Notice>
      <AboutMarkdown>{source}</AboutMarkdown>
    </Article>
  );
}
