import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';

/**
 * Renders volume histogram bars at the bottom of the main chart area.
 * Semi-transparent, colored by candle direction.
 * Height proportional to volume, occupying bottom 15-25% of chart.
 */
export class VolumeRenderer {
  private visible = true;
  private heightRatio = 0.2; // 20% of chart height

  setVisible(v: boolean): void { this.visible = v; }
  setHeightRatio(r: number): void { this.heightRatio = Math.max(0.05, Math.min(0.5, r)); }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;

    const { from, to } = viewport.visibleRange;
    const { chartRect } = viewport;
    const barWidth = viewport.barWidth;
    const halfBar = barWidth / 2;

    // Pre-compute constants
    const barUnit = barWidth + viewport.barSpacing;
    const offsetX = -viewport.offset + chartRect.x + halfBar;

    // Find max volume in visible range
    let maxVol = 0;
    for (let i = from; i <= to && i < data.length; i++) {
      if (data[i].volume > maxVol) maxVol = data[i].volume;
    }
    if (maxVol === 0) return;

    const volumeAreaHeight = chartRect.height * this.heightRatio;
    const volumeBottom = chartRect.y + chartRect.height;
    const volScale = volumeAreaHeight / maxVol;

    // Batch by color
    const upPath = new Path2D();
    const downPath = new Path2D();

    for (let i = from; i <= to && i < data.length; i++) {
      const bar = data[i];
      const x = i * barUnit + offsetX;
      const barHeight = bar.volume * volScale;
      const path = bar.close >= bar.open ? upPath : downPath;
      path.rect(x - halfBar, volumeBottom - barHeight, barWidth, barHeight);
    }

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.candleUp;
    ctx.fill(upPath);
    ctx.fillStyle = theme.candleDown;
    ctx.fill(downPath);
    ctx.globalAlpha = 1;
  }
}
