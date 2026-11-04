import { parseIndicatorSource, type IndicatorDescriptor } from '@tradecanvas/commons';
import { sourceParam, type IndicatorEngine } from '@tradecanvas/core';
import type { LayoutManager } from '../layout/LayoutManager.js';

/** What the panes read and change of the indicators. */
export type PaneMembers = Pick<
  IndicatorEngine,
  'getIndicatorConfig' | 'getIndicatorDescriptor' | 'getPaneMembers' | 'getDependents' | 'setPane' | 'removeIndicator'
>;

/** The panes' places in the layout. */
export type PaneSlots = Pick<LayoutManager, 'getPanels' | 'addPanel' | 'removePanel'>;

/** What goes with a pane when another indicator takes it over, or when it goes. */
export interface PaneHandover {
  /** The pane's own style to `heir`, or away with the pane (null). */
  passStyle(from: string, heir: string | null): void;
  /** Hand pane `from`, its place and its drawings, to the indicator `to`. */
  renamePane(from: string, to: string): void;
  /** The panes' value scales are to be worked out again. */
  invalidateScales(): void;
}

/** Where a move sends an indicator: an indicator drawn in the pane, `'new'` a pane of its own, `'price'` the price pane. */
export type PaneTarget = string;

/**
 * Which pane each indicator is drawn in: its own, another indicator's (on
 * that pane's scale), or the price pane; who takes a pane over when its
 * indicator goes or moves away, and who follows it. No DOM.
 */
export class IndicatorPanes {
  constructor(
    private readonly members: PaneMembers,
    private readonly slots: PaneSlots,
    private readonly handover: PaneHandover,
  ) {}

  /** Whether the indicator has a pane of its own in the layout. */
  ownsPane(instanceId: string): boolean {
    return this.slots.getPanels().some((p) => p.id === instanceId);
  }

  /** The pane an indicator is drawn in: its own, or the one it shares. */
  paneOf(instanceId: string): string {
    return this.members.getIndicatorConfig(instanceId)?.pane ?? instanceId;
  }

  /** The instance owning the pane `instanceId` is drawn in; null for the price pane. */
  hostOf(instanceId: string, self?: string): string | null {
    if (instanceId === self) return null;
    if (this.ownsPane(instanceId)) return instanceId;
    const pane = this.members.getIndicatorConfig(instanceId)?.pane;
    return pane && pane !== self ? pane : null;
  }

  /**
   * The pane an indicator is drawn in, other than its own: the pane of the
   * instance `requested`, or, for a price-pane indicator computed from a pane
   * indicator's line, that indicator's pane. Null = the price pane (overlays)
   * or a pane of its own (panels).
   */
  paneFor(
    descriptor: Pick<IndicatorDescriptor, 'placement' | 'inputs'>,
    params: Readonly<Record<string, unknown>>,
    requested?: string,
    self?: string,
  ): string | null {
    if (requested) return this.hostOf(requested, self);
    if (descriptor.placement !== 'overlay') return null;
    const name = sourceParam(descriptor);
    const line = name ? parseIndicatorSource(params[name]) : null;
    return line ? this.hostOf(line.instanceId, self) : null;
  }

  /** The value of the input an indicator reads its source from (a price, another indicator's line); undefined without one. */
  sourceOf(instanceId: string): unknown {
    const descriptor = this.members.getIndicatorDescriptor(instanceId);
    const name = descriptor ? sourceParam(descriptor) : null;
    return name ? this.members.getIndicatorConfig(instanceId)?.params[name] : undefined;
  }

  /**
   * After an indicator's inputs changed: a price-pane indicator follows a
   * new source into its pane, and leaves it when it no longer reads from it;
   * otherwise it stays where it is. `before` is its source before the
   * change (`sourceOf`). True when it changed panes.
   */
  followSource(instanceId: string, before: unknown): boolean {
    const descriptor = this.members.getIndicatorDescriptor(instanceId);
    const config = this.members.getIndicatorConfig(instanceId);
    const name = descriptor ? sourceParam(descriptor) : null;
    if (descriptor?.placement !== 'overlay' || !config || !name || config.params[name] === before) return false;
    const line = parseIndicatorSource(config.params[name]);
    const pane = line ? this.hostOf(line.instanceId, instanceId)
      : parseIndicatorSource(before) ? null : config.pane ?? null;
    if ((pane ?? undefined) === config.pane) return false;
    this.members.setPane(instanceId, pane);
    return true;
  }

  /** Where a move would put the indicator: the pane's host, `null` (its own or the price pane), or `undefined` when it can't go. */
  moveHost(instanceId: string, target: PaneTarget): string | null | undefined {
    const config = this.members.getIndicatorConfig(instanceId);
    const descriptor = this.members.getIndicatorDescriptor(instanceId);
    if (!config || !descriptor) return undefined;
    // An overlay computed from another indicator's line stays with that line.
    const name = sourceParam(descriptor);
    if (descriptor.placement === 'overlay' && name && parseIndicatorSource(config.params[name])) return undefined;
    if (target === 'price') return descriptor.placement === 'overlay' && config.pane ? null : undefined;
    if (target === 'new') return descriptor.placement === 'panel' && !this.ownsPane(instanceId) ? null : undefined;
    const host = this.hostOf(target, instanceId);
    return host && host !== config.pane && host !== instanceId ? host : undefined;
  }

  private isPanel(instanceId: string): boolean {
    return this.members.getIndicatorDescriptor(instanceId)?.placement === 'panel';
  }

  /**
   * Remove one indicator. The first pane indicator drawn in its pane takes
   * the pane over and the others stay in it; without one (only price-pane
   * indicators were drawn there) they go back to the price pane. `moved`
   * hears of each of them as soon as it is in its new pane, before the next
   * one moves. Returns them, or null for an unknown indicator.
   */
  detach(instanceId: string, moved: (member: string) => void = () => undefined): string[] | null {
    if (!this.members.getIndicatorConfig(instanceId)) return null;
    const members = this.members.getPaneMembers(instanceId);
    const heir = this.ownsPane(instanceId) ? members.find((m) => this.isPanel(m)) ?? null : null;
    this.members.removeIndicator(instanceId);
    // A pane's own style goes with the pane: to its heir, or away with it.
    this.handover.passStyle(instanceId, heir);
    if (heir) {
      this.members.setPane(heir, null);
      this.handover.renamePane(instanceId, heir);
    } else {
      this.slots.removePanel(instanceId);
    }
    for (const member of members) {
      if (member !== heir) this.members.setPane(member, heir);
      moved(member);
    }
    return members;
  }

  /**
   * Move an indicator to another pane (see `moveHost` for `target`).
   * Indicators drawn in its own pane stay there (one of them takes the pane
   * over) or follow it when they read its lines. Returns every indicator
   * whose pane changed, or null when it can't go there.
   */
  move(instanceId: string, target: PaneTarget): string[] | null {
    const host = this.moveHost(instanceId, target);
    const config = this.members.getIndicatorConfig(instanceId);
    if (host === undefined || !config) return null;
    // Where it was, before the moves below change the config.
    const formerPane = config.pane;
    const changed = new Set<string>([instanceId]);
    if (this.ownsPane(instanceId)) for (const m of this.leavePane(instanceId, host)) changed.add(m);
    this.members.setPane(instanceId, host);
    if (target === 'new') {
      this.slots.addPanel(instanceId, 'bottom');
      // Those reading its lines come along into its new pane.
      for (const m of this.members.getDependents(instanceId)) {
        if (this.members.getIndicatorConfig(m)?.pane === formerPane) {
          this.members.setPane(m, instanceId);
          changed.add(m);
        }
      }
    }
    return [...changed];
  }

  /**
   * The indicator leaves the pane it owns for `host`: those reading its
   * lines go with it; of the rest, the first that draws in a pane takes the
   * pane over. Returns the pane's members.
   */
  private leavePane(instanceId: string, host: string | null): string[] {
    const members = this.members.getPaneMembers(instanceId);
    const readers = new Set(this.members.getDependents(instanceId));
    const staying = members.filter((m) => !readers.has(m));
    const heir = staying.find((m) => this.isPanel(m)) ?? null;
    // Its pane's own style goes with the pane: to the heir, or away with it.
    this.handover.passStyle(instanceId, heir);
    if (heir) {
      this.members.setPane(heir, null);
      this.handover.renamePane(instanceId, heir);
      for (const m of staying) if (m !== heir) this.members.setPane(m, heir);
    } else {
      this.slots.removePanel(instanceId);
      for (const m of staying) this.members.setPane(m, null);
    }
    this.handover.invalidateScales();
    for (const m of members) if (readers.has(m)) this.members.setPane(m, host ?? instanceId);
    return members;
  }
}
