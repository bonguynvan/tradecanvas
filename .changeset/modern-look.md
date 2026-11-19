---
'@tradecanvas/commons': minor
'@tradecanvas/chart': minor
---

The widget opens in a new look, Modern: a code editor's window in its Dark Modern and Light Modern colours, the chart on the editor's ground, 16 px icons in 28 px buttons on a 38 px toolbar, corners of 4, 6 and 8 px, the logo's amber for what you act on and pick, and candles in teal (`#089981`) and red (`#f23645`). Without a theme object the widget's chart takes `MODERN_DARK_THEME` and `MODERN_LIGHT_THEME`, new in `@tradecanvas/commons` and `@tradecanvas/chart`. To keep the widget as it was, pass `ui: 'print'`, or `preset: 'print'` in a `ui` object (one without a preset now starts from Modern): the look, the colours and the candles come back, and the other looks keep those colours too. A chart without the widget is unchanged.
