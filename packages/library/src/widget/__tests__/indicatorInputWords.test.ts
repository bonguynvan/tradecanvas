import { describe, it, expect } from 'vitest';
import { IndicatorEngine, registerBuiltInIndicators } from '@tradecanvas/core';
import { EN_TRANSLATOR, createTranslator, resolveMessages } from '../i18n.js';
import { DE_MESSAGES } from '../locales/de.js';
import { widgetIndicatorLabel } from '../indicatorInputWords.js';

const engine = new IndicatorEngine();
registerBuiltInIndicators(engine);
const descriptor = (id: string) => engine.getAvailableIndicators().find((d) => d.id === id)!;
const vwap = (anchor: string) => ({ id: 'vwap', params: { anchor }, descriptor: descriptor('vwap') });

describe('an indicator’s label in the widget', () => {
  it('names a VWAP by its anchor when it isn’t the session’s, so two read apart', () => {
    expect(widgetIndicatorLabel(vwap('session'), EN_TRANSLATOR)).toBe('VWAP');
    expect(widgetIndicatorLabel(vwap('week'), EN_TRANSLATOR)).toBe('VWAP Week');
    expect(widgetIndicatorLabel(vwap('all'), EN_TRANSLATOR)).toBe('VWAP All bars');
  });

  it('in the widget’s language', () => {
    const de = createTranslator(resolveMessages('de', DE_MESSAGES));
    expect(widgetIndicatorLabel(vwap('month'), de)).toBe(`VWAP ${DE_MESSAGES['indicatorInput.anchor.month']}`);
  });

  it('keeps the chip label of an indicator whose choices it has no words for', () => {
    expect(widgetIndicatorLabel({ id: 'ema', params: { period: 21 }, descriptor: descriptor('ema') }, EN_TRANSLATOR)).toBe('EMA 21');
  });
});
