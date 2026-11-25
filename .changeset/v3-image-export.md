---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Pictures at any size, print and PDF, and finance charts with no page. `chart.screenshot`, `screenshotDataURL`, `screenshotBlob` and `copyScreenshot` take options: `type` (`'png'`, `'jpeg'`, `'webp'`) with `quality`, and `pixelRatio` or `theme`, for which the frame is drawn again for the picture and the chart on the page is left as it is; `chart.toCanvas` gives the canvas. `chart.print()` opens the print dialog for the chart alone, and `chart.toPdf()` gives a PDF of one page with the picture kept without loss, both in the light theme and at twice the pixels unless told otherwise. Every finance chart has the same methods, and takes a `width` and a `height` for a picture of another size. `chartsToPdf` makes one PDF of several charts, a page each. `renderFinanceChart(ctx, kind, options, size)` draws a finance chart on a context of your own with no page: a canvas made in Node, an OffscreenCanvas in a worker. The widget's command palette has Print chart and Save chart as PDF (`widget.printChart()`, `widget.saveChartPdf()`).
