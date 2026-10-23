// Records the README clips: each scene of scripts/clips/stage.html played in
// headless Chromium with a scripted mouse, then cut and encoded by ffmpeg as
// an animated WebP (GitHub and npm show it; it is a fraction of a GIF's size).
// With `--web <dir>`, the same recording also becomes an MP4 and a poster for
// a web page, where video plays lighter and sharper than an animated image.
//
//   pnpm build
//   node scripts/record-clips.mjs [scene…] [--web <dir>]   (all scenes when none is named)
//
// Needs Playwright where this script can import it: installed next to the repo
// (outside the lockfile), or named by PLAYWRIGHT=<path to its index.mjs>, since
// an ES module never finds a global install. Its Chromium, or CHROMIUM=<an
// executable on disk>. And ffmpeg built with the libwebp_anim encoder.
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.github/assets/clips');
const TMP = join(ROOT, '.tmp/clips');

const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');

/** Frames a second of the encoded clips. */
const FPS = 15;
/**
 * Encoded widths: the hero spans the README, the others sit two to a row (the
 * page is recorded larger and scaled down, which keeps text crisp).
 */
const WIDTHS = { hero: 960, phone: 300 };
const GALLERY_WIDTH = 640;
/** Web video widths: room for a high-density screen at the size a page shows them. */
const WEB_WIDTHS = { phone: 390 };
const WEB_WIDTH = 960;
/** H.264 quality for the web videos (lower is better and larger); UI on a dark ground holds up at this. */
const WEB_CRF = 27;
/** Where in a clip its poster comes from: past the middle, where each scene shows what it is about. */
const POSTER_AT = 0.65;
const DESKTOP = { width: 1200, height: 675 };
const PHONE = { width: 390, height: 760 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** One step of a gesture: about a frame at 60 Hz. */
const FRAME_MS = 16;

/** Where the mouse is, per page: Playwright moves it but does not say where it went. */
const mice = new WeakMap();

/** Moves the mouse to `to` over `ms`, eased, a step a frame, as a hand would. */
async function glide(page, to, ms = 600) {
  const from = mice.get(page) ?? { x: to.x, y: to.y };
  const steps = Math.max(2, Math.round(ms / FRAME_MS));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
    await wait(FRAME_MS);
  }
  mice.set(page, to);
}

/** A press and release where the mouse is, with the beat a click takes. */
async function click(page) {
  await page.mouse.down();
  await wait(90);
  await page.mouse.up();
}

/** A finger dragged from `from` to `to` over `ms` (real touch events, through the DevTools protocol). */
async function swipe(page, from, to, ms = 700) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  await touch('touchStart', from);
  const steps = Math.max(2, Math.round(ms / FRAME_MS));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await touch('touchMove', { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    await wait(FRAME_MS);
  }
  await touch('touchEnd');
  await cdp.detach();
}

/** Where the bar `back` bars from the end, and a price `rel` above its close, sit on the page. */
const spot = (page, back, rel = 0) => page.evaluate(([b, r]) => {
  const bars = window.stage.chart.getData();
  const i = bars.length - 1 - b;
  return window.stage.at(i, bars[i].close * (1 + r));
}, [back, rel]);

/** Each scene: its viewport, and what happens on screen. */
const SCENES = {
  async hero(page) {
    await glide(page, await spot(page, 70, 0.002), 500);
    await glide(page, await spot(page, 20, 0.001), 900);
    await page.evaluate(() => window.stage.chart.setDrawingTool('trendLine'));
    const a = await spot(page, 60, -0.004);
    const b = await spot(page, 12, -0.001);
    await glide(page, a, 500);
    await click(page);
    await glide(page, b, 900);
    await click(page);
    await wait(400);
    await glide(page, await spot(page, 30, 0.006), 700);
    await wait(1200);
  },
  async trading(page) {
    const tp = await page.evaluate(() => window.stage.at(window.stage.chart.getData().length - 1, window.stage.entry * 1.006));
    await glide(page, { x: tp.x - 160, y: tp.y + 40 }, 500);
    await glide(page, { x: tp.x - 120, y: tp.y }, 400);
    await page.mouse.down();
    await glide(page, { x: tp.x - 120, y: tp.y - 70 }, 1100);
    await page.mouse.up();
    await wait(600);
    const sl = await page.evaluate(() => window.stage.at(window.stage.chart.getData().length - 1, window.stage.entry * 0.994));
    await glide(page, { x: sl.x - 120, y: sl.y }, 700);
    await page.mouse.down();
    await glide(page, { x: sl.x - 120, y: sl.y - 30 }, 700);
    await page.mouse.up();
    await wait(1400);
  },
  async replay(page) {
    await page.evaluate(() => {
      const { widget, chart } = window.stage;
      widget.replayFrom(chart.getData().length - 140, false);
      chart.setReplaySpeed(8);
    });
    await wait(700);
    await page.evaluate(() => window.stage.chart.replayResume());
    await glide(page, await spot(page, 40, 0.003), 1500);
    await wait(3200);
  },
  async grid(page) {
    const box = await page.evaluate(() => {
      const r = window.stage.chart.container.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    await glide(page, { x: box.x + box.w * 0.3, y: box.y + box.h * 0.45 }, 500);
    await glide(page, { x: box.x + box.w * 0.85, y: box.y + box.h * 0.35 }, 2200);
    await glide(page, { x: box.x + box.w * 0.55, y: box.y + box.h * 0.6 }, 1600);
    await wait(800);
  },
  async looks(page) {
    const steps = [['terminal', 'dark'], ['capsule', 'light'], ['studio', 'light'], ['studio', 'dark']];
    await wait(900);
    for (const [ui, theme] of steps) {
      await page.evaluate(([u, t]) => { window.stage.widget.setUI(u); window.stage.widget.setTheme(t); }, [ui, theme]);
      await wait(1300);
    }
  },
  async phone(page) {
    await wait(800);
    // A finger pans back through the history, then draws a line by press, drag and lift.
    // A phone shows few bars, so the pan is placed by the chart's own box.
    const box = await page.evaluate(() => {
      const r = window.stage.chart.container.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    const row = box.y + box.h * 0.4;
    await swipe(page, { x: box.x + box.w * 0.25, y: row }, { x: box.x + box.w * 0.75, y: row }, 900);
    await wait(600);
    await swipe(page, { x: box.x + box.w * 0.7, y: row }, { x: box.x + box.w * 0.3, y: row }, 900);
    await wait(500);
    await page.evaluate(() => window.stage.chart.setDrawingTool('trendLine'));
    await swipe(page, await spot(page, 14, -0.003), await spot(page, 3, -0.001), 1000);
    await wait(1800);
  },
};

function serve() {
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' };
  const allowed = [join(ROOT, 'packages'), join(ROOT, 'scripts', 'clips')].map((p) => normalize(p) + sep);
  const server = createServer((req, res) => {
    try {
      const file = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!allowed.some((dir) => file.startsWith(dir)) || !statSync(file).isFile()) throw new Error('not served');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function record(browser, base, name) {
  const size = name === 'phone' ? PHONE : DESKTOP;
  const dir = join(TMP, name);
  rmSync(dir, { recursive: true, force: true });
  const touch = name === 'phone' ? { isMobile: true, hasTouch: true } : {};
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, ...touch, recordVideo: { dir, size } });
  // The video starts with the page, so the clip's times count from here.
  const opened = Date.now();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/scripts/clips/stage.html?scene=${name}`);
  await page.waitForFunction(() => window.stage?.ready, null, { timeout: 30000 });
  await wait(600);
  const start = (Date.now() - opened) / 1000;
  await SCENES[name](page);
  const end = (Date.now() - opened) / 1000;
  await context.close();
  if (errors.length) throw new Error(`${name}: ${errors.join('; ')}`);
  const video = readdirSync(dir).find((f) => f.endsWith('.webm'));
  if (!video) throw new Error(`${name}: Playwright wrote no video to ${dir}`);
  return { webm: join(dir, video), start, end, size };
}

function encode(name, { webm, start, end, size }) {
  const width = Math.min(WIDTHS[name] ?? GALLERY_WIDTH, size.width);
  const out = join(OUT, `${name}.webp`);
  const tmp = `${out}.tmp.webp`;
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-ss', start.toFixed(2), '-to', end.toFixed(2), '-i', webm,
    '-vf', `fps=${FPS},scale=${width}:-2:flags=lanczos`,
    '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', '72', '-compression_level', '6', '-loop', '0', tmp,
  ]);
  renameSync(tmp, out);
  return { out, kb: Math.round(statSync(out).size / 1024) };
}

/** The MP4 (no sound, playable while it loads) and the poster of a scene, in `dir`. */
function encodeWeb(dir, name, { webm, start, end, size }) {
  const width = Math.min(WEB_WIDTHS[name] ?? WEB_WIDTH, size.width);
  const scale = `scale=${width}:-2:flags=lanczos`;
  const mp4 = join(dir, `${name}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-ss', start.toFixed(2), '-to', end.toFixed(2), '-i', webm,
    '-vf', scale, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(WEB_CRF),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', mp4,
  ]);
  const poster = join(dir, `${name}.webp`);
  const at = start + (end - start) * POSTER_AT;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', at.toFixed(2), '-i', webm, '-frames:v', '1', '-vf', scale, '-c:v', 'libwebp', '-quality', '82', poster]);
  return { kb: Math.round((statSync(mp4).size + statSync(poster).size) / 1024) };
}

/** `--web <dir>` or `--web=<dir>`, and the scene names around it. */
function readArgs(argv) {
  const args = [...argv];
  const at = args.findIndex((a) => a === '--web' || a.startsWith('--web='));
  if (at < 0) return { names: args, webDir: null };
  const inline = args[at].startsWith('--web=');
  const dir = inline ? args[at].slice('--web='.length) : args[at + 1];
  if (!dir) throw new Error('--web needs a directory');
  args.splice(at, inline ? 1 : 2);
  return { names: args, webDir: resolve(dir) };
}

const { names: named, webDir } = readArgs(process.argv.slice(2));
const names = named.length ? named : Object.keys(SCENES);
const unknown = names.filter((n) => !SCENES[n]);
if (unknown.length) throw new Error(`no such scene: ${unknown.join(', ')}`);
mkdirSync(OUT, { recursive: true });
if (webDir) mkdirSync(webDir, { recursive: true });
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  for (const name of names) {
    const recording = await record(browser, base, name);
    const { out, kb } = encode(name, recording);
    const web = webDir ? `, web ${encodeWeb(webDir, name, recording).kb} KB` : '';
    console.log(`${name}: ${out.slice(ROOT.length + 1)} (${kb} KB${web})`);
  }
} finally {
  await browser.close();
  server.close();
}
