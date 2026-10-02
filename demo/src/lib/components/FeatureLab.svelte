<script lang="ts">
  import { siteTheme, onSiteThemeChange } from '$lib/site';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { Chart, DataAdapter } from '@tradecanvas/chart';
  import type { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget';
  import type { WidgetLanguage } from '@tradecanvas/chart/widget/locales';
  import { FEATURE_SCENES, type SceneEnv } from '$lib/featureScenes';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';
  import { widgetLanguage } from '$lib/i18n/widget';

  const i18n = useI18n();
  const m = $derived(i18n.m);

  let section: HTMLElement | undefined = $state();
  let host: HTMLDivElement | undefined = $state();
  let active = $state(0);
  let metrics = $state<string[]>([]);
  let started = $state(false);
  /** Languages for scenes with a picker, loaded with the first such scene. */
  let languages = $state<readonly WidgetLanguage[]>([]);
  // The picker starts on the page's language (Vietnamese on the English site).
  // svelte-ignore state_referenced_locally
  let languageCode = $state(i18n.lang === 'en' ? 'vi' : i18n.lang);

  let widget: ChartWidget | ChartWidgetGrid | null = null;
  let mountToken = 0;

  const scene = $derived(FEATURE_SCENES[active]);
  const text = $derived(m.scenes[scene.id]);

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

    const [{ ChartWidget, ChartWidgetGrid }, lib, siteWidgetLanguage] = await Promise.all([
      import('@tradecanvas/chart/widget'),
      import('@tradecanvas/chart'),
      widgetLanguage(i18n.lang),
    ]);
    if (token !== mountToken || !host) return;

    const current = FEATURE_SCENES[index];
    if (current.languages && languages.length === 0) {
      const { WIDGET_LANGUAGES } = await import('@tradecanvas/chart/widget/locales');
      if (token !== mountToken || !host) return;
      languages = WIDGET_LANGUAGES;
      const preferred = languageCode.toLowerCase();
      languageCode = languages.find((l) => l.code.toLowerCase() === preferred)?.code ?? 'vi';
    }
    const env: SceneEnv = {
      lib,
      binance: () => new lib.BinanceAdapter(),
      slowBinance: (ms) => delayed(new lib.BinanceAdapter(), ms),
      language: current.languages ? languages.find((l) => l.code === languageCode) : undefined,
    };
    const opts = current.options(env);
    let pending: { label: string; t: number } | null = null;

    // Several charts: each one gets the scene's bars for its symbol.
    if (current.grid) {
      const gridOpts = current.grid(env);
      const feed = (w: ChartWidget, symbol: string) => {
        if (current.data) w.setData(current.data(symbol));
      };
      const charts: ChartWidget[] = [];
      const g: ChartWidgetGrid = new ChartWidgetGrid(host, {
        ...gridOpts,
        widget: { theme: siteTheme(), historyLimit: 500, ...siteWidgetLanguage, ...opts },
        cells: gridOpts.cells?.map((cell, i) => ({
          ...cell,
          onSymbolChange: (sym: string) => {
            cell.onSymbolChange?.(sym);
            if (charts[i]) feed(charts[i], sym);
          },
        })),
        onChartAdd: (w, i) => {
          charts[i] = w;
          feed(w, w.captureLayout().symbol);
        },
      });
      widget = g;
      await Promise.all(g.getWidgets().map((w) => firstBars(w.getChart())));
      if (token !== mountToken) return;
      await current.gridSetup?.(g, env);
      return;
    }

    const w: ChartWidget = new ChartWidget(host, {
      theme: siteTheme(),
      historyLimit: 500,
      // The page's language; the languages scene picks its own.
      ...siteWidgetLanguage,
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
      pushMetric(fill(m.lab.metricSwitch, {
        label: pending.label,
        ms: fmtMs(performance.now() - pending.t),
        bars: length.toLocaleString(i18n.language.tag),
      }));
      pending = null;
    });

    if (current.data) {
      const bars = current.data(opts.symbol ?? 'DEMO');
      const t0 = performance.now();
      w.setData(bars);
      pushMetric(fill(m.lab.metricSetData, { bars: bars.length.toLocaleString(i18n.language.tag), ms: fmtMs(performance.now() - t0) }));
    }

    await firstBars(chart);
    if (token !== mountToken) return;
    await current.setup?.(w, chart, env);
  }

  /** Mount a scene; one that fails to load (offline, a missing chunk) leaves the stage as it was. */
  function showScene(index: number) {
    mountScene(index).catch((err: unknown) => console.error('Feature Lab scene failed to load:', err));
  }

  function pickLanguage(code: string) {
    if (code === languageCode) return;
    languageCode = code;
    if (started) showScene(active);
  }

  function select(index: number) {
    if (index === active && widget) return;
    active = index;
    if (started) showScene(index);
  }

  /** Arrow keys move between scenes (roving tabindex). */
  function onRailKey(e: KeyboardEvent) {
    const last = FEATURE_SCENES.length - 1;
    const forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const back = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    const next =
      forward ? (active === last ? 0 : active + 1)
      : back ? (active === 0 ? last : active - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    select(next);
    document.getElementById(`lab-tab-${next}`)?.focus();
  }

  onMount(() => {
    if (!browser || !section) return;

    // Only spin up a live chart once the lab scrolls into view.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !started) {
        started = true;
        io.disconnect();
        showScene(active);
      }
    }, { rootMargin: '200px' });
    io.observe(section);

    // Follow the site's light/dark toggle.
    const stopThemeSync = onSiteThemeChange((theme) => widget?.setTheme(theme));

    return () => {
      io.disconnect();
      stopThemeSync();
      mountToken++;
      widget?.destroy();
      widget = null;
    };
  });
</script>

<section class="lab" bind:this={section} aria-labelledby="lab-title">
  <header class="lab-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">{m.lab.eyebrow}</span>
    <h2 id="lab-title" class="lab-title">{m.lab.title}</h2>
    <p class="lab-sub">{@html m.lab.subtitleHtml}</p>
  </header>

  <div class="lab-body" data-reveal>
    <ol class="lab-rail" role="tablist" aria-label={m.lab.scenes}>
      {#each FEATURE_SCENES as s, i}
        <li role="presentation">
          <button
            type="button"
            role="tab"
            id="lab-tab-{i}"
            class="rail-item"
            class:active={i === active}
            aria-selected={i === active}
            aria-controls="lab-stage"
            tabindex={i === active ? 0 : -1}
            onclick={() => select(i)}
            onkeydown={onRailKey}
          >
            <span class="rail-num">{String(i + 1).padStart(2, '0')}</span>
            <span class="rail-title">{m.scenes[s.id].title}</span>
            <span class="rail-stat">{m.scenes[s.id].stat}</span>
          </button>
          {#if i === active}
            <p class="rail-blurb">{m.scenes[s.id].blurb}</p>
          {/if}
        </li>
      {/each}
    </ol>

    <div class="lab-stage" id="lab-stage" role="tabpanel" aria-labelledby="lab-tab-{active}" tabindex="-1">
      <p class="stage-blurb">{text.blurb}</p>
      {#if scene.languages && languages.length > 0}
        <div class="stage-langs" role="group" aria-label={m.lab.widgetLanguage}>
          {#each languages as language (language.code)}
            <button
              type="button"
              class="lang"
              class:active={language.code === languageCode}
              aria-pressed={language.code === languageCode}
              lang={language.code}
              onclick={() => pickLanguage(language.code)}
            >{language.name}</button>
          {/each}
        </div>
      {/if}
      <div class="stage-frame">
        <div class="stage-host" bind:this={host}></div>
        {#if !started}
          <div class="stage-idle">{m.lab.idle}</div>
        {/if}
      </div>
      <div class="stage-metrics" aria-live="polite">
        {#if metrics.length === 0}
          <span class="metric metric--muted">{m.lab.metricHint}</span>
        {:else}
          {#each metrics as metric, i}
            <span class="metric" class:metric--latest={i === 0}>{metric}</span>
          {/each}
        {/if}
      </div>

      <div class="stage-notes">
        <div class="notes-try">
          <h3>{m.lab.tryThis}</h3>
          <ul>
            {#each text.tryThis as tip}
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
    max-width: var(--page-max);
    margin: 0 auto;
    padding: var(--section-pad) var(--gutter) 64px;
  }

  .lab-head {
    max-width: 46rem;
    margin-bottom: 32px;
  }

  .lab-title {
    font-size: clamp(1.6rem, 3vw, 2.3rem);
    line-height: 1.1;
    font-weight: 600;
    letter-spacing: -0.025em;
    text-wrap: balance;
    margin: 10px 0 12px;
  }

  .lab-sub {
    color: var(--text-dim);
    font-size: 1.02rem;
    margin: 0;
  }

  .lab-sub :global(code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--text);
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
    box-shadow: var(--shadow-lg);
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
    .stage-notes { grid-template-columns: minmax(0, 1fr); }
  }

  @media (prefers-reduced-motion: reduce) {
    .rail-item { transition: none; }
  }

  .stage-langs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 12px;
  }

  .lang {
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--text-dim);
    font: inherit;
    font-size: 0.82rem;
    line-height: 1.4;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  }

  .lang:hover {
    color: var(--text);
    border-color: var(--text-dim);
  }

  .lang.active {
    color: var(--accent-ink);
    background: var(--accent-fill);
    border-color: var(--accent-fill);
  }

  .lang:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
