// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { CHART_TYPE_ICONS } from '@tradecanvas/commons';
import { CHART_TYPES } from '../widgetConfig.js';
import { hasTypeSettings } from '../chartSettingsStore.js';
import { chartTypeLabel } from '../widgetLocales.js';
import { EN_TRANSLATOR } from '../i18n.js';

describe('the footprint among the widget’s chart types', () => {
  it('is listed with the volume charts, under its name, with an icon and settings of its own', () => {
    const at = CHART_TYPES.findIndex((type) => type.value === 'footprint');
    expect(at).toBeGreaterThan(-1);
    expect(CHART_TYPES[at - 1].value).toBe('equivolume');
    expect(chartTypeLabel(CHART_TYPES[at], EN_TRANSLATOR)).toBe('Footprint');
    expect(CHART_TYPE_ICONS.footprint).toBeDefined();
    expect(hasTypeSettings('footprint')).toBe(true);
  });

  it('has an icon for every chart type it lists', () => {
    for (const type of CHART_TYPES) expect(CHART_TYPE_ICONS[type.value], type.value).toBeDefined();
  });
});
