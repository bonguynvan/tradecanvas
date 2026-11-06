import { WidgetAlertsPanel, describeAlert, type AlertListItem, type AlertSource } from './WidgetAlertsPanel.js';
import { indicatorPointAt } from './legendValues.js';
import { AlertNotifier } from './AlertNotifier.js';
import { fill } from './i18n.js';
import type { ChartWidget } from './ChartWidget.js';

/** What the alerts read of the widget around them, and ask of it. */
export interface AlertsHost {
  readonly chart: ChartWidget['chart'];
  readonly dock: ChartWidget['docking']['dock'];
  drawingToolName: ChartWidget['drawingToolName'];
  readonly featureState: ChartWidget['featureState'];
  formatAlertPrice: ChartWidget['formatAlertPrice'];
  say: ChartWidget['say'];
  readonly t: ChartWidget['t'];
}

/**
 * Price alerts in the widget: the alerts panel and its list, the sources an alert can follow
 * (the price, an indicator's line), a drawing's alert, and the notices when one fires.
 */
export class WidgetAlerts {
  constructor(private readonly host: AlertsHost) {}

  alertsPanel: WidgetAlertsPanel | null = null;

  alertNotifier: AlertNotifier | null = null;

  /** Add a "price crosses this drawing" alert and say so. */
  addDrawingAlert(id: string): void {
    if (!this.host.featureState.alerts) return;
    const drawing = this.host.chart.getDrawings().find((d) => d.id === id);
    const name = drawing ? this.host.drawingToolName(drawing.type) : '';
    if (this.host.chart.addDrawingAlert(id, { label: name })) {
      this.host.say(fill(this.host.t('drawingSettings.alertAdded'), { name }));
    }
  }

  toggleAlerts(): void {
    if (!this.alertsPanel || !this.host.featureState.alerts) return;
    this.host.dock?.toggle('alerts');
  }

  refreshAlerts(): void {
    if (!this.alertsPanel) return;
    const sources = this.buildAlertSources();
    this.alertsPanel.setSources(sources);
    this.alertsPanel.setAlerts(this.host.chart.getAlerts().map((a) => this.alertListItem(a, sources)));
  }

  private alertListItem(a: AlertListItem, sources: readonly AlertSource[]): AlertListItem {
    return {
      id: a.id,
      price: a.price,
      condition: a.condition,
      message: a.message,
      triggered: a.triggered,
      channel: a.channel,
      label: a.label,
      drawingId: a.drawingId,
      target: a.target,
      targetLabel: a.target ? sources.find((s) => s.channel === a.target)?.label : undefined,
      percent: a.percent,
      bars: a.bars,
      onBarClose: a.onBarClose,
      expiresAt: a.expiresAt,
      expired: a.expired,
    };
  }

  /** An alert in words, for a toast or a notification: "Price crossing EMA 20", "RSI greater than 70". */
  alertText(p: AlertListItem): string {
    return describeAlert(this.alertListItem(p, this.buildAlertSources()), this.host.t, (price) => this.host.formatAlertPrice(price), true);
  }

  /** Price + every active indicator line, as selectable alert sources. */
  private buildAlertSources(): { channel: string; label: string }[] {
    const sources = [{ channel: 'price', label: this.host.t('alerts.source.price') }];
    for (const ind of this.host.chart.getActiveIndicators()) {
      // Use the latest point — multi-output indicators (MACD, Stochastic) only
      // have all their lines populated once warmed up; the first point may not.
      const series = this.host.chart.getIndicatorOutput(ind.instanceId)?.series;
      const point = series && series.length > 0 ? series[series.length - 1] : null;
      const keys = point ? Object.keys(point).filter((k) => typeof point[k] === 'number') : [];
      for (const key of keys) {
        const label = keys.length > 1 ? `${ind.descriptor.name} ${key}` : ind.descriptor.name;
        sources.push({ channel: `${ind.instanceId}:${key}`, label });
      }
    }
    return sources;
  }

  /** Latest value for an alert source channel (price or indicator line). */
  getAlertChannelValue(channel: string): number | null {
    const data = this.host.chart.getData();
    // The price as the chart shows it: on its tick grid, or at its precision.
    if (channel === 'price') return data.length > 0 ? this.host.chart.roundPrice(data[data.length - 1].close) : null;
    const sep = channel.indexOf(':');
    if (sep < 0 || data.length === 0) return null;
    const instanceId = channel.slice(0, sep);
    const key = channel.slice(sep + 1);
    // The line's last value: on Renko and the like its series ends at the last brick, not the last bar.
    const v = indicatorPointAt(this.host.chart.getIndicatorOutput(instanceId)?.series, null)?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
}
