---
'@tradecanvas/chart': patch
---

ChartWidget's drawing button on a phone stays over the chart's plot. In a right-to-left widget (Arabic, Hebrew, Persian) it sat at the right edge, over the price axis and its labels, since the axis stays on the chart's right; with the left price scale shown it sat over that scale. It now sits in from the plot's left edge in either direction, and follows when the chart lays out again or the left scale comes or goes.
