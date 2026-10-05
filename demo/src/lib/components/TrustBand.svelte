<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { LINKS, VERSION } from '$lib/site';
  import { aroundFigure as around, parseFigures } from '$lib/landing';
  import { useI18n } from '$lib/i18n/context.svelte';

  const i18n = useI18n();
  const m = $derived(i18n.m);

  const GITHUB_API = 'https://api.github.com/repos/bonguynvan/tradecanvas';
  const NPM_API = 'https://api.npmjs.org/downloads/point/last-month/@tradecanvas/chart';
  /** Kept for the visit: GitHub allows 60 unsigned requests an hour. */
  const CACHE_KEY = 'tc-trust-figures';

  /** A count is null until it comes, or if it doesn't. */
  let figures = $state<{ stars: number | null; downloads: number | null }>({ stars: null, downloads: null });

  const compact = $derived(new Intl.NumberFormat(i18n.lang, { notation: 'compact', maximumFractionDigits: 1 }));

  async function count(url: string, field: string): Promise<number | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const value: unknown = (await res.json())?.[field];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  function cached() {
    try {
      return parseFigures(sessionStorage.getItem(CACHE_KEY));
    } catch {
      return null;
    }
  }

  onMount(() => {
    if (!browser) return;
    const hit = cached();
    if (hit) {
      figures = hit;
      return;
    }
    let cancelled = false;
    // Without the figures the band still stands: the counts are left out.
    void Promise.all([count(GITHUB_API, 'stargazers_count'), count(NPM_API, 'downloads')]).then(([stars, downloads]) => {
      if (cancelled) return;
      figures = { stars, downloads };
      // Kept only when both came: a failure (a rate limit, offline) is asked again next page.
      if (stars === null || downloads === null) return;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ stars, downloads }));
      } catch {
        // Storage off: the next page asks again.
      }
    });
    return () => {
      cancelled = true;
    };
  });
</script>

<section class="trust" aria-label={m.home.trust.label}>
  <div class="trust-inner">
    <span class="trust-label">{m.home.trust.label}</span>
    <ul class="trust-facts">
      {#if figures.downloads !== null}
        {@const [before, after] = around(m.home.trust.downloads)}
        <li><a href={LINKS.npm} target="_blank" rel="noopener">{before}<strong>{compact.format(figures.downloads)}</strong>{after}</a></li>
      {/if}
      {#each [[m.home.trust.license, 'MIT'], [m.home.trust.dependencies, '0'], [m.home.trust.typescript, '.d.ts']] as [template, figure]}
        {@const [before, after] = around(template)}
        <li>{before}<strong>{figure}</strong>{after}</li>
      {/each}
      <li><a href={i18n.href('/changelog')}><strong>v{VERSION}</strong></a></li>
    </ul>
    <a class="trust-star" href={LINKS.github} target="_blank" rel="noopener">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 .8l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.2l-4.5 2.4.9-5L.8 6.1l5-.7z" /></svg>
      <span>{m.home.closing.star}</span>
      {#if figures.stars !== null}<span class="star-count">{compact.format(figures.stars)}</span>{/if}
    </a>
  </div>
</section>

<style>
  .trust {
    border-block: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .trust-inner {
    max-width: var(--page-max);
    margin: 0 auto;
    padding: 18px var(--gutter);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px 32px;
  }

  .trust-label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .trust-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 28px;
    list-style: none;
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    color: var(--text-muted);
  }

  .trust-facts li { white-space: nowrap; }

  .trust-facts strong {
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .trust-facts a { color: inherit; text-decoration: none; }
  .trust-facts a:hover strong { color: var(--accent); }

  .trust-star {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px 7px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: border-color var(--transition), color var(--transition);
  }

  .trust-star svg { color: var(--accent); }
  .trust-star:hover { border-color: var(--accent); }
  .trust-star:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .star-count {
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 1px 7px;
    border-radius: 4px;
    background: var(--bg-panel);
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 640px) {
    .trust-inner { gap: 12px 20px; }
    .trust-facts { flex-basis: 100%; gap: 8px 20px; }
  }
</style>
