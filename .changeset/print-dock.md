---
'@tradecanvas/chart': minor
'@tradecanvas/commons': minor
---

The panels beside the chart. The watchlist, alerts, the object tree, the data window and the symbol info are panels of one dock beside the chart, opened one at a time from a rail at its outer edge (on the left right to left), each with one header and a close button; the watchlist opens to start with. The panel is 296 px wide to start, 233 to 377 and never more than 38.2% of its row, resized from its edge by pointer or keyboard and kept in this browser; the watchlist opens by itself on a widget 987 px wide or more. On a phone, or a widget narrower than 641 px, there is no rail and a panel rises from the bottom, shut to start. New `widget.openPanel(panel)`, `closePanel()`, `getOpenPanel()` and the `WidgetPanel` type; new switches `dock` and `dock.watchlist`, `dock.alerts`, `dock.objectTree`, `dock.dataWindow`, `dock.symbolInfo`. The charts of a `ChartWidgetGrid` have no rail unless asked. The icon set has `list` and `table`.
