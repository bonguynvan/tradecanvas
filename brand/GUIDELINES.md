# TradeCanvas — brand guidelines (v2)

**The mark: TC.** The name's initials: a fine open C around a T whose stem is a candle. The C is the canvas, open
to what you build; the T is made of the market. (v1, the Slash, leaned a candle inside `</>`; v2 replaces it.)

## Files

| File | Use |
|---|---|
| `horizontal.svg` / `-reversed` / `-black` | The master: symbol + wordmark. Light, dark and one-colour backgrounds. |
| `horizontal-mono.svg` / `-reversed` | Developer channels: README, npm, terminal, docs headers. |
| `stacked.svg` / `-reversed` | Square spaces: social cards, slides, stickers. |
| `symbol.svg` / `-reversed` / `-black` | The symbol alone, from 32 px up. |
| `symbol-small.svg` / `-reversed` | 16–32 px: heavier ring, bar and wick, wider body. Favicons, tabs, small UI. |
| `wordmark.svg` | The name alone, where the symbol already shows nearby. |
| `app-icon.svg`, `maskable.svg` | Ink tile with the reversed master (its fine lines hold from 48 px). |
| `web/` | `favicon.svg` (its ring and bar turn white on dark tabs), `favicon.ico` and PNG icons on an ink tile. |

All masters are outlined: no live text, no rasters, no filters.

## Construction

- 256 × 256 grid. The C: a ring of radius 84 about the centre, stroke 14, round caps, open 90° on the right
  (from 45° to −45°) (small cut: radius 82, stroke 22).
- The T: a bar 80 × 12 at y 80, fully rounded; its stem a candle hanging from the bar's middle, upright: wick 10
  to y 184, body 36 × 52 from y 112, corner radius 7 (small cut: bar 72 × 20, wick 18, body 52 × 66, radius 10).
  The wick meets the bar, so the two read as one T.
- Wordmark: Hanken Grotesk, **Trade** in Bold (700), Canvas in Medium (500), tracking −3.5/120, kerned by hand
  (Tr, Ca, va, av). Mono wordmark: Fragment Mono Regular, lowercase, tracking −2/104.
- Lockup: the wordmark's cap height is centred on the symbol's middle; the gap is 30/256 of the symbol's height.

## Clear space and minimum size

- **Clear space:** keep a margin of **x** on every side, where x is the width of the candle body at the size used
  (≈ 16 % of the symbol's height). Nothing else enters it.
- **Minimum size:** symbol 16 px (use the small cut up to 32 px); horizontal lockup 20 px tall on screen,
  8 mm in print; stacked lockup 48 px tall.

## Colour

| | HEX | RGB | CMYK (approx.) | Use |
|---|---|---|---|---|
| **Ink** | `#0B1020` | 11 16 32 | 66 50 0 87 | The C, the T's bar, wordmark, dark backgrounds |
| **Amber** | `#E8961E` | 232 150 30 | 0 35 87 9 | The candle. Never for body text on white (contrast 2.4:1) |
| Amber text | `#8A5A10` | 138 90 16 | 0 35 88 46 | Amber-family text on light backgrounds (AA) |
| White | `#FFFFFF` | 255 255 255 | 0 0 0 0 | Reversed C, bar and wordmark |

CMYK values are conversions; proof them before print, and match a Pantone on a physical swatch book (start near
Pantone 1375 C for Amber).

**Approved backgrounds:** white and light greys (master); Ink and other dark solids (reversed); a photo only where
it is calm behind the mark (use the reversed or black version on a scrim).

### The product family (proposed)

Keep the C, the bar and the ink; the candle's colour names the product, so the family reads as one toolkit.

| Product | Accent |
|---|---|
| Chart (the toolkit itself) | Amber `#E8961E` |
| Grid (bo-grid) | Jade `#12B886` |
| Orders | Coral `#F25C54` |
| Flow | Violet `#7C5CFF` |

## Typography

- **Hanken Grotesk** (headings, UI, the wordmark) and **Fragment Mono** (code, figures, developer surfaces).
  Both under the SIL Open Font License, which allows logo use.

## Don't

- Don't close the C, turn its opening, tilt the candle, part it from the bar, or swap it for another shape.
- Don't recolour the C or the bar amber, or the candle ink (except in the one-colour versions).
- Don't set the wordmark in another typeface, or retype it: use the outlined files.
- Don't stretch, outline, add shadows or gradients, or place the master on busy or mid-tone backgrounds.
- Don't use the regular symbol at 32 px or below: use the small cut.

## The name and the mark

The MIT license covers the code. Use the name and the mark to refer to TradeCanvas, not to suggest that something else is it or is endorsed by it.

## Open items

- A trademark search before registering the mark (no clearance has been done).
- Product marks for Grid, Orders and Flow, drawn from the family above.
