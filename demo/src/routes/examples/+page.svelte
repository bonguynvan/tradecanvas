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
      blurb: 'The full trading UI in one call: toolbar, 40 drawing tools, watchlist, trading, replay, English or Vietnamese.',
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
  <title>Examples · TradeCanvas</title>
  <meta name="description" content="Live StackBlitz examples for vanilla JS, React, Vue, Svelte, the ChartWidget, and finance dashboards." />
</svelte:head>

<section class="hero">
  <span class="eyebrow">Examples · StackBlitz</span>
  <h1 class="hero-title">Examples</h1>
  <p class="hero-subtitle">
    Live sandboxes you can fork in one click. Each opens in StackBlitz with the latest 1.x
    packages wired up. To try features without any setup, use the
    <a href="{base}/#lab-title">Feature Lab</a> on the home page.
  </p>
</section>

<ul class="examples-grid">
  {#each examples as ex}
    <li class="example-card">
      <h2>{ex.title}</h2>
      <p>{ex.blurb}</p>
      <button type="button" class="open" onclick={() => handle(ex.open)}>
        Open {ex.title} in StackBlitz <span aria-hidden="true">↗</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .hero { display: grid; gap: 14px; justify-items: start; }

  .hero-subtitle a {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: var(--accent-dim);
    text-underline-offset: 3px;
  }

  .examples-grid { list-style: none; }

  .example-card { position: relative; }

  .example-card h2 {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  /* The whole card is the click target: the button's ::after covers it. */
  .open {
    justify-self: start;
    margin-top: 10px;
    padding: 0;
    border: 0;
    background: none;
    font: 500 12px var(--font-mono);
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
    transition: color var(--transition);
  }

  .open::after { content: ''; position: absolute; inset: 0; }
  .open:focus-visible { outline: none; }
  .example-card:has(.open:focus-visible) { outline: 2px solid var(--accent); outline-offset: -2px; }
  .example-card:hover .open { color: var(--accent); }
</style>
