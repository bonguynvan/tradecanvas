<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let host: HTMLDivElement | undefined = $state();
  let widget: { destroy?: () => void } | null = null;

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

    try {
      const { ChartWidget } = await import('@tradecanvas/chart/widget');
      const { BinanceAdapter } = await import('@tradecanvas/chart');

      widget = new ChartWidget(host, {
        symbol,
        timeframe,
        theme,
        chartType,
        adapter: new BinanceAdapter(),
        historyLimit: 500,
        trading,
        onReady: (chart) => {
          for (const id of indicators) {
            chart.addIndicator(id, {});
          }
        },
      });
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
