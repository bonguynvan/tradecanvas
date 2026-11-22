// A page of the host's own in the widget's dock: compiled with the skill's examples
// (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { ChartWidget, type DockPageHandle, type DockPanelId, type TapeOptions } from '@tradecanvas/chart/widget';

declare const widget: ChartWidget;
declare const figures: HTMLElement;

const page: DockPageHandle | null = widget.addDockPage({ id: 'figures', label: 'Key figures', icon: 'info', element: figures });
const own = widget.addDockPage({ id: 'own', label: 'Own icon', icon: document.createElementNS('http://www.w3.org/2000/svg', 'svg'), element: figures });
widget.openPanel('figures');
widget.openPanel('watchlist');
const open: DockPanelId | null = widget.getOpenPanel();
page?.remove();
own?.remove();
// @ts-expect-error A page has something to show.
widget.addDockPage({ id: 'empty', label: 'Empty', icon: 'info' });
new ChartWidget(document.body, { onPanelChange: (panel: DockPanelId | null) => void panel });
// The tape: a page of the dock made with its option, with the settings it starts with.
new ChartWidget(document.body, { tape: true });
new ChartWidget(document.body, { tape: { minSize: 0.5, rows: 100 } });
// Its settings have a type of their own, for a host that keeps them.
const tapeSettings: TapeOptions = { minSize: 2 };
new ChartWidget(document.body, { tape: tapeSettings });
widget.openPanel('tape');
// @ts-expect-error The least size is a number.
new ChartWidget(document.body, { tape: { minSize: '0.5' } });
export { open };
