---
'@tradecanvas/chart': minor
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
---

An indicator's `category` takes a group of your own, `{ id, label }`, besides the built-in kinds. The widget's Indicators dialog lists the indicators with that id together under the label, in a tab of their own before the kinds and first in All, and a search for the label finds them. Favourites and templates keep them as before. `indicatorGroup(descriptor)` returns the group, or null; `indicatorCategory` gives such an indicator the built-in's kind, else `'other'`.

`IndicatorDescriptor['category']` is now `IndicatorCategory | IndicatorGroup`: code that read it as a kind reads `indicatorCategory(descriptor)` instead. A `category` that is no kind and no group (from code without types) now lists the indicator under Other, where it was listed nowhere.
