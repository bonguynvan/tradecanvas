<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  let { children } = $props();

  const groups = [
    {
      title: 'Get started',
      links: [
        { label: 'Getting Started', href: '/docs/getting-started' },
        { label: 'Frameworks', href: '/docs/frameworks' },
        { label: 'Embeddable Widget', href: '/docs/embed' },
      ],
    },
    {
      title: 'Chart',
      links: [
        { label: 'API Reference', href: '/docs/api' },
        { label: 'Chart Types', href: '/docs/chart-types' },
        { label: 'Indicators', href: '/docs/indicators' },
        { label: 'Drawing Tools', href: '/docs/drawing-tools' },
      ],
    },
    {
      title: 'Trading',
      links: [
        { label: 'Trading Overlay', href: '/docs/trading' },
        { label: 'Finance Charts', href: '/docs/finance' },
        { label: 'Realtime & Replay', href: '/docs/realtime' },
        { label: 'Analytics (0.8)', href: '/docs/analytics' },
      ],
    },
  ];

  function isActive(href: string): boolean {
    const p = $page.url.pathname.replace(/\/$/, '');
    const target = (base + href).replace(/\/$/, '');
    return p === target;
  }
</script>

<div class="docs-shell">
  <aside class="docs-sidebar" aria-label="Documentation navigation">
    {#each groups as group}
      <div class="docs-sidebar-group">
        <div class="docs-sidebar-title">{group.title}</div>
        {#each group.links as link}
          <a
            class="docs-sidebar-link"
            href="{base}{link.href}"
            aria-current={isActive(link.href) ? 'page' : undefined}
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
