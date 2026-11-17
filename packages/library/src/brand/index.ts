// `@tradecanvas/chart/brand`: the "Powered by TradeCanvas" badge on its own. A
// page that shows the badge and no chart imports it from here, so the chart's
// engine does not come with it; the package's main entry exports the same.
export {
  createPoweredBy,
  opensElsewhere,
  poweredByHtml,
  poweredByLayout,
  safeBadgeHref,
  POWERED_BY_LABEL,
  TRADECANVAS_MARK_SVG,
  TRADECANVAS_URL,
  TRADECANVAS_WORDMARK_SVG,
} from './poweredBy.js';
export type { PoweredByLayout, PoweredByOptions } from './poweredBy.js';
