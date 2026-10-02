---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Layouts that come back whole, ranges and dates, scale options, faster drawing.**

- **Saved layouts restore indicators and alerts.** `saveState` / `loadState`
  (and `downloadState`, `setAutoSave`) now keep every indicator's inputs, pane,
  colours and visibility, and alerts keep their channel, repeat and label —
  alerts on indicator lines follow the indicator to its new id. Indicator
  changes trigger the auto-save. Snapshots are version 2; loading a version-1
  save (or one without an indicator list) leaves the chart's current
  indicators alone. An indicator the chart cannot add — say, from a plugin not
  registered yet — is skipped with a warning and kept in the layout when it is
  saved again; one-shot alerts that already fired stay fired.
- **Several instances of one indicator in ChartWidget**: picking EMA twice
  gives two EMAs, each with its own chip ("EMA 20", "EMA 50"); the chips
  follow indicators added or removed through the chart API too.
- **ChartGrid links the crosshair by time**, so charts on different symbols or
  timeframes show a vertical line on the matching bar, and it clears when the
  pointer leaves. Cells added by `setLayout` are linked too. New
  `chart.setCrosshairTime(time | null)` and a `crosshairLeave` event;
  `setCrosshairPosition(null)` now clears the crosshair.
- **Feature flags that did nothing now apply**: `drawingMagnet`,
  `barCountdown`, `compareSymbols`, `dataExport`, `logScale` and `timeframes`
  (a whitelist for `setTimeframe`; `chart.isTimeframeAllowed`).
  ChartWidget leaves out the controls of switched-off features.
- **Timeframe favourites in ChartWidget**: the toolbar shows pinned timeframes
  (plus the current one); a menu lists them all with a star to pin or unpin,
  remembered across visits. `features.defaultTimeframeFavorites` sets the
  starting set; the menu offers 1m–1M unless `timeframes` narrows it.
- **Ranges and dates**: `chart.setVisibleRangePreset('1D' | '5D' | '1M' | '3M'
  | '6M' | 'YTD' | '1Y' | '5Y' | 'All')` and `chart.goToTime(time)`. ChartWidget
  shows the presets under the chart with a "go to date" button (Alt+G);
  `rangeBar: false` hides them.
- **Inverted price scale**: `chart.setInvertScale(true)`, in the widget's
  settings or Alt+I. Everything on the price pane follows it — candles, lines,
  axis, grid, profiles, drawings, alerts, orders; indicator panes stay upright.
  Indicator panes no longer pick up the log scale either.
- **Log scale fix**: candles, bars, lines, areas, the price axis and grid were
  still drawn on a linear scale with the log scale on, while drawings and
  indicators used the log one. They now share one mapping.
- **Drawing**: stay-in-drawing mode keeps the tool after each drawing
  (`chart.setStayInDrawingMode`, a sidebar toggle in the widget; Esc ends it),
  and Ctrl/⌘+C / Ctrl/⌘+V copy and paste the selected drawings, also into
  another chart on the page (`chart.copyDrawings()` / `chart.pasteDrawings()`).
  New `drawingToolChange` event. With several charts on a page, drawing
  shortcuts (copy/paste, undo/redo, delete) act on the chart used last, and
  never while typing in a text field; undo/redo keeps a picked tool ready.
- **Fullscreen button** in the widget toolbar (`fullscreen: false` hides it).
- **Widget dialogs** (settings, symbol search, command palette, shortcuts) now
  carry the widget's theme — the settings panel had lost its background — and
  open inside the widget while it is fullscreen.
