<script lang="ts">
  import { onMount } from 'svelte';
  import {
    openVanillaSandbox,
    openReactSandbox,
    openSvelteSandbox,
    openVueSandbox,
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
    <a class="docs-sidebar-link" href="#data">Data Format</a>
    <a class="docs-sidebar-link" href="#custom-adapter">Custom Adapter</a>
    <a class="docs-sidebar-link" href="#themes">Themes</a>
    <a class="docs-sidebar-link" href="#indicators">Indicators</a>
    <a class="docs-sidebar-link" href="#drawings">Drawing Tools</a>
    <a class="docs-sidebar-link" href="#trading">Trading Overlay</a>
    <a class="docs-sidebar-link" href="#features">Features Config</a>
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
    <p class="section-subtitle">Complete setup examples for popular frameworks.</p>

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
          <pre><span class="kw">import</span> {'{'} <span class="obj">Chart</span>, <span class="obj">DARK_THEME</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>
<span class="kw">import</span> <span class="kw">type</span> {'{'} <span class="obj">OHLCBar</span> {'}'} <span class="kw">from</span> <span class="str">'@tradecanvas/chart'</span>

<span class="kw">const</span> container = document.<span class="fn">getElementById</span>(<span class="str">'chart'</span>)!
container.style.width = <span class="str">'100%'</span>
container.style.height = <span class="str">'600px'</span>

<span class="kw">const</span> chart = <span class="kw">new</span> <span class="fn">Chart</span>(container, {'{'}
  chartType: <span class="str">'candlestick'</span>,
  theme: <span class="obj">DARK_THEME</span>,
  autoScale: <span class="bool">true</span>,
  features: {'{'} drawings: <span class="bool">true</span>, indicators: <span class="bool">true</span>, volume: <span class="bool">true</span> {'}'},
{'}'})

<span class="cmt">// Load static data</span>
<span class="kw">const</span> bars: <span class="obj">OHLCBar</span>[] = [
  {'{'} time: <span class="bool">1700000000000</span>, open: <span class="bool">100</span>, high: <span class="bool">105</span>, low: <span class="bool">98</span>, close: <span class="bool">103</span>, volume: <span class="bool">1500</span> {'}'},
  {'{'} time: <span class="bool">1700000300000</span>, open: <span class="bool">103</span>, high: <span class="bool">107</span>, low: <span class="bool">101</span>, close: <span class="bool">106</span>, volume: <span class="bool">2200</span> {'}'},
  <span class="cmt">// ...more bars</span>
]
chart.<span class="fn">setData</span>(bars)</pre>
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
    <p class="section-subtitle">26 built-in technical indicators, fully computed on the client.</p>

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
