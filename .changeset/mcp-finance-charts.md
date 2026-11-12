---
'@tradecanvas/mcp': minor
'@tradecanvas/commons': minor
---

The MCP server knows the finance charts: `list_finance_charts` names the fourteen classes with what each is for, and `list_options` and `validate_options` take a class name (`BarChart`, `DepthChart`, `PerformanceDashboard`…) as `target`, checking option names, the values of choices and the data a chart needs. `width` and `height` are removed from the finance charts' options: they were never read, and a finance chart fills its element.
