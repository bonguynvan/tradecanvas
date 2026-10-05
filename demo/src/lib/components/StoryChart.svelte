<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { Chart } from '@tradecanvas/chart';
  import { siteTheme, onSiteThemeChange } from '$lib/site';
  import { generateBars } from '$lib/sampleData';
  import { swing } from '$lib/featureScenes';
  import { pressToEngage } from '$lib/pressToEngage';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';
  import EngageHint from './EngageHint.svelte';

  /** Which part of the trade the chart shows. */
  type Scene = 'read' | 'trade' | 'replay' | 'scale';

  /** A scene once set up: told when it goes on or off screen, stopped on destroy. */
  interface Running {
    visible?: (on: boolean) => void;
    stop: () => void;
  }

  let { scene }: { scene: Scene } = $props();

  const i18n = useI18n();
  const m = $derived(i18n.m);

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  /** How far ahead of the viewport the chart starts. */
  const START_MARGIN = '400px';
  /** Frames the meter averages over, and how often it shows a new figure. */
  const METER_FRAMES = 60;
  const METER_EVERY = 15;
  /** Auto-pan: bars a frame, and frames each way. */
  const PAN_STEP = 3;
  const PAN_LEG = 40;
  /** Replay: the bar it starts from, how often it steps, and how long it rests at the end. */
  const REPLAY_FROM = 260;
  const REPLAY_STEP_MS = 450;
  const REPLAY_HOLD_MS = 2500;

  /** With reduced motion the replay waits at its start and nothing pans on its own. */
  const still = browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let host: HTMLDivElement | undefined = $state();
  let frame: HTMLDivElement | undefined = $state();
  let renderer = $state<'canvas' | 'webgl'>('canvas');
  let frameMs = $state<number | null>(null);
  let panning = $state(false);
  let chart: Chart | null = null;
  let pan: ReturnType<typeof autoPan> | null = null;
  let visible = false;
  let engaged = false;

  /** Runs `then` when the browser is idle, so a chart's setup doesn't land in a scroll's frames. */
  function whenIdle(then: () => void): void {
    if ('requestIdleCallback' in window) window.requestIdleCallback(then, { timeout: 600 });
    else setTimeout(then, 1);
  }

  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  function setUpRead(c: Chart): Running {
    const data = generateBars(300, 'READ', HOUR, 120);
    c.setData(data);
    c.addIndicator('bb', {});
    c.addIndicator('ema', { period: 50 });
    c.addIndicator('rsi', {});
    const n = data.length;
    c.addDrawing({
      type: 'fibRetracement',
      anchors: [swing(data, n - 160, n - 90, 'low'), swing(data, n - 90, n - 20, 'high')],
      options: { extendLeft: false, extendRight: false, labelPosition: 'right' },
    });
    c.addDrawing({
      type: 'trendLine',
      // Under the last two lows on screen.
      anchors: [swing(data, n - 55, n - 35, 'low'), swing(data, n - 28, n - 12, 'low')],
      options: { extendRight: true },
    });
    return { stop: () => {} };
  }

  async function setUpTrade(c: Chart, lib: typeof import('@tradecanvas/chart')): Promise<Running> {
    // A series that ends recovering mid-range, so the bracket and the order fit on screen.
    const data = generateBars(270, 'ORDER', 15 * MINUTE, 2500);
    c.setData(data);
    const last = data[data.length - 1].close;
    const broker = new lib.PaperExecutionAdapter({ markPrice: last });
    c.connectExecution(broker);
    // A short closed at a profit, then a long with its bracket and an order waiting.
    broker.setMarkPrice(last * 1.012);
    await broker.placeOrder({ side: 'sell', type: 'market', price: last * 1.012, quantity: 1 });
    const short = broker.getPositions()[0];
    broker.setMarkPrice(last);
    if (short) await broker.closePosition({ positionId: short.id });
    await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 2 });
    const long = broker.getPositions()[0];
    // The bracket on the structure on screen: the stop under the last low, the target at the last high.
    if (long) await broker.modifyPosition({ positionId: long.id, stopLoss: last * 0.9885, takeProfit: last * 1.0065 });
    c.placeOrderIntent({ side: 'buy', type: 'limit', price: last * 0.994, quantity: 1 });
    return { stop: () => {} };
  }

  function setUpReplay(c: Chart): Running {
    c.setData(generateBars(520, 'REPLAY', HOUR, 120));
    c.addIndicator('ema', { period: 21 });
    let timer = 0;
    let pausedOffScreen = false;
    // A round that starts off screen (after the hold at the end) waits until it's seen.
    const start = () => {
      pausedOffScreen = !still && !visible;
      c.replayStart({ startIndex: REPLAY_FROM, interval: REPLAY_STEP_MS, speed: 1, paused: still || !visible });
    };
    // At the last bar the replay pauses: hold it there a moment, then round again.
    c.on('replayState', (e) => {
      if (e.payload.state !== 'paused' || c.getReplayProgress().percent < 100) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(start, REPLAY_HOLD_MS);
    });
    start();
    return {
      // Off screen it waits where it is.
      visible(on) {
        if (!on && c.getReplayState() === 'playing') {
          c.replayPause();
          pausedOffScreen = true;
        } else if (on && pausedOffScreen) {
          pausedOffScreen = false;
          c.replayResume();
        }
      },
      stop: () => window.clearTimeout(timer),
    };
  }

  async function setUpScale(c: Chart): Promise<Running> {
    // The bench's load, a frame for each heavy step so none of them holds up a scroll for long.
    const stale = () => chart !== c;
    const bars = generateBars(200_000, 'SCALE', MINUTE, 30_000);
    await nextFrame();
    if (stale()) return { stop: () => {} };
    c.setData(bars);
    await nextFrame();
    if (stale()) return { stop: () => {} };
    c.addIndicator('bb', {});
    c.addIndicator('ema', { period: 21 });
    await nextFrame();
    if (stale()) return { stop: () => {} };
    c.addIndicator('ema', { period: 100 });
    c.addIndicator('rsi', {});
    c.on('rendererChange', (e) => { renderer = e.payload.renderer; });
    renderer = await c.setRenderer('webgl');
    const panner = autoPan(c);
    pan = panner;
    return {
      visible: (on) => (on ? panner.run() : panner.halt()),
      stop: () => panner.halt(),
    };
  }

  /** Pans back and forth while on screen and not taken over, metering the frames. */
  function autoPan(c: Chart) {
    let raf = 0;
    let k = 0;
    let lastTs = 0;
    const times: number[] = [];
    const step = (ts: number) => {
      if (lastTs) {
        times.push(ts - lastTs);
        if (times.length > METER_FRAMES) times.shift();
        if (k % METER_EVERY === 0) frameMs = times.reduce((a, b) => a + b, 0) / times.length;
      }
      lastTs = ts;
      // Back into history first, then forward to the last bar again: never past it into empty space.
      c.scrollBars(Math.floor(k++ / PAN_LEG) % 2 === 0 ? -PAN_STEP : PAN_STEP);
      raf = requestAnimationFrame(step);
    };
    const reset = () => {
      lastTs = 0;
      times.length = 0;
      frameMs = null;
    };
    return {
      run() {
        if (raf || still || !visible || engaged) return;
        reset();
        panning = true;
        raf = requestAnimationFrame(step);
      },
      halt() {
        cancelAnimationFrame(raf);
        raf = 0;
        panning = false;
        frameMs = null;
      },
      /** A new renderer: the figures so far were the old one's. */
      reset,
    };
  }

  /** Clicking the chart takes it over from the auto-pan; letting go hands it back. */
  function takeOver() {
    engaged = true;
    pan?.halt();
  }

  function handBack() {
    engaged = false;
    pan?.run();
  }

  function pickRenderer(mode: 'canvas' | 'webgl') {
    if (!chart || mode === renderer) return;
    pan?.reset();
    void chart.setRenderer(mode).then((now) => { renderer = now; });
  }

  onMount(() => {
    if (!browser || !frame || !host) return;
    const box = frame;
    let cancelled = false;
    let started = false;
    let running: Running | null = null;
    const stopThemeSync = onSiteThemeChange((theme) => chart?.setTheme(theme));
    const resizer = new ResizeObserver(() => chart?.resize());
    resizer.observe(host);

    const boot = async () => {
      const lib = await import('@tradecanvas/chart');
      if (cancelled || !host) return;
      const c = new lib.Chart(host, { theme: siteTheme(), chartType: 'candlestick' });
      chart = c;
      const next =
        scene === 'read' ? setUpRead(c)
        : scene === 'trade' ? await setUpTrade(c, lib)
        : scene === 'replay' ? setUpReplay(c)
        : await setUpScale(c);
      if (cancelled) return next.stop();
      running = next;
      running.visible?.(visible);
    };

    // Started once near the screen, when the browser is idle: four live charts at load would cost the first paint.
    const near = new IntersectionObserver((entries) => {
      if (!entries[entries.length - 1]?.isIntersecting || started) return;
      started = true;
      near.disconnect();
      whenIdle(() => {
        if (!cancelled) boot().catch((err) => console.warn('Story chart unavailable:', err));
      });
    }, { rootMargin: START_MARGIN });
    near.observe(box);

    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      running?.visible?.(visible);
    });
    seen.observe(box);

    return () => {
      cancelled = true;
      near.disconnect();
      seen.disconnect();
      resizer.disconnect();
      running?.stop();
      pan = null;
      stopThemeSync();
      chart?.destroy();
      chart = null;
    };
  });
</script>

<div class="story-chart" bind:this={frame} use:pressToEngage={{ surface: '.story-host', ignore: '.story-meter', onEngage: takeOver, onRelease: handBack }}>
  <div class="story-host" bind:this={host}></div>
  <EngageHint />
  {#if scene === 'scale'}
    <div class="story-meter" role="group" aria-label={m.home.story.renderer}>
      <div class="meter-switch">
        <button type="button" class:active={renderer === 'webgl'} aria-pressed={renderer === 'webgl'} onclick={() => pickRenderer('webgl')}>WebGL</button>
        <button type="button" class:active={renderer === 'canvas'} aria-pressed={renderer === 'canvas'} onclick={() => pickRenderer('canvas')}>Canvas 2D</button>
      </div>
      <span class="meter-value">{frameMs === null ? '—' : fill(m.home.story.frameTime, { ms: frameMs.toFixed(1) })}</span>
      {#if panning}<span class="meter-note">{m.home.story.panning}</span>{/if}
    </div>
  {:else if scene === 'replay' && !still}
    <div class="story-meter"><span class="replay-dot" aria-hidden="true"></span><span>{m.home.story.replaying}</span></div>
  {/if}
</div>

<style>
  .story-chart {
    position: relative;
    height: clamp(340px, 40vw, 480px);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--bg);
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    transition: border-color var(--transition);
  }

  .story-chart:not([data-engaged]) { cursor: pointer; }
  .story-chart:global([data-engaged]) { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }

  .story-host { width: 100%; height: 100%; }

  .story-meter {
    position: absolute;
    left: 12px;
    bottom: 34px;
    z-index: 5;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
    backdrop-filter: blur(6px);
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    cursor: default;
  }

  .meter-switch { display: inline-flex; gap: 2px; }

  .meter-switch button {
    font: 500 11.5px var(--font-mono);
    padding: 3px 8px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: color var(--transition), background var(--transition);
  }

  .meter-switch button:hover { color: var(--text); background: var(--bg-panel); }
  .meter-switch button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .meter-switch button.active { color: var(--accent-ink); background: var(--accent-fill); }

  .meter-value { color: var(--text); min-width: 13ch; }
  .meter-note { color: var(--text-muted); }

  .replay-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: blink 1.2s steps(2, start) infinite;
  }

  @keyframes blink { to { visibility: hidden; } }

  @media (max-width: 640px) {
    .story-chart { height: 340px; }
    .meter-note { display: none; }
  }
</style>
