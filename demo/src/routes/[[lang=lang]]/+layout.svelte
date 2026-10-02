<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { base } from '$app/paths';
  import Logo from '$lib/components/Logo.svelte';
  import LanguageMenu from '$lib/components/LanguageMenu.svelte';
  import { VERSION, LINKS, SITE_URL } from '$lib/site';
  import { SiteI18n, provideI18n } from '$lib/i18n/context.svelte';
  import { SITE_LANGUAGES, DEFAULT_LANG } from '$lib/i18n/languages';
  import { splitLang, switchLang } from '$lib/i18n/paths';

  let { data, children } = $props();

  // One object for the whole site: going to another language updates it in place.
  // svelte-ignore state_referenced_locally
  const i18n = provideI18n(new SiteI18n(data.lang, data.messages));
  $effect.pre(() => {
    i18n.lang = data.lang;
    i18n.m = data.messages;
  });
  $effect(() => {
    document.documentElement.lang = i18n.language.tag;
  });
  const m = $derived(i18n.m);

  /** The page's path from the site root, without the base path or the language. */
  const sitePath = $derived(splitLang($page.url.pathname.slice(base.length) || '/').path);
  /** Docs pages exist translated in some languages only; the others show English. */
  const alternates = $derived(
    SITE_LANGUAGES.filter((language) => language.docs || !sitePath.startsWith('/docs/')).map((language) => ({
      tag: language.tag,
      href: SITE_URL + switchLang(sitePath, language.code),
    })),
  );

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
    const p = sitePath.replace(/\/$/, '');
    return p === path || p.startsWith(path + '/');
  }

  const navLinks = $derived([
    { label: m.nav.docs, href: i18n.href('/docs/getting-started'), match: '/docs' },
    { label: m.nav.examples, href: i18n.href('/examples'), match: '/examples' },
    { label: m.nav.playground, href: i18n.href('/playground'), match: '/playground' },
    { label: m.nav.changelog, href: i18n.href('/changelog'), match: '/changelog' },
  ]);

  const footerCols = $derived([
    {
      title: m.footer.library,
      links: [
        { label: m.footer.gettingStarted, href: i18n.href('/docs/getting-started') },
        { label: m.footer.apiReference, href: i18n.href('/docs/api') },
        { label: m.footer.examples, href: i18n.href('/examples') },
        { label: m.footer.changelog, href: i18n.href('/changelog') },
      ],
    },
    {
      title: m.footer.packages,
      links: [
        { label: '@tradecanvas/chart', href: LINKS.npm },
        { label: '@tradecanvas/react', href: LINKS.npmReact },
        { label: '@tradecanvas/vue', href: LINKS.npmVue },
        { label: '@tradecanvas/svelte', href: LINKS.npmSvelte },
      ],
    },
    {
      title: m.footer.project,
      links: [
        { label: 'GitHub', href: LINKS.github },
        { label: m.footer.issues, href: LINKS.issues },
        { label: m.footer.boGrid, href: LINKS.boGrid },
      ],
    },
  ]);
</script>

<svelte:head>
  {#each alternates as alternate (alternate.tag)}
    <link rel="alternate" hreflang={alternate.tag} href={alternate.href} />
  {/each}
  <link rel="alternate" hreflang="x-default" href={SITE_URL + switchLang(sitePath, DEFAULT_LANG)} />
</svelte:head>

<nav class="site-nav" aria-label={m.nav.main}>
  <a class="site-nav-brand" href={i18n.href('/')} onclick={closeMobile}>
    <Logo size={22} />
    <span>TradeCanvas</span>
  </a>
  <a class="site-nav-version" href={i18n.href('/changelog')} title={m.nav.changelog}>v{VERSION}</a>

  <div class="site-nav-links">
    {#each navLinks as link}
      <a
        class="site-nav-link"
        href={link.href}
        aria-current={isActive(link.match) ? 'page' : undefined}
      >
        {link.label}
      </a>
    {/each}
  </div>

  <div class="site-nav-actions">
    <LanguageMenu path={sitePath} />
    <button
      class="site-nav-icon-btn"
      aria-label={theme === 'dark' ? m.nav.toLight : m.nav.toDark}
      onclick={toggleTheme}
      type="button"
    >
      {#if theme === 'dark'}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      {:else}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      {/if}
    </button>
    <a class="site-nav-icon-btn" href={LINKS.github} target="_blank" rel="noopener" aria-label={m.nav.github}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
      <span class="site-nav-gh-label">GitHub</span>
    </a>
    <button
      class="site-nav-icon-btn site-nav-burger"
      aria-label={mobileOpen ? m.nav.closeMenu : m.nav.openMenu}
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
  <button class="mobile-overlay" aria-label={m.nav.closeMenu} onclick={closeMobile} type="button"></button>
{/if}

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closeMobile(); }} />

<aside class="mobile-drawer" class:open={mobileOpen} inert={!mobileOpen} aria-label={m.nav.menu}>
  <div class="mobile-drawer-section">
    {#each navLinks as link}
      <a
        class="mobile-drawer-link"
        href={link.href}
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
  <!-- Another language is another page: its live charts start over in it. -->
  {#key i18n.lang}
    {@render children()}
  {/key}
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <a class="site-nav-brand" href={i18n.href('/')}>
        <Logo size={22} />
        <span>TradeCanvas</span>
      </a>
      <p>{m.footer.tagline}</p>
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
    <span>{m.footer.builtWith}</span>
  </div>
</footer>
