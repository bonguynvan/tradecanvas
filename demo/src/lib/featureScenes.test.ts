import { describe, expect, it } from 'vitest';
import type { Chart } from '@tradecanvas/chart';
import type { ChartWidget } from '@tradecanvas/chart/widget';
import { FEATURE_SCENES } from './featureScenes';
import { generateBars } from './sampleData';

const HOUR = 3_600_000;

/** A chart that records what a scene asks of it. */
function recordingChart(bars = generateBars(600, 'DEMO', HOUR, 240)) {
  const drawings: Record<string, unknown>[] = [];
  const indicators: string[] = [];
  const chart = {
    getData: () => bars,
    addDrawing: (d: Record<string, unknown>) => {
      drawings.push(d);
      return `d${drawings.length}`;
    },
    addIndicator: (id: string) => {
      indicators.push(id);
      return `${id}-1`;
    },
    groupDrawings: () => 'g1',
    addDrawingAlert: () => 'a1',
    setVisibleRange: () => {},
  };
  return { chart: chart as unknown as Chart, drawings, indicators };
}

describe('the drawings scene', () => {
  const scene = FEATURE_SCENES.find((s) => s.id === 'drawings')!;
  const run = () => {
    const rec = recordingChart();
    scene.setup?.({} as ChartWidget, rec.chart, {} as never);
    return rec;
  };

  it('writes words on its trend line and names it for the object tree', () => {
    const line = run().drawings.find((d) => d.type === 'trendLine');
    expect(line?.name).toBeTruthy();
    expect((line?.style as { text?: string })?.text).toBeTruthy();
  });

  it('shows a signpost and a note kept to the screen, placed by shares of the plot', () => {
    const { drawings } = run();
    expect(drawings.map((d) => d.type)).toContain('signpost');
    const note = drawings.find((d) => d.type === 'anchoredNote');
    for (const a of note?.anchors as { time: number; price: number }[]) {
      expect(a.time).toBeGreaterThanOrEqual(0);
      expect(a.time).toBeLessThanOrEqual(1);
      expect(a.price).toBeGreaterThanOrEqual(0);
      expect(a.price).toBeLessThanOrEqual(1);
    }
  });

  // The stand-in hands back 'rsi-1'; that a real chart's indicator id names its pane is the chart's own tests' to prove.
  it('draws a level on the RSI pane', () => {
    const { drawings, indicators } = run();
    expect(indicators).toContain('rsi');
    const level = drawings.find((d) => d.paneId === 'rsi-1');
    expect(level?.type).toBe('horizontalLine');
  });

  it('shows the same calls in its code', () => {
    for (const call of ["type: 'trendLine', name:", "style: { text: 'Support'", "type: 'anchoredNote'", 'paneId: rsi']) {
      expect(scene.code).toContain(call);
    }
  });
});
