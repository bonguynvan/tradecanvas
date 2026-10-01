---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Fix two display bugs reported for sub-$1 assets and non-English locales:

- The OHLCV legend hardcoded 2-decimal, `en-US` number formatting, so a ~$0.34
  asset showed "0.34 0.34 0.34 0.34" and ignored `numberLocale`. It now derives
  decimals from the same tick step the price axis uses, and formats with the
  chart's locale.
- The month-boundary session-break label used a hardcoded English month array
  and a 2-digit year (e.g. "Oct 26" for October 2026), which read exactly like
  a day-of-month and was mistaken for the wrong date. It now uses the chart's
  locale and always renders the full 4-digit year.

Also adds `features.crosshairTooltip` to hide the floating OHLCV popup that
follows the cursor, for embedders who want the TradingView-style
legend-only hover behavior.
