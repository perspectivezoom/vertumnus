/**
 * Draws the wordmark's initial as the site icon.
 *
 * A browser renders it rather than a font library converting it: the letter has to be the same
 * Noto Serif the wordmark is set in, and the one tool here that already knows how to draw that is
 * the one that draws the site. An SVG would scale better, but writing the glyph as a path needs
 * font tooling this project does not carry, and `font-family: serif` inside an icon resolves to
 * whatever serif the reader's system has rather than to ours.
 *
 * The letter is placed by measuring its ink rather than its line box. A lowercase `v` has neither
 * ascender nor descender, so a line box centred in the tile leaves it small and sitting low.
 *
 * Run with `bun run favicon` after changing the mark; the output is committed.
 */
/** The wordmark's initial, as set in the banner and the section header. */
const LETTER = 'v';

const SIZE = 512;
const OUT = 'src/icons/favicon.png';
const FONT = 'src/fonts/noto-serif-latin.woff2';

/** How much of the tile the letter's ink fills, leaving the rest as margin. */
const FILL = 0.66;

/** green-900, the colour the wordmark is set in, on the paper the site is printed on. */
const INK = '#14532d';
const PAPER = '#ffffff';

const page = `<!doctype html>
<style>
  @font-face { font-family: 'Noto Serif'; src: url('/font.woff2') format('woff2'); font-weight: 100 900; }
  html, body { margin: 0; }
</style>
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script>
  window.ICON = (async () => {
    await document.fonts.load('600 100px "Noto Serif"');
    const ctx = document.getElementById('c').getContext('2d');
    const face = (size) => \`600 \${size}px "Noto Serif"\`;
    const ink = (size) => {
      ctx.font = face(size);
      const m = ctx.measureText(${JSON.stringify(LETTER)});
      return {
        w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
        h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
        left: m.actualBoundingBoxLeft, ascent: m.actualBoundingBoxAscent,
      };
    };
    const probe = ink(100);
    const size = (100 * ${SIZE} * ${FILL}) / Math.max(probe.w, probe.h);
    const box = ink(size);
    ctx.fillStyle = ${JSON.stringify(PAPER)};
    ctx.fillRect(0, 0, ${SIZE}, ${SIZE});
    ctx.fillStyle = ${JSON.stringify(INK)};
    ctx.fillText(${JSON.stringify(LETTER)},
      (${SIZE} - box.w) / 2 + box.left,
      (${SIZE} - box.h) / 2 + box.ascent);
    return document.getElementById('c').toDataURL('image/png');
  })();
</script>`;

const server = Bun.serve({
  port: 0,
  fetch: (request) =>
    new URL(request.url).pathname === '/font.woff2'
      ? new Response(Bun.file(FONT))
      : new Response(page, { headers: { 'content-type': 'text/html' } }),
});

try {
  const view = new Bun.WebView({ width: SIZE, height: SIZE });
  await view.navigate(server.url.href);
  // The canvas is drawn from a promise, so poll for it rather than guessing how long a font takes.
  let url = '';
  for (let wait = 0; wait < 40 && !url.startsWith('data:image/png'); wait++) {
    await Bun.sleep(250);
    url = String(await view.evaluate('window.ICON ? window.ICON.then(u => u) : ""'));
  }
  if (!url.startsWith('data:image/png')) throw new Error('the icon never finished drawing');
  await Bun.write(OUT, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  view.close();
} finally {
  server.stop(true);
}

const bytes = await Bun.file(OUT).arrayBuffer();
const header = new DataView(bytes);
console.log(
  `${OUT}: ${header.getUint32(16)}×${header.getUint32(20)}, ${(bytes.byteLength / 1024).toFixed(1)} KB`,
);

// Top-level await needs this file to be a module, and it imports nothing.
export {};
