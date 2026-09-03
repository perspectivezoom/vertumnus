import { Link } from 'react-router';

import { AboutMarkdown } from '@/src/components/about/AboutMarkdown';
import source from '@/src/components/about/Licenses.md' with { type: 'text' };
import { Article, ExternalLink, LINK_CLASS, Notice } from '@/src/components/about/Prose';
import { DEPENDENCIES, TYPEFACES } from '@/src/lib/licenses';
import { useTitle } from '@/src/lib/title';
import { SECTIONS } from '@/src/lib/routes';

/**
 * What this project is built from, and on what terms.
 *
 * The prose is a sibling file like the other sections, but two of its lists are not written down
 * anywhere — they are read off the packages actually installed. So the section names them as tags
 * and this file supplies them.
 */
export function Licenses() {
  useTitle(SECTIONS.licenses.title);
  return (
    <Article>
      <Notice label="AI usage">
        <p>
          Claude wrote the first pass of the copy on this page. I subsequently rewrote most of it,
          but probably 25% of the original wording remains.
        </p>
        <p>
          See the{' '}
          <Link to="/about/ai" className={LINK_CLASS}>
            AI section
          </Link>{' '}
          for AI usage in general.
        </p>
      </Notice>
      <AboutMarkdown
        overrides={{
          Typefaces: { component: Typefaces },
          Dependencies: { component: Dependencies },
        }}
      >
        {source}
      </AboutMarkdown>
    </Article>
  );
}

/** Every face the site serves, with the licence text it ships under. */
function Typefaces() {
  return (
    <>
      {TYPEFACES.map((face) => (
        <div key={face.name} className="flex flex-col gap-1">
          <p>
            <ExternalLink href={face.url}>
              <strong className="font-medium">{face.name}</strong>
            </ExternalLink>{' '}
            — {face.role}.
            <br />
            {face.designer}. {face.license}.
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-green-700 hover:text-green-900">
              Read the licence
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded bg-neutral-50 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-neutral-600">
              {face.text}
            </pre>
          </details>
        </div>
      ))}
    </>
  );
}

/** Every package in the build, read from the manifest rather than listed by hand. */
function Dependencies() {
  return (
    <ul className="flex flex-col gap-2">
      {DEPENDENCIES.map((dep) => (
        <li key={dep.name} className="flex flex-wrap items-baseline gap-x-2">
          <ExternalLink href={`https://www.npmjs.com/package/${dep.name}`}>
            <span className="font-medium">{dep.name}</span>
          </ExternalLink>
          <span className="text-xs text-neutral-400 tabular-nums">{dep.version}</span>
          <span className="text-xs text-neutral-400">{dep.license}</span>
          {dep.what && <span className="text-neutral-600">— {dep.what}</span>}
        </li>
      ))}
    </ul>
  );
}
