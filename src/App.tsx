import { BrowserRouter, Outlet, Route, Routes } from 'react-router';

import { Banner } from '@/src/components/Banner';
import { Poster } from '@/src/components/Poster';
import { useRegion } from '@/src/lib/params';

// `__APP_BASE__` is injected at build time (the `define` in scripts/build.ts); in dev
// the guard yields '/'. React Router wants a basename without a trailing slash.
declare const __APP_BASE__: string | undefined;
const basename =
  (typeof __APP_BASE__ === 'undefined' ? '/' : __APP_BASE__).replace(/\/$/, '') || '/';

/** Shell shared by every route: the page surface plus the floating controls banner. */
function AppShell() {
  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <Outlet />
      <Banner />
    </main>
  );
}

/** The poster for the region named in the path (the default region at "/"). */
function RegionView() {
  return <Poster region={useRegion()} />;
}

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<RegionView />} />
          <Route path=":region" element={<RegionView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
