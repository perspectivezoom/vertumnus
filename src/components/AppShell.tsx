import { Outlet } from 'react-router';

import { Banner } from '@/src/components/Banner';

/**
 * Chrome for the poster routes: the page surface with the floating controls over it.
 *
 * Counterpart to AboutShell — the two differ in exactly the way their pages do. This one is a
 * surface for a single artifact and puts controls on top of it; that one is a reading layout
 * with navigation above it.
 */
export function AppShell() {
  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <Outlet />
      <Banner />
    </main>
  );
}
