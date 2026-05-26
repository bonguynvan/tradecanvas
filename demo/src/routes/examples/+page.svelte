<script lang="ts">
  import { browser } from '$app/environment';
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
      blurb: 'Lowest-level usage — Chart class with a Binance live stream and an SMA overlay.',
      open: openVanillaSandbox,
    },
    {
      title: 'ChartWidget',
      blurb: 'One-line embed of the full TradingView-like widget with toolbar and drawing sidebar.',
      open: openWidgetSandbox,
    },
    {
      title: 'React',
      blurb: 'TradeCanvas React wrapper — typed props, ref-forwarded chart instance.',
      open: openReactSandbox,
    },
    {
      title: 'Vue 3',
      blurb: 'TradeCanvas Vue wrapper — composition API + script setup.',
      open: openVueSandbox,
    },
    {
      title: 'Svelte 5',
      blurb: 'TradeCanvas Svelte wrapper — runes + reactive props.',
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
    Live sandboxes you can fork in one click. Each opens in StackBlitz with the
    package wired up.
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
