// Rendering benchmark: the chart in headless Chrome on the machine's own GPU,
// panned for 150 frames per scene, at one or more device pixel ratios.
//
//   pnpm build && node scripts/bench-render.mjs [--dpr=1,2] [--only=S6,S11] [--renderer=webgl] [--json]
//   node scripts/bench-render.mjs --shot=S6 [--dpr=2] [--out=s6.png]   a screenshot of one scene
//     (saved to the system temp folder unless --out says where)
//
// Per scene it prints:
//   scene    the time to record and rasterise one full scene (a pixel read forces the raster)
//   frame    the average time between frames while panning (16.7 ms = 60 fps), and the p95
//   dropped  frames slower than 20 ms, out of 150
// Needs Node 22+ (global WebSocket) and Chrome; CHROME_PATH picks the binary.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v = 'true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const DPRS = (args.dpr ?? '1,2').split(',').map(Number);
const RENDERER = args.renderer ?? 'canvas';
const ONLY = args.shot ? null : args.only ? args.only.split(',') : null;

const CHROME = process.env.CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));
if (!CHROME || !existsSync(CHROME)) throw new Error(`Chrome not found${CHROME ? ` at ${CHROME}` : ''}: set CHROME_PATH`);
if (typeof WebSocket === 'undefined') throw new Error('Node 22+ needed (global WebSocket)');

// The scenes. `visible` bars in view, or `zoomOut` to the furthest the chart allows.
const SCENES = [
  { id: 'S1', label: 'candles, 150 visible', visible: 150 },
  { id: 'S2', label: 'candles, 500 visible', visible: 500 },
  { id: 'S3', label: 'candles, 2,000 visible', visible: 2000 },
  { id: 'S4', label: 'candles, zoomed out on 200k', n: 200_000, zoomOut: true },
  { id: 'S5', label: 'candles 500 + 4 indicators', visible: 500, indicators: ['bb', 'ema', 'rsi', 'macd'] },
  { id: 'S6', label: 'zoomed out on 200k + 4 indicators', n: 200_000, zoomOut: true, indicators: ['bb', 'ema', 'rsi', 'macd'] },
  { id: 'S7', label: 'candles 500 + 10 indicators', visible: 500, indicators: ['bb', 'ema', 'sma', 'vwap', 'ichimoku', 'rsi', 'macd', 'stochastic', 'atr', 'obv'] },
  { id: 'S8', label: 'line, zoomed out on 200k', n: 200_000, zoomOut: true, type: 'line' },
  { id: 'S9', label: 'area, zoomed out on 200k', n: 200_000, zoomOut: true, type: 'area' },
  { id: 'S10', label: 'grid of 6 charts x 500 + 2 indicators', count: 6, w: 620, h: 420, visible: 500, indicators: ['ema', 'rsi'] },
  { id: 'S11', label: '2560x1400, 2,000 visible + 4 indicators', w: 2560, h: 1400, visible: 2000, indicators: ['bb', 'ema', 'rsi', 'macd'] },
  { id: 'S12', label: '2560x1400, 2,000 visible, candles only', w: 2560, h: 1400, visible: 2000 },
  { id: 'S13', label: 'zoomed out on 1,000,000 + 4 indicators', n: 1_000_000, zoomOut: true, indicators: ['bb', 'ema', 'rsi', 'macd'] },
  { id: 'S14', label: 'depth heatmap, 240 snapshots x 80 levels', visible: 240, heatmap: true },
  // One indicator at a time on the heaviest view, to see which costs what.
  { id: 'S6a', label: 'zoomed out on 200k + Bollinger', n: 200_000, zoomOut: true, indicators: ['bb'], extra: true },
  { id: 'S6b', label: 'zoomed out on 200k + EMA', n: 200_000, zoomOut: true, indicators: ['ema'], extra: true },
  { id: 'S6c', label: 'zoomed out on 200k + RSI', n: 200_000, zoomOut: true, indicators: ['rsi'], extra: true },
  { id: 'S6d', label: 'zoomed out on 200k + MACD', n: 200_000, zoomOut: true, indicators: ['macd'], extra: true },
].filter((s) => (args.shot ? s.id === args.shot : ONLY ? ONLY.includes(s.id) : !s.extra));
if (SCENES.length === 0) throw new Error(`No scene called ${args.shot ?? args.only}`);
if (!existsSync(join(ROOT, 'packages/library/dist/index.js'))) throw new Error('No build: run pnpm build first');

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"@tradecanvas/core":"/packages/core/dist/index.js","@tradecanvas/commons":"/packages/commons/dist/index.js"}}</script>
<style>body{margin:0;background:#0b0e13} #grid{display:grid;gap:4px}</style></head><body><div id="grid"></div>
<script type="module">
import { Chart } from '/packages/library/dist/index.js';
const SCENES = ${JSON.stringify(SCENES)};
const RENDERER = ${JSON.stringify(RENDERER)};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function bars(n, step = 60_000) {
  let s = 12345; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let p = 30_000; const t0 = Date.UTC(2020, 0, 1); const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = p; p = Math.max(100, p * (1 + (rand() - 0.5) * 0.004 + Math.sin(i / 500) * 0.0004));
    out[i] = { time: t0 + i * step, open: o, high: Math.max(o, p) * (1 + rand() * 0.002), low: Math.min(o, p) * (1 - rand() * 0.002), close: p, volume: 100 + rand() * 1000 };
  }
  return out;
}
/** An order book around \`price\`: \`levels\` levels each side, sizes rising toward a few walls. */
function depthAround(price, levels, seed) {
  let s = seed; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const step = price * 0.0004;
  const side = (dir) => Array.from({ length: levels }, (_, i) => ({ price: price + dir * (i + 1) * step, volume: 5 + rand() * 40 + (i % 17 === 0 ? 300 : 0) }));
  return { bids: side(-1), asks: side(1) };
}
/** A depth snapshot at each of the last \`count\` bars, as a live feed would have pushed them. */
function feedHeatmap(chart, data, count) {
  chart.setDepthHeatmapVisible(true);
  chart.setDepthHeatmapConfig({ capacity: count });
  for (let i = Math.max(0, data.length - count); i < data.length; i++) chart.pushDepthSnapshot(depthAround(data[i].close, 40, i + 1), data[i].time);
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
async function run(sc) {
  const grid = document.getElementById('grid');
  grid.replaceChildren();
  const count = sc.count ?? 1, w = sc.w ?? 1600, h = sc.h ?? 900, n = sc.n ?? 5000;
  grid.style.gridTemplateColumns = 'repeat(' + (count === 1 ? 1 : count <= 4 ? 2 : 3) + ', ' + w + 'px)';
  const data = bars(n);
  const charts = Array.from({ length: count }, () => {
    const host = document.createElement('div');
    host.style.width = w + 'px'; host.style.height = h + 'px';
    grid.appendChild(host);
    const c = new Chart(host, { theme: 'dark', chartType: sc.type ?? 'candlestick', features: { volume: true }, renderer: RENDERER });
    c.setData(data);
    for (const id of sc.indicators ?? []) c.addIndicator(id, {});
    if (sc.heatmap) feedHeatmap(c, data, sc.visible);
    if (sc.zoomOut) c.fitContent(); else c.setVisibleRange(data[n - sc.visible].time, data[n - 1].time);
    return c;
  });
  // WebGL loads on demand: wait for it before measuring.
  if (RENDERER !== 'canvas') for (let i = 0; i < 100 && charts.some((c) => c.getRenderer() !== 'webgl'); i++) await sleep(50);
  await sleep(400);
  // Frames first: reading pixels back later can move a canvas off the GPU.
  const frames = []; let last = 0;
  await new Promise((done) => { let k = 0; const step = (ts) => {
    if (last) frames.push(ts - last); last = ts;
    for (const c of charts) c.scrollBars(k % 40 < 20 ? 2 : -2);
    if (++k < 150) requestAnimationFrame(step); else done();
  }; requestAnimationFrame(step); });
  const eng = charts[0].engine;
  const gpu = eng.getGpu();
  let t = performance.now();
  for (let i = 0; i < 30; i++) {
    eng.renderScene(eng.sceneLayer, eng.renderCtx);
    eng.sceneLayer.ctx.getImageData(0, 0, 1, 1);
    // Wait for the GPU too: a one-pixel read of its canvas.
    if (gpu) { const gl = gpu.canvas.getContext('webgl2'); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
  }
  const scene = (performance.now() - t) / 30;
  const drawnWith = charts[0].getRenderer();
  for (const c of charts) c.destroy();
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  return { id: sc.id, label: sc.label, renderer: drawnWith, sceneMs: +scene.toFixed(2), frameMs: +avg.toFixed(1), p95Ms: +pct(frames, 0.95).toFixed(1), dropped: frames.filter((f) => f > 20).length };
}
async function show(sc) {
  const grid = document.getElementById('grid');
  const count = sc.count ?? 1, w = sc.w ?? 1600, h = sc.h ?? 900, n = sc.n ?? 5000;
  grid.style.gridTemplateColumns = 'repeat(' + (count === 1 ? 1 : count <= 4 ? 2 : 3) + ', ' + w + 'px)';
  const data = bars(n);
  for (let k = 0; k < count; k++) {
    const host = document.createElement('div');
    host.style.width = w + 'px'; host.style.height = h + 'px';
    grid.appendChild(host);
    const c = new Chart(host, { theme: 'dark', chartType: sc.type ?? 'candlestick', features: { volume: true }, renderer: RENDERER });
    window.lastChart = c;
    c.setData(data);
    for (const id of sc.indicators ?? []) c.addIndicator(id, {});
    if (sc.heatmap) feedHeatmap(c, data, sc.visible);
    if (sc.zoomOut) c.fitContent(); else c.setVisibleRange(data[n - sc.visible].time, data[n - 1].time);
    if (RENDERER !== 'canvas') for (let i = 0; i < 100 && c.getRenderer() !== 'webgl'; i++) await sleep(50);
  }
  await sleep(800);
  const box = grid.getBoundingClientRect();
  window.result = [{ w: Math.ceil(box.width), h: Math.ceil(box.height), renderer: window.lastChart?.getRenderer() }];
}
const shot = new URLSearchParams(location.search).get('shot');
if (shot) await show(SCENES.find((s) => s.id === shot));
else {
  const out = [];
  for (const sc of SCENES) out.push(await run(sc));
  window.result = out;
}
</script></body></html>`;

const TYPES = { '.js': 'text/javascript', '.map': 'application/json', '.css': 'text/css', '.html': 'text/html' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/' || url.pathname === '/bench.html') {
    res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
    return;
  }
  try {
    const file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(join(ROOT, 'packages') + sep) || !statSync(file).isFile()) throw new Error('not served');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for `check` to return something, up to `ms`. */
async function until(check, ms, what) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await check();
    if (v) return v;
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function bench(dpr) {
  const profile = mkdtempSync(join(tmpdir(), 'tc-bench-'));
  const gpu = process.platform === 'win32' ? ['--use-angle=d3d11'] : [];
  // Port 0: Chrome picks a free one and writes it to DevToolsActivePort.
  const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', ...gpu,
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=2600,1500', 'about:blank'], { stdio: 'ignore' });
  let failed = null;
  chrome.once('error', (e) => { failed = e; });
  let ws = null;
  try {
    const port = await until(() => {
      if (failed) throw failed;
      try { return readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { return null; }
    }, 20_000, 'Chrome to start');
    const target = await until(async () => {
      try { return (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { return null; }
    }, 20_000, 'a page');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('no connection to Chrome')), { once: true });
    });
    let id = 0;
    const pending = new Map();
    let pageError = null;
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
        console.error(`page ${msg.params.type}:`, msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        pageError = d.exception?.description ?? d.text;
      }
      if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id;
      const timer = setTimeout(() => { pending.delete(mid); reject(new Error(`${method} timed out`)); }, 30_000);
      pending.set(mid, (msg) => { clearTimeout(timer); resolve(msg); });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;
    await send('Emulation.setDeviceMetricsOverride', { width: 2600, height: 1500, deviceScaleFactor: dpr, mobile: false });
    await send('Runtime.enable');
    await send('Page.navigate', { url: `${base}/bench.html${args.shot ? `?shot=${args.shot}` : ''}` });
    const renderer = await until(() => evaluate(`(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return gl ? (e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no WebGL2'; })()`), 20_000, 'the page');
    // Fifteen scenes take a few minutes; a page error ends the run at once.
    const result = await until(async () => {
      if (pageError) throw new Error(`the page failed: ${pageError}`);
      return evaluate('window.result ?? null');
    }, 15 * 60_000, 'the results');
    if (args.shot && result[0]) {
      const { w, h } = result[0];
      const png = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
      const name = `tradecanvas-bench-${args.shot}-dpr${dpr}.png`;
      const out = args.out ? (DPRS.length > 1 ? args.out.replace(/(\.png)?$/, `-dpr${dpr}.png`) : args.out) : join(tmpdir(), name);
      writeFileSync(out, Buffer.from(png.result.data, 'base64'));
      console.log(`saved ${out} (drawn with ${result[0].renderer})`);
    }
    return { dpr, renderer, result };
  } finally {
    ws?.close();
    chrome.kill();
    // Chrome lets go of its profile a moment after it exits.
    for (let i = 0; i < 10; i++) {
      await sleep(300);
      try { rmSync(profile, { recursive: true, force: true }); break; } catch { /* still held */ }
    }
  }
}

const runs = [];
try {
  for (const dpr of DPRS) runs.push(await bench(dpr));
} finally {
  server.close();
}

if (args.shot) {
  // Screenshots only.
} else if (args.json) {
  console.log(JSON.stringify(runs, null, 2));
} else {
  for (const { dpr, renderer, result } of runs) {
    console.log(`\nDPR ${dpr} · ${renderer}`);
    console.log('scene                                         scene ms   frame ms   p95 ms   dropped');
    for (const r of result) {
      console.log(`${(r.id + ' ' + r.label).padEnd(44)} ${String(r.sceneMs).padStart(9)} ${String(r.frameMs).padStart(10)} ${String(r.p95Ms).padStart(8)} ${String(r.dropped).padStart(9)}`);
    }
  }
}
