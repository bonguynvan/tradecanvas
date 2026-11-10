<script lang="ts">
  // "Powered by TradeCanvas": the words in the host's own face, the TC mark and the
  // wordmark, as one link. It takes the text colour around it, so it follows the
  // page's theme; only the mark's candle keeps the brand's amber.
  import {
    opensElsewhere,
    poweredByLayout,
    safeBadgeHref,
    POWERED_BY_LABEL,
    TRADECANVAS_MARK_SVG,
    TRADECANVAS_WORDMARK_SVG,
  } from '@tradecanvas/chart';

  interface Props {
    /** The mark's height in CSS pixels; the words and the wordmark follow it. Default 16, at least 12. */
    size?: number;
    /** Where the link goes. Default https://tradecanvas.dev. */
    href?: string;
    /** The link's target. Default '_blank'; any target but _self, _parent or _top also gets rel="noopener noreferrer". */
    target?: string;
    /** A class for the link, to place it. */
    class?: string;
  }

  let { size = 16, href, target = '_blank', class: className = '' }: Props = $props();

  const layout = $derived(poweredByLayout(size));
  const link = $derived(safeBadgeHref(href));
  const sized = (svg: string, width: number, height: number): string =>
    svg.replace('<svg ', `<svg width="${width}" height="${height}" style="display:block" `);
</script>

<a
  class={className || undefined}
  href={link}
  {target}
  rel={opensElsewhere(target) ? 'noopener noreferrer' : undefined}
  aria-label={POWERED_BY_LABEL}
  style:display="inline-flex"
  style:align-items="center"
  style:color="inherit"
  style:text-decoration="none"
  style:line-height="1"
  style:white-space="nowrap"
  style:gap="{layout.gap}px"
  style:height="{layout.height}px"
  style:font-size="{layout.fontSize}px"
>
  <span aria-hidden="true">Powered by</span>
  <span style="display:flex;flex:none" aria-hidden="true">{@html sized(TRADECANVAS_MARK_SVG, layout.height, layout.height)}</span>
  <span style="display:flex;flex:none" aria-hidden="true">{@html sized(TRADECANVAS_WORDMARK_SVG, layout.wordmarkWidth, layout.wordmarkHeight)}</span>
</a>

