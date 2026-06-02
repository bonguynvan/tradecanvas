<script lang="ts">
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import LiveChartShowcase from '$lib/components/LiveChartShowcase.svelte';
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
</script>

<svelte:head>
  <title>TradeCanvas — High-Performance Canvas Trading Chart</title>
  <meta
    name="description"
    content="Production-ready canvas trading chart with built-in TradingView-like UI: 33 indicators, 23 drawing tools, 17 chart types, multi-chart grid, replay mode, strategy backtester, real-time streaming. Zero dependencies."
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="TradeCanvas — Trading chart library" />
  <meta property="og:description" content="High-performance canvas trading chart with built-in UI, 33 indicators, real-time streaming, and backtesting." />
  <meta property="og:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
  <meta property="og:url" content="https://bonguynvan.github.io/tradecanvas/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="TradeCanvas" />
  <meta name="twitter:description" content="High-performance canvas trading chart with built-in UI, 33 indicators, real-time streaming, and backtesting." />
  <meta name="twitter:image" content="https://bonguynvan.github.io/tradecanvas/og.svg" />
</svelte:head>

<section class="hero">
  <h1 class="hero-title">TradeCanvas</h1>
  <p class="hero-subtitle">
    High-performance canvas trading chart with a built-in TradingView-like UI.
    33 indicators, 23 drawing tools, 17 chart types, multi-chart grid, replay mode, strategy backtester, live streaming. Zero dependencies.
  </p>

  <div class="cta-row">
    <div class="cta-install-wrap">
      <div class="pm-tabs">
        {#each PM_COMMANDS as pm, i}
          <button
            class="pm-tab"
            class:active={activePm === i}
            onclick={() => { activePm = i; }}
            type="button"
          >{pm.label}</button>
        {/each}
      </div>
      <button
        class="cta-install"
        class:copied={copyState === 'Copied!'}
        title="Copy to clipboard"
        onclick={handleCopyInstall}
        type="button"
      >
        <span>{PM_COMMANDS[activePm].cmd}</span>
        <span class="copy-icon">{copyState}</span>
      </button>
    </div>
    <a href="{base}/docs/getting-started" class="cta-btn cta-btn--primary">Get started</a>
    <a href="https://github.com/bonguynvan/tradecanvas" class="cta-btn cta-btn--ghost" target="_blank" rel="noopener">GitHub</a>
  </div>

  <div class="badge-row">
    <span class="badge"><span class="badge-dot"></span> 33 Indicators</span>
    <span class="badge"><span class="badge-dot badge-dot--green"></span> 23 Drawing Tools</span>
    <span class="badge"><span class="badge-dot"></span> 17 Chart Types</span>
    <span class="badge"><span class="badge-dot badge-dot--red"></span> Signal Markers &amp; Trade Zones</span>
    <span class="badge"><span class="badge-dot badge-dot--red"></span> Real-Time Streaming</span>
    <span class="badge"><span class="badge-dot badge-dot--green"></span> Multi-Chart Grid</span>
    <span class="badge"><span class="badge-dot"></span> Backtester (0.8)</span>
    <span class="badge"><span class="badge-dot badge-dot--green"></span> Replay Mode (0.8)</span>
    <span class="badge"><span class="badge-dot"></span> Zero Dependencies</span>
  </div>
</section>

<LiveChartShowcase />

<section class="widget-section">
  <div class="widget-callout">
    <h3>v0.9 — TradingView-grade interaction + analytics depth</h3>
    <p>
      Drag the price/time axes to scale, <kbd>Shift</kbd>-drag to measure,
      <kbd>Alt</kbd>-click to pin a comparison tooltip, hover for axis pill
      labels that follow the cursor. New Volume Profile overlay, watchlist
      sidebar, replay scrubber UI, CSV/JSON drag-and-drop import, saved
      layouts. Analytics gains a strategy library (SMA cross, RSI mean
      reversion, Donchian breakout, Bollinger reversion) plus Monte Carlo
      path-dependence analysis.
    </p>
    <a href="{base}/docs/api">See what's new →</a>
  </div>
</section>

<section class="features-section">
  <h2 class="section-title">Built for trading</h2>
  <p class="section-subtitle">Everything you need for a professional trading chart, in a single package.</p>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="feature-icon">/\</div>
      <h3>33 technical indicators</h3>
      <p>
        SMA, EMA, Hull MA, RSI, MACD, Bollinger Bands, Ichimoku, Stochastic, Pivot Points,
        Anchored VWAP, ZigZag, Linear Regression Channel, Awesome &amp; Chaikin
        Oscillators, and more — computed internally with zero external math libraries.
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
        plus a 4-strategy reference library (SMA cross, RSI reversion, Donchian, Bollinger).
        <strong>New in 0.9:</strong> <code>runMonteCarlo()</code> exposes path-dependence
        with P5/P95 equity bands and probability-of-profit.
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
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">⏵</div>
      <h3>Replay scrubber UI</h3>
      <p>
        Toolbar play button toggles a floating bottom scrubber — play/pause, step,
        draggable seek, and a 0.5×–100× speed select. Drives the headless
        <code>ReplayController</code> on top.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">≡</div>
      <h3>Watchlist + saved layouts</h3>
      <p>
        Optional right-side watchlist with last price + % + sparkline per symbol.
        Per-symbol indicator stacks, drawings, and alerts persist to localStorage —
        switch symbols, switch back, your setup is intact.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">↓</div>
      <h3>Drag-and-drop import</h3>
      <p>
        Drop a CSV or JSON onto the chart and it loads. Auto-detects delimiter, headers,
        ISO/unix-s/unix-ms timestamps, and array-vs-object JSON shapes. Or call
        <code>parseOHLCV()</code> directly from code.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[ ]</div>
      <h3>Mobile &amp; touch ready</h3>
      <p>
        Single-finger pan, two-finger pinch-zoom, responsive widget layout under 768px.
        Resize this page or open it on your phone to try it live.
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
</style>
