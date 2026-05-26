<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let host: HTMLDivElement | undefined = $state();
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let errorMessage = $state('');
  let widgetInstance: { destroy?: () => void } | null = null;

  onMount(() => {
    if (!browser || !host) return;

    let cancelled = false;

    (async () => {
      try {
        const { ChartWidget } = await import('@tradecanvas/chart/widget');
        const { BinanceAdapter } = await import('@tradecanvas/chart');
        if (cancelled || !host) return;

        widgetInstance = new ChartWidget(host, {
          symbol: 'BTCUSDT',
          timeframe: '5m',
          theme: 'dark',
          adapter: new BinanceAdapter(),
          historyLimit: 300,
          trading: false,
          onReady: () => {
            if (!cancelled) status = 'ready';
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        errorMessage = err instanceof Error ? err.message : String(err);
        status = 'error';
      }
    })();

    return () => {
      cancelled = true;
      widgetInstance?.destroy?.();
      widgetInstance = null;
    };
  });
</script>

<section class="showcase">
  <div class="showcase-header">
    <h2 class="section-title" style="margin-bottom: 4px">Live in your browser</h2>
    <p class="section-subtitle" style="margin-bottom: 16px">
      A single <code>ChartWidget</code> call rendering live BTC/USDT 5m candles from Binance.
      Try <kbd>Ctrl/Cmd+K</kbd> for the command palette.
    </p>
  </div>

  <div class="showcase-frame" class:is-loading={status !== 'ready'}>
    <div class="showcase-host" bind:this={host}></div>
    {#if status === 'loading'}
      <div class="showcase-overlay">
        <span class="showcase-pulse"></span>
        <span>Loading live data…</span>
      </div>
    {:else if status === 'error'}
      <div class="showcase-overlay showcase-overlay-error">
        Couldn't load live data — {errorMessage}
      </div>
    {/if}
  </div>
</section>

<style>
  .showcase {
    max-width: 1080px;
    margin: 0 auto;
    padding: 32px 24px 24px;
  }

  .showcase-frame {
    position: relative;
    height: 520px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--bg-elevated);
    transition: opacity 250ms ease;
  }

  .showcase-frame.is-loading .showcase-host {
    opacity: 0;
  }

  .showcase-host {
    width: 100%;
    height: 100%;
    transition: opacity 250ms ease;
  }

  .showcase-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-dim);
    font-size: 13.5px;
    pointer-events: none;
  }

  .showcase-overlay-error {
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 0 24px;
    text-align: center;
  }

  .showcase-pulse {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6);
    animation: pulse 1.6s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
    70% { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }

  @media (max-width: 768px) {
    .showcase-frame {
      height: 400px;
    }
  }
</style>
