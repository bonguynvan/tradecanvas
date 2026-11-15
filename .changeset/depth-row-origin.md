---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

`depthOverlay.rowOrigin` sets where the depth overlay's rows start: with `rowSize`, row k runs from `rowOrigin + k × rowSize` to the next row's start, and a level on a row's start is in that row. `rowOrigin: -tick / 2` lines the book up with a footprint whose cells start at multiples of its row size.
