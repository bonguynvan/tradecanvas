---
"@tradecanvas/core": patch
"@tradecanvas/chart": patch
---

The last price's line is drawn under the labels of orders and positions, so a label near the last price stays readable; its tag on the price axis is still drawn over the axis. `CurrentPriceLine` gains `renderLine` and `renderTag` (`render` still draws both).
