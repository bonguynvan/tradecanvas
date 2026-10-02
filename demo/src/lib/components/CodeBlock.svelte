<script lang="ts">
  import { copyText } from '$lib/clipboard';
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';

  let { code, label }: { code: string; label?: string } = $props();

  const i18n = useI18n();
  const m = $derived(i18n.m.copy);
  let copied = $state(false);
  let codeEl: HTMLElement | undefined = $state();

  async function copy() {
    copied = await copyText(code, codeEl);
    if (copied) setTimeout(() => { copied = false; }, 1500);
  }
</script>

<div class="code-block">
  <button class="code-copy" type="button" onclick={copy} aria-label={label ? fill(m.copyLabel, { label }) : m.copyCode}>
    {copied ? m.copied : m.copy}
  </button>
  <span class="sr-only" aria-live="polite">{copied ? m.copiedAnnouncement : ''}</span>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <pre tabindex="0" aria-label={label ?? m.codeSample}><code bind:this={codeEl}>{code}</code></pre>
</div>

<style>
  .code-block {
    position: relative;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--bg);
    min-width: 0;
  }

  pre {
    margin: 0;
    padding: 20px 22px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--text);
    tab-size: 2;
  }

  .code-copy {
    position: absolute;
    top: 10px;
    right: 10px;
    font: 500 10.5px var(--font-mono);
    letter-spacing: 0.08em;
    padding: 5px 9px;
    color: var(--text-muted);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    transition: color var(--transition), border-color var(--transition);
  }

  .code-copy:hover { color: var(--text); border-color: var(--text-muted); }

  pre:focus-visible { outline-offset: -2px; }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* Narrow screens: keep the first code line clear of the copy button. */
  @media (max-width: 640px) {
    pre { padding-top: 46px; }
  }
</style>
