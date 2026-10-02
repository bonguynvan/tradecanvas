<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Chart } from '@tradecanvas/chart';
  import { siteTheme, onSiteThemeChange } from '$lib/site';
  import type { ChartType, DataSeries } from '@tradecanvas/chart';
  import { useI18n } from '$lib/i18n/context.svelte';

  const i18n = useI18n();
  const m = $derived(i18n.m);

  // --- Deterministic synthetic OHLC ---
  function seededRandom(seed: number): () => number {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function genOHLC(seed: number, count: number, start: number, vol: number, drift: number): DataSeries {
    const rng = seededRandom(seed);
    const out: DataSeries = [];
    let price = start;
    const step = 3_600_000; // 1h bars
    const now = 1_718_000_000_000; // fixed epoch (ms) — deterministic, SSR-safe
    for (let i = 0; i < count; i++) {
      const open = price;
      const drift2 = drift + Math.sin(i / 9) * vol * 0.25;
      const close = Math.max(0.0001, open + (rng() - 0.5) * vol + drift2);
      const high = Math.max(open, close) + rng() * vol * 0.6;
      const low = Math.min(open, close) - rng() * vol * 0.6;
      out.push({ time: now - (count - i) * step, open, high, low, close, volume: rng() * 900 + 150 });
      price = close;
    }
    return out;
  }

  /** Each tile's name and tag are `m.gallery.tiles[type]`. */
  type Tile = { type: keyof typeof i18n.m.gallery.tiles & ChartType; seed: number; start: number; vol: number; drift: number };

  const tiles: Tile[] = [
    { type: 'candlestick', seed: 1207, start: 100, vol: 4, drift: 0.25 },
    { type: 'heikinAshi', seed: 4413, start: 80, vol: 3, drift: 0.18 },
    { type: 'area', seed: 9931, start: 60, vol: 2.4, drift: 0.12 },
    { type: 'baseline', seed: 2208, start: 50, vol: 2.2, drift: 0.02 },
    { type: 'bar', seed: 7755, start: 120, vol: 5, drift: -0.15 },
    { type: 'stepLine', seed: 3361, start: 40, vol: 1.8, drift: 0.08 },
  ];

  let gridEl: HTMLDivElement | undefined = $state();
  let charts: Chart[] = [];
  let observers: ResizeObserver[] = [];
  let stopThemeSync: (() => void) | null = null;

  onMount(async () => {
    await tick();
    if (!gridEl) return;
    const theme = siteTheme();
    const hosts = gridEl.querySelectorAll<HTMLDivElement>('.tile-chart');

    hosts.forEach((el, i) => {
      const t = tiles[i];
      if (!t) return;
      const chart = new Chart(el, {
        chartType: t.type,
        theme,
        features: {
          drawings: false,
          trading: false,
          indicators: false,
          legend: false,
          watermark: false,
          volume: false,
          alerts: false,
          replay: false,
          saveLoad: false,
          screenshot: false,
          keyboard: false,
        },
      });
      chart.setData(genOHLC(t.seed, 140, t.start, t.vol, t.drift));
      chart.fitContent();
      charts.push(chart);

      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(el);
      observers.push(ro);
    });

    stopThemeSync = onSiteThemeChange((next) => {
      for (const c of charts) c.setTheme(next);
    });
  });

  onDestroy(() => {
    for (const ro of observers) ro.disconnect();
    observers = [];
    for (const c of charts) c.destroy();
    charts = [];
    stopThemeSync?.();
    stopThemeSync = null;
  });
</script>

<section class="gallery">
  <header class="section-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">{m.gallery.eyebrow}</span>
    <h2 class="section-title">{m.gallery.title}</h2>
    <p class="section-subtitle">{@html m.gallery.subtitleHtml}</p>
  </header>

  <div class="bento" bind:this={gridEl} data-reveal data-reveal-stagger>
    {#each tiles as t, i}
      <article class="tile" class:tile--wide={i === 0}>
        <header class="tile-head">
          <span class="tile-name">{m.gallery.tiles[t.type].name}</span>
          <span class="tile-tag">{m.gallery.tiles[t.type].tag}</span>
        </header>
        <div class="tile-chart"></div>
      </article>
    {/each}
  </div>
</section>

<style>
  .gallery {
    max-width: var(--page-max);
    margin: 0 auto;
    padding: var(--section-pad) var(--gutter);
  }

  .bento {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 240px;
    gap: 16px;
  }

  .tile {
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color var(--transition);
  }

  .tile:hover { border-color: var(--text-muted); }

  .tile--wide {
    grid-column: span 2;
    grid-row: span 2;
  }

  .tile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .tile-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .tile-tag {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .tile-chart {
    flex: 1;
    min-height: 0;
    width: 100%;
    cursor: crosshair;
  }

  @media (max-width: 900px) {
    .bento { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 200px; }
    .tile--wide { grid-column: span 2; grid-row: span 1; }
  }

  @media (max-width: 560px) {
    .bento { grid-template-columns: 1fr; }
    .tile--wide { grid-column: span 1; }
  }
</style>
