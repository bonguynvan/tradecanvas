import type { CounterClockOptions, OHLCBar, Theme } from '@tradecanvas/commons';
import { computeCounterClockLayout, counterClockPhase, counterClockPoints, nearestCounterClockPoint, renderCounterClock, shownCount, type CounterClockLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/**
 * Counter-clock chart: average price against average volume, bar by bar, with
 * no time axis. A healthy cycle turns counter-clockwise: volume picks up,
 * price follows, volume fades, price follows it down.
 */
export class CounterClockChart extends InteractiveChart<CounterClockOptions, CounterClockLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): CounterClockLayout {
    return computeCounterClockLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: CounterClockLayout): void {
    renderCounterClock(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    return `Counter-clock chart of price against volume, ${this.options.period ?? 25}-bar averages`;
  }

  protected clickable(): boolean {
    return this.options.onPointClick !== undefined;
  }

  protected hits(layout: CounterClockLayout, x: number, y: number): boolean {
    return nearestCounterClockPoint(layout, x, y) !== null;
  }

  protected clickAt(layout: CounterClockLayout, x: number, y: number): void {
    const hit = nearestCounterClockPoint(layout, x, y);
    if (hit) this.options.onPointClick?.(hit.point);
  }

  /** The phase of the newest move, 1–8 counter-clockwise from volume rising (see `counterClockPhase`), or null. */
  getPhase(): number | null {
    return counterClockPhase(counterClockPoints(this.options.data, this.options.period ?? 25, shownCount(this.options)));
  }

  update(data: OHLCBar[]): void {
    this.setOptions({ data });
  }
}
