import { setHostButtonName } from './WidgetToolbar.js';

/** Shows a host's button as on or off; a switch says so to assistive tech too. */
export function setHostButtonActive(element: HTMLButtonElement, on: boolean, toggle: boolean): void {
  element.classList.toggle('tcw-active', on);
  if (toggle) element.setAttribute('aria-pressed', String(on));
}

/**
 * A host's toolbar button's text, its name following ("News: 3"). False when
 * it showed that text already: nothing changed, so nothing needs refitting.
 */
export function setHostButtonText(element: HTMLButtonElement, label: string, value: string): boolean {
  // A host in plain script may pass a count as a number; the button shows it as text.
  // Null or undefined clears it, as the page itself treats them.
  const text = value == null ? '' : String(value);
  let span = element.querySelector<HTMLSpanElement>('.tcw-host-btn-text');
  if ((span?.textContent ?? '') === text) return false;
  if (!span) {
    span = document.createElement('span');
    span.className = 'tcw-host-btn-text';
    element.appendChild(span);
  }
  span.textContent = text;
  setHostButtonName(element, label);
  return true;
}
