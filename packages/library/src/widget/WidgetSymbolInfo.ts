import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type Translator } from './i18n.js';
import { markPart } from './widgetFeatures.js';

/** What the symbol info panel shows, formatted by the widget. */
export interface SymbolInfoView {
  symbol: string;
  description?: string;
  /** Exchange, type, currency, joined. */
  meta?: string;
  price?: string;
  change?: { text: string; up: boolean };
  status: { state: 'open' | 'closed' | 'always'; text: string };
  stats: { label: string; value: string }[];
}

export interface SymbolInfoNewsItem {
  title: string;
  url?: string;
  /** Source and age, joined. */
  meta: string;
}

/** The news part: no source, loading, failed, or the headlines (maybe none). */
export type SymbolInfoNews =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'items'; items: SymbolInfoNewsItem[] };

export interface SymbolInfoCallbacks {
  /** After it opens or closes. */
  onToggle?: (open: boolean) => void;
}

/**
 * Symbol info — a floating panel with the symbol's names, price and move,
 * market status, the day's numbers, its hours, and news. It only renders:
 * the widget builds what it shows.
 */
export class WidgetSymbolInfo {
  private el: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private newsEl: HTMLDivElement;
  private shown = false;

  constructor(
    host: HTMLElement,
    private readonly t: Translator = EN_TRANSLATOR,
    private readonly callbacks: SymbolInfoCallbacks = {},
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-syminfo';
    markPart(this.el, 'symbolInfo');
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', t('symbolInfo.title'));
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-syminfo-header';
    const title = document.createElement('span');
    title.textContent = t('symbolInfo.title');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-syminfo-close';
    closeBtn.setAttribute('aria-label', t('common.close'));
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-syminfo-body';

    this.newsEl = document.createElement('div');
    this.newsEl.className = 'tcw-syminfo-news';
    this.newsEl.hidden = true;

    this.el.append(header, this.bodyEl, this.newsEl);
    host.appendChild(this.el);
  }

  isOpen(): boolean {
    return this.shown;
  }

  toggle(): void {
    if (this.shown) this.close();
    else this.open();
  }

  open(): void {
    if (this.shown) return;
    this.shown = true;
    this.el.hidden = false;
    this.callbacks.onToggle?.(true);
  }

  close(): void {
    if (!this.shown) return;
    this.shown = false;
    this.el.hidden = true;
    this.callbacks.onToggle?.(false);
  }

  render(view: SymbolInfoView): void {
    const head = document.createElement('div');
    head.className = 'tcw-syminfo-head';
    head.append(text('div', 'tcw-syminfo-symbol', view.symbol));
    if (view.description) head.append(text('div', 'tcw-syminfo-desc', view.description));
    if (view.meta) head.append(text('div', 'tcw-syminfo-meta', view.meta));

    const quote = document.createElement('div');
    quote.className = 'tcw-syminfo-quote';
    if (view.price) quote.append(text('span', 'tcw-syminfo-price', view.price));
    if (view.change) {
      const change = text('span', 'tcw-syminfo-change', view.change.text);
      change.classList.add(view.change.up ? 'tcw-up' : 'tcw-down');
      quote.append(change);
    }

    const status = text('div', 'tcw-syminfo-status', view.status.text);
    status.dataset.state = view.status.state;

    const stats = document.createElement('dl');
    stats.className = 'tcw-syminfo-stats';
    for (const stat of view.stats) {
      const row = document.createElement('div');
      row.className = 'tcw-syminfo-stat';
      row.append(text('dt', '', stat.label), text('dd', '', stat.value));
      stats.append(row);
    }

    this.bodyEl.replaceChildren(head, quote, status, stats);
  }

  renderNews(news: SymbolInfoNews): void {
    this.newsEl.hidden = news.kind === 'none';
    if (news.kind === 'none') {
      this.newsEl.replaceChildren();
      return;
    }
    const title = text('div', 'tcw-syminfo-news-title', this.t('symbolInfo.news'));
    if (news.kind === 'loading' || news.kind === 'failed' || news.items.length === 0) {
      const note = news.kind === 'loading' ? 'symbolInfo.loading' : news.kind === 'failed' ? 'symbolInfo.newsFailed' : 'symbolInfo.noNews';
      // The heading stays out of a lone note's text, for screen readers' sake too.
      this.newsEl.replaceChildren(text('div', 'tcw-syminfo-news-note', this.t(note)));
      return;
    }
    const list = document.createElement('ul');
    list.className = 'tcw-syminfo-news-list';
    for (const item of news.items) {
      const li = document.createElement('li');
      li.className = 'tcw-syminfo-news-item';
      if (item.url) {
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = item.title;
        li.append(link);
      } else {
        li.append(text('span', '', item.title));
      }
      if (item.meta) li.append(text('div', 'tcw-syminfo-news-meta', item.meta));
      list.append(li);
    }
    this.newsEl.replaceChildren(title, list);
  }

  destroy(): void {
    this.el.remove();
  }
}

function text<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, content: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = content;
  return el;
}
