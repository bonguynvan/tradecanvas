---
version: alpha
name: TradeCanvas Graphite
description: The default look of the TradeCanvas chart widget, a tool a trader reads all day. Neutral grounds, one accent, two colours that mean direction, and nothing drawn that carries no information.
colors:
  primary: "#e8e9eb"
  dark:
    ground: "#131416"
    surface: "#17181b"
    elevated: "#1f2125"
    border: "#2a2c31"
    border-strong: "#3d4047"
    text: "#e8e9eb"
    text-dim: "#b0b3ba"
    text-muted: "#90939b"
    hover: "#262729"
    picked: "#2a2c32"
    accent: "#f0a940"
    accent-fill: "#e8961e"
    accent-ink: "#0e1013"
    up: "#2fc29a"
    down: "#f2665c"
    buy-fill: "#0a8068"
    sell-fill: "#d4322c"
    fill-ink: "#ffffff"
  light:
    ground: "#ffffff"
    surface: "#f4f5f6"
    elevated: "#ffffff"
    border: "#dfe1e5"
    border-strong: "#c5c8ce"
    text: "#1a1c20"
    text-dim: "#454a53"
    text-muted: "#5f6570"
    hover: "#e7e8ea"
    picked: "#e3e5e9"
    accent: "#8a5a10"
    accent-fill: "#e8961e"
    accent-ink: "#0e1013"
    up: "#00735c"
    down: "#c0262d"
    buy-fill: "#00735c"
    sell-fill: "#c0262d"
    fill-ink: "#ffffff"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.385
  body-strong:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.385
  small:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.333
  small-strong:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.333
  figure:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.333
    fontFeature: '"tnum"'
  title:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.333
  value:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.333
    fontFeature: '"tnum"'
rounded:
  all: 3px
spacing:
  "1": 2px
  "2": 4px
  "3": 6px
  "4": 8px
  "5": 12px
  "6": 20px
  "7": 32px
motion:
  fast:
    duration: 120ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
components:
  toolbar:
    backgroundColor: "{colors.dark.surface}"
    textColor: "{colors.dark.text-dim}"
    height: 40px
  control:
    textColor: "{colors.dark.text-dim}"
    typography: "{typography.body}"
    rounded: "{rounded.all}"
    height: 28px
  control-hover:
    backgroundColor: "{colors.dark.hover}"
    textColor: "{colors.dark.text}"
  control-picked:
    backgroundColor: "{colors.dark.picked}"
    textColor: "{colors.dark.text}"
    typography: "{typography.body-strong}"
  control-small:
    textColor: "{colors.dark.text-dim}"
    typography: "{typography.small}"
    rounded: "{rounded.all}"
    height: 24px
  tool-button:
    textColor: "{colors.dark.text-dim}"
    rounded: "{rounded.all}"
    size: 36px
  field:
    backgroundColor: "{colors.dark.ground}"
    textColor: "{colors.dark.text}"
    typography: "{typography.figure}"
    rounded: "{rounded.all}"
    height: 36px
  button-buy:
    backgroundColor: "{colors.dark.buy-fill}"
    textColor: "{colors.dark.fill-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.all}"
    height: 40px
  button-sell:
    backgroundColor: "{colors.dark.sell-fill}"
    textColor: "{colors.dark.fill-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.all}"
    height: 40px
  button-primary:
    backgroundColor: "{colors.dark.text}"
    textColor: "{colors.dark.ground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.all}"
    height: 28px
  button-neutral:
    backgroundColor: "{colors.dark.picked}"
    textColor: "{colors.dark.text}"
    typography: "{typography.body}"
    rounded: "{rounded.all}"
    height: 40px
  table-head:
    backgroundColor: "{colors.dark.surface}"
    textColor: "{colors.dark.text-muted}"
    typography: "{typography.small}"
    height: 28px
  table-row:
    backgroundColor: "{colors.dark.surface}"
    textColor: "{colors.dark.text}"
    typography: "{typography.figure}"
    height: 28px
  menu:
    backgroundColor: "{colors.dark.elevated}"
    textColor: "{colors.dark.text}"
    rounded: "{rounded.all}"
  tag-accent:
    backgroundColor: "{colors.dark.accent-fill}"
    textColor: "{colors.dark.accent-ink}"
---

# TradeCanvas Graphite

This file says how the widget's default look, Graphite, is drawn, and why. It is the reference
for any change to the widget's UI (`packages/library/src/widget`). The tokens above are the
values in the code: `widgetUI.ts` (sizes, type, corners) and the Graphite blocks of
`WidgetStyles.css` (colours, as `--tcw-*` variables). When one changes, change both. The other
looks (`modern`, `print`, `studio`, `terminal`, `capsule`, `desk`) are kept as they were and are
not described here.

## Overview

A trading chart is read for hours, under stress, by someone deciding about money. The chrome
around it is there to be found without looking and to stay out of the way. So Graphite is quiet:
neutral greys, one size of corner, no gradients, no glows, no decoration. What is loud is what a
trader must not misread: the last price, a profit or a loss, the side of an order, the button
that sends it.

Every mark on the screen has to carry something. A border says "this is a field you type in" or
"this floats over the chart". A weight says "read this first" or "this one is picked". A colour
says "up", "down", "buy", "sell" or "this is yours". If a line, a box, a weight or a colour says
none of these, it is taken out.

## Colors

- `hover` in the tokens above is the hover wash (text at 6 to 7%) as it lands on the surface.
- **Grounds** are three steps of one neutral: the chart's ground, the chrome's surface, and what
  floats (a menu, a dialog). The chart is the darkest in the dark theme and the lightest in the
  light one: it is the page, the chrome is its frame.
- **Text** has three levels and no more: `text` for what is read, `text-dim` for a control at
  rest and a field's name, `text-muted` for a heading of a column and what is off. All three
  pass 4.5:1 on the ground they are used on.
- **Up and down** (`up`, `down`) are the candles' colours and mean direction only: a figure that
  rose or fell, a profit or a loss, a side in a row. They are never used for a state ("on",
  "saved", "error" has its own red only because an error is a loss of the action).
- **Buy and sell fills** (`buy-fill`, `sell-fill`) are deeper than up and down so white type
  reads on them at 4.5:1. They are only on what is pressed to trade. Over the pointer they go
  deeper, never lighter.
- **The accent** is the brand's amber. In Graphite it marks what is the user's own on the chart
  (a selected drawing, an alert, the crosshair's tag) and a link. It does not mark "picked" in
  the chrome: a picked interval, tab or tool is the `picked` ground with `text` on it. It fills no
  button: the button that sends is `primary`, the text's colour, and so are a tick and a slider's thumb.
- A Vietnamese board has five price colours (ceiling, floor, reference, up, down); those come
  from the market's settings, not from this palette.

## Typography

- Two sizes do almost all the work: **13 px** for controls and names, **12 px** for figures in a
  table, a field's name, a segment and the bars under the chart. **15 px** is for a dialog's
  title, the symbol and an order's value. **10 px** is left to a character inside a set shape (the letter in a badge:
  `--tcw-font-size-glyph`), and to nothing a trader reads: the smallest type token is 12 too.
- **Weight 600 means "first" or "picked"**: the last price, a profit, a picked tab or interval,
  the button that sends, a title. Everything else is 400. A heading of a column is not strong:
  its place says what it is.
- Figures are in the system's sans, whose digits are one width (`font-variant-numeric: tabular-nums`), set
  right in a column, so a price can be compared with the one above it.
- Labels are written as sentences: "Time in force", not "TIME IN FORCE" and not "Time In Force".
- The widget loads no font. IBM Plex Sans is used when the page has it; the system's sans
  otherwise.

## The chart

The chart is the page; everything above is its frame. On it:

- **An indicator's value is never a block of colour on the price axis.** It is an outlined tag, its
  figure in its line's colour, deepened where it must be to read at 4.5:1. The last price is filled,
  the countdown under it in its colour. The bid's, the ask's, the high's and the low's tags, and an
  order's and a position's, are outlined with it: the last price is the one block on the axis.
- **A price reads on its own tag.** The ink on a filled tag is the dark or the light one by contrast
  with the fill, never white by habit: dark ink on the candles' green and red in the dark theme.
  Where neither ink reads at 4.5:1 (the light theme's candles), the tag is a shade deeper than its
  candle. A coloured figure on a card is taken toward the text the same way.
- The chart has three sizes of type and no others: the small size (12), and one and two under it
  for a name beside a line and a marker's word. Nothing is under 10 px.
- A market's own conventions are a switch, never the default: the last price takes a day's limit's
  colour only where `lastPrice.limitColors` is set.
- The chart's figures (axes, tags, the legend's prices) are the chrome's small size, 12 px, in
  the same face with digits of one width. A figure on the chart and one beside it are the same size.
- **The crosshair's price says how far it is from the last.** Under the price on the axis, the
  distance in percent, in the same ink at a plainer weight: the question a pointer on a chart asks.
- **A card over the chart is a menu.** A bar's values beside the crosshair, and a bar pinned: the
  raised ground, the one corner, the one shadow, nothing seen through, all of it in the small size.
  The change is a figure in its colour, with no pill behind it and no tick of colour at the card's head.
- The grid is the quietest thing drawn.

## Layout

- Heights come from one list: **20, 24, 28, 36, 40 px**. A small control is 24, a control and a
  row of a table 28, a field and a side of the ticket 36, the toolbar and the button that sends
  40. A new part takes one of these. Two parts are off the list for now and stay as they
  are until they are reworked: the account panel's head (32) and the tools' rail (42 wide).
- Space is on the list above (2 to 32 px). Related things are 4 to 8 apart, groups 12 to 20.
- **Groups are told by room first, a rule second.** The toolbar has a rule only between its
  groups. Rows of a form have none. A table has one hairline under each row, as figures are read
  across.
- A control is at least 20 px each way under a pointer and 32 px under a finger, whatever it
  looks like.
- The chart keeps the most room. A panel that opens takes a fixed height, so the chart does not
  jump as rows come and go.

## Elevation & Depth

Flat. Depth is said by ground, not by shadow: the chart, the chrome over it, then what floats.
Only what floats over other content (a menu, a dialog, a tooltip, a toast) has a shadow, and all
of them have the same one: a 1 px edge in `border-strong` and one soft drop. Nothing in the
chrome itself casts a shadow, and nothing glows.

## Shapes

One corner: **3 px**, on every control, field, menu, dialog and tag. In the chrome's controls there are no pills,
and no circles but a radio button and a status dot (a scrollbar's thumb and a slider's track
are round, as the system's are). A filled button and the field next to it have the same corner, so
they line up.

## Motion & Micro-interaction

A ground or a colour changing under the pointer takes **120 ms**, on one curve. What comes
in over the chart (a menu, a dialog) takes 110 to 260 ms and does not move far. Nothing moves to be noticed: no bounce, no pulse on a price, and
no new kind of movement. With `prefers-reduced-motion` everything is immediate. A price that changes
just changes.

## Voice & Content Strategy

- A button that acts on money names what it will do: "Buy 100 HPG", not "Submit" or "OK".
- A label and its figure are two things: the label in `text-muted` with no colon, the figure in
  `text`. "Open P&L +401.31", not "Open P&L: +401.31" in one colour.
- A figure with a direction carries its sign: "+401.31", "-80.00". Nothing is "—" unless there
  is nothing.
- Trading terms stay as the market says them (limit, stop, GTC, P&L). Messages say what happened
  and what to do, in one sentence, with no exclamation mark.
- Every string is a key in the widget's 30 language files.

## Components

- **Filled button** (Buy, Sell, the button that sends, a picked side): its ground is its edge.
  **No border.** White or dark ink at 4.5:1 or more. The button that sends where nothing is traded
  (OK, Go to, Add alert) is `button-primary`: the text's colour, the ground's for its ink. One filled button a view; the other choice
  beside it (Cancel, the side not picked) is `button-neutral`, also with no border.
- **Quiet button** (a toolbar's control, a tool, a row's action): no ground and no border at
  rest, the `hover` ground under the pointer, the `picked` ground when it is on. An outline
  around a button is not used: a button is filled, neutral or quiet.
- **Field** (a number, a text, a select): the one part that keeps a 1 px line at rest, in
  `border-strong`, as the line says "type here". **On focus the line takes the muted text's
  colour; no outline and no glow is added around it.** A field in focus must still be told
  from one at rest: the focused line is 3:1 or more against the line at rest and against the
  field's ground (3.4:1 and 5.2:1 in the dark theme, 3.5:1 and 5.8:1 in the light one). An error turns the line `down` and says why under
  the field.
- **Picked item** (a tab, an interval, a row of a menu, a tool): the `picked` ground and `text`,
  strong. **No bar of the accent on its left or under it**, and no accent fill.
- **Segment** (order type, time in force): quiet choices in one neutral trough, the picked one
  on the `picked` ground. With one choice only it is plain text, not a control.
- **Table** (positions, orders, history): rows and heads 28 px, heads in `text-muted` at 12/400,
  figures right, the row's actions straight after its last figure. A count beside a tab is a
  plain number, not a pill.
- **Menu, dialog, tooltip**: the `elevated` ground, the one corner, the one shadow.
- **Keyboard focus** on anything but a field is a 2 px ring in the text's colour (`--tcw-ring`),
  shown for the keyboard only (`:focus-visible`). In forced colours every focus is a system
  outline.

## Do's and Don'ts

Do:

- Use a token (`--tcw-*`) for every colour, size, corner and duration. A value that is on no
  list is a mistake or a new token to argue for.
- Measure in a browser before saying it is done: sizes, weights and contrast of what changed, in
  both themes, at a phone's, a laptop's and a wide width.
- Take something out before adding something. Ask of each line, box, weight and colour what it
  tells the trader.
- Keep a state where it was: a picked thing does not change size, and the chart does not move
  when a panel's content changes.

Don't:

- **Don't put a border on a filled button**, or an outline around a button to make it "a
  button".
- **Don't add an outline or a glow to a field on focus.** Its own line changes colour.
- **Don't mark a picked or active item with a coloured bar on its left** (or under it), or with
  the accent's fill.
- Don't use a gradient, a glow, a coloured shadow, glass or a blur behind the chrome.
- Don't use a pill or a badge for a number or a state that plain text says: a count, "1 order",
  a single choice.
- Don't make a heading uppercase with wide tracking, and don't set several weights and sizes in
  one row to make it look designed.
- Don't use the accent, or up and down, as decoration. Amber is "yours", green and red are
  direction.
- Don't put a card inside a card, a box around a group that room already separates, or a dashed
  rule where a solid one or none will do.
- Don't use an emoji or a symbol character as an icon; icons come from the icon set, 16 px in a
  control.
- Don't centre a form or a table's figures, and don't mix alignments in one column.
- Don't animate a price, a row or a panel to draw the eye.
- Don't write a label with a colon before its figure in the same colour, or a button that says
  "Submit".
