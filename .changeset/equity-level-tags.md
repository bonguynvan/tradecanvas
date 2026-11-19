---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

An equity curve's levels too close for both tags at the axis move their tags apart, each as little as it can, where one was drawn over the other; when there is no room for them all, the lowest levels' are left out. A level's `labelAt: 'start'` writes its name at the line's left end, away from the curve's latest point; `'end'`, the right, is the default. Names in the plot keep clear of each other: a level's goes under its line when another name is over it, and a band's moves down its band past a level's.
