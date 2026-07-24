import tailwind from 'bun-plugin-tailwind';

// Deploy base: '/' for a root or custom-domain site, '/<repo>/' for a GitHub project page.
// publicPath makes asset URLs absolute (so they load at any route depth); the define feeds
// the same value to the client router (see src/lib/base.ts).
const BASE = '/';

const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  minify: true,
  publicPath: BASE,
  define: { __APP_BASE__: JSON.stringify(BASE) },
  plugins: [tailwind],
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}

// SPA fallback: GitHub Pages serves 404.html for any unmatched path (including nested
// routes like /about/licenses), which boots the app and lets the client router take over.
await Bun.write('dist/404.html', Bun.file('dist/index.html'));
