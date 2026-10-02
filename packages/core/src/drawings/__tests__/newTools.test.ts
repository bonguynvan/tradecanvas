import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { NoteTool, CalloutTool, FlagTool, ArrowMarkTool, IconTool, arrowOutline } from '../tools/annotations.js';
import { BrushTool, PathTool, PolylineTool, CurveTool, ArcTool, curvePoints, arcPoints } from '../tools/freehand.js';
import { FibCirclesTool, FibArcsTool, FibWedgeTool, FibSpiralTool, PitchfanTool, GannSquareTool } from '../tools/fibGeometry.js';
import { ElliottImpulseTool, ElliottTripleComboTool, waveLabel } from '../tools/ElliottWave.js';
import { ThreeDrivesTool, CypherPatternTool } from '../tools/patterns.js';
import { TimeCyclesTool, SineLineTool } from '../tools/cycles.js';
import { ForecastTool, ProjectionTool, BarsPatternTool, forecastOutcome } from '../tools/forecast.js';
import { wrapText } from '../tools/textBox.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

const vp = unitViewport;
// unitViewport: bar index N sits at x = N * 10 + 5; price p at y = 100 - p.
const at = (bar: number, price: number) => ({ time: bar, price });

describe('wrapText', () => {
  const measure = (t: string) => t.length * 6;

  it('wraps words at the width and keeps line breaks', () => {
    expect(wrapText(measure, 'one two three four', 60)).toEqual(['one two', 'three four']);
    expect(wrapText(measure, 'a\nb', 60)).toEqual(['a', 'b']);
  });

  it('cuts a word longer than a line', () => {
    const [line] = wrapText(measure, 'abcdefghijklmnopqrstuvwxyz', 60);
    expect(line.endsWith('…')).toBe(true);
    expect(measure(line)).toBeLessThanOrEqual(60);
  });
});

describe('note and callout', () => {
  it('a note shows its text beside a pin, and is hit on either', () => {
    const tool = new NoteTool();
    const note = drawing('note', [at(10, 50)], { style: { text: 'Earnings' } as never });
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, note, vp, false);
    expect(texts).toContain('Earnings');
    expect(tool.hitTest({ x: 105, y: 34 }, note, vp, 4)).toBe(true); // the pin's head
    expect(tool.hitTest({ x: 130, y: 30 }, note, vp, 4)).toBe(true); // the box
    expect(tool.hitTest({ x: 105, y: 90 }, note, vp, 4)).toBe(false);
  });

  it('a note with its text hidden is just a pin', () => {
    const tool = new NoteTool();
    const note = drawing('note', [at(10, 50)], { options: { showText: false } });
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, note, vp, false);
    expect(texts).toEqual([]);
    expect(tool.hitTest({ x: 130, y: 30 }, note, vp, 4)).toBe(false);
  });

  it('a callout points from its box at the point', () => {
    const tool = new CalloutTool();
    const callout = drawing('callout', [at(10, 50), at(30, 90)], { style: { text: 'Gap' } as never });
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, callout, vp, false);
    expect(texts).toContain('Gap');
    // On the pointer, halfway between the box and the point.
    expect(tool.hitTest({ x: 105, y: 50 }, callout, vp, 4)).toBe(true);
  });
});

describe('marks', () => {
  it('an up arrow has its tip on the point and its body below', () => {
    const outline = arrowOutline({ x: 50, y: 50 }, { x: 0, y: -1 }, 20);
    expect(outline[0]).toEqual({ x: 50, y: 50 });
    expect(Math.max(...outline.map((p) => p.y))).toBe(70);
  });

  it('an arrow mark turns with its direction', () => {
    const tool = new ArrowMarkTool();
    const down = drawing('arrowMark', [at(10, 50)], { options: { direction: 'down', size: 20 } });
    expect(tool.hitTest({ x: 105, y: 40 }, down, vp, 0)).toBe(true); // above the tip
    expect(tool.hitTest({ x: 105, y: 60 }, down, vp, 0)).toBe(false);
  });

  it('a flag and an icon are hit around their point', () => {
    expect(new FlagTool().hitTest({ x: 110, y: 35 }, drawing('flag', [at(10, 50)]), vp, 0)).toBe(true);
    const icon = drawing('icon', [at(10, 50)], { options: { glyph: 'heart', size: 20 } });
    const tool = new IconTool();
    expect(tool.hitTest({ x: 112, y: 55 }, icon, vp, 0)).toBe(true);
    expect(tool.hitTest({ x: 140, y: 55 }, icon, vp, 0)).toBe(false);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, drawing('icon', [at(10, 50)], { options: { glyph: 'check' } }), vp, false);
    expect(calls.some((c) => c.name === 'stroke')).toBe(true); // a tick is stroked, not filled
  });
});

describe('freehand, path and curves', () => {
  it('a stroke has no handles and is hit along its line', () => {
    const tool = new BrushTool();
    const stroke = drawing('brush', [at(1, 50), at(5, 50), at(9, 60)]);
    expect(tool.hitTestAnchor()).toBe(-1);
    expect(tool.hitTest({ x: 35, y: 50 }, stroke, vp, 3)).toBe(true);
    expect(tool.hitTest({ x: 35, y: 80 }, stroke, vp, 3)).toBe(false);
  });

  it('a path ends in an arrow unless asked not to', () => {
    const tool = new PathTool();
    const count = (options = {}) => {
      const { ctx, calls } = recordingCtx();
      tool.render(ctx, drawing('path', [at(1, 50), at(5, 20), at(9, 60)], { options }), vp, false);
      return calls.filter((c) => c.name === 'stroke').length;
    };
    expect(count()).toBe(count({ arrowEnd: false }) + 1);
  });

  it('a polyline is hit inside its shape', () => {
    const tool = new PolylineTool();
    const shape = drawing('polyline', [at(0, 90), at(10, 90), at(5, 10)]);
    expect(tool.hitTest({ x: 55, y: 30 }, shape, vp, 2)).toBe(true);
    expect(tool.hitTest({ x: 150, y: 30 }, shape, vp, 2)).toBe(false);
  });

  it('a curve passes through its third point halfway', () => {
    const pts = curvePoints({ x: 0, y: 0 }, { x: 50, y: 40 }, { x: 100, y: 0 }, 2);
    expect(pts[1]).toEqual({ x: 50, y: 40 });
    expect(new CurveTool().hitTest({ x: 55, y: 30 }, drawing('curve', [at(0, 90), at(10, 90), at(5, 70)]), vp, 3)).toBe(true);
  });

  it('an arc runs from its start to its end through its third point', () => {
    const pts = arcPoints({ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }, 64);
    expect(pts[0].x).toBeCloseTo(0);
    expect(pts[64].x).toBeCloseTo(100);
    expect(pts.some((p) => Math.hypot(p.x - 50, p.y - 50) < 3)).toBe(true);
    expect(arcPoints({ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 })).toHaveLength(2); // in a row: a line
    expect(new ArcTool().hitTest({ x: 55, y: 70 }, drawing('arc', [at(0, 90), at(10, 90), at(5, 30)]), vp, 3)).toBe(true);
  });
});

describe('Fibonacci and Gann shapes', () => {
  it('fib circles are hit on a level circle and labelled', () => {
    const tool = new FibCirclesTool();
    // Centre (55, 50), the 1.0 circle 20 px out.
    const circles = drawing('fibCircles', [at(5, 50), at(7, 50)]);
    // Straight up from the centre, off the guide line: the 0.5 circle is 10 px up.
    expect(tool.hitTest({ x: 55, y: 40 }, circles, vp, 0.5)).toBe(true);
    expect(tool.hitTest({ x: 55, y: 41 }, circles, vp, 0.5)).toBe(false);
    // Big enough for the labels to have room; the inner ones that would overlap are left out.
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('fibCircles', [at(5, 50), at(15, 50)]), vp, false);
    expect(texts).toEqual(expect.arrayContaining(['0.618', '1', '2.618']));
    expect(texts).not.toContain('0.5'); // 12 px from 0.618's
  });

  it('fib arcs open towards the end of the move, or go all the way round', () => {
    const tool = new FibArcsTool();
    const arcs = drawing('fibArcs', [at(5, 50), at(9, 50)]); // 40 px to the right
    const behind = { x: 55 - 40, y: 50 };
    expect(tool.hitTest({ x: 55 + 40, y: 50 }, arcs, vp, 1)).toBe(true);
    expect(tool.hitTest(behind, arcs, vp, 1)).toBe(false);
    expect(tool.hitTest(behind, drawing('fibArcs', arcs.anchors, { options: { fullCircles: true } }), vp, 1)).toBe(true);
  });

  it('a fib wedge draws its arcs between its two lines', () => {
    const tool = new FibWedgeTool();
    const wedge = drawing('fibWedge', [at(0, 50), at(10, 50), at(0, 0)]); // right, then down
    expect(tool.hitTest({ x: 5 + 100 * 0.5 * Math.SQRT1_2, y: 50 + 100 * 0.5 * Math.SQRT1_2 }, wedge, vp, 1)).toBe(true);
  });

  it('a pitchfan casts rays from its pivot through the levels between the two points', () => {
    const tool = new PitchfanTool();
    const fan = drawing('pitchfan', [at(0, 50), at(10, 90), at(10, 10)]);
    // Through the middle of the two points: straight right along y = 50.
    expect(tool.hitTest({ x: 300, y: 50 }, fan, vp, 1)).toBe(true);
  });

  it('a fib spiral grows outward from its start', () => {
    const tool = new FibSpiralTool();
    const spiral = drawing('fibSpiral', [at(50, 50), at(52, 50)]);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, spiral, vp, false);
    const xs = calls.filter((c) => c.name === 'lineTo').map((c) => Math.abs((c.args[0] as number) - 505));
    expect(Math.max(...xs)).toBeGreaterThan(200);
    expect(tool.hitTest({ x: 525, y: 50 }, spiral, vp, 2)).toBe(true); // its start
  });

  it('a Gann square is hit on its box and diagonals', () => {
    const tool = new GannSquareTool();
    const square = drawing('gannSquare', [at(0, 90), at(10, 10)]);
    expect(tool.hitTest({ x: 55, y: 10 }, square, vp, 1)).toBe(true); // top edge
    expect(tool.hitTest({ x: 55, y: 50 }, square, vp, 1)).toBe(true); // the centre, on a diagonal
  });
});

describe('Elliott waves', () => {
  it('writes labels in the style of the degree', () => {
    expect(waveLabel('3', 'primary')).toBe('③');
    expect(waveLabel('B', 'primary')).toBe('Ⓑ');
    expect(waveLabel('3', 'intermediate')).toBe('(3)');
    expect(waveLabel('4', 'minute')).toBe('iv');
    expect(waveLabel('W', 'minute')).toBe('w');
    expect(waveLabel('5', 'minor')).toBe('5');
  });

  it('labels each turning point of an impulse and a triple combo', () => {
    const { ctx, texts } = recordingCtx();
    const pts = [0, 1, 2, 3, 4, 5].map((i) => at(i, i % 2 ? 60 : 40));
    new ElliottImpulseTool().render(ctx, drawing('elliottImpulse', pts, { options: { degree: 'intermediate' } }), vp, false);
    expect(texts).toEqual(['(0)', '(1)', '(2)', '(3)', '(4)', '(5)']);
    const combo = recordingCtx();
    new ElliottTripleComboTool().render(combo.ctx, drawing('elliottTripleCombo', pts), vp, false);
    expect(combo.texts).toEqual(['0', 'W', 'X', 'Y', 'X', 'Z']);
  });
});

describe('patterns', () => {
  it('three drives shows each drive against its pullback', () => {
    const { ctx, texts } = recordingCtx();
    // Pullback A 20, drive 2 30 → 1.500; pullback B 10, drive 3 25 → 2.500.
    const pts = [at(0, 10), at(1, 50), at(2, 30), at(3, 60), at(4, 50), at(5, 75)];
    new ThreeDrivesTool().render(ctx, drawing('threeDrives', pts), vp, false);
    expect(texts).toEqual(expect.arrayContaining(['1', 'A', '2', 'B', '3', '1.500', '2.500']));
  });

  it('a cypher measures D against X to C', () => {
    const { ctx, texts } = recordingCtx();
    // X 10, A 50, B 30, C 60, D 20: CD 40 / XC 50 = 0.800.
    new CypherPatternTool().render(ctx, drawing('cypherPattern', [at(0, 10), at(1, 50), at(2, 30), at(3, 60), at(4, 20)]), vp, false);
    expect(texts).toContain('0.800');
  });
});

describe('cycles', () => {
  it('time cycles repeat a cycle’s length to the edge of the chart', () => {
    const tool = new TimeCyclesTool();
    const cycles = drawing('timeCycles', [at(0, 50), at(10, 50)]); // 100 px long
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, cycles, vp, false);
    expect(calls.filter((c) => c.name === 'fill')).toHaveLength(10); // 1000 px wide chart
    expect(tool.hitTest({ x: 155, y: 0 }, cycles, vp, 1)).toBe(true); // the top of the second cycle
  });

  it('a sine line passes through both points', () => {
    const tool = new SineLineTool();
    const sine = drawing('sineLine', [at(10, 80), at(20, 40)]);
    expect(tool.hitTest({ x: 105, y: 20 }, sine, vp, 2)).toBe(true); // peak
    expect(tool.hitTest({ x: 205, y: 60 }, sine, vp, 2)).toBe(true); // trough
    expect(tool.hitTest({ x: 305, y: 20 }, sine, vp, 2)).toBe(true); // the next peak
  });
});

const bar = (time: number, low: number, high: number, open = low, close = high): OHLCBar =>
  ({ time, open, high, low, close, volume: 1 });

describe('forecast, projection and bars pattern', () => {
  it('a forecast is reached when a later bar touches the target, missed when its time passes first', () => {
    const from = { time: 1, price: 10 };
    expect(forecastOutcome([bar(1, 9, 11), bar(2, 10, 15)], from, { time: 5, price: 14 })).toBe('reached');
    expect(forecastOutcome([bar(1, 9, 11), bar(6, 10, 12)], from, { time: 5, price: 14 })).toBe('missed');
    expect(forecastOutcome([bar(1, 9, 11), bar(2, 10, 12)], from, { time: 5, price: 14 })).toBe('pending');
    expect(forecastOutcome([bar(1, 9, 11), bar(2, 4, 10)], from, { time: 5, price: 5 })).toBe('reached'); // down
  });

  it('a forecast says how it went', () => {
    const tool = new ForecastTool();
    tool.setDataGetter(() => [bar(0, 40, 50), bar(1, 50, 70)]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('forecast', [at(0, 50), at(5, 60)]), vp, false);
    expect(texts).toContain('Target reached');
    expect(texts.some((t) => t.startsWith('+10.00'))).toBe(true);
  });

  it('a projection carries the move over from its third point', () => {
    const tool = new ProjectionTool();
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('projection', [at(0, 20), at(5, 40), at(10, 30)]), vp, false);
    expect(texts).toContain('50.00'); // 30 + (40 − 20)
    expect(tool.hitTest({ x: 130, y: 60 }, drawing('projection', [at(0, 20), at(5, 40), at(10, 30)]), vp, 2)).toBe(true);
  });

  it('a bars pattern copies the bars to its third point, upside down when flipped', () => {
    const tool = new BarsPatternTool();
    const data = [bar(0, 10, 20, 10, 20), bar(1, 20, 30, 20, 30), bar(2, 30, 40, 30, 40)];
    tool.setDataGetter(() => data);
    const copy = drawing('barsPattern', [at(0, 10), at(2, 40), at(20, 50)]);
    // The copy opens at 50 and rises 30: its top bar's high is at 80 (y 20).
    expect(tool.hitTest({ x: 225, y: 21 }, copy, vp, 0)).toBe(true);
    const flipped = drawing('barsPattern', copy.anchors, { options: { flipped: true } });
    expect(tool.hitTest({ x: 225, y: 21 }, flipped, vp, 0)).toBe(false);
    expect(tool.hitTest({ x: 225, y: 79 }, flipped, vp, 0)).toBe(true); // falls to 20
  });
});

describe('review cases', () => {
  it('a forecast is missed when the target is only touched after its time', () => {
    expect(forecastOutcome([bar(1, 9, 11), bar(6, 10, 15)], { time: 1, price: 10 }, { time: 5, price: 14 })).toBe('missed');
  });

  it('a bars pattern before the first bar copies nothing', () => {
    const tool = new BarsPatternTool();
    const data = Array.from({ length: 1000 }, (_, i) => bar(100 + i, 10, 20));
    tool.setDataGetter(() => data);
    const copy = drawing('barsPattern', [at(5, 10), at(10, 40), at(20, 50)]);
    expect(tool.hitTest({ x: 225, y: 60 }, copy, vp, 0)).toBe(false);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, copy, vp, false);
    expect(calls.filter((c) => c.name === 'fillRect' || c.name === 'strokeRect')).toHaveLength(0);
  });

  it('time cycles are drawn where the chart is, however far from their first one', () => {
    const tool = new TimeCyclesTool();
    // Cycles of 2 bars (20 px) starting 500 bars left of the chart.
    const cycles = drawing('timeCycles', [at(-500, 50), at(-498, 50)]);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, cycles, vp, false);
    expect(calls.filter((c) => c.name === 'fill').length).toBeGreaterThan(40);
    expect(tool.hitTest({ x: 15, y: 40 }, cycles, vp, 1)).toBe(true); // the top of the cycle over x 5–25
  });

  it('cuts a long word quickly', () => {
    let calls = 0;
    const measure = (t: string) => { calls++; return t.length * 6; };
    const [line] = wrapText(measure, 'x'.repeat(2000), 120);
    expect(measure(line)).toBeLessThanOrEqual(120);
    expect(calls).toBeLessThan(40);
  });
});
