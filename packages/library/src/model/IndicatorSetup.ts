import { indicatorSource, parseIndicatorSource, type PaneStyle } from '@tradecanvas/commons';
import type { IndicatorEngine, SnapshotIndicator } from '@tradecanvas/core';
import type { LayoutManager } from '../layout/LayoutManager.js';

/** What a layout keeps of the indicators. */
export type SetupSources = Pick<IndicatorEngine, 'getActiveIndicators' | 'getIndicatorConfig' | 'getIndicatorStyle' | 'getIntervals'>;

/** What a layout keeps of the panes. */
export type SetupPanes = Pick<LayoutManager, 'getPanels' | 'getMaximizedPanel'>;

/** What putting the panes back changes. */
export type RestoredPanes = Pick<LayoutManager, 'setPanelSize' | 'setPanelCollapsed' | 'setPanelScale' | 'orderPanels' | 'setMaximizedPanel'>;

/**
 * The indicators as a layout or a template keeps them: inputs, style,
 * levels, scale and panes (shared, size, order, fold, maximise, own style).
 */
export function captureIndicatorSetup(
  engine: SetupSources,
  layout: SetupPanes,
  paneStyle: (instanceId: string) => PaneStyle | null,
): SnapshotIndicator[] {
  const panels = layout.getPanels();
  const maximized = layout.getMaximizedPanel();
  return engine.getActiveIndicators().map((ind) => {
    const panel = panels.find((p) => p.id === ind.instanceId);
    const config = engine.getIndicatorConfig(ind.instanceId);
    const style = panel ? paneStyle(ind.instanceId) : null;
    return {
      id: ind.id,
      instanceId: ind.instanceId,
      params: { ...ind.params },
      position: panel?.position,
      style: engine.getIndicatorStyle(ind.instanceId) ?? undefined,
      visible: ind.visible,
      levels: config?.levels?.slice(),
      pane: ind.pane,
      scale: config?.scale,
      ...(config?.intervals ? { intervals: engine.getIntervals(ind.instanceId) ?? undefined } : {}),
      ...(style ? { paneStyle: { ...style } } : {}),
      ...(panel
        ? {
            paneSize: panel.size,
            paneOrder: panels.indexOf(panel),
            ...(panel.collapsed ? { paneCollapsed: true } : {}),
            ...(maximized === ind.instanceId ? { paneMaximized: true } : {}),
            ...(panel.logScale ? { paneLog: true } : {}),
            ...(panel.invertScale ? { paneInvert: true } : {}),
            ...(panel.percentScale ? { panePercent: true } : {}),
          }
        : {}),
    };
  });
}

/** The panes as they were: size first (it opens a fold), then fold, scale, order, maximise. */
export function restorePanes(layout: RestoredPanes, restored: readonly (readonly [SnapshotIndicator, string])[]): void {
  for (const [ind, instanceId] of restored) {
    if (ind.paneSize !== undefined) layout.setPanelSize(instanceId, ind.paneSize);
    if (ind.paneSize !== undefined || ind.paneCollapsed) layout.setPanelCollapsed(instanceId, !!ind.paneCollapsed);
    if (ind.paneSize !== undefined) layout.setPanelScale(instanceId, { log: !!ind.paneLog, invert: !!ind.paneInvert, percent: !!ind.panePercent });
  }
  const ordered = restored
    .filter(([ind]) => ind.paneOrder !== undefined)
    .sort(([a], [b]) => (a.paneOrder ?? 0) - (b.paneOrder ?? 0))
    .map(([, instanceId]) => instanceId);
  if (ordered.length > 1) layout.orderPanels(ordered);
  const maximized = restored.find(([ind]) => ind.paneMaximized);
  layout.setMaximizedPanel(maximized ? maximized[1] : null);
}

/**
 * `list` with each indicator after the one whose pane it is drawn in and the
 * ones whose lines it reads (otherwise in the order given).
 */
export function dependencyOrder(list: readonly SnapshotIndicator[]): SnapshotIndicator[] {
  const byId = new Map(list.map((ind) => [ind.instanceId, ind]));
  const out: SnapshotIndicator[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (ind: SnapshotIndicator) => {
    if (done.has(ind.instanceId) || visiting.has(ind.instanceId)) return;
    visiting.add(ind.instanceId);
    const needs = [ind.pane, ...Object.values(ind.params).map((v) => parseIndicatorSource(v)?.instanceId)];
    for (const id of needs) {
      const dep = id ? byId.get(id) : undefined;
      if (dep) visit(dep);
    }
    visiting.delete(ind.instanceId);
    done.add(ind.instanceId);
    out.push(ind);
  };
  for (const ind of list) visit(ind);
  return out;
}

/** The same indicator in the same place: kind, the pane it is drawn in, its scale, and a pane of its own or not. */
export function sameKindAndPlace(a: SnapshotIndicator, b: SnapshotIndicator): boolean {
  return a.id === b.id
    && (a.pane ?? null) === (b.pane ?? null)
    && (a.scale ?? null) === (b.scale ?? null)
    && (a.position === undefined) === (b.position === undefined);
}

/** The indicators of `current` an undo may change in place: in `wanted` under the same id, alike in kind and place. */
export function keptInPlace(current: readonly SnapshotIndicator[], wanted: readonly SnapshotIndicator[]): Set<string> {
  const byId = new Map(wanted.map((ind) => [ind.instanceId, ind]));
  const kept = new Set<string>();
  for (const cur of current) {
    const want = byId.get(cur.instanceId);
    if (want && sameKindAndPlace(cur, want)) kept.add(cur.instanceId);
  }
  return kept;
}

/** `params` with each line read from another indicator following that indicator's new id (`ids`: old → new). */
export function renameSources(
  params: Readonly<Record<string, unknown>>,
  ids: ReadonlyMap<string, string>,
): Record<string, number | string | boolean> {
  const out = { ...params } as Record<string, number | string | boolean>;
  for (const [name, value] of Object.entries(out)) {
    const line = parseIndicatorSource(value);
    const to = line && ids.get(line.instanceId);
    if (to) out[name] = indicatorSource(to, line.key);
  }
  return out;
}
