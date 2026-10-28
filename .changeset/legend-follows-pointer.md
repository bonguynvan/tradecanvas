---
'@tradecanvas/chart': patch
---

The OHLCV legend shows the bar under a pointer that has come to rest. It was drawn in the frame that found the bar, before it knew it, so after a single move (the pointer coming onto the chart as ChartWidget's data window opened, say) it stayed on the latest bar while the data window and the indicator rows showed the hovered one. The legend is drawn again once the bar is known, and again when the pointer leaves.
