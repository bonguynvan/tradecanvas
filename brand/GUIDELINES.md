# TradeCanvas — brand guidelines (v1)

**The mark: Slash.** The slash of `</>` is a candle, leaning as code does: the sign of code, made of the market.
Developers read code, traders read a candle — both in one sign.

## Files

| File | Use |
|---|---|
| `horizontal.svg` / `-reversed` / `-black` | The master: symbol + wordmark. Light, dark and one-colour backgrounds. |
| `horizontal-mono.svg` / `-reversed` | Developer channels: README, npm, terminal, docs headers. |
| `stacked.svg` / `-reversed` | Square spaces: social cards, slides, stickers. |
| `symbol.svg` / `-reversed` / `-black` | The symbol alone, from 32 px up. |
| `symbol-small.svg` / `-reversed` | 16–24 px: heavier brackets, wider candle. Favicons, tabs, small UI. |
| `wordmark.svg` | The name alone, where the symbol already shows nearby. |
| `app-icon.svg`, `maskable.svg` | Ink tile with the reversed small cut. |
| `web/` | `favicon.svg` (its brackets turn white on dark tabs), `favicon.ico` and PNG icons on an ink tile. |

All masters are outlined: no live text, no rasters, no filters.

## Construction

- 256 × 256 grid. Angle brackets at exactly 45°, stroke 24, round caps and joins (small cut: 32).
- The candle: body 40 × 104, corner radius 9, wick 12, rotated 15° about the centre (small cut: body 52, wick 18).
- Wordmark: Hanken Grotesk, **Trade** in Bold (700), Canvas in Medium (500), tracking −3.5/120, kerned by hand
  (Tr, Ca, va, av). Mono wordmark: Fragment Mono Regular, lowercase, tracking −2/104.
- Lockup: the wordmark's cap height is centred on the symbol's middle; the gap is 30/256 of the symbol's height.

## Clear space and minimum size

- **Clear space:** keep a margin of **x** on every side, where x is the width of the candle body at the size used
  (≈ 16 % of the symbol's height). Nothing else enters it.
- **Minimum size:** symbol 16 px (use the small cut up to 24 px); horizontal lockup 20 px tall on screen,
  8 mm in print; stacked lockup 48 px tall.

## Colour

| | HEX | RGB | CMYK (approx.) | Use |
|---|---|---|---|---|
| **Ink** | `#0B1020` | 11 16 32 | 66 50 0 87 | Brackets, wordmark, dark backgrounds |
| **Amber** | `#F2A93B` | 242 169 59 | 0 30 76 5 | The candle. Never for body text on white (contrast 2.0:1) |
| Amber text | `#8A5A10` | 138 90 16 | 0 35 88 46 | Amber-family text on light backgrounds (AA) |
| White | `#FFFFFF` | 255 255 255 | 0 0 0 0 | Reversed brackets and wordmark |

CMYK values are conversions; proof them before print, and match a Pantone on a physical swatch book (start near
Pantone 1365 C for Amber).

**Approved backgrounds:** white and light greys (master); Ink and other dark solids (reversed); a photo only where
it is calm behind the mark (use the reversed or black version on a scrim).

### The product family (proposed)

Keep the brackets and the ink; the candle's colour names the product, so the family reads as one toolkit.

| Product | Accent |
|---|---|
| Chart (the toolkit itself) | Amber `#F2A93B` |
| Grid (bo-grid) | Jade `#12B886` |
| Orders | Coral `#F25C54` |
| Flow | Violet `#7C5CFF` |

## Typography

- **Hanken Grotesk** (headings, UI, the wordmark) and **Fragment Mono** (code, figures, developer surfaces).
  Both under the SIL Open Font License, which allows logo use.

## Don't

- Don't straighten the candle, change its angle, or swap it for another shape in the master mark.
- Don't recolour the brackets amber or the candle ink (except in the one-colour versions).
- Don't set the wordmark in another typeface, or retype it: use the outlined files.
- Don't stretch, outline, add shadows or gradients, or place the master on busy or mid-tone backgrounds.
- Don't use the regular symbol below 24 px: use the small cut.

## The name and the mark

The MIT license covers the code. Use the name and the mark to refer to TradeCanvas, not to suggest that something else is it or is endorsed by it.

## Open items

- A trademark search before registering the mark (no clearance has been done).
- Product marks for Grid, Orders and Flow, drawn from the family above.
