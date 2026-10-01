<script lang="ts">
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import LiveTerminal from '$lib/components/LiveTerminal.svelte';
  import ChartGallery from '$lib/components/ChartGallery.svelte';
  import FinanceCharts from '$lib/components/FinanceCharts.svelte';
  import FeatureLab from '$lib/components/FeatureLab.svelte';

  const PM_COMMANDS = [
    { label: 'npm', cmd: 'npm install @tradecanvas/chart' },
    { label: 'pnpm', cmd: 'pnpm add @tradecanvas/chart' },
    { label: 'yarn', cmd: 'yarn add @tradecanvas/chart' },
  ] as const;

  let activePm = $state(0);
  let copyState = $state('COPY');

  function handleCopyInstall() {
    if (!browser) return;
    navigator.clipboard.writeText(PM_COMMANDS[activePm].cmd).then(() => {
      copyState = 'Copied!';
      setTimeout(() => { copyState = 'COPY'; }, 1500);
    });
  }

  const STATS = [
    { value: '70', label: 'Indicators' },
    { value: '40', label: 'Drawing tools' },
    { value: '17', label: 'Chart types' },
    { value: '0', label: 'Dependencies' },
  ];

  const QUICKSTART = [
    {
      label: 'Widget',
      code: `import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  adapter: new BinanceAdapter(),
  locale: 'en',            // or 'vi'
  trading: true,
})`,
    },
    {
      label: 'React',
      code: `import { TradeCanvas } from '@tradecanvas/react'

export function Chart() {
  return (
    <div style={{ height: 520 }}>
      <TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['bb', 'rsi']} />
    </div>
  )
}`,
    },
    {
      label: 'Vue',
      code: `<script setup lang="ts">
import { TradeCanvas } from '@tradecanvas/vue'
<` + `/script>

<template>
  <div style="height: 520px">
    <TradeCanvas symbol="BTCUSDT" timeframe="5m" :indicators="['bb', 'rsi']" />
  </div>
</template>`,
    },
    {
      label: 'Svelte',
      code: `<script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
<` + `/script>

<div style="height: 520px">
  <TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['bb', 'rsi']} />
</div>`,
    },
    {
      label: 'Chart (headless)',
      code: `import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
chart.addIndicator('ema', { period: 21 })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`,
    },
  ];
  let activeQuickstart = $state(0);

  const PERF = [
    { value: '0.001 ms', label: 'live tick, 4 indicators, 100k bars' },
    { value: '27 ms', label: 'full recalc on a switch, 100k bars' },
    { value: '0.32 ms', label: 'LTTB downsample 100k → 1,600 points' },
    { value: '< 0.3 ms', label: 'hover frame, flat from 500 to 100k bars' },
  ];
</script>

<svelte:head>
  <title>TradeCanvas — High-Performance Canvas Trading Chart</title>
  <meta
    name="description"
    content="Production-ready canvas trading chart with built-in TradingView-like UI: 70 indicators, 40 drawing tools, 17 chart types, multi-chart grid, replay mode, strategy backtester, real-time streaming. Zero dependencies."
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="TradeCanvas — Trading chart library" />
  <meta property="og:description" content="High-performance canvas trading chart with built-in UI, 70 indicators, real-time streaming, and backtesting." />
  <meta property="og:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
  <meta property="og:url" content="https://bonguynvan.github.io/tradecanvas/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="TradeCanvas" />
  <meta name="twitter:description" content="High-performance canvas trading chart with built-in UI, 70 indicators, real-time streaming, and backtesting." />
  <meta name="twitter:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
</svelte:head>

<section class="hero-split">
  <div class="hero-copy">
    <span class="hero-eyebrow"><span class="dot"></span> v1.2 · MIT · zero dependencies</span>
    <h1 class="hero-h1">The trading chart that ships with its&nbsp;UI.</h1>
    <p class="hero-lede">
      A high-performance, zero-dependency canvas charting engine with a built-in
      TradingView-grade interface. Indicators, drawing tools, real-time
      streaming, replay, and a backtester — in one <code>ChartWidget</code> call.
    </p>

    <div class="hero-cta">
      <div class="cta-install-wrap">
        <div class="pm-tabs">
          {#each PM_COMMANDS as pm, i}
            <button class="pm-tab" class:active={activePm === i} onclick={() => { activePm = i; }} type="button">{pm.label}</button>
          {/each}
        </div>
        <button class="cta-install" class:copied={copyState === 'Copied!'} title="Copy to clipboard" onclick={handleCopyInstall} type="button">
          <span>{PM_COMMANDS[activePm].cmd}</span>
          <span class="copy-icon">{copyState}</span>
        </button>
      </div>
      <a href="{base}/docs/getting-started" class="cta-btn cta-btn--primary">Get started</a>
      <a href="https://github.com/bonguynvan/tradecanvas" class="cta-btn cta-btn--ghost" target="_blank" rel="noopener">GitHub</a>
    </div>

    <dl class="hero-stats">
      {#each STATS as s}
        <div class="stat">
          <dt>{s.value}</dt>
          <dd>{s.label}</dd>
        </div>
      {/each}
    </dl>
  </div>

  <div class="hero-stage">
    <LiveTerminal />
  </div>
</section>

<FeatureLab />

<ChartGallery />

<section class="features-section">
  <h2 class="section-title">Under the hood</h2>
  <p class="section-subtitle">What the Feature Lab runs on — measured, documented, and yours to extend.</p>

  <div class="bento">
    <article class="tile tile--perf">
      <h3>Performance you can measure</h3>
      <dl class="perf-grid">
        {#each PERF as p}
          <div>
            <dt>{p.value}</dt>
            <dd>{p.label}</dd>
          </div>
        {/each}
      </dl>
      <p class="tile-foot">Two-canvas Canvas2D (hover repaints only the top one), visible-range rendering. Run <code>pnpm bench</code> to reproduce.</p>
    </article>

    <article class="tile">
      <h3>One call, full UI</h3>
      <p><code>ChartWidget</code>: toolbar, drawing sidebar, watchlist, alerts, object tree, data window, replay, command palette (<kbd>Ctrl</kbd>+<kbd>K</kbd>), English and Vietnamese.</p>
    </article>

    <article class="tile">
      <h3>Any data feed</h3>
      <p>Binance, Coinbase, Bybit and Kraken built in; <code>WebSocketAdapter</code> / <code>PollingAdapter</code> for the rest. Auto-reconnect, race-free switching.</p>
    </article>

    <article class="tile">
      <h3>A trading surface</h3>
      <p><code>ExecutionAdapter</code> with a paper broker, drag-to-create orders, brackets, draggable SL/TP, alerts to webhooks and desktop notifications.</p>
    </article>

    <article class="tile">
      <h3>React, Vue, Svelte</h3>
      <p><code>@tradecanvas/react</code>, <code>/vue</code>, <code>/svelte</code> — reactive props, typed, the full <code>Chart</code> one ref away.</p>
    </article>

    <article class="tile">
      <h3>Plugin SDK</h3>
      <p>Custom indicators (with incremental <code>update()</code>), drawing tools, chart types and overlays — registered globally or per chart.</p>
    </article>

    <article class="tile tile--wide">
      <h3>Analytics and gestures</h3>
      <p>Bar-by-bar <code>Backtester</code> with Monte Carlo bands, a Web Worker indicator pipeline — and the moves traders expect: pan past the last bar into empty future space, drag axes to scale, double-click to reset, <kbd>Ctrl</kbd>+drag to select several drawings, <kbd>Shift</kbd>+drag to measure, <kbd>Alt</kbd>+click to pin a tooltip.</p>
    </article>
  </div>
</section>

<FinanceCharts />

<section class="quickstart-section">
  <h2 class="section-title">Quick start</h2>
  <p class="section-subtitle">The full widget, a framework component, or the headless engine — same chart underneath.</p>

  <div class="qs-tabs" role="tablist" aria-label="Quick start flavor">
    {#each QUICKSTART as q, i}
      <button type="button" role="tab" class="qs-tab" class:active={activeQuickstart === i} aria-selected={activeQuickstart === i} onclick={() => { activeQuickstart = i; }}>{q.label}</button>
    {/each}
  </div>
  <pre><code>{QUICKSTART[activeQuickstart].code}</code></pre>

  <div style="text-align: center; margin-top: 32px;">
    <a href="{base}/docs/getting-started" class="cta-btn cta-btn--primary">Read the docs</a>
    <a href="{base}/examples" class="cta-btn cta-btn--ghost" style="margin-left: 8px">Open a sandbox</a>
  </div>
</section>

<style>
  /* --- Asymmetric hero --- */
  .hero-split {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    gap: 48px;
    align-items: center;
    max-width: 1600px;
    margin: 0 auto;
    padding: 56px clamp(24px, 4vw, 72px) 40px;
    position: relative;
  }

  .hero-split::before {
    content: '';
    position: absolute;
    top: -80px;
    left: 10%;
    width: 520px;
    height: 520px;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .hero-copy, .hero-stage { position: relative; z-index: 1; }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 5px 12px;
    margin-bottom: 22px;
  }

  .hero-eyebrow .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
    animation: heartbeat 1.8s infinite;
  }

  @keyframes heartbeat {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
    70% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }

  .hero-h1 {
    font-size: clamp(2.2rem, 4.2vw, 3.4rem);
    line-height: 1.05;
    font-weight: 700;
    letter-spacing: -0.03em;
    margin: 0 0 18px;
    background: linear-gradient(135deg, var(--text) 0%, color-mix(in srgb, var(--text) 55%, var(--accent)) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero-lede {
    font-size: clamp(1rem, 1.4vw, 1.15rem);
    color: var(--text-dim);
    max-width: 30rem;
    margin: 0 0 28px;
  }

  .hero-lede code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    color: var(--accent);
    background: var(--accent-glow);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .hero-cta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 36px;
  }

  .hero-stats {
    display: flex;
    gap: 36px;
    flex-wrap: wrap;
    margin: 0;
    padding-top: 28px;
    border-top: 1px solid var(--border);
  }

  .stat dt {
    font-size: 1.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .stat dd {
    margin: 6px 0 0;
    font-size: 12.5px;
    color: var(--text-muted);
    font-weight: 500;
  }

  /* --- Bento --- */
  .bento {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    max-width: 1240px;
    margin: 0 auto;
  }

  .tile {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 22px;
    transition: border-color var(--transition), transform var(--transition);
  }

  .tile:hover {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
    transform: translateY(-2px);
  }

  .tile h3 {
    font-size: 15px;
    margin: 0 0 8px;
  }

  .tile p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  .tile code {
    font-family: var(--font-mono);
    font-size: 0.86em;
    color: var(--accent);
  }

  .tile--perf {
    grid-column: span 2;
    grid-row: span 2;
    background:
      radial-gradient(120% 80% at 0% 0%, var(--accent-glow), transparent 60%),
      var(--bg-card);
  }

  /* Fills the last row: Plugin SDK (1) + this (3). */
  .tile--wide { grid-column: span 3; }

  .perf-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 24px;
    margin: 18px 0;
  }

  .perf-grid dt {
    font-family: var(--font-mono);
    font-size: clamp(1.5rem, 2.4vw, 2.1rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .perf-grid dd {
    margin: 4px 0 0;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .tile p.tile-foot { font-size: 12.5px; }

  /* --- Quick start tabs --- */
  .qs-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .qs-tab {
    font: inherit;
    font-size: 13px;
    padding: 6px 12px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: none;
    color: var(--text-dim);
    cursor: pointer;
    transition: color var(--transition), border-color var(--transition), background var(--transition);
  }

  .qs-tab:hover { color: var(--text); }
  .qs-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  .qs-tab.active {
    color: var(--text);
    border-color: var(--accent);
    background: var(--accent-glow);
  }

  @media (prefers-reduced-motion: reduce) {
    .tile, .qs-tab { transition: none; }
    .tile:hover { transform: none; }
  }

  pre {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text);
  }

  @media (max-width: 940px) {
    .hero-split {
      grid-template-columns: 1fr;
      gap: 36px;
      padding: 40px 20px 24px;
      text-align: left;
    }
    .hero-split::before { left: -10%; }
  }

  @media (max-width: 1024px) {
    .bento { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tile--perf { grid-row: auto; }
    .tile--wide { grid-column: auto; }
  }

  @media (max-width: 640px) {
    .bento { grid-template-columns: 1fr; }
    .tile--perf, .tile--wide { grid-column: auto; grid-row: auto; }
  }

  @media (max-width: 768px) {
    .hero-stats { gap: 24px; }
    .stat dt { font-size: 1.5rem; }
  }
</style>
