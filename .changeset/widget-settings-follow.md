---
'@tradecanvas/chart': patch
---

An open Chart Settings dialog shows the settings as they change while it is open, whatever changed them. A setting read back from the chart (`widget.getSettings()` after a change made on `getChart()`) used to leave the dialog showing the old value. The dialog is built again only when something it shows changed, so `widget.setSettings()` with the values it already shows no longer redraws it under the user's pointer.
