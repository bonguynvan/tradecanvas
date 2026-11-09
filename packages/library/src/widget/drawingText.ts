/**
 * How each drawing tool writes its text. The chart's text editing reads it as soon as the
 * widget is up; the drawing settings, loaded when first opened, read it too.
 */

/**
 * How a tool lays its text out in a box (a text, a note, a callout): whether
 * it draws a background and a border unless the style says, and where it
 * wraps (0: only where the text breaks). Tools without one (a price label)
 * get the font rows only.
 */
export interface TextLayout {
  box: boolean;
  border: boolean;
  wrap: number;
  /** The size it draws at without one of its own: the drawings' text size at the chart's default type. */
  fontSize: number;
}

/** The tools that write in a box, and how: a text has no box and runs on; a note and a callout have one and wrap at 240 px. */
export const TEXT_LAYOUTS: Readonly<Partial<Record<string, TextLayout>>> = {
  text: { box: false, border: false, wrap: 0, fontSize: 14 },
  note: { box: true, border: true, wrap: 240, fontSize: 14 },
  callout: { box: true, border: true, wrap: 240, fontSize: 14 },
  signpost: { box: true, border: true, wrap: 200, fontSize: 14 },
  balloon: { box: true, border: true, wrap: 200, fontSize: 14 },
  anchoredText: { box: false, border: false, wrap: 0, fontSize: 14 },
  anchoredNote: { box: true, border: true, wrap: 240, fontSize: 14 },
};

/** The tools that write their text along a line or in a box, at a place the Text tab picks. */
export const TEXT_PLACES: ReadonlySet<string> = new Set([
  'trendLine', 'ray', 'extendedLine', 'infoLine', 'trendAngle', 'arrow',
  'horizontalLine', 'horizontalRay', 'verticalLine', 'rectangle',
]);

/** The colour a tool writes in without one of its own, when it isn't its line's (a price label writes white on its box). */
export const TEXT_COLORS: Readonly<Partial<Record<string, string>>> = {
  priceLabel: '#ffffff',
};
