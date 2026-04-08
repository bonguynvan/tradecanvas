import type { ViewportState, Theme, DataSeries } from '@chart-lib/commons';

// Reusable Date object — avoid allocation per bar
const _date = new Date();
const _pad2 = (n: number) => n < 10 ? '0' + n : '' + n;

// Detect user's UTC offset once
const UTC_OFFSET_MIN = new Date().getTimezoneOffset();
const UTC_OFFSET_H = -UTC_OFFSET_MIN / 60;
const TZ_LABEL = `UTC${UTC_OFFSET_H >= 0 ? '+' : ''}${UTC_OFFSET_H}`;

export class TimeAxis {
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries, axisYOverride?: number): void {
    const { chartRect } = viewport;
    const axisY = axisYOverride ?? (chartRect.y + chartRect.height);

    // Axis line
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartRect.x, axisY + 0.5);
    ctx.lineTo(chartRect.x + chartRect.width, axisY + 0.5);
    ctx.stroke();

    // Time labels
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const minLabelSpacing = 80;
    const barsPerLabel = Math.max(1, Math.ceil(minLabelSpacing / barUnit));
    const { from, to } = viewport.visibleRange;
    const offsetX = -viewport.offset + chartRect.x + viewport.barWidth / 2;

    ctx.font = `${theme.font.sizeSmall}px ${theme.font.family}`;
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
      _date.setTime(timeMs);

      const day = _date.getDate();
      const month = _date.getMonth() + 1;
      const hours = _date.getHours();
      const minutes = _date.getMinutes();

      // Smart format: show date on day change, time otherwise
      let label: string;
      if (day !== prevDay) {
        label = `${month}/${day}`;
        prevDay = day;
      } else {
        label = `${_pad2(hours)}:${_pad2(minutes)}`;
      }

      ctx.fillText(label, x, axisY + 5);
    }

    // ─── Timezone indicator (bottom-right, like TradingView) ───
    const tzX = chartRect.x + chartRect.width - 4;
    const tzY = axisY + 4;
    ctx.font = `${theme.font.sizeSmall - 1}px ${theme.font.family}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(TZ_LABEL, tzX, tzY);
  }
}
