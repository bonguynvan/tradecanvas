<script lang="ts">
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import { openWidgetSandbox } from '$lib/sandboxes';
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  // The sandbox opens in a new StackBlitz tab on click: an embedded
  // WebContainer is heavy and would block scrolling here.
  function launch() {
    if (browser) openWidgetSandbox();
  }

  const MAIN_TS = `import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  theme: 'dark',
  adapter: new BinanceAdapter(),
  trading: true,
})`;
</script>

<svelte:head>
  <title>Playground · TradeCanvas</title>
  <meta name="description" content="Fork an interactive TradeCanvas sandbox in StackBlitz and start hacking." />
</svelte:head>

<section class="hero">
  <span class="eyebrow">Playground · StackBlitz</span>
  <h1 class="hero-title">Playground</h1>
  <p class="hero-subtitle">
    An editable sandbox in StackBlitz with the ChartWidget already connected to live Binance data.
  </p>

  <div class="cta-row">
    <button class="cta-btn cta-btn--primary" type="button" onclick={launch}>Launch playground</button>
    <a class="cta-btn cta-btn--ghost" href="{base}/examples">More examples</a>
  </div>
</section>

<section class="quickstart-section">
  <header class="section-head">
    <h2 class="section-title">What's inside</h2>
    <p class="section-subtitle">
      A minimal Vite + TypeScript project with one file, <code>src/main.ts</code>, that mounts
      <code>ChartWidget</code> and connects a <code>BinanceAdapter</code>.
    </p>
  </header>
  <div class="code">
    <CodeBlock code={MAIN_TS} label="src/main.ts" />
  </div>
</section>

<style>
  .hero { display: grid; gap: 14px; justify-items: start; }
  .hero .cta-row { margin-top: 10px; }
  .code { max-width: 820px; }
  .section-subtitle code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--text);
  }
</style>
