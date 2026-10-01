<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { base } from '$app/paths';
  import Logo from '$lib/components/Logo.svelte';
  import { VERSION, LINKS } from '$lib/site';

  let { children } = $props();

  const THEME_KEY = 'tc-site-theme';
  let theme = $state<'dark' | 'light'>('dark');
  let mobileOpen = $state(false);

  function applyTheme(next: 'dark' | 'light') {
    theme = next;
    document.body.classList.toggle('light', next === 'light');
    // The viewport scrollbar follows the root element, not body.
    document.documentElement.style.colorScheme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f6f7f9' : '#0b0e13');
  }

  // app.html applies the stored theme before first paint; mirror it here.
  onMount(() => {
    if (document.body.classList.contains('light')) applyTheme('light');
  });

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not persisted; the toggle still applies for this visit.
    }
  }

  function toggleMobile() {
    mobileOpen = !mobileOpen;
    document.body.classList.toggle('no-scroll', mobileOpen);
  }

  function closeMobile() {
    if (!mobileOpen) return;
    mobileOpen = false;
    document.body.classList.remove('no-scroll');
  }

  // Any navigation (drawer link, back button) closes the mobile drawer.
  afterNavigate(() => closeMobile());

  function isActive(path: string): boolean {
    const p = $page.url.pathname.replace(/\/$/, '');
    const target = (base + path).replace(/\/$/, '');
    if (target === base) return p === base || p === '';
    return p === target || p.startsWith(target + '/');
  }

  const navLinks = [
    { label: 'Docs', href: '/docs/getting-started', match: '/docs' },
    { label: 'Examples', href: '/examples', match: '/examples' },
    { label: 'Playground', href: '/playground', match: '/playground' },
    { label: 'Changelog', href: '/changelog', match: '/changelog' },
  ];

  const footerCols = [
    {
      title: 'Library',
      links: [
        { label: 'Getting started', href: `${base}/docs/getting-started` },
        { label: 'API reference', href: `${base}/docs/api` },
        { label: 'Examples', href: `${base}/examples` },
        { label: 'Changelog', href: `${base}/changelog` },
      ],
    },
    {
      title: 'Packages',
      links: [
        { label: '@tradecanvas/chart', href: LINKS.npm },
        { label: '@tradecanvas/react', href: LINKS.npmReact },
        { label: '@tradecanvas/vue', href: LINKS.npmVue },
        { label: '@tradecanvas/svelte', href: LINKS.npmSvelte },
      ],
    },
    {
      title: 'Project',
      links: [
        { label: 'GitHub', href: LINKS.github },
        { label: 'Issues', href: LINKS.issues },
        { label: 'bo-grid (data grid)', href: LINKS.boGrid },
      ],
    },
  ];
</script>

<nav class="site-nav" aria-label="Main">
  <a class="site-nav-brand" href="{base}/" onclick={closeMobile}>
    <Logo size={22} />
    <span>TradeCanvas</span>
  </a>
  <a class="site-nav-version" href="{base}/changelog" title="Changelog">v{VERSION}</a>

  <div class="site-nav-links">
    {#each navLinks as link}
      <a
        class="site-nav-link"
        href="{base}{link.href}"
        aria-current={isActive(link.match) ? 'page' : undefined}
      >
        {link.label}
      </a>
    {/each}
  </div>

  <div class="site-nav-actions">
    <button
      class="site-nav-icon-btn"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onclick={toggleTheme}
      type="button"
    >
      {#if theme === 'dark'}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      {:else}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      {/if}
    </button>
    <a class="site-nav-icon-btn" href={LINKS.github} target="_blank" rel="noopener" aria-label="TradeCanvas on GitHub">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
      <span class="site-nav-gh-label">GitHub</span>
    </a>
    <button
      class="site-nav-icon-btn site-nav-burger"
      aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={mobileOpen}
      onclick={toggleMobile}
      type="button"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        {#if mobileOpen}<path d="M6 6l12 12M18 6L6 18" />{:else}<path d="M4 7h16M4 12h16M4 17h16" />{/if}
      </svg>
    </button>
  </div>
</nav>

{#if mobileOpen}
  <button class="mobile-overlay" aria-label="Close menu" onclick={closeMobile} type="button"></button>
{/if}

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closeMobile(); }} />

<aside class="mobile-drawer" class:open={mobileOpen} inert={!mobileOpen} aria-label="Menu">
  <div class="mobile-drawer-section">
    {#each navLinks as link}
      <a
        class="mobile-drawer-link"
        href="{base}{link.href}"
        aria-current={isActive(link.match) ? 'page' : undefined}
        onclick={closeMobile}
      >
        {link.label}
      </a>
    {/each}
  </div>
  <div class="mobile-drawer-divider"></div>
  <div class="mobile-drawer-section">
    <a class="mobile-drawer-link" href={LINKS.github} target="_blank" rel="noopener">GitHub</a>
    <a class="mobile-drawer-link" href={LINKS.npm} target="_blank" rel="noopener">npm</a>
  </div>
</aside>

<main>
  {@render children()}
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <a class="site-nav-brand" href="{base}/">
        <Logo size={22} />
        <span>TradeCanvas</span>
      </a>
      <p>Canvas2D trading charts for the web. Zero dependencies, MIT licensed.</p>
    </div>
    {#each footerCols as col}
      <div class="footer-col">
        <h2>{col.title}</h2>
        {#each col.links as link}
          <a href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noopener' : undefined}>{link.label}</a>
        {/each}
      </div>
    {/each}
  </div>
  <div class="footer-base">
    <span>MIT · @tradecanvas/chart v{VERSION}</span>
    <span>Built with TradeCanvas</span>
  </div>
</footer>
