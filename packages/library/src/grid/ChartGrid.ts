import type { ChartOptions, Theme, TimeFrame, DataSeries, DataAdapter, StreamConfig } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';

export type GridLayout = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '2x3' | '3x2';

export interface GridCellConfig {
  symbol?: string;
  timeframe?: TimeFrame;
  chartOptions?: Partial<ChartOptions>;
}

export interface ChartGridOptions {
  layout?: GridLayout;
  theme?: ChartOptions['theme'];
  syncCrosshair?: boolean;
  syncTimeAxis?: boolean;
  gap?: number;
  cells?: GridCellConfig[];
  chartOptions?: Partial<ChartOptions>;
}

interface GridCell {
  container: HTMLDivElement;
  chart: Chart;
  symbol: string;
  timeframe: TimeFrame;
}

const LAYOUT_MAP: Record<GridLayout, { cols: number; rows: number }> = {
  '1x1': { cols: 1, rows: 1 },
  '1x2': { cols: 2, rows: 1 },
  '2x1': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
  '1x3': { cols: 3, rows: 1 },
  '3x1': { cols: 1, rows: 3 },
  '2x3': { cols: 3, rows: 2 },
  '3x2': { cols: 2, rows: 3 },
};

export class ChartGrid {
  private root: HTMLDivElement;
  private cells: GridCell[] = [];
  private layout: GridLayout;
  private options: ChartGridOptions;
  private destroyed = false;
  private syncing = false;

  constructor(container: HTMLElement, options: ChartGridOptions = {}) {
    this.options = options;
    this.layout = options.layout ?? '2x2';

    this.root = document.createElement('div');
    this.root.style.cssText = 'display:grid;width:100%;height:100%;overflow:hidden;';
    container.appendChild(this.root);

    this.applyLayout();
    this.createCells();
  }

  private applyLayout(): void {
    const { cols, rows } = LAYOUT_MAP[this.layout];
    const gap = this.options.gap ?? 1;
    this.root.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.root.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    this.root.style.gap = `${gap}px`;
  }

  private createCells(): void {
    const { cols, rows } = LAYOUT_MAP[this.layout];
    const count = cols * rows;
    for (let i = 0; i < count; i++) this.cells.push(this.createCell(i));
  }

  private createCell(i: number): GridCell {
    const cellConfig = this.options.cells?.[i] ?? {};

    const cellEl = document.createElement('div');
    cellEl.style.cssText = 'position:relative;overflow:hidden;min-width:0;min-height:0;';
    this.root.appendChild(cellEl);

    const chartOpts: ChartOptions = {
      chartType: 'candlestick',
      autoScale: true,
      features: {
        crosshair: true,
        keyboard: true,
        volume: true,
        legend: true,
        priceAxis: true,
        timeAxis: true,
        grid: true,
      },
      ...this.options.chartOptions,
      ...cellConfig.chartOptions,
      theme: this.options.theme,
    };

    const chart = new Chart(cellEl, chartOpts);

    const cell: GridCell = {
      container: cellEl,
      chart,
      symbol: cellConfig.symbol ?? `Chart ${i + 1}`,
      timeframe: cellConfig.timeframe ?? '5m',
    };

    // Charts can differ in symbol and timeframe, so the crosshair is linked by
    // time: the others show a vertical line on the bar containing that time.
    if (this.options.syncCrosshair !== false) {
      chart.on('crosshairMove', (e) => {
        const time = e.payload.bar?.time;
        if (time === undefined) return;
        for (const other of this.cells) {
          if (other.chart !== chart) other.chart.setCrosshairTime(time);
        }
      });
      chart.on('crosshairLeave', () => {
        for (const other of this.cells) {
          if (other.chart !== chart) other.chart.setCrosshairTime(null);
        }
      });
    }

    if (this.options.syncTimeAxis !== false) {
      chart.on('visibleRangeChange', (e) => {
        if (this.syncing) return;
        this.syncing = true;
        const { from, to } = e.payload;
        const srcData = chart.getData();
        if (srcData.length > 0 && from >= 0 && to < srcData.length) {
          const fromTime = srcData[from]?.time;
          const toTime = srcData[to]?.time;
          if (fromTime && toTime) {
            for (const other of this.cells) {
              if (other.chart !== chart) {
                other.chart.setVisibleRange(fromTime, toTime);
              }
            }
          }
        }
        this.syncing = false;
      });
    }

    return cell;
  }

  setLayout(layout: GridLayout): void {
    if (layout === this.layout) return;
    const oldCount = this.cells.length;
    const { cols, rows } = LAYOUT_MAP[layout];
    const newCount = cols * rows;

    if (newCount < oldCount) {
      for (let i = oldCount - 1; i >= newCount; i--) {
        const cell = this.cells[i];
        cell.chart.destroy();
        cell.container.remove();
        this.cells.pop();
      }
    }

    this.layout = layout;
    this.applyLayout();

    // New cells get the same options and linking as the first ones.
    for (let i = oldCount; i < newCount; i++) this.cells.push(this.createCell(i));
  }

  getChart(index: number): Chart | null {
    return this.cells[index]?.chart ?? null;
  }

  getCharts(): Chart[] {
    return this.cells.map(c => c.chart);
  }

  getCellCount(): number {
    return this.cells.length;
  }

  setData(index: number, data: DataSeries): void {
    this.cells[index]?.chart.setData(data);
  }

  setAllData(data: DataSeries): void {
    for (const cell of this.cells) {
      cell.chart.setData(data);
    }
  }

  async connectCell(index: number, config: StreamConfig): Promise<void> {
    const cell = this.cells[index];
    if (!cell) return;
    cell.symbol = config.symbol;
    cell.timeframe = config.timeframe;
    await cell.chart.connect(config);
  }

  /**
   * Connect each chart to a symbol. An adapter keeps one stream, so pass a
   * function that makes one per chart (`() => new BinanceAdapter()`); a single
   * adapter object serves one chart only.
   */
  async connectAll(
    adapter: DataAdapter | ((symbol: string, index: number) => DataAdapter),
    symbols: string[],
    timeframe: TimeFrame,
    historyLimit = 500,
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.cells.length && i < symbols.length; i++) {
      promises.push(this.connectCell(i, {
        adapter: typeof adapter === 'function' ? adapter(symbols[i], i) : adapter,
        symbol: symbols[i],
        timeframe,
        historyLimit,
      }));
    }
    await Promise.all(promises);
  }

  setTheme(theme: Theme): void {
    for (const cell of this.cells) {
      cell.chart.setTheme(theme);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const cell of this.cells) {
      cell.chart.destroy();
      cell.container.remove();
    }
    this.cells = [];
    this.root.remove();
  }
}
