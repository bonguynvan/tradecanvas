---
'@tradecanvas/chart': minor
'@tradecanvas/react': patch
'@tradecanvas/vue': patch
'@tradecanvas/svelte': patch
---

The components' `data` takes bars that go on from the last as live ticks, in React too: a new array with its last bar changed, or bars added after it (`setBars((bars) => [...bars, next])`), goes in through `updateLastBar` / `appendBar` / `appendBars`, so the view isn't reset, only the end is computed again, and alerts follow the price. React took each new array as a new series, the view back to the newest bar. Vue and Svelte take a new array the same way, as they took a push onto the same one; several bars pushed between two renders go in together, and the bar before a new one is no longer sent again when it is as it was. Any other bars are a new series: an older bar changed, bars taken away, a bar the chart can't take, and the next bars after a stream or the chart itself gave it bars of its own or after `data` was taken away. The chart gets plain copies of the bars' six fields, so frozen state is left alone. Ticks go on as a stream's do: a replay goes on, a price range the user dragged stays, and bars added together go in as `appendBars` takes them (the alerts check their last close). `feedBars(chart, bars, prev)`, the rule the three share, is exported from `@tradecanvas/chart`. `appendBars` keeps a view that `setAutoScroll(false)` stopped from following new bars, as `appendBar` does; it scrolled to them.
