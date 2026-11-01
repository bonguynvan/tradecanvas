import { describe, it, expect } from 'vitest';
import * as chart from '../index.js';

describe('@tradecanvas/chart entry', () => {
  it('exports the realtime helpers its docs import from it', () => {
    // The realtime page imports these from '@tradecanvas/chart', the one package an app installs.
    expect(typeof chart.ReconnectManager).toBe('function');
    expect(typeof chart.ReplayController).toBe('function');
  });
});
