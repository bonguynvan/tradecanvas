import type { CommissionModel } from './types.js';

export class FixedCommission implements CommissionModel {
  constructor(private readonly perTrade: number) {}

  calculate(): number {
    return this.perTrade;
  }
}

export class PercentCommission implements CommissionModel {
  /** rate = 0.001 → 10 bps per trade notional. */
  constructor(private readonly rate: number) {}

  calculate(quantity: number, price: number): number {
    return Math.abs(quantity) * price * this.rate;
  }
}

export class PerShareCommission implements CommissionModel {
  /** Minimum total commission per trade (optional). */
  constructor(
    private readonly perShare: number,
    private readonly minimum = 0,
  ) {}

  calculate(quantity: number): number {
    return Math.max(this.minimum, Math.abs(quantity) * this.perShare);
  }
}

export const ZERO_COMMISSION: CommissionModel = {
  calculate: () => 0,
};
