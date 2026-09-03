import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';

import tailwind from 'bun-plugin-tailwind';

import { regions } from '@/data/regions';
import { cardFor, type Route, ROUTES } from '@/src/lib/routes';

// Deploy base: '/' for a root or custom-domain site, '/<repo>/' for a GitHub project page.
// publicPath makes asset URLs absolute (so they load at any route depth); the define feeds
// the same value to the client router (see src/App.tsx).
const BASE = '/';

/**
 * The domain the site answers on, emitted into the build as a `CNAME` file.
 *
 * Pages takes the custom domain from the published artifact as well as from the repository
 * settings, and a deploy that omits it can drop the domain back to the default. Cheap insurance,
 * and it keeps the fact in the repository rather than only in a settings page nobody diffs.
 */
const DOMAIN = 'vertumnus.fyi';

/** The site's own name, and the sentence the shell carries before a route replaces it. */
const SITE = 'vertumnus';
const DEFAULT_DESCRIPTION =
  "Printable posters of what's in season at your local farmers' market. Produce data is specific to your region, with week-level granularity.";

// Chunk and asset names carry a content hash, so a rebuild writes new files beside the old ones
// rather than over them. Left alone the directory only grows, and every stale chunk from every
// past build gets published. Start from nothing so dist is exactly this build's output.
await rm('./dist', { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  minify: true,
  publicPath: BASE,
  // Emit a chunk per dynamic import rather than one bundle. The poster is what people arrive
  // for; the written sections and the session browser are a different visit, and the browser in
  // particular carries a Markdown renderer and fetches a transcript measured in megabytes. Without this the
  // routes are eagerly imported and all of that rides along with the poster. See src/App.tsx,
  // which is where the boundaries are actually drawn — this flag only lets them exist.
  splitting: true,
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

/**
 * Tell the browser about the chunks the first paint needs, so it fetches them at once.
 *
 * Splitting hoists whatever the eager poster and the lazy sections share — react-router, mostly —
 * into its own chunk. The entry then has to be parsed before that import is even discovered, which
 * put a second round trip in front of the poster: the one route that was supposed to pay nothing.
 *
 * Bun's build result reports what it wrote but not how the pieces refer to each other, so the
 * graph is recovered from the output. Read back with the transpiler rather than a regex: the
 * question is whether an import is static or dynamic, which is a fact about the syntax and not
 * about the spelling, and `scanImports` answers it directly.
 */
const scanner = new Bun.Transpiler({ loader: 'js' });

/**
 * The file inside dist that a bundled URL names.
 *
 * Every emitted specifier is prefixed with `publicPath`, which is where the site will be served
 * from and no part of the filename — on a project page they all read `/<repo>/chunk-….js` while
 * dist stays a flat directory.
 */
const distFile = (url: string): string =>
  url.startsWith(BASE) ? url.slice(BASE.length) : url.replace(/^\//, '');

function preloadable(entry: string): string[] {
  const found = new Set<string>();
  const visit = (file: string) => {
    for (const { kind, path } of scanner.scanImports(readFileSync(`dist/${file}`, 'utf8'))) {
      // The distinction this whole function turns on. A static import is something the module
      // cannot run without; a dynamic one is a lazy route, and must stay undiscovered until
      // somebody navigates to it.
      if (kind !== 'import-statement') continue;
      const chunk = distFile(path);
      if (found.has(chunk)) continue;
      found.add(chunk);
      visit(chunk);
    }
  };
  visit(entry);
  return [...found];
}

const html = await Bun.file('dist/index.html').text();
const entrySrc = /<script[^>]+src="([^"]+\.js)"/.exec(html)?.[1];
if (!entrySrc) throw new Error('No entry script in dist/index.html — cannot emit preloads.');

const preloads = preloadable(distFile(entrySrc))
  .map((chunk) => `<link rel="modulepreload" href="${BASE}${chunk}">`)
  .join('');
await Bun.write('dist/index.html', html.replace('</head>', `${preloads}</head>`));

await Bun.write('dist/CNAME', `${DOMAIN}\n`);

// Copied rather than imported: a sharing card is named in a `<meta>` tag by absolute URL, and the
// bundler only rewrites the references it understands — so these have to keep their names.
for (const region of regions) {
  await Bun.write(`dist${cardFor(region.id)}`, Bun.file(`src/images${cardFor(region.id)}`));
}

/**
 * Write a copy of the shell for every route, with that route's words in its head.
 *
 * Not server rendering: the body stays `<div id="root"></div>` and the app boots and draws the
 * page exactly as it does today. What changes is that Pages finds a file and answers 200 instead
 * of falling back to 404.html — a crawler indexes a 200 and skips a 404 — and that each file can
 * carry its own title, description and card, which the app cannot do because a crawler runs none
 * of it.
 *
 * Every substitution is checked. A silent miss would publish the wrong description on every page,
 * and nothing downstream would notice.
 */
const shell = readFileSync('dist/index.html', 'utf8');

function pageFor(route: Route): string {
  const swap = (html: string, from: string, to: string): string => {
    if (!html.includes(from))
      throw new Error(`pre-render: the shell has no ${JSON.stringify(from)}`);
    return html.replace(from, to);
  };
  let html = swap(shell, '<title>vertumnus</title>', `<title>${route.title} · ${SITE}</title>`);
  html = swap(html, `content="https://${DOMAIN}/"`, `content="https://${DOMAIN}${route.path}"`);
  html = swap(
    html,
    `content="https://${DOMAIN}/og-sfbay.png"`,
    `content="https://${DOMAIN}${route.image}"`,
  );
  // Both the plain description and og:description carry the same sentence, so both are replaced.
  while (html.includes(DEFAULT_DESCRIPTION))
    html = html.replace(DEFAULT_DESCRIPTION, route.description);
  return html;
}

for (const route of ROUTES) {
  // '/' is index.html, already written by the bundler with the site-level words.
  if (route.path === '/') continue;
  await Bun.write(`dist${route.path}/index.html`, pageFor(route));
}
console.log(`pre-rendered ${ROUTES.length - 1} routes beside index.html`);

// SPA fallback: GitHub Pages serves 404.html for any unmatched path (including nested
// routes like /about/licenses), which boots the app and lets the client router take over.
await Bun.write('dist/404.html', Bun.file('dist/index.html'));
