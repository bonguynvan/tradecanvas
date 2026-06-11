<script lang="ts">
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import LiveTerminal from '$lib/components/LiveTerminal.svelte';
  import ChartGallery from '$lib/components/ChartGallery.svelte';
  import FinanceCharts from '$lib/components/FinanceCharts.svelte';

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
    { value: '66', label: 'Indicators' },
    { value: '24', label: 'Drawing tools' },
    { value: '17', label: 'Chart types' },
    { value: '0', label: 'Dependencies' },
  ];
</script>

<svelte:head>
  <title>TradeCanvas — High-Performance Canvas Trading Chart</title>
  <meta
    name="description"
    content="Production-ready canvas trading chart with built-in TradingView-like UI: 66 indicators, 24 drawing tools, 17 chart types, multi-chart grid, replay mode, strategy backtester, real-time streaming. Zero dependencies."
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="TradeCanvas — Trading chart library" />
  <meta property="og:description" content="High-performance canvas trading chart with built-in UI, 66 indicators, real-time streaming, and backtesting." />
  <meta property="og:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
  <meta property="og:url" content="https://bonguynvan.github.io/tradecanvas/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="TradeCanvas" />
  <meta name="twitter:description" content="High-performance canvas trading chart with built-in UI, 66 indicators, real-time streaming, and backtesting." />
  <meta name="twitter:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
</svelte:head>

<section class="hero-split">
  <div class="hero-copy">
    <span class="hero-eyebrow"><span class="dot"></span> v0.14 · 66 indicators</span>
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

<ChartGallery />

<section class="features-section">
  <h2 class="section-title">Built for trading</h2>
  <p class="section-subtitle">Everything you need for a professional trading chart, in a single package.</p>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="feature-icon">/\</div>
      <h3>66 technical indicators</h3>
      <p>
        SMA, EMA, RSI, MACD, Bollinger, Ichimoku, Stochastic RSI, Supertrend,
        Anchored VWAP, plus a deep oscillator bench (PPO, RMI, Disparity, Qstick,
        PGO, and more) — all computed internally with zero external math libraries.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">//</div>
      <h3>24 drawing tools</h3>
      <p>
        Trendlines, Fibonacci (incl. Time Zones), channels, Elliott waves, Gann tools.
        Click-to-place with magnet snapping, undo/redo, and full serialization.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[/]</div>
      <h3>17 chart types</h3>
      <p>
        Candlestick, OHLC bars, line, area, baseline, hollow candles, Heikin-Ashi,
        Renko, Kagi, Line Break, Point &amp; Figure, Range Bars, Volume Candles,
        Equivolume, HLC Area, Step Line, and Line+Markers.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">▦</div>
      <h3>ChartWidget (built-in UI)</h3>
      <p>
        One-line embed — <code>new ChartWidget(host, &#123;...&#125;)</code> ships a full
        TradingView-like UI: toolbar, drawing sidebar, settings dialog, status bar.
        Framework-agnostic.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">$</div>
      <h3>Trading overlay</h3>
      <p>
        Render positions, orders, SL/TP markers directly on the chart. Drag to modify.
        Partial-close strips, multi-stop P&amp;L gradient, custom label templates.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">~</div>
      <h3>Real-time streaming</h3>
      <p>
        Built-in Binance WebSocket adapter with typed REST + WS validators. Or plug in
        your own data source with the simple <code>DataAdapter</code> interface.
        Auto-reconnect included.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">⚙</div>
      <h3>Web Worker pipeline</h3>
      <p>
        Indicator math runs off the render loop via <code>IndicatorWorkerHost</code> —
        Promise-based <code>calculate()</code>, sync fallback for SSR/tests,
        per-request timeout. No frozen frames.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">⊕</div>
      <h3>Backtester + Monte Carlo</h3>
      <p>
        Bar-by-bar <code>Backtester</code> with virtual fills, slippage / commission models,
        plus a 4-strategy reference library. <code>runMonteCarlo()</code> exposes
        path-dependence with P5/P95 equity bands and probability-of-profit.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">⤴</div>
      <h3>TradingView gestures</h3>
      <p>
        Drag the price/time axes to scale, double-click to reset, <kbd>Shift</kbd>+drag for
        a measure ruler, <kbd>Alt</kbd>+click to pin a tooltip, hover for axis pill labels
        that follow the cursor. The set of moves a serious trader expects.
      </p>
    </div>
  </div>
</section>

<FinanceCharts />

<section class="quickstart-section">
  <h2 class="section-title">Quick start</h2>
  <p class="section-subtitle">
    A full-featured trading chart with live data in one call. Drop-in
    <code>ChartWidget</code> — no framework needed.
  </p>

  <pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  historyLimit: 500,
  trading: true,
  onReady: (chart) => {
    chart.on('orderPlace', (e) => console.log('order intent', e.payload))
  },
})`}</code></pre>

  <div style="text-align: center; margin-top: 32px;">
    <a href="{base}/docs/getting-started" class="cta-btn cta-btn--primary">Read the docs</a>
    <a href="{base}/examples" class="cta-btn cta-btn--ghost" style="margin-left: 8px">See examples</a>
  </div>
</section>

<style>
  /* --- Asymmetric hero --- */
  .hero-split {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    gap: 48px;
    align-items: center;
    max-width: 1320px;
    margin: 0 auto;
    padding: 56px 32px 40px;
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

  @media (max-width: 768px) {
    .hero-stats { gap: 24px; }
    .stat dt { font-size: 1.5rem; }
  }
</style>
