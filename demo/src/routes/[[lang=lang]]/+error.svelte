<script lang="ts">
  import { page } from '$app/state';
  import { useI18n } from '$lib/i18n/context.svelte';

  const i18n = useI18n();
  const m = $derived(i18n.m.error);
  const notFound = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{notFound ? m.notFound : m.other} · TradeCanvas</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="error-page">
  <p class="error-code">{page.status}</p>
  <h1>{notFound ? m.notFound : m.other}</h1>
  <p class="error-text">{notFound ? m.notFoundText : m.otherText}</p>
  <div class="cta-row">
    <a class="cta-btn cta-btn--primary" href={i18n.href('/')}>{m.home}</a>
    <a class="cta-btn cta-btn--ghost" href={i18n.href('/docs/getting-started')}>{m.docs}</a>
  </div>
</section>

<style>
  .error-page {
    display: grid;
    gap: 14px;
    justify-items: start;
    max-width: 640px;
    margin: 0 auto;
    padding: clamp(64px, 12vw, 140px) var(--gutter);
  }

  .error-code {
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 0.12em;
    color: var(--accent);
  }

  h1 {
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }

  .error-text {
    color: var(--text-dim);
    margin-bottom: 10px;
  }
</style>
