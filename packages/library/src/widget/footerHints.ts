import { escapeHtml } from './escapeHtml.js';
import { createIcon } from './icons.js';

/**
 * The keys a list dialog answers, as its footer shows them: the arrows of
 * the icon set to move, its enter key to pick, Esc to close, each before
 * what it does, in the same chips as the shortcuts in the list.
 */
export function footerHints(navigate: string, pick: string, close: string): string {
  const keys = (...inner: string[]) => inner.map((k) => `<kbd class="tcw-cmd-kbd tcw-cmd-key">${k}</kbd>`).join('');
  const hint = (k: string, what: string) => `<span class="tcw-cmd-help">${k}<span class="tcw-cmd-help-text">${escapeHtml(what)}</span></span>`;
  return hint(keys(createIcon('arrowUp', 11), createIcon('arrowDown', 11)), navigate)
    + hint(keys(createIcon('enter', 11)), pick)
    + hint(keys('Esc'), close);
}
