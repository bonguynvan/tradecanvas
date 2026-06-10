---
'@tradecanvas/chart': patch
---

feat: copy chart image to clipboard

- New `chart.copyScreenshot()` writes the composited chart PNG to the clipboard
  (gracefully returns false where the async Clipboard image API is
  unavailable). Exposed in the widget as a "Copy Chart Image" command-palette
  action with a toast.
