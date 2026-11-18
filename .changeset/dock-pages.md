---
'@tradecanvas/chart': minor
---

A page of your own in the widget's dock: `widget.addDockPage({ id, label, icon, element, onShow, onHide })` puts its button on the rail after the built-in panels, and your element under the dock's header (its label and a close button). `openPanel(id)` opens it, `getOpenPanel()` reports it, and the handle's `remove()` takes it away, shutting it first if it is open. `icon` is a built-in icon's name or an element of yours. An id a built-in panel or another page has gives `null`. The new `onPanelChange` option is told the open panel's id, or `null`, however it changed, so an app no longer polls `getOpenPanel()`. `openPanel` and `getOpenPanel` now take and give `DockPanelId` (a built-in panel or a page's id) in place of `WidgetPanel`: code that keeps `getOpenPanel()` in a `WidgetPanel` variable, or switches over every `WidgetPanel`, widens its type to `DockPanelId`.
