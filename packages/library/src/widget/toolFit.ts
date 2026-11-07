/**
 * The drawing tools' column on a short screen. Its buttons are a size over
 * the widget's others; where the column is too short for all of them, they
 * give back what it lacks, down to the others' size, before it scrolls.
 */

/** The custom property the stylesheet caps the tools' size with. */
const TOOL_FIT = '--tcw-tool-fit';

export interface ToolFitInput {
  /** A tool button's height at its own size (px). */
  button: number;
  /** How many tool buttons the column shows. */
  count: number;
  /** How much taller its content is than the column (px); 0 or less when it fits. */
  overflow: number;
  /** The smallest the buttons go: the widget's other buttons (px). */
  min: number;
}

/** The buttons' size that makes the column fit, or null to leave them at their own. */
export function toolFitSize({ button, count, overflow, min }: ToolFitInput): number | null {
  if (overflow <= 0 || count <= 0 || button <= min) return null;
  return Math.max(min, button - Math.ceil(overflow / count));
}

/** Fit the tools in `column` now: measured at their own size, then capped. */
function fit(column: HTMLElement): void {
  column.style.removeProperty(TOOL_FIT);
  if (column.clientHeight === 0) return;
  const buttons = [...column.querySelectorAll<HTMLElement>('.tcw-sidebar-btn')].filter((b) => b.offsetHeight > 0);
  const size = toolFitSize({
    button: buttons[0]?.offsetHeight ?? 0,
    count: buttons.length,
    overflow: column.scrollHeight - column.clientHeight,
    min: parseFloat(getComputedStyle(column).getPropertyValue('--tcw-control-h')) || 0,
  });
  if (size !== null) column.style.setProperty(TOOL_FIT, `${size}px`);
}

/**
 * Keep the tools in `column` fitted: as it resizes, as tools come and go
 * (favourites), and as the widget's root changes what sizes or shows them (a
 * look or density, a feature switch, the scale on a wide screen, a phone's
 * layout), which leaves the column's own size as it was. Returns the
 * function that stops watching.
 */
export function watchToolFit(column: HTMLElement): () => void {
  let frame = 0;
  let root: Element | null = null;
  const schedule = () => {
    if (frame || typeof requestAnimationFrame === 'undefined') return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      // The column is put in the widget after this starts: watch its root once it is there.
      if (!root && roots) {
        root = column.closest('.tcw-root');
        if (root) roots.observe(root, { attributes: true });
      }
      fit(column);
    });
  };
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  resize?.observe(column);
  const tools = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule);
  tools?.observe(column, { childList: true, subtree: true });
  const roots = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule);
  // A backstop for the observer: a window resize always fits again.
  const view = column.ownerDocument.defaultView;
  view?.addEventListener('resize', schedule);
  schedule();
  return () => {
    view?.removeEventListener('resize', schedule);
    if (frame) cancelAnimationFrame(frame);
    resize?.disconnect();
    tools?.disconnect();
    roots?.disconnect();
  };
}
