<script lang="ts">
  import { onMount } from 'svelte';
  import {
    openVanillaSandbox,
    openReactSandbox,
    openSvelteSandbox,
    openVueSandbox,
    openFinanceChartsSandbox,
    openWidgetSandbox,
  } from '../lib/sandboxes';

  onMount(() => {
    // Tab switching
    document.querySelectorAll('[data-tabs]').forEach(tabsContainer => {
      const buttons = tabsContainer.querySelectorAll('.code-tab-btn');
      const panels = tabsContainer.querySelectorAll('.code-tab-panel');

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = (btn as HTMLElement).dataset.tabTarget;
          if (!target) return;

          buttons.forEach(b => b.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById(target)?.classList.add('active');
        });
      });
    });

    // Copy buttons
    document.querySelectorAll('[data-copy-block]').forEach(btn => {
      btn.addEventListener('click', () => {
        const block = btn.closest('.code-block');
        const pre = block?.querySelector('pre');
        if (pre) copyText(pre.textContent ?? '', btn as HTMLElement);
      });
    });

    document.querySelectorAll('[data-copy-tabs]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabs = btn.closest('.code-tabs');
        const activePanel = tabs?.querySelector('.code-tab-panel.active');
        const pre = activePanel?.querySelector('pre');
        if (pre) copyText(pre.textContent ?? '', btn as HTMLElement);
      });
    });

    // Sidebar active tracking
    const sidebarLinks = document.querySelectorAll('.docs-sidebar-link');
    const sections = document.querySelectorAll('.doc-section');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            sidebarLinks.forEach(link => {
              link.classList.toggle(
                'active',
                link.getAttribute('href') === `#${entry.target.id}`
              );
            });
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  });

  function copyText(text: string, btn: HTMLElement) {
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    });
  }
</script>

<!-- Documentation Layout -->
<div class="docs-layout">
  <nav class="docs-sidebar">
    <div class="docs-sidebar-title">Documentation</div>
    <a class="docs-sidebar-link" href="#getting-started">Getting Started</a>
    <a class="docs-sidebar-link" href="#widget">Widget</a>
    <a class="docs-sidebar-link" href="#integration">Integration Guide</a>
    <a class="docs-sidebar-link" href="#data">Data Format</a>
    <a class="docs-sidebar-link" href="#custom-adapter">Custom Adapter</a>
    <a class="docs-sidebar-link" href="#locale">Number Locale</a>
    <a class="docs-sidebar-link" href="#themes">Themes</a>
    <a class="docs-sidebar-link" href="#indicators">Indicators</a>
    <a class="docs-sidebar-link" href="#drawings">Drawing Tools</a>
    <a class="docs-sidebar-link" href="#trading">Trading Overlay</a>
    <a class="docs-sidebar-link" href="#features">Features Config</a>
    <a class="docs-sidebar-link" href="#mobile">Mobile &amp; Touch</a>
    <a class="docs-sidebar-link" href="#events">Events</a>
    <a class="docs-sidebar-link" href="#state">Save / Load</a>
    <a class="docs-sidebar-link" href="#finance">Finance Charts</a>
    <a class="docs-sidebar-link" href="#api">API Reference</a>
    <a class="docs-sidebar-link" href="#changelog">Changelog</a>
  </nav>
  <div class="docs-content">

  <!-- Getting Started -->
  <section class="doc-section" id="getting-started">
    <h2 class="section-title">Getting Started</h2>
    <p class="section-subtitle">Complete setup examples for popular frameworks. The <strong>Vanilla JS</strong> tab uses <code>ChartWidget</code> — the recommended drop-in path. The framework tabs show low-level <code>Chart</code> usage if you'd rather build your own UI.</p>

    <div class="code-tabs" data-tabs>
      <div class="code-tabs-header">
        <button class="code-tab-btn active" data-tab-target="tab-vanilla">Vanilla JS</button>
        <button class="code-tab-btn" data-tab-target="tab-react">React</button>
        <button class="code-tab-btn" data-tab-target="tab-svelte">Svelte</button>
        <button class="code-tab-btn" data-tab-target="tab-vue">Vue</button>
        <button class="code-copy-btn" data-copy-tabs>Copy</button>
      </div>

      <div class="code-tab-panel active" id="tab-vanilla">
        <div class="code-body">
          <pre><span class="kw">import</span> {'{'} <span class="obj">ChartWidget</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart/widget'</span>
<span class="kw">import</span> {'{'} <span class="obj">BinanceAdapter</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> container = document.<span class="fn">getElementById</span>(<span class="str">'chart'</span>)!
container.style.width = <span class="str">'100%'</span>
container.style.height = <span class="str">'600px'</span>

<span class="cmt">// Drop-in TradingView-like UI: toolbar, drawing sidebar, settings, status bar</span>
<span class="kw">const</span> widget = <span class="kw">new</span> <span class="fn">ChartWidget</span>(container, {'{'}
  symbol: <span class="str">'BTCUSDT'</span>,
  timeframe: <span class="str">'5m'</span>,
  theme: <span class="str">'dark'</span>,
  adapter: <span class="kw">new</span> <span class="fn">BinanceAdapter</span>(),
  historyLimit: <span class="bool">500</span>,
  trading: <span class="bool">true</span>,
  symbols: [<span class="str">'BTCUSDT'</span>, <span class="str">'ETHUSDT'</span>, <span class="str">'SOLUSDT'</span>],
  <span class="fn">onReady</span>: (chart) =&gt; {'{'}
    chart.<span class="fn">addIndicator</span>(<span class="str">'sma'</span>, {'{'} period: <span class="bool">20</span> {'}'})
    chart.<span class="fn">on</span>(<span class="str">'orderPlace'</span>, (e) =&gt; console.<span class="fn">log</span>(<span class="str">'order'</span>, e.payload))
  {'}'},
{'}'})

<span class="cmt">// Need full control instead? Use `new Chart(container, ...)` directly — see framework tabs.</span></pre>
        </div>
        <div class="stackblitz-bar">
          <button class="stackblitz-btn" onclick={openVanillaSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
      </div>

      <div class="code-tab-panel" id="tab-react">
        <div class="code-body">
          <pre><span class="kw">import</span> {'{'} useRef, useEffect {'}'} <span class="kw">from</span> <span class="str">'react'</span>
<span class="kw">import</span> {'{'} <span class="obj">Chart</span>, <span class="obj">BinanceAdapter</span>, <span class="obj">DARK_THEME</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">export function</span> <span class="fn">TradingChart</span>() {'{'}
  <span class="kw">const</span> containerRef = <span class="fn">useRef</span>&lt;<span class="obj">HTMLDivElement</span>&gt;(<span class="bool">null</span>)
  <span class="kw">const</span> chartRef = <span class="fn">useRef</span>&lt;<span class="obj">Chart</span> | <span class="bool">null</span>&gt;(<span class="bool">null</span>)

  <span class="fn">useEffect</span>(() =&gt; {'{'}
    <span class="kw">if</span> (!containerRef.current) <span class="kw">return</span>

    <span class="kw">const</span> chart = <span class="kw">new</span> <span class="fn">Chart</span>(containerRef.current, {'{'}
      chartType: <span class="str">'candlestick'</span>,
      theme: <span class="obj">DARK_THEME</span>,
      autoScale: <span class="bool">true</span>,
      features: {'{'} drawings: <span class="bool">true</span>, indicators: <span class="bool">true</span>, volume: <span class="bool">true</span> {'}'},
    {'}'})

    <span class="kw">const</span> adapter = <span class="kw">new</span> <span class="fn">BinanceAdapter</span>()
    chart.<span class="fn">connect</span>({'{'} adapter, symbol: <span class="str">'BTCUSDT'</span>, timeframe: <span class="str">'5m'</span> {'}'})
    chartRef.current = chart

    <span class="kw">return</span> () =&gt; chart.<span class="fn">destroy</span>()
  {'}'}, [])

  <span class="kw">return</span> &lt;<span class="obj">div</span> ref={'{'}containerRef{'}'} style={'{'}{'{'} width: <span class="str">'100%'</span>, height: <span class="str">'600px'</span> {'}'}{'}'}  /&gt;
{'}'}</pre>
        </div>
        <div class="stackblitz-bar">
          <button class="stackblitz-btn" onclick={openReactSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
      </div>

      <div class="code-tab-panel" id="tab-svelte">
        <div class="code-body">
          <pre><span class="cmt">&lt;!-- TradingChart.svelte --&gt;</span>
&lt;<span class="obj">script</span> lang=<span class="str">"ts"</span>&gt;
  <span class="kw">import</span> {'{'} onMount, onDestroy {'}'} <span class="kw">from</span> <span class="str">'svelte'</span>
  <span class="kw">import</span> {'{'} <span class="obj">Chart</span>, <span class="obj">BinanceAdapter</span>, <span class="obj">DARK_THEME</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>
  <span class="kw">import type</span> {'{'} <span class="obj">ChartType</span>, <span class="obj">TimeFrame</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

  <span class="kw">interface</span> <span class="obj">Props</span> {'{'}
    symbol?: <span class="obj">string</span>
    timeframe?: <span class="obj">TimeFrame</span>
    chartType?: <span class="obj">ChartType</span>
  {'}'}

  <span class="kw">let</span> {'{'} symbol = <span class="str">'BTCUSDT'</span>, timeframe = <span class="str">'5m'</span>, chartType = <span class="str">'candlestick'</span> {'}'}: <span class="obj">Props</span> = <span class="fn">$props</span>()
  <span class="kw">let</span> container: <span class="obj">HTMLDivElement</span>
  <span class="kw">let</span> chart: <span class="obj">Chart</span> | <span class="bool">null</span> = <span class="bool">null</span>

  <span class="fn">onMount</span>(() =&gt; {'{'}
    chart = <span class="kw">new</span> <span class="fn">Chart</span>(container, {'{'}
      chartType,
      theme: <span class="obj">DARK_THEME</span>,
      autoScale: <span class="bool">true</span>,
      features: {'{'} drawings: <span class="bool">true</span>, indicators: <span class="bool">true</span>, volume: <span class="bool">true</span> {'}'},
    {'}'})

    <span class="kw">const</span> adapter = <span class="kw">new</span> <span class="fn">BinanceAdapter</span>()
    chart.<span class="fn">connect</span>({'{'} adapter, symbol, timeframe {'}'})
  {'}'})

  <span class="fn">onDestroy</span>(() =&gt; chart?.<span class="fn">destroy</span>())

  <span class="cmt">// React to prop changes</span>
  <span class="fn">$effect</span>(() =&gt; {'{'}
    <span class="kw">if</span> (!chart) <span class="kw">return</span>
    chart.<span class="fn">disconnectStream</span>()
    <span class="kw">const</span> adapter = <span class="kw">new</span> <span class="fn">BinanceAdapter</span>()
    chart.<span class="fn">connect</span>({'{'} adapter, symbol, timeframe {'}'})
  {'}'})
&lt;/<span class="obj">script</span>&gt;

&lt;<span class="obj">div</span> bind:this={'{'}container{'}'} style=<span class="str">"width: 100%; height: 600px"</span> /&gt;</pre>
        </div>
        <div class="stackblitz-bar">
          <button class="stackblitz-btn" onclick={openSvelteSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
      </div>

      <div class="code-tab-panel" id="tab-vue">
        <div class="code-body">
          <pre><span class="cmt">&lt;!-- TradingChart.vue --&gt;</span>
&lt;<span class="obj">template</span>&gt;
  &lt;<span class="obj">div</span> ref=<span class="str">"chartContainer"</span> style=<span class="str">"width: 100%; height: 600px"</span> /&gt;
&lt;/<span class="obj">template</span>&gt;

&lt;<span class="obj">script</span> setup lang=<span class="str">"ts"</span>&gt;
<span class="kw">import</span> {'{'} ref, onMounted, onUnmounted {'}'} <span class="kw">from</span> <span class="str">'vue'</span>
<span class="kw">import</span> {'{'} <span class="obj">Chart</span>, <span class="obj">BinanceAdapter</span>, <span class="obj">DARK_THEME</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> chartContainer = <span class="fn">ref</span>&lt;<span class="obj">HTMLDivElement</span>&gt;()
<span class="kw">let</span> chart: <span class="obj">Chart</span> | <span class="bool">null</span> = <span class="bool">null</span>

<span class="fn">onMounted</span>(() =&gt; {'{'}
  <span class="kw">if</span> (!chartContainer.value) <span class="kw">return</span>

  chart = <span class="kw">new</span> <span class="fn">Chart</span>(chartContainer.value, {'{'}
    chartType: <span class="str">'candlestick'</span>,
    theme: <span class="obj">DARK_THEME</span>,
    autoScale: <span class="bool">true</span>,
    features: {'{'} drawings: <span class="bool">true</span>, indicators: <span class="bool">true</span>, volume: <span class="bool">true</span> {'}'},
  {'}'})

  <span class="kw">const</span> adapter = <span class="kw">new</span> <span class="fn">BinanceAdapter</span>()
  chart.<span class="fn">connect</span>({'{'} adapter, symbol: <span class="str">'BTCUSDT'</span>, timeframe: <span class="str">'5m'</span> {'}'})
{'}'})

<span class="fn">onUnmounted</span>(() =&gt; chart?.<span class="fn">destroy</span>())
&lt;/<span class="obj">script</span>&gt;</pre>
        </div>
        <div class="stackblitz-bar">
          <button class="stackblitz-btn" onclick={openVueSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
      </div>
    </div>

    <!-- Try in StackBlitz -->
    <div class="sandbox-cards">
      <h3 class="sandbox-cards-title">Try in StackBlitz</h3>
      <div class="sandbox-cards-grid">
        <div class="sandbox-card">
          <div class="sandbox-card-name">Vanilla JS</div>
          <p class="sandbox-card-desc">Minimal setup with a live chart</p>
          <button class="stackblitz-btn" onclick={openVanillaSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
        <div class="sandbox-card">
          <div class="sandbox-card-name">React</div>
          <p class="sandbox-card-desc">Minimal setup with a live chart</p>
          <button class="stackblitz-btn" onclick={openReactSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
        <div class="sandbox-card">
          <div class="sandbox-card-name">Svelte</div>
          <p class="sandbox-card-desc">Minimal setup with a live chart</p>
          <button class="stackblitz-btn" onclick={openSvelteSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
        <div class="sandbox-card">
          <div class="sandbox-card-name">Vue</div>
          <p class="sandbox-card-desc">Minimal setup with a live chart</p>
          <button class="stackblitz-btn" onclick={openVueSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
        <div class="sandbox-card">
          <div class="sandbox-card-name">Widget</div>
          <p class="sandbox-card-desc">Complete UI with toolbar and drawing sidebar</p>
          <button class="stackblitz-btn" onclick={openWidgetSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
        <div class="sandbox-card">
          <div class="sandbox-card-name">Waterfall + Gauge</div>
          <p class="sandbox-card-desc">P&L attribution and Fear & Greed gauge</p>
          <button class="stackblitz-btn" onclick={openFinanceChartsSandbox}>
            <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
            Open in StackBlitz
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Widget -->
  <section class="doc-section" id="widget">
    <h2 class="section-title">ChartWidget</h2>
    <p class="section-subtitle">Complete TradingView-like experience in one line. Zero framework dependencies.</p>

    <h3>Basic Usage</h3>
    <p class="doc-text">Import <code>ChartWidget</code> from the <code>@tradecanvas/chart/widget</code> subpath. Pass a container element and options — the widget handles all UI.</p>
    <div class="code-block">
      <div class="code-header"><span>Widget — basic</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">ChartWidget</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart/widget'</span>
<span class="kw">import</span> {'{'} <span class="obj">BinanceAdapter</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> widget = <span class="kw">new</span> <span class="fn">ChartWidget</span>(document.<span class="fn">getElementById</span>(<span class="str">'chart'</span>)!, {'{'}
  symbol: <span class="str">'BTCUSDT'</span>,
  timeframe: <span class="str">'5m'</span>,
  adapter: <span class="kw">new</span> <span class="fn">BinanceAdapter</span>(),
  theme: <span class="str">'dark'</span>,
{'}'})</pre>
      </div>
    </div>

    <h3>Advanced Usage with Callbacks</h3>
    <p class="doc-text">Use callbacks to react to user interactions. The <code>onReady</code> callback fires when the underlying chart is fully initialized.</p>
    <div class="code-block">
      <div class="code-header"><span>Widget — advanced</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">const</span> widget = <span class="kw">new</span> <span class="fn">ChartWidget</span>(container, {'{'}
  symbol: <span class="str">'ETHUSDT'</span>,
  timeframe: <span class="str">'15m'</span>,
  adapter: <span class="kw">new</span> <span class="fn">BinanceAdapter</span>(),
  theme: <span class="str">'dark'</span>,
  toolbar: <span class="bool">true</span>,
  drawingTools: <span class="bool">true</span>,
  settings: <span class="bool">true</span>,
  statusBar: <span class="bool">true</span>,
  symbols: [<span class="str">'BTCUSDT'</span>, <span class="str">'ETHUSDT'</span>, <span class="str">'SOLUSDT'</span>],
  onSymbolChange: (symbol) =&gt; console.<span class="fn">log</span>(<span class="str">'Symbol:'</span>, symbol),
  onTimeframeChange: (tf) =&gt; console.<span class="fn">log</span>(<span class="str">'Timeframe:'</span>, tf),
  onReady: (chart) =&gt; {'{'}
    chart.<span class="fn">addIndicator</span>(<span class="str">'sma'</span>, {'{'} period: <span class="bool">20</span> {'}'})
    chart.<span class="fn">addIndicator</span>(<span class="str">'rsi'</span>)
  {'}'},
{'}'})</pre>
      </div>
    </div>

    <h3>Direct Chart API Access</h3>
    <p class="doc-text">Use <code>widget.getChart()</code> to access the underlying <code>Chart</code> instance for full programmatic control.</p>
    <div class="code-block">
      <div class="code-header"><span>widget.getChart()</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">const</span> chart = widget.<span class="fn">getChart</span>()

<span class="cmt">// Add indicators programmatically</span>
chart.<span class="fn">addIndicator</span>(<span class="str">'bollinger'</span>)

<span class="cmt">// Listen to chart events</span>
chart.<span class="fn">on</span>(<span class="str">'barClick'</span>, (e) =&gt; console.<span class="fn">log</span>(e.payload))

<span class="cmt">// Trading overlay</span>
chart.<span class="fn">setPositions</span>([{'{'}
  id: <span class="str">'pos-1'</span>,
  side: <span class="str">'buy'</span>,
  entryPrice: <span class="bool">3500</span>,
  quantity: <span class="bool">1.5</span>,
  stopLoss: <span class="bool">3400</span>,
  takeProfit: <span class="bool">3700</span>,
{'}'}])

<span class="cmt">// Change symbol/timeframe</span>
widget.<span class="fn">setSymbol</span>(<span class="str">'SOLUSDT'</span>)
widget.<span class="fn">setTimeframe</span>(<span class="str">'1h'</span>)

<span class="cmt">// Clean up</span>
widget.<span class="fn">destroy</span>()</pre>
      </div>
    </div>

    <h3>Widget Options</h3>
    <table class="doc-table">
      <thead>
        <tr>
          <th>Option</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><code>symbol</code></td><td><code>string</code></td><td><code>'BTCUSDT'</code></td><td>Initial trading symbol</td></tr>
        <tr><td><code>timeframe</code></td><td><code>TimeFrame</code></td><td><code>'5m'</code></td><td>Initial timeframe</td></tr>
        <tr><td><code>theme</code></td><td><code>'dark' | 'light' | Theme</code></td><td><code>'dark'</code></td><td>Chart theme</td></tr>
        <tr><td><code>adapter</code></td><td><code>DataAdapter</code></td><td>--</td><td>Data source adapter</td></tr>
        <tr><td><code>toolbar</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show top toolbar</td></tr>
        <tr><td><code>drawingTools</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show left drawing sidebar</td></tr>
        <tr><td><code>settings</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show settings button</td></tr>
        <tr><td><code>trading</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable trading overlay</td></tr>
        <tr><td><code>statusBar</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show bottom status bar</td></tr>
        <tr><td><code>symbols</code></td><td><code>string[]</code></td><td>BTC/ETH/SOL/BNB</td><td>Available symbols</td></tr>
        <tr><td><code>timeframes</code></td><td><code>TimeFrame[]</code></td><td>1m to 1d</td><td>Available timeframes</td></tr>
        <tr><td><code>chartTypes</code></td><td><code>ChartType[]</code></td><td>7 types</td><td>Available chart types</td></tr>
        <tr><td><code>onSymbolChange</code></td><td><code>(symbol) =&gt; void</code></td><td>--</td><td>Symbol change callback</td></tr>
        <tr><td><code>onTimeframeChange</code></td><td><code>(tf) =&gt; void</code></td><td>--</td><td>Timeframe change callback</td></tr>
        <tr><td><code>onReady</code></td><td><code>(chart) =&gt; void</code></td><td>--</td><td>Fired when chart is ready</td></tr>
      </tbody>
    </table>

    <h3>Widget vs Headless</h3>
    <table class="doc-table">
      <thead>
        <tr>
          <th></th>
          <th><code>Chart</code> (headless)</th>
          <th><code>ChartWidget</code></th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Import</td><td><code>@tradecanvas/chart</code></td><td><code>@tradecanvas/chart/widget</code></td></tr>
        <tr><td>UI included</td><td>None -- build your own</td><td>Complete toolbar, sidebar, settings</td></tr>
        <tr><td>Bundle impact</td><td>~50 KB gzip</td><td>~65 KB gzip (includes UI)</td></tr>
        <tr><td>Framework</td><td>Any (React, Vue, Svelte, vanilla)</td><td>Vanilla JS DOM (works everywhere)</td></tr>
        <tr><td>Customization</td><td>Full control</td><td>Toggle sections on/off</td></tr>
        <tr><td>Advanced access</td><td>Direct API</td><td><code>widget.getChart()</code> for direct API</td></tr>
      </tbody>
    </table>

    <!-- Widget StackBlitz -->
    <div class="stackblitz-row">
      <button class="stackblitz-btn" onclick={openWidgetSandbox}>
        <svg width="14" height="14" viewBox="0 0 28 28" fill="currentColor"><polygon points="12.5 2 3 22 13 22 15.5 26 25 6 15 6"/></svg>
        Open Widget in StackBlitz
      </button>
    </div>
  </section>

  <!-- Integration Guide -->
  <section class="doc-section" id="integration">
    <h2 class="section-title">Integration Guide</h2>
    <p class="section-subtitle">Type-safe integration with custom data feeds, Tauri, and trading backends.</p>

    <h3>Custom Data Adapter</h3>
    <p class="doc-text">Implement the <code>DataAdapter</code> interface to connect any data source. The library uses an observer pattern: <code>connect()</code> to start, <code>on()</code> for events, <code>disconnect()</code> to stop.</p>
    <div class="code-block">
      <div class="code-header"><span>Custom adapter</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import type</span> {'{'} <span class="obj">DataAdapter</span>, <span class="obj">DataAdapterConfig</span>, <span class="obj">DataAdapterEventType</span>,
  <span class="obj">OHLCBar</span>, <span class="obj">TimeFrame</span>, <span class="obj">ConnectionState</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>
<span class="kw">import</span> {'{'} <span class="fn">normalizeBar</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">class</span> <span class="obj">TauriAdapter</span> <span class="kw">implements</span> <span class="obj">DataAdapter</span> {'{'}
  readonly name = <span class="str">'tauri'</span>

  <span class="fn">connect</span>(config: <span class="obj">DataAdapterConfig</span>): <span class="kw">void</span> {'{'}
    <span class="cmt">// Subscribe to Tauri events</span>
    listen(<span class="str">'feed:message'</span>, (msg) =&gt; {'{'}
      <span class="cmt">// Wire format {'{'} t, o, h, l, c, v {'}'} to OHLCBar</span>
      <span class="kw">const</span> bar = <span class="fn">normalizeBar</span>(msg.payload)
      this.<span class="fn">emit</span>(<span class="str">'bar'</span>, {'{'} bar, closed: msg.payload.closed {'}'})
    {'}'})
  {'}'}
  <span class="cmt">// ... disconnect(), fetchHistory(), on(), off(), dispose()</span>
{'}'}</pre>
      </div>
    </div>

    <h3>Timestamp Normalization</h3>
    <p class="doc-text">Your backend may send timestamps in seconds or milliseconds, and field names may differ (<code>t</code> vs <code>time</code>). Use the built-in normalizers:</p>
    <div class="code-block">
      <div class="code-header"><span>Normalize wire data</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="fn">normalizeBar</span>, <span class="fn">normalizeBarTime</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="cmt">// Wire format → OHLCBar (auto-detects seconds vs ms)</span>
<span class="fn">normalizeBar</span>({'{'} t: <span class="bool">1700000000</span>, o: <span class="bool">100</span>, h: <span class="bool">105</span>, l: <span class="bool">98</span>, c: <span class="bool">103</span>, v: <span class="bool">1500</span> {'}'})
<span class="cmt">// =&gt; {'{'} time: 1700000000000, open: 100, high: 105, ... {'}'}</span>

<span class="cmt">// Just normalize timestamp</span>
<span class="fn">normalizeBarTime</span>(<span class="bool">1700000000</span>)    <span class="cmt">// =&gt; 1700000000000 (seconds to ms)</span>
<span class="fn">normalizeBarTime</span>(<span class="bool">1700000000000</span>) <span class="cmt">// =&gt; 1700000000000 (already ms)</span></pre>
      </div>
    </div>

    <h3>Typed Event Payloads</h3>
    <p class="doc-text">All chart events have typed payloads via <code>ChartEventMap</code>. TypeScript infers the payload type from the event name — no runtime guards needed.</p>
    <div class="code-block">
      <div class="code-header"><span>Typed events</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Payload is typed as {'{'} orderId: string; newPrice: number {'}'}</span>
chart.<span class="fn">on</span>(<span class="str">'orderModify'</span>, (e) =&gt; {'{'}
  <span class="fn">updateOrder</span>(e.payload.orderId, e.payload.newPrice)
{'}'})

<span class="cmt">// Payload is typed as {'{'} positionId: string; stopLoss?: number; takeProfit?: number {'}'}</span>
chart.<span class="fn">on</span>(<span class="str">'positionModify'</span>, (e) =&gt; {'{'}
  <span class="fn">updatePosition</span>(e.payload.positionId, e.payload)
{'}'})

<span class="cmt">// Payload is typed as {'{'} side, type, price {'}'}</span>
chart.<span class="fn">on</span>(<span class="str">'orderPlace'</span>, (e) =&gt; {'{'}
  <span class="fn">placeOrder</span>(e.payload)
{'}'})</pre>
      </div>
    </div>

    <h3>Timeframe Switching</h3>
    <div class="code-block">
      <div class="code-header"><span>Switch timeframe</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Switch timeframe on active stream (no destroy/rebuild)</span>
<span class="kw">await</span> chart.<span class="fn">setTimeframe</span>(<span class="str">'1H'</span>)

<span class="cmt">// Or switch both symbol and timeframe</span>
<span class="kw">await</span> chart.<span class="fn">switchStream</span>(<span class="str">'ETHUSDT'</span>, <span class="str">'15m'</span>)</pre>
      </div>
    </div>

    <h3>Reconnect Catch-Up</h3>
    <div class="code-block">
      <div class="code-header"><span>Bulk append</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// After reconnect, append missed bars in one call</span>
<span class="cmt">// (recalculates indicators once, not per-bar)</span>
<span class="kw">const</span> missedBars = <span class="kw">await</span> <span class="fn">fetchMissedBars</span>(lastTimestamp)
chart.<span class="fn">appendBars</span>(missedBars)

<span class="cmt">// Show connection status in the legend</span>
chart.<span class="fn">setStatusText</span>(<span class="str">'LIVE · 8ms'</span>)</pre>
      </div>
    </div>

    <h3>Terminal Theme</h3>
    <div class="code-block">
      <div class="code-header"><span>DARK_TERMINAL preset</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">DARK_TERMINAL</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="cmt">// Fintech terminal: #0E0E0E bg, #00FF87/#FF3B4D candles, monospace font</span>
<span class="kw">const</span> chart = <span class="kw">new</span> <span class="fn">Chart</span>(el, {'{'}
  chartType: <span class="str">'candlestick'</span>,
  theme: <span class="obj">DARK_TERMINAL</span>,
{'}'})</pre>
      </div>
    </div>
  </section>

  <!-- Data Format -->
  <section class="doc-section" id="data">
    <h2 class="section-title">Data Format</h2>
    <p class="section-subtitle">All chart data uses the OHLCBar interface.</p>

    <div class="code-block">
      <div class="code-header"><span>OHLCBar Interface</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">interface</span> <span class="obj">OHLCBar</span> {'{'}
  time: <span class="fn">number</span>    <span class="cmt">// Unix timestamp in milliseconds</span>
  open: <span class="fn">number</span>    <span class="cmt">// Opening price</span>
  high: <span class="fn">number</span>    <span class="cmt">// Highest price in the period</span>
  low: <span class="fn">number</span>     <span class="cmt">// Lowest price in the period</span>
  close: <span class="fn">number</span>   <span class="cmt">// Closing price</span>
  volume: <span class="fn">number</span>  <span class="cmt">// Trading volume</span>
{'}'}</pre>
      </div>
    </div>

    <h3>1. Static Data</h3>
    <p>Load an array of bars directly. The array must be sorted by time ascending.</p>
    <div class="code-block">
      <div class="code-header"><span>Static data</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">const</span> bars = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">'/api/bars'</span>).<span class="fn">then</span>(r =&gt; r.<span class="fn">json</span>())
chart.<span class="fn">setData</span>(bars)</pre>
      </div>
    </div>

    <h3>2. Real-Time Streaming</h3>
    <p>Connect to a live data source using an adapter.</p>
    <div class="code-block">
      <div class="code-header"><span>Streaming</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">BinanceAdapter</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> adapter = <span class="kw">new</span> <span class="fn">BinanceAdapter</span>()

<span class="kw">await</span> chart.<span class="fn">connect</span>({'{'}
  adapter,
  symbol: <span class="str">'ETHUSDT'</span>,
  timeframe: <span class="str">'1h'</span>,
  historyLimit: <span class="bool">500</span>,
  autoScroll: <span class="bool">true</span>,
{'}'})

<span class="cmt">// Switch symbol/timeframe without destroying</span>
<span class="kw">await</span> chart.<span class="fn">switchStream</span>(<span class="str">'SOLUSDT'</span>, <span class="str">'15m'</span>)

<span class="cmt">// Disconnect when done</span>
chart.<span class="fn">disconnectStream</span>()</pre>
      </div>
    </div>

    <h3>3. Manual Updates</h3>
    <p>Append new bars, update the last bar from trade ticks, or set the current price line.</p>
    <div class="code-block">
      <div class="code-header"><span>Manual updates</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Append a new completed bar</span>
chart.<span class="fn">appendBar</span>({'{'}
  time: <span class="bool">1700003600000</span>,
  open: <span class="bool">110</span>, high: <span class="bool">115</span>, low: <span class="bool">108</span>, close: <span class="bool">113</span>,
  volume: <span class="bool">3200</span>,
{'}'})

<span class="cmt">// Update the last (current) bar in-place</span>
chart.<span class="fn">updateLastBar</span>({'{'}
  time: <span class="bool">1700003600000</span>,
  open: <span class="bool">110</span>, high: <span class="bool">116</span>, low: <span class="bool">108</span>, close: <span class="bool">114</span>,
  volume: <span class="bool">3500</span>,
{'}'})

<span class="cmt">// Update from a single tick</span>
chart.<span class="fn">updateLastBarFromTick</span>({'{'} price: <span class="bool">114.5</span>, volume: <span class="bool">50</span>, time: Date.<span class="fn">now</span>() {'}'})

<span class="cmt">// Move the current price marker line</span>
chart.<span class="fn">setCurrentPrice</span>(<span class="bool">114.5</span>)</pre>
      </div>
    </div>
  </section>

  <!-- Custom Adapter -->
  <section class="doc-section" id="custom-adapter">
    <h2 class="section-title">Custom Data Adapter</h2>
    <p class="section-subtitle">Build your own data source by implementing the DataAdapter interface.</p>

    <div class="code-block">
      <div class="code-header"><span>DataAdapter Interface</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">interface</span> <span class="obj">DataAdapter</span> {'{'}
  <span class="kw">readonly</span> name: <span class="fn">string</span>
  <span class="fn">connect</span>(config: <span class="obj">DataAdapterConfig</span>): <span class="fn">void</span>
  <span class="fn">disconnect</span>(): <span class="fn">void</span>
  <span class="fn">getConnectionState</span>(): <span class="obj">ConnectionState</span>
  <span class="fn">fetchHistory</span>(symbol: <span class="fn">string</span>, timeframe: <span class="obj">TimeFrame</span>, limit?: <span class="fn">number</span>): <span class="obj">Promise</span>&lt;<span class="obj">OHLCBar</span>[]&gt;
  <span class="fn">on</span>(event: <span class="obj">DataAdapterEventType</span>, listener: <span class="obj">Function</span>): <span class="fn">void</span>
  <span class="fn">off</span>(event: <span class="obj">DataAdapterEventType</span>, listener: <span class="obj">Function</span>): <span class="fn">void</span>
  <span class="fn">dispose</span>(): <span class="fn">void</span>
{'}'}</pre>
      </div>
    </div>
  </section>

  <!-- Locale Formatting -->
  <section class="doc-section" id="locale">
    <h2 class="section-title">Number Locale</h2>
    <p class="section-subtitle">Control thousand separators and decimal symbols to match your users' locale.</p>

    <p class="doc-text">Set a BCP 47 locale in the chart options. Affects price axis labels, crosshair tooltip, indicator legend, and trading overlay values.</p>

    <div class="code-block">
      <div class="code-header"><span>Locale options</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">const</span> chart = <span class="kw">new</span> <span class="fn">Chart</span>(el, {'{'}
  chartType: <span class="str">'candlestick'</span>,
  numberLocale: <span class="str">'en-US'</span>,     <span class="cmt">// 65,234.00 (default)</span>
{'}'})

<span class="cmt">// European — dot as thousand separator, comma as decimal</span>
chart.<span class="fn">setNumberLocale</span>(<span class="str">'de-DE'</span>)  <span class="cmt">// 65.234,00</span>

<span class="cmt">// Vietnamese</span>
chart.<span class="fn">setNumberLocale</span>(<span class="str">'vi-VN'</span>)  <span class="cmt">// 65.234,00</span>

<span class="cmt">// Indian (grouping: 65,234 → 65,234 / 12,34,567 for larger numbers)</span>
chart.<span class="fn">setNumberLocale</span>(<span class="str">'en-IN'</span>)  <span class="cmt">// 65,234.00</span></pre>
      </div>
    </div>

    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Locale</th><th>Example</th><th>Thousand separator</th><th>Decimal</th></tr></thead>
        <tbody>
          <tr><td><code>en-US</code></td><td><code>65,234.00</code></td><td>comma</td><td>period</td></tr>
          <tr><td><code>de-DE</code></td><td><code>65.234,00</code></td><td>period</td><td>comma</td></tr>
          <tr><td><code>fr-FR</code></td><td><code>65 234,00</code></td><td>space</td><td>comma</td></tr>
          <tr><td><code>vi-VN</code></td><td><code>65.234,00</code></td><td>period</td><td>comma</td></tr>
          <tr><td><code>en-IN</code></td><td><code>65,234.00</code></td><td>comma (Indian grouping)</td><td>period</td></tr>
          <tr><td><code>ja-JP</code></td><td><code>65,234.00</code></td><td>comma</td><td>period</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Themes -->
  <section class="doc-section" id="themes">
    <h2 class="section-title">Theme Customization</h2>
    <p class="section-subtitle">Use built-in themes or create your own.</p>

    <h3>Built-In Themes</h3>
    <div class="code-block">
      <div class="code-header"><span>Themes</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">DARK_THEME</span>, <span class="obj">LIGHT_THEME</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

chart.<span class="fn">setTheme</span>(<span class="obj">DARK_THEME</span>)
chart.<span class="fn">setTheme</span>(<span class="obj">LIGHT_THEME</span>)
chart.<span class="fn">setTheme</span>(<span class="str">'dark'</span>)  <span class="cmt">// string shorthand also works</span></pre>
      </div>
    </div>

    <h3>Theme Properties</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>name</code></td><td><code>string</code></td><td>Theme identifier</td></tr>
          <tr><td><code>background</code></td><td><code>string</code></td><td>Chart background color</td></tr>
          <tr><td><code>text</code></td><td><code>string</code></td><td>Primary text color</td></tr>
          <tr><td><code>textSecondary</code></td><td><code>string</code></td><td>Secondary/muted text</td></tr>
          <tr><td><code>grid</code></td><td><code>string</code></td><td>Grid line color</td></tr>
          <tr><td><code>crosshair</code></td><td><code>string</code></td><td>Crosshair line color</td></tr>
          <tr><td><code>candleUp</code></td><td><code>string</code></td><td>Bullish candle body</td></tr>
          <tr><td><code>candleDown</code></td><td><code>string</code></td><td>Bearish candle body</td></tr>
          <tr><td><code>candleUpWick</code></td><td><code>string</code></td><td>Bullish wick</td></tr>
          <tr><td><code>candleDownWick</code></td><td><code>string</code></td><td>Bearish wick</td></tr>
          <tr><td><code>lineColor</code></td><td><code>string</code></td><td>Line chart color</td></tr>
          <tr><td><code>volumeUp</code></td><td><code>string</code></td><td>Volume bar (up)</td></tr>
          <tr><td><code>volumeDown</code></td><td><code>string</code></td><td>Volume bar (down)</td></tr>
          <tr><td><code>font</code></td><td><code>FontConfig</code></td><td>Font family and sizes</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Partial Override</h3>
    <div class="code-block">
      <div class="code-header"><span>Custom theme</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre>chart.<span class="fn">setTheme</span>({'{'}
  ...<span class="obj">DARK_THEME</span>,
  candleUp: <span class="str">'#00ff88'</span>,
  candleDown: <span class="str">'#ff3366'</span>,
  background: <span class="str">'#000000'</span>,
{'}'} )</pre>
      </div>
    </div>

    <h3>Runtime Toggles</h3>
    <div class="code-block">
      <div class="code-header"><span>Runtime</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre>chart.<span class="fn">setGridVisible</span>(<span class="bool">false</span>)
chart.<span class="fn">setVolumeVisible</span>(<span class="bool">false</span>)
chart.<span class="fn">setTooltipVisible</span>(<span class="bool">true</span>)
chart.<span class="fn">setCrosshairMode</span>(<span class="str">'magnet'</span>)
chart.<span class="fn">setAutoScale</span>(<span class="bool">true</span>)
chart.<span class="fn">setLogScale</span>(<span class="bool">true</span>)</pre>
      </div>
    </div>
  </section>

  <!-- Indicators -->
  <section class="doc-section" id="indicators">
    <h2 class="section-title">Indicators</h2>
    <p class="section-subtitle">33 built-in technical indicators, fully computed on the client.</p>

    <h3>Available Indicators</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Default Params</th></tr></thead>
        <tbody>
          <tr><td><code>sma</code></td><td>Simple Moving Average</td><td>overlay</td><td><code>period: 20</code></td></tr>
          <tr><td><code>ema</code></td><td>Exponential Moving Average</td><td>overlay</td><td><code>period: 20</code></td></tr>
          <tr><td><code>bb</code></td><td>Bollinger Bands</td><td>overlay</td><td><code>period: 20, stdDev: 2</code></td></tr>
          <tr><td><code>vwap</code></td><td>Volume Weighted Avg Price</td><td>overlay</td><td>(none)</td></tr>
          <tr><td><code>ichimoku</code></td><td>Ichimoku Cloud</td><td>overlay</td><td><code>tenkan: 9, kijun: 26, senkou: 52</code></td></tr>
          <tr><td><code>rsi</code></td><td>Relative Strength Index</td><td>panel</td><td><code>period: 14</code></td></tr>
          <tr><td><code>macd</code></td><td>MACD</td><td>panel</td><td><code>fast: 12, slow: 26, signal: 9</code></td></tr>
          <tr><td><code>stochastic</code></td><td>Stochastic Oscillator</td><td>panel</td><td><code>kPeriod: 14, dPeriod: 3</code></td></tr>
          <tr><td><code>atr</code></td><td>Average True Range</td><td>panel</td><td><code>period: 14</code></td></tr>
          <tr><td><code>obv</code></td><td>On Balance Volume</td><td>panel</td><td>(none)</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Usage</h3>
    <div class="code-block">
      <div class="code-header"><span>Indicators API</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Add an indicator -- returns an instanceId</span>
<span class="kw">const</span> rsiId = chart.<span class="fn">addIndicator</span>(<span class="str">'rsi'</span>, {'{'} period: <span class="bool">21</span> {'}'})

<span class="cmt">// Update parameters</span>
chart.<span class="fn">updateIndicator</span>(rsiId, {'{'} period: <span class="bool">7</span> {'}'})

<span class="cmt">// List active indicators</span>
<span class="kw">const</span> active = chart.<span class="fn">getActiveIndicators</span>()

<span class="cmt">// Remove</span>
chart.<span class="fn">removeIndicator</span>(rsiId)</pre>
      </div>
    </div>
  </section>

  <!-- Drawing Tools -->
  <section class="doc-section" id="drawings">
    <h2 class="section-title">Drawing Tools</h2>
    <p class="section-subtitle">23 drawing tools with magnet snapping, undo/redo, and full serialization.</p>

    <h3>Available Tools</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Type</th><th>Name</th><th>Anchors</th></tr></thead>
        <tbody>
          <tr><td><code>trendLine</code></td><td>Trend Line</td><td>2</td></tr>
          <tr><td><code>ray</code></td><td>Ray</td><td>2</td></tr>
          <tr><td><code>horizontalLine</code></td><td>Horizontal Line</td><td>1</td></tr>
          <tr><td><code>verticalLine</code></td><td>Vertical Line</td><td>1</td></tr>
          <tr><td><code>parallelChannel</code></td><td>Parallel Channel</td><td>3</td></tr>
          <tr><td><code>fibRetracement</code></td><td>Fibonacci Retracement</td><td>2</td></tr>
          <tr><td><code>rectangle</code></td><td>Rectangle</td><td>2</td></tr>
          <tr><td><code>ellipse</code></td><td>Ellipse</td><td>2</td></tr>
          <tr><td><code>pitchfork</code></td><td>Andrews' Pitchfork</td><td>3</td></tr>
          <tr><td><code>gannFan</code></td><td>Gann Fan</td><td>2</td></tr>
          <tr><td><code>elliottWave</code></td><td>Elliott Wave</td><td>8</td></tr>
          <tr><td><code>measure</code></td><td>Measure</td><td>2</td></tr>
          <tr><td><code>text</code></td><td>Text Annotation</td><td>1</td></tr>
          <tr><td><code>arrow</code></td><td>Arrow</td><td>2</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Usage</h3>
    <div class="code-block">
      <div class="code-header"><span>Drawing API</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Activate a drawing tool</span>
chart.<span class="fn">setDrawingTool</span>(<span class="str">'fibRetracement'</span>)

<span class="cmt">// Back to select/pointer mode</span>
chart.<span class="fn">setDrawingTool</span>(<span class="bool">null</span>)

<span class="cmt">// Magnet snapping</span>
chart.<span class="fn">setDrawingMagnet</span>(<span class="bool">true</span>)

<span class="cmt">// Undo / redo</span>
chart.<span class="fn">undo</span>()
chart.<span class="fn">redo</span>()

<span class="cmt">// Programmatic access</span>
<span class="kw">const</span> drawings = chart.<span class="fn">getDrawings</span>()
chart.<span class="fn">setDrawings</span>(drawings)
chart.<span class="fn">clearDrawings</span>()</pre>
      </div>
    </div>
  </section>

  <!-- Trading Overlay -->
  <section class="doc-section" id="trading">
    <h2 class="section-title">Trading Overlay</h2>
    <p class="section-subtitle">Render positions, orders, SL/TP directly on the chart with drag-to-modify and trade-on-chart via right-click.</p>

    <h3>Positions and Orders</h3>
    <div class="code-block">
      <div class="code-header"><span>Set positions and orders</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Render open positions with entry line, P&amp;L zone, SL/TP markers</span>
chart.<span class="fn">setPositions</span>([{'{'}
  id: <span class="str">'pos-1'</span>,
  side: <span class="str">'buy'</span>,
  entryPrice: <span class="bool">42500</span>,
  quantity: <span class="bool">0.5</span>,
  stopLoss: <span class="bool">41000</span>,
  takeProfit: <span class="bool">45000</span>,
{'}'}])

<span class="cmt">// Render pending orders as dashed lines (draggable)</span>
chart.<span class="fn">setOrders</span>([{'{'}
  id: <span class="str">'ord-1'</span>,
  side: <span class="str">'buy'</span>,
  type: <span class="str">'limit'</span>,
  price: <span class="bool">40000</span>,
  quantity: <span class="bool">1</span>,
  label: <span class="str">'LIMIT'</span>,
  draggable: <span class="bool">true</span>,
{'}'}])</pre>
      </div>
    </div>

    <h3>Trade on Chart (Right-Click Context Menu)</h3>
    <p class="doc-text">Enable <code>tradingContextMenu</code> to let users right-click the chart and place orders at the clicked price. The chart emits an <code>orderPlace</code> event with the user's intent.</p>
    <div class="code-block">
      <div class="code-header"><span>Trade on chart</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Enable the built-in trading context menu</span>
<span class="kw">const</span> chart = <span class="kw">new</span> <span class="fn">Chart</span>(container, {'{'}
  chartType: <span class="str">'candlestick'</span>,
  features: {'{'}
    trading: <span class="bool">true</span>,
    tradingContextMenu: <span class="bool">true</span>,  <span class="cmt">// enables right-click menu</span>
  {'}'},
{'}'})

<span class="cmt">// Listen for order placement from the context menu</span>
chart.<span class="fn">on</span>(<span class="str">'orderPlace'</span>, (e) =&gt; {'{'}
  <span class="kw">const</span> {'{'} side, type, price {'}'} = e.payload
  <span class="cmt">// side: 'buy' | 'sell'</span>
  <span class="cmt">// type: 'limit' | 'stop'</span>
  <span class="cmt">// price: number (chart price at click position)</span>

  <span class="cmt">// Create the order in your system</span>
  <span class="fn">createOrder</span>({'{'} side, type, price, quantity: <span class="bool">0.1</span> {'}'})
{'}'})</pre>
      </div>
    </div>

    <h3>Drag to Modify</h3>
    <p class="doc-text">Users can drag order lines and SL/TP markers directly on the chart. Listen for modification events to sync with your backend.</p>
    <div class="code-block">
      <div class="code-header"><span>Handle drag events</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Order price changed by dragging</span>
chart.<span class="fn">on</span>(<span class="str">'orderModify'</span>, (e) =&gt; {'{'}
  <span class="kw">const</span> {'{'} orderId, newPrice {'}'} = e.payload
  <span class="fn">updateOrderOnServer</span>(orderId, newPrice)
{'}'})

<span class="cmt">// Position SL/TP changed by dragging</span>
chart.<span class="fn">on</span>(<span class="str">'positionModify'</span>, (e) =&gt; {'{'}
  <span class="kw">const</span> {'{'} positionId, stopLoss, takeProfit {'}'} = e.payload
  <span class="fn">updatePositionOnServer</span>(positionId, {'{'} stopLoss, takeProfit {'}'})
{'}'})</pre>
      </div>
    </div>

    <h3>Configuration</h3>
    <div class="code-block">
      <div class="code-header"><span>Trading config</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Customize trading overlay appearance</span>
chart.<span class="fn">setTradingConfig</span>({'{'}
  pricePrecision: <span class="bool">4</span>,
  orderColors: {'{'} buy: <span class="str">'#26A69A'</span>, sell: <span class="str">'#EF5350'</span> {'}'},
  positionColors: {'{'} profit: <span class="str">'#26A69A'</span>, loss: <span class="str">'#EF5350'</span>, entry: <span class="str">'#2196F3'</span> {'}'},
  contextMenu: {'{'} enabled: <span class="bool">true</span> {'}'},
{'}'})</pre>
      </div>
    </div>

    <h3>Order Matching (Reference Implementation)</h3>
    <p class="doc-text">The chart library renders positions and orders but does not include a matching engine. Here is a reference implementation for matching pending orders against live price ticks on the client side.</p>
    <div class="code-block">
      <div class="code-header"><span>Order matching on price tick</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Simple order matching on price tick</span>
<span class="kw">function</span> <span class="fn">checkOrders</span>(price: <span class="kw">number</span>, orders: TradingOrder[]) {'{'}
  <span class="kw">for</span> (<span class="kw">const</span> order <span class="kw">of</span> orders) {'{'}
    <span class="kw">const</span> filled =
      (order.type === <span class="str">'limit'</span> &amp;&amp; order.side === <span class="str">'buy'</span> &amp;&amp; price &lt;= order.price) ||
      (order.type === <span class="str">'limit'</span> &amp;&amp; order.side === <span class="str">'sell'</span> &amp;&amp; price &gt;= order.price) ||
      (order.type === <span class="str">'stop'</span> &amp;&amp; order.side === <span class="str">'buy'</span> &amp;&amp; price &gt;= order.price) ||
      (order.type === <span class="str">'stop'</span> &amp;&amp; order.side === <span class="str">'sell'</span> &amp;&amp; price &lt;= order.price);

    <span class="kw">if</span> (filled) {'{'}
      <span class="cmt">// Remove order, create position</span>
      chart.<span class="fn">setOrders</span>(orders.<span class="fn">filter</span>(o =&gt; o.id !== order.id));
      chart.<span class="fn">setPositions</span>([...positions, {'{'}
        id: <span class="str">`pos-${'$'}{'{'}Date.now(){'}'}`</span>,
        side: order.side,
        entryPrice: order.price,
        quantity: order.quantity,
        stopLoss: order.side === <span class="str">'buy'</span> ? order.price * <span class="bool">0.98</span> : order.price * <span class="bool">1.02</span>,
        takeProfit: order.side === <span class="str">'buy'</span> ? order.price * <span class="bool">1.04</span> : order.price * <span class="bool">0.96</span>,
      {'}'}]);
    {'}'}
  {'}'}
{'}'}

<span class="cmt">// Check SL/TP on positions</span>
<span class="kw">function</span> <span class="fn">checkStopLoss</span>(price: <span class="kw">number</span>, positions: TradingPosition[]) {'{'}
  <span class="kw">for</span> (<span class="kw">const</span> pos <span class="kw">of</span> positions) {'{'}
    <span class="kw">const</span> hitSL = pos.stopLoss &amp;&amp; (
      (pos.side === <span class="str">'buy'</span> &amp;&amp; price &lt;= pos.stopLoss) ||
      (pos.side === <span class="str">'sell'</span> &amp;&amp; price &gt;= pos.stopLoss)
    );
    <span class="kw">const</span> hitTP = pos.takeProfit &amp;&amp; (
      (pos.side === <span class="str">'buy'</span> &amp;&amp; price &gt;= pos.takeProfit) ||
      (pos.side === <span class="str">'sell'</span> &amp;&amp; price &lt;= pos.takeProfit)
    );

    <span class="kw">if</span> (hitSL || hitTP) {'{'}
      <span class="cmt">// Close position, calculate PnL</span>
      <span class="kw">const</span> pnl = pos.side === <span class="str">'buy'</span>
        ? (price - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - price) * pos.quantity;
      chart.<span class="fn">setPositions</span>(positions.<span class="fn">filter</span>(p =&gt; p.id !== pos.id));
    {'}'}
  {'}'}
{'}'}

<span class="cmt">// Wire to chart events</span>
chart.<span class="fn">on</span>(<span class="str">'crosshairMove'</span>, (e) =&gt; {'{'}
  <span class="kw">const</span> price = e.payload.bar?.close;
  <span class="kw">if</span> (price) {'{'}
    <span class="fn">checkOrders</span>(price, currentOrders);
    <span class="fn">checkStopLoss</span>(price, currentPositions);
  {'}'}
{'}'});</pre>
      </div>
    </div>

    <h3>Spread and Commission</h3>
    <p class="doc-text">For realistic paper trading, apply a spread to the fill price and calculate a commission on each trade.</p>
    <div class="code-block">
      <div class="code-header"><span>Spread and commission calculation</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Calculate fill price with spread</span>
<span class="kw">const</span> spread = <span class="bool">0.05</span>; <span class="cmt">// 0.05%</span>
<span class="kw">const</span> fillPrice = side === <span class="str">'buy'</span>
  ? requestedPrice * (<span class="bool">1</span> + spread / <span class="bool">100</span>)
  : requestedPrice * (<span class="bool">1</span> - spread / <span class="bool">100</span>);

<span class="cmt">// Calculate commission</span>
<span class="kw">const</span> commission = fillPrice * quantity * <span class="bool">0.1</span> / <span class="bool">100</span>; <span class="cmt">// 0.1%</span></pre>
      </div>
    </div>
  </section>

  <!-- Features Config -->
  <section class="doc-section" id="features">
    <h2 class="section-title">Features Config</h2>
    <p class="section-subtitle">Control exactly which features are available to users.</p>

    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>drawings</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable drawing tools</td></tr>
          <tr><td><code>drawingTools</code></td><td><code>DrawingToolType[]</code></td><td><code>[]</code></td><td>Whitelist of allowed drawing tools</td></tr>
          <tr><td><code>trading</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable trading overlay</td></tr>
          <tr><td><code>tradingContextMenu</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Right-click to place orders on chart</td></tr>
          <tr><td><code>indicators</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable indicator engine</td></tr>
          <tr><td><code>panning</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable mouse/touch panning</td></tr>
          <tr><td><code>zooming</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable mouse wheel / pinch zoom</td></tr>
          <tr><td><code>crosshair</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show crosshair</td></tr>
          <tr><td><code>volume</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show volume bars</td></tr>
          <tr><td><code>screenshot</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable screenshot capture</td></tr>
          <tr><td><code>replay</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Enable bar replay</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Examples</h3>
    <div class="code-block">
      <div class="code-header"><span>Feature configs</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Minimal data-only chart</span>
<span class="kw">const</span> minimal = <span class="kw">new</span> <span class="fn">Chart</span>(el, {'{'}
  chartType: <span class="str">'line'</span>,
  features: {'{'} drawings: <span class="bool">false</span>, indicators: <span class="bool">false</span>, trading: <span class="bool">false</span> {'}'},
{'}'})

<span class="cmt">// Update features at runtime</span>
chart.<span class="fn">setFeatures</span>({'{'} drawings: <span class="bool">false</span>, trading: <span class="bool">false</span> {'}'})</pre>
      </div>
    </div>
  </section>

  <!-- Mobile & Touch -->
  <section class="doc-section" id="mobile">
    <h2 class="section-title">Mobile &amp; Touch</h2>
    <p class="section-subtitle">TradeCanvas works on phones and tablets out of the box. Try resizing this page below 768px or open it on a mobile device.</p>

    <h3>Touch Gestures</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Gesture</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>Single-finger drag</td><td>Pan the chart and move the crosshair</td></tr>
          <tr><td>Two-finger pinch</td><td>Zoom in / out, anchored at midpoint</td></tr>
          <tr><td>Two-finger drag</td><td>Pan while pinching</td></tr>
          <tr><td>Tap on order / position</td><td>Select; drag to modify SL / TP / entry</td></tr>
          <tr><td>Tap on drawing handle</td><td>Move handle to reshape</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Responsive Widget Layout</h3>
    <p>Below 768px viewport width, <code>ChartWidget</code> automatically:</p>
    <ul class="doc-list">
      <li>Shrinks the toolbar to 36px and tightens its padding</li>
      <li>Hides the inline indicator chips (still accessible via the <strong>Indicators</strong> menu)</li>
      <li>Hides toolbar separators to save horizontal space</li>
      <li>Shrinks the drawing sidebar to 32px buttons</li>
    </ul>

    <h3>Recommended HTML</h3>
    <p>Make sure your page has the standard mobile viewport meta tag:</p>
    <div class="code-block">
      <div class="code-header"><span>index.html</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre>&lt;<span class="kw">meta</span> name=<span class="str">"viewport"</span> content=<span class="str">"width=device-width, initial-scale=1.0"</span> /&gt;</pre>
      </div>
    </div>

    <h3>Tips</h3>
    <ul class="doc-list">
      <li>Wrap the chart container in a <code>flex: 1</code> or <code>height: 100dvh</code> parent so it fills the screen on mobile.</li>
      <li>Use <code>features.tradingContextMenu: false</code> on touch-only devices — there's no right-click on phones.</li>
      <li>Touch events call <code>preventDefault()</code>, so the chart will not scroll the page while a gesture is in flight.</li>
    </ul>
  </section>

  <!-- Events -->
  <section class="doc-section" id="events">
    <h2 class="section-title">Events</h2>
    <p class="section-subtitle">Subscribe to chart events for custom integrations.</p>

    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Event</th><th>Payload</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>crosshairMove</code></td><td><code>point, bar?, indicatorValues?</code></td><td>Crosshair position changes</td></tr>
          <tr><td><code>click</code></td><td><code>point</code></td><td>Chart area clicked</td></tr>
          <tr><td><code>visibleRangeChange</code></td><td><code>from, to</code></td><td>Visible time range changed</td></tr>
          <tr><td><code>dataUpdate</code></td><td><code>bars</code></td><td>Data array modified</td></tr>
          <tr><td><code>orderModify</code></td><td><code>orderId, newPrice</code></td><td>User drags an order line</td></tr>
          <tr><td><code>positionModify</code></td><td><code>positionId, stopLoss?, takeProfit?</code></td><td>User drags SL/TP</td></tr>
          <tr><td><code>drawingCreate</code></td><td><code>drawing</code></td><td>Drawing completed</td></tr>
          <tr><td><code>drawingRemove</code></td><td><code>drawingId</code></td><td>Drawing deleted</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Usage</h3>
    <div class="code-block">
      <div class="code-header"><span>Events</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre>chart.<span class="fn">on</span>(<span class="str">'crosshairMove'</span>, (e) =&gt; {'{'}
  <span class="kw">const</span> {'{'} bar, indicatorValues {'}'} = e.payload
  <span class="kw">if</span> (bar) <span class="fn">updateInfoPanel</span>(bar)
{'}'})

chart.<span class="fn">on</span>(<span class="str">'orderModify'</span>, (e) =&gt; {'{'}
  <span class="fn">updateOrderOnServer</span>(e.payload.orderId, e.payload.newPrice)
{'}'})

<span class="cmt">// Unsubscribe</span>
<span class="kw">const</span> handler = (e) =&gt; {'{'} <span class="cmt">/* ... */</span> {'}'}
chart.<span class="fn">on</span>(<span class="str">'visibleRangeChange'</span>, handler)
chart.<span class="fn">off</span>(<span class="str">'visibleRangeChange'</span>, handler)</pre>
      </div>
    </div>
  </section>

  <!-- Save / Load -->
  <section class="doc-section" id="state">
    <h2 class="section-title">Save / Load / Export</h2>
    <p class="section-subtitle">Persist chart state and export data in multiple formats.</p>

    <div class="code-block">
      <div class="code-header"><span>State management</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="cmt">// Save to JSON string</span>
<span class="kw">const</span> json = chart.<span class="fn">saveState</span>()

<span class="cmt">// Load from JSON string</span>
chart.<span class="fn">loadState</span>(json)

<span class="cmt">// Save to localStorage</span>
chart.<span class="fn">saveState</span>(<span class="str">'my-chart-key'</span>)
chart.<span class="fn">loadStateFromStorage</span>(<span class="str">'my-chart-key'</span>)

<span class="cmt">// Download / upload file</span>
chart.<span class="fn">downloadState</span>()
<span class="kw">await</span> chart.<span class="fn">loadStateFromFile</span>()

<span class="cmt">// Auto-save</span>
chart.<span class="fn">setAutoSave</span>(<span class="str">'chart-state'</span>, <span class="bool">5000</span>)

<span class="cmt">// Data export</span>
chart.<span class="fn">exportVisibleData</span>(<span class="str">'csv'</span>)
chart.<span class="fn">exportAllData</span>(<span class="str">'json'</span>)</pre>
      </div>
    </div>
  </section>

  <!-- Finance Charts -->
  <section class="doc-section" id="finance">
    <h2 class="section-title">Finance Charts</h2>
    <p class="section-subtitle">Standalone chart components for dashboards, portfolios, and market overviews.</p>

    <h3>SparklineChart</h3>
    <p class="doc-text">Tiny inline chart for dashboards and table cells. No axes, no interaction.</p>
    <div class="code-block">
      <div class="code-header"><span>Sparkline</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">SparklineChart</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> spark = <span class="kw">new</span> <span class="fn">SparklineChart</span>(container, {'{'}
  data: [<span class="bool">100</span>, <span class="bool">102</span>, <span class="bool">98</span>, <span class="bool">105</span>, <span class="bool">110</span>, <span class="bool">108</span>, <span class="bool">112</span>],
  mode: <span class="str">'area'</span>,
  color: <span class="str">'#26A69A'</span>,
  showLastPoint: <span class="bool">true</span>,
  showMinMax: <span class="bool">true</span>,
{'}'})

<span class="cmt">// Update with new data</span>
spark.<span class="fn">update</span>([<span class="bool">100</span>, <span class="bool">103</span>, <span class="bool">99</span>, <span class="bool">107</span>, <span class="bool">115</span>])

<span class="cmt">// Change options</span>
spark.<span class="fn">setOptions</span>({'{'} mode: <span class="str">'line'</span>, color: <span class="str">'#EF5350'</span> {'}'})</pre>
      </div>
    </div>

    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>data</code></td><td><code>number[]</code></td><td>required</td><td>Array of numeric values</td></tr>
          <tr><td><code>mode</code></td><td><code>'line' | 'area'</code></td><td><code>'area'</code></td><td>Render mode</td></tr>
          <tr><td><code>color</code></td><td><code>string</code></td><td>theme.lineColor</td><td>Line stroke color</td></tr>
          <tr><td><code>fillColor</code></td><td><code>string</code></td><td>same as color</td><td>Area gradient top color</td></tr>
          <tr><td><code>lineWidth</code></td><td><code>number</code></td><td><code>1.5</code></td><td>Line stroke width</td></tr>
          <tr><td><code>showLastPoint</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Dot on last value</td></tr>
          <tr><td><code>showMinMax</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Dots on min/max values</td></tr>
        </tbody>
      </table>
    </div>

    <h3>DepthChart</h3>
    <p class="doc-text">Bid/ask order book visualization with cumulative volume step-areas.</p>
    <div class="code-block">
      <div class="code-header"><span>Depth Chart</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">DepthChart</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>
<span class="kw">import type</span> {'{'} <span class="obj">DepthData</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> data: <span class="obj">DepthData</span> = {'{'}
  bids: [
    {'{'} price: <span class="bool">64990</span>, volume: <span class="bool">2.5</span> {'}'},
    {'{'} price: <span class="bool">64980</span>, volume: <span class="bool">1.8</span> {'}'},
    <span class="cmt">// ...more bid levels</span>
  ],
  asks: [
    {'{'} price: <span class="bool">65010</span>, volume: <span class="bool">3.1</span> {'}'},
    {'{'} price: <span class="bool">65020</span>, volume: <span class="bool">2.2</span> {'}'},
    <span class="cmt">// ...more ask levels</span>
  ],
{'}'}

<span class="kw">const</span> depth = <span class="kw">new</span> <span class="fn">DepthChart</span>(container, {'{'}
  data,
  midPriceLine: <span class="bool">true</span>,
  spreadLabel: <span class="bool">true</span>,
  crosshair: <span class="bool">true</span>,
{'}'})

<span class="cmt">// Update with new order book snapshot</span>
depth.<span class="fn">update</span>(newDepthData)</pre>
      </div>
    </div>

    <h3>EquityCurveChart</h3>
    <p class="doc-text">Portfolio equity over time with drawdown shading and optional benchmark comparison.</p>
    <div class="code-block">
      <div class="code-header"><span>Equity Curve</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">EquityCurveChart</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>
<span class="kw">import type</span> {'{'} <span class="obj">EquityPoint</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> equity: <span class="obj">EquityPoint</span>[] = [
  {'{'} time: <span class="bool">1700000000000</span>, value: <span class="bool">10000</span> {'}'},
  {'{'} time: <span class="bool">1700086400000</span>, value: <span class="bool">10250</span> {'}'},
  <span class="cmt">// ...daily portfolio values</span>
]

<span class="kw">const</span> benchmark: <span class="obj">EquityPoint</span>[] = [
  <span class="cmt">// ...S&P 500 or BTC benchmark for comparison</span>
]

<span class="kw">const</span> chart = <span class="kw">new</span> <span class="fn">EquityCurveChart</span>(container, {'{'}
  data: equity,
  drawdown: <span class="bool">true</span>,            <span class="cmt">// red shading below equity peak</span>
  benchmark,
  benchmarkLabel: <span class="str">'S&P 500'</span>,
  crosshair: <span class="bool">true</span>,
{'}'})</pre>
      </div>
    </div>

    <h3>HeatmapChart</h3>
    <p class="doc-text">Colored cell grid for sector or market performance. Supports uniform grid or treemap layout weighted by market cap.</p>
    <div class="code-block">
      <div class="code-header"><span>Heatmap</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">HeatmapChart</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>
<span class="kw">import type</span> {'{'} <span class="obj">HeatmapCell</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> cells: <span class="obj">HeatmapCell</span>[] = [
  {'{'} id: <span class="str">'btc'</span>, label: <span class="str">'BTC'</span>, value: <span class="bool">2.4</span>, weight: <span class="bool">1200</span> {'}'},
  {'{'} id: <span class="str">'eth'</span>, label: <span class="str">'ETH'</span>, value: <span class="bool">-1.2</span>, weight: <span class="bool">400</span> {'}'},
  {'{'} id: <span class="str">'sol'</span>, label: <span class="str">'SOL'</span>, value: <span class="bool">5.1</span>, weight: <span class="bool">65</span> {'}'},
  <span class="cmt">// ...more cells</span>
]

<span class="kw">const</span> heatmap = <span class="kw">new</span> <span class="fn">HeatmapChart</span>(container, {'{'}
  data: cells,
  weighted: <span class="bool">true</span>,            <span class="cmt">// treemap layout by weight</span>
  valueFormat: (v) =&gt; <span class="str">`${'{'}</span>v &gt; <span class="bool">0</span> ? <span class="str">'+'</span> : <span class="str">''</span><span class="str">{'}'}</span><span class="str">${'{'}v.toFixed(1){'}'}</span><span class="str">%`</span>,
  onCellClick: (cell) =&gt; <span class="fn">console</span>.<span class="fn">log</span>(<span class="str">'Clicked:'</span>, cell.label),
{'}'})</pre>
      </div>
    </div>

    <h3>WaterfallChart</h3>
    <p class="doc-text">Visualize running totals with positive/negative contributions. Perfect for P&amp;L attribution, revenue bridges, and cash flow analysis.</p>
    <div class="code-block">
      <div class="code-header"><span>Waterfall</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">WaterfallChart</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>
<span class="kw">import type</span> {'{'} <span class="obj">WaterfallBar</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> data: <span class="obj">WaterfallBar</span>[] = [
  {'{'} label: <span class="str">'Start'</span>, value: <span class="bool">10000</span>, type: <span class="str">'total'</span> {'}'},
  {'{'} label: <span class="str">'BTC Long'</span>, value: <span class="bool">1850</span> {'}'},      <span class="cmt">// positive — green</span>
  {'{'} label: <span class="str">'ETH Short'</span>, value: <span class="bool">-620</span> {'}'},      <span class="cmt">// negative — red</span>
  {'{'} label: <span class="str">'Fees'</span>, value: <span class="bool">-85</span> {'}'},
  {'{'} label: <span class="str">'End'</span>, value: <span class="bool">11145</span>, type: <span class="str">'total'</span> {'}'},
]

<span class="kw">const</span> waterfall = <span class="kw">new</span> <span class="fn">WaterfallChart</span>(container, {'{'}
  data,
  showValues: <span class="bool">true</span>,
  connectorStyle: <span class="str">'dashed'</span>,
  valueFormat: (v) =&gt; <span class="str">`$${'{'}v.toLocaleString(){'}'}</span><span class="str">`</span>,
  crosshair: <span class="bool">true</span>,
{'}'})</pre>
      </div>
    </div>

    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>data</code></td><td><code>WaterfallBar[]</code></td><td>required</td><td>Array of bars with label/value/type</td></tr>
          <tr><td><code>positiveColor</code></td><td><code>string</code></td><td>theme green</td><td>Color for gain bars</td></tr>
          <tr><td><code>negativeColor</code></td><td><code>string</code></td><td>theme red</td><td>Color for loss bars</td></tr>
          <tr><td><code>totalColor</code></td><td><code>string</code></td><td>theme blue</td><td>Color for total bars</td></tr>
          <tr><td><code>connectorStyle</code></td><td><code>'dashed' | 'solid' | 'none'</code></td><td><code>'dashed'</code></td><td>Line between bars</td></tr>
          <tr><td><code>barWidth</code></td><td><code>number</code></td><td><code>0.7</code></td><td>Bar width ratio (0-1)</td></tr>
          <tr><td><code>showValues</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Value labels on bars</td></tr>
        </tbody>
      </table>
    </div>

    <h3>GaugeChart</h3>
    <p class="doc-text">Speedometer-style gauge for KPIs, risk scores, and sentiment indicators. Supports colored zones and smooth value animation.</p>
    <div class="code-block">
      <div class="code-header"><span>Gauge</span><button class="code-copy-btn" data-copy-block>Copy</button></div>
      <div class="code-body">
        <pre><span class="kw">import</span> {'{'} <span class="obj">GaugeChart</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> gauge = <span class="kw">new</span> <span class="fn">GaugeChart</span>(container, {'{'}
  value: <span class="bool">72</span>,
  min: <span class="bool">0</span>,
  max: <span class="bool">100</span>,
  label: <span class="str">'Fear &amp; Greed'</span>,
  zones: [
    {'{'} from: <span class="bool">0</span>, to: <span class="bool">25</span>, color: <span class="str">'#ef4444'</span> {'}'},    <span class="cmt">// extreme fear</span>
    {'{'} from: <span class="bool">25</span>, to: <span class="bool">50</span>, color: <span class="str">'#f59e0b'</span> {'}'},   <span class="cmt">// fear</span>
    {'{'} from: <span class="bool">50</span>, to: <span class="bool">75</span>, color: <span class="str">'#eab308'</span> {'}'},   <span class="cmt">// greed</span>
    {'{'} from: <span class="bool">75</span>, to: <span class="bool">100</span>, color: <span class="str">'#10b981'</span> {'}'},  <span class="cmt">// extreme greed</span>
  ],
  animate: <span class="bool">true</span>,
{'}'})

<span class="cmt">// Smoothly animate to new value</span>
gauge.<span class="fn">setValue</span>(<span class="bool">85</span>)</pre>
      </div>
    </div>

    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>value</code></td><td><code>number</code></td><td>required</td><td>Current gauge value</td></tr>
          <tr><td><code>min</code></td><td><code>number</code></td><td><code>0</code></td><td>Minimum value</td></tr>
          <tr><td><code>max</code></td><td><code>number</code></td><td><code>100</code></td><td>Maximum value</td></tr>
          <tr><td><code>zones</code></td><td><code>GaugeZone[]</code></td><td>—</td><td>Colored range zones</td></tr>
          <tr><td><code>thickness</code></td><td><code>number</code></td><td><code>0.25</code></td><td>Arc thickness (0-1 of radius)</td></tr>
          <tr><td><code>animate</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Smooth animation on setValue</td></tr>
          <tr><td><code>animationDuration</code></td><td><code>number</code></td><td><code>500</code></td><td>Animation duration (ms)</td></tr>
        </tbody>
      </table>
    </div>

    <div class="stackblitz-row">
      <button class="stackblitz-btn" onclick={openFinanceChartsSandbox}>
        Try Waterfall + Gauge in StackBlitz
      </button>
    </div>

    <h3>Shared API</h3>
    <p class="doc-text">All finance charts share these methods:</p>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>update(data)</code></td><td>Replace data and re-render</td></tr>
          <tr><td><code>setOptions(opts)</code></td><td>Update style/config options</td></tr>
          <tr><td><code>setTheme(theme)</code></td><td>Switch between dark/light or custom theme</td></tr>
          <tr><td><code>destroy()</code></td><td>Clean up canvas, observers, and event listeners</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- API Reference -->
  <section class="doc-section" id="api">
    <h2 class="section-title">API Reference</h2>
    <p class="section-subtitle">Complete method reference grouped by category.</p>

    <h3>Data</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>setData(bars)</code></td><td>Load static data array</td></tr>
          <tr><td><code>appendBar(bar)</code></td><td>Append a new bar</td></tr>
          <tr><td><code>updateLastBar(bar)</code></td><td>Replace the last bar</td></tr>
          <tr><td><code>updateLastBarFromTick(tick)</code></td><td>Merge a tick into the current bar</td></tr>
          <tr><td><code>setCurrentPrice(price)</code></td><td>Set the current price line</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Indicators</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>addIndicator(id, params?)</code></td><td>Add indicator, returns instanceId</td></tr>
          <tr><td><code>updateIndicator(instanceId, params)</code></td><td>Update indicator parameters</td></tr>
          <tr><td><code>removeIndicator(instanceId)</code></td><td>Remove indicator</td></tr>
          <tr><td><code>getActiveIndicators()</code></td><td>List active indicators</td></tr>
          <tr><td><code>getAvailableIndicators()</code></td><td>List all available indicators</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Drawings</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>setDrawingTool(type | null)</code></td><td>Activate a drawing tool</td></tr>
          <tr><td><code>setDrawingMagnet(enabled)</code></td><td>Toggle magnet snap</td></tr>
          <tr><td><code>getDrawings()</code></td><td>Get all drawing states</td></tr>
          <tr><td><code>setDrawings(drawings)</code></td><td>Restore drawings</td></tr>
          <tr><td><code>clearDrawings()</code></td><td>Remove all drawings</td></tr>
          <tr><td><code>undo()</code></td><td>Undo last drawing action</td></tr>
          <tr><td><code>redo()</code></td><td>Redo last undone action</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Trading</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>setOrders(orders)</code></td><td>Set pending orders</td></tr>
          <tr><td><code>setPositions(positions)</code></td><td>Set active positions</td></tr>
          <tr><td><code>setTradingConfig(config)</code></td><td>Configure colors, precision</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Streaming</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>connect(config)</code></td><td>Connect to a data adapter</td></tr>
          <tr><td><code>switchStream(symbol, timeframe)</code></td><td>Switch symbol/timeframe</td></tr>
          <tr><td><code>disconnectStream()</code></td><td>Disconnect from data adapter</td></tr>
        </tbody>
      </table>
    </div>

    <h3>Theme &amp; Viewport</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>setTheme(theme)</code></td><td>Apply a theme object</td></tr>
          <tr><td><code>setGridVisible(visible)</code></td><td>Toggle grid lines</td></tr>
          <tr><td><code>setVolumeVisible(visible)</code></td><td>Toggle volume bars</td></tr>
          <tr><td><code>setCrosshairMode(mode)</code></td><td>Set crosshair mode</td></tr>
          <tr><td><code>scrollToEnd()</code></td><td>Scroll to latest bar</td></tr>
          <tr><td><code>fitContent()</code></td><td>Auto-fit all data in view</td></tr>
          <tr><td><code>setAutoScale(enabled)</code></td><td>Auto-fit price range</td></tr>
          <tr><td><code>setLogScale(enabled)</code></td><td>Toggle logarithmic scale</td></tr>
        </tbody>
      </table>
    </div>

    <h3>State &amp; Lifecycle</h3>
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>saveState(key?)</code></td><td>Save chart state to JSON</td></tr>
          <tr><td><code>loadState(json)</code></td><td>Restore chart state</td></tr>
          <tr><td><code>downloadState(filename?)</code></td><td>Download state as .json file</td></tr>
          <tr><td><code>screenshot(filename?)</code></td><td>Download chart as PNG</td></tr>
          <tr><td><code>destroy()</code></td><td>Dispose chart and free resources</td></tr>
          <tr><td><code>on(type, handler)</code></td><td>Subscribe to chart event</td></tr>
          <tr><td><code>off(type, handler)</code></td><td>Unsubscribe from chart event</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Changelog -->
  <section class="doc-section" id="changelog">
    <h2 class="section-title">Changelog</h2>
    <p class="section-subtitle">Release history for @tradecanvas/chart.</p>

    <div class="changelog">
      <div class="changelog-version">
        <h3>0.6.0 <span class="changelog-date">2026-04-28</span></h3>
        <div class="changelog-group">
          <h4>Features</h4>
          <ul>
            <li><strong>7 new indicators</strong> — Hull MA, Pivot Points (Classic), Anchored VWAP, ZigZag, Linear Regression Channel, Awesome Oscillator, Chaikin Oscillator. Total: 33 built-in</li>
            <li><strong>Range Bars chart type</strong> (<code>'rangeBars'</code>) — fixed price-range bars with <code>toRangeBars</code> transform</li>
            <li><strong>Trading overlay customization</strong> — partial-close strip via <code>TradingPosition.closedQuantity</code>, multi-stop P&amp;L color gradient via <code>pnlThresholds</code>, custom label templates via <code>positionLabel</code> with token substitution</li>
            <li><strong>Web Worker indicator pipeline</strong> — <code>IndicatorWorkerHost</code> moves indicator math off the render loop. Promise-based <code>calculate()</code>, sync fallback for SSR/tests, per-request timeout, ping/terminate</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Type safety</h4>
          <ul>
            <li>New <code>getNumberParam</code> / <code>getIntParam</code> helpers — all 25 existing indicators migrated. Invalid params (NaN, Infinity, missing keys, non-numeric strings) fall back to documented defaults</li>
            <li><code>BinanceAdapter</code> REST + WS payloads flow through typed <code>parseRestKline</code> / <code>parseWsKline</code> validators — no more <code>any</code> casts</li>
            <li><code>ChartStateManager.deserialize</code> validates and filters malformed drawings/orders/positions/indicators instead of trusting <code>JSON.parse</code></li>
            <li><code>TextAnnotationTool</code> text resolution moved to a pure <code>resolveAnnotationText</code> helper (no <code>as string</code> cast)</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Internal refactor</h4>
          <ul>
            <li><code>WidgetStyles.ts</code> 764 → 31 LOC; CSS extracted to sibling <code>.css</code> file via Vite <code>?raw</code></li>
            <li>Chart-type dispatch extracted into <code>ChartTypeStrategy</code> (<code>createRendererFor</code>, <code>transformDisplayData</code>)</li>
            <li>Auto-save debounce extracted into <code>AutoSaveScheduler</code></li>
            <li>Indicator panel scaling extracted into <code>computeIndicatorPriceRange</code> (now skips NaN/Infinity)</li>
            <li><code>Chart.ts</code>: 1632 → 1536 LOC</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Tests &amp; CI</h4>
          <ul>
            <li>267 tests across 40 files — Vitest scaffolded in <code>@tradecanvas/core</code> and <code>@tradecanvas/chart</code></li>
            <li>25/33 indicators with direct test coverage</li>
            <li>GitHub Actions CI workflow added</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.5.0 <span class="changelog-date">2026-04-16</span></h3>
        <div class="changelog-group">
          <h4>Features</h4>
          <ul>
            <li><strong>ChartWidget</strong> — built-in TradingView-like UI via <code>@tradecanvas/chart/widget</code>. One-line embed with toolbar, drawing sidebar, settings modal, and status bar</li>
            <li>Typed event payloads via <code>ChartEventMap</code> — no more runtime guards</li>
            <li><code>normalizeBar()</code> converts wire format <code>{'{'} t, o, h, l, c, v {'}'}</code> to OHLCBar</li>
            <li><code>chart.setTimeframe(tf)</code> — switch without destroy/rebuild</li>
            <li><code>chart.appendBars(bars)</code> — bulk reconnect catch-up</li>
            <li><code>chart.setStatusText(text)</code> — show status in legend</li>
            <li><code>DARK_TERMINAL</code> theme preset — fintech terminal palette</li>
            <li><code>DataAdapterEventType</code> exported for type-safe adapters</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.4.0 <span class="changelog-date">2026-04-16</span></h3>
        <div class="changelog-group">
          <h4>Features</h4>
          <ul>
            <li><strong>Locale-aware number formatting</strong> — new <code>numberLocale</code> option (e.g. <code>'de-DE'</code> → 65.234,00)</li>
            <li>Runtime locale change via <code>chart.setNumberLocale()</code></li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Bug Fixes</h4>
          <ul>
            <li>Keyboard shortcuts (arrow keys, +/-, Home/End, Space) were never wired up — now working</li>
            <li>Streaming indicators froze until bar close — now update in real-time on every tick</li>
            <li>StreamManager listener leak on reconnect cycles</li>
            <li>Price formatting now uses thousand separators (65,234.00 vs 65234.00)</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Performance</h4>
          <ul>
            <li>Cached <code>getBoundingClientRect</code> in InteractionManager — major reduction in layout flushes during pan/crosshair</li>
            <li>Replaced <code>structuredClone</code> in drag/resize hot paths (5-10x faster)</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.3.0 <span class="changelog-date">2026-04-16</span></h3>
        <div class="changelog-group">
          <h4>Features</h4>
          <ul>
            <li><code>WaterfallChart</code> — running cumulative bars for P&L attribution, revenue bridge, cash flow</li>
            <li><code>GaugeChart</code> — speedometer-style gauge with colored zones and animated value transitions</li>
            <li>StackBlitz sandbox for Waterfall + Gauge combined demo</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Performance</h4>
          <ul>
            <li>Batched path operations grouped by color (single fill per group)</li>
            <li>Integer pixel rounding for crisp 1px lines</li>
            <li>Cached trig calculations in gauge</li>
            <li>rAF-coalesced animation (safe on rapid <code>setValue</code> calls)</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.2.0 <span class="changelog-date">2026-04-16</span></h3>
        <div class="changelog-group">
          <h4>Features</h4>
          <ul>
            <li>4 finance chart components: <code>SparklineChart</code>, <code>DepthChart</code>, <code>EquityCurveChart</code>, <code>HeatmapChart</code></li>
            <li>Client-side order matching engine with spread and commission</li>
            <li>Trade history with win rate and PnL stats</li>
            <li>Toast notifications for order fills and SL/TP triggers</li>
            <li>StackBlitz sandboxes for Vanilla JS, React, Svelte, Vue</li>
            <li>Finance charts demo section on the demo page</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Bug Fixes</h4>
          <ul>
            <li>Sparkline container bindings in Svelte 5 — use plain array for <code>bind:this</code> in <code>each</code></li>
            <li>BaseFinanceChart re-measures dimensions if 0 on first render</li>
            <li>Rename <code>version</code> and <code>release</code> scripts (npm reserved names)</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.1.3 <span class="changelog-date">2026-04-15</span></h3>
        <div class="changelog-group">
          <h4>Bug Fixes</h4>
          <ul>
            <li>Panel indicators not rendering until chart interaction</li>
            <li>Stop orders showing LIMIT label instead of STOP</li>
            <li>npm publish with <code>workspace:*</code> deps — now using <code>pnpm publish</code></li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Features</h4>
          <ul>
            <li>Auto-scale includes overlay indicator values (Bollinger, Ichimoku, Keltner)</li>
            <li>TC prefix on all generated IDs to prevent collisions</li>
            <li>Trade-on-chart via built-in right-click context menu</li>
            <li>Client-side order matching engine with spread and commission</li>
            <li>Trade history with win rate and PnL stats</li>
            <li>Toast notifications for order fills and SL/TP triggers</li>
            <li><code>Viewport.setPriceRange()</code> — direct price range control</li>
            <li><code>IndicatorEngine.getOverlayPriceRange()</code> — overlay min/max</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.1.2 <span class="changelog-date">2026-04-15</span></h3>
        <div class="changelog-group">
          <h4>Features</h4>
          <ul>
            <li>Svelte 5 demo site with TradingView-style UI</li>
            <li>Developer documentation (11 guide sections)</li>
            <li>StackBlitz sandboxes for Vanilla JS, React, Svelte, Vue</li>
            <li>Paper trading panel with balance and PnL tracking</li>
            <li>Replay button (play/pause/stop) in toolbar</li>
            <li>npm/pnpm/yarn package manager switcher</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Examples</h4>
          <ul>
            <li>Updated basic and vanilla-static examples with modern UI</li>
            <li>Added Svelte 5 example (<code>examples/svelte</code>)</li>
            <li>Added Vue 3 example (<code>examples/vue</code>)</li>
            <li>Updated React example with improved controls</li>
          </ul>
        </div>
        <div class="changelog-group">
          <h4>Documentation</h4>
          <ul>
            <li>Per-package READMEs for npm pages</li>
            <li>Svelte and Vue framework integration guides in README</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.1.1 <span class="changelog-date">2026-04-15</span></h3>
        <div class="changelog-group">
          <h4>Bug Fixes</h4>
          <ul>
            <li>Fix repository URLs pointing to wrong GitHub repo</li>
            <li>Fix all TypeScript declaration errors</li>
            <li>Fix volume type mismatch in DataManager</li>
            <li>Add <code>publishConfig.access: "public"</code> for scoped packages</li>
          </ul>
        </div>
      </div>

      <div class="changelog-version">
        <h3>0.1.0 <span class="changelog-date">2026-04-09</span></h3>
        <div class="changelog-group">
          <h4>Initial Release</h4>
          <ul>
            <li>11 chart types (Candlestick, Line, Area, Heikin-Ashi, Renko, Kagi, ...)</li>
            <li>26 built-in indicators (SMA, EMA, RSI, MACD, Bollinger, Ichimoku, ...)</li>
            <li>23 drawing tools with magnet snapping and undo/redo</li>
            <li>Trading overlay with positions, orders, drag-to-modify SL/TP</li>
            <li>Real-time streaming with built-in Binance adapter</li>
            <li>Save/load chart state, replay mode, screenshots</li>
            <li>Multi-layer canvas rendering, dark/light themes, i18n</li>
            <li>Zero external dependencies</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  </div><!-- /.docs-content -->
</div><!-- /.docs-layout -->

<style>
  /* Docs layout */
  .docs-layout {
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .docs-sidebar {
    width: 200px;
    flex-shrink: 0;
    position: sticky;
    top: 24px;
    align-self: flex-start;
    padding: 24px 0;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .docs-sidebar::-webkit-scrollbar { width: 4px; }
  .docs-sidebar::-webkit-scrollbar-track { background: transparent; }
  .docs-sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .docs-sidebar-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 0 12px 12px;
  }

  :global(.docs-sidebar-link) {
    display: block;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--text-muted);
    text-decoration: none;
    border-left: 2px solid transparent;
    transition: all 150ms ease;
  }

  :global(.docs-sidebar-link:hover) {
    color: var(--text);
  }

  :global(.docs-sidebar-link.active) {
    color: var(--accent);
    border-left-color: var(--accent);
    background: var(--accent-glow);
  }

  .docs-content {
    flex: 1;
    min-width: 0;
    max-width: 900px;
    padding-left: 48px;
  }

  @media (max-width: 1024px) {
    .docs-sidebar {
      display: none;
    }
    .docs-content {
      padding-left: 0;
      max-width: 100%;
    }
  }

  /* Doc sections */
  :global(.doc-section) {
    padding: 80px 0 48px;
    max-width: 900px;
    margin: 0 auto;
  }

  :global(.doc-section .section-title) {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    text-align: center;
    margin-bottom: 12px;
  }

  :global(.doc-section .section-subtitle) {
    text-align: center;
    color: var(--text-dim);
    font-size: 15px;
    margin-bottom: 48px;
    max-width: 540px;
    margin-left: auto;
    margin-right: auto;
  }

  :global(.doc-section h3) {
    font-size: 16px;
    font-weight: 600;
    margin: 36px 0 12px;
    color: var(--text);
  }

  :global(.doc-section h3:first-of-type) {
    margin-top: 0;
  }

  :global(.doc-section p) {
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.7;
    margin-bottom: 16px;
  }

  /* Code blocks */
  :global(.code-block) {
    position: relative;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 24px;
  }

  :global(.code-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
  }

  :global(.code-copy-btn) {
    padding: 4px 10px;
    font-size: 11px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all var(--transition);
  }

  :global(.code-copy-btn:hover) {
    border-color: var(--accent);
    color: var(--text);
  }

  :global(.code-copy-btn.copied) {
    color: var(--green) !important;
    border-color: var(--green) !important;
  }

  :global(.code-body) {
    padding: 20px;
    overflow-x: auto;
  }

  :global(.code-body pre) {
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-dim);
  }

  :global(.code-body .kw) { color: #c084fc; }
  :global(.code-body .fn) { color: #60a5fa; }
  :global(.code-body .str) { color: #34d399; }
  :global(.code-body .cmt) { color: #4a4a5a; }
  :global(.code-body .obj) { color: #f9a8d4; }
  :global(.code-body .bool) { color: #fb923c; }

  :global(body.light .code-body pre) { color: #444466; }
  :global(body.light .code-body .kw) { color: #7c3aed; }
  :global(body.light .code-body .fn) { color: #2563eb; }
  :global(body.light .code-body .str) { color: #059669; }
  :global(body.light .code-body .cmt) { color: #9ca3af; }

  /* Code tabs */
  :global(.code-tabs) {
    position: relative;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 24px;
  }

  :global(.code-tabs-header) {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border);
  }

  :global(.code-tab-btn) {
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all var(--transition);
  }

  :global(.code-tab-btn:hover) { color: var(--text); }

  :global(.code-tab-btn.active) {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  :global(.code-tabs-header .code-copy-btn) {
    margin-left: auto;
    margin-right: 12px;
  }

  :global(.code-tab-panel) { display: none; }
  :global(.code-tab-panel.active) { display: block; }

  /* Doc tables */
  :global(.doc-table-wrap) {
    overflow-x: auto;
    margin-bottom: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  :global(.doc-table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  :global(.doc-table th) {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 2px solid var(--border);
    color: var(--text);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--bg-elevated);
  }

  :global(.doc-table td) {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-dim);
  }

  :global(.doc-table tr:last-child td) { border-bottom: none; }

  :global(.doc-table tr:hover td) {
    background: rgba(255, 255, 255, 0.02);
  }

  :global(body.light .doc-table tr:hover td) {
    background: rgba(0, 0, 0, 0.02);
  }

  :global(.doc-table code),
  :global(.doc-section :not(pre) > code) {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent);
    background: rgba(59, 130, 246, 0.08);
    padding: 2px 5px;
    border-radius: 3px;
  }

  /* StackBlitz buttons */
  :global(.stackblitz-bar) {
    display: flex;
    justify-content: flex-end;
    padding: 8px 16px 12px;
    border-top: 1px solid var(--border);
  }

  :global(.stackblitz-btn) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    color: #3b82f6;
    background: transparent;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    cursor: pointer;
    transition: all var(--transition);
  }

  :global(.stackblitz-btn:hover) {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    border-color: #60a5fa;
  }

  :global(.stackblitz-btn:active) {
    background: rgba(59, 130, 246, 0.18);
  }

  :global(.stackblitz-row) {
    margin: 16px 0 24px;
    display: flex;
  }

  /* Sandbox cards */
  :global(.sandbox-cards) {
    margin-top: 48px;
  }

  :global(.sandbox-cards-title) {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 20px;
  }

  :global(.sandbox-cards-grid) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  :global(.sandbox-card) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    transition: border-color var(--transition);
  }

  :global(.sandbox-card:hover) {
    border-color: rgba(59, 130, 246, 0.4);
  }

  :global(.sandbox-card-name) {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 6px;
  }

  :global(.sandbox-card-desc) {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 14px;
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    :global(.sandbox-cards-grid) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .docs-layout {
      padding: 0 16px;
    }
    :global(.doc-section) {
      padding: 48px 0 32px;
    }
    :global(.doc-table) {
      font-size: 12px;
    }
    :global(.sandbox-cards-grid) {
      grid-template-columns: 1fr;
    }
  }

  /* Changelog */
  .changelog-version {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }

  .changelog-version:last-child {
    border-bottom: none;
  }

  .changelog-version h3 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 12px;
  }

  .changelog-date {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-muted);
    margin-left: 8px;
  }

  .changelog-group {
    margin-bottom: 12px;
  }

  .changelog-group h4 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent);
    margin-bottom: 6px;
  }

  .changelog-group ul {
    list-style: none;
    padding: 0;
  }

  .changelog-group li {
    position: relative;
    padding: 3px 0 3px 16px;
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  .changelog-group li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .changelog-group li code {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent);
    background: rgba(59, 130, 246, 0.08);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
