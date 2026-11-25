---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Order blocks: `addIndicator('orderblocks')` draws the bar the market last turned from before a close broke a swing, as a box to the right edge until a close goes through it; `showBroken: 1` keeps the broken ones, and `count` (5) is how many standing blocks of each side are drawn. `detectOrderBlocks(bars, { length })` gives them with no chart.
