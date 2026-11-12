/**
 * A text drawing's words typed in place: a text box laid over the text on the
 * chart, in its font and colour, that follows it as the chart moves.
 */

/** Where a box is on the page's layer, px. */
export interface InlineTextRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InlineTextTarget {
  /** Where the text's box is now, on the layer the editor sits in; null once the drawing is gone. */
  rect: () => InlineTextRect | null;
  text: string;
  font: { size: number; bold: boolean; italic: boolean; family: string };
  color: string;
  /** What a screen reader hears the box called. */
  label: string;
  /** What the empty box shows, greyed: the tool's name, as the chart writes it in a text with no words. */
  placeholder?: string;
  /** Each change, to show on the chart as it is typed. */
  onInput: (text: string) => void;
  /** Enter, or the focus gone (a click elsewhere): the words as typed. */
  onCommit: (text: string) => void;
  /** Escape: the words as they were. */
  onCancel: () => void;
  /** Where the focus goes back after Enter or Escape (the chart), so its keys work at once. */
  returnFocus?: () => HTMLElement | null;
}

/** Inside padding, as a text box on the chart has it (`textBox.ts`), so the words sit where they were drawn. */
const PAD_X = 8;
const PAD_Y = 6;
/** Line height, as the chart's text boxes space their lines. */
const LINE_GAP = 1.3;
/** Narrowest the box gets, so a short word has room to grow. */
const MIN_WIDTH = 120;
/** The box's own border, px: it sits outside the text's box, so the words stay where the chart drew them. */
const BORDER = 1;
/**
 * Room past the text's box, px: the page's letters run a little wider or
 * narrower than the canvas's, and a line that just fits on the chart must not
 * wrap while it is typed.
 */
const WIDTH_SLACK = 4;
/** The key code a browser gives a key that ends an IME composition (Safari's Enter on a candidate). */
const IME_KEY_CODE = 229;
/**
 * How long after the box opens a press elsewhere is taken as the rest of a
 * clumsy double-click (ms), not as a click away: it is let go of, and the
 * box stays open.
 */
const OPEN_GRACE_MS = 500;
/** How far the box keeps from the window's edges (px). */
const EDGE = 8;
/** How long a text stays off the window (ms) before its box closes, keeping the words. */
const OFF_WINDOW_MS = 400;

export class WidgetInlineText {
  private wrap: HTMLDivElement | null = null;
  private area: HTMLTextAreaElement | null = null;
  private target: InlineTextTarget | null = null;
  private frame = 0;
  private done = true;
  private openedAt = 0;
  /** When the text went off the window, or 0 while it is on it. */
  private offSince = 0;
  /**
   * A press anywhere but the box keeps the words first: before the chart
   * takes the press (a pan, a point placed, another drawing picked).
   */
  private readonly onPressAway = (e: Event) => {
    if (!this.area || e.target === this.area) return;
    // Only while nothing is typed yet: a quick click away after typing still keeps the words.
    if (this.area.value === this.target?.text && performance.now() - this.openedAt < OPEN_GRACE_MS) {
      // The second press of the double-click that drew the text: the box keeps the focus.
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.finish(true, false);
  };

  constructor(private readonly layer: () => HTMLElement) {}

  isOpen(): boolean {
    return this.area !== null;
  }

  /**
   * Type a text in place over its box. One open already keeps its words
   * first. False (nothing opened) when the text's box is not on the chart.
   */
  open(target: InlineTextTarget): boolean {
    if (this.area) this.finish(true, false);
    const rect = target.rect();
    if (!rect) return false;
    this.target = target;
    this.done = false;

    const wrap = document.createElement('div');
    wrap.className = 'tcw-inline-text';
    const area = document.createElement('textarea');
    area.className = 'tcw-inline-text-input';
    area.value = target.text;
    area.rows = 1;
    area.spellcheck = false;
    area.setAttribute('aria-label', target.label);
    if (target.placeholder) area.placeholder = target.placeholder;
    const { size, bold, italic, family } = target.font;
    Object.assign(area.style, {
      fontSize: `${size}px`,
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
      fontFamily: family,
      lineHeight: String(LINE_GAP),
      color: target.color,
      padding: `${PAD_Y}px ${PAD_X}px`,
    });
    area.addEventListener('input', () => {
      this.fit();
      this.target?.onInput(area.value);
      const rect = this.target?.rect();
      if (rect) this.place(rect);
      // Its width follows the text's box, which just grew or shrank: as tall as its lines at that width,
      // and placed again at that height, so a line more by the window's foot stays on it.
      this.fit();
      if (rect) this.place(rect);
    });
    area.addEventListener('keydown', (e) => {
      // The chart's and the page's shortcuts stay out of the typing.
      e.stopPropagation();
      // Keys that pick or drop an IME candidate (Japanese, Chinese, Korean) are the IME's.
      if (e.isComposing || e.keyCode === IME_KEY_CODE) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.finish(false, true);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.finish(true, true);
      }
    });
    area.addEventListener('blur', () => this.finish(true, false));
    wrap.appendChild(area);
    this.layer().appendChild(wrap);
    this.wrap = wrap;
    this.area = area;
    this.place(rect);
    this.fit();
    area.focus();
    area.select();
    this.openedAt = performance.now();
    this.offSince = 0;
    document.addEventListener('pointerdown', this.onPressAway, true);
    document.addEventListener('mousedown', this.onPressAway, true);
    this.follow();
    return true;
  }

  /** Keep the words now (the page goes fullscreen, the text is hidden): as a click away does. */
  commit(): void {
    this.finish(true, false);
  }

  /** Shut without keeping or putting back anything (the drawing went, the widget is going): the caller ends the edit. */
  close(): void {
    this.done = true;
    this.teardown();
  }

  /** Keep the words (true) or put them back, once; from a key, the focus goes back to the chart. */
  private finish(keep: boolean, fromKey: boolean): void {
    if (this.done || !this.area || !this.target) return;
    this.done = true;
    const text = this.area.value;
    const target = this.target;
    this.teardown();
    if (keep) target.onCommit(text);
    else target.onCancel();
    if (fromKey) target.returnFocus?.()?.focus({ preventScroll: true });
  }

  private teardown(): void {
    document.removeEventListener('pointerdown', this.onPressAway, true);
    document.removeEventListener('mousedown', this.onPressAway, true);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.wrap?.remove();
    this.wrap = null;
    this.area = null;
    this.target = null;
  }

  /**
   * Over the text's box, as wide as it at least, and inside the window: a
   * text by the right edge or a long line shifts the box in and wraps it, so
   * what is typed stays in sight.
   */
  private place(rect: InlineTextRect): void {
    const area = this.area;
    if (!area) return;
    const room = Math.max(MIN_WIDTH, window.innerWidth - EDGE * 2);
    area.style.maxWidth = `${room}px`;
    // As wide as the text's box, so the words wrap where the chart wraps them.
    const wanted = Math.max(MIN_WIDTH, rect.width + BORDER * 2 + WIDTH_SLACK);
    area.style.width = `${Math.min(room, wanted)}px`;
    area.style.minHeight = `${rect.height + BORDER * 2}px`;
    const width = area.offsetWidth || wanted;
    const height = area.offsetHeight || rect.height + BORDER * 2;
    area.style.left = `${Math.max(EDGE, Math.min(rect.x - BORDER, window.innerWidth - EDGE - width))}px`;
    area.style.top = `${Math.max(EDGE, Math.min(rect.y - BORDER, window.innerHeight - EDGE - height))}px`;
  }

  /** Whether a box is wholly off the window (scrolled away, another interval). */
  private offWindow(rect: InlineTextRect): boolean {
    return rect.x > window.innerWidth || rect.x + rect.width < 0 || rect.y > window.innerHeight || rect.y + rect.height < 0;
  }

  /** As tall as its lines, so a new line has room. */
  private fit(): void {
    const area = this.area;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }

  /** Each frame, over the text where it is now: the chart may scroll or zoom while it is typed. */
  private follow(): void {
    this.frame = requestAnimationFrame(() => {
      if (!this.target || this.done) return;
      const rect = this.target.rect();
      // Off the window for a moment (the window being resized) is not out of sight.
      const off = rect !== null && this.offWindow(rect);
      if (!off) this.offSince = 0;
      else if (this.offSince === 0) this.offSince = performance.now();
      if (!rect || (off && performance.now() - this.offSince > OFF_WINDOW_MS)) {
        // The text went out of sight (hidden, scrolled away, its pane gone): what was typed is kept.
        this.finish(true, false);
        return;
      }
      this.place(rect);
      this.follow();
    });
  }
}
