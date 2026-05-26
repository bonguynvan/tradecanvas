<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    SparklineChart,
    DepthChart,
    EquityCurveChart,
    HeatmapChart,
    WaterfallChart,
    GaugeChart,
    DARK_THEME,
    LIGHT_THEME,
  } from '@tradecanvas/chart';
  import type {
    SparklineOptions,
    DepthChartOptions,
    EquityCurveOptions,
    EquityPoint,
    HeatmapCell,
    HeatmapOptions,
    DepthData,
    DepthLevel,
    WaterfallBar,
    WaterfallOptions,
    GaugeOptions,
  } from '@tradecanvas/chart';

  // --- Seeded random for deterministic data ---
  function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // --- Sparkline data ---
  function generateSparkData(
    start: number,
    count: number,
    volatility: number,
    trend: number,
    seed: number,
  ): number[] {
    const rng = seededRandom(seed);
    const data: number[] = [start];
    for (let i = 1; i < count; i++) {
      data.push(data[i - 1] + (rng() - 0.5) * volatility + trend);
    }
    return data;
  }

  const cryptos = [
    { symbol: 'BTC', price: 65234, change: 2.4, data: generateSparkData(64000, 30, 500, 40, 101) },
    { symbol: 'ETH', price: 3412, change: -1.2, data: generateSparkData(3500, 30, 50, -3, 202) },
    { symbol: 'SOL', price: 148, change: 5.1, data: generateSparkData(140, 30, 3, 0.3, 303) },
    { symbol: 'BNB', price: 582, change: 0.8, data: generateSparkData(575, 30, 5, 0.2, 404) },
    { symbol: 'ADA', price: 0.45, change: -3.2, data: generateSparkData(0.47, 30, 0.005, -0.0005, 505) },
    { symbol: 'DOT', price: 7.23, change: 1.6, data: generateSparkData(7.0, 30, 0.1, 0.008, 606) },
  ];

  // --- Equity curve data ---
  function generateEquityData(seed: number): EquityPoint[] {
    const rng = seededRandom(seed);
    const points: EquityPoint[] = [];
    let value = 10000;
    const start = Date.now() - 365 * 86400000;
    for (let i = 0; i < 365; i++) {
      value += (rng() - 0.45) * 200;
      value = Math.max(5000, value);
      points.push({ time: start + i * 86400000, value });
    }
    return points;
  }

  function generateBenchmarkData(seed: number): EquityPoint[] {
    const rng = seededRandom(seed);
    const points: EquityPoint[] = [];
    let value = 10000;
    const start = Date.now() - 365 * 86400000;
    for (let i = 0; i < 365; i++) {
      value += (rng() - 0.47) * 100;
      value = Math.max(7000, value);
      points.push({ time: start + i * 86400000, value });
    }
    return points;
  }

  const equityData = generateEquityData(7777);
  const benchmarkData = generateBenchmarkData(8888);

  // --- Depth chart data ---
  function generateDepthData(seed: number): DepthData {
    const rng = seededRandom(seed);
    const mid = 65000;
    const bids: DepthLevel[] = [];
    const asks: DepthLevel[] = [];
    for (let i = 0; i < 20; i++) {
      bids.push({ price: mid - (i + 1) * 10, volume: rng() * 5 + 0.5 });
      asks.push({ price: mid + (i + 1) * 10, volume: rng() * 5 + 0.5 });
    }
    return { bids, asks };
  }

  const depthData = generateDepthData(9999);

  // --- Heatmap data ---
  const heatmapData: HeatmapCell[] = [
    { id: 'btc', label: 'BTC', value: 2.4, weight: 1200 },
    { id: 'eth', label: 'ETH', value: -1.2, weight: 400 },
    { id: 'bnb', label: 'BNB', value: 0.8, weight: 85 },
    { id: 'sol', label: 'SOL', value: 5.1, weight: 65 },
    { id: 'xrp', label: 'XRP', value: -0.5, weight: 55 },
    { id: 'ada', label: 'ADA', value: -3.2, weight: 35 },
    { id: 'doge', label: 'DOGE', value: 1.8, weight: 30 },
    { id: 'avax', label: 'AVAX', value: 3.5, weight: 25 },
    { id: 'dot', label: 'DOT', value: 1.6, weight: 20 },
    { id: 'link', label: 'LINK', value: -2.1, weight: 18 },
    { id: 'matic', label: 'MATIC', value: 0.3, weight: 15 },
    { id: 'uni', label: 'UNI', value: -1.8, weight: 12 },
    { id: 'atom', label: 'ATOM', value: 2.2, weight: 10 },
    { id: 'near', label: 'NEAR', value: 4.1, weight: 8 },
    { id: 'apt', label: 'APT', value: -0.9, weight: 7 },
  ];

  // --- Waterfall data ---
  const waterfallData: WaterfallBar[] = [
    { label: 'Start', value: 10000, type: 'total' },
    { label: 'BTC Long', value: 1850 },
    { label: 'ETH Short', value: -620 },
    { label: 'SOL Long', value: 420 },
    { label: 'Fees', value: -85 },
    { label: 'End', value: 11565, type: 'total' },
  ];

  // --- Gauge data ---
  const gaugeData: GaugeOptions = {
    value: 72,
    min: 0,
    max: 100,
    label: 'Fear & Greed',
    zones: [
      { from: 0, to: 25, color: '#ef4444' },
      { from: 25, to: 50, color: '#f59e0b' },
      { from: 50, to: 75, color: '#eab308' },
      { from: 75, to: 100, color: '#10b981' },
    ],
  };

  // --- Container refs ---
  let sparkGridEl: HTMLDivElement | undefined = $state();
  let equityContainer: HTMLDivElement | undefined = $state();
  let depthContainer: HTMLDivElement | undefined = $state();
  let heatmapContainer: HTMLDivElement | undefined = $state();
  let waterfallContainer: HTMLDivElement | undefined = $state();
  let gaugeContainer: HTMLDivElement | undefined = $state();

  // --- Chart instances ---
  let sparkCharts: SparklineChart[] = [];
  let equityChart: EquityCurveChart | null = null;
  let depthChart: DepthChart | null = null;
  let heatmapChart: HeatmapChart | null = null;
  let waterfallChart: WaterfallChart | null = null;
  let gaugeChart: GaugeChart | null = null;
  let gaugeInterval: ReturnType<typeof setInterval> | null = null;

  function isDarkMode(): boolean {
    return !document.body.classList.contains('light');
  }

  function currentThemeName(): 'dark' | 'light' {
    return isDarkMode() ? 'dark' : 'light';
  }

  function formatPrice(price: number): string {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  }

  // Observer to detect theme changes on body
  let themeObserver: MutationObserver | null = null;

  function applyThemeToAll(): void {
    const theme = currentThemeName();
    for (const sc of sparkCharts) {
      sc.setTheme(theme);
    }
    equityChart?.setTheme(theme);
    depthChart?.setTheme(theme);
    heatmapChart?.setTheme(theme);
    waterfallChart?.setTheme(theme);
    gaugeChart?.setTheme(theme);
  }

  onMount(async () => {
    // Wait for DOM to be fully laid out
    await tick();
    const theme = currentThemeName();

    // Create sparkline charts — query DOM for containers
    if (sparkGridEl) {
      const sparkEls = sparkGridEl.querySelectorAll<HTMLDivElement>('.spark-chart');
      sparkEls.forEach((el, i) => {
        if (i >= cryptos.length) return;
        const crypto = cryptos[i];
        const isUp = crypto.change > 0;
        const chart = new SparklineChart(el, {
          data: crypto.data,
          mode: 'area',
          color: isUp ? '#10b981' : '#ef4444',
          fillColor: isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          showLastPoint: true,
          lastPointColor: isUp ? '#10b981' : '#ef4444',
          lineWidth: 1.5,
          theme,
        });
        sparkCharts.push(chart);
      });
    }

    // Equity curve
    if (equityContainer) {
      equityChart = new EquityCurveChart(equityContainer, {
        data: equityData,
        drawdown: true,
        lineColor: '#3b82f6',
        benchmarkColor: '#6b7280',
        benchmark: benchmarkData,
        benchmarkLabel: 'Benchmark',
        crosshair: true,
        fillArea: true,
        theme,
      });
    }

    // Depth chart
    if (depthContainer) {
      depthChart = new DepthChart(depthContainer, {
        data: depthData,
        midPriceLine: true,
        spreadLabel: true,
        crosshair: true,
        theme,
      });
    }

    // Heatmap
    if (heatmapContainer) {
      heatmapChart = new HeatmapChart(heatmapContainer, {
        data: heatmapData,
        weighted: true,
        showLabels: true,
        showValues: true,
        valueFormat: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
        crosshair: true,
        theme,
      });
    }

    // Waterfall
    if (waterfallContainer) {
      waterfallChart = new WaterfallChart(waterfallContainer, {
        data: waterfallData,
        showValues: true,
        connectorStyle: 'dashed',
        valueFormat: (v: number) => `$${v.toLocaleString()}`,
        crosshair: true,
        theme,
      });
    }

    // Gauge
    if (gaugeContainer) {
      gaugeChart = new GaugeChart(gaugeContainer, {
        ...gaugeData,
        theme,
      });

      // Animate gauge value every 3 seconds
      gaugeInterval = setInterval(() => {
        if (gaugeChart) {
          const newValue = Math.round(30 + Math.random() * 60);
          gaugeChart.setValue(newValue);
        }
      }, 3000);
    }

    // Watch for theme changes on <body>
    themeObserver = new MutationObserver(() => {
      applyThemeToAll();
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
  });

  onDestroy(() => {
    for (const sc of sparkCharts) {
      sc.destroy();
    }
    sparkCharts = [];
    equityChart?.destroy();
    equityChart = null;
    depthChart?.destroy();
    depthChart = null;
    heatmapChart?.destroy();
    heatmapChart = null;
    waterfallChart?.destroy();
    waterfallChart = null;
    gaugeChart?.destroy();
    gaugeChart = null;
    if (gaugeInterval) {
      clearInterval(gaugeInterval);
      gaugeInterval = null;
    }
    themeObserver?.disconnect();
    themeObserver = null;
  });
</script>

<section class="finance-section">
  <h2 class="section-title">Finance Charts</h2>
  <p class="section-subtitle">Beyond candlesticks — visualize portfolios, order books, market sectors, and KPI metrics.</p>

  <!-- Sparklines Row -->
  <div class="spark-grid" bind:this={sparkGridEl}>
    {#each cryptos as crypto}
      <div class="spark-card">
        <div class="spark-header">
          <span class="spark-symbol">{crypto.symbol}</span>
          <span class="spark-price">{formatPrice(crypto.price)}</span>
        </div>
        <div class="spark-chart"></div>
        <div class="spark-footer">
          <span
            class="spark-change"
            class:up={crypto.change > 0}
            class:down={crypto.change < 0}
          >
            {crypto.change > 0 ? '+' : ''}{crypto.change.toFixed(1)}%
          </span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Equity + Depth Row -->
  <div class="mid-grid">
    <div class="chart-card">
      <div class="card-label">Portfolio Performance</div>
      <div class="card-chart card-chart--300" bind:this={equityContainer}></div>
    </div>
    <div class="chart-card">
      <div class="card-label">Order Book Depth</div>
      <div class="card-chart card-chart--300" bind:this={depthContainer}></div>
    </div>
  </div>

  <!-- Heatmap -->
  <div class="chart-card chart-card--spaced">
    <div class="card-label">Crypto Market Heatmap</div>
    <div class="card-chart card-chart--350" bind:this={heatmapContainer}></div>
  </div>

  <!-- Waterfall + Gauge Row -->
  <div class="mid-grid">
    <div class="chart-card">
      <div class="card-label">P&amp;L Attribution</div>
      <div class="card-chart card-chart--300" bind:this={waterfallContainer}></div>
    </div>
    <div class="chart-card">
      <div class="card-label">Fear &amp; Greed Index</div>
      <div class="card-chart card-chart--300" bind:this={gaugeContainer}></div>
    </div>
  </div>
</section>

<style>
  .finance-section {
    padding: 48px 24px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .section-title {
    text-align: center;
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text);
  }

  .section-subtitle {
    text-align: center;
    font-size: 15px;
    color: var(--text-muted);
    margin: 0 0 32px;
  }

  /* --- Sparkline grid --- */
  .spark-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .spark-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .spark-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .spark-symbol {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.02em;
  }

  .spark-price {
    font-size: 12px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .spark-chart {
    height: 48px;
    width: 100%;
  }

  .spark-footer {
    display: flex;
    justify-content: flex-end;
  }

  .spark-change {
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .spark-change.up {
    color: var(--green);
  }

  .spark-change.down {
    color: var(--red);
  }

  /* --- Mid row (equity + depth) --- */
  .mid-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  /* --- Shared card style --- */
  .chart-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .chart-card--spaced {
    margin-bottom: 20px;
  }

  .card-label {
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }

  .card-chart {
    width: 100%;
  }

  .card-chart--300 {
    height: 300px;
  }

  .card-chart--350 {
    height: 350px;
  }

  /* --- Responsive --- */
  @media (max-width: 1024px) {
    .spark-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .finance-section {
      padding: 32px 12px;
    }

    .spark-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .mid-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
