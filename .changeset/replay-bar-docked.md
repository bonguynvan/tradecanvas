---
'@tradecanvas/chart': patch
---

`ChartWidget`'s replay bar is a row under the chart, across the widget, instead of a bar floating over the main pane's foot: the chart is made shorter for it while it is open, so the volume and the bottom panes are no longer covered. The widget no longer sets `--tcw-replay-foot` or `--tcw-replay-plot-*` on it.
