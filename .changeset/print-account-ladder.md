---
'@tradecanvas/chart': minor
---

The account panel and the depth ladder in the Print look. The account panel keeps the open and realised P&L in its head on every tab, sets its figures right in the mono type with money in the price step's decimals and the number locale, and shows each row as a card in a narrow widget. The depth ladder is a page of the dock beside the chart (`widget.openPanel('depthLadder')`, the Trade menu, or its rail button; the new switch `dock.depthLadder` takes the button away), with the spread between asks and bids and your working orders marked on their rows; it draws only while open and keeps its buttons through a feed's updates. Fixed: the order ticket and the account panel no longer drop a loss's sign in a locale with other digits (Persian, Arabic).
