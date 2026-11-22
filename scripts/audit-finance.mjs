// The browser audit of the finance charts: scripts/audit/finance.html draws
// each of the twenty-two and the dashboard, then the states that broke before
// (a step of zero, long labels, flat data, a book of one level, cells with no
// number, nothing to show). In both themes at a phone, a laptop and a wide
// screen, and at the pixel ratios where lines go soft, it checks that every
// canvas keeps to its box, is drawn in its box's own pixels and has something
// on it, that a pointer and a finger get a readout, that each chart gives a
// picture of itself, is the same drawn with no page, and goes into a PDF, and
// that the page has no errors and no sideways scroll. A change to the finance charts runs it before
// its pull request.
//
//   pnpm build
//   pnpm audit:finance
//
// Writes .tmp/audit/finance-<theme>-<size>.png to look over; exits 1 when a
// check fails. Needs Playwright where this script can import it, or
// PLAYWRIGHT=<its index.mjs>, as scripts/audit-scenes.mjs does.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp/audit');
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');

const THEMES = ['dark', 'light'];
const SIZES = {
  phone: { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  laptop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.25 },
  wide: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 },
};
/** Time for the charts to draw after a change. */
const SETTLE_MS = 300;
/** The charts with a readout, and where across them to point (a share of the width). */
const READOUTS = { equity: 0.7, depth: 0.3, waterfall: 0.6, bar: 0.5, 'heatmap-sectors': 0.3, payoff: 0.6, curve: 0.5, 'box-plot': 0.3, radar: 0.5, sunburst: 0.7, 'stacked-area': 0.5, surface: 0.5, 'surface-slices': 0.3, bar3d: 0.45 };
/** The charts that draw nothing but their background, by design. */
const EMPTY = ['empty-waterfall', 'empty-equity', 'empty-depth', 'empty-sunburst', 'empty-radar', 'empty-surface', 'empty-bar3d'];

function serve() {
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' };
  const allowed = [join(ROOT, 'packages'), join(ROOT, 'scripts', 'audit')].map((p) => normalize(p) + sep);
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

/** What must hold of every chart on the page; each problem as a sentence. */
function pageChecks(empty) {
  const problems = [...window.stage.errors.map((e) => `error: ${e}`)];
  const sideways = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  if (sideways > 0) problems.push(`the page scrolls sideways by ${sideways}px`);
  for (const box of document.querySelectorAll('.box, #dashboard div')) {
    const canvas = [...box.children].find((c) => c.tagName === 'CANVAS');
    if (!canvas) continue;
    const name = box.id || 'dashboard chart';
    const b = box.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    if (Math.abs(c.width - b.width) > 0.5 || Math.abs(c.height - b.height) > 0.5) problems.push(`${name}: its canvas is ${c.width}×${c.height} in a box ${b.width}×${b.height}`);
    // Drawn in the screen's own pixels, up to the ratio the charts cap at.
    const ratio = Math.min(devicePixelRatio, 2);
    if (Math.abs(canvas.width / c.width - ratio) > 0.02) problems.push(`${name}: ${canvas.width} pixels across ${c.width}px at a ratio of ${ratio}`);
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const seen = new Set();
    for (let i = 0; i < pixels.length; i += 4 * 37) seen.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`);
    if (!empty.includes(name) && seen.size < 2) problems.push(`${name}: nothing is drawn on it`);
    if (!canvas.getAttribute('aria-label')) problems.push(`${name}: it has no label for screen readers`);
  }
  return problems;
}

/**
 * What must hold of every chart's picture; each problem as a sentence. A
 * picture at twice the pixels is twice the box and has the chart on it; the
 * chart drawn with no page by `renderFinanceChart` is the chart's own
 * picture pixel for pixel, and on an OffscreenCanvas all but the shades of
 * its slanted lines; and all of them make one PDF, a page each.
 */
async function pictureChecks(empty) {
  const problems = [];
  // The share of pixels an OffscreenCanvas may draw a shade apart from a canvas of the page: its slanted lines and curves.
  const OFFSCREEN_SHARE = 0.02;
  const { charts, kinds, lib } = window.stage;
  const pixels = (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const colours = (data) => {
    const seen = new Set();
    for (let i = 0; i < data.length; i += 4 * 37) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return seen.size;
  };
  for (const [name, chart] of Object.entries(charts)) {
    const box = document.getElementById(name);
    const picture = chart.toCanvas({ pixelRatio: 2 });
    if (!picture) {
      problems.push(`${name}: it gives no picture`);
      continue;
    }
    if (picture.width !== box.clientWidth * 2 || picture.height !== box.clientHeight * 2) {
      problems.push(`${name}: its picture at twice the pixels is ${picture.width}×${picture.height} for a box ${box.clientWidth}×${box.clientHeight}`);
    }
    if (!empty.includes(name) && colours(pixels(picture)) < 2) problems.push(`${name}: nothing is on its picture`);
  }
  // A map's logos are on its picture, each in its own colours, and the picture can still be read: a cell too small
  // for its logo draws none.
  const logos = charts['heatmap-logos']?.toCanvas({ pixelRatio: 1 });
  if (!logos) problems.push('heatmap-logos: no picture to look for its logos on');
  else {
    const data = pixels(logos);
    const count = (r, g, b) => {
      let found = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] === r && data[i + 1] === g && data[i + 2] === b) found++;
      return found;
    };
    const LOGO_PIXELS = 40;
    for (const [what, [r, g, b]] of [['the disc of its largest cell', [21, 128, 61]], ['its wide logo', [29, 78, 216]]]) {
      if (count(r, g, b) < LOGO_PIXELS) problems.push(`heatmap-logos: ${what} is not on its picture`);
    }
    if (count(124, 58, 237) > 0) problems.push('heatmap-logos: a cell too small for its logo drew it');
  }
  /** How many pixels of two pictures of one size are not the same. */
  const differing = (a, b) => {
    let count = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) count++;
    }
    return count;
  };
  for (const [name, kind] of Object.entries(kinds)) {
    const chart = charts[name];
    if (!chart) {
      problems.push(`${name}: no chart to draw without a page`);
      continue;
    }
    const own = chart.toCanvas({ pixelRatio: 1 });
    const size = { width: own.width, height: own.height };
    // On a canvas of the page's kind: the same calls, so the same pixels.
    const plain = Object.assign(document.createElement('canvas'), size);
    lib.renderFinanceChart(plain.getContext('2d'), kind, chart.options, size);
    // On a canvas with no page: a worker's kind. The browser draws slanted lines on it a shade apart.
    const free = new OffscreenCanvas(own.width, own.height);
    const ctx = free.getContext('2d');
    lib.renderFinanceChart(ctx, kind, chart.options, size);
    const drawn = ctx.getImageData(0, 0, free.width, free.height).data;
    if (colours(drawn) < 2) problems.push(`${name}: drawn with no page, nothing is on it`);
    // A sparkline has no ground of its own: its picture has one, the page-free drawing has the caller's.
    if (kind === 'sparkline') continue;
    const picture = pixels(own);
    const apart = differing(picture, pixels(plain));
    if (apart > 0) problems.push(`${name}: drawn by renderFinanceChart it differs from its own picture in ${apart} of ${picture.length / 4} pixels`);
    const shades = differing(picture, drawn);
    if (shades > (picture.length / 4) * OFFSCREEN_SHARE) problems.push(`${name}: drawn on an OffscreenCanvas it differs from its own picture in ${shades} of ${picture.length / 4} pixels`);
  }
  const all = Object.values(charts);
  const pdf = await lib.chartsToPdf(all, { title: 'Finance charts' });
  const text = pdf ? new TextDecoder('latin1').decode(await pdf.arrayBuffer()) : '';
  if (!text.startsWith('%PDF-1.4')) problems.push('the charts make no PDF');
  else if (!text.includes(`/Count ${all.length} `)) problems.push(`the PDF of ${all.length} charts has not a page each: ${/\/Count \d+/.exec(text)?.[0]}`);
  return problems;
}

/** How many colours a chart's canvas has: a readout drawn over it adds some. */
function colours(id) {
  const canvas = document.getElementById(id).querySelector('canvas');
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) sum = (sum + pixels[i] * 3 + pixels[i + 1] * 5 + pixels[i + 2] * 7) % 2147483647;
  return sum;
}

async function shoot(browser, base, theme, size) {
  const context = await browser.newContext(SIZES[size]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`error: ${e.message}`));
  await page.goto(`${base}/scripts/audit/finance.html?theme=${theme}`);
  await page.waitForFunction(() => window.stage?.ready, null, { timeout: 30000 });
  await page.waitForTimeout(SETTLE_MS);
  const problems = [...errors, ...(await page.evaluate(pageChecks, EMPTY)), ...(await page.evaluate(pictureChecks, EMPTY))];
  await page.screenshot({ path: join(OUT, `finance-${theme}-${size}.png`), fullPage: true });

  for (const [id, share] of Object.entries(READOUTS)) {
    const box = page.locator(`#${id}`);
    await box.scrollIntoViewIfNeeded();
    const before = await page.evaluate(colours, id);
    const rect = await box.boundingBox();
    // A point may fall in the gap between two cells or two bars: a few near it are tried.
    let read = false;
    for (const nudge of [0, 0.06, 0.12]) {
      const x = rect.x + rect.width * (share + nudge);
      const y = rect.y + rect.height * (0.5 + nudge);
      if (SIZES[size].hasTouch) await page.touchscreen.tap(x, y);
      else await page.mouse.move(x, y);
      await page.waitForTimeout(SETTLE_MS / 3);
      read = (await page.evaluate(colours, id)) !== before;
      if (read) break;
    }
    if (!read) problems.push(`${id}: ${SIZES[size].hasTouch ? 'a tap' : 'the pointer'} gets no readout`);
  }

  // The other theme and a language, given after the start, on every chart.
  await page.evaluate((next) => {
    for (const chart of Object.values(window.stage.charts)) chart.setOptions({ theme: next, locale: 'de-DE' });
  }, theme === 'dark' ? 'light' : 'dark');
  await page.waitForTimeout(SETTLE_MS);
  problems.push(...(await page.evaluate(pageChecks, EMPTY)).map((p) => `after setOptions, ${p}`));
  await context.close();
  return problems;
}

mkdirSync(OUT, { recursive: true });
const server = await serve();
const browser = await chromium.launch();
let failed = 0;
try {
  for (const theme of THEMES) {
    for (const size of Object.keys(SIZES)) {
      const problems = await shoot(browser, `http://127.0.0.1:${server.address().port}`, theme, size);
      failed += problems.length;
      console.log(`${problems.length ? 'FAIL' : 'ok  '} finance ${theme} ${size}`);
      for (const problem of problems) console.log(`       ${problem}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `${failed} problem(s); screenshots in .tmp/audit` : 'finance charts: all checks pass; screenshots in .tmp/audit');
process.exit(failed ? 1 : 0);
