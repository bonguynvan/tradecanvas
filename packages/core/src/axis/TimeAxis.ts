import type { ViewportState, Theme, DataSeries } from '@tradecanvas/commons';
import { timeParts, tzLabel } from '@tradecanvas/commons';

const _pad2 = (n: number) => n < 10 ? '0' + n : '' + n;

export class TimeAxis {
  /** null = browser-local timezone; a number = fixed UTC offset in minutes. */
  private tzOffsetMinutes: number | null = null;

  setTimezoneOffset(minutes: number | null): void {
    this.tzOffsetMinutes = minutes;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries, axisYOverride?: number): void {
    const { chartRect } = viewport;
    const axisY = axisYOverride ?? (chartRect.y + chartRect.height);

    // Subtle horizontal divider
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(chartRect.x, axisY + 0.5);
    ctx.lineTo(chartRect.x + chartRect.width, axisY + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Time labels
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const minLabelSpacing = 80;
    const barsPerLabel = Math.max(1, Math.ceil(minLabelSpacing / barUnit));
    const { from, to } = viewport.visibleRange;
    const offsetX = -viewport.offset + chartRect.x + viewport.barWidth / 2;

    ctx.font = `500 ${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.axisLabel;

    // Detect timeframe from bar spacing (approximate)
    let prevDay = -1;

    for (let i = from; i <= to && i < data.length; i++) {
      if (i % barsPerLabel !== 0) continue;
      const x = i * barUnit + offsetX;

      // Handle both milliseconds and seconds timestamps
      const rawTime = data[i].time;
      const timeMs = rawTime > 1e12 ? rawTime : rawTime * 1000;
      const { day, month, hours, minutes } = timeParts(timeMs, this.tzOffsetMinutes);

      // Smart format: show date on day change, time otherwise
      let label: string;
      if (day !== prevDay) {
        label = `${month}/${day}`;
        prevDay = day;
      } else {
        label = `${_pad2(hours)}:${_pad2(minutes)}`;
      }

      ctx.fillText(label, x, axisY + 7);
    }

    // ─── Timezone indicator (bottom-right, like TradingView) ───
    const tzX = chartRect.x + chartRect.width - 4;
    const tzY = axisY + 7;
    ctx.font = `500 ${theme.font.sizeSmall - 1}px ${theme.font.family}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(tzLabel(this.tzOffsetMinutes), tzX, tzY);
    ctx.globalAlpha = 1;
  }
}
