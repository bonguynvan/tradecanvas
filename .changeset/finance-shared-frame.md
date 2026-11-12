---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The depth, equity curve and waterfall charts are laid out as the newer finance charts are: margins sized to their labels and 12 px from the edge (they were fixed numbers), value axes in round steps, a time axis in round times, numbers as on the other charts, and the shared rounded tooltip (also on the heatmap). They look different from 1.x. On a touch screen a tap now shows the tooltip of every finance chart that has one and keeps it until a tap elsewhere. The canvases are sized in the container's own device pixels and follow a change of pixel ratio, and hairlines fall on whole device pixels, so the charts are sharp at 125% and 150%. A waterfall's long labels are turned in the room they need and cut with an ellipsis; an equity curve names its benchmark in a legend and takes points in any order of time; a depth chart writes small prices in full; a heatmap's default colours follow the theme. `@tradecanvas/core` exports `computeWaterfallLayout`, `hitWaterfallBar`, `computeEquityLayout` and `computeDepthLayout`.
