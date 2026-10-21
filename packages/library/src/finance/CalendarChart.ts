import type { CalendarChartOptions, CalendarDay, Theme } from '@tradecanvas/commons';
import { computeCalendarLayout, hitDay, renderCalendar, type CalendarLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/** A value a day on a calendar: daily returns, P&L, volume, a trading journal. */
export class CalendarChart extends InteractiveChart<CalendarChartOptions, CalendarLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): CalendarLayout {
    return computeCalendarLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: CalendarLayout): void {
    renderCalendar(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    const dates = this.options.data.map((d) => d.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    const from = this.options.from ?? dates[0];
    const to = this.options.to ?? dates[dates.length - 1];
    return from && to ? `Calendar of daily values from ${from} to ${to}` : 'Calendar of daily values';
  }

  protected clickable(): boolean {
    return this.options.onDayClick !== undefined;
  }

  protected hits(layout: CalendarLayout, x: number, y: number): boolean {
    return hitDay(layout, x, y)?.day !== undefined;
  }

  protected clickAt(layout: CalendarLayout, x: number, y: number): void {
    const day = hitDay(layout, x, y)?.day;
    if (day) this.options.onDayClick?.(day);
  }

  update(data: CalendarDay[]): void {
    this.setOptions({ data });
  }
}
