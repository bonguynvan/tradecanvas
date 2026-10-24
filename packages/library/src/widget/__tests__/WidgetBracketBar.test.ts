// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetBracketBar } from '../WidgetBracketBar.js';

let host: HTMLDivElement;
let bar: WidgetBracketBar;
const onConfirm = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  bar = new WidgetBracketBar(host, { onConfirm, onCancel });
});

afterEach(() => {
  bar.destroy();
  host.remove();
  vi.clearAllMocks();
});

const el = () => host.querySelector<HTMLElement>('.tcw-bracket-bar')!;

describe('WidgetBracketBar', () => {
  it('is a group named for the bracket in hand, hidden until one is', () => {
    expect(el().hidden).toBe(true);
    expect(el().getAttribute('role')).toBe('group');
    bar.show('buy');
    expect(el().hidden).toBe(false);
    expect(el().getAttribute('aria-label')).toBe('Long bracket');
    bar.show('sell');
    expect(el().getAttribute('aria-label')).toBe('Short bracket');
  });

  it('marks its side, so Place takes the side’s colour', () => {
    bar.show('sell');
    expect(el().dataset.side).toBe('sell');
    expect(el().querySelector('.tcw-bracket-confirm')?.textContent).toBe('Place');
  });

  it('places or cancels', () => {
    bar.show('buy');
    el().querySelector<HTMLButtonElement>('.tcw-bracket-confirm')!.click();
    el().querySelector<HTMLButtonElement>('.tcw-bracket-cancel')!.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('WidgetBracketBar in a right-to-left widget', () => {
  it('reads in the widget’s direction, though the chart it sits on is left to right', () => {
    const root = document.createElement('div');
    root.className = 'tcw-root';
    root.dir = 'rtl';
    const chart = document.createElement('div');
    chart.dir = 'ltr';
    root.appendChild(chart);
    document.body.appendChild(root);
    const rtl = new WidgetBracketBar(chart, { onConfirm, onCancel });
    rtl.show('buy');
    expect(chart.querySelector<HTMLElement>('.tcw-bracket-bar')!.dir).toBe('rtl');
    rtl.destroy();
    root.remove();
  });
});
