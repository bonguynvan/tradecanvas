<script lang="ts">
  /**
   * TradeCanvas mark: a candle between code brackets. Brackets follow the
   * text colour, the candle takes the brand colour.
   */
  let { size = 22, title }: { size?: number; title?: string } = $props();
</script>

<svg
  class="logo-mark"
  width={size}
  height={size}
  viewBox="0 0 32 32"
  role={title ? 'img' : undefined}
  aria-label={title}
  aria-hidden={title ? undefined : 'true'}
>
  <path d="M10 4H5v24h5M22 4h5v24h-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" />
  <path d="M16 6v20" stroke="var(--brand)" stroke-width="2.2" stroke-linecap="round" />
  <rect x="12.5" y="10" width="7" height="11" rx="1" fill="var(--brand)" />
</svg>

<style>
  .logo-mark { display: block; flex: none; }
</style>
