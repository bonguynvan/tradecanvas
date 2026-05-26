import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import type { ChartRendererInterface } from './ChartRenderer.js';

/**
 * Equivolume (Richard Arms) — boxes spanning the full high/low range with
 * width proportional to volume share. Color tracks close vs previous close
 * (not open/close), which is the classical convention.
 */
export class EquivolumeRenderer implements ChartRendererInterface {
  render(
    ctx: CanvasRenderingContext2D,
    data: DataSeries,
    viewport: ViewportState,
    theme: Theme,
  ): void {
    const { from, to } = viewport.visibleRange;
    const { min, max } = viewport.priceRange;
    const priceRange = max - min;
    if (priceRange === 0 || from > to || data.length === 0) return;

    const barUnit = viewport.barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
    const chartY = viewport.chartRect.y;
    const priceScale = viewport.chartRect.height / priceRange;
    const maxBoxWidth = viewport.barWidth;

    let maxVolume = 0;
    for (let i = from; i <= to && i < data.length; i++) {
      if (data[i].volume > maxVolume) maxVolume = data[i].volume;
    }
    if (maxVolume === 0) maxVolume = 1;

    const upBodyPath = new Path2D();
    const downBodyPath = new Path2D();
    const upEdgePath = new Path2D();
    const downEdgePath = new Path2D();

    const toX = (i: number) => i * barUnit + offsetX;
    const toY = (price: number) => chartY + (max - price) * priceScale;

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const prev = i > 0 ? data[i - 1] : bar;
      const x = toX(i);
      const highY = toY(bar.high);
      const lowY = toY(bar.low);
      const isUp = bar.close >= prev.close;

      const volRatio = Math.max(0.15, bar.volume / maxVolume);
      const w = maxBoxWidth * volRatio;
      const halfW = w / 2;
      const height = Math.max(lowY - highY, 1);

      const bodyPath = isUp ? upBodyPath : downBodyPath;
      const edgePath = isUp ? upEdgePath : downEdgePath;
      bodyPath.rect(x - halfW, highY, w, height);
      edgePath.rect(x - halfW, highY, w, height);
    }

    ctx.fillStyle = withAlpha(theme.candleUp, 0.55);
    ctx.fill(upBodyPath);
    ctx.fillStyle = withAlpha(theme.candleDown, 0.55);
    ctx.fill(downBodyPath);

    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.candleUpWick;
    ctx.stroke(upEdgePath);
    ctx.strokeStyle = theme.candleDownWick;
    ctx.stroke(downEdgePath);
  }
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      .toString(16)
      .padStart(2, '0');
    if (color.length === 7) return `${color}${a}`;
    if (color.length === 9) return `${color.slice(0, 7)}${a}`;
  }
  return color;
}
