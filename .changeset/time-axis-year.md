---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The time axis says which year is on view when no new year is labelled there: panned back into history, it read "Mar … Apr" with no year until a January came on view. A tag at the left end, in the style of the timezone tag at the right, writes what the labels leave out, as of the first bar on view: the year among months, the month and year among days, the whole date among the times of one day. Over a label at the left end it stands in for it and says what it said ("Mar 2023" over "Mar"). It is left out where a year is labelled, and when the labels come from your own `timeFormatter`.
