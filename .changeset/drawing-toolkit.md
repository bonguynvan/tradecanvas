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
  then. `canAddDrawingAlert(id)` tells which drawings take one
  (`DrawingPlugin.priceAt`). The alert goes with its drawing and is kept in
  saved layouts.
- **Order and groups.**
  - `moveDrawing(id, 'front' | 'forward' | 'backward' | 'back')`; undo puts a
    deleted drawing back where it was. Ctrl+] / Ctrl+[ move the selected
    drawing a step, with Shift to the top or bottom.
  - `groupDrawings(ids, name?)`, `ungroupDrawings`, `renameDrawingGroup`,
    `setDrawingGroupVisible`, `setDrawingGroupLocked`, `getDrawingGroups`.
    Clicking one drawing of a group selects the group. Ctrl+G groups the
    selection, Ctrl+Shift+G ungroups it.
  - `removeDrawings(ids)` removes several drawings as one undo step;
    `getSelectedDrawingIds()` lists the selection.
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
  - The alerts panel lists alerts on drawings; the hotkey sheet lists the new
    shortcuts. All of it is in the widget's 14 languages.
