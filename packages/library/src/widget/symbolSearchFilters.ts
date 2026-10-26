import type { SymbolInfo } from '@tradecanvas/commons';
import type { Translator } from './i18n.js';
import { kindKey } from './symbolBadge.js';

/** Kinds and exchanges are keyed alike: their words trimmed, in lower case. */
const keyOf = kindKey;

/** Exchanges must be at least this many before the search offers to keep to one. */
const MIN_EXCHANGES = 2;
/** Tabs past an end by less than this (a rounded pixel) count as none. */
const MORE_SLACK_PX = 1;

/**
 * The symbol search's filters: a tab for each kind of symbol and a list of
 * exchanges, for the dialog it is made for. What it offers only grows while
 * the dialog is open, from every row shown since it opened, so the tabs don't
 * come and go (and the list jump) as typing narrows the results; a kind or an
 * exchange picked stays picked. Kinds and exchanges that differ only in case
 * are one, named as first written.
 */
export class SymbolSearchFilters {
  /** The row holding both, hidden while there is nothing to pick. */
  readonly el: HTMLDivElement;
  private readonly kindsEl: HTMLDivElement;
  private readonly exchangeEl: HTMLSelectElement;
  private readonly kinds = new Map<string, string>();
  private readonly exchanges = new Map<string, string>();
  private kind: string | null = null;
  private exchange: string | null = null;
  /** Tells of the tabs' room changing (a phone turned), where the browser can. */
  private readonly resize: ResizeObserver | null;

  /**
   * `onChange` when the user picks a kind or an exchange; `refocus` says the
   * search may take the keyboard back. A tab is pressed once, on purpose; an
   * exchange list changes with each arrow pressed on it, so it keeps the
   * keyboard.
   */
  constructor(private readonly t: Translator, private readonly onChange: (refocus: boolean) => void) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-ss-filters';
    this.el.hidden = true;
    this.kindsEl = document.createElement('div');
    this.kindsEl.className = 'tcw-ss-kinds';
    this.kindsEl.setAttribute('role', 'group');
    this.kindsEl.setAttribute('aria-label', t('symbolSearch.kinds'));
    this.kindsEl.hidden = true;
    this.kindsEl.addEventListener('scroll', () => this.markMore(), { passive: true });
    this.resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.markMore());
    this.resize?.observe(this.kindsEl);
    this.exchangeEl = document.createElement('select');
    this.exchangeEl.className = 'tcw-settings-select tcw-ss-exchange-filter';
    this.exchangeEl.setAttribute('aria-label', t('symbolSearch.exchange'));
    this.exchangeEl.hidden = true;
    this.exchangeEl.addEventListener('change', () => {
      this.exchange = keyOf(this.exchangeEl.value) || null;
      this.onChange(false);
    });
    this.el.append(this.kindsEl, this.exchangeEl);
  }

  /** Hear of the kinds and exchanges these rows come in, and show what there is to pick. */
  see(infos: readonly (SymbolInfo | undefined)[]): void {
    const kindsBefore = this.kinds.size;
    const exchangesBefore = this.exchanges.size;
    for (const info of infos) {
      remember(this.kinds, info?.type);
      remember(this.exchanges, info?.exchange);
    }
    if (this.kinds.size !== kindsBefore) this.renderKinds();
    if (this.exchanges.size !== exchangesBefore) this.renderExchanges();
    this.kindsEl.hidden = this.kinds.size === 0;
    this.exchangeEl.hidden = this.exchanges.size < MIN_EXCHANGES;
    this.el.hidden = this.kindsEl.hidden && this.exchangeEl.hidden;
    this.markMore();
  }

  /** Stop hearing of the tabs' room: the dialog has gone. */
  destroy(): void {
    this.resize?.disconnect();
  }

  /**
   * Where the tabs scroll in one line (a phone), say at which ends there are
   * more past the edge, `data-more` "start", "end" or both, for the fade there:
   * a tab cut at the edge then reads as more to scroll to. Right to left, the
   * row scrolls the other way, and its scrollLeft runs below zero.
   */
  private markMore(): void {
    const el = this.kindsEl;
    const past = Math.abs(el.scrollLeft);
    const room = el.scrollWidth - el.clientWidth;
    const ends = [past > MORE_SLACK_PX ? 'start' : '', past < room - MORE_SLACK_PX ? 'end' : ''].filter(Boolean);
    if (ends.length > 0) el.dataset.more = ends.join(' ');
    else delete el.dataset.more;
  }

  /**
   * Whether a symbol is of the kind and on the exchange picked. `lenient`
   * (the symbols given, not a feed's results) lets one through that says
   * nothing of its kind or exchange: it may be either, and hiding it would
   * hide a symbol the host listed.
   */
  passes(info: SymbolInfo | undefined, lenient: boolean): boolean {
    return matches(this.kind, keyOf(info?.type), lenient) && matches(this.exchange, keyOf(info?.exchange), lenient);
  }

  private renderKinds(): void {
    const chip = (value: string | null, text: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcw-ss-type';
      b.textContent = text;
      b.setAttribute('aria-pressed', String(this.kind === value));
      b.addEventListener('click', () => {
        this.kind = value;
        for (const other of this.kindsEl.children) other.setAttribute('aria-pressed', String(other === b));
        this.onChange(true);
      });
      return b;
    };
    const chips = [...this.kinds].map(([key, label]) => chip(key, label));
    this.kindsEl.replaceChildren(chip(null, this.t('symbolSearch.allKinds')), ...chips);
  }

  private renderExchanges(): void {
    const option = (value: string, text: string) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      return o;
    };
    const options = [...this.exchanges.values()].map((label) => option(label, label));
    this.exchangeEl.replaceChildren(option('', this.t('symbolSearch.allExchanges')), ...options);
    this.exchangeEl.value = this.exchange === null ? '' : this.exchanges.get(this.exchange) ?? '';
  }
}

function remember(seen: Map<string, string>, words: string | undefined): void {
  const key = keyOf(words);
  if (key && !seen.has(key)) seen.set(key, words!.trim());
}

function matches(picked: string | null, key: string, lenient: boolean): boolean {
  return picked === null || key === picked || (lenient && key === '');
}
