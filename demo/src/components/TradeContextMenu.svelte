<script lang="ts">
  interface Props {
    x: number;
    y: number;
    price: number;
    visible: boolean;
    onBuyMarket: (price: number) => void;
    onSellMarket: (price: number) => void;
    onBuyLimit: (price: number) => void;
    onSellLimit: (price: number) => void;
    onClose: () => void;
  }

  let { x, y, price, visible, onBuyMarket, onSellMarket, onBuyLimit, onSellLimit, onClose }: Props = $props();

  function formatPrice(v: number): string {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function handleClick(action: (price: number) => void) {
    action(price);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function handleClickOutside(e: MouseEvent) {
    onClose();
  }

  $effect(() => {
    if (visible) {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleKeydown);
      document.addEventListener('scroll', onClose, true);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('scroll', onClose, true);
    };
  });
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="context-menu"
    style="left: {x}px; top: {y}px;"
    onclick={(e) => e.stopPropagation()}
  >
    <button class="ctx-item buy" onclick={() => handleClick(onBuyMarket)}>
      Buy / Long at {formatPrice(price)}
    </button>
    <button class="ctx-item sell" onclick={() => handleClick(onSellMarket)}>
      Sell / Short at {formatPrice(price)}
    </button>
    <div class="ctx-divider"></div>
    <button class="ctx-item buy" onclick={() => handleClick(onBuyLimit)}>
      Buy Limit at {formatPrice(price)}
    </button>
    <button class="ctx-item sell" onclick={() => handleClick(onSellLimit)}>
      Sell Limit at {formatPrice(price)}
    </button>
    <div class="ctx-divider"></div>
    <button class="ctx-item dim" onclick={onClose}>
      Cancel
    </button>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: 100;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    padding: 4px 0;
    min-width: 200px;
  }

  .ctx-item {
    display: block;
    width: 100%;
    padding: 6px 12px;
    font-size: 12px;
    font-family: inherit;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    transition: background var(--transition);
    white-space: nowrap;
  }

  .ctx-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  :global(body.light) .ctx-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .ctx-item.buy {
    color: var(--green);
  }

  .ctx-item.sell {
    color: var(--red);
  }

  .ctx-item.dim {
    color: var(--text-muted);
  }

  .ctx-divider {
    border-top: 1px solid var(--border);
    margin: 4px 0;
  }
</style>
