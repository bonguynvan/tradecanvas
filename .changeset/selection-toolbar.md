---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

A toolbar over the drawing a user selects in the widget (colour, width, line style, settings, alert, lock, more, delete), so its options no longer hide behind a right-click; `features.selectionToolbar: false` turns it off. `chart.getDrawingRect(id)` gives the box a drawing covers on screen. The OHLCV legend takes a `fontFamily`, draws its volume row at the OHLC size, keeps each value's place as digits change, and follows the widget look's font.
