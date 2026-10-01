---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Drag/pan audit — the chart no longer feels stuck while dragging — plus free
panning into the future, context cursors, Ctrl/⌘-drag multi-selection and a
lighter two-canvas renderer.

**Why dragging felt stuck (fixed):**
- **Pressing on a drawing swallowed the drag.** The first press on an
  unselected drawing only selected it — the chart neither panned nor moved
  the drawing until a second drag. Now the press that selects a drawing also
  grabs it; a locked drawing is selected and the press pans the chart.
  Clicks that only select (or wobble a pixel or two) no longer move the
  drawing or add an undo step.
- **A sloppy horizontal drag switched auto-scale off.** 6 px of net vertical
  drift was enough, after which the price scale stopped following the bars
  and wobbled with the hand. Vertical panning now needs a deliberate move
  (more than 24 px, and at least half the horizontal travel); with auto-scale
  already off the price scale still pans freely.
- **Leaving the chart ended the drag.** Moving past the edge (a fast flick,
  over the toolbar or a side panel) dropped the gesture, and coming back did
  nothing. Drags are now followed on the document until the button is
  released — also for drawings, axis scaling, pane resizing and trading
  lines — and a release outside the window is detected. Price-based drags
  (order / SL / TP lines, alerts, brackets) are pinned to the plot's edge
  instead of taking an off-scale price; page text is no longer selected.
- **Momentum fired after the pointer had stopped.** Release velocity came from
  the last sample alone, so holding still and letting go flung the chart.
  It is now measured over the last 100 ms, ignored if the pointer rested
  before release, capped, and stopped by any new gesture.
- **The newest bar was a wall** — see free panning.
- Right-button presses no longer start a pan under the context menu, and
  presses on HTML controls inside the chart (e.g. the replay scrubber) no
  longer start chart gestures.

**Free panning.** Drag past the newest bar into empty future space, or past
the oldest bar, until `panLimits.minVisibleBars` (3) bars remain. The time
axis and grid continue into the future, the crosshair shows future times, and
drawings can be placed there — magnet included (times beyond the data are
extrapolated: `barTimeStep`, `barIndexToTime`; `timestampToBarIndex` and
`xToTime` no longer clamp to the data). A new bar only scrolls the view when
it rests at the end; zooming at the live edge keeps the newest bar pinned;
`fitContent()` rests at the live edge with the usual right margin. New
`ChartOptions.freePan` (default `true`; `false` restores the old clamp),
`ChartOptions.panLimits`, `chart.setPanLimits()`, `Viewport.zoomToBarRange()`.
`setVisibleRange()` now puts the requested range edge to edge (it used to
only change the bar width around the centre). Trade zones and signal markers
in the forming bar or beyond are no longer culled.

**Cursors.** Crosshair over the chart (default cursor when the crosshair is
hidden), a grabbing hand while panning or moving a drawing, a hand over
drawings, a move cursor over the selected drawing's handles, resize arrows
over axes, pane dividers, alert/order/SL/TP lines.

**Multi-selection.** Ctrl/⌘-drag draws a selection box and selects every
drawing with an anchor inside it; Ctrl/⌘-click adds or removes one. Dragging
any selected drawing moves the whole group, Delete removes it, restyling
applies to all of them — each as a single undo step (new `drawingBatch`
undo action). `DrawingManager.getSelectedDrawingIds()`, `selectInRect()`,
`toggleSelectionAt()`.

**Right-click order menu is now off by default** (`ChartWidget` and `Chart`).
Opt in with `features.tradingContextMenu: true`.

**Two canvases instead of four.** The chart used to stack four full-size
canvases (background, series, overlay, UI); moving the mouse repainted two of
them, including every drawing, order line and axis. It now paints a scene
canvas (grid, series, indicators, panes, chart objects, axes) and a thin top
canvas for what follows the pointer (crosshair and its axis pills, legend,
bar countdown, measure ruler, selection box). A hover repaints only the top
canvas, and the browser composites two surfaces instead of four — less GPU
memory and work, most noticeable on large high-DPI screens. New
`LayerType.Hover` for `requestRender()`; every other `LayerType` repaints the
scene, and `LayerManager.getLayer()` returns the scene canvas for every type
but `Hover`. Overlay plugins behave as before: `main` draws with the series,
`overlay` and `ui` above the crosshair, repainting as the pointer moves. The
measure ruler's box stays inside the plot (its info pill may overhang). Also
fixed: after the page or a scrolling container scrolled, the crosshair
followed the pointer at an offset until the next click.

**Price axis:** the tick label the last-price tag would cover is hidden instead
of showing half-hidden behind it. Anchored VWAP drawings cache their series, so
hovering over the chart no longer recomputes it on every mouse move.
