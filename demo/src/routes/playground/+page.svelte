<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { openWidgetSandbox } from '$lib/sandboxes';

  onMount(() => {
    // Auto-launch the widget sandbox in a new tab so the page itself doesn't
    // need an embedded WebContainer (which is heavy and blocks scrolling).
    // Keep this gated behind a click instead — give the user a choice.
  });

  function launch() {
    if (browser) openWidgetSandbox();
  }
</script>

<svelte:head>
  <title>Playground — TradeCanvas</title>
  <meta name="description" content="Fork an interactive TradeCanvas sandbox in StackBlitz and start hacking." />
</svelte:head>

<section class="hero">
  <h1 class="hero-title" style="font-size: clamp(2rem, 4vw, 3rem)">Playground</h1>
  <p class="hero-subtitle">
    Spin up an editable sandbox in StackBlitz with the ChartWidget already wired
    to live Binance data.
  </p>

  <div class="cta-row">
    <button class="cta-btn cta-btn--primary" type="button" onclick={launch}>Launch playground</button>
    <a class="cta-btn cta-btn--ghost" href="/tradecanvas/examples">More examples</a>
  </div>
</section>

<section class="quickstart-section">
  <h2 class="section-title">What's inside</h2>
  <p class="section-subtitle">
    A minimal Vite + TypeScript project with one file — <code>src/main.ts</code> — that mounts
    <code>ChartWidget</code> and connects a <code>BinanceAdapter</code>.
  </p>

  <pre><code>{`import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  trading: true,
})`}</code></pre>
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
  }
</style>
