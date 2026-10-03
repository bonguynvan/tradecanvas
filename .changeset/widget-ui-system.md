---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**A built-in UI system for the widget.**

- `ChartWidgetOptions.ui`, `ChartWidget.setUI` / `getUI` and
  `ChartWidgetGrid.setUI`: the widget's look as tokens — a corner scale and
  each kind of part's corners, sizes and density, type, borders and
  separators, shadows, frosted surfaces, how a chosen button shows (`tint`,
  `solid`, `underline`), a docked or floating toolbar and drawing sidebar,
  and plain or segmented interval buttons. Three presets: `studio` (the
  default), `terminal` and `capsule`; a theme of yours lays over one.
  `resolveWidgetUI`, `widgetUIVariables`, `applyWidgetUI` and
  `WIDGET_UI_PRESETS` are exported with their types.
- The stylesheet reads the look's CSS variables everywhere (new:
  `--tcw-control-radius`, `--tcw-menu-radius`, `--tcw-dialog-radius`,
  `--tcw-toolbar-h`, `--tcw-control-h`, `--tcw-font`, `--tcw-font-size`,
  `--tcw-weight`, `--tcw-sep-w`, `--tcw-menu-shadow`, … ), with Studio's
  values as its defaults; the existing variables stay. Without `ui` they
  are left to the stylesheet, so host CSS can still set them.
- The chart's tags take a shape: `Theme.shape.tagRadius`,
  `ChartOptions.shapes`, `chart.setShapes` / `getShapes`, and `fillTag` in
  core. Price tags, axis pills, the crosshair's pills, order, position and
  bracket tags and period-level tags are square, rounded or pills. A shape
  in `chartOptions.shapes` stays until `setUI` is called.
- `ChartWidgetGrid.getUI`. Panels sit below the toolbar and beside the
  drawing tools as the look sizes them; on phones the look keeps 40 px tap
  targets.
- The widget's stylesheet now goes first in `<head>`, so the page's own CSS
  wins a tie of specificity.
- Dropdowns grow to fit their labels instead of wrapping them.

**The default look changes.** Studio is the new default, so an existing
widget looks different without any change of yours: corners 5/7/11/16 px
(were 4/6/10/14), a 46 px toolbar and 48 px drawing tools (were 44 and 40),
30 px controls (were 32), interval buttons in a segmented track, no rules
between toolbar groups, small labels as written (were capitals), dialog tabs
as chips, the replay bar, toasts and badges rounded rather than pills, and
price tags on the chart rounded 4 px. `ui: 'terminal'` is the closest to a
square, ruled look; any token can be set with `setUI` or in CSS.
