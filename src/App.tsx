import { lazy, Suspense } from 'react';

import { BrowserRouter, Route, Routes } from 'react-router';

import { PosterShell } from '@/src/components/poster/PosterShell';
import { Poster } from '@/src/components/poster/Poster';

// `__APP_BASE__` is injected at build time (the `define` in scripts/build.ts); in dev
// the guard yields '/'. React Router wants a basename without a trailing slash.
declare const __APP_BASE__: string | undefined;
const basename =
  (typeof __APP_BASE__ === 'undefined' ? '/' : __APP_BASE__).replace(/\/$/, '') || '/';

/**
 * The poster is eager; everything written about it is not.
 *
 * Nearly every visit is a visit to the poster, and the About section is a different errand —
 * prose and a licence dump that a reader printing a chart should not be made to download first.
 * `lazy` puts each behind its own chunk (the bundler needs `splitting: true` for that to mean
 * anything; see scripts/build.ts).
 *
 * The cost is one round trip on the way into a section, paid only by someone who goes there. The
 * poster itself pays nothing: it is the one route still imported directly.
 *
 * Poster and PosterShell stay imported directly: they are what the first paint needs, so
 * deferring them would only add a round trip to the one route that cannot afford it.
 */
const AboutShell = lazy(async () => ({
  default: (await import('@/src/components/about/AboutShell')).AboutShell,
}));
const AboutIndex = lazy(async () => ({
  default: (await import('@/src/components/about/AboutIndex')).AboutIndex,
}));
const Ai = lazy(async () => ({ default: (await import('@/src/components/about/Ai')).Ai }));
const Licenses = lazy(async () => ({
  default: (await import('@/src/components/about/Licenses')).Licenses,
}));
const Sources = lazy(async () => ({
  default: (await import('@/src/components/about/Sources')).Sources,
}));

export function App() {
  return (
    <BrowserRouter basename={basename}>
      {/* Nothing to show while a section arrives: these are same-origin chunks off a CDN, and a
          spinner that appears and vanishes inside 100ms reads as a flicker rather than progress. */}
      <Suspense fallback={null}>
        <Routes>
          {/* Before the region route: ":region" would otherwise swallow "/about". */}
          <Route path="about" element={<AboutShell />}>
            <Route index element={<AboutIndex />} />
            <Route path="sources" element={<Sources />} />
            <Route path="ai" element={<Ai />} />
            <Route path="licenses" element={<Licenses />} />
          </Route>
          <Route element={<PosterShell />}>
            <Route index element={<Poster />} />
            <Route path=":region" element={<Poster />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
