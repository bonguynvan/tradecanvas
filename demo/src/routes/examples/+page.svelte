<script lang="ts">
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import {
    openVanillaSandbox,
    openReactSandbox,
    openSvelteSandbox,
    openVueSandbox,
    openWidgetSandbox,
    openFinanceChartsSandbox,
  } from '$lib/sandboxes';

  const examples = [
    {
      title: 'Vanilla JS',
      blurb: 'The headless Chart: live Binance stream, Bollinger + RSI, and the drawing tools on your own UI.',
      open: openVanillaSandbox,
    },
    {
      title: 'ChartWidget',
      blurb: 'The full TradingView-style UI in one call — toolbar, 40 drawing tools, watchlist, trading, replay, English or Vietnamese.',
      open: openWidgetSandbox,
    },
    {
      title: 'React',
      blurb: '@tradecanvas/react — reactive props, typed, the underlying Chart through a ref.',
      open: openReactSandbox,
    },
    {
      title: 'Vue 3',
      blurb: '@tradecanvas/vue — script setup, reactive props, the Chart from @ready.',
      open: openVueSandbox,
    },
    {
      title: 'Svelte 5',
      blurb: '@tradecanvas/svelte — runes, reactive props, bind:chart.',
      open: openSvelteSandbox,
    },
    {
      title: 'Finance dashboard',
      blurb: 'Sparkline, gauge, heatmap, depth, and equity-curve renderers in one layout.',
      open: openFinanceChartsSandbox,
    },
  ];

  function handle(open: () => void) {
    if (browser) open();
  }
</script>

<svelte:head>
  <title>Examples — TradeCanvas</title>
  <meta name="description" content="Live StackBlitz examples for vanilla JS, React, Vue, Svelte, the ChartWidget, and finance dashboards." />
</svelte:head>

<section class="hero">
  <h1 class="hero-title" style="font-size: clamp(2rem, 4vw, 3rem)">Examples</h1>
  <p class="hero-subtitle">
    Live sandboxes you can fork in one click — each opens in StackBlitz with the
    latest 1.x packages wired up. To try features without any setup, use the
    <a href="{base}/#lab-title">Feature Lab</a> on the home page.
  </p>
</section>

<div class="examples-grid">
  {#each examples as ex}
    <button type="button" class="example-card" onclick={() => handle(ex.open)}>
      <h3>{ex.title}</h3>
      <p>{ex.blurb}</p>
      <p style="margin-top: 12px; color: var(--accent); font-size: 12.5px; font-weight: 500">Open in StackBlitz →</p>
    </button>
  {/each}
</div>

<style>
  .example-card {
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;
    width: 100%;
  }
</style>
