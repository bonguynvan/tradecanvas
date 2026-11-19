---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The drawing sidebar's magnet, lock and hide buttons each have a menu, opened from their corner, a right click or an arrow key:
- **Hide:** the drawings, the indicators, the positions and orders, or all. What is hidden is ticked.
- **Lock:** the drawings, the positions and orders, or all.
- **Magnet:** weak or strong. The magnet button now turns the magnet on at the strength last chosen, and off; before, it cycled through off, weak and strong.

What a menu picks is what its button does from then on, and the button is named after it. Hiding the indicators hides the ones that showed, and showing them brings back those only.

New on `Chart`:
- `setTradingVisible(visible)` / `isTradingVisible()`: hides the positions, orders and fills. None is drawn or can be pressed, and they still follow the execution adapter.
- `setTradingLocked(locked)` / `isTradingLocked()`: no line or tag of theirs can be dragged. Their buttons still act.
- `setIndicatorsVisible(ids, visible)`: one undo step for several indicators.
