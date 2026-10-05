<!--
  "Click to use the chart" over a chart wrapped in `use:pressToEngage`: on
  hover with a mouse, always on a touch screen (unless `touch={false}`),
  gone once it is engaged.
  Its parent must be positioned.
-->
<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';

  /** `touch={false}`: no hint on a touch screen (small charts, many of them). */
  let { touch = true }: { touch?: boolean } = $props();

  const i18n = useI18n();
  const m = $derived(i18n.m);
</script>

<span class="engage-hint" class:no-touch={!touch} aria-hidden="true">
  <span class="by-click">{m.engage.click}</span><span class="by-tap">{m.engage.tap}</span>
</span>

<style>
  .engage-hint {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 4;
    translate: -50% -50%;
    padding: 7px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
    backdrop-filter: blur(6px);
    color: var(--text);
    font: 500 12.5px var(--font);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition);
  }

  .by-tap { display: none; }

  :global(:hover:not([data-engaged])) > .engage-hint { opacity: 1; }

  /* On a touch screen: smaller, shown until the chart is tapped. */
  @media (pointer: coarse) {
    .engage-hint {
      padding: 4px 10px;
      font-size: 11.5px;
    }
    .by-click { display: none; }
    .by-tap { display: inline; }
    :global(:not([data-engaged])) > .engage-hint { opacity: 0.88; }
    .engage-hint.no-touch { display: none; }
  }

  :global([data-engaged]) > .engage-hint { opacity: 0; }
</style>
