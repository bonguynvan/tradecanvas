// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetIndicatorLegend, type IndicatorLegendRow } from '../WidgetIndicatorLegend.js';

/** Stand-in for the browser's ResizeObserver: the test says when a box was laid out, and how wide. */
class FakeResizeObserver {
  static last: FakeResizeObserver;
  readonly observed = new Set<Element>();
  disconnected = false;
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.last = this;
  }
  observe(el: Element): void { this.observed.add(el); }
  unobserve(el: Element): void { this.observed.delete(el); }
  disconnect(): void { this.disconnected = true; this.observed.clear(); }
  /** `el` laid out `width` px wide. */
  resize(el: Element, width: number): void {
    const entry = { target: el, contentRect: { width, height: 19 } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

const LABELS = { show: 'Show', hide: 'Hide', settings: 'Settings', remove: 'Remove', collapse: 'Collapse', expand: 'Expand' };
const row = (instanceId: string, values: string[]): IndicatorLegendRow => ({
  instanceId, label: instanceId, visible: true, pane: null, values: values.map((text) => ({ text, color: null })),
});

let host: HTMLDivElement;
let legend: WidgetIndicatorLegend;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  host = document.createElement('div');
  document.body.appendChild(host);
  legend = new WidgetIndicatorLegend(host, { onToggleVisible: () => {}, onSettings: () => {}, onRemove: () => {} }, LABELS);
});

afterEach(() => {
  legend.destroy();
  host.remove();
  vi.unstubAllGlobals();
});

const valuesOf = (id: string) => host.querySelector<HTMLElement>(`[data-instance="${id}"] .tcw-ind-legend-values`)!;
const noRoom = (el: HTMLElement) => el.classList.contains('tcw-ind-legend-values--no-room');

describe('an indicator legend’s values in a narrow chart', () => {
  // At 320 Bollinger's values box was 6 px: too narrow for even an ellipsis, it showed a sliver.
  it('hide when their box is narrower than a digit and an ellipsis, the name left to read alone', () => {
    legend.update([row('BB 20 2', ['97,527.61', '98,159.48', '96,895.74'])], { left: 0, top: 0 });
    const values = valuesOf('BB 20 2');
    values.style.fontSize = '11px';
    expect(FakeResizeObserver.last.observed.has(values)).toBe(true);
    FakeResizeObserver.last.resize(values, 6);
    expect(noRoom(values)).toBe(true);
    FakeResizeObserver.last.resize(values, 46);
    expect(noRoom(values)).toBe(false);
  });

  it('measure the room against the size of their figures', () => {
    legend.update([row('EMA 21', ['98,159.48'])], { left: 0, top: 0 });
    const values = valuesOf('EMA 21');
    values.style.fontSize = '22px';
    FakeResizeObserver.last.resize(values, 24);
    expect(noRoom(values)).toBe(true);
    values.style.fontSize = '11px';
    FakeResizeObserver.last.resize(values, 24);
    expect(noRoom(values)).toBe(false);
  });

  it('stop being watched when their row goes, and all at once when the legend does', () => {
    legend.update([row('EMA 21', ['1']), row('SMA 50', ['2'])], { left: 0, top: 0 });
    const ema = valuesOf('EMA 21');
    legend.update([row('SMA 50', ['2'])], { left: 0, top: 0 });
    expect(FakeResizeObserver.last.observed.has(ema)).toBe(false);
    expect(FakeResizeObserver.last.observed.size).toBe(1);
    legend.destroy();
    expect(FakeResizeObserver.last.disconnected).toBe(true);
  });
});
