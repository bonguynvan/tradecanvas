---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

WebGL renderer: indicators, indicator panes, compare lines and most other chart types (line, area, bars, Heikin-Ashi, hollow candles, Renko, line break, range bars, HLC area, step line, line with markers, equivolume, high-low) draw on the GPU too. Their Canvas 2D drawing is recorded as GPU strokes, fills and rectangles, antialiased at their edges as Canvas 2D is; text goes on the 2D canvas over them. Anything the GPU wouldn't draw the same (images, patterns, rotated or non-rectangular clips, sharp mitered corners, overlapping pieces of one path, shapes other than bands and areas) is left to Canvas 2D, keeping the stacking order: baseline, Kagi and point & figure charts stay on Canvas 2D for now. Custom indicator plugins come along without changes; their `render` may run twice in a frame when part of it falls back. Session break labels now draw over the indicators.
