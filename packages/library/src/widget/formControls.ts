import { SelectMenu } from './selectMenu.js';
import { CalendarPopup } from './calendarPopup.js';
import type { CalendarLabels } from './monthView.js';

export interface FormControlOptions {
  /** Where the lists and calendars open, over the page (the widget's overlay layer). */
  layer: () => HTMLElement;
  labels: () => CalendarLabels;
  /** The language for month and day names. */
  locale: () => string;
  /**
   * Whether to leave fields to the platform's own pickers. Default: on a
   * touch screen, where the phone's wheel and calendar are the better ones.
   */
  native?: () => boolean;
  /**
   * Whether date fields open the widget's calendar. Default: where the
   * browser's own calendar can be kept shut (Chromium, Safari); Firefox
   * keeps its own.
   */
  calendar?: () => boolean;
}

/** Whether the screen's main pointer is a finger: a touch screen. */
export const coarsePointer = (): boolean => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const hideableCalendar = () =>
  typeof CSS === 'undefined' || typeof CSS.supports !== 'function' || CSS.supports('selector(::-webkit-calendar-picker-indicator)');

/** A select the widget's list can stand in for: one line, enabled. */
function ownSelect(target: EventTarget | null): HTMLSelectElement | null {
  if (!(target instanceof Element)) return null;
  const select = target.closest('select');
  if (!select || select.matches(':disabled') || select.multiple || select.size > 1) return null;
  return select;
}

/** A date field to open the calendar for: enabled, and not one whose month is shown beside it already. */
function dateField(target: EventTarget | null): HTMLInputElement | null {
  if (!(target instanceof HTMLInputElement) || target.type !== 'date') return null;
  if (target.dataset.tcwCalendar === 'inline') return null;
  return target.matches(':disabled') || target.readOnly ? null : target;
}

/**
 * Selects and date fields inside `roots` open the widget's own list and
 * calendar instead of the browser's: one look in every theme and every
 * browser. The fields themselves are untouched, so their values and events
 * stay as they were. Returns the uninstall.
 */
export function installFormControls(roots: readonly HTMLElement[], options: FormControlOptions): () => void {
  const menu = new SelectMenu(options.layer);
  const calendar = new CalendarPopup(options.layer, options.labels, options.locale);
  const native = options.native ?? coarsePointer;
  const ownCalendar = options.calendar ?? hideableCalendar;
  /**
   * Events already handled: in fullscreen the dialogs' layer sits inside the
   * widget, and one press reaches the listeners on both.
   */
  const seen = new WeakSet<Event>();
  const first = (e: Event) => {
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || native() || !first(e)) return;
    const select = ownSelect(e.target);
    if (!select) return;
    // The browser's own list would open on this press.
    e.preventDefault();
    if (menu.isOpenFor(select)) {
      menu.close(true);
      return;
    }
    select.focus();
    menu.open(select);
  };

  const onClick = (e: MouseEvent) => {
    if (native() || !ownCalendar() || !first(e)) return;
    const input = dateField(e.target);
    if (!input) return;
    // Typing into the day, month and year stays; the calendar opens beside them.
    e.preventDefault();
    if (!calendar.isOpenFor(input)) calendar.open(input);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (native() || !first(e)) return;
    const select = ownSelect(e.target);
    if (select) {
      if (menu.isOpenFor(select)) {
        if (menu.key(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      const opens = e.key === 'Enter' || e.key === ' ' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) || e.key === 'F4';
      if (opens) {
        e.preventDefault();
        e.stopPropagation();
        menu.open(select);
      }
      return;
    }
    const input = dateField(e.target);
    if (!input || !ownCalendar()) return;
    if (e.key === 'Escape' && calendar.isOpenFor(input)) {
      e.preventDefault();
      e.stopPropagation();
      calendar.close(true);
    } else if ((e.altKey && e.key === 'ArrowDown') || e.key === 'F4') {
      e.preventDefault();
      if (!calendar.isOpenFor(input)) calendar.open(input);
      calendar.focusGrid();
    }
  };

  const onFocusOut = (e: FocusEvent) => {
    if (!first(e)) return;
    // Focus leaving a field and its list or calendar for anything else closes them.
    const from = e.target instanceof Node ? e.target : null;
    const to = e.relatedTarget instanceof Node ? e.relatedTarget : null;
    if (menu.owns(from) && !menu.owns(to)) menu.close(false);
    if (calendar.owns(from) && !calendar.owns(to)) calendar.close(false);
  };

  for (const root of roots) {
    root.addEventListener('mousedown', onMouseDown, true);
    root.addEventListener('click', onClick, true);
    root.addEventListener('keydown', onKeyDown, true);
    root.addEventListener('focusout', onFocusOut, true);
  }
  return () => {
    for (const root of roots) {
      root.removeEventListener('mousedown', onMouseDown, true);
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('keydown', onKeyDown, true);
      root.removeEventListener('focusout', onFocusOut, true);
    }
    menu.destroy();
    calendar.destroy();
  };
}
