/**
 * Render the sharing card — the image a link to this site unfurls as.
 *
 * The poster itself, photographed from the built site rather than drawn separately, so the card
 * can never show something the site does not. Same reasoning as the favicon: the one tool here
 * that knows how to draw a poster is the one that draws the site.
 *
 * Needs `bun run build` first — it serves `dist/` exactly as Pages will, so what is captured is
 * what a visitor arriving from the link would see.
 *
 * Run with `bun run og`; the output is committed.
 */
const OUT = 'src/images/og.png';

/** What every platform crops toward: 1.91:1, the size Open Graph documents. */
const WIDTH = 1200;
const HEIGHT = 630;

if (!(await Bun.file('dist/index.html').exists())) {
  console.error('dist/ is empty — run `bun run build` first.');
  process.exit(1);
}

const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    for (const candidate of [`dist${path}`, `dist${path}/index.html`]) {
      const file = Bun.file(candidate);
      if (await file.exists()) return new Response(file);
    }
    return new Response(Bun.file('dist/404.html'), { status: 404 });
  },
});

try {
  // Half size: the screenshot comes back at the display's pixel ratio, which is 2 here, so this
  // lands on exactly WIDTH×HEIGHT. Asking for the full size gave a 2400px card weighing a
  // megabyte, for a picture nothing shows above about 600px wide.
  const view = new Bun.WebView({ width: WIDTH / 2, height: HEIGHT / 2 });
  // The banner is dismissed: the card is the artifact, not the controls for making one.
  await view.navigate(`${server.url.origin}/?hideBanner=1`);
  // Long enough for the fonts and the watercolour plates to arrive; a card is worth the wait.
  await Bun.sleep(6000);
  // A portrait poster in a landscape card is mostly margin, so it is set to the card's width and
  // hung from the top: the masthead and the first crops fill the frame, which is what survives
  // being shown at the size a feed shows it. The buttons go — they are for making a poster, and
  // this is a picture of one.
  await view.evaluate(`(() => {
    document.querySelectorAll('button').forEach((b) => b.remove());
    const main = document.querySelector('main');
    main.style.cssText = 'display:block;padding:0;min-height:0;overflow:hidden';
    document.querySelector('svg[viewBox]').style.cssText = 'display:block;width:100%;height:auto;box-shadow:none';
  })()`);
  await Bun.sleep(400);
  await Bun.write(OUT, await view.screenshot());
  view.close();
} finally {
  server.stop(true);
}

const bytes = await Bun.file(OUT).arrayBuffer();
const header = new DataView(bytes);
console.log(
  `${OUT}: ${header.getUint32(16)}×${header.getUint32(20)}, ${(bytes.byteLength / 1024).toFixed(0)} KB`,
);

export {};
