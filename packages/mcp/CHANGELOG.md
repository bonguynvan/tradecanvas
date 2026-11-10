# @tradecanvas/mcp

## 1.76.0

### Patch Changes

- @tradecanvas/commons@1.76.0

## 1.75.0

### Patch Changes

- Updated dependencies [db3cedc]
  - @tradecanvas/commons@1.75.0

## 1.74.0

### Patch Changes

- Updated dependencies [6e60085]
  - @tradecanvas/commons@1.74.0

## 1.73.2

### Patch Changes

- @tradecanvas/commons@1.73.2

## 1.73.1

### Patch Changes

- @tradecanvas/commons@1.73.1

## 1.73.0

### Patch Changes

- @tradecanvas/commons@1.73.0

## 1.72.2

### Patch Changes

- @tradecanvas/commons@1.72.2

## 1.72.1

### Patch Changes

- @tradecanvas/commons@1.72.1

## 1.72.0

### Patch Changes

- Updated dependencies [5c5d273]
  - @tradecanvas/commons@1.72.0

## 1.71.0

### Minor Changes

- 0c85f24: Every built-in indicator says what each input takes. An input's new `kind` (`'int'`, `'number'`, `'boolean'`, `'choice'`, `'source'`, `'color'`, `'text'`), with its `min`, `max` and `step`, decides its field in ChartWidget's indicator settings: a period can no longer be set below the lowest value the indicator uses, Parabolic SAR's step moves by 0.01 instead of 0.1, and a whole number is rounded as it is typed, so the field shows the value the indicator computes with. `describeInputs(descriptor)` lists an indicator's inputs as the settings dialog reads them; the generated docs, the `BuiltInIndicators` notes and the MCP catalog read the same list, and the catalog adds each indicator's group. Supertrend no longer throws with a period of 1.

### Patch Changes

- Updated dependencies [0c85f24]
  - @tradecanvas/commons@1.71.0

## 1.70.0

### Patch Changes

- @tradecanvas/commons@1.70.0

## 1.69.0

### Patch Changes

- Updated dependencies [c2ed723]
  - @tradecanvas/commons@1.69.0

## 1.68.1

### Patch Changes

- @tradecanvas/commons@1.68.1

## 1.68.0

### Patch Changes

- @tradecanvas/commons@1.68.0

## 1.67.0

### Patch Changes

- Updated dependencies [ecd7b39]
  - @tradecanvas/commons@1.67.0

## 1.66.0

### Patch Changes

- cef38f3: Four drawing tools, 73 in all. `signpost` writes its text on a board atop a post standing on a bar, and `balloon` in a bubble pointing at a bar. `anchoredText` and `anchoredNote` are kept to a place on the screen: they stay put as the chart scrolls, zooms or changes symbol. A tool's `DrawingDescriptor.anchoring: 'screen'` makes its points shares of the plot (`time` across from the left, `price` down from the top, 0 to 1), so a plugin can be kept to the screen too. The widget lists the four in its annotation group, asks for their words as soon as they are drawn, and leaves the Coordinates tab out for the screen ones.
- Updated dependencies [cef38f3]
  - @tradecanvas/commons@1.66.0

## 1.65.0

### Patch Changes

- Updated dependencies [7131683]
  - @tradecanvas/commons@1.65.0

## 1.64.0

### Patch Changes

- Updated dependencies [f62b54f]
  - @tradecanvas/commons@1.64.0

## 1.63.0

### Patch Changes

- @tradecanvas/commons@1.63.0

## 1.62.0

### Patch Changes

- Updated dependencies [8c55a7b]
  - @tradecanvas/commons@1.62.0

## 1.61.0

### Minor Changes

- e180585: The widget's trash button opens a menu: remove the drawings, the indicators, or both, each with how many there are, in one undo step. `chart.removeAll(what)` does the same from code (`'drawings'`, `'indicators'` or `'all'`) and returns how many of each went; locked drawings stay. The trash button used to remove every drawing, locked ones too, with no way back.

  A drawing tool of your own now types: `DrawingToolType` takes the name a plugin registered (`setDrawingTool('targetLine')`, `addDrawing({ type: 'targetLine', … })`) and still completes the built-in ones, which `BuiltInDrawingToolType` lists. A misspelt built-in name now compiles too; type a value as `BuiltInDrawingToolType` where you want that caught. `UndoRedoManager.group(fn)` keeps every step `fn` records as one. The MCP server still lists the built-in tools for `drawingFavorites`, and `validate_options` notes a name that looks like a mistyped built-in one instead of rejecting a plugin's.

### Patch Changes

- Updated dependencies [e180585]
- Updated dependencies [45e18a3]
  - @tradecanvas/commons@1.61.0

## 1.60.0

### Minor Changes

- db2340e: `ReconnectManager` and `ReplayController` are exported from `@tradecanvas/chart`, as the realtime page imports them. Ten chart events carry typed payloads (`executionFill`, `ordersChange`, `positionsChange`, `positionReverse`, `chartContextMenu`, `priceAxisAdd`, `drawingUpdate`, `drawingDoubleClick`, `drawingContextMenu`, `toolModeChange`), so `e.payload` is no longer `unknown` in TypeScript; a cast of one to a shape it does not have no longer compiles. The MCP server's `list_options` finds options one level in by their path (`chartOptions.numberLocale`, `features.priceAxisAddButton`), and `validate_options` checks a `numberLocale` is a tag numbers can be written in.

### Patch Changes

- Updated dependencies [db2340e]
  - @tradecanvas/commons@1.60.0

## 1.59.3

### Patch Changes

- @tradecanvas/commons@1.59.3

## 1.59.2

### Patch Changes

- Updated dependencies [f408fa6]
  - @tradecanvas/commons@1.59.2

## 1.59.1

### Patch Changes

- @tradecanvas/commons@1.59.1

## 1.59.0

### Patch Changes

- @tradecanvas/commons@1.59.0

## 1.58.0

### Patch Changes

- Updated dependencies [c95fdca]
  - @tradecanvas/commons@1.58.0

## 1.57.0

### Patch Changes

- Updated dependencies [aab008d]
  - @tradecanvas/commons@1.57.0

## 1.56.1

### Patch Changes

- @tradecanvas/commons@1.56.1

## 1.56.0

### Patch Changes

- @tradecanvas/commons@1.56.0

## 1.55.0

### Patch Changes

- Updated dependencies [3342605]
  - @tradecanvas/commons@1.55.0

## 1.54.4

### Patch Changes

- @tradecanvas/commons@1.54.4

## 1.54.3

### Patch Changes

- @tradecanvas/commons@1.54.3

## 1.54.2

### Patch Changes

- aeb3220: The package names its server for the official MCP Registry (`mcpName`: `io.github.bonguynvan/tradecanvas`), so it can be listed there and in the directories that read it.
  - @tradecanvas/commons@1.54.2

## 1.54.1

### Patch Changes

- Updated dependencies [656f663]
  - @tradecanvas/commons@1.54.1

## 1.54.0

### Patch Changes

- Updated dependencies [2f662ea]
- Updated dependencies [4363ad6]
- Updated dependencies [b355fb9]
- Updated dependencies [4363ad6]
- Updated dependencies [243d105]
- Updated dependencies [4c475f7]
- Updated dependencies [58aa1c8]
  - @tradecanvas/commons@1.54.0

## 1.53.1

### Patch Changes

- @tradecanvas/commons@1.53.1

## 1.53.0

### Patch Changes

- Updated dependencies [5d0aa7c]
- Updated dependencies [0d4c66b]
- Updated dependencies [4e44074]
- Updated dependencies [9c18140]
  - @tradecanvas/commons@1.53.0

## 1.52.0

### Patch Changes

- Updated dependencies [eb38de1]
- Updated dependencies [84a263b]
- Updated dependencies [41bbc39]
- Updated dependencies [d9920d2]
- Updated dependencies [26f9fc2]
- Updated dependencies [f7ac032]
  - @tradecanvas/commons@1.52.0

## 1.51.0

### Patch Changes

- Updated dependencies [9193d11]
- Updated dependencies [d4ca85b]
  - @tradecanvas/commons@1.51.0

## 1.50.0

### Patch Changes

- Updated dependencies [0c72b8d]
  - @tradecanvas/commons@1.50.0

## 1.49.1

### Patch Changes

- Updated dependencies [9764d44]
  - @tradecanvas/commons@1.49.1

## 1.49.0

### Patch Changes

- Updated dependencies [b890f07]
  - @tradecanvas/commons@1.49.0

## 1.48.0

### Patch Changes

- @tradecanvas/commons@1.48.0

## 1.47.0

### Patch Changes

- Updated dependencies [5f9b252]
  - @tradecanvas/commons@1.47.0

## 1.46.0

### Patch Changes

- @tradecanvas/commons@1.46.0

## 1.45.0

### Patch Changes

- @tradecanvas/commons@1.45.0

## 1.44.0

### Patch Changes

- @tradecanvas/commons@1.44.0

## 1.43.0

### Patch Changes

- @tradecanvas/commons@1.43.0

## 1.42.0

### Patch Changes

- Updated dependencies [b1b49f5]
  - @tradecanvas/commons@1.42.0

## 1.41.0

### Patch Changes

- @tradecanvas/commons@1.41.0

## 1.40.0

### Patch Changes

- Updated dependencies [ce7bc71]
  - @tradecanvas/commons@1.40.0

## 1.39.0

### Patch Changes

- @tradecanvas/commons@1.39.0

## 1.38.0

### Patch Changes

- Updated dependencies [126328a]
  - @tradecanvas/commons@1.38.0

## 1.37.0

### Patch Changes

- @tradecanvas/commons@1.37.0

## 1.36.0

### Patch Changes

- @tradecanvas/commons@1.36.0

## 1.35.0

### Patch Changes

- @tradecanvas/commons@1.35.0

## 1.34.0

### Patch Changes

- Updated dependencies [9a3f221]
  - @tradecanvas/commons@1.34.0

## 1.33.0

### Patch Changes

- Updated dependencies [08724a2]
  - @tradecanvas/commons@1.33.0

## 1.32.0

### Minor Changes

- 009755e: A new package: `@tradecanvas/mcp`, an MCP server for coding agents. `npx -y @tradecanvas/mcp` starts it; seven read-only tools look up the indicators (params and line keys), the drawing tools, the options of ChartWidget, Chart and ChartWidgetGrid, the feature switches and the style keys, from a catalog generated from the library's code. `validate_options` checks an options object and names the option likely meant.

### Patch Changes

- @tradecanvas/commons@1.32.0
