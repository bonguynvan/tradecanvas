---
'@tradecanvas/commons': major
'@tradecanvas/core': major
'@tradecanvas/chart': major
---

The Vietnamese share presets (`MARKET_HOSE`, `MARKET_HOSE_ETF`, `MARKET_HNX`, `MARKET_UPCOM`) say what their prices are worth: a `contractMultiplier` of 1,000, so an order's value and a position's profit read in dong (100 shares at 26.40 are 2,640,000, not 2,640). Money is counted by the market's multiplier wherever the chart counts it: the amounts on its trading tags, the quantity a position drawing's risk buys, a bracket sized by `risk`, and a `PaperExecutionAdapter` given no `multiplier` of its own, which takes the market's from the chart it is connected to. `scaleMarketPrices` divides the multiplier by its factor, and `positionLevels(drawing, multiplier)` takes the market's.
