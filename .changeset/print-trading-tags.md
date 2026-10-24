---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
'@tradecanvas/commons': minor
---

Orders and positions on the chart in the Print look. Each line has a tag at its right end, by the price axis, where it no longer covers the legend: an order's quantity and kind ("0.25 Sell limit") and ×; a position's open quantity, side and open profit, then ⇅ and ×; a stop's or a target's "SL"/"TP" and what it would make or lose there, and ×. Tags that would cover each other stand side by side. A press on an order's, a stop's or a target's tag drags that line, whatever line is nearer, and a stop or a target being dragged shows where it is going (its line, what it would make, its price on the axis). Stops and targets have their prices on the axis too, and the axis's trading badges move apart when they would overlap. An order to open with a stop and a target shows them as dotted lines. A bracket being placed has the same tags (its reward to risk on the entry, the distance in percent on the stop and target) and no knobs; its bar sits at the foot of the chart (at the top while the replay bar shows), centred (it started at the middle and ran off a phone's screen), in the widget's direction. `positionLabel` now fills the tag after the quantity. A press between two buttons in a column takes the one it is on. New icon: `arrowUpDown`.

ChartWidget no longer opens the watchlist by itself on a wide widget: every panel starts shut, on the rail, until it is opened (`widget.openPanel('watchlist')`).

`MockAdapter`'s history ends on the timeframe's grid, so its ticks build the newest bar from the start (for up to a bar's length they were dropped, and the price line moved while the bars stood still), and the forming bar keeps its open and grows its range.
