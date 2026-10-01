import { describe, it, expect, vi } from 'vitest';
import { RiskRewardTool } from '../tools/RiskReward.js';
import { drawing, unitViewport } from './fixtures.js';

function mockCtx() {
  const fillTextCalls: string[] = [];
  return {
    ctx: {
      fillText: vi.fn((text: string) => fillTextCalls.push(text)),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      set font(_v: string) {},
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set lineWidth(_v: number) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
      setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D,
    fillTextCalls,
  };
}

describe('RiskRewardTool', () => {
  const tool = new RiskRewardTool();

  it('infers "Long" when the stop sits below the entry', () => {
    const state = drawing('riskReward', [
      { time: 0, price: 50 },
      { time: 10, price: 40 },
    ]);
    const { ctx, fillTextCalls } = mockCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(fillTextCalls).toContain('Long');
  });

  it('infers "Short" when the stop sits above the entry', () => {
    const state = drawing('riskReward', [
      { time: 0, price: 50 },
      { time: 10, price: 60 },
    ]);
    const { ctx, fillTextCalls } = mockCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(fillTextCalls).toContain('Short');
  });

  it('sizes the reward zone at 2x the risk by default', () => {
    const state = drawing('riskReward', [
      { time: 0, price: 50 },
      { time: 10, price: 40 },
    ]);
    const { ctx, fillTextCalls } = mockCtx();
    tool.render(ctx, state, unitViewport, false);
    // risk = 10, reward = 20 -> target = 70.
    expect(fillTextCalls.some((t) => t.includes('Reward 20.00'))).toBe(true);
  });

  it('hits inside the combined risk/reward bounding box', () => {
    const state = drawing('riskReward', [
      { time: 0, price: 50 },
      { time: 10, price: 40 },
    ]);
    expect(tool.hitTest({ x: 55, y: 45 }, state, unitViewport, 2)).toBe(true);
  });

  it('misses points well outside the bounding box', () => {
    const state = drawing('riskReward', [
      { time: 0, price: 50 },
      { time: 10, price: 40 },
    ]);
    expect(tool.hitTest({ x: 500, y: 5 }, state, unitViewport, 2)).toBe(false);
  });

  it('returns false when the drawing has fewer than two anchors', () => {
    const state = drawing('riskReward', [{ time: 0, price: 50 }]);
    expect(tool.hitTest({ x: 5, y: 50 }, state, unitViewport, 2)).toBe(false);
  });
});
