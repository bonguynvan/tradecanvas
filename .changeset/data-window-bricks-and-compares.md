---
'@tradecanvas/chart': patch
---

ChartWidget's data window writes a compare in its own decimals and shows the brick under the pointer on Renko. A compare on its own scale, a spread or a ratio was written in the chart's price decimals, so a coin near 0.00005 compared on a chart of BTC near 64,000 read `0.00`; such lines, and any line on a scale of its own, now read in the decimals their size calls for, in the data window and the legend. On Renko, Kagi and the like the data window showed the data bar with the brick's index (brick 3 with the third day's prices and a change from the second); it now shows the brick, as the legend does, and its change from the brick before.
