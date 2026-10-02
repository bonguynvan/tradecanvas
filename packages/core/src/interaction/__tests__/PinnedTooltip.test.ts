// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { PinnedTooltip } from '../PinnedTooltip.js';

describe('PinnedTooltip', () => {
  it('shows the bar time in the chart’s time zone', () => {
    const host = document.createElement('div');
    const tooltip = new PinnedTooltip();
    tooltip.create(host);
    tooltip.setTimezone('Asia/Tokyo');
    // 2026-03-04 23:30 UTC is 08:30 on March 5 in Tokyo.
    tooltip.pin({ time: Date.UTC(2026, 2, 4, 23, 30), open: 1, high: 2, low: 0.5, close: 1.5 }, 0, DARK_THEME);
    expect(host.textContent).toContain('3/5 08:30');
  });
});
