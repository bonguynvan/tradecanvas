---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
'@tradecanvas/mcp': patch
---

Four drawing tools, 73 in all. `signpost` writes its text on a board atop a post standing on a bar, and `balloon` in a bubble pointing at a bar. `anchoredText` and `anchoredNote` are kept to a place on the screen: they stay put as the chart scrolls, zooms or changes symbol. A tool's `DrawingDescriptor.anchoring: 'screen'` makes its points shares of the plot (`time` across from the left, `price` down from the top, 0 to 1), so a plugin can be kept to the screen too. The widget lists the four in its annotation group, asks for their words as soon as they are drawn, and leaves the Coordinates tab out for the screen ones.
