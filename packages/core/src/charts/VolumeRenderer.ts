import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { resolveVolumeColors } from '@tradecanvas/commons';
import { forEachPixelColumn, isDense } from './denseBars.js';
import { barColumns, inDevicePixels } from './pixelGrid.js';

/**
 * Volume histogram along the bottom of the main chart: the theme's volume
 * colours by bar direction (`resolveVolumeColors`), on whole device pixels and lined up with the
 * candle bodies above. It keeps to the bottom 15% by default, so the bars stay
 * a backdrop and the candles above stay clear of them.
 */
export class VolumeRenderer {
  private visible = true;
  private heightRatio = 0.15;

  setVisible(v: boolean): void { this.visible = v; }
  setHeightRatio(r: number): void { this.heightRatio = Math.max(0.05, Math.min(0.5, r)); }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;

    const { from, to } = viewport.visibleRange;
    const { chartRect } = viewport;
    const barWidth = viewport.barWidth;
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + chartRect.x + barWidth / 2;

    let maxVol = 0;
    for (let i = from; i <= to && i < data.length; i++) {
      if (data[i].volume > maxVol) maxVol = data[i].volume;
    }
    if (maxVol === 0) return;

    const volumeBottom = chartRect.y + chartRect.height;
    const volScale = (chartRect.height * this.heightRatio) / maxVol;

    inDevicePixels(ctx, (px) => {
      const up = new Path2D();
      const down = new Path2D();
      const bottom = px.y(volumeBottom);
      const column = (path: Path2D, left: number, width: number, volume: number) => {
        const top = px.y(volumeBottom - volume * volScale);
        if (bottom - top >= 1) path.rect(left, top, width, bottom - top);
      };

      if (isDense(viewport)) {
        // One bar per CSS-pixel column, reaching the next column with no gap
        // (at 125% a column is 1 or 2 device pixels): its largest volume, its direction.
        forEachPixelColumn(data, from, to, (i) => i * barUnit + offsetX, (c) => {
          const left = px.x(c.x);
          column(c.close >= c.open ? up : down, left, Math.max(1, px.x(c.x + 1) - left), c.volume);
        });
      } else {
        // Lined up with the candle bodies above.
        const { body, wick } = barColumns(barWidth, px.ratio);
        const inset = (body - wick) / 2;
        for (let i = from; i <= to && i < data.length; i++) {
          const bar = data[i];
          column(bar.close >= bar.open ? up : down, px.left(i * barUnit + offsetX, wick) - inset, body, bar.volume);
        }
      }

      const colors = resolveVolumeColors(theme);
      ctx.fillStyle = colors.up;
      ctx.fill(up);
      ctx.fillStyle = colors.down;
      ctx.fill(down);
    });
  }
}
