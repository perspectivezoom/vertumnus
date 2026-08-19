import { BrowserRouter, Route, Routes } from 'react-router';

import { AboutIndex } from '@/src/components/about/AboutIndex';
import { AboutShell } from '@/src/components/about/AboutShell';
import { Ai } from '@/src/components/about/Ai';
import { Licenses } from '@/src/components/about/Licenses';
import { Sources } from '@/src/components/about/Sources';
import { AppShell } from '@/src/components/AppShell';
import { Poster } from '@/src/components/Poster';
import { useRegion } from '@/src/lib/params';

// `__APP_BASE__` is injected at build time (the `define` in scripts/build.ts); in dev
// the guard yields '/'. React Router wants a basename without a trailing slash.
declare const __APP_BASE__: string | undefined;
const basename =
  (typeof __APP_BASE__ === 'undefined' ? '/' : __APP_BASE__).replace(/\/$/, '') || '/';

/** Binds the `:region` path segment to a poster; the only glue this file needs to own. */
function RegionView() {
  return <Poster region={useRegion()} />;
}

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        {/* Before the region route: ":region" would otherwise swallow "/about". */}
        <Route path="about" element={<AboutShell />}>
          <Route index element={<AboutIndex />} />
          <Route path="sources" element={<Sources />} />
          <Route path="ai" element={<Ai />} />
          <Route path="licenses" element={<Licenses />} />
        </Route>
        <Route element={<AppShell />}>
          <Route index element={<RegionView />} />
          <Route path=":region" element={<RegionView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
