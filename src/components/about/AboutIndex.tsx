import { Link } from 'react-router';

import { SECTIONS } from '@/src/components/about/AboutShell';
import source from '@/src/components/about/AboutIndex.md' with { type: 'text' };
import { AboutMarkdown } from '@/src/components/about/AboutMarkdown';
import { Article, Notice, LINK_CLASS } from '@/src/components/about/Prose';

/**
 * The landing section: what the poster is, then a way into each of the others.
 *
 * The prose is a sibling file; the list below it is not, because it is derived from the sections
 * that exist rather than written down twice.
 */
export function AboutIndex() {
  return (
    <Article>
      <Notice label="AI usage">
        <p>
          The copy on this page was handwritten from scratch, with the exception of the initial
          section descriptions.
        </p>
        <p>
          See the{' '}
          <Link to="/about/ai" className={LINK_CLASS}>
            AI section
          </Link>{' '}
          for AI usage in general.
        </p>
      </Notice>
      <AboutMarkdown overrides={{ Sections: { component: Sections } }}>{source}</AboutMarkdown>
    </Article>
  );
}

function Sections() {
  return (
    <dl className="flex flex-col gap-2">
      {SECTIONS.filter((section) => section.path !== '').map((section) => (
        <div key={section.path} className="flex flex-col gap-1">
          <dt>
            <Link
              to={`/about/${section.path}`}
              className="font-medium text-green-800 underline underline-offset-2 hover:text-green-900"
            >
              {section.label}
            </Link>
          </dt>
          <dd className="text-[15px] text-neutral-600">{section.blurb}</dd>
        </div>
      ))}
    </dl>
  );
}
