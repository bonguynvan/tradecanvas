---
"@tradecanvas/core": patch
"@tradecanvas/chart": patch
---

Add vertical drag-to-pan on the chart body. Dragging the chart up or down now
slides the price scale (grab-and-drag, content follows the cursor), the vertical
counterpart to horizontal time-panning. It engages only after ~6px of vertical
travel so a normal mostly-horizontal pan doesn't disturb the price scale, and —
like the price-axis drag-scale gesture — it freezes auto-scale (double-click the
price axis to restore it).

This fixes the case where a Y-axis scale left the candles pushed off the top or
bottom of the pane with no way to bring them back except a full auto-scale reset,
which happens most often on sparse series (few candles, e.g. a stock on a wide
timeframe).

New `Viewport.panPriceRange(deltaPixels)` (regular + log scale aware). `PanHandler`
now reports a second `deltaY` argument and takes an optional `onStart` callback;
existing single-argument pan callbacks keep working unchanged.
