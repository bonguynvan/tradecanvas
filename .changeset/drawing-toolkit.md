---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Drawing toolkit.**

- **Each tool has its own settings.**
  - A tool's descriptor can list settings (`DrawingDescriptor.options`):
    switches, numbers, choices, text and level lists. A drawing keeps its
    values in `DrawingState.options`; saved layouts and pasted drawings keep
    them, cleaned by `sanitizeDrawingOptions` (at most 48 levels, numbers kept
    within their range).
  - Fibonacci retracement and extension: edit, hide or add levels, show
    prices and percentages, labels left or right, reverse, extend left or
    right, background. Fib channel, speed-resistance fan and time zones edit
    their levels too.
  - Trend lines and parallel channels extend left, right or both; a channel
    can hide its middle line.
  - New `chart.getDrawingOptions(id)`, `setDrawingOptions(id, options)`,
    `getDrawingOptionDefs(type)` and `getDrawingToolDescriptor(type)`;
    `addDrawing` takes `options`.
  - Each tool's starting settings: `setDrawingToolDefaults(type, options)` /
    `getDrawingToolDefaults(type)`.
  - `updateDrawing(id, { style, options, anchors })` changes a drawing in one
    undo step. `beginDrawingEdit(id)` / `endDrawingEdit(id, { cancel })`
    gather a dialog's changes into one undo step, or put the drawing back.
  - New events: `drawingUpdate`, `drawingDoubleClick`, `drawingContextMenu`.
- **Long/Short position works out the size.** It takes an account size and
  the risk, as a percent of the account or an amount, and shows the
  quantity, the reward:risk ratio and each line's price, distance and P&L.
  The target handle sits on the target line and sets the ratio.
  A plugin can move handles that are not anchors (`DrawingPlugin.moveHandle`).
- **Alerts on drawings.** `chart.addDrawingAlert(id, { condition, message,
  repeating, label })` fires when the price crosses a trend line, ray,
  extended or horizontal line, or a channel's lines, wherever the line is by
  then, as drawn: straight across bars and, on a log scale, in log price.
  `canAddDrawingAlert(id)` tells which drawings take one now
  (`DrawingPlugin.priceAt(state, time, viewport?)`); a trend line that ends
  before the last bar takes none. The alert goes with its drawing, comes
  back with it on undo, and is kept in saved layouts; alerts left without
  their drawing are dropped.
- **Checked input.** Layouts and templates have every style field checked
  (new `sanitizeDrawingStyle`), group names are capped, and level values and
  money amounts are kept within range.
- **Order and groups.**
  - `moveDrawing(id, 'front' | 'forward' | 'backward' | 'back')`; undo puts a
    deleted drawing back where it was. Ctrl+] / Ctrl+[ move the selected
    drawing a step, with Shift to the top or bottom.
  - `groupDrawings(ids, name?)`, `ungroupDrawings`, `renameDrawingGroup`,
    `setDrawingGroupVisible`, `setDrawingGroupLocked`, `getDrawingGroups`.
    Clicking one drawing of a group selects the group. Ctrl+G groups the
    selection, Ctrl+Shift+G ungroups it.
  - `removeDrawings(ids)`, `setDrawingsVisible(ids, visible)` and
    `setDrawingsLocked(ids, locked)` change several drawings as one undo
    step; `getSelectedDrawingIds()` lists the selection.
  - Hiding and locking are undoable now, and a hidden drawing leaves the
    selection. New drawings and groups never reuse an id from a loaded
    layout.
- **Undo, redo and events.** Undo and redo report drawings that come and go
  (`drawingCreate`, `drawingRemove`) and change (`drawingUpdate`), so
  listeners and alerts follow them. `drawingCreate` always carries `id` and
  `type`. Ctrl+Shift+Z redoes, as the hotkey sheet says; it used to undo.
  Drawing shortcuts no longer fire while a dialog or menu has focus.
- **29 new drawing tools** (69 in all):
  - Notes and marks: Note (a pin with its text), Callout, Flag Mark, Arrow
    Mark (up, down, left, right, with a label) and Icon (star, heart, tick,
    cross, circle, triangles, bolt).
  - Brush and Highlighter, drawn freehand; Path (with an arrow at the end)
    and Polyline, a point per click until a double-click or Enter; Curve and
    Arc through three points.
  - Fib Circles, Fib Spiral, Fib Speed Resistance Arcs, Fib Wedge, Pitchfan
    and Gann Square, each with editable levels.
  - Elliott Impulse, Correction, Triangle, Double Combo and Triple Combo
    waves, with the wave degree's label style (①, (1), 1, i); the Elliott
    Wave tool takes the degree too.
  - Three Drives and Cypher patterns with their ratios; Time Cycles and Sine
    Line.
  - Forecast (green once the price reaches the target, red when its time
    runs out first), Projection (a move carried over from a third point) and
    Bars Pattern (a copy of some bars, as bars, a line or high-low, mirrored
    or flipped).
  - A tool says how it is drawn (`DrawingDescriptor.creation`: 'clicks',
    'freehand' or 'path', with `maxAnchors`); a tool drawn from the bars gets
    them through `DrawingPlugin.setDataGetter`. This also fixes Anchored
    VWAP and Fixed Range Volume Profile, which were never handed the bars
    and drew nothing.
- **Eraser, zoom area and a strong magnet.** `chart.setEraserMode(true)`:
  each click on a drawing removes it, until Escape or a tool is picked.
  `chart.setZoomAreaMode(true)`: the next drag zooms to the bars in its box.
  Both report `toolModeChange`. `setDrawingMagnetMode('off' | 'weak' |
  'strong')`: the strong magnet always snaps to the bar's open, high, low or
  close.
- **ChartWidget.**
  - Double-clicking a drawing (or its settings button in the object tree)
    opens its settings: Style, the tool's own settings, and Coordinates in
    the chart's time zone. Changes show as you make them; Cancel or Escape
    takes them back. "Save as default" keeps a tool's settings for the next
    drawing; templates keep settings as well as style.
  - Right-clicking a drawing opens its menu: settings, add an alert, order,
    group or ungroup, lock, hide, duplicate and delete. It works from the
    keyboard and stays on screen.
  - The object tree lists each group with its drawings under it, and can
    hide, lock, rename or ungroup it.
  - The sidebar has the new tools in their groups (new Brushes, Cycles and
    Elliott Waves groups), an eraser and a zoom button, and a magnet button
    that goes off, weak, strong. On a short screen the sidebar scrolls and
    its menus open beside it.
  - The alerts panel lists alerts on drawings; the hotkey sheet lists the new
    shortcuts. All of it is in the widget's 14 languages.
