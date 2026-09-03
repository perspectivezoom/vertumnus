import { Link, NavLink, Outlet } from 'react-router';

import { SECTIONS } from '@/src/lib/routes';

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
        {/* Spans the page. Aligning to the section below would mean knowing how wide it wants to
            be, and that is the section's business — see Article. */}
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 px-6 py-4">
          <Link
            to="/"
            className="font-poster text-lg font-semibold text-green-900 hover:text-green-700"
          >
            vertumnus
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {Object.values(SECTIONS).map((section) => (
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

      {/* No column and no padding: every section brings its own. */}
      <main className="flex w-full flex-col gap-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
