<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { ChartType, TimeFrame } from '@tradecanvas/chart';
  import { siteTheme, onSiteThemeChange } from '$lib/site';

  let host: HTMLDivElement | undefined = $state();
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let errorMessage = $state('');

  let activeSymbol = $state('BTCUSDT');
  let activeTf = $state<TimeFrame>('5m');
  let activeType = $state<ChartType>('candlestick');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let widget: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chart: any = null;

  const SYMBOLS = [
    { id: 'BTCUSDT', label: 'BTC' },
    { id: 'ETHUSDT', label: 'ETH' },
    { id: 'SOLUSDT', label: 'SOL' },
    { id: 'BNBUSDT', label: 'BNB' },
  ] as const;

  const TIMEFRAMES: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

  const TYPES: { id: ChartType; label: string }[] = [
    { id: 'candlestick', label: 'Candles' },
    { id: 'heikinAshi', label: 'Heikin-Ashi' },
    { id: 'area', label: 'Area' },
    { id: 'bar', label: 'Bars' },
    { id: 'baseline', label: 'Baseline' },
  ];

  // No local busy state: the widget drops superseded switches itself and
  // shows its own loading veil only when a switch is actually slow.
  function pickSymbol(sym: string) {
    if (sym === activeSymbol || !widget) return;
    activeSymbol = sym;
    void widget.setSymbol(sym);
  }

  function pickTf(tf: TimeFrame) {
    if (tf === activeTf || !widget) return;
    activeTf = tf;
    void widget.setTimeframe(tf);
  }

  function pickType(type: ChartType) {
    if (type === activeType || !chart) return;
    activeType = type;
    chart.setChartType(type);
  }

  onMount(() => {
    if (!browser || !host) return;
    let cancelled = false;
    const stopThemeSync = onSiteThemeChange((theme) => widget?.setTheme?.(theme));

    (async () => {
      try {
        const { ChartWidget } = await import('@tradecanvas/chart/widget');
        const { BinanceAdapter } = await import('@tradecanvas/chart');
        if (cancelled || !host) return;

        widget = new ChartWidget(host, {
          symbol: activeSymbol,
          timeframe: activeTf,
          theme: siteTheme(),
          adapter: new BinanceAdapter(),
          historyLimit: 320,
          toolbar: false,
          drawingTools: false,
          settings: false,
          trading: false,
          statusBar: false,
          watchlist: false,
          onReady: (c: unknown) => {
            chart = c;
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
      stopThemeSync();
      widget?.destroy?.();
      widget = null;
      chart = null;
    };
  });
</script>

<div class="terminal">
  <div class="terminal-bar">
    <div class="seg seg--symbol" role="group" aria-label="Symbol">
      {#each SYMBOLS as s}
        <button class="chip" class:active={activeSymbol === s.id} aria-pressed={activeSymbol === s.id} onclick={() => pickSymbol(s.id)} type="button">{s.label}</button>
      {/each}
    </div>
    <div class="seg seg--tf" role="group" aria-label="Timeframe">
      {#each TIMEFRAMES as tf}
        <button class="chip chip--sm" class:active={activeTf === tf} aria-pressed={activeTf === tf} onclick={() => pickTf(tf)} type="button">{tf}</button>
      {/each}
    </div>
    <div class="seg seg--type" role="group" aria-label="Chart type">
      {#each TYPES as t}
        <button class="chip chip--ghost" class:active={activeType === t.id} aria-pressed={activeType === t.id} onclick={() => pickType(t.id)} type="button">{t.label}</button>
      {/each}
    </div>
  </div>

  <div class="terminal-frame" class:is-loading={status !== 'ready'}>
    <div class="terminal-host" bind:this={host}></div>
    {#if status === 'loading'}
      <div class="terminal-overlay"><span class="pulse"></span><span>Connecting to Binance…</span></div>
    {:else if status === 'error'}
      <div class="terminal-overlay terminal-overlay--error">Live feed unavailable: {errorMessage}</div>
    {/if}
  </div>

  <div class="terminal-status">
    <span class="status-feed">
      <span class="live-dot" class:on={status === 'ready'}></span>
      {status === 'ready' ? 'LIVE' : status === 'error' ? 'OFFLINE' : 'CONNECTING'} · BINANCE · {activeSymbol} · {activeTf}
    </span>
    <span class="status-hints">
      <span><kbd>Drag</kbd> pan</span>
      <span><kbd>Scroll</kbd> zoom</span>
      <span><kbd>Drag axis</kbd> scale</span>
    </span>
  </div>
</div>

<style>
  .terminal {
    display: flex;
    flex-direction: column;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--bg-elevated);
    overflow: hidden;
    box-shadow: var(--shadow-lg);
  }

  .terminal-bar {
    display: flex;
    align-items: center;
    gap: 8px 14px;
    flex-wrap: wrap;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
  }

  .seg { display: inline-flex; gap: 2px; }
  .seg--type { margin-left: auto; }

  .chip {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    padding: 4px 9px;
    border-radius: 4px;
    cursor: pointer;
    transition: color var(--transition), background var(--transition), border-color var(--transition);
    white-space: nowrap;
  }

  .chip--sm { padding: 4px 7px; font-size: 11.5px; }
  .chip--ghost { font-family: var(--font); font-size: 12.5px; }

  .chip:hover { color: var(--text); background: var(--bg-panel); }

  .chip.active {
    color: var(--accent-ink);
    background: var(--accent-fill);
  }

  .chip--ghost.active {
    color: var(--text);
    background: transparent;
    border-color: var(--border);
  }

  .terminal-frame {
    position: relative;
    height: clamp(360px, 46vw, 470px);
    background: var(--bg);
  }

  .terminal-frame.is-loading .terminal-host { opacity: 0; }

  .terminal-host {
    width: 100%;
    height: 100%;
    transition: opacity 200ms ease;
  }

  .terminal-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 12.5px;
    pointer-events: none;
  }

  .terminal-overlay--error {
    color: var(--red);
    padding: 0 24px;
    text-align: center;
  }

  .pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.6s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 60%, transparent); }
    70% { box-shadow: 0 0 0 12px color-mix(in srgb, var(--accent) 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent); }
  }

  .terminal-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px 16px;
    flex-wrap: wrap;
    padding: 7px 12px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  .status-feed { display: inline-flex; align-items: center; gap: 8px; letter-spacing: 0.04em; }
  .status-hints { display: inline-flex; gap: 14px; flex-wrap: wrap; }
  .status-hints kbd { font-size: 10.5px; padding: 0 4px; }

  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-muted);
    flex-shrink: 0;
  }

  .live-dot.on {
    background: var(--green);
    animation: live 1.8s infinite;
  }

  @keyframes live {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 50%, transparent); }
    70% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--green) 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 0%, transparent); }
  }

  @media (max-width: 768px) {
    .seg--type { margin-left: 0; }
    .status-hints { display: none; }
  }
</style>
