import { mkdir, readdir, rm } from 'node:fs/promises';

/**
 * Turn a Pomological Watercolor scan into a poster plate.
 *
 *   bun run plates                      redo every plate already committed
 *   bun run plates ny                   redo one region
 *   bun run plates ny POM00003788 …     add plates to a region
 *
 * The scans are 4000px photographs of a mounted sheet: a dark scan border, cream paper, the
 * fruit, and the artist's inscription in the margin. Four stages turn one into an asset, and
 * which tool does which matters — the crop is *found* in a browser, where reading pixels is
 * easy, but *applied* by ffmpeg, whose scaler is what the committed plates were made with.
 * Doing both in canvas resamples differently and produces a different file.
 *
 *   1  bounds   read the sheet, return the crop box in original coordinates
 *   2  stage    ffmpeg crops and scales to a lossless PNG
 *   3  fade     dissolve the paper at the edges, baking alpha into the pixels
 *   4  encode   cwebp
 *
 * The fade is baked rather than applied as an SVG mask because SVG filters have no PDF
 * equivalent: masked plates vanish when the poster is exported and opened in Preview.
 *
 * Originals land in data/raw/plates/ and are **not committed**: unlike the MARS caches, which
 * are behind an API key and could not be refetched, these come from the Internet Archive at a
 * URL built from the accession, so the accession *is* the manifest and 60MB of JPEG would buy
 * nothing. Delete the directory and this rebuilds it.
 *
 * Adding a plate is two steps, deliberately: run this to produce the asset, then describe it in
 * src/lib/plates.ts. What a plate depicts and which town it was painted in are on the sheet in
 * cursive, and no amount of scripting will read them off.
 */

const CACHE_DIR = 'data/raw/plates';
const OUT_DIR = 'src/images/plates';
const WORK_DIR = `${CACHE_DIR}/.work`;

/**
 * The Internet Archive's copy of the collection, where the accession is the filename.
 *
 * Wikimedia Commons mirrors the same NAL scans, but the two hosts re-encode independently and
 * every committed plate came from here. Note `{accession}.jpg` — `_thumb.jpg` is 134px wide.
 */
const BASE = 'https://archive.org/download/usda-pomological-watercolor-collection';

/** Identifying the tool and how to reach whoever runs it, as archives ask. */
const AGENT = {
  'user-agent': 'vertumnus-poster/0.1 (design research; m@perspectivezoom.com)',
  accept: 'image/jpeg,image/*',
};
const POLITE_MS = 1200;
const RETRIES = 4;

/** Below this luminance we are still on the dark mount rather than the paper. */
const DARK = 105;
/** Trim past the mount by this share of the sheet, to clear the shadow it casts. */
const INSET = 0.022;
/**
 * Asset width, set by the largest sheet the poster offers rather than by taste.
 *
 * The whitespace solver gives its biggest plate about a quarter of the poster's width, so on
 * A2 — the largest preset — a plate prints about 4.25in across, and 300dpi over that needs
 * ~1275px. Hence 1300, which also leaves every smaller sheet far past the print target: 466dpi
 * at A3, 641 at Letter.
 *
 * Raising it further has a knee. Each step doubles the file (900px ≈ 50-100KB, 1300 ≈ 100-200KB,
 * 2544 ≈ 400KB+) and there is a hard ceiling anyway — the cropped sheet is about 2500px wide, so
 * anything past that is upscaling. A1 would cost four times this for a sheet almost nobody can
 * print at home, and A0 is out of reach from these scans at all.
 */
const TARGET_W = 1300;
/** How far in from the edge the paper dissolves, as a share of the shorter side. */
const FADE = 0.16;
/**
 * Corner rounding, kept well inside the fade band.
 *
 * Taking the distance to the nearest edge as `min(dx, dy)` puts a crease down each diagonal,
 * where the nearer edge changes — visible as a seam once faded. Rounding removes it, and staying
 * under the band width keeps it reading as a softened corner rather than a curved one.
 */
const CORNER = 0.7;
const WEBP_QUALITY = 78;
const WEBP_ALPHA_QUALITY = 90;

/** Fetch, waiting out a rate limit for as long as the server asks. */
async function polite(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: AGENT });
    if (res.ok) return res;
    if (res.status !== 429 || attempt >= RETRIES) throw new Error(`HTTP ${res.status} for ${url}`);
    const after = Number(res.headers.get('retry-after')) * 1000;
    const wait = Number.isFinite(after) && after > 0 ? after : POLITE_MS * 2 ** (attempt + 2);
    console.log(`  rate limited; waiting ${(wait / 1000).toFixed(0)}s`);
    await Bun.sleep(wait);
  }
}

/** Fetch the original once; it is the slow part and never changes. */
async function original(accession: string): Promise<string> {
  const path = `${CACHE_DIR}/${accession}.jpg`;
  if (await Bun.file(path).exists()) return path;
  await mkdir(CACHE_DIR, { recursive: true });
  const res = await polite(`${BASE}/${accession}.jpg`);
  await Bun.write(path, await res.arrayBuffer());
  await Bun.sleep(POLITE_MS);
  return path;
}

/**
 * Run a page in a browser and hand back whatever it leaves in `window.OUT`.
 *
 * Images are served over http rather than read from disk: a file:// image taints a canvas, and
 * a tainted canvas will not give its pixels back.
 */
async function inBrowser(page: string, serveFrom: string): Promise<string> {
  const server = Bun.serve({
    port: 0, // any free port, so a stray dev server cannot collide
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === '/') return new Response(page, { headers: { 'content-type': 'text/html' } });
      const file = Bun.file(`${serveFrom}${path}`);
      return (await file.exists()) ? new Response(file) : new Response('no', { status: 404 });
    },
  });
  try {
    const view = new Bun.WebView({ width: 700, height: 400 });
    await view.navigate(`http://localhost:${server.port}/`);
    for (let wait = 0; wait < 180; wait++) {
      await Bun.sleep(1000);
      const done = await view.evaluate('window.OUT ? "yes" : "no"');
      if (String(done) === 'yes') break;
    }
    const out = String(await view.evaluate('window.OUT'));
    view.close();
    if (!out || out === 'null') throw new Error('browser stage produced nothing');
    return out;
  } finally {
    server.stop(true);
  }
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Stage 1: find each sheet's paper, walking in from the edges along the mid-lines. */
async function bounds(accessions: string[]): Promise<Map<string, Box>> {
  const page = `<!doctype html><html><body><script>
const ACC=${JSON.stringify(accessions)}, DARK=${DARK}, INSET=${INSET};
window.OUT=null;
(async()=>{
 const boxes={};
 for(const a of ACC){
  const img=new Image(); img.src='/'+a+'.jpg'; await img.decode();
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
  const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0);
  const d=x.getImageData(0,0,img.width,img.height).data;
  const lum=(px,py)=>{const i=(py*img.width+px)*4; return 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];};
  const midY=img.height>>1, midX=img.width>>1;
  let L=0,R=img.width-1,T=0,B=img.height-1;
  while(L<midX && lum(L,midY)<DARK) L++;
  while(R>midX && lum(R,midY)<DARK) R--;
  while(T<midY && lum(midX,T)<DARK) T++;
  while(B>midY && lum(midX,B)<DARK) B--;
  const ix=Math.round((R-L)*INSET), iy=Math.round((B-T)*INSET);
  L+=ix; R-=ix; T+=iy; B-=iy;
  boxes[a]={x:L,y:T,w:R-L+1,h:B-T+1};
 }
 window.OUT=JSON.stringify(boxes);
})();
</script></body></html>`;
  const boxes = JSON.parse(await inBrowser(page, CACHE_DIR)) as Record<string, Box>;
  return new Map(Object.entries(boxes));
}

/** Stage 3: dissolve the paper at the edges of each staged PNG. */
async function fade(accessions: string[]): Promise<Map<string, Uint8Array>> {
  const page = `<!doctype html><html><body><script>
const ACC=${JSON.stringify(accessions)}, FADE=${FADE}, CORNER=${CORNER};
window.OUT=null;
(async()=>{
 const out={};
 for(const a of ACC){
  const img=new Image(); img.src='/'+a+'.png'; await img.decode();
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
  const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0);
  const d=x.getImageData(0,0,c.width,c.height);
  const inset=Math.min(c.width,c.height)*FADE, radius=inset*CORNER;
  for(let py=0;py<c.height;py++){
   for(let px=0;px<c.width;px++){
    const dx=Math.min(px,c.width-1-px), dy=Math.min(py,c.height-1-py);
    const dist=(dx<radius&&dy<radius)?radius-Math.hypot(radius-dx,radius-dy):Math.min(dx,dy);
    const t=Math.max(0,Math.min(1,dist/inset));
    d.data[(py*c.width+px)*4+3]=Math.round(255*(t*t*(3-2*t)));   // smoothstep
   }
  }
  x.putImageData(d,0,0);
  out[a]=c.toDataURL('image/png');
 }
 window.OUT=JSON.stringify(out);
})();
</script></body></html>`;
  const urls = JSON.parse(await inBrowser(page, WORK_DIR)) as Record<string, string>;
  return new Map(
    Object.entries(urls).map(([a, url]) => [
      a,
      Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'),
    ]),
  );
}

/** Every plate already committed, as region → accessions. */
async function committed(): Promise<Map<string, string[]>> {
  const byRegion = new Map<string, string[]>();
  for (const region of await readdir(OUT_DIR)) {
    const files = await readdir(`${OUT_DIR}/${region}`);
    const accessions = files.filter((f) => f.endsWith('.webp')).map((f) => f.replace('.webp', ''));
    if (accessions.length > 0) byRegion.set(region, accessions);
  }
  return byRegion;
}

// A region on its own means "redo that region"; naming accessions adds or replaces them.
const [region, ...named] = Bun.argv.slice(2);
const already = await committed();
const work = region
  ? new Map([[region, named.length > 0 ? named : (already.get(region) ?? [])]])
  : already;
if (region && work.get(region)!.length === 0) {
  console.error(`No plates committed for '${region}' and none named.`);
  console.error('Usage: bun run plates [<region> [<accession>…]]');
  process.exit(1);
}

for (const [into, accessions] of work) {
  console.log(`\n${into}: ${accessions.length} plate(s)`);
  for (const accession of accessions) await original(accession);

  await mkdir(WORK_DIR, { recursive: true });
  const boxes = await bounds(accessions);
  for (const [accession, box] of boxes) {
    // ffmpeg does the crop and the downscale: its scaler is what the committed plates were made
    // with, and canvas resampling of the same box lands on measurably different pixels.
    await Bun.$`ffmpeg -loglevel error -y -i ${`${CACHE_DIR}/${accession}.jpg`} -vf ${`crop=${box.w}:${box.h}:${box.x}:${box.y},scale=${TARGET_W}:-1`} ${`${WORK_DIR}/${accession}.png`}`;
  }

  await mkdir(`${OUT_DIR}/${into}`, { recursive: true });
  for (const [accession, png] of await fade(accessions)) {
    const faded = `${WORK_DIR}/${accession}.faded.png`;
    await Bun.write(faded, png);
    const webp = `${OUT_DIR}/${into}/${accession}.webp`;
    await Bun.$`cwebp -quiet -q ${WEBP_QUALITY} -alpha_q ${WEBP_ALPHA_QUALITY} ${faded} -o ${webp}`;
    const box = boxes.get(accession)!;
    console.log(
      `  ${accession}  crop ${box.w}x${box.h}  ->  ${(Bun.file(webp).size / 1024).toFixed(0)}KB`,
    );
  }
  await rm(WORK_DIR, { recursive: true, force: true });
}
