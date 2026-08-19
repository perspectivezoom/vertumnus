import { Link } from 'react-router';

import { SECTIONS, Section } from '@/src/components/about/AboutShell';

/** The landing section: what the poster is, then a way into each of the others. */
export function AboutIndex() {
  return (
    <Section title="About">
      <p>
        Vertumnus is a tool to create customized printable posters of what is in season at local farmers&rsquo; markets.
      </p>
      <p>
        Named for the{' '}
        <a
          className="text-green-700 underline underline-offset-2 hover:text-green-900"
          href="https://en.wikipedia.org/wiki/Vertumnus"
          target="_blank"
          rel="noreferrer"
        >
          Roman god of seasons, change and plant growth
        </a>
        .
      </p>

      <dl className="flex flex-col gap-5 pt-2">
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
            <dd className="text-neutral-600">{section.blurb}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
