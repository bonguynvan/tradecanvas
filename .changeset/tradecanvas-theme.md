---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**TradeCanvas look by default.** `DARK_THEME` and `LIGHT_THEME` use the
TradeCanvas palette: an ink ground with mint/coral candles and an amber
series line in dark, crisp white with deeper greens/reds and a deep amber
line in light. Indicators, orders, signal markers, drawing tools and the
`ChartWidget` chrome (accent, surfaces, focus ring, settings defaults) follow
the same palette. Auto-coloured indicators cycle through `TC_SERIES_COLORS`;
comparison lines no longer start with an orange that blended into the amber
main line; armed price alerts are blue and triggered ones amber (they were
gold vs orange). The palette is exported as `TC_PALETTE` for building
matching custom themes. Tests keep every theme-neutral colour at 3:1 on both
the dark and the light background, and the widget's accent, green, red and
muted text at 4.5:1. Charts that pass their own `Theme` are unaffected.

**Gauge redesign.** `GaugeChart` now draws a thin ring with rounded ends:
zones are separated by small gaps, bright up to the value and dimmed beyond
it, and the track shows wherever no zone reaches. A knob on the ring marks
the value, so the number in the centre is never crossed by a needle; the
current zone's label shows above the number, with fine ticks inside the
ring. Text shrinks to fit (or is left out) on small dials. The dial fits its
container for any start/end angle; odd input is normalised (an end before the
start wraps once, more than a full turn is a full turn, sweeps narrower than
90° are widened), a collapsed `min`/`max` range and a missing value (shown as
"—") no longer produce NaN. Changed defaults: a 240° sweep (`startAngle` 150,
`endAngle` 390); `thickness` is relative to the ring's centre line and
defaults to 0.14 (was 0.25 of the outer radius); `showZoneLabels` places
labels outside the ring, with room reserved for them. The classic needle is
available with `pointer: 'needle'` (the number moves below the hub).
`renderGauge` restores the canvas state it changes.
