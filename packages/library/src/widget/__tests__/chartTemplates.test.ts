import { describe, it, expect } from 'vitest';
import { ChartTemplateStore, templateSettings } from '../chartTemplates.js';
import { DEFAULT_SETTINGS } from '../widgetConfig.js';

const memory = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('chart templates', () => {
  it('keep the look and the switches under a name, one per name, by name', () => {
    const storage = memory();
    const store = new ChartTemplateStore('k', storage);
    store.save('Night', { ...DEFAULT_SETTINGS, gridVisible: false }, { 'background.color': '#000000' });
    store.save('Bright', DEFAULT_SETTINGS, { 'background.color': '#ffffff' });
    store.save('Night', DEFAULT_SETTINGS, { 'background.color': '#111111' });
    const again = new ChartTemplateStore('k', storage);
    expect(again.list().map((t) => t.name)).toEqual(['Bright', 'Night']);
    expect(again.get('Night')?.style).toEqual({ 'background.color': '#111111' });
    again.remove('Bright');
    expect(again.list().map((t) => t.name)).toEqual(['Night']);
  });

  it('leave out what isn’t the chart’s look: the time zone, the number format, a chart type’s own settings', () => {
    const kept = templateSettings({ ...DEFAULT_SETTINGS, timezone: 'Asia/Tokyo', numberLocale: 'de-DE' });
    expect(kept).not.toHaveProperty('timezone');
    expect(kept).not.toHaveProperty('numberLocale');
    expect(kept).not.toHaveProperty('chartTypeOptions');
    expect(kept).not.toHaveProperty('autoScale'); // a drag on the axis turns it off: not a look
    expect(kept.gridVisible).toBe(true);
  });

  it('keep only the colours and lines that are set', () => {
    const store = new ChartTemplateStore('k', memory());
    store.save('A', DEFAULT_SETTINGS, { 'background.color': null, 'grid.horizontal.color': '#111111' });
    expect(store.get('A')?.style).toEqual({ 'grid.horizontal.color': '#111111' });
  });

  it('read back only what they could have saved', () => {
    const store = new ChartTemplateStore('k', memory({
      k: JSON.stringify([
        { name: 'Odd', settings: { gridVisible: 'yes', crosshairMode: 'laser', scaleMode: 'logarithmic', pivotStrength: 4, x: 1 }, style: { 'background.color': '#000', nope: 1, 'grid.horizontal.visible': 'x' } },
        { name: '', settings: {}, style: {} },
        'junk',
      ]),
    }));
    expect(store.list()).toEqual([{ name: 'Odd', settings: { scaleMode: 'logarithmic', pivotStrength: 4 }, style: { 'background.color': '#000' } }]);
    expect(new ChartTemplateStore('k', memory({ k: '{oops' })).list()).toEqual([]);
  });

  it('say when storage refuses a save', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(new ChartTemplateStore('k', full).save('A', DEFAULT_SETTINGS, {})).toBe(false);
    expect(new ChartTemplateStore('k', null).save('A', DEFAULT_SETTINGS, {})).toBe(false);
  });
});
