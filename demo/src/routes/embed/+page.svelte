<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  import type { OHLCBar } from '@tradecanvas/chart';

  let host: HTMLDivElement | undefined = $state();
  let widget: { destroy?: () => void } | null = null;

  /** Deterministic random-walk 1m bars, seeded per symbol so each ticker differs. */
  function generateBars(count: number, symbol: string): OHLCBar[] {
    let seed = [...symbol].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const step = 60_000;
    const start = Math.floor(Date.now() / step) * step - count * step;
    const bars: OHLCBar[] = [];
    let price = 100 + (seed % 900);
    for (let i = 0; i < count; i++) {
      const open = price;
      const close = Math.max(1, open * (1 + (rand() - 0.5) * 0.004));
      const high = Math.max(open, close) * (1 + rand() * 0.0015);
      const low = Math.min(open, close) * (1 - rand() * 0.0015);
      bars.push({ time: start + i * step, open, high, low, close, volume: 50 + rand() * 500 });
      price = close;
    }
    return bars;
  }

  onMount(async () => {
    if (!browser || !host) return;

    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol') ?? 'BTCUSDT';
    const timeframe = (params.get('timeframe') ?? '5m') as
      | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    const theme = (params.get('theme') ?? 'dark') as 'dark' | 'light' | 'darkTerminal';
    const chartType = params.get('chartType') as
      | undefined
      | 'candlestick' | 'line' | 'area' | 'bar' | 'heikinAshi' | 'equivolume';
    const indicators = params.get('indicators')?.split(',').filter(Boolean) ?? [];
    const trading = params.get('trading') === 'true';
    const watchlist = params.get('watchlist') === 'true';
    const locale = params.get('locale') ?? undefined;
    const numberLocale = params.get('numberLocale') ?? undefined;
    // `?latency=1500` delays every history request — shows the loading veil
    // a slow network gets on symbol/timeframe switches.
    const latency = Math.max(0, Number(params.get('latency')) || 0);
    // `?bars=200000` loads that many generated 1m bars instead of Binance;
    // timeframe switches then resample locally (no network).
    const staticBars = Math.max(0, Math.floor(Number(params.get('bars')) || 0));

    try {
      const { ChartWidget } = await import('@tradecanvas/chart/widget');
      const { BinanceAdapter } = await import('@tradecanvas/chart');

      let adapter: InstanceType<typeof BinanceAdapter> | undefined;
      if (!staticBars) {
        adapter = new BinanceAdapter();
        if (latency > 0) {
          const fetchHistory = adapter.fetchHistory.bind(adapter);
          adapter.fetchHistory = async (...args) => {
            await new Promise((r) => setTimeout(r, latency));
            return fetchHistory(...args);
          };
        }
      }

      const instance = new ChartWidget(host, {
        symbol,
        timeframe,
        theme,
        chartType,
        adapter,
        historyLimit: 500,
        trading,
        watchlist,
        locale,
        chartOptions: numberLocale ? { numberLocale } : undefined,
        onReady: (chart) => {
          for (const id of indicators) {
            chart.addIndicator(id, {});
          }
        },
        onSymbolChange: (sym) => {
          if (staticBars) instance.setData(generateBars(staticBars, sym));
        },
      });
      widget = instance;
      if (staticBars) instance.setData(generateBars(staticBars, symbol));
      // Dev-only handle for profiling the live widget from the console.
      if (import.meta.env.DEV) (window as unknown as { __tcWidget: unknown }).__tcWidget = widget;
    } catch (err) {
      if (host) {
        host.innerHTML = `<div style="padding:24px;color:#a1a1aa;font-family:monospace;">Failed to load widget: ${String(err)}</div>`;
      }
    }

    return () => {
      widget?.destroy?.();
    };
  });
</script>

<svelte:head>
  <title>TradeCanvas embed</title>
  <meta name="description" content="Embeddable TradeCanvas widget." />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="embed-host" bind:this={host}></div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: var(--bg);
  }

  :global(.site-nav),
  :global(.footer) {
    display: none;
  }

  .embed-host {
    width: 100vw;
    height: 100vh;
    display: block;
  }
</style>
