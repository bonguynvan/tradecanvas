---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

The legend's rows sit on a see-through ground of the chart's background, so moving averages and other lines across the top of the plot run behind the text, not through it. `setLegend({ ground: false })` leaves it out. ChartWidget's indicator rows have the same ground, the CSS variable `--tcw-legend-ground` (`transparent` for none).
