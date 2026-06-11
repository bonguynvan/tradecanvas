<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Chart } from '@tradecanvas/chart';
  import type { ChartType, DataSeries } from '@tradecanvas/chart';

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

  type Tile = { type: ChartType; name: string; tag: string; seed: number; start: number; vol: number; drift: number };

  const tiles: Tile[] = [
    { type: 'candlestick', name: 'Candlestick', tag: 'OHLC', seed: 1207, start: 100, vol: 4, drift: 0.25 },
    { type: 'heikinAshi', name: 'Heikin-Ashi', tag: 'Trend', seed: 4413, start: 80, vol: 3, drift: 0.18 },
    { type: 'area', name: 'Area', tag: 'Close', seed: 9931, start: 60, vol: 2.4, drift: 0.12 },
    { type: 'baseline', name: 'Baseline', tag: 'Above / below', seed: 2208, start: 50, vol: 2.2, drift: 0.02 },
    { type: 'bar', name: 'OHLC Bars', tag: 'Classic', seed: 7755, start: 120, vol: 5, drift: -0.15 },
    { type: 'stepLine', name: 'Step Line', tag: 'Discrete', seed: 3361, start: 40, vol: 1.8, drift: 0.08 },
  ];

  let gridEl: HTMLDivElement | undefined = $state();
  let charts: Chart[] = [];
  let observers: ResizeObserver[] = [];
  let themeObserver: MutationObserver | null = null;

  function themeName(): 'dark' | 'light' {
    return document.body.classList.contains('light') ? 'light' : 'dark';
  }

  onMount(async () => {
    await tick();
    if (!gridEl) return;
    const theme = themeName();
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

    themeObserver = new MutationObserver(() => {
      const name = themeName();
      for (const c of charts) c.setTheme(name);
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  });

  onDestroy(() => {
    for (const ro of observers) ro.disconnect();
    observers = [];
    for (const c of charts) c.destroy();
    charts = [];
    themeObserver?.disconnect();
    themeObserver = null;
  });
</script>

<section class="gallery">
  <div class="gallery-head">
    <span class="eyebrow">Interactive · no screenshots</span>
    <h2 class="gallery-title">Every chart type, live in the page</h2>
    <p class="gallery-sub">
      Each tile is a real <code>Chart</code> instance, not an image. Drag to pan,
      scroll to zoom, hover for the crosshair — every one responds independently.
    </p>
  </div>

  <div class="bento" bind:this={gridEl}>
    {#each tiles as t, i}
      <article class="tile" class:tile--wide={i === 0}>
        <header class="tile-head">
          <span class="tile-name">{t.name}</span>
          <span class="tile-tag">{t.tag}</span>
        </header>
        <div class="tile-chart"></div>
      </article>
    {/each}
  </div>
</section>

<style>
  .gallery {
    max-width: 1600px;
    margin: 0 auto;
    padding: 72px clamp(24px, 4vw, 72px);
  }

  .gallery-head {
    max-width: 620px;
    margin: 0 0 32px;
  }

  .eyebrow {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 10px;
  }

  .gallery-title {
    font-size: clamp(1.5rem, 3vw, 2.1rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 10px;
    color: var(--text);
  }

  .gallery-sub {
    font-size: 15px;
    color: var(--text-dim);
    margin: 0;
  }

  .gallery-sub code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    color: var(--accent);
    background: var(--accent-glow);
    padding: 2px 6px;
    border-radius: 4px;
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
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color var(--transition), transform 200ms ease;
  }

  .tile:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }

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
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    background: color-mix(in srgb, var(--bg) 60%, transparent);
    padding: 3px 8px;
    border-radius: 999px;
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
