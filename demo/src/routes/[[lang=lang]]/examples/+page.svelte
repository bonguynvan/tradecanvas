<script lang="ts">
  import { browser } from '$app/environment';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';
  import {
    openVanillaSandbox,
    openReactSandbox,
    openSvelteSandbox,
    openVueSandbox,
    openWidgetSandbox,
    openFinanceChartsSandbox,
  } from '$lib/sandboxes';

  const i18n = useI18n();
  const m = $derived(i18n.m.examples);

  /** Titles and blurbs are `m.examples.items[id]`. */
  const examples = [
    { id: 'vanilla', open: openVanillaSandbox },
    { id: 'widget', open: openWidgetSandbox },
    { id: 'react', open: openReactSandbox },
    { id: 'vue', open: openVueSandbox },
    { id: 'svelte', open: openSvelteSandbox },
    { id: 'finance', open: openFinanceChartsSandbox },
  ] as const;

  function handle(open: () => void) {
    if (browser) open();
  }
</script>

<svelte:head>
  <title>{m.metaTitle}</title>
  <meta name="description" content={m.description} />
</svelte:head>

<section class="hero">
  <span class="eyebrow">{m.eyebrow}</span>
  <h1 class="hero-title">{m.title}</h1>
  <p class="hero-subtitle">{@html fill(m.subtitleHtml, { lab: i18n.href('/') + '#lab-title' })}</p>
</section>

<ul class="examples-grid">
  {#each examples as ex (ex.id)}
    <li class="example-card">
      <h2>{m.items[ex.id].title}</h2>
      <p>{m.items[ex.id].blurb}</p>
      <button type="button" class="open" onclick={() => handle(ex.open)}>
        {fill(m.open, { title: m.items[ex.id].title })} <span aria-hidden="true">↗</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .hero { display: grid; gap: 14px; justify-items: start; }

  .hero-subtitle :global(a) {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: var(--accent-dim);
    text-underline-offset: 3px;
  }

  .examples-grid { list-style: none; }

  .example-card { position: relative; }

  .example-card h2 {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  /* The whole card is the click target: the button's ::after covers it. */
  .open {
    justify-self: start;
    margin-top: 10px;
    padding: 0;
    border: 0;
    background: none;
    font: 500 12px var(--font-mono);
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
    transition: color var(--transition);
  }

  .open::after { content: ''; position: absolute; inset: 0; }
  .open:focus-visible { outline: none; }
  .example-card:has(.open:focus-visible) { outline: 2px solid var(--accent); outline-offset: -2px; }
  .example-card:hover .open { color: var(--accent); }
</style>
