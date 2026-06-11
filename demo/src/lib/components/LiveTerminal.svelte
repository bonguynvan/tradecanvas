<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { ChartType, TimeFrame } from '@tradecanvas/chart';

  let host: HTMLDivElement | undefined = $state();
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let errorMessage = $state('');
  let busy = $state(false);

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

  async function pickSymbol(sym: string) {
    if (sym === activeSymbol || !widget || busy) return;
    busy = true;
    activeSymbol = sym;
    try { await widget.setSymbol(sym); } catch (e) { console.error(e); }
    busy = false;
  }

  async function pickTf(tf: TimeFrame) {
    if (tf === activeTf || !widget || busy) return;
    busy = true;
    activeTf = tf;
    try { await widget.setTimeframe(tf); } catch (e) { console.error(e); }
    busy = false;
  }

  function pickType(type: ChartType) {
    if (type === activeType || !chart) return;
    activeType = type;
    chart.setChartType(type);
  }

  onMount(() => {
    if (!browser || !host) return;
    let cancelled = false;

    (async () => {
      try {
        const { ChartWidget } = await import('@tradecanvas/chart/widget');
        const { BinanceAdapter } = await import('@tradecanvas/chart');
        if (cancelled || !host) return;

        widget = new ChartWidget(host, {
          symbol: activeSymbol,
          timeframe: activeTf,
          theme: document.body.classList.contains('light') ? 'light' : 'dark',
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
      widget?.destroy?.();
      widget = null;
      chart = null;
    };
  });
</script>

<div class="terminal">
  <div class="terminal-bar">
    <div class="seg seg--symbol">
      {#each SYMBOLS as s}
        <button class="chip" class:active={activeSymbol === s.id} onclick={() => pickSymbol(s.id)} type="button">{s.label}</button>
      {/each}
    </div>
    <div class="seg seg--tf">
      {#each TIMEFRAMES as tf}
        <button class="chip chip--sm" class:active={activeTf === tf} onclick={() => pickTf(tf)} type="button">{tf}</button>
      {/each}
    </div>
    <div class="seg seg--type">
      {#each TYPES as t}
        <button class="chip chip--ghost" class:active={activeType === t.id} onclick={() => pickType(t.id)} type="button">{t.label}</button>
      {/each}
    </div>
    <span class="live-dot" class:on={status === 'ready'} title={status === 'ready' ? 'Live' : 'Connecting'}></span>
  </div>

  <div class="terminal-frame" class:is-loading={status !== 'ready'}>
    <div class="terminal-host" bind:this={host}></div>
    {#if status === 'loading'}
      <div class="terminal-overlay"><span class="pulse"></span><span>Connecting to Binance…</span></div>
    {:else if status === 'error'}
      <div class="terminal-overlay terminal-overlay--error">Live feed unavailable — {errorMessage}</div>
    {:else if busy}
      <div class="terminal-overlay terminal-overlay--soft"><span class="pulse"></span></div>
    {/if}
  </div>

  <div class="terminal-hint">
    <span><strong>Drag</strong> to pan</span>
    <span><strong>Scroll</strong> to zoom</span>
    <span><strong>Drag axes</strong> to scale</span>
    <span><strong>Hover</strong> for crosshair</span>
  </div>
</div>

<style>
  .terminal {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .terminal-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  .seg {
    display: inline-flex;
    gap: 4px;
    padding: 2px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--bg) 60%, transparent);
  }

  .seg--type { margin-left: auto; }

  .chip {
    font-family: var(--font);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--text-muted);
    background: transparent;
    border: none;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: color var(--transition), background var(--transition);
    white-space: nowrap;
  }

  .chip--sm { padding: 5px 8px; font-size: 11px; }
  .chip--ghost { font-weight: 500; }

  .chip:hover { color: var(--text); }

  .chip.active {
    color: #fff;
    background: var(--accent);
  }

  .chip--ghost.active {
    color: var(--accent);
    background: var(--accent-glow);
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
    flex-shrink: 0;
    margin-left: 4px;
  }

  .live-dot.on {
    background: var(--green);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
    animation: live 1.8s infinite;
  }

  @keyframes live {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
    70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }

  .terminal-frame {
    position: relative;
    height: 440px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--bg-elevated);
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
    font-size: 13px;
    pointer-events: none;
    background: color-mix(in srgb, var(--bg-elevated) 70%, transparent);
  }

  .terminal-overlay--soft {
    background: transparent;
    inset: auto 12px 12px auto;
  }

  .terminal-overlay--error {
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 0 24px;
    text-align: center;
  }

  .pulse {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6);
    animation: pulse 1.6s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
    70% { box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }

  .terminal-hint {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    padding: 0 4px;
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .terminal-hint strong { color: var(--text-dim); font-weight: 600; }

  @media (max-width: 768px) {
    .terminal-frame { height: 360px; }
    .seg--type { margin-left: 0; }
  }
</style>
