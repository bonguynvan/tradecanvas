---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The measure tool's label and the time axis's first label stay whole at the plot's left edge. A measure drawn by the edge, which is where it often starts on a phone, had its label centred on its middle and cut there ("511.53 (+0.53%)" for "Price: +511.53 (+0.53%)"); it now moves onto the plot, and keeps inside its right edge, top and bottom too. A time label of a bar by the left edge started left of the plot and lost its first characters; it now starts at the edge, and a bar off the plot gets no label.
