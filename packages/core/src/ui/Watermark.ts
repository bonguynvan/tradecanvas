import type { ViewportState, Theme, WatermarkConfig } from '@chart-lib/commons';

/**
 * Renders a centered watermark text on the chart background.
 * Semi-transparent, non-interactive.
 */
export class Watermark {
  private config: WatermarkConfig | null = null;

  setConfig(config: WatermarkConfig | null): void {
    this.config = config;
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.config?.text) return;

    const { chartRect } = viewport;
    const fontSize = this.config.fontSize ?? 48;
    const color = this.config.color ?? theme.textSecondary;

    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.font = `bold ${fontSize}px ${theme.font.family}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.config.text,
      chartRect.x + chartRect.width / 2,
      chartRect.y + chartRect.height / 2,
    );
    ctx.restore();
  }
}
