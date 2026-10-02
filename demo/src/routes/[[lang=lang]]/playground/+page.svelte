<script lang="ts">
  import { browser } from '$app/environment';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { openWidgetSandbox } from '$lib/sandboxes';
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  const i18n = useI18n();
  const m = $derived(i18n.m.playground);

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
  <title>{m.metaTitle}</title>
  <meta name="description" content={m.description} />
</svelte:head>

<section class="hero">
  <span class="eyebrow">{m.eyebrow}</span>
  <h1 class="hero-title">{m.title}</h1>
  <p class="hero-subtitle">{m.subtitle}</p>

  <div class="cta-row">
    <button class="cta-btn cta-btn--primary" type="button" onclick={launch}>{m.launch}</button>
    <a class="cta-btn cta-btn--ghost" href={i18n.href('/examples')}>{m.more}</a>
  </div>
</section>

<section class="quickstart-section">
  <header class="section-head">
    <h2 class="section-title">{m.insideTitle}</h2>
    <p class="section-subtitle">{@html m.insideHtml}</p>
  </header>
  <div class="code">
    <CodeBlock code={MAIN_TS} label="src/main.ts" />
  </div>
</section>

<style>
  .hero { display: grid; gap: 14px; justify-items: start; }
  .hero .cta-row { margin-top: 10px; }
  .code { max-width: 820px; }
  .section-subtitle :global(code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--text);
  }
</style>
