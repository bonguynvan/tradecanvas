---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
'@tradecanvas/analytics': patch
---

feat: mobile / touch pass

- **Long-press tooltip pin** — press-and-hold (~500 ms with < 8px movement) on
  the chart pins an OHLC tooltip at the bar under your finger, the mobile
  equivalent of Alt+click on desktop. Cancelled by movement, by a second
  finger landing, or by `Esc`.
- **Touch axis-drag scaling** — single-finger drag inside the price-axis
  strip (right) or time-axis strip (bottom) scales that axis exactly like
  the desktop mouse-drag gesture. No more "I can only zoom with pinch."
- **Bottom-sheet modals** — under 640 px viewports, settings / hotkey sheet /
  command palette / symbol search slide up from the bottom with a grab handle
  and `env(safe-area-inset-bottom)` padding for the iPhone home indicator.
  Hotkey sheet collapses to a single column. Sheet width is full-viewport,
  border-radius only on the top corners.
- **Bigger touch targets** under 768 px — toolbar height 40→44 px, buttons
  pad up to 40 px square. Apple HIG-compliant.
- **Hotkey sheet** now documents the touch gestures alongside keyboard
  shortcuts.
