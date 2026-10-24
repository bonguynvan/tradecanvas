/** Whether the keyboard is a Mac's, where Ctrl's shortcuts take ⌘. */
const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

/** The key Ctrl stands for here: ⌘ on a Mac. */
export const MOD_KEY = isMac ? '⌘' : 'Ctrl';

/** Text as a search compares it: lower case, no spaces or pluses ("alt g", "Alt+G" alike), any dash a hyphen ("0–9"). */
export const searchForm = (text: string): string =>
  text.toLowerCase().replace(/[\s+]+/g, '').replace(/[\u2010-\u2015\u2212]/g, '-');
