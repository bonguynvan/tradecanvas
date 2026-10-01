<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { Chart, DataAdapter } from '@tradecanvas/chart';
  import type { ChartWidget } from '@tradecanvas/chart/widget';
  import { FEATURE_SCENES, type SceneEnv } from '$lib/featureScenes';

  let section: HTMLElement | undefined = $state();
  let host: HTMLDivElement | undefined = $state();
  let active = $state(0);
  let metrics = $state<string[]>([]);
  let started = $state(false);

  let widget: ChartWidget | null = null;
  let mountToken = 0;

  const scene = $derived(FEATURE_SCENES[active]);

  const isLight = () => document.body.classList.contains('light');

  function fmtMs(ms: number): string {
    return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;
  }

  function pushMetric(text: string) {
    metrics = [text, ...metrics].slice(0, 3);
  }

  /** A Binance adapter whose history requests arrive `latencyMs` late. */
  function delayed(adapter: DataAdapter, latencyMs: number): DataAdapter {
    const fetchHistory = adapter.fetchHistory.bind(adapter);
    adapter.fetchHistory = async (...args) => {
      await new Promise((r) => setTimeout(r, latencyMs));
      return fetchHistory(...args);
    };
    return adapter;
  }

  function firstBars(chart: Chart): Promise<void> {
    if (chart.getData().length > 0) return Promise.resolve();
    return new Promise((resolve) => {
      const onData = (e: { payload: unknown }) => {
        if (((e.payload as { length?: number })?.length ?? 0) > 0) {
          chart.off('dataUpdate', onData);
          resolve();
        }
      };
      chart.on('dataUpdate', onData);
    });
  }

  async function mountScene(index: number) {
    const token = ++mountToken;
    widget?.destroy();
    widget = null;
    metrics = [];
    if (!host) return;

    const [{ ChartWidget }, lib] = await Promise.all([
      import('@tradecanvas/chart/widget'),
      import('@tradecanvas/chart'),
    ]);
    if (token !== mountToken || !host) return;

    const env: SceneEnv = {
      lib,
      binance: () => new lib.BinanceAdapter(),
      slowBinance: (ms) => delayed(new lib.BinanceAdapter(), ms),
    };
    const current = FEATURE_SCENES[index];
    const opts = current.options(env);
    let pending: { label: string; t: number } | null = null;

    const w: ChartWidget = new ChartWidget(host, {
      theme: isLight() ? 'light' : 'dark',
      historyLimit: 500,
      ...opts,
      onSymbolChange: (sym) => {
        pending = { label: sym, t: performance.now() };
        opts.onSymbolChange?.(sym);
        if (current.data) w.setData(current.data(sym));
      },
      onTimeframeChange: (tf) => {
        pending = { label: tf, t: performance.now() };
        opts.onTimeframeChange?.(tf);
      },
    });
    widget = w;
    const chart = w.getChart();

    // Time every switch, network included, until its bars are on the chart.
    chart.on('dataUpdate', (e) => {
      const length = (e.payload as { length?: number })?.length;
      if (!pending || typeof length !== 'number' || length === 0) return;
      pushMetric(`→ ${pending.label}: ${fmtMs(performance.now() - pending.t)} · ${length.toLocaleString('en-US')} bars`);
      pending = null;
    });

    if (current.data) {
      const bars = current.data(opts.symbol ?? 'DEMO');
      const t0 = performance.now();
      w.setData(bars);
      pushMetric(`setData(${bars.length.toLocaleString('en-US')} bars): ${fmtMs(performance.now() - t0)}`);
    }

    await firstBars(chart);
    if (token !== mountToken) return;
    await current.setup?.(w, chart, env);
  }

  function select(index: number) {
    if (index === active && widget) return;
    active = index;
    if (started) void mountScene(index);
  }

  onMount(() => {
    if (!browser || !section) return;

    // Only spin up a live chart once the lab scrolls into view.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !started) {
        started = true;
        io.disconnect();
        void mountScene(active);
      }
    }, { rootMargin: '200px' });
    io.observe(section);

    // Follow the site's light/dark toggle.
    const mo = new MutationObserver(() => widget?.setTheme(isLight() ? 'light' : 'dark'));
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      io.disconnect();
      mo.disconnect();
      mountToken++;
      widget?.destroy();
      widget = null;
    };
  });
</script>

<section class="lab" bind:this={section} aria-labelledby="lab-title">
  <header class="lab-head">
    <span class="lab-eyebrow">Feature lab</span>
    <h2 id="lab-title" class="lab-title">Every feature, on a live chart.</h2>
    <p class="lab-sub">
      Pick a scene. Each one boots the full <code>ChartWidget</code> into a state that shows
      one area at work — then it is yours to drag, draw and switch.
    </p>
  </header>

  <div class="lab-body">
    <ol class="lab-rail" role="tablist" aria-label="Feature scenes">
      {#each FEATURE_SCENES as s, i}
        <li>
          <button
            type="button"
            role="tab"
            class="rail-item"
            class:active={i === active}
            aria-selected={i === active}
            aria-controls="lab-stage"
            onclick={() => select(i)}
          >
            <span class="rail-num">{String(i + 1).padStart(2, '0')}</span>
            <span class="rail-title">{s.title}</span>
            <span class="rail-stat">{s.stat}</span>
          </button>
          {#if i === active}
            <p class="rail-blurb">{s.blurb}</p>
          {/if}
        </li>
      {/each}
    </ol>

    <div class="lab-stage" id="lab-stage" role="tabpanel">
      <p class="stage-blurb">{scene.blurb}</p>
      <div class="stage-frame">
        <div class="stage-host" bind:this={host}></div>
        {#if !started}
          <div class="stage-idle">Scroll into view to start the live chart</div>
        {/if}
      </div>
      <div class="stage-metrics" aria-live="polite">
        {#if metrics.length === 0}
          <span class="metric metric--muted">Switch a symbol or timeframe to time it</span>
        {:else}
          {#each metrics as m, i}
            <span class="metric" class:metric--latest={i === 0}>{m}</span>
          {/each}
        {/if}
      </div>

      <div class="stage-notes">
        <div class="notes-try">
          <h3>Try this</h3>
          <ul>
            {#each scene.tryThis as tip}
              <li>{tip}</li>
            {/each}
          </ul>
        </div>
        <pre class="notes-code"><code>{scene.code}</code></pre>
      </div>
    </div>
  </div>
</section>

<style>
  .lab {
    max-width: 1600px;
    margin: 0 auto;
    padding: 72px clamp(20px, 4vw, 72px) 56px;
  }

  .lab-head {
    max-width: 46rem;
    margin-bottom: 32px;
  }

  .lab-eyebrow {
    font-family: var(--font-mono);
    font-size: 11.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .lab-title {
    font-size: clamp(1.8rem, 3.2vw, 2.6rem);
    line-height: 1.08;
    letter-spacing: -0.025em;
    margin: 10px 0 12px;
  }

  .lab-sub {
    color: var(--text-dim);
    font-size: 1.02rem;
    margin: 0;
  }

  .lab-sub code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--accent);
  }

  .lab-body {
    display: grid;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }

  /* --- Scene rail --- */
  .lab-rail {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--border);
    position: sticky;
    top: calc(var(--nav-height) + 16px);
  }

  .lab-rail li {
    border-bottom: 1px solid var(--border);
  }

  .rail-item {
    display: grid;
    grid-template-columns: 30px 1fr auto;
    align-items: baseline;
    gap: 10px;
    width: 100%;
    padding: 14px 12px 14px 14px;
    background: none;
    border: 0;
    border-left: 2px solid transparent;
    color: var(--text-dim);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: color var(--transition), background var(--transition), border-color var(--transition);
  }

  .rail-item:hover {
    color: var(--text);
    background: var(--accent-glow);
  }

  .rail-item:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .rail-item.active {
    color: var(--text);
    border-left-color: var(--accent);
    background: var(--bg-elevated);
  }

  .rail-num {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  .rail-item.active .rail-num { color: var(--accent); }

  .rail-title {
    font-weight: 600;
    font-size: 14.5px;
  }

  .rail-stat {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .rail-blurb {
    margin: 0;
    padding: 0 14px 16px 54px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-dim);
    background: var(--bg-elevated);
    border-left: 2px solid var(--accent);
  }

  /* --- Stage --- */
  .stage-blurb {
    display: none;
    margin: 0 0 12px;
    font-size: 13.5px;
    color: var(--text-dim);
  }

  .stage-frame {
    position: relative;
    height: clamp(460px, 68vh, 680px);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--bg-elevated);
    box-shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.6);
  }

  .stage-host {
    position: absolute;
    inset: 0;
  }

  .stage-idle {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-muted);
    font-size: 13px;
  }

  .stage-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    min-height: 22px;
    margin: 12px 2px 0;
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .metric { color: var(--text-muted); }
  .metric--latest { color: var(--green); }
  .metric--muted { font-family: var(--font); }

  .stage-notes {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 20px;
    margin-top: 18px;
  }

  .notes-try h3 {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 0 8px;
  }

  .notes-try ul {
    margin: 0;
    padding-left: 18px;
    color: var(--text-dim);
    font-size: 13.5px;
    line-height: 1.7;
  }

  .notes-code {
    margin: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text);
    overflow-x: auto;
  }

  @media (max-width: 960px) {
    .lab-body { grid-template-columns: 1fr; }
    .lab-rail {
      position: static;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      border-top: 0;
      padding-bottom: 4px;
    }
    .lab-rail li { border-bottom: 0; flex: 0 0 auto; }
    .rail-item {
      grid-template-columns: auto auto;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 8px 14px;
    }
    .rail-item.active { border-color: var(--accent); }
    .rail-num, .rail-blurb { display: none; }
    .stage-blurb { display: block; }
    .stage-notes { grid-template-columns: 1fr; }
  }

  @media (prefers-reduced-motion: reduce) {
    .rail-item { transition: none; }
  }
</style>
