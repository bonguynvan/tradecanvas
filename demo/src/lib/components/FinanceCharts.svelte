<script lang="ts">
  import { siteTheme, onSiteThemeChange } from '$lib/site';
  import type { Theme } from '@tradecanvas/chart';
  import { onMount, onDestroy, tick } from 'svelte';
  import { useI18n } from '$lib/i18n/context.svelte';
  import {
    SparklineChart,
    DepthChart,
    EquityCurveChart,
    HeatmapChart,
    WaterfallChart,
    GaugeChart,
    BarChart,
    DonutChart,
    ScatterChart,
    HistogramChart,
    CalendarChart,
    MatrixChart,
    correlationMatrix,
    CounterClockChart,
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

  const i18n = useI18n();
  const m = $derived(i18n.m);

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
    // The page remounts for another language, so its strings at mount time are the ones to draw.
    { label: i18n.m.finance.waterfall.start, value: 10000, type: 'total' },
    { label: i18n.m.finance.waterfall.btcLong, value: 1850 },
    { label: i18n.m.finance.waterfall.ethShort, value: -620 },
    { label: i18n.m.finance.waterfall.solLong, value: 420 },
    { label: i18n.m.finance.waterfall.fees, value: -85 },
    { label: i18n.m.finance.waterfall.end, value: 11565, type: 'total' },
  ];

  // --- Gauge data ---
  const gaugeData: GaugeOptions = {
    value: 72,
    min: 0,
    max: 100,
    label: i18n.m.finance.fearGreed,
    zones: [
      { from: 0, to: 25, color: '#e8505b', label: i18n.m.finance.zones.extremeFear },
      { from: 25, to: 45, color: '#f2a93b', label: i18n.m.finance.zones.fear },
      { from: 45, to: 55, color: '#8a93a3', label: i18n.m.finance.zones.neutral },
      { from: 55, to: 75, color: '#62c895', label: i18n.m.finance.zones.greed },
      { from: 75, to: 100, color: '#1fa874', label: i18n.m.finance.zones.extremeGreed },
    ],
  };

  // --- Foreign net buying over ten sessions, bn dong ---
  const flowRng = seededRandom(4242);
  const flowDays = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 6) + i * 86_400_000 * 1.4);
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  });
  const flowValues = flowDays.map(() => Math.round((flowRng() - 0.45) * 1600));

  // --- Allocation ---
  const allocation = [
    { label: i18n.m.finance.assets.stocks, value: 52 },
    { label: i18n.m.finance.assets.bonds, value: 23 },
    { label: i18n.m.finance.assets.cash, value: 15 },
    { label: i18n.m.finance.assets.gold, value: 10 },
  ];

  // --- Banks: volatility against return, bubbles by market value (trillion dong) ---
  const banks = [
    { label: 'VCB', x: 21, y: 9, size: 480 },
    { label: 'BID', x: 26, y: 12, size: 250 },
    { label: 'CTG', x: 29, y: 18, size: 190 },
    { label: 'TCB', x: 34, y: 24, size: 170 },
    { label: 'MBB', x: 31, y: 21, size: 130 },
    { label: 'ACB', x: 24, y: 14, size: 110 },
    { label: 'VPB', x: 38, y: 6, size: 150 },
    { label: 'HDB', x: 36, y: 27, size: 80 },
  ];

  // --- Daily returns, % ---
  const returnRng = seededRandom(777);
  const dailyReturns = Array.from({ length: 500 }, () => {
    // A rough bell: the mean of a few uniforms, scaled to about ±4%.
    const u = (returnRng() + returnRng() + returnRng() + returnRng()) / 4;
    return (u - 0.48) * 9;
  });
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const var95 = [...dailyReturns].sort((a, b) => a - b)[Math.floor(dailyReturns.length * 0.05)];

  // --- A year of sessions' changes, %, Monday to Friday ---
  const dayRng = seededRandom(2025);
  const sessionDays: { date: string; value: number }[] = [];
  for (let t = Date.UTC(2025, 0, 2); t <= Date.UTC(2025, 11, 31); t += 86_400_000) {
    const weekday = new Date(t).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const u = (dayRng() + dayRng() + dayRng()) / 3;
    sessionDays.push({ date: new Date(t).toISOString().slice(0, 10), value: Math.round((u - 0.47) * 500) / 100 });
  }

  // --- Sectors: tiles sized by market value (trillion dong), coloured by the day's change ---
  const sectorCells: HeatmapCell[] = [
    ['VCB', 'banks', 480, 0.8], ['BID', 'banks', 250, 1.2], ['CTG', 'banks', 190, 2.1], ['TCB', 'banks', 170, -0.6], ['MBB', 'banks', 130, 1.5], ['ACB', 'banks', 110, 0.4],
    ['VHM', 'realEstate', 170, -2.4], ['VIC', 'realEstate', 160, -1.1], ['VRE', 'realEstate', 50, 0.9], ['NVL', 'realEstate', 30, -3.6],
    ['HPG', 'steel', 160, 1.9], ['HSG', 'steel', 12, 3.2], ['NKG', 'steel', 7, 2.5],
    ['MWG', 'retail', 90, -0.8], ['MSN', 'retail', 100, 0.3], ['PNJ', 'retail', 30, 1.1],
    ['GAS', 'energy', 170, -0.4], ['PLX', 'energy', 50, -1.3], ['POW', 'energy', 30, 0.6],
    ['FPT', 'tech', 190, 2.7], ['CMG', 'tech', 8, 1.4],
  ].map(([label, sector, weight, value]) => ({
    id: String(label),
    label: String(label),
    value: Number(value),
    weight: Number(weight),
    group: i18n.m.finance.sectors[sector as keyof typeof i18n.m.finance.sectors],
  }));

  // --- Bank stocks' daily returns: a shared market move and each bank's own ---
  const corrRng = seededRandom(31);
  const corrNames = ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'VPB'];
  const exposure = [0.6, 0.8, 0.9, 1, 1.1, 0.7];
  const market = Array.from({ length: 250 }, () => corrRng() - 0.5);
  const bankReturns = exposure.map((beta) => market.map((mv) => beta * mv + (corrRng() - 0.5) * 0.6));
  const correlations = correlationMatrix(bankReturns);

  // --- A year of daily bars whose volume turns a quarter cycle before price ---
  const clockBars = Array.from({ length: 300 }, (_, i) => {
    const t = (i / 300) * Math.PI * 4;
    const close = 60 + 8 * Math.sin(t) + i * 0.01;
    return { time: Date.UTC(2025, 0, 1) + i * 86_400_000, open: close, high: close + 0.5, low: close - 0.5, close, volume: Math.round(2_000_000 + 800_000 * Math.cos(t)) };
  });

  // --- Container refs ---
  let sparkGridEl: HTMLDivElement | undefined = $state();
  let equityContainer: HTMLDivElement | undefined = $state();
  let depthContainer: HTMLDivElement | undefined = $state();
  let heatmapContainer: HTMLDivElement | undefined = $state();
  let waterfallContainer: HTMLDivElement | undefined = $state();
  let gaugeContainer: HTMLDivElement | undefined = $state();
  let flowsContainer: HTMLDivElement | undefined = $state();
  let allocationContainer: HTMLDivElement | undefined = $state();
  let scatterContainer: HTMLDivElement | undefined = $state();
  let returnsContainer: HTMLDivElement | undefined = $state();
  let calendarContainer: HTMLDivElement | undefined = $state();
  let sectorContainer: HTMLDivElement | undefined = $state();
  let matrixContainer: HTMLDivElement | undefined = $state();
  let clockContainer: HTMLDivElement | undefined = $state();

  // --- Chart instances ---
  let sparkCharts: SparklineChart[] = [];
  let equityChart: EquityCurveChart | null = null;
  let depthChart: DepthChart | null = null;
  let heatmapChart: HeatmapChart | null = null;
  let waterfallChart: WaterfallChart | null = null;
  let gaugeChart: GaugeChart | null = null;
  let newCharts: (BarChart | DonutChart | ScatterChart | HistogramChart | CalendarChart | MatrixChart | HeatmapChart | CounterClockChart)[] = [];
  let gaugeInterval: ReturnType<typeof setInterval> | null = null;


  function formatPrice(price: number): string {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  }

  let stopThemeSync: (() => void) | null = null;

  function applyThemeToAll(theme: Theme): void {
    for (const sc of sparkCharts) {
      sc.setTheme(theme);
    }
    equityChart?.setTheme(theme);
    depthChart?.setTheme(theme);
    heatmapChart?.setTheme(theme);
    waterfallChart?.setTheme(theme);
    gaugeChart?.setTheme(theme);
    for (const chart of newCharts) chart.setTheme(theme);
  }

  onMount(async () => {
    // Wait for DOM to be fully laid out
    await tick();
    const theme = siteTheme();

    // Create sparkline charts — query DOM for containers
    if (sparkGridEl) {
      const sparkEls = sparkGridEl.querySelectorAll<HTMLDivElement>('.spark-chart');
      sparkEls.forEach((el, i) => {
        if (i >= cryptos.length) return;
        const crypto = cryptos[i];
        const isUp = crypto.change > 0;
        const tone = isUp ? theme.candleUp : theme.candleDown;
        const chart = new SparklineChart(el, {
          data: crypto.data,
          mode: 'area',
          color: tone,
          showLastPoint: true,
          lastPointColor: tone,
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

    // Rounded first, so a tiny loss doesn't read -0.0%.
    const pct = (v: number) => {
      const r = Math.round(v * 10) / 10 || 0;
      return `${r > 0 ? '+' : ''}${r.toFixed(1)}%`;
    };
    if (flowsContainer) {
      newCharts.push(new BarChart(flowsContainer, {
        categories: flowDays,
        series: [{ name: i18n.m.finance.flowSeries, values: flowValues }],
        ariaLabel: i18n.m.finance.flows,
        colorBySign: true,
        theme,
      }));
    }
    if (allocationContainer) {
      newCharts.push(new DonutChart(allocationContainer, {
        data: allocation,
        ariaLabel: i18n.m.finance.allocation,
        centerLabel: i18n.m.finance.allocationTotal,
        centerValue: '1.2B ₫',
        theme,
      }));
    }
    if (scatterContainer) {
      newCharts.push(new ScatterChart(scatterContainer, {
        series: [{ name: i18n.m.finance.banks, points: banks }],
        ariaLabel: i18n.m.finance.riskReturn,
        xLabel: i18n.m.finance.volatility,
        yLabel: i18n.m.finance.yearReturn,
        xFormat: (v) => `${v}%`,
        yFormat: (v) => `${v}%`,
        showLabels: true,
        maxRadius: 22,
        theme,
      }));
    }
    if (returnsContainer) {
      newCharts.push(new HistogramChart(returnsContainer, {
        values: dailyReturns,
        ariaLabel: i18n.m.finance.returns,
        binWidth: 0.5,
        colorBySign: true,
        valueFormat: pct,
        markers: [
          { value: meanReturn, label: i18n.m.finance.mean },
          { value: var95, label: i18n.m.finance.var, color: '#e8505b' },
        ],
        theme,
      }));
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
        valueFormat: (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString()}`,
        crosshair: true,
        theme,
      });
    }

    if (calendarContainer) {
      newCharts.push(new CalendarChart(calendarContainer, {
        data: sessionDays,
        // A phone shows the last six months, at a size that can be read.
        from: calendarContainer.clientWidth < 600 ? '2025-07-01' : undefined,
        ariaLabel: i18n.m.finance.calendar,
        weekdays: 5,
        locale: i18n.language.tag,
        valueFormat: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`,
        colorScale: { min: -2, max: 2 },
        theme,
      }));
    }
    if (sectorContainer) {
      newCharts.push(new HeatmapChart(sectorContainer, {
        data: sectorCells,
        grouped: true,
        ariaLabel: i18n.m.finance.sectorMap,
        valueFormat: pct,
        theme,
      }));
    }
    if (matrixContainer) {
      newCharts.push(new MatrixChart(matrixContainer, {
        rows: corrNames,
        values: correlations,
        triangle: 'lower',
        ariaLabel: i18n.m.finance.correlation,
        colorScale: { negative: '#e8505b', positive: '#2f81f7', min: -1, max: 1 },
        theme,
      }));
    }

    if (clockContainer) {
      newCharts.push(new CounterClockChart(clockContainer, {
        data: clockBars,
        period: 25,
        points: 120,
        ariaLabel: i18n.m.finance.counterClock,
        xLabel: i18n.m.finance.avgVolume,
        yLabel: i18n.m.finance.avgPrice,
        timeFormat: (t) => new Date(t).toLocaleDateString(i18n.language.tag, { timeZone: 'UTC' }),
        theme,
      }));
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

    stopThemeSync = onSiteThemeChange(applyThemeToAll);
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
    for (const chart of newCharts) chart.destroy();
    newCharts = [];
    if (gaugeInterval) {
      clearInterval(gaugeInterval);
      gaugeInterval = null;
    }
    stopThemeSync?.();
    stopThemeSync = null;
  });
</script>

<section class="finance-section">
  <header class="section-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">{m.finance.eyebrow}</span>
    <h2 class="section-title">{m.finance.title}</h2>
    <p class="section-subtitle">{m.finance.subtitle}</p>
  </header>

  <!-- Sparklines Row -->
  <div class="spark-grid" bind:this={sparkGridEl} data-reveal data-reveal-stagger>
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
  <div class="mid-grid" data-reveal data-reveal-stagger>
    <div class="chart-card">
      <div class="card-label">{m.finance.portfolio}</div>
      <div class="card-chart card-chart--300" bind:this={equityContainer}></div>
    </div>
    <div class="chart-card">
      <div class="card-label">{m.finance.depth}</div>
      <div class="card-chart card-chart--300" bind:this={depthContainer}></div>
    </div>
  </div>

  <!-- Heatmap -->
  <div class="chart-card chart-card--spaced" data-reveal>
    <div class="card-label">{m.finance.heatmap}</div>
    <div class="card-chart card-chart--350" bind:this={heatmapContainer}></div>
  </div>

  <!-- Waterfall + Gauge Row -->
  <div class="mid-grid" data-reveal data-reveal-stagger>
    <div class="chart-card">
      <div class="card-label">{m.finance.pnl}</div>
      <div class="card-chart card-chart--300" bind:this={waterfallContainer}></div>
    </div>
    <div class="chart-card">
      <div class="card-label">{m.finance.fearGreed}</div>
      <div class="card-chart card-chart--300" bind:this={gaugeContainer}></div>
    </div>
  </div>

  <div class="mid-grid" data-reveal data-reveal-stagger>
    <div class="chart-card">
      <div class="card-label">{m.finance.flows}</div>
      <div class="card-chart card-chart--300" bind:this={flowsContainer}></div>
    </div>
    <div class="chart-card">
      <div class="card-label">{m.finance.allocation}</div>
      <div class="card-chart card-chart--300" bind:this={allocationContainer}></div>
    </div>
  </div>

  <div class="mid-grid" data-reveal data-reveal-stagger>
    <div class="chart-card">
      <div class="card-label">{m.finance.riskReturn}</div>
      <div class="card-chart card-chart--300" bind:this={scatterContainer}></div>
    </div>
    <div class="chart-card">
      <div class="card-label">{m.finance.returns}</div>
      <div class="card-chart card-chart--300" bind:this={returnsContainer}></div>
    </div>
  </div>

  <div class="chart-card chart-card--spaced" data-reveal>
    <div class="card-label">{m.finance.calendar}</div>
    <div class="card-chart card-chart--200" bind:this={calendarContainer}></div>
  </div>

  <div class="mid-grid" data-reveal data-reveal-stagger>
    <div class="chart-card">
      <div class="card-label">{m.finance.sectorMap}</div>
      <div class="card-chart card-chart--300" bind:this={sectorContainer}></div>
    </div>
    <div class="chart-card">
      <div class="card-label">{m.finance.correlation}</div>
      <div class="card-chart card-chart--300" bind:this={matrixContainer}></div>
    </div>
  </div>

  <div class="chart-card chart-card--spaced" data-reveal>
    <div class="card-label">{m.finance.counterClock}</div>
    <div class="card-chart card-chart--320" bind:this={clockContainer}></div>
  </div>
</section>

<style>
  .finance-section {
    padding: var(--section-pad) var(--gutter);
    max-width: var(--page-max);
    margin: 0 auto;
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

  .card-chart--200 {
    height: 200px;
  }

  .card-chart--300 {
    height: 300px;
  }

  .card-chart--320 {
    height: 320px;
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
    .spark-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .mid-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
