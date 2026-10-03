import { describe, it, expect } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { spreadLabels, labelTextColor, renderAxisValueLabels, layoutAxisValueLabels, AXIS_LABEL_HEIGHT } from '../axisValueLabels.js';

describe('spreadLabels', () => {
  it('leaves tags that do not touch where they are', () => {
    expect(spreadLabels([20, 60, 100], 0, 200)).toEqual([20, 60, 100]);
  });

  it('pushes touching tags apart, the first staying on its value', () => {
    expect(spreadLabels([50, 52, 55], 0, 200)).toEqual([50, 50 + AXIS_LABEL_HEIGHT, 50 + 2 * AXIS_LABEL_HEIGHT]);
  });

  it('keeps the first tags inside a short axis when not all fit', () => {
    const ys = spreadLabels([20, 20, 20], 0, 40);
    expect(ys[0]).toBe(AXIS_LABEL_HEIGHT / 2);
    expect(ys[1]).toBe(ys[0] + AXIS_LABEL_HEIGHT);
    expect(ys[2]).toBeGreaterThan(40 - AXIS_LABEL_HEIGHT / 2); // past the bottom: left out
  });

  it('keeps every tag inside the axis, pushing up from the bottom edge', () => {
    const ys = spreadLabels([190, 195, 199], 0, 200);
    expect(ys[2]).toBe(200 - AXIS_LABEL_HEIGHT / 2);
    expect(ys[1]).toBe(ys[2] - AXIS_LABEL_HEIGHT);
    expect(ys[0]).toBe(ys[1] - AXIS_LABEL_HEIGHT);
  });
});

describe('labelTextColor', () => {
  it('writes dark on light tags and light on dark ones', () => {
    expect(labelTextColor('#ffd400')).toBe('#10131a');
    expect(labelTextColor('#2a5bd7')).toBe('#ffffff');
    expect(labelTextColor('rgb(240, 240, 240)')).toBe('#10131a');
    expect(labelTextColor('not-a-colour')).toBe('#ffffff');
  });
});

describe('renderAxisValueLabels', () => {
  it('drops tags off the axis and draws the rest in their colours', () => {
    const fills: string[] = [];
    const texts: string[] = [];
    let fill = '';
    const ctx = {
      save() {}, restore() {}, font: '', textBaseline: '', textAlign: '',
      set fillStyle(c: string) { fill = c; }, get fillStyle() { return fill; },
      measureText: (t: string) => ({ width: t.length * 6 }),
      fillRect() { fills.push(fill); },
      fillText(t: string) { texts.push(t); },
    } as unknown as CanvasRenderingContext2D;
    renderAxisValueLabels(ctx, [
      { y: 50, text: '101.5', color: '#2a5bd7' },
      { y: 500, text: 'off', color: '#ffffff' },
    ], 600, 70, { top: 0, bottom: 300 }, DARK_THEME);
    expect(fills).toEqual(['#2a5bd7']);
    expect(texts).toEqual(['101.5']);
  });
});

describe('layoutAxisValueLabels around fixed tags', () => {
  const label = (y: number, text = String(y)) => ({ y, text, color: '#4c8dff' });
  const H = AXIS_LABEL_HEIGHT;

  it('keeps tags off a fixed tag (the last price), on the side of their value', () => {
    // The last-price tag at 100 takes 90..110; a value at 104 sits just below it, one at 97 just above.
    const placed = layoutAxisValueLabels([label(104), label(97)], { top: 0, bottom: 300 }, [{ y: 100, half: 10 }]);
    const byText = Object.fromEntries(placed.map((p) => [p.text, p.y]));
    expect(byText['104']).toBe(110 + H / 2);
    expect(byText['97']).toBe(90 - H / 2);
  });

  it('leaves tags alone when nothing is in the way', () => {
    const placed = layoutAxisValueLabels([label(40), label(200)], { top: 0, bottom: 300 }, [{ y: 100, half: 10 }]);
    expect(placed.map((p) => p.y)).toEqual([40, 200]);
  });

  it('drops tags that no longer fit between fixed tags', () => {
    const placed = layoutAxisValueLabels([label(101), label(102), label(103)], { top: 0, bottom: 300 },
      [{ y: 100, half: 10 }, { y: 130, half: 10 }]);
    // 110..120 holds no full 16 px tag: all three go.
    expect(placed).toEqual([]);
  });
});
