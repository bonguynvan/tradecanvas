<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import 'lenis/dist/lenis.css';
  import { initLandingMotion } from '$lib/motion';
  import LiveTerminal from '$lib/components/LiveTerminal.svelte';
  import TickerTape from '$lib/components/TickerTape.svelte';
  import StorySection from '$lib/components/StorySection.svelte';
  import TrustBand from '$lib/components/TrustBand.svelte';
  import ChartGallery from '$lib/components/ChartGallery.svelte';
  import FinanceCharts from '$lib/components/FinanceCharts.svelte';
  import FeatureLab from '$lib/components/FeatureLab.svelte';
  import InstallCommand from '$lib/components/InstallCommand.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import { VERSION, LINKS, SITE_URL } from '$lib/site';
  import { useI18n } from '$lib/i18n/context.svelte';

  const i18n = useI18n();
  const m = $derived(i18n.m);

  /**
   * Counts come from the source: the indicator registry, DrawingToolType, ChartType,
   * the widget's locales; the million bars from the WebGL bench.
   */
  // `value` is what counts up on scroll; `prefix` and `suffix` stay put, `unit` is set small. Labels are `m.home.specs`, in order.
  const SPECS = [
    { prefix: '', value: '111', unit: '', suffix: '' },
    { prefix: '', value: '69', unit: '', suffix: '' },
    { prefix: '', value: '18', unit: '', suffix: '' },
    { prefix: '', value: '30', unit: '', suffix: '' },
    { prefix: '', value: '1', unit: '', suffix: 'M' },
    { prefix: '', value: '0', unit: '', suffix: '' },
  ];


  /** Labels are `m.home.hood.perf`, in order. */
  const PERF = [
    { prefix: '', value: '0.001', unit: 'ms' },
    { prefix: '', value: '27', unit: 'ms' },
    { prefix: '', value: '0.32', unit: 'ms' },
    { prefix: '<', value: '0.3', unit: 'ms' },
  ];

  let page: HTMLElement | undefined = $state();
  onMount(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    if (page) {
      initLandingMotion(page)
        .then((dispose) => {
          if (cancelled) dispose();
          else stop = dispose;
        })
        .catch((err) => {
          // Motion is decoration: the page is complete without it.
          console.warn('Landing motion unavailable:', err);
        });
    }
    return () => {
      cancelled = true;
      stop?.();
    };
  });

  const QUICKSTART = [
    {
      label: 'Widget',
      code: `import { ChartWidget } from '@tradecanvas/chart/widget'
import { BinanceAdapter } from '@tradecanvas/chart'

new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  timeframe: '5m',
  adapter: new BinanceAdapter(),
  locale: 'en',            // 30 languages: 'vi', 'ja', 'zh'…
  trading: true,
})`,
    },
    {
      label: 'React',
      code: `import { TradeCanvas } from '@tradecanvas/react'

export function Chart() {
  return (
    <div style={{ height: 520 }}>
      <TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['bb', 'rsi']} />
    </div>
  )
}`,
    },
    {
      label: 'Vue',
      code: `<script setup lang="ts">
import { TradeCanvas } from '@tradecanvas/vue'
<` + `/script>

<template>
  <div style="height: 520px">
    <TradeCanvas symbol="BTCUSDT" timeframe="5m" :indicators="['bb', 'rsi']" />
  </div>
</template>`,
    },
    {
      label: 'Svelte',
      code: `<script lang="ts">
  import { TradeCanvas } from '@tradecanvas/svelte'
<` + `/script>

<div style="height: 520px">
  <TradeCanvas symbol="BTCUSDT" timeframe="5m" indicators={['bb', 'rsi']} />
</div>`,
    },
    {
      label: 'Headless',
      code: `import { Chart, BinanceAdapter } from '@tradecanvas/chart'

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' })
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '5m' })
chart.addIndicator('ema', { period: 21 })
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`,
    },
  ];
  let activeQuickstart = $state(0);

  /** Arrow keys move between tabs (roving tabindex). */
  function onTabKey(e: KeyboardEvent) {
    const last = QUICKSTART.length - 1;
    const next =
      e.key === 'ArrowRight' ? (activeQuickstart === last ? 0 : activeQuickstart + 1)
      : e.key === 'ArrowLeft' ? (activeQuickstart === 0 ? last : activeQuickstart - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    activeQuickstart = next;
    document.getElementById(`qs-tab-${next}`)?.focus();
  }

</script>

<svelte:head>
  <title>{m.meta.title}</title>
  <meta name="description" content={m.meta.description} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={m.meta.title} />
  <meta property="og:description" content={m.meta.description} />
  <meta property="og:image" content="{SITE_URL}/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={m.meta.title} />
  <meta property="og:url" content="{SITE_URL}{i18n.href('/').slice(base.length)}" />
  <meta property="og:locale" content={i18n.language.og} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="TradeCanvas" />
  <meta name="twitter:description" content={m.meta.description} />
  <meta name="twitter:image" content="{SITE_URL}/og.png" />
</svelte:head>

<div class="home" bind:this={page}>
<TickerTape />

<section class="home-hero">
  <div class="hero-grid" data-parallax aria-hidden="true"></div>
  <div class="home-hero-inner">
    <div class="hero-title">
      <a class="hero-release" href={i18n.href('/changelog')}>
        <span class="live" aria-hidden="true"></span>
        <span>v{VERSION}</span>
        <span class="sep" aria-hidden="true">/</span>
        <span>{m.home.release}</span>
      </a>
      <h1 class="hero-h1">{m.home.title}</h1>
    </div>

    <div class="hero-copy">
      <!-- The site's own strings: markup in them is ours, never a visitor's. -->
      <p class="hero-lede">{@html m.home.ledeHtml}</p>

      <InstallCommand />

      <div class="cta-row">
        <a href={i18n.href('/docs/getting-started')} class="cta-btn cta-btn--primary">{m.home.getStarted}</a>
        <a href={i18n.href('/examples')} class="cta-btn cta-btn--ghost">{m.home.browseExamples}</a>
      </div>

      <p class="hero-frameworks">
        <span>Vanilla TS</span><span>React</span><span>Vue</span><span>Svelte</span>
      </p>
    </div>

    <div class="hero-stage">
      <LiveTerminal variant="stage" renderer="auto" />
    </div>
  </div>
</section>

<section class="spec-strip" aria-label={m.home.specsLabel}>
  <dl class="spec-grid">
    {#each SPECS as s, i}
      <div class="spec">
        <dt>{s.prefix}<span class="count" data-count={s.value} style:min-width="{s.value.length}ch">{s.value}</span>{s.suffix}{#if s.unit}<small>{s.unit}</small>{/if}</dt>
        <dd>{m.home.specs[i]}</dd>
      </div>
    {/each}
  </dl>
</section>

<StorySection />

<TrustBand />

<FeatureLab />

<ChartGallery />

<section class="features-section" aria-labelledby="hood-title">
  <header class="section-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">{m.home.hood.eyebrow}</span>
    <h2 class="section-title" id="hood-title">{m.home.hood.title}</h2>
    <p class="section-subtitle">{@html m.home.hood.subtitleHtml}</p>
  </header>

  <div class="hood">
    <div class="perf-panel" data-reveal>
      <h3 class="panel-label">{m.home.hood.frameBudget}</h3>
      <dl class="perf-grid">
        {#each PERF as p, i}
          <div>
            <dt>{p.prefix}<span class="count" data-count={p.value} style:min-width="{p.value.length}ch">{p.value}</span><small>{p.unit}</small></dt>
            <dd>{m.home.hood.perf[i]}</dd>
          </div>
        {/each}
      </dl>
      <p class="perf-foot">{m.home.hood.perfFoot}</p>
      <h3 class="panel-label">{m.home.hood.gestures}</h3>
      <dl class="gestures">
        {#each m.home.hood.gestureList as [key, what]}
          <div><dt><kbd>{key}</kbd></dt><dd>{what}</dd></div>
        {/each}
      </dl>
    </div>

    <dl class="caps" data-reveal data-reveal-stagger>
      {#each m.home.capabilities as c}
        <div class="cap">
          <dt><span class="cap-label">{c.label}</span>{c.title}</dt>
          <dd>{c.text}</dd>
        </div>
      {/each}
    </dl>
  </div>
</section>

<FinanceCharts />

<section class="quickstart-section" aria-labelledby="qs-title">
  <header class="section-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">{m.home.quickstart.eyebrow}</span>
    <h2 class="section-title" id="qs-title">{m.home.quickstart.title}</h2>
    <p class="section-subtitle">{m.home.quickstart.subtitle}</p>
  </header>

  <div class="qs" data-reveal>
    <div class="qs-tabs" role="tablist" aria-label={m.home.quickstart.tabs}>
      {#each QUICKSTART as q, i}
        <button
          type="button"
          role="tab"
          id="qs-tab-{i}"
          class="qs-tab"
          class:active={activeQuickstart === i}
          aria-selected={activeQuickstart === i}
          aria-controls="qs-panel"
          tabindex={activeQuickstart === i ? 0 : -1}
          onclick={() => { activeQuickstart = i; }}
          onkeydown={onTabKey}
        >{q.label}</button>
      {/each}
    </div>
    <div id="qs-panel" role="tabpanel" aria-labelledby="qs-tab-{activeQuickstart}">
      <CodeBlock code={QUICKSTART[activeQuickstart].code} />
    </div>
  </div>
</section>

<section class="closing" aria-labelledby="closing-title">
  <div class="closing-inner" data-reveal data-reveal-stagger>
    <h2 class="closing-title" id="closing-title">{m.home.closing.title}</h2>
    <div class="closing-actions">
      <InstallCommand />
      <div class="cta-row">
        <a href={i18n.href('/docs/getting-started')} class="cta-btn cta-btn--primary">{m.home.closing.readDocs}</a>
        <a href={LINKS.github} class="cta-btn cta-btn--ghost" target="_blank" rel="noopener">{m.home.closing.star}</a>
      </div>
    </div>
  </div>
</section>
</div>

<style>
  /* --- Hero --- */
  .home-hero {
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  /* Its own layer so it can drift (parallax) while the hero scrolls out. */
  .hero-grid {
    position: absolute;
    inset: -25% 0 0;
    background:
      linear-gradient(to right, var(--border-subtle) 1px, transparent 1px) 0 0 / 64px 64px,
      linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px) 0 0 / 64px 64px;
    mask-image: radial-gradient(120% 90% at 30% 35%, #000 40%, transparent 100%);
    pointer-events: none;
  }

  /* The headline and its pitch side by side, the live chart the full width below. */
  .home-hero-inner {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    grid-template-areas:
      'title copy'
      'stage stage';
    gap: clamp(28px, 3.5vw, 48px) clamp(32px, 5vw, 88px);
    align-items: end;
    max-width: var(--page-max);
    margin: 0 auto;
    padding: clamp(48px, 7vw, 104px) var(--gutter) clamp(40px, 5vw, 72px);
  }

  .hero-title {
    grid-area: title;
    display: grid;
    gap: 26px;
    justify-items: start;
    min-width: 0;
  }

  .hero-copy {
    grid-area: copy;
    display: grid;
    gap: 22px;
    justify-items: start;
    min-width: 0;
  }

  /* Entrance: pure CSS, so it plays on first paint without waiting for JS
     (reduced motion collapses it to the final frame, see app.css). */
  .hero-title > :global(*),
  .hero-copy > :global(*) {
    animation: hero-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .hero-title > :global(:nth-child(2)) { animation-delay: 0.06s; }
  .hero-copy > :global(:nth-child(1)) { animation-delay: 0.14s; }
  .hero-copy > :global(:nth-child(2)) { animation-delay: 0.2s; }
  .hero-copy > :global(:nth-child(3)) { animation-delay: 0.26s; }
  .hero-copy > :global(:nth-child(4)) { animation-delay: 0.32s; }

  .hero-stage {
    grid-area: stage;
    min-width: 0;
    margin-top: clamp(4px, 1.5vw, 20px);
    animation: hero-stage-in 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  }

  @keyframes hero-rise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }

  @keyframes hero-stage-in {
    from { opacity: 0; transform: translateY(24px) scale(0.985); }
    to { opacity: 1; transform: none; }
  }

  .hero-release {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-dim);
    padding: 5px 12px 5px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elevated);
    transition: border-color var(--transition), color var(--transition);
    max-width: 100%;
  }

  .hero-release:hover { border-color: var(--accent-dim); color: var(--text); }
  .hero-release .sep { color: var(--text-muted); }

  .live {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    flex: none;
    animation: heartbeat 1.8s infinite;
  }

  @keyframes heartbeat {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 55%, transparent); }
    70% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--green) 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 0%, transparent); }
  }

  .hero-h1 {
    font-size: clamp(2.7rem, 6.2vw, 5.9rem);
    line-height: 0.96;
    font-weight: 600;
    letter-spacing: -0.052em;
    max-width: 11ch;
    text-wrap: balance;
  }

  .hero-lede {
    font-size: clamp(1rem, 1.25vw, 1.125rem);
    color: var(--text-dim);
    max-width: 34rem;
  }

  .hero-lede :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--text);
    white-space: nowrap;
  }

  .hero-frameworks {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }

  .hero-frameworks span::before {
    content: '';
    display: inline-block;
    width: 5px;
    height: 5px;
    margin-right: 8px;
    vertical-align: middle;
    background: var(--accent);
  }

  /* --- Spec strip --- */
  .spec-strip { border-bottom: 1px solid var(--border); }

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    max-width: var(--page-max);
    margin: 0 auto;
  }

  .spec {
    padding: 22px var(--gutter) 24px;
    border-left: 1px solid var(--border);
  }

  .spec:first-child { border-left: 0; }

  .spec dt {
    font-family: var(--font-mono);
    font-size: clamp(1.5rem, 2.4vw, 2rem);
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .count { display: inline-block; font-variant-numeric: tabular-nums; }

  .spec dt small, .perf-grid dt small {
    font-size: 0.5em;
    margin-left: 3px;
    color: var(--text-muted);
    letter-spacing: 0;
  }

  .spec dd {
    margin-top: 6px;
    font-size: 13px;
    color: var(--text-muted);
  }

  /* --- Under the hood --- */
  .hood {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(24px, 4vw, 56px);
    align-items: start;
  }

  .perf-panel {
    display: grid;
    gap: 18px;
    padding: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--bg-elevated);
  }

  .panel-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .perf-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 24px;
  }

  .perf-grid dt {
    font-family: var(--font-mono);
    font-size: clamp(1.6rem, 2.6vw, 2.2rem);
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .perf-grid dd {
    margin-top: 6px;
    font-size: 13px;
    color: var(--text-dim);
  }

  .perf-foot {
    font-size: 13.5px;
    color: var(--text-muted);
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .gestures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 20px;
  }

  .gestures div { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
  .gestures dt { flex: none; }
  .gestures dd { font-size: 13px; color: var(--text-dim); }

  .caps { border-top: 1px solid var(--border); }

  .cap {
    display: grid;
    gap: 6px;
    padding: 18px 0 20px;
    border-bottom: 1px solid var(--border);
  }

  .cap dt {
    display: flex;
    align-items: baseline;
    gap: 14px;
    font-size: 16.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .cap-label {
    flex: none;
    width: 92px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .cap dd {
    padding-left: 106px;
    font-size: 14.5px;
    color: var(--text-dim);
    max-width: 62ch;
  }

  /* --- Quick start --- */
  .qs { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; max-width: 900px; }

  .qs-tabs {
    display: flex;
    gap: 0;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: var(--bg-elevated);
  }

  .qs-tab {
    font: 500 13px var(--font-mono);
    padding: 10px 16px;
    border: 0;
    border-right: 1px solid var(--border);
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    white-space: nowrap;
    position: relative;
    transition: color var(--transition), background var(--transition);
  }

  .qs-tab:hover { color: var(--text); }
  .qs-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .qs-tab.active { color: var(--text); background: var(--bg); }

  .qs-tab.active::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: var(--accent);
  }

  .qs :global(.code-block) { border-radius: 0 0 var(--radius-lg) var(--radius-lg); }

  /* --- Closing --- */
  .closing { border-top: 1px solid var(--border); background: var(--bg-elevated); }

  .closing-inner {
    max-width: var(--page-max);
    margin: 0 auto;
    padding: 64px var(--gutter);
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    gap: 28px 48px;
    align-items: center;
  }

  .closing-title {
    font-size: clamp(1.7rem, 3.2vw, 2.6rem);
    line-height: 1.05;
    font-weight: 600;
    letter-spacing: -0.035em;
    max-width: 16ch;
    text-wrap: balance;
  }

  .closing-actions { display: grid; gap: 14px; justify-items: start; min-width: 0; }

  /* --- Responsive --- */
  @media (max-width: 1100px) {
    .spec-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .spec:nth-child(4) { border-left: 0; }
    .spec:nth-child(n + 4) { border-top: 1px solid var(--border); }
  }

  @media (max-width: 980px) {
    .home-hero-inner {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'title' 'copy' 'stage';
      align-items: start;
    }
    .hero-h1 { max-width: 13ch; }
    .hood { grid-template-columns: minmax(0, 1fr); }
    .closing-inner { grid-template-columns: minmax(0, 1fr); }
  }

  /* The live chart runs edge to edge on a phone. */
  @media (max-width: 768px) {
    .hero-stage { margin-inline: calc(-1 * var(--gutter)); }
  }

  @media (max-width: 640px) {
    .spec-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .spec:nth-child(n) { border-left: 1px solid var(--border); border-top: 0; }
    .spec:nth-child(odd) { border-left: 0; }
    .spec:nth-child(n + 3) { border-top: 1px solid var(--border); }
    .perf-grid, .gestures { grid-template-columns: minmax(0, 1fr); }
    .cap dt { flex-direction: column; gap: 4px; }
    .cap dd { padding-left: 0; }
  }
</style>
