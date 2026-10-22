<script lang="ts">
  /**
   * TradeCanvas mark: the slash of </> is a candle. Brackets follow the text
   * colour, the candle takes the brand colour. Up to 24 px the small cut draws
   * heavier brackets and a wider candle (see brand/GUIDELINES.md).
   */
  let { size = 22, title }: { size?: number; title?: string } = $props();
  const small = $derived(size <= 24);
</script>

<svg
  class="logo-mark"
  width={size}
  height={size}
  viewBox="0 0 256 256"
  role={title ? 'img' : undefined}
  aria-label={title}
  aria-hidden={title ? undefined : 'true'}
>
  {#if small}
    <path d="M82 88L42 128L82 168M174 88L214 128L174 168" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
    <path fill="var(--brand)" transform="rotate(15 128 128)" d="M119 40H137V72H144a10 10 0 0 1 10 10V174a10 10 0 0 1-10 10H137V216H119V184H112a10 10 0 0 1-10-10V82a10 10 0 0 1 10-10H119Z" />
  {:else}
    <path d="M78 84L34 128L78 172M178 84L222 128L178 172" fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
    <path fill="var(--brand)" transform="rotate(15 128 128)" d="M122 44H134V76H139a9 9 0 0 1 9 9V171a9 9 0 0 1-9 9H134V212H122V180H117a9 9 0 0 1-9-9V85a9 9 0 0 1 9-9H122Z" />
  {/if}
</svg>

<style>
  .logo-mark { display: block; flex: none; }
</style>
