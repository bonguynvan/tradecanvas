---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Lines and boxes take a text. A trend line, a ray, an extended, info or angle line, an arrow, a horizontal or vertical line and a rectangle write `style.text` along the line or inside the box: `textAlign` puts it at an end or the middle, the new `textVAlign` above, on or under the line (top, middle or bottom in a box), and it follows the line's slope. The widget's Text tab has both rows. A horizontal line and ray can hide their price (`showPrice: false`), and a vertical line can show its bar's time as the crosshair writes it (`showTime: true`). A rectangle has eight handles, one per corner and one per side. Fibonacci retracements and extensions draw a dashed trend line through their points (`trendLine`) and can draw every level in one colour (`oneColor`).
