import type { Rect } from '@tradecanvas/commons';
import type { GpuRecorder, GpuRegion } from './gpu.js';

/** A piece of the chart's drawing, on any 2D context: the chart's own, or one recording for the GPU. */
export type DrawStep = (c: CanvasRenderingContext2D) => void;

/** A pane's drawing: its background over the whole pane, then levels and indicators below its header. */
export interface PaneSteps {
  id: string;
  rect: Rect;
  inner: Rect;
  background: DrawStep;
  steps: DrawStep[];
}

/** What is left for Canvas 2D in a pane once the GPU has taken what it can. */
export interface PanePlan {
  /** Whether the GPU drew the background. */
  background: boolean;
  /** The text of the steps the GPU drew. */
  text: GpuRegion | null;
  /** The steps left for Canvas 2D, in order. */
  rest: DrawStep[];
}

/** Who draws what in the plot and panes this frame. */
export interface StepPlan {
  /** The plot's steps left for Canvas 2D, in order. */
  plot: DrawStep[];
  /** The text of the plot steps the GPU drew. */
  plotText: GpuRegion | null;
  /** Per pane; a pane not here is drawn wholly with Canvas 2D. */
  panes: Map<string, PanePlan>;
}

/** Everything with Canvas 2D. */
export function canvasPlan(plot: DrawStep[]): StepPlan {
  return { plot, plotText: null, panes: new Map() };
}

/**
 * Record for the GPU the longest run of steps from the start of the plot and
 * of each pane that it can draw. The rest stay with Canvas 2D, drawn over it
 * in the same order, so the stacking is as with Canvas 2D alone.
 */
export function recordSteps(recorder: GpuRecorder, plotRect: Rect, plot: DrawStep[], panes: readonly PaneSteps[]): StepPlan {
  const region = recorder.region(plotRect);
  let k = 0;
  while (k < plot.length && region.step(plot[k])) k++;
  const plans = new Map<string, PanePlan>();
  for (const pane of panes) {
    const background = recorder.region(pane.rect).step(pane.background);
    const inner = recorder.region(pane.inner);
    let j = 0;
    if (background) while (j < pane.steps.length && inner.step(pane.steps[j])) j++;
    plans.set(pane.id, { background, text: inner, rest: pane.steps.slice(j) });
  }
  return { plot: plot.slice(k), plotText: region, panes: plans };
}
