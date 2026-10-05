<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { ChartType, TimeFrame } from '@tradecanvas/chart';
  import { siteTheme, onSiteThemeChange } from '$lib/site';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';
  import { widgetLanguage } from '$lib/i18n/widget';
  import { pressToEngage } from '$lib/pressToEngage';
  import EngageHint from './EngageHint.svelte';

  interface Props {
    /** 'stage': wide and tall, edge to edge on a phone, as the hero's chart. */
    variant?: 'panel' | 'stage';
    /** What draws it: 'auto' takes WebGL on a real GPU. */
    renderer?: 'canvas' | 'auto';
  }

  let { variant = 'panel', renderer = 'canvas' }: Props = $props();

  const i18n = useI18n();
  const m = $derived(i18n.m);

  /** What draws the chart now, once known. */
  let drawnWith = $state<'canvas' | 'webgl' | null>(null);

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

  /** Labels are `m.terminal.types[id]`. */
  const TYPES: { id: keyof typeof i18n.m.terminal.types & ChartType }[] = [
    { id: 'candlestick' },
    { id: 'heikinAshi' },
    { id: 'area' },
    { id: 'bar' },
    { id: 'baseline' },
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
        const language = await widgetLanguage(i18n.lang);
        if (cancelled || !host) return;

        widget = new ChartWidget(host, {
          ...language,
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
            if (cancelled) return;
            status = 'ready';
            drawnWith = chart.getRenderer();
            chart.on('rendererChange', (e: { payload: { renderer: 'canvas' | 'webgl' } }) => { drawnWith = e.payload.renderer; });
            if (renderer !== 'canvas') void chart.setRenderer(renderer);
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

<div class="terminal" class:terminal--stage={variant === 'stage'}>
  <div class="terminal-bar">
    <div class="seg seg--symbol" role="group" aria-label={m.terminal.symbol}>
      {#each SYMBOLS as s}
        <button class="chip" class:active={activeSymbol === s.id} aria-pressed={activeSymbol === s.id} onclick={() => pickSymbol(s.id)} type="button">{s.label}</button>
      {/each}
    </div>
    <div class="seg seg--tf" role="group" aria-label={m.terminal.timeframe}>
      {#each TIMEFRAMES as tf}
        <button class="chip chip--sm" class:active={activeTf === tf} aria-pressed={activeTf === tf} onclick={() => pickTf(tf)} type="button">{tf}</button>
      {/each}
    </div>
    <div class="seg seg--type" role="group" aria-label={m.terminal.chartType}>
      {#each TYPES as t}
        <button class="chip chip--ghost" class:active={activeType === t.id} aria-pressed={activeType === t.id} onclick={() => pickType(t.id)} type="button">{m.terminal.types[t.id]}</button>
      {/each}
    </div>
  </div>

  <!-- While loading, the widget shows its own candle skeleton. -->
  <!-- The wheel and swipes scroll the page until the chart is clicked. -->
  <div class="terminal-frame" use:pressToEngage={{ surface: '.terminal-host', outside: '.tcw-portal' }}>
    <div class="terminal-host" bind:this={host}></div>
    <EngageHint />
    {#if status === 'error'}
      <div class="terminal-overlay terminal-overlay--error">{fill(m.terminal.unavailable, { error: errorMessage })}</div>
    {/if}
  </div>

  <div class="terminal-status">
    <span class="status-feed">
      <span class="live-dot" class:on={status === 'ready'}></span>
      {status === 'ready' ? m.terminal.live : status === 'error' ? m.terminal.offline : m.terminal.connecting} · BINANCE · {activeSymbol} · {activeTf}
      {#if drawnWith && variant === 'stage'}
        <span class="drawn-with" class:gpu={drawnWith === 'webgl'}>{fill(m.terminal.drawnWith, { renderer: drawnWith === 'webgl' ? 'WebGL' : 'Canvas 2D' })}</span>
      {/if}
    </span>
    <span class="status-hints">
      {#each m.terminal.hints as [key, what]}
        <span><kbd>{key}</kbd> {what}</span>
      {/each}
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

  .seg { display: inline-flex; gap: 2px; min-width: 0; }
  /* Longer chart-type names (Russian, German…) scroll rather than spill out on a phone. */
  .seg--type { margin-left: auto; max-width: 100%; overflow-x: auto; scrollbar-width: none; }

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

  .terminal-frame:not([data-engaged]) { cursor: pointer; }

  .terminal-frame {
    position: relative;
    height: clamp(360px, 46vw, 470px);
    background: var(--bg);
  }

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

  .drawn-with {
    margin-left: 6px;
    padding: 1px 7px;
    border: 1px solid var(--border);
    border-radius: 999px;
    letter-spacing: 0.02em;
  }

  .drawn-with.gpu { color: var(--accent); border-color: var(--accent-dim); }

  /* The hero's stage: room for the bars to breathe. */
  .terminal--stage .terminal-frame { height: clamp(380px, 54vh, 620px); }
  .terminal--stage { box-shadow: 0 40px 120px -60px color-mix(in srgb, var(--accent) 35%, transparent), var(--shadow-lg); }

  @media (max-width: 768px) {
    .seg--type { margin-left: 0; }
    .status-hints { display: none; }
    /* Edge to edge on a phone: the bars get the whole width. */
    .terminal--stage { border-left: 0; border-right: 0; border-radius: 0; }
    .terminal--stage .terminal-frame { height: clamp(320px, 58vh, 460px); }
  }
</style>
