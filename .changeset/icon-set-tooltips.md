---
'@tradecanvas/chart': minor
---

**The TradeCanvas icon set, and quicker tooltips.**

- **Every drawing tool has its own icon** (40, where they used to share about
  ten): filled dots mark the points you click to draw. They show in the
  sidebar, the tool menus (now icon + name) and the pinned strip; a group's
  button shows, and picks, the tool last used in it.
- **Chart types have icons** in the chart-type menu and on its button.
- **Interface icons redrawn** on the same grid: 24 px, 1.75 px strokes with
  round caps — same names, so `createIcon(name)` keeps working.
- **New exports** from `@tradecanvas/chart/widget`: `createIcon`,
  `createToolIcon`, `createChartTypeIcon`, `iconSvg` and the icon maps
  (`UI_ICONS`, `DRAWING_TOOL_ICONS`, `CHART_TYPE_ICONS`), to use the set in
  your own UI.
- **Tooltips** on the widget's controls replace the browser's: the first after
  300 ms, the next at once while you move along a toolbar, sliding in beside
  the control, and gone when you click, press a key, or the control goes away.
  Keyboard focus shows them too. A control's `title` is lifted only while the
  pointer is on it (so the browser's tooltip can't double up) and put back
  when it leaves.
