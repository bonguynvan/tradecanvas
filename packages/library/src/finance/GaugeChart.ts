import type { GaugeOptions, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, renderGauge } from '@tradecanvas/core';

const DEFAULT_ANIMATION_MS = 500;

function easeOutCubic(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

export class GaugeChart extends BaseFinanceChart {
  private options: GaugeOptions;
  private currentValue: number;
  private targetValue: number;
  private animationStart: number | null = null;
  private animationFrom = 0;
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement, options: GaugeOptions) {
    super(container, options.theme);
    this.options = options;
    this.currentValue = options.value;
    this.targetValue = options.value;
    this.applyBaseOptions({ ariaLabel: options.ariaLabel });
    this.requestRender();
  }

  protected renderChart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: Theme,
  ): void {
    renderGauge(ctx, width, height, this.options, theme, this.currentValue);
  }

  setValue(value: number): void {
    const animate = this.options.animate !== false;
    if (!animate) {
      this.cancelAnimation();
      this.currentValue = value;
      this.targetValue = value;
      this.options = { ...this.options, value };
      this.requestRender();
      return;
    }

    this.targetValue = value;
    this.animationFrom = this.currentValue;
    this.animationStart = performance.now();
    this.options = { ...this.options, value };
    this.startAnimationLoop();
  }

  setOptions(opts: Partial<GaugeOptions>): void {
    const next = { ...this.options, ...opts };
    this.applyBaseOptions(opts);
    // If `value` is part of the partial, route through animation path
    if (opts.value !== undefined && opts.value !== this.targetValue) {
      this.options = next;
      this.setValue(opts.value);
      return;
    }
    this.options = next;
    this.requestRender();
  }

  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;
    const step = (): void => {
      this.animationFrameId = null;
      if (this.animationStart === null) return;

      const duration = this.options.animationDuration ?? DEFAULT_ANIMATION_MS;
      const elapsed = performance.now() - this.animationStart;
      const t = Math.min(1, elapsed / Math.max(1, duration));
      const eased = easeOutCubic(t);
      this.currentValue = this.animationFrom + (this.targetValue - this.animationFrom) * eased;

      this.requestRender();

      if (t < 1) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.currentValue = this.targetValue;
        this.animationStart = null;
      }
    };
    this.animationFrameId = requestAnimationFrame(step);
  }

  private cancelAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.animationStart = null;
  }

  destroy(): void {
    this.cancelAnimation();
    super.destroy();
  }
}
