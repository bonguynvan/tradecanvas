---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

An indicator's plots and fills can be coloured bar by bar: `colorBy` names an output field with the index of the style colour for each bar, `paletteBy` one that indexes the output's own `palette`. A new plot kind, `'background'`, shades the pane behind each bar with a value, drawn behind the candles (with Canvas 2D and WebGL alike) and the pane's levels, at the plot's `opacity` (0.1 by default). Marks can sit at the top or the bottom of any pane (`position: 'top'`, `'bottom'`).

A fill in a colour that is see-through of its own (`#rrggbbaa`, `rgba()`) now keeps that alpha, times its `opacity`: such a fill is fainter than before, where its alpha was replaced by the `opacity`. A plugin with background plots that draws its own `render` passes the render context's `layer` on to `super.render`, or its backgrounds are drawn twice.
