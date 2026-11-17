---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

A custom indicator's colours can follow the theme: its descriptor takes `defaultStyle`, a style or a function of the theme (`(theme) => ({ colors: … })`). An instance on it changes with `chart.setTheme()`, a colour someone picks for it stays, and it sits under the viewer's saved default (`chart.setIndicatorDefaults()`). A saved layout and the widget's *Save as default* leave out what the theme gives. An indicator's `render` is also given `{ theme }`, the theme the chart draws with, as its fifth argument.
