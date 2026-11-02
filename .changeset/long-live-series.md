---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A chart holding a long history keeps its frame rate while a busy feed runs. The time axis no longer looks at every bar's time on each frame, the day and month lines look only at the new bars when one arrives, and the depth heatmap measures the gap between a snapshot's levels once, when it comes in, rather than on every frame. On a million one-second bars with a feed of 30,000 trades a second, four indicators, orders and the heatmap, the widget went from about 29 to about 57 frames a second, and the main-thread tasks over 50 ms, about one a second, are gone.
