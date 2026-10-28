---
'@tradecanvas/chart': patch
---

On Renko, Kagi and the other types that leave the compares off, their panes go too. A compare in a pane of its own, a correlation or another indicator that reads a symbol by time kept its pane there, empty, with a made-up 0, 50, 100 scale; with two such panes they took about 40% of the chart's height. A pane with nothing else drawn in it is now laid out as if it weren't there, its room going to the plot, and it comes back, with its size and place, on candles. The indicator's row in ChartWidget's legend stays, dimmed, with "Not drawn on this chart type".
