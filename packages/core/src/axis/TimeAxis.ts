import type { ViewportState, Theme, DataSeries, TimeFormatContext, TimeFormatter, TimeZoneSetting } from '@tradecanvas/commons';
import { timeParts, tzLabel, isDateOnly, barsAreDaily, barTimeUnit } from '@tradecanvas/commons';
import { barIndexToTime } from '../viewport/ScaleMapping.js';

const _pad2 = (n: number) => n < 10 ? '0' + n : '' + n;

/** Space kept between the last tick label and the timezone tag. */
export const TZ_LABEL_GAP_PX = 8;

export class TimeAxis {
  /** An IANA zone, a fixed UTC offset in minutes, or null for the browser's zone. */
  private tz: TimeZoneSetting = null;
  private timeFormatter: TimeFormatter | null = null;
  private timesPastData = true;

  setTimezoneOffset(tz: TimeZoneSetting): void {
    this.tz = tz;
  }

  /** Labels in your words, or null for its own. */
  setTimeFormatter(formatter: TimeFormatter | null): void {
    this.timeFormatter = formatter;
  }

  /**
   * Whether the empty slots past either end of the data get times extrapolated
   * from the bars' spacing. Off for bars not evenly spaced in time (tick bars,
   * Renko bricks): there, a slot has no time of its own.
   */
  setTimesPastData(on: boolean): void {
    this.timesPastData = on;
  }

  getTimesPastData(): boolean {
    return this.timesPastData;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, data: DataSeries, axisYOverride?: number): void {
    const { chartRect } = viewport;
    const axisY = axisYOverride ?? (chartRect.y + chartRect.height);

    // Subtle horizontal divider
    ctx.strokeStyle = theme.style?.axis.time.line ?? theme.axisLine;
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
    const offsetX = -viewport.offset + chartRect.x + viewport.barWidth / 2;
    // Label every slot on screen from the oldest bar on, including the empty
    // future right of the newest bar, which the chart can be panned into.
    // Left of the oldest bar there is no date to give: history not loaded
    // yet, whose bars would not fall on calendar steps from it.
    const from = Math.max(Math.floor(viewport.offset / barUnit), 0);
    let to = Math.ceil((viewport.offset + chartRect.width) / barUnit);
    if (!this.timesPastData) to = Math.min(to, data.length - 1);
    // Seconds or milliseconds, decided once for the series: an old
    // millisecond bar must not pass for seconds.
    const unit = barTimeUnit(data);

    // The timezone tag sits at the right end: measure it first so a tick
    // label never draws on top of it (they used to merge into "UTC10/2").
    // The offset in force at the right edge: it changes with daylight saving.
    const rightTime = data.length > 0 ? barIndexToTime(Math.min(to, data.length - 1), data) : Date.now();
    const tzText = tzLabel(this.tz, rightTime * unit);
    const tzFont = `500 ${theme.font.sizeSmall - 1}px ${theme.font.family}`;
    const tzRight = chartRect.x + chartRect.width - 4;
    ctx.font = tzFont;
    const tzLeft = tzRight - ctx.measureText(tzText).width - TZ_LABEL_GAP_PX;

    ctx.font = `500 ${theme.font.sizeSmall}px ${theme.font.family}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.style?.axis.time.text ?? theme.axisLabel;

    // Daily-or-larger bars carry dates (with the year); intraday ones show the
    // day where it changes and the time elsewhere, a midnight bar included.
    const daily = barsAreDaily(data);
    let prevDay = '';

    for (let i = from; i <= to && data.length > 0; i++) {
      if (i % barsPerLabel !== 0) continue;
      const x = i * barUnit + offsetX;

      const timeMs = barIndexToTime(i, data) * unit;
      const parts = timeParts(timeMs, this.tz);
      const { year, day, month, hours, minutes } = parts;

      // Smart format: a daily/weekly/monthly/yearly bar has no time-of-day component at all —
      // `month/day` alone is ambiguous across years (a Year chart's handful of bars can span
      // decades), so it carries the year instead. Otherwise show date on day change, time
      // otherwise.
      let kind: TimeFormatContext['kind'];
      if (daily ?? isDateOnly(parts)) {
        kind = 'date';
      } else if (`${year}-${month}-${day}` !== prevDay) {
        // The whole date: a label a month on can fall on the same day.
        kind = 'day';
        prevDay = `${year}-${month}-${day}`;
      } else {
        kind = 'time';
      }
      const label = this.timeFormatter
        ? this.timeFormatter(timeMs, { kind, timeZone: this.tz })
        : kind === 'date' ? `${month}/${day}/${year}`
          : kind === 'day' ? `${month}/${day}`
            : `${_pad2(hours)}:${_pad2(minutes)}`;

      if (x + ctx.measureText(label).width / 2 > tzLeft) continue;
      ctx.fillText(label, x, axisY + 7);
    }

    // ─── Timezone indicator (bottom-right) ───
    ctx.font = tzFont;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(tzText, tzRight, axisY + 7);
    ctx.globalAlpha = 1;
  }
}
