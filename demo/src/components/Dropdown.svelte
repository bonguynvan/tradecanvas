<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    trigger: Snippet;
    children: Snippet;
    align?: 'left' | 'right';
    width?: string;
  }

  let { trigger, children, align = 'left', width = '180px' }: Props = $props();

  let open = $state(false);
  let wrapperEl: HTMLDivElement | undefined = $state();

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  function handleClickOutside(e: MouseEvent) {
    if (wrapperEl && !wrapperEl.contains(e.target as Node)) {
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleKeydown);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="dropdown-wrap" bind:this={wrapperEl}>
  <button class="tb-dropdown" class:open onclick={toggle}>
    {@render trigger()}
  </button>
  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="dropdown-panel"
      style="min-width: {width}; {align === 'right' ? 'right: 0; left: auto;' : 'left: 0;'}"
      onclick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.dropdown-item')) close();
      }}
    >
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .dropdown-wrap {
    position: relative;
  }

  .tb-dropdown {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 12px;
    font-family: inherit;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    line-height: 1;
  }

  .tb-dropdown:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }

  .tb-dropdown.open {
    color: var(--text);
  }

  :global(body.light) .tb-dropdown:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .dropdown-panel {
    position: absolute;
    top: 100%;
    margin-top: 4px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 50;
    padding: 4px 0;
    max-height: 400px;
    overflow-y: auto;
  }
</style>
