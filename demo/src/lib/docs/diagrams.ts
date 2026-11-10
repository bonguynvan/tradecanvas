// The boxes and arrows of the "How it works" diagrams. Their names are the
// code's, so every language draws the same picture; each page writes the
// steps under it in its own language. Coordinates are in a 720-wide box.
import type { DiagramEdge, DiagramNode } from './Diagram.svelte';

export interface DiagramShape {
  id: string;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const COL = [40, 265, 490];
const W = 190;
const H = 52;
const box = (id: string, col: number, y: number, title: string, note?: string, kind?: DiagramNode['kind']): DiagramNode =>
  ({ id, x: COL[col], y, w: W, h: H, title, note, kind });

/** Bars from a source to the screen. */
export const DATA_FLOW: DiagramShape = {
  id: 'data-flow',
  width: 720,
  height: 632,
  nodes: [
    box('feed', 0, 20, 'DataFeed', 'getBars · subscribe'),
    box('adapter', 1, 20, 'DataAdapter', "on('bar' | 'tick')"),
    box('code', 2, 20, 'your code', 'setData · appendBar', 'edge'),
    { ...box('stream', 0, 110, 'StreamManager', 'resample · TickAggregator'), x: 152 },
    box('events', 0, 200, 'eventBus', 'chart.on(…)', 'edge'),
    box('chart', 1, 200, 'Chart', 'connect · updateBar'),
    box('store', 1, 290, 'SeriesStore', 'shown · whole · aside', 'key'),
    box('display', 0, 380, 'DisplaySeries', 'per chart type'),
    box('indicators', 1, 380, 'IndicatorEngine', 'recalculateFrom'),
    box('fit', 2, 380, 'PriceFit', 'PaneLayout'),
    box('engine', 1, 470, 'RenderEngine', 'dirty layers · rAF'),
    box('viewport', 2, 470, 'Viewport', 'visibleRange · barWidth'),
    box('scene', 0, 560, 'scene canvas', 'series · axes · drawings'),
    box('top', 1, 560, 'top canvas', 'crosshair · legend'),
    box('input', 2, 560, 'pointer · wheel · keys', 'InteractionManager', 'edge'),
  ],
  edges: [
    { from: 'feed', to: 'stream' },
    { from: 'adapter', to: 'stream' },
    { from: 'stream', to: 'chart' },
    { from: 'code', to: 'chart' },
    { from: 'chart', to: 'events' },
    { from: 'chart', to: 'store' },
    { from: 'store', to: 'display' },
    { from: 'store', to: 'indicators' },
    { from: 'store', to: 'fit' },
    { from: 'display', to: 'engine' },
    { from: 'indicators', to: 'engine' },
    { from: 'fit', to: 'viewport' },
    { from: 'viewport', to: 'engine' },
    { from: 'input', to: 'viewport' },
    { from: 'engine', to: 'scene' },
    { from: 'engine', to: 'top' },
  ],
};

/** What ChartWidget is made of. */
export const WIDGET_PARTS: DiagramShape = {
  id: 'widget-parts',
  width: 720,
  height: 392,
  nodes: [
    box('widget', 1, 20, 'ChartWidget', 'public API · setup', 'key'),
    box('signals', 0, 120, 'signals', 'look · openRoles'),
    box('hosts', 1, 120, '…Host()', 'one interface per area'),
    box('dialogs', 2, 120, 'DIALOGS', 'LazyPart · first open'),
    box('ui', 0, 220, 'toolbar · theme', 'one effect each'),
    box('areas', 1, 220, 'Widget… areas', 'Replay · Trading · Alerts…'),
    box('overlay', 2, 220, 'overlayHost', 'portal · fullscreen'),
    box('chart', 1, 320, 'Chart', 'one per widget'),
  ],
  edges: [
    { from: 'widget', to: 'signals' },
    { from: 'widget', to: 'hosts' },
    { from: 'widget', to: 'dialogs' },
    { from: 'signals', to: 'ui' },
    { from: 'hosts', to: 'areas' },
    { from: 'dialogs', to: 'overlay', dashed: true },
    { from: 'areas', to: 'chart', label: 'host.chart' },
  ],
};

/** One bar replay, from the first click to the live chart again. */
export const REPLAY: DiagramShape = {
  id: 'replay',
  width: 720,
  height: 332,
  nodes: [
    box('ui', 0, 20, 'WidgetReplay', 'toggleReplay · bar click', 'edge'),
    box('chart', 1, 20, 'Chart', 'replayStart', 'key'),
    box('manager', 2, 20, 'ReplayManager', 'load · play · seekTo'),
    box('stop', 0, 140, 'replayStop', 'exitReplay'),
    box('store', 1, 140, 'SeriesStore', 'live series aside'),
    box('paper', 2, 140, 'paper account', 'setMarkPrice'),
    box('indicators', 1, 260, 'IndicatorEngine', 'recalcIndicatorsFrom'),
  ],
  edges: [
    { from: 'ui', to: 'chart' },
    { from: 'chart', to: 'manager' },
    { from: 'chart', to: 'store', label: 'beginReplay', at: 0.8 },
    { from: 'chart', to: 'paper' },
    { from: 'ui', to: 'stop', dashed: true },
    { from: 'stop', to: 'store' },
    { from: 'store', to: 'indicators' },
  ],
};
