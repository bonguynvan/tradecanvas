import type { OptionLeg, PayoffOptions, Theme } from '@tradecanvas/commons';
import { computePayoffLayout, payoffModelOf, renderPayoff, type PayoffLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';
import { counted } from './describe.js';

/**
 * What an options position makes or loses at expiry, over the underlying's
 * price: its breakevens, its most and its least; and with a model, what it
 * makes or loses some days before.
 */
export class PayoffChart extends InteractiveChart<PayoffOptions, PayoffLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): PayoffLayout {
    return computePayoffLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: PayoffLayout): void {
    renderPayoff(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    const payoff = `Payoff at expiry of ${counted(this.options.legs.length, 'leg')}`;
    const model = payoffModelOf(this.options);
    // The second line is said too: it is half of what the chart shows.
    return model ? `${payoff}, and its value ${counted(Math.max(0, Math.round(model.daysToExpiry)), 'day')} before` : payoff;
  }

  protected clickable(): boolean {
    return false;
  }

  protected hits(): boolean {
    return false;
  }

  protected clickAt(): void {}

  update(legs: OptionLeg[]): void {
    this.setOptions({ legs });
  }
}
