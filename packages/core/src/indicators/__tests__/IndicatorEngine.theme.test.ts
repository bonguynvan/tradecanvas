import { describe, it, expect, vi } from 'vitest';
import type { IndicatorPlugin, IndicatorStyleConfig, IndicatorValue, OHLCBar, Theme } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';

function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 0 }));
}

const DARK_LOOK = { colors: ['#eeeeee', '#888888'], lineWidths: [2] };
const LIGHT_LOOK = { colors: ['#111111', '#777777'], lineWidths: [2] };

/** A host's indicator whose look depends on the theme, and which records what `render` was given. */
function themedPlugin(
  id: string,
  placement: 'overlay' | 'panel' = 'overlay',
  defaultStyle: IndicatorStyleConfig | ((theme: Theme) => IndicatorStyleConfig) = (theme) =>
    theme.name === 'light' ? LIGHT_LOOK : DARK_LOOK,
): IndicatorPlugin & { render: ReturnType<typeof vi.fn> } {
  return {
    descriptor: { id, name: id, placement, defaultConfig: {}, defaultStyle },
    calculate(data) {
      const values = new Map<number, IndicatorValue>();
      const series = data.map((bar, i) => {
        const v = { value: i };
        values.set(bar.time, v);
        return v;
      });
      return { values, series };
    },
    render: vi.fn(),
  };
}

describe("an indicator's look by theme", () => {
  it("starts on its descriptor's look for the chart's theme", () => {
    const engine = new IndicatorEngine();
    engine.register(themedPlugin('tdk'));
    engine.setTheme(LIGHT_THEME);
    const id = engine.addIndicator('tdk', {}, bars(10));
    expect(engine.getIndicatorStyle(id)).toMatchObject({ colors: LIGHT_LOOK.colors, lineWidths: [2] });
  });

  it('takes a plain style for every theme', () => {
    const engine = new IndicatorEngine();
    engine.register(themedPlugin('tdk', 'overlay', { colors: ['#123456'], opacity: 0.5 }));
    const id = engine.addIndicator('tdk', {}, bars(10));
    expect(engine.getIndicatorStyle(id)).toMatchObject({ colors: ['#123456'], lineWidths: [1.5], opacity: 0.5 });
  });

  it('follows a change of theme', () => {
    const engine = new IndicatorEngine();
    engine.register(themedPlugin('tdk'));
    engine.setTheme(DARK_THEME);
    const id = engine.addIndicator('tdk', {}, bars(10));
    engine.setTheme(LIGHT_THEME);
    expect(engine.getIndicatorStyle(id)?.colors).toEqual(LIGHT_LOOK.colors);
    engine.setTheme(DARK_THEME);
    expect(engine.getIndicatorStyle(id)?.colors).toEqual(DARK_LOOK.colors);
  });

  it('keeps what someone chose for an instance through a change of theme', () => {
    const engine = new IndicatorEngine();
    engine.register(themedPlugin('tdk'));
    engine.setTheme(DARK_THEME);
    const id = engine.addIndicator('tdk', {}, bars(10));
    engine.updateIndicatorStyle(id, { colors: ['#ff0000', '#00ff00'] });
    engine.setTheme(LIGHT_THEME);
    expect(engine.getIndicatorStyle(id)).toMatchObject({ colors: ['#ff0000', '#00ff00'], lineWidths: [2] });
  });

  it("puts the viewer's saved default over the descriptor's, and keeps it through a change of theme", () => {
    const engine = new IndicatorEngine();
    engine.register(themedPlugin('tdk'));
    engine.setTheme(DARK_THEME);
    engine.setStyleDefaults('tdk', { colors: ['#abcdef'] });
    const id = engine.addIndicator('tdk', {}, bars(10));
    expect(engine.getIndicatorStyle(id)).toMatchObject({ colors: ['#abcdef'], lineWidths: [2] });
    engine.setTheme(LIGHT_THEME);
    expect(engine.getIndicatorStyle(id)).toMatchObject({ colors: ['#abcdef'], lineWidths: [2] });
  });

  it("leaves the theme's part out of the style to save", () => {
    const engine = new IndicatorEngine();
    engine.register(themedPlugin('tdk'));
    engine.setTheme(DARK_THEME);
    const id = engine.addIndicator('tdk', {}, bars(10));
    expect(engine.getOwnIndicatorStyle(id)).toEqual({ opacity: 1 });
    engine.updateIndicatorStyle(id, { colors: ['#ff0000'] });
    expect(engine.getOwnIndicatorStyle(id)).toEqual({ colors: ['#ff0000'], opacity: 1 });
  });

  it("saves every part of a built-in's style", () => {
    const engine = new IndicatorEngine();
    const plain = themedPlugin('plain');
    delete plain.descriptor.defaultStyle;
    engine.register(plain);
    const id = engine.addIndicator('plain', {}, bars(10));
    expect(engine.getOwnIndicatorStyle(id)).toEqual(engine.getIndicatorStyle(id));
  });

  it("gives render the chart's theme, in the price pane and in a pane of its own", () => {
    const engine = new IndicatorEngine();
    const overlay = themedPlugin('over');
    const panel = themedPlugin('pane', 'panel');
    engine.register(overlay);
    engine.register(panel);
    engine.setTheme(LIGHT_THEME);
    engine.addIndicator('over', {}, bars(10));
    const paneId = engine.addIndicator('pane', {}, bars(10));
    const ctx = {} as CanvasRenderingContext2D;
    const viewport = { visibleRange: { from: 0, to: 9 } } as never;
    engine.renderOverlays(ctx, viewport);
    engine.renderPanel(ctx, paneId, viewport);
    expect(overlay.render.mock.calls[0][4]).toEqual({ theme: LIGHT_THEME });
    expect(panel.render.mock.calls[0][4]).toEqual({ theme: LIGHT_THEME });
  });
});
