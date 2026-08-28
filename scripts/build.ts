import { rm } from 'node:fs/promises';

import tailwind from 'bun-plugin-tailwind';

// Deploy base: '/' for a root or custom-domain site, '/<repo>/' for a GitHub project page.
// publicPath makes asset URLs absolute (so they load at any route depth); the define feeds
// the same value to the client router (see src/App.tsx).
const BASE = '/';

// Chunk and asset names carry a content hash, so a rebuild writes new files beside the old ones
// rather than over them. Left alone the directory only grows, and every stale chunk from every
// past build gets published. Start from nothing so dist is exactly this build's output.
await rm('./dist', { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  minify: true,
  publicPath: BASE,
  define: {
    __APP_BASE__: JSON.stringify(BASE),
    // Without this React bundles its development build: larger, and slower at runtime
    // from the extra validation it does on every render.
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [tailwind],
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}

// The transcript is fetched at runtime rather than imported, so the bundler never sees it: 1.4 MB
// of conversation belongs in nobody's JavaScript, and only the AI section ever asks for it. Copied
// under a fixed name for the same reason — a content hash would leave nothing stable to fetch.
await Bun.write('dist/transcript.json', Bun.file('data/transcript/__generated__/transcript.json'));

// SPA fallback: GitHub Pages serves 404.html for any unmatched path (including nested
// routes like /about/licenses), which boots the app and lets the client router take over.
await Bun.write('dist/404.html', Bun.file('dist/index.html'));
