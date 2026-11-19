---
'@tradecanvas/chart': minor
---

A favorites toolbar: the star button on the drawing sidebar shows the pinned drawing tools as a bar floating over the chart. Drag its grip to put it anywhere on the chart, press a tool to pick it, right-click one to unpin it. Whether it shows, and where it was left, are kept in this browser, one setting for the widgets of a page; a chart made too small for it holds it inside, and it goes back to its place when there is room again. It first appears centred at the chart's top, and the sidebar's strip of pinned tools steps aside while it shows. The new `favoritesBar` switch (`features: { favoritesBar: false }`) leaves out the bar and its button.
