---
'@tradecanvas/chart': patch
---

In ChartWidget, a bar clicked to start a replay while another symbol's or timeframe's bars are loading is no longer lost. The click was dropped, and once the bars came in the replay bar still asked for a bar. The widget now keeps the time of the bar clicked, says Loading chart until the bars are in, then starts the replay at the bar that holds that time. If the bars fail to load, or the pick is cancelled or the replay closed first, nothing starts.
