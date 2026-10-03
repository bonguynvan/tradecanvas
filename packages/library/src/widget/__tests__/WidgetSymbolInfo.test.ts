// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetSymbolInfo } from '../WidgetSymbolInfo.js';
import { EN_TRANSLATOR } from '../i18n.js';

let host: HTMLDivElement;
let panel: WidgetSymbolInfo;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  panel = new WidgetSymbolInfo(host, EN_TRANSLATOR);
});

afterEach(() => {
  panel.destroy();
  host.remove();
});

const el = () => host.querySelector<HTMLElement>('.tcw-syminfo')!;

describe('WidgetSymbolInfo', () => {
  it('opens, closes and toggles', () => {
    expect(el().hidden).toBe(true);
    panel.toggle();
    expect(panel.isOpen()).toBe(true);
    expect(el().hidden).toBe(false);
    el().querySelector<HTMLButtonElement>('.tcw-syminfo-close')!.click();
    expect(panel.isOpen()).toBe(false);
  });

  it('shows the symbol, its price and move, its status and its numbers, as text', () => {
    const onChange = vi.fn();
    panel = new WidgetSymbolInfo(host, EN_TRANSLATOR, { onToggle: onChange });
    panel.open();
    panel.render({
      symbol: 'AAPL',
      description: '<i>Apple</i>',
      meta: 'NASDAQ · stock',
      price: '189.50',
      change: { text: '+1.20 (+0.64%)', up: true },
      status: { state: 'closed', text: 'Market closed · opens in 14 hours' },
      stats: [{ label: 'Volume', value: '1.2M' }, { label: 'Trading hours', value: '09:30–16:00 Mon–Fri' }],
    });
    const p = [...host.querySelectorAll('.tcw-syminfo')].at(-1)!;
    expect(p.querySelector('.tcw-syminfo-symbol')!.textContent).toBe('AAPL');
    expect(p.querySelector('.tcw-syminfo-desc')!.textContent).toBe('<i>Apple</i>');
    expect(p.querySelector('i')).toBeNull();
    expect(p.querySelector('.tcw-syminfo-price')!.textContent).toBe('189.50');
    expect(p.querySelector('.tcw-syminfo-change')!.classList.contains('tcw-up')).toBe(true);
    const status = p.querySelector('.tcw-syminfo-status')!;
    expect(status.textContent).toBe('Market closed · opens in 14 hours');
    expect(status.getAttribute('data-state')).toBe('closed');
    expect([...p.querySelectorAll('.tcw-syminfo-stat')].map((r) => r.textContent)).toEqual(['Volume1.2M', 'Trading hours09:30–16:00 Mon–Fri']);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows news: loading, links, nothing, a failure', () => {
    panel.open();
    const news = () => el().querySelector('.tcw-syminfo-news')!;
    panel.renderNews({ kind: 'loading' });
    expect(news().textContent).toContain('Loading');
    panel.renderNews({
      kind: 'items',
      items: [{ title: 'Earnings beat', url: 'https://news.example/a', meta: 'Wire · 3 hours ago' }, { title: 'No link', meta: 'Desk' }],
    });
    const link = news().querySelector<HTMLAnchorElement>('a')!;
    expect(link.textContent).toBe('Earnings beat');
    expect(link.href).toBe('https://news.example/a');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(news().querySelectorAll('.tcw-syminfo-news-item')).toHaveLength(2);
    panel.renderNews({ kind: 'items', items: [] });
    expect(news().textContent).toBe('No news for this symbol.');
    panel.renderNews({ kind: 'failed' });
    expect(news().textContent).toBe('News could not be loaded.');
    panel.renderNews({ kind: 'none' });
    expect(news().hidden).toBe(true);
  });
});
