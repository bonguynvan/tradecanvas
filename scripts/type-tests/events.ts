// What the types say about chart events' payloads: compiled with the skill's
// examples (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { Chart, readChartMarks, MAX_CHART_MARKS, type ChartMark, type ChartMarkKind } from '@tradecanvas/chart';

declare const chart: Chart;

// The legend's new foot, as getLegendBottom() gives it.
chart.on('legendResize', (e) => {
  const bottom: number = e.payload.bottom;
  // @ts-expect-error The payload holds only `bottom`.
  const top: number = e.payload.top;
  return [bottom, top];
});

// Marks: their types are the chart package's to give, and their events carry them.
const kind: ChartMarkKind = 'earnings';
const marks: ChartMark[] = readChartMarks([{ time: 0, title: 'Q3 earnings', kind }], MAX_CHART_MARKS);
chart.setMarks(marks);
chart.on('markClick', (e) => e.payload.marks.map((m) => m.title));
chart.on('markHover', (e) => e.payload.marks?.length ?? 0);
chart.on('marksChange', (e) => e.payload.count + 1);
// @ts-expect-error A mark's kind is one of the five.
chart.addMark({ time: 0, title: 'x', kind: 'rumour' });

// Trading, menus and tool events carry typed payloads too.
chart.on('executionFill', (e) => e.payload.price);
chart.on('ordersChange', (e) => e.payload.orders.map((o) => o.id));
chart.on('positionsChange', (e) => e.payload.positions.map((p) => p.id));
chart.on('positionReverse', (e) => e.payload.positionId.length);
chart.on('chartContextMenu', (e) => [e.payload.area, e.payload.price]);
chart.on('priceAxisAdd', (e) => e.payload.price + e.payload.y);
chart.on('drawingUpdate', (e) => e.payload.id.length);
chart.on('drawingDoubleClick', (e) => e.payload.id.length);
chart.on('drawingContextMenu', (e) => [e.payload.id, e.payload.x, e.payload.y]);
chart.on('toolModeChange', (e) => [e.payload.eraser, e.payload.zoomArea]);
chart.on('ordersChange', (e) => {
  // @ts-expect-error The payload holds the orders, not a single order.
  return e.payload.id;
});
