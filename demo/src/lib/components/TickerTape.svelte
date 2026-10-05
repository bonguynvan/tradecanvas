<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { tapeChange, tapePrice } from '$lib/landing';

  const i18n = useI18n();
  const m = $derived(i18n.m);

  const SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT',
    'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT', 'LTCUSDT', 'TRXUSDT',
  ] as const;

  interface Row {
    last: number;
    percent: number | null;
    /** Which way the last change went, and a counter that restarts the flash. */
    tick: 'up' | 'down' | null;
    flash: number;
  }

  let rows = $state<Record<string, Row>>({});
  /** Stopped by its button, for anyone the motion bothers (hover pauses it too). */
  let paused = $state(false);

  onMount(() => {
    if (!browser) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { BinanceAdapter } = await import('@tradecanvas/chart');
        if (cancelled) return;
        stop = new BinanceAdapter().subscribeQuotes(SYMBOLS, (quotes) => {
          const next = { ...rows };
          for (const q of quotes) {
            const before = next[q.symbol];
            const tick = before && q.last !== before.last ? (q.last > before.last ? 'up' : 'down') : before?.tick ?? null;
            next[q.symbol] = {
              last: q.last,
              percent: q.changePercent ?? null,
              tick,
              flash: before && q.last !== before.last ? before.flash + 1 : before?.flash ?? 0,
            };
          }
          rows = next;
        });
      } catch (err) {
        // The tape is decoration: without a feed it shows the symbols alone.
        console.warn('Ticker tape unavailable:', err);
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  });
</script>

<!-- Twice over, so the loop seams; the copy is hidden from assistive tech. -->
<div class="tape" class:paused role="region" aria-label={m.home.tape}>
  <div class="tape-window">
    <div class="tape-track">
      {#each [0, 1] as copy}
        <ul class="tape-run" aria-hidden={copy === 1 ? 'true' : undefined}>
          {#each SYMBOLS as symbol}
            {@const row = rows[symbol]}
            <li class="tape-item">
              <span class="tape-symbol">{symbol.replace(/USDT$/, '')}</span>
              {#key row?.flash}
                <span class="tape-price" class:flash-up={row?.tick === 'up'} class:flash-down={row?.tick === 'down'}>{row ? tapePrice(row.last) : '—'}</span>
              {/key}
              <span class="tape-change" class:up={(row?.percent ?? 0) > 0} class:down={(row?.percent ?? 0) < 0}>{row ? tapeChange(row.percent) : ''}</span>
            </li>
          {/each}
        </ul>
      {/each}
    </div>
  </div>
  <button
    type="button"
    class="tape-toggle"
    aria-label={paused ? m.home.tapePlay : m.home.tapePause}
    title={paused ? m.home.tapePlay : m.home.tapePause}
    onclick={() => { paused = !paused; }}
  >
    {#if paused}
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M3 1.5v9l7.5-4.5z" /></svg>
    {:else}
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" /></svg>
    {/if}
  </button>
</div>

<style>
  .tape {
    position: relative;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  /* Fades at both ends: the run slides in and out of view (the pause button sits over the right fade). */
  .tape-window {
    overflow: hidden;
    mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
  }

  .tape-track {
    display: flex;
    width: max-content;
    animation: tape 70s linear infinite;
  }

  .tape.paused .tape-track { animation-play-state: paused; }

  /* A real hover only: a tap leaves :hover stuck on a touch screen. */
  @media (hover: hover) {
    .tape:hover .tape-track { animation-play-state: paused; }
  }

  /* At least a screen wide each, so the loop never shows a gap on a wide screen. */
  .tape-run {
    display: flex;
    justify-content: space-around;
    min-width: 100vw;
    list-style: none;
  }

  .tape-toggle {
    position: absolute;
    right: 6px;
    top: 50%;
    translate: 0 -50%;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--bg-elevated);
    color: var(--text-muted);
    cursor: pointer;
    transition: color var(--transition), border-color var(--transition);
  }

  .tape-toggle:hover { color: var(--text); border-color: var(--text-muted); }
  .tape-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  .tape-item {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 9px 22px;
    border-right: 1px solid var(--border-subtle);
    white-space: nowrap;
  }

  .tape-symbol { color: var(--text); font-weight: 500; letter-spacing: 0.02em; }
  .tape-price { color: var(--text-dim); border-radius: 3px; padding: 0 3px; }
  .tape-change { color: var(--text-muted); min-width: 6ch; }
  .tape-change.up { color: var(--green); }
  .tape-change.down { color: var(--red); }

  .flash-up { animation: flash-up 0.9s ease-out; }
  .flash-down { animation: flash-down 0.9s ease-out; }

  @keyframes flash-up {
    from { background: color-mix(in srgb, var(--green) 32%, transparent); color: var(--text); }
    to { background: transparent; }
  }

  @keyframes flash-down {
    from { background: color-mix(in srgb, var(--red) 32%, transparent); color: var(--text); }
    to { background: transparent; }
  }

  @keyframes tape {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  /* Still: the run scrolls by hand instead, its copy left out. */
  @media (prefers-reduced-motion: reduce) {
    .tape-window { overflow-x: auto; scrollbar-width: none; mask-image: none; }
    .tape-track { animation: none; }
    .tape-run:last-child { display: none; }
    .tape-run { min-width: 0; }
    .tape-toggle { display: none; }
  }
</style>
