---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
"@tradecanvas/mcp": minor
---

Every built-in indicator says what each input takes. An input's new `kind` (`'int'`, `'number'`, `'boolean'`, `'choice'`, `'source'`, `'color'`, `'text'`), with its `min`, `max` and `step`, decides its field in ChartWidget's indicator settings: a period can no longer be set below the lowest value the indicator uses, Parabolic SAR's step moves by 0.01 instead of 0.1, and a whole number is rounded as it is typed, so the field shows the value the indicator computes with. `describeInputs(descriptor)` lists an indicator's inputs as the settings dialog reads them; the generated docs, the `BuiltInIndicators` notes and the MCP catalog read the same list, and the catalog adds each indicator's group. Supertrend no longer throws with a period of 1.
