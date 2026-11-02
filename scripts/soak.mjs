// Soak test: the live desk (scripts/soak/desk.html) left running in Chrome,
// read every so often, to see whether memory, the page's nodes or its frames
// creep up over minutes of a busy feed.
//
//   pnpm build && node scripts/soak.mjs [--minutes=10] [--rate=30000] [--bars=1000000]
//     [--renderer=webgl] [--every=30] [--headed] [--json] [--shot=desk.png]
//     [--profile=desk.cpuprofile]   ten seconds of CPU after the warm-up, before the reads
//
// Each read first collects garbage, so the heap it reports is what is still
// held, not what is waiting to be freed. Per read it prints:
//   heap      the JS heap still held after a collection, MB
//   nodes     DOM nodes in the page; listeners, the event listeners on them
//   ticks/s   trades the chart took in since the last read
//   fps, p95  frames a second since the last read, and the p95 of the last 120 frames
//   long      main-thread tasks over 50 ms since the last read
// At the end: how much the heap grew from the first read after the warm-up
// minute to the last, and its trend in MB a minute (a least-squares line).
// Needs Node 22+ (global WebSocket) and Chrome; CHROME_PATH picks the binary.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : 'true'];
}));
const MINUTES = Number(args.minutes ?? 10);
const EVERY_S = Number(args.every ?? 30);
const RATE = Number(args.rate ?? 30_000);
const BARS = Number(args.bars ?? 1_000_000);
const RENDERER = args.renderer ?? 'webgl';
const HEADED = args.headed === 'true';
/** Reads in the first minute are the page settling (the JIT, caches filling): the trend starts after it. */
const WARMUP_S = 60;
const WIDTH = 1600;
const HEIGHT = 900;

const CHROME = process.env.CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));
if (!CHROME || !existsSync(CHROME)) throw new Error(`Chrome not found${CHROME ? ` at ${CHROME}` : ''}: set CHROME_PATH`);
if (typeof WebSocket === 'undefined') throw new Error('Node 22+ needed (global WebSocket)');
if (!existsSync(join(ROOT, 'packages/library/dist/index.js'))) throw new Error('No build: run pnpm build first');

const TYPES = { '.js': 'text/javascript', '.map': 'application/json', '.css': 'text/css', '.html': 'text/html' };
const SERVED = [join(ROOT, 'packages') + sep, join(ROOT, 'scripts', 'soak') + sep];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    const file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!SERVED.some((dir) => file.startsWith(dir)) || !statSync(file).isFile()) throw new Error('not served');
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

/** The slope of a least-squares line through (x, y), per unit of x. */
function slope(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return den ? num / den : 0;
}

async function soak() {
  const profile = mkdtempSync(join(tmpdir(), 'tc-soak-'));
  const gpu = process.platform === 'win32' ? ['--use-angle=d3d11'] : [];
  const chrome = spawn(CHROME, [...(HEADED ? [] : ['--headless=new']), '--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', ...gpu,
    // A hidden or covered window is throttled: the soak must keep drawing.
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--enable-precise-memory-info', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${WIDTH},${HEIGHT + (HEADED ? 140 : 0)}`, 'about:blank'], { stdio: 'ignore' });
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
      const timer = setTimeout(() => { pending.delete(mid); reject(new Error(`${method} timed out`)); }, 60_000);
      pending.set(mid, (msg) => { clearTimeout(timer); resolve(msg); });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;
    if (!HEADED) await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    await send('Runtime.enable');
    await send('Performance.enable');
    await send('Page.navigate', { url: `${base}/scripts/soak/desk.html?rate=${RATE}&bars=${BARS}&renderer=${RENDERER}` });
    await until(async () => {
      if (pageError) throw new Error(`the page failed: ${pageError}`);
      return evaluate('window.__soak?.ready ?? null');
    }, 120_000, 'the desk');
    const gpuName = await evaluate(`(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return gl ? (e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no WebGL2'; })()`);
    const drawnWith = await until(() => evaluate('window.__soak.renderer()'), 20_000, 'the renderer');
    // Reads are timed from here, the desk loaded: the warm-up minute counts from it, a profile included.
    const started = Date.now();

    if (args.profile) {
      // Ten seconds of the main thread's CPU after the warm-up, for chrome://inspect or a script to read.
      await sleep(WARMUP_S * 1000);
      await send('Profiler.enable');
      await send('Profiler.start');
      await sleep(10_000);
      const { profile: cpu } = (await send('Profiler.stop')).result;
      writeFileSync(args.profile, JSON.stringify(cpu));
      console.log(`saved ${args.profile}`);
    }
    const reads = [];
    let before = await evaluate('window.__soak.stats()');
    let beforeAt = Date.now();
    const total = (args.profile ? WARMUP_S + 10 : 0) * 1000 + MINUTES * 60_000;
    while (Date.now() - started < total) {
      await sleep(Math.min(EVERY_S * 1000, total - (Date.now() - started)));
      if (pageError) throw new Error(`the page failed: ${pageError}`);
      // Counters first, then the collection, then the next counters: the
      // collection's pause falls between reads, though it can still reach
      // the p95 of the frames before the next read.
      const now = await evaluate('window.__soak.stats()');
      const span = (Date.now() - beforeAt) / 1000;
      await send('HeapProfiler.collectGarbage');
      const metrics = Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map((m) => [m.name, m.value]));
      const read = {
        t: Math.round((Date.now() - started) / 1000),
        heapMB: +(metrics.JSHeapUsedSize / 2 ** 20).toFixed(1),
        nodes: metrics.Nodes,
        listeners: metrics.JSEventListeners,
        ticksPerS: Math.round((now.ticks - before.ticks) / span),
        fps: +((now.frames - before.frames) / span).toFixed(1),
        p95: +now.frameP95.toFixed(1),
        long: now.longTasks - before.longTasks,
        bars: now.bars,
      };
      reads.push(read);
      if (!args.json) console.log(`${String(read.t).padStart(5)} s  heap ${String(read.heapMB).padStart(7)} MB  nodes ${String(read.nodes).padStart(6)}  listeners ${String(read.listeners).padStart(5)}  ticks/s ${String(read.ticksPerS).padStart(6)}  fps ${String(read.fps).padStart(5)}  p95 ${String(read.p95).padStart(5)} ms  long ${read.long}`);
      before = await evaluate('window.__soak.stats()');
      beforeAt = Date.now();
    }
    if (args.shot) {
      const png = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(args.shot, Buffer.from(png.result.data, 'base64'));
    }
    return { gpu: gpuName, renderer: drawnWith, reads };
  } finally {
    ws?.close();
    chrome.kill();
    for (let i = 0; i < 10; i++) {
      await sleep(300);
      try { rmSync(profile, { recursive: true, force: true }); break; } catch { /* still held */ }
    }
  }
}

let run;
try {
  run = await soak();
} finally {
  server.close();
}
if (run.reads.length === 0) throw new Error('No reads: run for longer than --every');
const settled = run.reads.filter((r) => r.t >= WARMUP_S);
const first = settled[0] ?? run.reads[0];
const last = run.reads.at(-1);
const summary = {
  minutes: MINUTES, rate: RATE, bars: BARS, gpu: run.gpu, renderer: run.renderer,
  heapFromMB: first.heapMB, heapToMB: last.heapMB,
  heapTrendMBPerMin: +(slope(settled.map((r) => r.t / 60), settled.map((r) => r.heapMB)) || 0).toFixed(2),
  nodesFrom: first.nodes, nodesTo: last.nodes,
  listenersFrom: first.listeners, listenersTo: last.listeners,
  ticksPerSMean: Math.round(run.reads.reduce((a, r) => a + r.ticksPerS, 0) / run.reads.length),
  fpsMean: +(run.reads.reduce((a, r) => a + r.fps, 0) / run.reads.length).toFixed(1),
  p95Worst: Math.max(...run.reads.map((r) => r.p95)),
  longTasks: run.reads.reduce((a, r) => a + r.long, 0),
};
if (args.json) console.log(JSON.stringify({ summary, reads: run.reads }, null, 2));
else {
  console.log(`\n${MINUTES} min · ${RATE.toLocaleString('en-US')} trades/s · ${BARS.toLocaleString('en-US')} bars · ${run.renderer} on ${run.gpu}`);
  console.log(`heap ${summary.heapFromMB} → ${summary.heapToMB} MB after the first minute (trend ${summary.heapTrendMBPerMin} MB/min)`);
  console.log(`nodes ${summary.nodesFrom} → ${summary.nodesTo} · listeners ${summary.listenersFrom} → ${summary.listenersTo}`);
  console.log(`ticks/s ${summary.ticksPerSMean} · fps ${summary.fpsMean} · worst p95 ${summary.p95Worst} ms · long tasks ${summary.longTasks}`);
}
