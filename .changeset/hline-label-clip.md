---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A horizontal line's and a horizontal ray's price label is drawn in full again. It took its alignment from whatever text the chart drew before it, so after a redraw without a pane indicator, or beside a Gann box or a measure, it was right- or centre-aligned at the plot's left edge and showed only its last character. Each drawing now renders in its own canvas state, starting from a left alignment and the alphabetic baseline, so a drawing plugin you register can no longer change how the next drawing's text sits.
