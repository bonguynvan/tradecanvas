---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A picture at a size of its own, and of a whole grid. `width` and `height` on `chart.toCanvas`, `screenshot`, `screenshotDataURL`, `screenshotBlob`, `copyScreenshot`, `print` and `toPdf` lay the price chart out again at that size, the bars it has on view on view there, and put the page's layout back: nothing on the page is resized or told. `ChartWidgetGrid` has `toCanvas`, `screenshot`, `screenshotDataURL`, `screenshotBlob`, `print` and `toPdf`: the grid's charts as one picture, each in its cell. `Viewport.snapshot()` and `restore()` put a viewport back as it was, and `ChartLegend.keepSize()` a legend's size. Fixed: a picture held to the most pixels a canvas has could pass it by a few through rounding.
