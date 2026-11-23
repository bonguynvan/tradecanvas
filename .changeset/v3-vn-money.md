---
'@tradecanvas/commons': major
'@tradecanvas/core': major
'@tradecanvas/chart': major
---

The Vietnamese share presets (`MARKET_HOSE`, `MARKET_HOSE_ETF`, `MARKET_HNX`, `MARKET_UPCOM`) say what their prices are worth: a `contractMultiplier` of 1,000, so an order's value and a position's profit read in dong (100 shares at 26.40 are 2,640,000, not 2,640). The amounts on the chart's trading tags are counted by the market's multiplier too, as the account panel's were, and `scaleMarketPrices` divides the multiplier by its factor. Give a `PaperExecutionAdapter` the market's `contractMultiplier` as its `multiplier`.
