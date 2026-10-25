---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Prices away from the axis now read as the axis writes them. With a symbol's or a market's decimals set (`SymbolInfo.pricePrecision`, `setMarket({ pricePrecision })`), a BTC chart at one decimal showed '100,018.7' on the axis but 'Crossing 100,018.70' in the widget's alerts list, '23.6% (99125.18)' on a Fibonacci retracement and 'REF 98937.00' on the day's price limits. Drawing labels (Fibonacci levels, horizontal lines and rays, price labels, a trend line's stats, the long and short position, price ranges, the measure tools, forecasts, info lines, anchored VWAP and volume profile ranges), pivot labels, the shift-drag measure, the market profile's POC, VAH and VAL, the day's price limits and the pinned tooltip now take those decimals, and the widget's data window, alerts list, order ticket, account panel, depth ladder, symbol info and toasts write prices with `chart.formatPrice`. The lists and the data window are written again when the symbol's details arrive after them.

All of these now group thousands and follow the chart's number locale ('99,125.18', '98.937,0' in `de-DE`), on every chart, also where no decimals are set; there each label keeps the decimals it had. The long and short position's reward, risk and quantity and a trade zone's P&L stay at their decimals, grouped too, and their percentages follow the locale. If your tests compare these labels' text, they may need updating.

A price limit's tag on the axis now hides the scale's label under it, as the last price's tag does.

For plugins: `ViewportState.pricePrecision` carries the market's or the symbol's decimals (unset on indicator panes and the left scale), `priceTagText(price, viewport)` reads it, and `Viewport.setPricePrecision` sets it.
