<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  let { children } = $props();

  let theme = $state<'dark' | 'light'>('dark');
  let mobileOpen = $state(false);

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('light', theme === 'light');
    }
  }

  function toggleMobile() {
    mobileOpen = !mobileOpen;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('no-scroll', mobileOpen);
    }
  }

  function closeMobile() {
    if (mobileOpen) {
      mobileOpen = false;
      if (typeof document !== 'undefined') {
        document.body.classList.remove('no-scroll');
      }
    }
  }

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
</script>

<nav class="site-nav">
  <a class="site-nav-brand" href="{base}/" onclick={closeMobile}>
    <span class="site-nav-brand-mark" aria-hidden="true"></span>
    <span>TradeCanvas</span>
  </a>

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
      aria-label="Toggle theme"
      onclick={toggleTheme}
      type="button"
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
    <a
      class="site-nav-icon-btn"
      href="https://github.com/bonguynvan/tradecanvas"
      target="_blank"
      rel="noopener"
      aria-label="GitHub"
    >
      ★
    </a>
    <button
      class="site-nav-icon-btn site-nav-burger"
      aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={mobileOpen}
      onclick={toggleMobile}
      type="button"
    >
      {mobileOpen ? '✕' : '☰'}
    </button>
  </div>
</nav>

{#if mobileOpen}
  <button
    class="mobile-overlay"
    aria-label="Close menu"
    onclick={closeMobile}
    type="button"
  ></button>
{/if}

<aside class="mobile-drawer" class:open={mobileOpen} aria-hidden={!mobileOpen}>
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
    <a class="mobile-drawer-link" href="https://github.com/bonguynvan/tradecanvas" target="_blank" rel="noopener">GitHub</a>
    <a class="mobile-drawer-link" href="https://www.npmjs.com/package/@tradecanvas/chart" target="_blank" rel="noopener">npm</a>
  </div>
</aside>

<main onclick={closeMobile}>
  {@render children()}
</main>

<footer class="footer">
  <div class="footer-links">
    <a href="https://github.com/bonguynvan/tradecanvas">GitHub</a>
    <span class="footer-sep">·</span>
    <a href="{base}/docs/getting-started">Docs</a>
    <span class="footer-sep">·</span>
    <a href="{base}/changelog">Changelog</a>
    <span class="footer-sep">·</span>
    <a href="https://www.npmjs.com/package/@tradecanvas/chart">npm</a>
  </div>
  <div style="margin-top: 8px">MIT · v0.8.1</div>
</footer>
