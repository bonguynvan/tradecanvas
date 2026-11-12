// The browser audit of the finance charts: scripts/audit/finance.html draws
// each of the fourteen and the dashboard, then the states that broke before
// (a step of zero, long labels, flat data, a book of one level, cells with no
// number, nothing to show). In both themes at a phone, a laptop and a wide
// screen, and at the pixel ratios where lines go soft, it checks that every
// canvas keeps to its box, is drawn in its box's own pixels and has something
// on it, that a pointer and a finger get a readout, and that the page has no
// errors and no sideways scroll. A change to the finance charts runs it before
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
const READOUTS = { equity: 0.7, depth: 0.3, waterfall: 0.6, bar: 0.5, 'heatmap-sectors': 0.3 };
/** The charts that draw nothing but their background, by design. */
const EMPTY = ['empty-waterfall', 'empty-equity', 'empty-depth'];

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
  const problems = [...errors, ...(await page.evaluate(pageChecks, EMPTY))];
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
