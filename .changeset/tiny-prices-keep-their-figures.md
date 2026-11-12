---
'@tradecanvas/chart': patch
'@tradecanvas/core': patch
'@tradecanvas/commons': patch
---

A price however small keeps its figures away from the axis: the watchlist, the market profile's stats, the data window, the alerts list and what a position makes or loses show four significant figures of a price under 1, where they stopped at a fixed count of decimals or wrote `7.855e-8`. The watchlist writes a symbol at its own `pricePrecision` when its entry in `symbols` gives one. `smallValueDecimals` and `MAX_PRICE_DECIMALS` are exported from `@tradecanvas/commons`.
