/**
 * Most widths kept. The price axis measures a few labels in three fonts each
 * time it fits; this many means the prices have moved on, so start again.
 */
const MAX_WIDTHS = 512;

/**
 * Label widths by font and text, each measured once. Panning fits the price
 * axis frame after frame to the same few labels, and a measure on the chart's
 * own canvas, in the page, costs more than one on a canvas out of it. A web
 * font that finishes loading changes the widths, so all are measured again.
 */
export class LabelWidths {
  private readonly widths = new Map<string, number>();
  private readonly fonts: FontFaceSet | null;
  private readonly forget = (): void => this.widths.clear();

  constructor() {
    this.fonts = typeof document !== 'undefined' ? document.fonts ?? null : null;
    this.fonts?.addEventListener('loadingdone', this.forget);
  }

  /** The width of `text` in `font`: `measure`'s answer the first time, kept after. */
  get(text: string, font: string, measure: () => number): number {
    // A font string holds no line break, so the key can't be read two ways.
    const key = `${font}\n${text}`;
    const known = this.widths.get(key);
    if (known !== undefined) return known;
    const width = measure();
    if (this.widths.size >= MAX_WIDTHS) this.widths.clear();
    this.widths.set(key, width);
    return width;
  }

  destroy(): void {
    this.fonts?.removeEventListener('loadingdone', this.forget);
    this.widths.clear();
  }
}
