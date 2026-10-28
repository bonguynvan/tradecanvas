---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Drawing labels moved off the legend keep their place and keep clear of one another. A long position whose tags the legend covered had its Target tag stacked under the entry's, below the entry line and in the stop's zone; the tags now slide right of the legend on their own rows where there is room, and when they must go under it they keep the order of their prices. Two positions' tags under the legend no longer print over each other, nor do two horizontal lines' labels. A horizontal line's label that only had room far under the legend, over 100 px from its line on a phone, is drawn on its line by the price axis instead where nothing covers it there, and a line near the plot's top keeps its label inside the plot. The measure's label goes under the legend where it would cover its rows.
