---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

An indicator's descriptor now says how its plots look, and the chart draws them from it: `fills` shade between two plots (`{ between: ['upper', 'lower'], color: 0, opacity: 0.1 }`), and a plot's `width`, `lineStyle`, `opacity` and `breakOn` keep it at a width of its own, dash it until its style says otherwise, set it back, and break its line where a field such as `session` changes. A band or channel of your own needs no `render` method. The built-in moving averages, channels, bands, VWAPs, pivot points, Chandelier Exit, Supertrend and Parabolic SAR are drawn this way. In ChartWidget's indicator settings, a line its indicator dashes shows as dashed, and Cancel and Reset put it back dashed instead of solid. Supertrend is drawn at the width the settings show, half a pixel thinner than before, and the dashed lines of Chandelier Exit, the pivot levels and Session VWAP's bands take the same dash as the other indicators. The pivot levels other than P stay 1 px whatever the width set, like Session VWAP's bands and Donchian's middle line. Zoomed far out, Parabolic SAR draws one dot per pixel column, and Session VWAP's bands are drawn over its line instead of under it.
