---
'@tradecanvas/chart': major
'@tradecanvas/core': major
'@tradecanvas/commons': major
'@tradecanvas/react': minor
'@tradecanvas/vue': minor
'@tradecanvas/svelte': minor
---

The chart and the widget open with more room, on even pixels, and sharp at 125% and 150%. This changes how they look by default; one option gives the look of 1.x back.

**To keep the look of 1.x**: `new ChartWidget(host, { ui: { density: 'classic' } })` (or `widget.setUI({ density: 'classic' })`) is the widget as it was (at 100% the same pixels, but for the price axis's tick marks, which are sharper). For a `Chart` of your own, `new Chart(host, { density: 'compact' })`. `ui: { density: 'compact' }`, the smaller controls with classic bars, is unchanged.

What is new by default:

- **A chart leaves more room around its bars.** `density: 'comfortable'` is the default of `Chart`: golden bars (`barLayout: 'golden'`, the body 62% of its slot, which only the widget opened with before), 8 slots past the newest bar instead of 5, φ⁻⁴·⁵ (11.5%) of the height free above and below the prices instead of φ⁻⁵ (9%), a gap of φ⁻⁶ (5.6%) between the candles and the volume band instead of φ⁻⁷ (3.4%), and the legend 12 px in from the plot's corner instead of 8. `chart.setDensity()` / `getDensity()` change and read it; `CHART_SPACING` holds the numbers. `barLayout` and `rightMargin` still win when you set them.
- **The widget's sizes and spacing are even numbers of pixels**, so an icon sits a whole number of pixels from its button's edge and never on half of one. Print's button and menu row are 34 px (from 33); the drawing tools' column is 40 in Terminal, 48 in Capsule and 38 in Desk (from 39, 47 and 37); spacious sizes are even too. Spacing (`--tcw-space-1` to `-7`) is 2, 4, 6, 8, 12, 20, 32 (from 2, 3, 5, 8, 13, 21, 34), and on a wide screen each grown size goes to the even number nearest. A line of body text is 18 px at 13 px.
- **Controls have a step more padding**: 12 px beside a toolbar button's label, a menu row's text and the toolbar's first button, from 8. New tokens to set them: `--tcw-control-pad`, `--tcw-bar-pad`, `--tcw-menu-row-pad`; also `--tcw-line-height`, `--tcw-line-xs`, `--tcw-legend-line`, `--tcw-legend-line-pane` and `--tcw-text-w`.
- **Hairlines are sharp at 125% and 150%.** The chart's canvases take the browser's own count of device pixels, so they are no longer stretched or shifted by a fraction of a pixel, and the grid, the axes' lines and ticks, the last price's line, order, alert, limit and level lines, a pane's divider and the edges of price tags land on whole device pixels. A 1 px line is one device pixel wide at 125% and at 150%, as a 1 px border is; the crosshair was two at 150%.
- The React, Vue and Svelte components no longer set `rightMargin: 5` themselves: the room past the newest bar is the chart's (8 slots, or 5 with `options={{ density: 'compact' }}`).

For a look of your own: `evenPx(n)` from `@tradecanvas/commons` rounds a size to the even number nearest. `PRICE_SCALE_MARGIN` from `@tradecanvas/core` is now φ⁻⁴·⁵, the default density's margin.
