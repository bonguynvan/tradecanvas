<script lang="ts">
  import ChartDemo from './components/ChartDemo.svelte';
  import FinanceCharts from './components/FinanceCharts.svelte';
  import DocSections from './components/DocSections.svelte';

  const PM_COMMANDS = [
    { label: 'npm', cmd: 'npm install @tradecanvas/chart' },
    { label: 'pnpm', cmd: 'pnpm add @tradecanvas/chart' },
    { label: 'yarn', cmd: 'yarn add @tradecanvas/chart' },
  ] as const;

  let activePm = $state(0);
  let copyState = $state('COPY');

  function handleCopyInstall() {
    navigator.clipboard.writeText(PM_COMMANDS[activePm].cmd).then(() => {
      copyState = 'Copied!';
      setTimeout(() => { copyState = 'COPY'; }, 1500);
    });
  }

  function handleCopyCode() {
    const code = `import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

// One-line embed: toolbar, drawing sidebar, settings, status bar — built in
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
})`;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('copy-code');
      if (btn) {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      }
    });
  }
</script>

<!-- Hero -->
<section class="hero">
  <h1 class="hero-title">TradeCanvas</h1>
  <p class="hero-subtitle">High-performance canvas trading chart with a built-in TradingView-like UI. 33 indicators, 23 drawing tools, 12 chart types, live streaming, mobile-ready. Zero dependencies.</p>

  <div class="cta-row">
    <div class="cta-install-wrap">
      <div class="pm-tabs">
        {#each PM_COMMANDS as pm, i}
          <button
            class="pm-tab"
            class:active={activePm === i}
            onclick={() => { activePm = i; }}
          >{pm.label}</button>
        {/each}
      </div>
      <button
        class="cta-install"
        class:copied={copyState === 'Copied!'}
        title="Copy to clipboard"
        onclick={handleCopyInstall}
      >
        <span>{PM_COMMANDS[activePm].cmd}</span>
        <span class="copy-icon">{copyState}</span>
      </button>
    </div>
    <a href="https://github.com/bonguynvan/tradecanvas" class="cta-btn cta-btn--primary" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.npmjs.com/package/@tradecanvas/chart" class="cta-btn cta-btn--ghost" target="_blank" rel="noopener">npm</a>
  </div>

  <div class="badge-row">
    <span class="badge"><span class="badge-dot"></span> 33 Indicators</span>
    <span class="badge"><span class="badge-dot badge-dot--green"></span> 23 Drawing Tools</span>
    <span class="badge"><span class="badge-dot"></span> 12 Chart Types</span>
    <span class="badge"><span class="badge-dot badge-dot--red"></span> Real-Time Streaming</span>
    <span class="badge"><span class="badge-dot"></span> Web Worker Pipeline</span>
    <span class="badge"><span class="badge-dot badge-dot--green"></span> Mobile &amp; Touch Ready</span>
    <span class="badge"><span class="badge-dot"></span> Zero Dependencies</span>
  </div>
</section>

<!-- Widget Announcement -->
<section class="widget-section">
  <div class="widget-callout">
    <h3>v0.6 — ChartWidget powers this page</h3>
    <p>The chart below is a single <code>new ChartWidget(host, &#123;...&#125;)</code> call — toolbar, drawing sidebar, settings, and status bar all built in. Resize the window to see the responsive layout adapt under 768px.</p>
    <code>import {'{'} ChartWidget {'}'} from '@tradecanvas/chart/widget'</code>
    <a href="#widget">See documentation</a>
  </div>
</section>

<!-- Chart Demo -->
<ChartDemo />

<!-- Finance Charts -->
<FinanceCharts />

<!-- Features -->
<section class="features-section">
  <h2 class="section-title">Built for Trading</h2>
  <p class="section-subtitle">Everything you need for a professional trading chart, in a single package.</p>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="feature-icon">/\</div>
      <h3>33 Technical Indicators</h3>
      <p>SMA, EMA, Hull MA, RSI, MACD, Bollinger Bands, Ichimoku, Stochastic, Pivot Points, Anchored VWAP, ZigZag, Linear Regression Channel, Awesome &amp; Chaikin Oscillators, and more — all computed internally with zero external math libraries.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">//</div>
      <h3>23 Drawing Tools</h3>
      <p>Trendlines, Fibonacci, channels, Elliott waves, Gann tools. Click-to-place with magnet snapping, undo/redo, and full serialization.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[/]</div>
      <h3>12 Chart Types</h3>
      <p>Candlestick, OHLC bars, line, area, mountain, baseline, hollow candles, Heikin-Ashi, Renko, Kagi, Line Break, Point &amp; Figure, and Range Bars. Switch at runtime with <code>chart.setChartType()</code>.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">▦</div>
      <h3>ChartWidget (Built-in UI)</h3>
      <p>One-line embed — <code>new ChartWidget(host, &#123;...&#125;)</code> ships a full TradingView-like UI: toolbar, drawing sidebar, settings dialog, and status bar. Framework-agnostic. Powers this page.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">$</div>
      <h3>Trading Overlay</h3>
      <p>Render positions, orders, SL/TP markers directly on the chart. Drag to modify. Partial-close strips, multi-stop P&amp;L gradient, custom label templates with token substitution.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">~</div>
      <h3>Real-Time Streaming</h3>
      <p>Built-in Binance WebSocket adapter with typed REST + WS validators. Or plug in your own data source with the simple <code>DataAdapter</code> interface. Auto-reconnect included.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">⚙</div>
      <h3>Web Worker Pipeline</h3>
      <p>Indicator math runs off the render loop via <code>IndicatorWorkerHost</code> — Promise-based <code>calculate()</code>, sync fallback for SSR/tests, per-request timeout. No more frozen frames.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">{'{ }'}</div>
      <h3>Save / Load / Replay</h3>
      <p>Persist drawings, indicators, theme, and chart type to JSON. Validated <code>deserialize</code> filters malformed payloads. Replay historical bars one at a time for backtesting visualization.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[ ]</div>
      <h3>Mobile &amp; Touch Ready</h3>
      <p>Single-finger pan, two-finger pinch-zoom, responsive widget layout under 768px. Resize this page or open it on your phone to try it live.</p>
    </div>
  </div>
</section>

<!-- Quick Start -->
<section class="quickstart-section">
  <h2 class="section-title">Quick Start</h2>
  <p class="section-subtitle">A full-featured trading chart with live data in one call. Drop-in <code>ChartWidget</code> — no framework needed.</p>

  <div class="code-block">
    <div class="code-header">
      <span>main.ts</span>
      <button class="code-copy-btn" id="copy-code" onclick={handleCopyCode}>Copy</button>
    </div>
    <div class="code-body">
      <pre><span class="kw">import</span> {'{'} <span class="obj">ChartWidget</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart/widget'</span>
<span class="kw">import</span> {'{'} <span class="obj">BinanceAdapter</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="cmt">// One-line embed: toolbar, drawing sidebar, settings, status bar — built in</span>
<span class="kw">const</span> widget = <span class="kw">new</span> <span class="fn">ChartWidget</span>(document.<span class="fn">getElementById</span>(<span class="str">'chart'</span>)!, {'{'}
  symbol: <span class="str">'BTCUSDT'</span>,
  timeframe: <span class="str">'5m'</span>,
  theme: <span class="str">'dark'</span>,
  adapter: <span class="kw">new</span> <span class="fn">BinanceAdapter</span>(),
  historyLimit: <span class="bool">500</span>,
  trading: <span class="bool">true</span>,
  <span class="fn">onReady</span>: (chart) =&gt; {'{'}
    chart.<span class="fn">on</span>(<span class="str">'orderPlace'</span>, (e) =&gt; console.<span class="fn">log</span>(<span class="str">'order intent'</span>, e.payload))
  {'}'},
{'}'})</pre>
    </div>
  </div>
</section>

<!-- Doc Sections -->
<DocSections />

<!-- Footer -->
<footer class="footer">
  <div class="footer-links">
    <span>MIT License</span>
    <span class="footer-sep">|</span>
    <a href="https://github.com/bonguynvan/tradecanvas" target="_blank" rel="noopener">GitHub</a>
    <span class="footer-sep">|</span>
    <a href="https://www.npmjs.com/package/@tradecanvas/chart" target="_blank" rel="noopener">npm</a>
  </div>
</footer>
