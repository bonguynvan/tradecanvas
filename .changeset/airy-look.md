---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

An airy look, ahead of 2.0 opening with it. The chart's `barLayout: 'golden'` (or `chart.setBarLayout`) makes a candle's body the slot × φ⁻¹ at every zoom, the rest a gap, and opens the chart at φ⁴ ≈ 6.85 px a slot: more bars on screen, with air between them. `'classic'`, a 2 px gap and 10 px a slot to open, stays the default. Over bars on screen a new layout keeps the zoom. The chart's own text (axes, legend, tags) takes a font over any theme with `font` or `chart.setFont({ family, sizeSmall, … })`, kept through theme changes (`null` goes back to the theme's); `SANS_FONT_FAMILY` is a sans face every system has. In the widget, `ui: { density: 'airy' }` turns it all on: spacious controls, the figures in the look's sans face, golden bars. `chartOptions.barLayout` and `chartOptions.font` win over it.
