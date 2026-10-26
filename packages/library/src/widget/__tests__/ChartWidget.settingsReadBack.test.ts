// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { ChartWidget } from '../ChartWidget.js';

let host: HTMLDivElement;
let widget: ChartWidget;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  widget = new ChartWidget(host, {});
});

afterEach(() => {
  widget.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChartWidget.getSettings reads back every setting set on getChart()', () => {
  it('the switches', () => {
    const chart = widget.getChart();
    chart.setVolumeVisible(false);
    chart.setLegend({ visible: false });
    chart.setBarCountdownVisible(false);
    chart.setIndicatorValueLabelsVisible(true);
    chart.setLeftPriceScaleVisible(true);
    expect(widget.getSettings()).toMatchObject({
      volumeVisible: false, legendVisible: false, barCountdown: false, indicatorValueLabels: true, leftPriceScale: true,
    });
  });

  it("the overlays' own settings", () => {
    const chart = widget.getChart();
    chart.setMarketProfileConfig({ splitBySession: true, letters: true, buckets: 64, opacity: 0.5 });
    chart.setDepthHeatmapConfig({ opacity: 0.4 });
    chart.setPivotMarkersConfig({ left: 8, right: 8, structureLabels: true });
    chart.setPeriodLevelsPeriod('week');
    expect(widget.getSettings()).toMatchObject({
      marketProfileSplit: true, marketProfileLetters: true, marketProfileBuckets: 64, marketProfileOpacity: 0.5,
      depthHeatmapOpacity: 0.4, pivotStrength: 8, pivotStructureLabels: true, periodLevelsPeriod: 'week',
    });
  });

  it('and a layout saves them so', () => {
    widget.getChart().setVolumeVisible(false);
    widget.getChart().setLegend({ visible: false });
    const saved = JSON.parse(widget.getLayoutContent()) as { settings: Record<string, unknown> };
    expect(saved.settings).toMatchObject({ volumeVisible: false, legendVisible: false });
  });
});
