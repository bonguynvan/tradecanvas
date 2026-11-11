---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The ticker everywhere a symbol is named. An indicator on another symbol ("Compare NVDA", which the alert sources name too), a compare line's label, the compare toasts, the object tree's compares, the layouts dialog, the grid's tabs and the order ticket show the symbol without the venue before it, as the toolbar and the legend do. `tickerOf(symbol)`, from `@tradecanvas/chart` or `@tradecanvas/commons`, gives the same. A data export's column for such an indicator is headed the same way ("Compare ETHUSDT"). A watchlist row keeps a pair already written with its slash (a DEX pool's "WBTC/WETH") as it is, where it read "WBTC/W/ETH". A symbol may be up to 160 characters, where it was 64: a DEX pool's, which names its network, its address and its pair, was dropped from the watchlist and the search unseen.
