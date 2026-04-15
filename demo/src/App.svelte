<script lang="ts">
  import ChartDemo from './components/ChartDemo.svelte';
  import DocSections from './components/DocSections.svelte';

  let copyState = $state('Copy');

  function handleCopyInstall() {
    navigator.clipboard.writeText('npm install @tradecanvas/chart').then(() => {
      copyState = 'Copied!';
      setTimeout(() => { copyState = 'Copy'; }, 1500);
    });
  }

  function handleCopyCode() {
    const code = `import { Chart, BinanceAdapter } from '@tradecanvas/chart'

// Create a chart
const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  autoScale: true,
  features: {
    drawings: true,
    indicators: true,
    trading: true,
    volume: true,
  },
})

// Connect to live Binance data
const adapter = new BinanceAdapter()
chart.connect({
  adapter,
  symbol: 'BTCUSDT',
  timeframe: '5m',
  historyLimit: 300,
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
  <p class="hero-subtitle">High-performance canvas trading chart. Zero dependencies.</p>

  <div class="cta-row">
    <button
      class="cta-install"
      class:copied={copyState === 'Copied!'}
      title="Copy to clipboard"
      onclick={handleCopyInstall}
    >
      <span>npm install @tradecanvas/chart</span>
      <span class="copy-icon">{copyState === 'Copied!' ? 'Copied!' : 'COPY'}</span>
    </button>
    <a href="https://github.com/bonguynvan/tradecanvas" class="cta-btn cta-btn--primary" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.npmjs.com/package/@tradecanvas/chart" class="cta-btn cta-btn--ghost" target="_blank" rel="noopener">npm</a>
  </div>

  <div class="badge-row">
    <span class="badge"><span class="badge-dot"></span> 20+ Indicators</span>
    <span class="badge"><span class="badge-dot badge-dot--green"></span> 23 Drawing Tools</span>
    <span class="badge"><span class="badge-dot badge-dot--red"></span> Real-Time Streaming</span>
    <span class="badge"><span class="badge-dot"></span> Zero Dependencies</span>
  </div>
</section>

<!-- Chart Demo -->
<ChartDemo />

<!-- Features -->
<section class="features-section">
  <h2 class="section-title">Built for Trading</h2>
  <p class="section-subtitle">Everything you need for a professional trading chart, in a single package.</p>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="feature-icon">/\</div>
      <h3>20+ Technical Indicators</h3>
      <p>SMA, EMA, RSI, MACD, Bollinger Bands, Ichimoku, Stochastic, ATR, and more. All computed internally with no external math libraries.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">//</div>
      <h3>23 Drawing Tools</h3>
      <p>Trendlines, Fibonacci, channels, Elliott waves, Gann tools. Click-to-place with magnet snapping, undo/redo, and full serialization.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">$</div>
      <h3>Trading Overlay</h3>
      <p>Render positions, orders, SL/TP markers directly on the chart. Drag to modify. Exactly like MT4/MT5 but in the browser.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">~</div>
      <h3>Real-Time Streaming</h3>
      <p>Built-in Binance WebSocket adapter. Or plug in your own data source with the simple adapter interface. Auto-reconnect included.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">{'{ }'}</div>
      <h3>Save and Load State</h3>
      <p>Persist everything to JSON: drawings, indicators, theme, chart type. Restore a full chart state with a single call.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon feature-icon--green">{'>'}</div>
      <h3>Replay Mode</h3>
      <p>Step through historical bars one at a time for backtesting visualization. Control playback speed and jump to any point in time.</p>
    </div>
  </div>
</section>

<!-- Quick Start -->
<section class="quickstart-section">
  <h2 class="section-title">Quick Start</h2>
  <p class="section-subtitle">A full-featured trading chart with live data in 15 lines.</p>

  <div class="code-block">
    <div class="code-header">
      <span>main.ts</span>
      <button class="code-copy-btn" id="copy-code" onclick={handleCopyCode}>Copy</button>
    </div>
    <div class="code-body">
      <pre><span class="kw">import</span> {'{'} <span class="obj">Chart</span>, <span class="obj">BinanceAdapter</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="cmt">// Create a chart</span>
<span class="kw">const</span> chart = <span class="kw">new</span> <span class="fn">Chart</span>(document.<span class="fn">getElementById</span>(<span class="str">'chart'</span>)!, {'{'}
  theme: <span class="str">'dark'</span>,
  autoScale: <span class="bool">true</span>,
  features: {'{'}
    drawings: <span class="bool">true</span>,
    indicators: <span class="bool">true</span>,
    trading: <span class="bool">true</span>,
    volume: <span class="bool">true</span>,
  {'}'},
{'}'})

<span class="cmt">// Connect to live Binance data</span>
<span class="kw">const</span> adapter = <span class="kw">new</span> <span class="fn">BinanceAdapter</span>()
chart.<span class="fn">connect</span>({'{'}
  adapter,
  symbol: <span class="str">'BTCUSDT'</span>,
  timeframe: <span class="str">'5m'</span>,
  historyLimit: <span class="bool">300</span>,
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
