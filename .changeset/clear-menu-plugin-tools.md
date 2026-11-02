---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
'@tradecanvas/mcp': minor
---

The widget's trash button opens a menu: remove the drawings, the indicators, or both, each with how many there are, in one undo step. `chart.removeAll(what)` does the same from code (`'drawings'`, `'indicators'` or `'all'`) and returns how many of each went; locked drawings stay. The trash button used to remove every drawing, locked ones too, with no way back.

A drawing tool of your own now types: `DrawingToolType` takes the name a plugin registered (`setDrawingTool('targetLine')`, `addDrawing({ type: 'targetLine', … })`) and still completes the built-in ones, which `BuiltInDrawingToolType` lists. A misspelt built-in name now compiles too; type a value as `BuiltInDrawingToolType` where you want that caught. `UndoRedoManager.group(fn)` keeps every step `fn` records as one. The MCP server still lists the built-in tools for `drawingFavorites`, and `validate_options` notes a name that looks like a mistyped built-in one instead of rejecting a plugin's.
