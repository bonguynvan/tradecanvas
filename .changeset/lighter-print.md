---
'@tradecanvas/chart': minor
'@tradecanvas/commons': patch
---

The Print look is lighter to look at. Its icons are a size larger (20 px in the toolbar, 26 px in the drawing tools) and drawn in 1.25 px lines at every size (1 px under 14 px), its buttons are 33 px, labels are written as they are instead of in capitals, emphasis is a medium weight instead of semibold, the face is Segoe UI Variable on Windows 11, and menus and dialogs sit on a fainter line with a wider shadow. A new `ui.iconStroke` sets the icons' line width in CSS px (0 draws them as the icon set does, as the other looks still do). Where the drawing tools' column is too short for them all, they now shrink down to the icon size and 2 px a side before it scrolls. Labels written as they are, in any look, are a size up (11 px) from labels in capitals. The chart type's toolbar icon is the size of the other toolbar icons. `iconSvg` marks its SVG with the class `tc-icon`.
