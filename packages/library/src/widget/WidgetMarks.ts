import type { ChartMark, NewsItem } from '@tradecanvas/commons';
import { MARK_ROW_HEIGHT } from '@tradecanvas/core';
import type { ChartWidget } from './ChartWidget.js';
import type { ContextMenuEntry } from './WidgetContextMenu.js';
import type { SymbolNews } from './symbolInfoView.js';

/** The ids the widget's own news marks carry, so a host's marks are never taken for them. */
const NEWS_MARK = 'news:';
/** Most marks a badge's menu lists: zoomed far out, one badge can gather hundreds. */
const MENU_MARKS = 12;

/** What the marks read of the widget around them, and ask of it. */
export interface MarksHost {
  readonly chart: ChartWidget['chart'];
  readonly options: ChartWidget['options'];
  /** Marks are drawn: the widget's switch is on, and the host's chart features left them on. */
  readonly marksOn: boolean;
  /** The symbol on the chart now. */
  readonly symbol: string;
  readonly destroyed: boolean;
  /** The headlines' loader, shared with the symbol info panel: one request serves both. */
  readonly news: SymbolNews;
  /** A menu at (x, y) in the chart's pixels. */
  openMenu(entries: ContextMenuEntry[], x: number, y: number, onPick: (id: string) => void): void;
  /** A web page in a new tab. */
  openLink(url: string): void;
  /** The chart's navigation buttons stand `px` above the plot's bottom (0: where they were). */
  liftNavigation(px: number): void;
  /** The chart's navigation buttons step aside, or come back. */
  hideNavigation(hidden: boolean): void;
}

/**
 * Headlines as marks on the chart: each on the bar that holds its time, its
 * source under its title. One with no id is told apart by its time and its
 * place in the list.
 */
export function newsMarks(items: readonly NewsItem[]): ChartMark[] {
  return items.map((item, index) => {
    const mark: ChartMark = { id: `${NEWS_MARK}${item.id ?? `${item.time}:${index}`}`, time: item.time, kind: 'news', title: item.title };
    if (item.source) mark.text = item.source;
    if (item.url) mark.url = item.url;
    return mark;
  });
}

/**
 * Marks in the widget: the symbol's headlines put on the chart as news marks
 * (when there is a news source and `newsMarks` is not `false`), and what a
 * click on a mark's badge does: opens its link, or lists the marks it holds.
 */
export class WidgetMarks {
  /** The ids of the news marks on the chart now, to take away when the symbol changes. */
  private shown: string[] = [];
  /** The symbol's headlines as marks: put back when the host replaces the chart's marks with its own. */
  private own: ChartMark[] = [];
  /** The widget is putting its marks on the chart: the changes heard meanwhile are its own. */
  private placing = false;
  /** Every load is the latest: one still on its way answers to nobody. */
  private request = 0;

  constructor(private readonly host: MarksHost) {}

  /** Listen for clicks on marks, and put the first symbol's headlines on the chart. */
  start(): void {
    this.host.chart.on('markClick', (e) => this.onClick(e.payload.marks, e.payload.x, e.payload.y));
    // The navigation buttons sit along the plot's foot, where the badges are: they stand above
    // the badges while there are some, and step aside while the pointer reads one.
    this.host.chart.on('marksChange', (e) => {
      this.makeRoom(e.payload.count);
      this.keep();
    });
    this.host.chart.on('markHover', (e) => this.host.hideNavigation(e.payload.marks !== null));
    // Bricks and boxes draw no marks: the buttons have their place back while they are on.
    this.host.chart.on('chartTypeChange', () => this.makeRoom(this.host.chart.getMarks()?.length ?? 0));
    this.load();
  }

  private makeRoom(count: number): void {
    const drawn = count > 0 && this.host.marksOn && this.host.chart.isTimeAligned();
    this.host.liftNavigation(drawn ? MARK_ROW_HEIGHT : 0);
  }

  /**
   * The host's `setMarks` and `clearMarks` are about the host's marks: the
   * symbol's headlines that went with them come back.
   */
  private keep(): void {
    if (this.placing || this.own.length === 0) return;
    const there = new Set((this.host.chart.getMarks() ?? []).map((mark) => mark.id));
    if (this.shown.every((id) => there.has(id))) return;
    this.place(this.own);
  }

  private place(marks: readonly ChartMark[]): void {
    this.placing = true;
    try {
      this.shown = [];
      for (const mark of marks) {
        const id = this.host.chart.addMark(mark);
        if (id) this.shown.push(id);
      }
    } finally {
      this.placing = false;
    }
  }

  /** The headlines of the symbol on the chart now, in place of the last symbol's. */
  load(): void {
    const request = ++this.request;
    // Nothing of the last symbol's to put back while they go.
    this.own = [];
    for (const id of this.shown) this.host.chart.removeMark(id);
    this.shown = [];
    // The switch may have just turned: the marks that stay (a host's own) still take their row, or give it back.
    this.makeRoom(this.host.chart.getMarks()?.length ?? 0);
    const { options } = this.host;
    if (options.newsMarks === false || !this.host.marksOn) return;
    const adapter = options.adapter;
    const source = options.news ?? (adapter?.fetchNews ? adapter.fetchNews.bind(adapter) : null);
    if (!source) return;
    this.host.news
      .headlines(this.host.symbol, source)
      .then((items) => {
        if (request !== this.request || this.host.destroyed) return;
        this.own = newsMarks(items);
        this.place(this.own);
      })
      // No headlines, no marks: the chart is as it was, and the symbol info panel says the news could not be loaded.
      .catch(() => undefined);
  }

  private onClick(marks: readonly ChartMark[], x: number, y: number): void {
    if (!this.host.marksOn || marks.length === 0) return;
    if (marks.length === 1) {
      // One mark: its page, when it has one. Its title the pointer has read already.
      if (marks[0].url) this.host.openLink(marks[0].url);
      return;
    }
    // The newest first, as the pointer read them over the badge; of a crowd (a chart zoomed far out), the newest few.
    const listed = [...marks].reverse().slice(0, MENU_MARKS);
    const entries: ContextMenuEntry[] = listed.map((mark) => ({ id: mark.id, label: mark.title, ...(mark.url ? { icon: 'link' } : {}) }));
    this.host.openMenu(entries, x, y, (id) => {
      const url = marks.find((mark) => mark.id === id)?.url;
      if (url) this.host.openLink(url);
    });
  }
}
