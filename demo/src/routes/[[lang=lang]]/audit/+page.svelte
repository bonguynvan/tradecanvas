<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';
  import { siteLanguage } from '$lib/i18n/languages';
  import { VERSION } from '$lib/site';

  const i18n = useI18n();
  const m = $derived(i18n.m.audit);

  /** The values beside `m.audit.numbers`, in its order. */
  const NUMBERS = ['18', '111', '69', '30', '101', '112', '0', '3,000+'];

  /**
   * Frame times beside `m.audit.perf`, from the Performance docs: pixel ratio,
   * Canvas 2D ms, WebGL ms, measured on Intel UHD graphics in Chrome.
   */
  const PERF: readonly [number, number, number][] = [
    [2, 27.4, 19.6],
    [2, 34.5, 20.2],
    [2, 34.5, 16.7],
    [2, 25.5, 16.8],
    [2, 23.5, 17.2],
    [1, 41.6, 17.7],
    [1.5, 70.8, 17.6],
    [2, 114.5, 29.1],
  ];
  const FRAME_60 = 16.7;
  const PERF_MAX = Math.max(...PERF.map(([, canvas]) => canvas));

  /** Beside `m.audit.data` and `m.audit.size`. */
  const DATA: readonly [approx: boolean, ms: number][] = [[true, 0.001], [true, 27], [true, 2.6], [true, 0.2], [false, 200]];
  const SIZE = ['176 KB', '315 KB', '18 KB'];

  type AreaKey = keyof typeof m.areas;
  const AREAS = $derived(Object.keys(m.areas) as AreaKey[]);
  const rows = $derived(
    AREAS.flatMap((area) => m.catalog[area].map((item) => ({ area, name: item.name, detail: item.detail }))),
  );

  let area = $state<AreaKey | 'all'>('all');
  let query = $state('');

  /** Lower case without accents, so "toa do" finds "toạ độ". */
  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
  const shown = $derived.by(() => {
    const term = fold(query.trim());
    return rows.filter(
      (r) => (area === 'all' || r.area === area) && (!term || fold(`${r.name} ${r.detail} ${m.areas[r.area]}`).includes(term)),
    );
  });

  const ms = $derived(new Intl.NumberFormat(siteLanguage(i18n.lang).tag, { maximumFractionDigits: 3 }));
  const pct = (value: number) => `${((value / PERF_MAX) * 100).toFixed(2)}%`;
</script>

<svelte:head>
  <title>{m.metaTitle}</title>
  <meta name="description" content={m.description} />
</svelte:head>

<section class="hero">
  <span class="eyebrow">{m.eyebrow}</span>
  <h1 class="hero-title">{m.title}</h1>
  <p class="hero-subtitle">{@html fill(m.ledeHtml, { version: VERSION })}</p>
</section>

<div class="audit">
<section class="block" aria-labelledby="audit-numbers">
  <h2 id="audit-numbers">{m.numbersTitle}</h2>
  <dl class="numbers">
    {#each m.numbers as label, i (i)}
      <div class="number">
        <dt>{label}</dt>
        <dd>{NUMBERS[i]}</dd>
      </div>
    {/each}
  </dl>
</section>

<section class="block" aria-labelledby="audit-perf">
  <h2 id="audit-perf">{m.perfTitle}</h2>
  <p class="lede">{m.perfLede}</p>
  <div class="table-wrap">
    <table class="perf">
      <thead>
        <tr>
          <th scope="col">{m.perfChart}</th>
          <th scope="col" class="num ratio">{m.perfRatio}</th>
          <th scope="col" class="num">Canvas 2D</th>
          <th scope="col" class="num">WebGL</th>
          <th scope="col" class="bars-head"><span class="sr-only">Canvas 2D / WebGL</span></th>
        </tr>
      </thead>
      <tbody>
        {#each m.perf as label, i (i)}
          {@const [ratio, canvas, webgl] = PERF[i]}
          <tr>
            <th scope="row">{label}<span class="inline-ratio">&nbsp;· {ms.format(ratio)}×</span></th>
            <td class="num ratio">{ms.format(ratio)}</td>
            <td class="num">{ms.format(canvas)} ms</td>
            <td class="num webgl" class:smooth={webgl <= FRAME_60 + 0.1}>{ms.format(webgl)} ms</td>
            <td class="bars" aria-hidden="true">
              <div class="track">
                <span class="bar canvas" style:width={pct(canvas)}></span>
                <span class="bar gl" style:width={pct(webgl)}></span>
                <span class="mark" style:left={pct(FRAME_60)}></span>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="note">{@html m.perfNoteHtml}</p>
</section>

<section class="block split">
  <div>
    <h2 id="audit-data">{m.dataTitle}</h2>
    <dl class="pairs" role="group" aria-labelledby="audit-data">
      {#each m.data as label, i (i)}
        <div><dt>{label}</dt><dd>{DATA[i][0] ? '~' : ''}{ms.format(DATA[i][1])} ms</dd></div>
      {/each}
    </dl>
  </div>
  <div>
    <h2 id="audit-size">{m.sizeTitle}</h2>
    <p class="lede">{m.sizeLede}</p>
    <dl class="pairs" role="group" aria-labelledby="audit-size">
      {#each m.size as label, i (i)}
        <div><dt>{label}</dt><dd>{SIZE[i]}</dd></div>
      {/each}
    </dl>
  </div>
</section>

<section class="block" aria-labelledby="audit-quality">
  <h2 id="audit-quality">{m.qualityTitle}</h2>
  <ul class="checks">
    {#each m.quality as line, i (i)}
      <li>{line}</li>
    {/each}
  </ul>
</section>

<section class="block" aria-labelledby="audit-catalog">
  <h2 id="audit-catalog">{m.catalogTitle}</h2>
  <p class="lede">{m.catalogLede}</p>
  <div class="filters">
    <div class="chips" role="group" aria-label={m.colArea}>
      <button type="button" class="chip" aria-pressed={area === 'all'} onclick={() => (area = 'all')}>{m.all}</button>
      {#each AREAS as key (key)}
        <button type="button" class="chip" aria-pressed={area === key} onclick={() => (area = key)}>{m.areas[key]}</button>
      {/each}
    </div>
    <input type="search" bind:value={query} placeholder={m.searchPlaceholder} aria-label={m.search} />
    <span class="count" aria-live="polite">{fill(m.count, { shown: shown.length, total: rows.length })}</span>
  </div>
  <div class="table-wrap">
    <table class="catalog">
      <thead>
        <tr><th scope="col">{m.colCapability}</th><th scope="col">{m.colArea}</th><th scope="col">{m.colDetail}</th></tr>
      </thead>
      <tbody>
        {#each shown as row (row.area + row.name)}
          <tr>
            <th scope="row">{row.name}</th>
            <td class="area">{m.areas[row.area]}</td>
            <td class="detail">{row.detail}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<section class="block" aria-labelledby="audit-limits">
  <h2 id="audit-limits">{m.limitsTitle}</h2>
  <ul class="limits">
    {#each m.limits as line, i (i)}
      <li>{line}</li>
    {/each}
  </ul>
</section>
</div>

<style>
  .hero { display: grid; gap: 14px; justify-items: start; }
  .hero-subtitle :global(code), .note :global(code) { font-family: var(--font-mono); font-size: 0.9em; }

  .audit { max-width: var(--page-max); margin-inline: auto; padding: 8px var(--gutter) var(--section-pad); }
  .block { display: grid; gap: 12px; min-width: 0; }
  .block + .block { margin-top: 56px; }
  .block h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; margin: 0; }
  .lede, .note { color: var(--text-dim); margin: 0; max-width: 72ch; }
  .note { font-size: 13px; color: var(--text-muted); }

  .numbers {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin: 0;
  }
  .number {
    display: flex;
    flex-direction: column-reverse;
    gap: 2px;
    padding: 16px 18px;
    background: var(--bg-card);
    border-left: 1px solid var(--border);
    border-top: 1px solid var(--border);
    margin: -1px 0 0 -1px;
  }
  .number dd { margin: 0; font: 500 28px var(--font-mono); letter-spacing: -0.03em; color: var(--text); font-variant-numeric: tabular-nums; }
  .number dt { font-size: 13px; color: var(--text-muted); }

  .table-wrap { position: relative; overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-lg); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); text-align: left; vertical-align: top; }
  thead th {
    font: 500 11px var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
  }
  tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
  tbody th { font-weight: 500; color: var(--text); }
  .num { text-align: right; font-family: var(--font-mono); font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums; }

  .perf { min-width: 760px; }
  .perf td.webgl { color: var(--text); }
  .inline-ratio { display: none; color: var(--text-muted); font-weight: 400; }
  .perf td.webgl.smooth { color: var(--green); }
  .bars-head { width: 30%; }
  .bars { min-width: 180px; vertical-align: middle; }
  .track { position: relative; }
  .bar { display: block; height: 6px; border-radius: 3px; }
  .bar + .bar { margin-top: 4px; }
  .bar.canvas { background: var(--text-muted); opacity: 0.55; }
  .bar.gl { background: var(--accent); }
  /* 16.7 ms: a frame at 60 per second. */
  .mark { position: absolute; top: -3px; bottom: -3px; width: 1px; background: var(--green); }

  .split { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; }
  .split > div { display: grid; gap: 12px; align-content: start; min-width: 0; }
  .pairs { margin: 0; border-top: 1px solid var(--border); }
  .pairs div { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); }
  .pairs dt { color: var(--text-dim); min-width: 0; }
  .pairs dd { margin: 0; font-family: var(--font-mono); color: var(--text); white-space: nowrap; font-variant-numeric: tabular-nums; }

  .checks, .limits { margin: 0; padding: 0; list-style: none; display: grid; border-top: 1px solid var(--border); }
  .checks li, .limits li { position: relative; padding: 10px 0 10px 26px; border-bottom: 1px solid var(--border-subtle); color: var(--text-dim); max-width: 90ch; }
  .checks li::before { content: '✓'; position: absolute; left: 4px; color: var(--green); }
  .limits li::before { content: '—'; position: absolute; left: 4px; color: var(--text-muted); }

  .filters { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font: 500 13px var(--font);
    padding: 5px 11px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color var(--transition), border-color var(--transition);
  }
  .chip:hover { color: var(--text); }
  .chip[aria-pressed='true'] { color: var(--text); border-color: var(--accent); background: var(--accent-glow); }
  .chip:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  input[type='search'] {
    font: 500 13px var(--font);
    padding: 6px 10px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text);
    width: 240px;
    max-width: 100%;
  }
  .count { font: 12px var(--font-mono); color: var(--text-muted); }
  .catalog { min-width: 720px; }
  .catalog .area { color: var(--text-muted); font-size: 13px; white-space: nowrap; }
  .catalog .detail { color: var(--text-dim); font-size: 13.5px; }

  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  @media (max-width: 720px) {
    .numbers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .block + .block { margin-top: 40px; }
    /* The numbers matter more than the bars on a phone: keep them on screen. */
    .perf { min-width: 0; }
    .perf .bars, .perf .bars-head, .perf .ratio { display: none; }
    .perf .inline-ratio { display: inline; }
    .perf thead th { letter-spacing: 0.04em; }
    .perf th, .perf td { padding: 9px 8px; }
  }
</style>
