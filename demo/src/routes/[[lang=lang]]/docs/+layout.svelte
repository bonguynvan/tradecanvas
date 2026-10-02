<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { DOC_GROUPS } from '$lib/docs';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { splitLang } from '$lib/i18n/paths';

  let { children } = $props();
  const i18n = useI18n();

  const groups = $derived(
    DOC_GROUPS.map((group) => ({
      title: i18n.m.docs.groups[group.key],
      links: group.slugs.map((slug) => ({ slug, label: i18n.m.docs.pages[slug], href: i18n.href(`/docs/${slug}`) })),
    })),
  );

  const sitePath = $derived(splitLang($page.url.pathname.slice(base.length)).path.replace(/\/$/, ''));
</script>

<div class="docs-shell">
  <aside class="docs-sidebar" aria-label={i18n.m.docs.navLabel}>
    {#each groups as group}
      <div class="docs-sidebar-group">
        <div class="docs-sidebar-title">{group.title}</div>
        {#each group.links as link (link.slug)}
          <a
            class="docs-sidebar-link"
            href={link.href}
            aria-current={sitePath === `/docs/${link.slug}` ? 'page' : undefined}
          >
            {link.label}
          </a>
        {/each}
      </div>
    {/each}
  </aside>

  <article class="docs-content">
    {@render children()}
  </article>
</div>
