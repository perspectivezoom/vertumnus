import { Link, NavLink, Outlet } from 'react-router';

/**
 * The sections, in the order they answer a reader's questions: what this is, where it came from,
 * how it was made, what it is built on.
 */
export const SECTIONS = [
  { path: '', label: 'About', blurb: 'Vertumnus overview and section summaries.' },
  {
    path: 'sources',
    label: 'Sources',
    blurb: 'Where the raw data comes from, and the methodology and heuristics used to interpret the data.',
  },
  {
    path: 'ai',
    label: 'AI',
    blurb: 'Write up on how AI was used in this project, including the raw AI conversation transcript.',
  },
  {
    path: 'licenses',
    label: 'Licenses',
    blurb: 'License declaration for typefaces, software, and public-domain artwork.',
  },
] as const;

/**
 * Chrome for the written sections: a way back to the poster, the section nav, and the page.
 *
 * Deliberately not the poster's shell — that one floats a controls banner over everything, which
 * is a poster control and would have nothing to act on here. A row of links rather than a
 * sidebar: four short sections do not earn a column, and a row wraps on a narrow screen instead
 * of needing a second layout.
 */
export function AboutShell() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-baseline gap-x-6 gap-y-2 px-6 py-4">
          <Link
            to="/"
            className="font-poster text-lg font-semibold text-green-900 hover:text-green-700"
          >
            Vertumnus
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SECTIONS.map((section) => (
              <NavLink
                key={section.path}
                to={section.path === '' ? '/about' : `/about/${section.path}`}
                end={section.path === ''}
                className={({ isActive }) =>
                  isActive
                    ? 'text-green-800 underline underline-offset-4'
                    : 'text-neutral-500 hover:text-neutral-900'
                }
              >
                {section.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

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
