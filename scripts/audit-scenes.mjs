// The browser audit of the chart's states: each scene of scripts/audit/scenes.html
// in both themes at a phone, a laptop and a wide screen, with what must hold
// checked in the page (no two price axis tags overlap, a linked grid's legends
// follow the pointer, no errors), a screenshot of each, and a sheet per scene
// to look over. A change to the widget or the engine runs it before its pull
// request: these are the states dialogs and unit tests never show.
//
//   pnpm build
//   pnpm audit:scenes [scene…]          (all scenes when none is named)
//
// Writes .tmp/audit/<scene>-<theme>-<size>.png and .tmp/audit/<scene>.png (the
// sheet); exits 1 when a check fails. Needs Playwright where this script can
// import it (as scripts/record-clips.mjs does), or PLAYWRIGHT=<its index.mjs>.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp/audit');
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');

const SCENES = ['orderAtPrice', 'linkedGrid', 'replay', 'compare', 'renko', 'priceLimits', 'indicators', 'krx'];
const THEMES = ['dark', 'light'];
const SIZES = {
  phone: { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true },
  laptop: { viewport: { width: 1280, height: 800 } },
  wide: { viewport: { width: 1920, height: 1080 } },
};
/** Time for the widget to lay out and draw after its scene is set up. */
const SETTLE_MS = 600;
/** Each screenshot's height on the sheets. */
const SHEET_ROW_HEIGHT = 520;

/** What must hold on every chart of the page; each problem as a sentence. */
function pageChecks() {
  const problems = [...window.stage.errors.map((e) => `error: ${e}`)];
  const charts = window.stage.charts ?? (window.stage.chart ? [window.stage.chart] : []);
  charts.forEach((chart, n) => {
    const engine = chart.engine;
    if (!chart.isAxisLabelsAligned?.() || !engine?.renderCtx) return;
    const spans = engine.axisTagPlan(engine.renderCtx).fixed
      .map((t) => ({ top: t.y - t.half, bottom: t.y + t.half }))
      .sort((a, b) => a.top - b.top);
    for (let i = 1; i < spans.length; i++) {
      // Within half a pixel: the axis draws on whole pixels.
      if (spans[i].top < spans[i - 1].bottom - 0.5) {
        problems.push(`chart ${n}: price axis tags overlap at y ${spans[i].top.toFixed(1)}–${spans[i - 1].bottom.toFixed(1)}`);
      }
    }
  });
  return problems;
}

/** With the pointer on the first chart, every other chart's legend reads the bar its line is on. */
function linkedLegendChecks() {
  return window.stage.charts.slice(1).flatMap((chart, i) =>
    chart.chartLegend.hoverBar ? [] : [`chart ${i + 1}: its legend stays on the latest bar under a linked crosshair`]);
}

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

async function shoot(browser, base, scene, theme, size) {
  const context = await browser.newContext({ ...SIZES[size], deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`error: ${e.message}`));
  await page.goto(`${base}/scripts/audit/scenes.html?scene=${scene}&theme=${theme}`);
  await page.waitForFunction(() => window.stage?.ready, null, { timeout: 30000 });
  await page.waitForTimeout(SETTLE_MS);
  if (scene === 'linkedGrid') {
    const box = await page.evaluate(() => {
      const r = window.stage.chart.container.getBoundingClientRect();
      return { x: r.left + r.width * 0.45, y: r.top + r.height * 0.45 };
    });
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(SETTLE_MS);
    errors.push(...await page.evaluate(linkedLegendChecks));
  }
  errors.push(...await page.evaluate(pageChecks));
  const file = `${scene}-${theme}-${size}.png`;
  await page.screenshot({ path: join(OUT, file) });
  await context.close();
  return { file, problems: errors };
}

/** One sheet per scene: a row per theme, a column per size, to look over at once. */
async function sheet(browser, scene, files) {
  const cell = (f) => `<figure style="margin:0"><img src="${pathToFileURL(join(OUT, f)).href}" style="height:${SHEET_ROW_HEIGHT}px;display:block"><figcaption>${f}</figcaption></figure>`;
  const rows = THEMES.map((theme) => `<div style="display:flex;gap:8px;align-items:flex-start">${files.filter((f) => f.includes(`-${theme}-`)).map(cell).join('')}</div>`);
  const html = `<body style="margin:0;background:#888;display:grid;gap:8px;padding:8px;font:12px sans-serif;width:max-content">${rows.join('')}</body>`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const htmlFile = join(OUT, `${scene}.html`);
  writeFileSync(htmlFile, html);
  await page.goto(pathToFileURL(htmlFile).href);
  await page.screenshot({ path: join(OUT, `${scene}.png`), fullPage: true });
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : SCENES;
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let failed = 0;
try {
  for (const scene of names) {
    const files = [];
    for (const theme of THEMES) {
      for (const size of Object.keys(SIZES)) {
        const { file, problems } = await shoot(browser, base, scene, theme, size);
        files.push(file);
        for (const p of problems) console.log(`FAIL ${file}: ${p}`);
        failed += problems.length;
      }
    }
    await sheet(browser, scene, files);
    console.log(`${scene}: ${files.length} shots, sheet .tmp/audit/${scene}.png`);
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}
