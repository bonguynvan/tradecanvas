<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';
  import { SITE_URL } from '$lib/site';

  let { data } = $props();
  const i18n = useI18n();
  const Page = $derived(data.component);
</script>

<svelte:head>
  {#if !data.translated}
    <!-- The English page is the one to index. -->
    <link rel="canonical" href="{SITE_URL}/docs/{data.slug}/" />
  {/if}
</svelte:head>

{#if !data.translated}
  <aside class="docs-untranslated">{fill(i18n.m.docs.notTranslated, { language: i18n.language.name })}</aside>
{/if}

<div class="docs-page" lang={data.translated ? undefined : 'en'}>
  <Page />
</div>

<style>
  .docs-untranslated {
    margin: 0 0 24px;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius);
    background: var(--bg-elevated);
    color: var(--text-dim);
    font-size: 14px;
  }
</style>
