import { describe, it, expect } from 'vitest';
import { DrawingManager } from '../DrawingManager.js';
import { DrawingRenderer } from '../DrawingRenderer.js';
import { VerticalLineTool } from '../tools/VerticalLine.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

describe('DrawingRenderer — a bar’s time in the chart’s words', () => {
  it('hands the drawings the time format it was given', () => {
    const manager = new DrawingManager();
    manager.register(new VerticalLineTool());
    manager.setDrawings([drawing('verticalLine', [{ time: 7, price: 50 }], { options: { showTime: true } })]);
    const renderer = new DrawingRenderer(manager);
    const { ctx, texts } = recordingCtx();
    renderer.render(ctx, unitViewport);
    expect(texts).toEqual([]);
    renderer.setTimeFormat((t) => `at ${t}`);
    renderer.render(ctx, unitViewport);
    expect(texts).toEqual(['at 7']);
  });
});
