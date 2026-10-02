import { describe, it, expect } from 'vitest';
import { TrendLineTool } from '../tools/TrendLine.js';
import { RayTool } from '../tools/Ray.js';
import { ExtendedLineTool } from '../tools/ExtendedLine.js';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { HorizontalRayTool } from '../tools/HorizontalRay.js';
import { ParallelChannelTool } from '../tools/ParallelChannel.js';
import { drawing } from './fixtures.js';

// A line from (time 100, price 10) to (time 200, price 20): +0.1 per unit of time.
const LINE = [{ time: 100, price: 10 }, { time: 200, price: 20 }];

describe('the price of a drawing’s lines at a time', () => {
  it('a trend line reaches only between its anchors unless extended', () => {
    const tool = new TrendLineTool();
    expect(tool.priceAt(drawing('trendLine', LINE), 150)).toEqual([15]);
    expect(tool.priceAt(drawing('trendLine', LINE), 250)).toBeNull();
    expect(tool.priceAt(drawing('trendLine', LINE, { options: { extendRight: true } }), 250)).toEqual([25]);
    expect(tool.priceAt(drawing('trendLine', LINE, { options: { extendLeft: true } }), 50)).toEqual([5]);
  });

  it('a trend line drawn right to left extends from its own ends', () => {
    const backwards = [LINE[1], LINE[0]];
    expect(new TrendLineTool().priceAt(drawing('trendLine', backwards, { options: { extendRight: true } }), 50)).toEqual([5]);
  });

  it('a ray runs on from its first anchor; an extended line both ways', () => {
    expect(new RayTool().priceAt(drawing('ray', LINE), 300)).toEqual([30]);
    expect(new RayTool().priceAt(drawing('ray', LINE), 50)).toBeNull();
    expect(new ExtendedLineTool().priceAt(drawing('extendedLine', LINE), 50)).toEqual([5]);
  });

  it('horizontal lines sit at their price; a horizontal ray from its anchor on', () => {
    expect(new HorizontalLineTool().priceAt(drawing('horizontalLine', [{ time: 100, price: 42 }]), 5)).toEqual([42]);
    expect(new HorizontalRayTool().priceAt(drawing('horizontalRay', [{ time: 100, price: 42 }]), 150)).toEqual([42]);
    expect(new HorizontalRayTool().priceAt(drawing('horizontalRay', [{ time: 100, price: 42 }]), 50)).toBeNull();
  });

  it('a channel gives both lines, and the middle one when it is drawn', () => {
    const anchors = [...LINE, { time: 150, price: 25 }]; // 10 above the base line at time 150
    const tool = new ParallelChannelTool();
    expect(tool.priceAt(drawing('parallelChannel', anchors), 150)).toEqual([15, 25]);
    expect(tool.priceAt(drawing('parallelChannel', anchors, { options: { middleLine: true } }), 150)).toEqual([15, 25, 20]);
  });
});
