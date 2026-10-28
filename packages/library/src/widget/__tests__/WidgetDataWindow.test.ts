// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { WidgetDataWindow } from '../WidgetDataWindow.js';
import { EN_MESSAGES } from '../locales/en.js';

const EMPTY = { ohlc: null, change: 0, changePct: 0, indicators: [] };

/** A screen whose pointer is coarse (a finger) or fine (a mouse). */
function pointer(coarse: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query.includes('coarse'), media: query }));
}

function emptyHint(): string | null | undefined {
  const host = document.createElement('div');
  const panel = new WidgetDataWindow(host, { formatPrice: String });
  panel.openPanel();
  panel.render(EMPTY);
  return host.querySelector('.tcw-datawin-empty')?.textContent;
}

afterEach(() => vi.unstubAllGlobals());

describe('WidgetDataWindow — the hint with no bar under the pointer', () => {
  it('asks to hover the chart with a mouse', () => {
    pointer(false);
    expect(emptyHint()).toBe(EN_MESSAGES['dataWindow.hover']);
  });

  it('asks to touch the chart on a touch screen', () => {
    pointer(true);
    expect(emptyHint()).toBe('Touch the chart');
  });
});
