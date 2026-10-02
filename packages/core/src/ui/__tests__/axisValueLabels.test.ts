import { describe, it, expect } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import { spreadLabels, labelTextColor, renderAxisValueLabels, AXIS_LABEL_HEIGHT } from '../axisValueLabels.js';

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
