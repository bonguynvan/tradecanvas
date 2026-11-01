---
'@tradecanvas/chart': minor
---

ChartWidget's chart draws its figures (axes, price tags, the crosshair's pills, the legend) in the look's figures face. In the default Print look that is now a sans face whose digits are one width (Segoe UI on Windows, Helvetica Neue on Apple systems, Roboto on Android) instead of a monospaced one, so prices still line up. The other looks' axes move from the theme's Cascadia Mono to the face their legend already used: JetBrains Mono's list in Studio and Capsule, IBM Plex Mono's in Terminal. A new look, `'desk'`, is a desktop trading platform's window: Tahoma at 12px for the labels and the figures, square corners and tags, tighter bars. `chartOptions.font.family` still wins over the look's face: `chartOptions: { font: { family: DEFAULT_FONT_FAMILY } }` brings the monospaced figures back. The plain `Chart` keeps its monospaced default.
