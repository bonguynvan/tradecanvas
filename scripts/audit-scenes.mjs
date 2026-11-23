// The browser audit of the chart's states: each scene of scripts/audit/scenes.html
// in both themes at a phone, a laptop and a wide screen, with what must hold
// checked in the page (no two price axis tags overlap, a linked grid's legends
// follow the pointer, every control takes a finger's press on the phone and a
// pointer's on the others, and a finger's again on a tablet with no picture
// taken, no errors), a screenshot of each, and a sheet per scene
// to look over. A change to the widget or the engine runs it before its pull
// request: these are the states dialogs and unit tests never show.
//
//   pnpm build
//   pnpm audit:scenes [scene…]          (all scenes when none is named)
//   UI=desk pnpm audit:scenes …         (the widgets in that look; Modern without it)
//
// Writes .tmp/audit/<scene>-<theme>-<size>.png and .tmp/audit/<scene>.png (the
// sheet), named <scene>-<ui> in place of <scene> with UI; exits 1 when a check
// fails. Needs Playwright where this script can import it (as
// scripts/record-clips.mjs does), or PLAYWRIGHT=<its index.mjs>.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp/audit');
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');

const UI = process.env.UI ?? '';
if (UI && !/^[a-z]+$/.test(UI)) throw new Error(`UI must be a look's name, not ${UI}`);
// The widgets' language, to see its strings fit: `WIDGET_LOCALE=vi` (English without it).
const WIDGET_LOCALE = process.env.WIDGET_LOCALE ?? '';
if (WIDGET_LOCALE && !/^[a-zA-Z-]+$/.test(WIDGET_LOCALE)) throw new Error(`WIDGET_LOCALE must be a language tag, not ${WIDGET_LOCALE}`);
const SCENES = ['orderAtPrice', 'linkedGrid', 'gridPicture', 'replay', 'replayDepth', 'depth', 'compare', 'renko', 'priceLimits', 'indicators', 'ichimoku', 'krx', 'paneDrawings', 'selectedDrawing', 'selectedPaneDrawing', 'manyPanes', 'marks', 'historyDaily', 'historyHourly', 'positions', 'watchlistOwnRow', 'dockPage', 'positionAddStops', 'levelDrag', 'partFill', 'stopLimit', 'orderFlowDelta', 'footprint', 'tape', 'sidebarMenus', 'favoritesBar', 'symbolSearch', 'paneMillions', 'hiddenCandles', 'fractals', 'bracketQuantity', 'noPage', 'paperLook'];
const THEMES = ['dark', 'light'];
const SIZES = {
  phone: { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true },
  laptop: { viewport: { width: 1280, height: 800 } },
  wide: { viewport: { width: 1920, height: 1080 } },
};
/** A tablet under a finger: wider than the widget's phone layout, so its bars and tools are a desk's. */
const TABLET = { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true };
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
    // However many panes are open, the price pane keeps a third of the chart at least.
    const plot = chart.getPlotRect?.();
    const panes = (chart.getIndicatorPanes?.() ?? []).reduce((sum, p) => sum + p.rect.height, 0);
    if (plot && plot.height < (plot.height + panes) / 3) problems.push(`chart ${n}: the price pane is ${Math.round(plot.height)} px of ${Math.round(plot.height + panes)}`);
    if (!chart.isAxisLabelsAligned?.() || !engine?.renderCtx) return;
    // A selected drawing's span labels are left out: like the crosshair's price, they sit at
    // their exact price and may lie over a tag (scenes selectedDrawing, selectedPaneDrawing).
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

/** The least a control of the widget takes of a press, each way (px): under a finger, and under a mouse's pointer. */
const HIT_AREA = { finger: 32, pointer: 20 };
/** Controls left under the least, by class, each with why. */
const HIT_AREA_KEPT = {
  finger: {
    'tcw-sidebar-menu-btn': 'a tool\'s corner, which opens its menu: any larger and it takes the press of the tool itself, whose middle it would reach',
  },
  pointer: {
    'tcw-sidebar-menu-btn': 'a tool\'s corner, which opens its menu: any larger and it lies over the tool\'s own drawing; a right click of the tool, or its arrow keys, open the same menu',
  },
};

/**
 * Every control of the widget a press can reach that takes less than `least` px of it across or down
 * its middle, each as a sentence. What a press lands on is asked of the page point by point: a
 * control's own box says nothing of a hit area made wider than its drawing, nor of a neighbour
 * lying over its edge.
 */
function hitAreaChecks({ least, kept }) {
  const CONTROLS = 'button, [role=button], [role=tab], [role=radio], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=switch], [role=checkbox], [role=option], a[href], input, select, summary';
  /** No further than this from a control's middle is looked at: far more than the least. */
  const REACH = 120;
  /** Kept in the page and out of sight: in a box of a pixel that clips it (a legend row's buttons, until the row shows them). */
  const clippedAway = (el) => {
    for (let box = el.parentElement; box; box = box.parentElement) {
      const b = box.getBoundingClientRect();
      if (b.width > 1.5 && b.height > 1.5) continue;
      const style = getComputedStyle(box);
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible' || style.clipPath !== 'none') return true;
    }
    return false;
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.pointerEvents !== 'none' && Number(style.opacity) > 0.05 && !clippedAway(el);
  };
  /** Cut by a list that scrolls (its last row, half in view): no size to hold it to. */
  const cut = (el, r) => {
    for (let box = el.parentElement; box; box = box.parentElement) {
      const style = getComputedStyle(box);
      const b = box.getBoundingClientRect();
      const scrolls = (overflow, content, room) => (overflow === 'auto' || overflow === 'scroll') && content > room + 1;
      if (scrolls(style.overflowX, box.scrollWidth, box.clientWidth) && (r.left < b.left - 0.5 || r.right > b.right + 0.5)) return true;
      if (scrolls(style.overflowY, box.scrollHeight, box.clientHeight) && (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5)) return true;
    }
    return false;
  };
  /** The control a press at a point is for: the one there, or the one its label is for. */
  const owner = (x, y) => {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
    const hit = document.elementFromPoint(x, y);
    return hit ? hit.closest(CONTROLS) ?? hit.closest('label')?.control ?? null : null;
  };
  /** How many points each way from its middle are the control's, along one line. */
  const run = (el, cx, cy, dx, dy) => {
    let before = 0;
    let after = 0;
    while (before < REACH && owner(cx - dx * (before + 1), cy - dy * (before + 1)) === el) before++;
    while (after < REACH && owner(cx + dx * (after + 1), cy + dy * (after + 1)) === el) after++;
    return [before, after];
  };
  /** What a press at a point lands on, and whether it is drawn there or only reaches there (a hit area made wider than its drawing). */
  const taker = (x, y) => {
    const el = x < 0 || y < 0 || x >= innerWidth || y >= innerHeight ? null : document.elementFromPoint(x, y);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { el, drawn: x >= b.left && x < b.right && y >= b.top && y < b.bottom };
  };
  /** Whether what holds the control cuts it off at a point of its own drawing (a row no wider than its pane). */
  const cutOffAt = (el, r, x, y) => {
    for (let box = el.parentElement; box; box = box.parentElement) {
      const b = box.getBoundingClientRect();
      // Not what clips it: it lies outside this one altogether (a layer of no size that menus open from).
      if (b.right <= r.left || b.left >= r.right || b.bottom <= r.top || b.top >= r.bottom) continue;
      const style = getComputedStyle(box);
      if (style.overflowX !== 'visible' && (x < b.left || x >= b.right)) return true;
      if (style.overflowY !== 'visible' && (y < b.top || y >= b.bottom)) return true;
    }
    return false;
  };
  const nameOf = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const problems = new Set();
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (!el.closest('[class^="tcw-"], [class*=" tcw-"]') || el.disabled || !shown(el)) continue;
    const r = el.getBoundingClientRect();
    if (cut(el, r)) continue;
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const cls = [...el.classList].find((c) => c.startsWith('tcw-')) ?? el.tagName.toLowerCase();
    if (owner(cx, cy) !== el) {
      // Its middle is not its own. Under what is drawn there (a menu over a bar), or off the
      // screen: nothing a press reaches as it stands. Under what only reaches there, from beside
      // it: its press is taken from it.
      const over = taker(cx, cy);
      if (over && !over.drawn) problems.add(`"${nameOf(el)}" (.${cls}) has its middle under the press of "${nameOf(over.el)}"`);
      continue;
    }
    const [left, right] = run(el, cx, cy, 1, 0);
    const [up, below] = run(el, cx, cy, 0, 1);
    const across = left + right + 1;
    const down = up + below + 1;
    if (across >= least && down >= least) continue;
    if ([...el.classList].some((c) => kept[c])) continue;
    const size = `"${nameOf(el)}" (.${cls}) takes ${across} × ${down} px of a press, under ${least}`;
    // Where a short run ends short of the control's own edge, something else has the press there.
    const ends = [
      ...(across < least ? [[cx - left - 1, cy], [cx + right + 1, cy]] : []),
      ...(down < least ? [[cx, cy - up - 1], [cx, cy + below + 1]] : []),
    ].filter(([x, y]) => x >= r.left && x < r.right && y >= r.top && y < r.bottom);
    if (ends.some(([x, y]) => cutOffAt(el, r, x, y))) {
      problems.add(`${size}: what holds it cuts it off`);
      continue;
    }
    const over = ends.map(([x, y]) => taker(x, y)).filter(Boolean);
    const reaching = over.find((o) => !o.drawn);
    if (reaching) {
      problems.add(`${size}: "${nameOf(reaching.el)}" reaches over it`);
      continue;
    }
    // Partly under what is drawn over it (a legend row a finger opened across its pane, a menu):
    // no size of its own to hold it to, as it stands.
    if (over.length) continue;
    problems.add(size);
  }
  return [...problems];
}

/** Where the indicator legend is pressed to show a row's buttons: its first row over the plot, and its first in a pane. */
function legendRowPoints() {
  const rows = [document.querySelector('.tcw-ind-legend-row:not(.tcw-ind-legend-row--pane)'), document.querySelector('.tcw-ind-legend-row--pane')];
  return rows.flatMap((row) => {
    const r = row?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? [{ x: r.left + Math.min(16, r.width / 2), y: r.top + r.height / 2 }] : [];
  });
}

/**
 * What a press takes of every control on the page as it stands, then with a legend row's buttons
 * showing: under the pointer, or once a finger opened the row. Each control under the least, as a sentence.
 */
async function pressChecks(page, touch) {
  const hit = { least: touch ? HIT_AREA.finger : HIT_AREA.pointer, kept: touch ? HIT_AREA_KEPT.finger : HIT_AREA_KEPT.pointer };
  const small = new Set(await page.evaluate(hitAreaChecks, hit));
  for (const row of await page.evaluate(legendRowPoints)) {
    if (touch) await page.touchscreen.tap(row.x, row.y);
    else await page.mouse.move(row.x, row.y);
    await page.waitForTimeout(SETTLE_MS);
    for (const problem of await page.evaluate(hitAreaChecks, hit)) small.add(problem);
  }
  return [...small];
}

/** A scene's address in one theme. */
function sceneUrl(base, scene, theme) {
  return `${base}/scripts/audit/scenes.html?scene=${scene}&theme=${theme}${UI ? `&ui=${UI}` : ''}${WIDGET_LOCALE ? `&locale=${WIDGET_LOCALE}` : ''}`;
}

/**
 * A scene on a tablet under a finger, where the widget is laid out as on a desk: what a press
 * takes of its controls, and nothing else. No picture: the laptop's shows the same layout.
 */
async function pressOnTablet(browser, base, scene) {
  const context = await browser.newContext({ ...TABLET, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(sceneUrl(base, scene, THEMES[0]));
  await page.waitForFunction(() => window.stage?.ready, null, { timeout: 30000 });
  await page.waitForTimeout(SETTLE_MS);
  const problems = await pressChecks(page, true);
  await context.close();
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

/** A scene's files, named for the look when one is set. */
const sheetName = (scene) => (UI ? `${scene}-${UI}` : scene);

async function shoot(browser, base, scene, theme, size) {
  const context = await browser.newContext({ ...SIZES[size], deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`error: ${e.message}`));
  await page.goto(sceneUrl(base, scene, theme));
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
  // A scene's own checks, where it has some.
  errors.push(...await page.evaluate(() => window.stage.checks?.() ?? []));
  const file = `${sheetName(scene)}-${theme}-${size}.png`;
  await page.screenshot({ path: join(OUT, file) });
  // After the picture, which is of the chart left alone: the check opens a legend row.
  errors.push(...await pressChecks(page, SIZES[size].hasTouch === true));
  await context.close();
  return { file, problems: errors };
}

/** One sheet per scene: a row per theme, a column per size, to look over at once. */
async function sheet(browser, scene, files) {
  const cell = (f) => `<figure style="margin:0"><img src="${pathToFileURL(join(OUT, f)).href}" style="height:${SHEET_ROW_HEIGHT}px;display:block"><figcaption>${f}</figcaption></figure>`;
  const rows = THEMES.map((theme) => `<div style="display:flex;gap:8px;align-items:flex-start">${files.filter((f) => f.includes(`-${theme}-`)).map(cell).join('')}</div>`);
  const html = `<body style="margin:0;background:#888;display:grid;gap:8px;padding:8px;font:12px sans-serif;width:max-content">${rows.join('')}</body>`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const htmlFile = join(OUT, `${sheetName(scene)}.html`);
  writeFileSync(htmlFile, html);
  await page.goto(pathToFileURL(htmlFile).href);
  await page.screenshot({ path: join(OUT, `${sheetName(scene)}.png`), fullPage: true });
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
    const onTablet = await pressOnTablet(browser, base, scene);
    for (const p of onTablet) console.log(`FAIL ${sheetName(scene)} on a tablet under a finger: ${p}`);
    failed += onTablet.length;
    await sheet(browser, scene, files);
    console.log(`${scene}: ${files.length} shots, sheet .tmp/audit/${sheetName(scene)}.png`);
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}
