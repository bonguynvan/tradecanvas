<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import 'lenis/dist/lenis.css';
  import { initLandingMotion } from '$lib/motion';
  import LiveTerminal from '$lib/components/LiveTerminal.svelte';
  import ChartGallery from '$lib/components/ChartGallery.svelte';
  import FinanceCharts from '$lib/components/FinanceCharts.svelte';
  import FeatureLab from '$lib/components/FeatureLab.svelte';
  import InstallCommand from '$lib/components/InstallCommand.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import { VERSION, LINKS } from '$lib/site';

  /** Counts come from the source: ChartType, DrawingToolType, the indicator registry. */
  // `value` is what counts up on scroll; `prefix` stays put.
  const SPECS = [
    { prefix: '', value: '17', unit: '', label: 'chart types' },
    { prefix: '', value: '85', unit: '', label: 'indicators' },
    { prefix: '', value: '40', unit: '', label: 'drawing tools' },
    { prefix: '', value: '0', unit: '', label: 'runtime dependencies' },
    { prefix: '≈', value: '100', unit: 'kB', label: 'gzip, headless core' },
    { prefix: '<', value: '0.3', unit: 'ms', label: 'hover frame at 100k bars' },
  ];

  const PERF = [
    { prefix: '', value: '0.001', unit: 'ms', label: 'live tick with 4 indicators on 100k bars' },
    { prefix: '', value: '27', unit: 'ms', label: 'full recalculation after a symbol switch, 100k bars' },
    { prefix: '', value: '0.32', unit: 'ms', label: 'LTTB downsample, 100k → 1,600 points' },
    { prefix: '<', value: '0.3', unit: 'ms', label: 'hover frame, flat from 500 to 100k bars' },
  ];

  let page: HTMLElement | undefined = $state();
  onMount(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    if (page) {
      initLandingMotion(page)
        .then((dispose) => {
          if (cancelled) dispose();
          else stop = dispose;
        })
        .catch((err) => {
          // Motion is decoration: the page is complete without it.
          console.warn('Landing motion unavailable:', err);
        });
    }
    return () => {
      cancelled = true;
      stop?.();
    };
  });

  const CAPABILITIES = [
    {
      label: 'Widget',
      title: 'One call, full trading UI',
      text: 'ChartWidget brings the toolbar, drawing sidebar, watchlist, alerts, object tree, data window, replay and a command palette (Ctrl+K), in 14 languages from English and Vietnamese to Chinese, Japanese and Korean.',
    },
    {
      label: 'Data',
      title: 'Any market feed',
      text: 'Binance, Coinbase, Bybit and Kraken adapters built in; WebSocketAdapter and PollingAdapter for everything else. Older bars load as you scroll back; reconnects on its own and drops superseded symbol switches.',
    },
    {
      label: 'Trading',
      title: 'Orders on the chart',
      text: 'ExecutionAdapter with a paper broker, drag-to-create orders, brackets, draggable stop-loss and take-profit lines, alerts to webhooks and desktop notifications.',
    },
    {
      label: 'Frameworks',
      title: 'React, Vue and Svelte',
      text: '@tradecanvas/react, /vue and /svelte wrap the same engine with reactive, typed props. The full Chart instance stays one ref away.',
    },
    {
      label: 'Plugins',
      title: 'Extend every layer',
      text: 'Register custom indicators with incremental update(), drawing tools, chart types and overlays, globally or per chart.',
    },
    {
      label: 'Analytics',
      title: 'Backtests next to the chart',
      text: 'A bar-by-bar Backtester with Monte Carlo bands and a Web Worker indicator pipeline that keeps the main thread free.',
    },
  ];

  const GESTURES = [
    ['Drag', 'pan, also past the last bar'],
    ['Scroll', 'zoom around the pointer'],
    ['Drag right', 'older bars load as you go'],
    ['Drag an axis', 'scale it'],
    ['Ctrl + drag', 'select drawings'],
    ['Shift + drag', 'measure'],
    ['Alt + click', 'pin a tooltip'],
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
      label: 'Headless',
      code: `import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
chart.addIndicator('ema', { period: 21 })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`,
    },
  ];
  let activeQuickstart = $state(0);

  /** Arrow keys move between tabs (roving tabindex). */
  function onTabKey(e: KeyboardEvent) {
    const last = QUICKSTART.length - 1;
    const next =
      e.key === 'ArrowRight' ? (activeQuickstart === last ? 0 : activeQuickstart + 1)
      : e.key === 'ArrowLeft' ? (activeQuickstart === 0 ? last : activeQuickstart - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    activeQuickstart = next;
    document.getElementById(`qs-tab-${next}`)?.focus();
  }

  const DESCRIPTION =
    'TradeCanvas is a Canvas2D trading chart library: 17 chart types, 85 indicators, 40 drawing tools, live exchange feeds, orders on the chart, replay and backtesting. Zero dependencies, MIT.';
</script>

<svelte:head>
  <title>TradeCanvas · Canvas trading charts for the web</title>
  <meta name="description" content={DESCRIPTION} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="TradeCanvas · Canvas trading charts for the web" />
  <meta property="og:description" content={DESCRIPTION} />
  <meta property="og:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
  <meta property="og:url" content="https://bonguynvan.github.io/tradecanvas/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="TradeCanvas" />
  <meta name="twitter:description" content={DESCRIPTION} />
  <meta name="twitter:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
</svelte:head>

<div class="home" bind:this={page}>
<section class="home-hero">
  <div class="hero-grid" data-parallax aria-hidden="true"></div>
  <div class="home-hero-inner">
    <div class="hero-copy">
      <a class="hero-release" href="{base}/changelog">
        <span class="live" aria-hidden="true"></span>
        <span>v{VERSION}</span>
        <span class="sep" aria-hidden="true">/</span>
        <span>two-canvas renderer, free panning</span>
      </a>
      <h1 class="hero-h1">The chart engine for trading&nbsp;apps.</h1>
      <p class="hero-lede">
        Candlesticks to Renko, 85 indicators, 40 drawing tools, live exchange feeds and orders
        on the chart. Drawn on Canvas2D with zero dependencies. Drop in the full
        <code>ChartWidget</code> or build your own UI on the headless <code>Chart</code>.
      </p>

      <InstallCommand />

      <div class="cta-row">
        <a href="{base}/docs/getting-started" class="cta-btn cta-btn--primary">Get started</a>
        <a href="{base}/examples" class="cta-btn cta-btn--ghost">Browse examples</a>
      </div>

      <p class="hero-frameworks">
        <span>Vanilla TS</span><span>React</span><span>Vue</span><span>Svelte</span>
      </p>
    </div>

    <div class="hero-stage">
      <LiveTerminal />
    </div>
  </div>
</section>

<section class="spec-strip" aria-label="Key numbers">
  <dl class="spec-grid">
    {#each SPECS as s}
      <div class="spec">
        <dt>{s.prefix}<span class="count" data-count={s.value} style:min-width="{s.value.length}ch">{s.value}</span>{#if s.unit}<small>{s.unit}</small>{/if}</dt>
        <dd>{s.label}</dd>
      </div>
    {/each}
  </dl>
</section>

<FeatureLab />

<ChartGallery />

<section class="features-section" aria-labelledby="hood-title">
  <header class="section-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">Under the hood</span>
    <h2 class="section-title" id="hood-title">Measured, documented, yours to extend</h2>
    <p class="section-subtitle">The engine behind the Feature Lab. Every number below is reproducible with <code>pnpm bench</code>.</p>
  </header>

  <div class="hood">
    <div class="perf-panel" data-reveal>
      <h3 class="panel-label">Frame budget</h3>
      <dl class="perf-grid">
        {#each PERF as p}
          <div>
            <dt>{p.prefix}<span class="count" data-count={p.value} style:min-width="{p.value.length}ch">{p.value}</span><small>{p.unit}</small></dt>
            <dd>{p.label}</dd>
          </div>
        {/each}
      </dl>
      <p class="perf-foot">
        Two stacked canvases: a hover repaints only the thin top one. Every renderer walks only the
        bars on screen.
      </p>
      <h3 class="panel-label">Gestures</h3>
      <dl class="gestures">
        {#each GESTURES as [key, what]}
          <div><dt><kbd>{key}</kbd></dt><dd>{what}</dd></div>
        {/each}
      </dl>
    </div>

    <dl class="caps" data-reveal data-reveal-stagger>
      {#each CAPABILITIES as c}
        <div class="cap">
          <dt><span class="cap-label">{c.label}</span>{c.title}</dt>
          <dd>{c.text}</dd>
        </div>
      {/each}
    </dl>
  </div>
</section>

<FinanceCharts />

<section class="quickstart-section" aria-labelledby="qs-title">
  <header class="section-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">Quick start</span>
    <h2 class="section-title" id="qs-title">Same chart, five ways in</h2>
    <p class="section-subtitle">The full widget, a framework component or the headless engine. They share one renderer.</p>
  </header>

  <div class="qs" data-reveal>
    <div class="qs-tabs" role="tablist" aria-label="Quick start flavour">
      {#each QUICKSTART as q, i}
        <button
          type="button"
          role="tab"
          id="qs-tab-{i}"
          class="qs-tab"
          class:active={activeQuickstart === i}
          aria-selected={activeQuickstart === i}
          aria-controls="qs-panel"
          tabindex={activeQuickstart === i ? 0 : -1}
          onclick={() => { activeQuickstart = i; }}
          onkeydown={onTabKey}
        >{q.label}</button>
      {/each}
    </div>
    <div id="qs-panel" role="tabpanel" aria-labelledby="qs-tab-{activeQuickstart}">
      <CodeBlock code={QUICKSTART[activeQuickstart].code} />
    </div>
  </div>
</section>

<section class="closing" aria-labelledby="closing-title">
  <div class="closing-inner" data-reveal data-reveal-stagger>
    <h2 class="closing-title" id="closing-title">Put a live chart in your app today.</h2>
    <div class="closing-actions">
      <InstallCommand />
      <div class="cta-row">
        <a href="{base}/docs/getting-started" class="cta-btn cta-btn--primary">Read the docs</a>
        <a href={LINKS.github} class="cta-btn cta-btn--ghost" target="_blank" rel="noopener">Star on GitHub</a>
      </div>
    </div>
  </div>
</section>
</div>

<style>
  /* --- Hero --- */
  .home-hero {
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  /* Its own layer so it can drift (parallax) while the hero scrolls out. */
  .hero-grid {
    position: absolute;
    inset: -25% 0 0;
    background:
      linear-gradient(to right, var(--border-subtle) 1px, transparent 1px) 0 0 / 64px 64px,
      linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px) 0 0 / 64px 64px;
    mask-image: radial-gradient(120% 90% at 30% 35%, #000 40%, transparent 100%);
    pointer-events: none;
  }

  .home-hero-inner {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
    gap: clamp(32px, 4vw, 64px);
    align-items: center;
    max-width: var(--page-max);
    margin: 0 auto;
    padding: clamp(40px, 6vw, 80px) var(--gutter) clamp(40px, 5vw, 64px);
  }

  .hero-copy {
    display: grid;
    gap: 22px;
    justify-items: start;
    min-width: 0;
  }

  /* Entrance: pure CSS, so it plays on first paint without waiting for JS
     (reduced motion collapses it to the final frame, see app.css). */
  .hero-copy > :global(*) {
    animation: hero-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .hero-copy > :global(:nth-child(2)) { animation-delay: 0.06s; }
  .hero-copy > :global(:nth-child(3)) { animation-delay: 0.12s; }
  .hero-copy > :global(:nth-child(4)) { animation-delay: 0.18s; }
  .hero-copy > :global(:nth-child(5)) { animation-delay: 0.24s; }
  .hero-copy > :global(:nth-child(6)) { animation-delay: 0.3s; }

  .hero-stage {
    animation: hero-stage-in 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  }

  @keyframes hero-rise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }

  @keyframes hero-stage-in {
    from { opacity: 0; transform: translateY(24px) scale(0.985); }
    to { opacity: 1; transform: none; }
  }

  .hero-release {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-dim);
    padding: 5px 12px 5px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elevated);
    transition: border-color var(--transition), color var(--transition);
    max-width: 100%;
  }

  .hero-release:hover { border-color: var(--accent-dim); color: var(--text); }
  .hero-release .sep { color: var(--text-muted); }

  .live {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    flex: none;
    animation: heartbeat 1.8s infinite;
  }

  @keyframes heartbeat {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 55%, transparent); }
    70% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--green) 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 0%, transparent); }
  }

  .hero-h1 {
    font-size: clamp(2.4rem, 4.4vw, 3.6rem);
    line-height: 1;
    font-weight: 600;
    letter-spacing: -0.045em;
    text-wrap: balance;
  }

  .hero-lede {
    font-size: clamp(1rem, 1.3vw, 1.125rem);
    color: var(--text-dim);
    max-width: 34rem;
  }

  .hero-lede code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--text);
    white-space: nowrap;
  }

  .hero-frameworks {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }

  .hero-frameworks span::before {
    content: '';
    display: inline-block;
    width: 5px;
    height: 5px;
    margin-right: 8px;
    vertical-align: middle;
    background: var(--accent);
  }

  .hero-stage { min-width: 0; }

  /* --- Spec strip --- */
  .spec-strip { border-bottom: 1px solid var(--border); }

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    max-width: var(--page-max);
    margin: 0 auto;
  }

  .spec {
    padding: 22px var(--gutter) 24px;
    border-left: 1px solid var(--border);
  }

  .spec:first-child { border-left: 0; }

  .spec dt {
    font-family: var(--font-mono);
    font-size: clamp(1.5rem, 2.4vw, 2rem);
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .count { display: inline-block; font-variant-numeric: tabular-nums; }

  .spec dt small, .perf-grid dt small {
    font-size: 0.5em;
    margin-left: 3px;
    color: var(--text-muted);
    letter-spacing: 0;
  }

  .spec dd {
    margin-top: 6px;
    font-size: 13px;
    color: var(--text-muted);
  }

  /* --- Under the hood --- */
  .hood {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(24px, 4vw, 56px);
    align-items: start;
  }

  .perf-panel {
    display: grid;
    gap: 18px;
    padding: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--bg-elevated);
  }

  .panel-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .perf-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 24px;
  }

  .perf-grid dt {
    font-family: var(--font-mono);
    font-size: clamp(1.6rem, 2.6vw, 2.2rem);
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .perf-grid dd {
    margin-top: 6px;
    font-size: 13px;
    color: var(--text-dim);
  }

  .perf-foot {
    font-size: 13.5px;
    color: var(--text-muted);
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .gestures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 20px;
  }

  .gestures div { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
  .gestures dt { flex: none; }
  .gestures dd { font-size: 13px; color: var(--text-dim); }

  .caps { border-top: 1px solid var(--border); }

  .cap {
    display: grid;
    gap: 6px;
    padding: 18px 0 20px;
    border-bottom: 1px solid var(--border);
  }

  .cap dt {
    display: flex;
    align-items: baseline;
    gap: 14px;
    font-size: 16.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .cap-label {
    flex: none;
    width: 92px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .cap dd {
    padding-left: 106px;
    font-size: 14.5px;
    color: var(--text-dim);
    max-width: 62ch;
  }

  /* --- Quick start --- */
  .qs { display: grid; gap: 0; max-width: 900px; }

  .qs-tabs {
    display: flex;
    gap: 0;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: var(--bg-elevated);
  }

  .qs-tab {
    font: 500 13px var(--font-mono);
    padding: 10px 16px;
    border: 0;
    border-right: 1px solid var(--border);
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    white-space: nowrap;
    position: relative;
    transition: color var(--transition), background var(--transition);
  }

  .qs-tab:hover { color: var(--text); }
  .qs-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .qs-tab.active { color: var(--text); background: var(--bg); }

  .qs-tab.active::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: var(--accent);
  }

  .qs :global(.code-block) { border-radius: 0 0 var(--radius-lg) var(--radius-lg); }

  /* --- Closing --- */
  .closing { border-top: 1px solid var(--border); background: var(--bg-elevated); }

  .closing-inner {
    max-width: var(--page-max);
    margin: 0 auto;
    padding: 64px var(--gutter);
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    gap: 28px 48px;
    align-items: center;
  }

  .closing-title {
    font-size: clamp(1.7rem, 3.2vw, 2.6rem);
    line-height: 1.05;
    font-weight: 600;
    letter-spacing: -0.035em;
    max-width: 16ch;
    text-wrap: balance;
  }

  .closing-actions { display: grid; gap: 14px; justify-items: start; min-width: 0; }

  /* --- Responsive --- */
  @media (max-width: 1100px) {
    .spec-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .spec:nth-child(4) { border-left: 0; }
    .spec:nth-child(n + 4) { border-top: 1px solid var(--border); }
  }

  @media (max-width: 980px) {
    .home-hero-inner { grid-template-columns: minmax(0, 1fr); }
    .hood { grid-template-columns: minmax(0, 1fr); }
    .closing-inner { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 640px) {
    .spec-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .spec:nth-child(n) { border-left: 1px solid var(--border); border-top: 0; }
    .spec:nth-child(odd) { border-left: 0; }
    .spec:nth-child(n + 3) { border-top: 1px solid var(--border); }
    .perf-grid, .gestures { grid-template-columns: minmax(0, 1fr); }
    .cap dt { flex-direction: column; gap: 4px; }
    .cap dd { padding-left: 0; }
  }
</style>
