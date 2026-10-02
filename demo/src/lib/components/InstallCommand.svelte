<script lang="ts">
  import { copyText } from '$lib/clipboard';
  import { useI18n } from '$lib/i18n/context.svelte';

  const i18n = useI18n();

  const PM_COMMANDS = [
    { label: 'npm', cmd: 'npm i @tradecanvas/chart' },
    { label: 'pnpm', cmd: 'pnpm add @tradecanvas/chart' },
    { label: 'yarn', cmd: 'yarn add @tradecanvas/chart' },
  ] as const;

  let activePm = $state(0);
  let copied = $state(false);
  let cmdEl: HTMLSpanElement | undefined = $state();

  async function copy() {
    copied = await copyText(PM_COMMANDS[activePm].cmd, cmdEl);
    if (copied) setTimeout(() => { copied = false; }, 1500);
  }
</script>

<div class="cta-install-wrap">
  <div class="pm-tabs" role="group" aria-label={i18n.m.copy.packageManager}>
    {#each PM_COMMANDS as pm, i}
      <button
        class="pm-tab"
        class:active={activePm === i}
        aria-pressed={activePm === i}
        onclick={() => { activePm = i; copied = false; }}
        type="button"
      >{pm.label}</button>
    {/each}
  </div>
  <button class="cta-install" class:copied onclick={copy} type="button" aria-label={i18n.m.copy.copyInstall}>
    <span class="prompt" aria-hidden="true">$</span>
    <span class="cmd" bind:this={cmdEl}>{PM_COMMANDS[activePm].cmd}</span>
    <span class="copy-icon" aria-live="polite">{copied ? i18n.m.copy.copied : i18n.m.copy.copy}</span>
  </button>
</div>
