<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { SITE_LANGUAGES } from '$lib/i18n/languages';
  import { switchLang } from '$lib/i18n/paths';

  /** The page's path from the site root, without the base path or the language. */
  let { path }: { path: string } = $props();

  const i18n = useI18n();
  let menu: HTMLDetailsElement | undefined = $state();

  function close() {
    if (menu) menu.open = false;
  }

  function onWindowClick(e: MouseEvent) {
    if (menu?.open && !menu.contains(e.target as Node)) close();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && menu?.open) {
      close();
      menu.querySelector('summary')?.focus();
    }
  }

  /** Tabbing out of the open menu closes it. */
  function onFocusOut(e: FocusEvent) {
    if (menu?.open && !menu.contains(e.relatedTarget as Node | null)) close();
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<details class="lang-menu" bind:this={menu} onfocusout={onFocusOut}>
  <!-- The accessible name starts with the visible one (the current language). -->
  <summary class="site-nav-icon-btn" aria-label="{i18n.language.name} — {i18n.m.nav.language}">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></svg>
    <span class="lang-current">{i18n.language.name}</span>
  </summary>
  <ul class="lang-list">
    {#each SITE_LANGUAGES as language (language.code)}
      <li>
        <a
          href={base + switchLang(path, language.code) + page.url.hash}
          hreflang={language.tag}
          lang={language.tag}
          aria-current={language.code === i18n.lang ? 'true' : undefined}
          onclick={close}
        >{language.name}</a>
      </li>
    {/each}
  </ul>
</details>

<style>
  .lang-menu { position: relative; }

  .lang-menu summary {
    list-style: none;
    user-select: none;
  }

  .lang-menu summary::-webkit-details-marker { display: none; }
  .lang-menu summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .lang-menu[open] summary { color: var(--text); border-color: var(--text-muted); }

  .lang-current { white-space: nowrap; }

  .lang-list {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    z-index: 60;
    min-width: 180px;
    max-height: min(70vh, 460px);
    overflow-y: auto;
    padding: 6px;
    list-style: none;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
  }

  .lang-list a {
    display: block;
    padding: 7px 10px;
    border-radius: var(--radius);
    color: var(--text-dim);
    font-size: 13.5px;
    text-decoration: none;
    white-space: nowrap;
  }

  .lang-list a:hover { color: var(--text); background: var(--bg-panel); }
  .lang-list a:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .lang-list a[aria-current] { color: var(--accent); background: var(--accent-glow); }

  @media (max-width: 640px) {
    .lang-current { display: none; }
  }
</style>
