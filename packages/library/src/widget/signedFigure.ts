const SIGN = /^[-+−]/;

/**
 * `text`, a figure written without its sign, with the sign of `value`: a plus
 * for a gain, a minus for a loss, none for what reads as nothing. `zero` is
 * nothing as the host writes it ("0.00", "۰٫۰۰"), so a value too small to show
 * goes unsigned in any digits.
 */
export function signed(text: string, value: number, zero: string): string {
  const bare = text.replace(SIGN, '');
  if (bare === zero.replace(SIGN, '')) return bare;
  return value > 0 ? `+${bare}` : value < 0 ? `-${bare}` : bare;
}

/** The tone of a figure `signed` wrote: up with a plus, down with a minus, none unsigned, so its colour never says more than it does. */
export function toneOf(text: string): 'up' | 'down' | null {
  return text.startsWith('+') ? 'up' : text.startsWith('-') ? 'down' : null;
}
