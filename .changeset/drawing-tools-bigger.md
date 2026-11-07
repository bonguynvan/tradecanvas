---
'@tradecanvas/chart': minor
---

The drawing tools are a size bigger. Their buttons and icons are a half step of φ over the widget's other buttons: in the Print look a 33 px button with a 20 px icon, in a 53 px column (it was 26 and 16 in 42). The dock's rail matches the column. Where the column is too short for every tool, the buttons shrink back, down to the other buttons' size, before it scrolls. A tool group's menu opens at the column's edge, with no gap a slow pointer could fall into on its way. `density: 'compact'` keeps them at the other buttons' size. The cursor's icon is no longer drawn two pixels smaller than the others.
