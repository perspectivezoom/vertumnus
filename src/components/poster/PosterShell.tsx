import { Outlet } from 'react-router';

import { Banner } from '@/src/components/poster/Banner';

/**
 * Chrome for the poster routes: the page surface with the floating controls over it.
 *
 * Counterpart to AboutShell — the two differ in exactly the way their pages do. This one is a
 * surface for a single artifact and puts controls on top of it; that one is a reading layout
 * with navigation above it.
 */
export function PosterShell() {
  return (
    // Centred because the poster is capped by viewport height, so what it does not use would
    // otherwise all pool below it. `dvh` tracks a phone's growing and shrinking browser chrome.
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 p-6">
      <Outlet />
      <Banner />
    </main>
  );
}
