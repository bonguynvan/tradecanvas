---
'@tradecanvas/chart': patch
---

ChartWidget's data window writes its indicator values as the legend does: a line on the price pane as the chart writes prices (the market's or the symbol's decimals, else the axis's), one in a pane of its own in the decimals its size calls for, both in the number locale. They were rounded on their own, without grouping (`96848.73`, `54.3220`). The change is in the decimals the bar's prices show (`-206.95`, not `-206.949`).
