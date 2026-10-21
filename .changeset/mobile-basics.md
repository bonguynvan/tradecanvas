---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
"@tradecanvas/react": patch
"@tradecanvas/vue": patch
"@tradecanvas/svelte": patch
---

Lighter on phones: the chart draws at a pixel ratio of 2 at most (`maxPixelRatio`, `setMaxPixelRatio`) and follows a ratio change with the size unchanged; it stops drawing, and refitting on live ticks, off screen and on a hidden page (`pauseWhenHidden`, `suspend()` / `resume()` / `isSuspended()`), and draws before a screenshot; a live feed recalculates indicators once before the next read instead of on every tick (`IndicatorEngine.deferRecalculateFrom`); a stream silent too long reconnects when the page or the network comes back (`StreamManager.wake`), and a dropped connection schedules one retry, not two; destroyed charts give their canvas memory back at once; momentum keeps time on 120 Hz screens and stops for reduced motion. The widget skips its timers on a hidden page, keeps sheets above the on-screen keyboard, uses 16 px inputs on touch screens and dynamic viewport units. React no longer adds a crosshair listener on every render. Vue and Svelte feed a bar pushed onto the same array, or a change to its last bar, as a live tick instead of reloading the series (the view stays put); Vue no longer walks every bar, Svelte sees bars pushed onto `$state` data, and both pass plain bars.
