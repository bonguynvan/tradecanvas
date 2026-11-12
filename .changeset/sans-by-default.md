---
'@tradecanvas/commons': major
'@tradecanvas/core': major
'@tradecanvas/chart': major
---

The dark and the light theme set the chart's text in `FIGURES_FONT_FAMILY`, a new constant (Segoe UI, Roboto, Helvetica Neue, Arial: sans faces whose digits are one width), where they named a monospaced one: a `Chart` of your own draws its axes, tags, crosshair pills and legend as the widget and the finance charts do. `font: { family: MONO_FONT_FAMILY }` keeps the monospaced figures. `DEFAULT_FONT_FAMILY` is renamed `MONO_FONT_FAMILY`, since the face it names is no longer the default. The finance charts take the same face, in place of `SANS_FONT_FAMILY`. The widget, which sets its chart's face from its look, is unchanged.
