import { describe, it, expect } from 'vitest';
import { VerticalPanGate, VERTICAL_PAN_ENGAGE_PX } from '../verticalPanGate.js';

/** Feed a straight drag of (dx, dy) split into `steps` equal moves; returns the last verdict. */
function drag(gate: VerticalPanGate, dx: number, dy: number, steps = 30, autoScaleOn = true): boolean {
  let engaged = false;
  for (let i = 0; i < steps; i++) engaged = gate.step(dx / steps, dy / steps, autoScaleOn);
  return engaged;
}

describe('VerticalPanGate', () => {
  it('ignores the vertical drift of a horizontal pan', () => {
    const gate = new VerticalPanGate();
    expect(drag(gate, 300, 8)).toBe(false);
    gate.reset();
    expect(drag(gate, 300, 40)).toBe(false); // sloppy, but still mostly horizontal
  });

  it('engages on a deliberate vertical drag', () => {
    const gate = new VerticalPanGate();
    expect(drag(gate, 20, 60)).toBe(true);
  });

  it('needs more than the threshold even when purely vertical', () => {
    const gate = new VerticalPanGate();
    expect(drag(gate, 0, VERTICAL_PAN_ENGAGE_PX - 1)).toBe(false);
    expect(drag(gate, 0, 3)).toBe(true);
  });

  it('stays engaged for the rest of the gesture, and resets for the next', () => {
    const gate = new VerticalPanGate();
    drag(gate, 0, 60);
    expect(gate.step(200, 0, true)).toBe(true);
    gate.reset();
    expect(gate.step(200, 0, true)).toBe(false);
  });

  it('pans the price scale freely once auto-scale is already off', () => {
    const gate = new VerticalPanGate();
    expect(gate.step(10, 1, false)).toBe(true);
  });
});
