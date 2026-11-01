---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The "+" by the price axis no longer covers the order and position tags' buttons: while it shows, the tags end left of it. `PRICE_AXIS_ADD_STRIP` gives its width, and `TradingManager.setTagInset(px)` keeps the tags that far from the plot's right edge. `setFeatures({ priceAxisAddButton })` now turns the "+" off and on as `setPriceAxisAddButton` does.
