import type { FontConfig, Theme, ThemeName } from '@tradecanvas/commons';
import { financeTheme } from '@tradecanvas/core';
import { EquityCurveChart } from './EquityCurveChart.js';
import { HeatmapChart } from './HeatmapChart.js';
import {
  toEquityPoints,
  computeDrawdownCurve,
  computeMonthlyReturns,
  selectKeyStats,
  type EquitySample,
  type RiskMetricsLike,
  type DashboardStat,
  type DashboardLabels,
  dashboardLabels,
} from './performanceData.js';

/** Structurally satisfied by analytics' `BacktestResult`. */
export interface PerformanceResult {
  equityCurve: ReadonlyArray<EquitySample>;
  metrics: RiskMetricsLike;
}

export interface PerformanceDashboardOptions {
  result: PerformanceResult;
  theme?: ThemeName | Theme;
  title?: string;
  subtitle?: string;
  /** The face and sizes of the dashboard's text, as on the finance charts: the system's sans face when left out. */
  font?: Partial<FontConfig>;
  /** The language of the months' names and of the charts' numbers and dates (a BCP 47 tag); the browser's when left out. */
  locale?: string;
  /** The panels' titles and the stats' names in your words; those left out stay in English. */
  labels?: Partial<DashboardLabels>;
}

/**
 * A composed strategy-performance dashboard: a headline stats strip, an equity
 * curve, an underwater drawdown panel, and a monthly-returns heatmap. Built
 * entirely from a backtest `result`, reusing the finance chart renderers.
 *
 * ```ts
 * const result = new Backtester(opts).run(bars, strategy);
 * const dash = new PerformanceDashboard(el, { result, theme: 'dark' });
 * ```
 */
export class PerformanceDashboard {
  private options: PerformanceDashboardOptions;
  private theme: Theme;
  private root: HTMLDivElement;
  private equityChart: EquityCurveChart | null = null;
  private drawdownChart: EquityCurveChart | null = null;
  private heatmap: HeatmapChart | null = null;

  constructor(container: HTMLElement, options: PerformanceDashboardOptions) {
    this.options = options;
    this.theme = financeTheme(options.theme, options.font);
    this.root = document.createElement('div');
    this.build();
    container.appendChild(this.root);
  }

  private build(): void {
    const t = this.theme;
    const { result, title, subtitle, locale } = this.options;
    const labels = dashboardLabels(this.options.labels);
    // The charts take the dashboard's face by name: its theme alone would read to them as one with no face of its own.
    const font = t.font;
    const surface = this.panelBackground();
    const border = t.grid;

    this.root.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'gap:14px',
      'width:100%',
      'box-sizing:border-box',
      'padding:16px',
      `background:${t.background}`,
      `color:${t.text}`,
      `font-family:${t.font.family}`,
    ].join(';');

    if (title || subtitle) {
      const header = document.createElement('div');
      if (title) {
        const h = document.createElement('div');
        h.textContent = title;
        h.style.cssText = `font-size:${t.font.sizeLarge}px;font-weight:600;letter-spacing:-0.01em;`;
        header.appendChild(h);
      }
      if (subtitle) {
        const s = document.createElement('div');
        s.textContent = subtitle;
        s.style.cssText = `font-size:${t.font.sizeSmall}px;color:${t.textSecondary};margin-top:2px;`;
        header.appendChild(s);
      }
      this.root.appendChild(header);
    }

    // Stats strip
    this.root.appendChild(this.buildStatsStrip(selectKeyStats(result.metrics, labels), surface, border));

    // Chart grid
    const grid = document.createElement('div');
    grid.style.cssText = [
      'display:grid',
      'grid-template-columns:repeat(auto-fit, minmax(280px, 1fr))',
      'grid-auto-rows:220px',
      'gap:14px',
    ].join(';');
    this.root.appendChild(grid);

    const equityPanel = this.buildPanel(labels.equityCurve, surface, border);
    equityPanel.wrap.style.gridColumn = '1 / -1';
    grid.appendChild(equityPanel.wrap);
    this.equityChart = new EquityCurveChart(equityPanel.body, {
      data: toEquityPoints(result.equityCurve),
      theme: t,
      font,
      locale,
      ariaLabel: labels.equityCurve,
      lineColor: t.candleUp,
      fillArea: true,
      crosshair: true,
    });

    const ddPanel = this.buildPanel(labels.drawdown, surface, border);
    grid.appendChild(ddPanel.wrap);
    this.drawdownChart = new EquityCurveChart(ddPanel.body, {
      data: computeDrawdownCurve(result.equityCurve),
      theme: t,
      font,
      locale,
      ariaLabel: labels.drawdown,
      lineColor: t.candleDown,
      fillArea: true,
      crosshair: true,
      valueFormat: (v) => `${v.toFixed(1)}%`,
    });

    const monthlyCells = computeMonthlyReturns(result.equityCurve, locale);
    const heatPanel = this.buildPanel(labels.monthlyReturns, surface, border);
    grid.appendChild(heatPanel.wrap);
    this.heatmap = new HeatmapChart(heatPanel.body, {
      data: monthlyCells,
      theme: t,
      font,
      locale,
      ariaLabel: labels.monthlyReturns,
      showValues: true,
      valueFormat: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
      colorScale: { negative: t.candleDown, zero: surface, positive: t.candleUp },
    });
  }

  private buildStatsStrip(stats: DashboardStat[], surface: string, border: string): HTMLDivElement {
    const strip = document.createElement('div');
    strip.style.cssText = [
      'display:grid',
      'grid-template-columns:repeat(auto-fit, minmax(120px, 1fr))',
      'gap:10px',
    ].join(';');

    const t = this.theme;
    for (const stat of stats) {
      const card = document.createElement('div');
      card.style.cssText = [
        `background:${surface}`,
        `border:1px solid ${border}`,
        'border-radius:10px',
        'padding:10px 12px',
        'display:flex',
        'flex-direction:column',
        'gap:4px',
      ].join(';');

      const label = document.createElement('div');
      label.textContent = stat.label;
      label.style.cssText = `font-size:${t.font.sizeSmall}px;color:${t.textSecondary};text-transform:uppercase;letter-spacing:0.04em;`;

      const value = document.createElement('div');
      value.textContent = stat.value;
      const color = stat.tone === 'positive' ? t.candleUp : stat.tone === 'negative' ? t.candleDown : t.text;
      value.style.cssText = `font-size:${t.font.sizeLarge}px;font-weight:600;color:${color};font-variant-numeric:tabular-nums;`;

      card.appendChild(label);
      card.appendChild(value);
      strip.appendChild(card);
    }
    return strip;
  }

  private buildPanel(title: string, surface: string, border: string): { wrap: HTMLDivElement; body: HTMLDivElement } {
    const t = this.theme;
    const wrap = document.createElement('div');
    wrap.style.cssText = [
      `background:${surface}`,
      `border:1px solid ${border}`,
      'border-radius:10px',
      'overflow:hidden',
      'display:flex',
      'flex-direction:column',
    ].join(';');

    const head = document.createElement('div');
    head.textContent = title;
    head.style.cssText = [
      `font-size:${t.font.sizeSmall}px`,
      'font-weight:600',
      `color:${t.textSecondary}`,
      'padding:8px 12px',
      `border-bottom:1px solid ${border}`,
      'text-transform:uppercase',
      'letter-spacing:0.04em',
    ].join(';');

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;min-height:0;position:relative;';

    wrap.appendChild(head);
    wrap.appendChild(body);
    return { wrap, body };
  }

  /** A subtle surface tint distinct from the page background, per theme. */
  private panelBackground(): string {
    return this.theme.name === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
  }

  /** Replace the displayed result and re-render all panels. */
  update(result: PerformanceResult): void {
    this.options = { ...this.options, result };
    this.destroyCharts();
    this.root.replaceChildren();
    this.build();
  }

  setTheme(theme: ThemeName | Theme): void {
    this.theme = financeTheme(theme, this.options.font);
    this.options = { ...this.options, theme };
    this.destroyCharts();
    this.root.replaceChildren();
    this.build();
  }

  private destroyCharts(): void {
    this.equityChart?.destroy();
    this.drawdownChart?.destroy();
    this.heatmap?.destroy();
    this.equityChart = null;
    this.drawdownChart = null;
    this.heatmap = null;
  }

  destroy(): void {
    this.destroyCharts();
    this.root.remove();
  }
}
