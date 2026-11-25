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
// A stop-out's fill says so, and a margin call carries how the equity stands to the margin held.
chart.on('executionFill', (e) => e.payload.reason === 'liquidation');
chart.on('marginCall', (e) => e.payload.marginLevel < e.payload.level && e.payload.equity < e.payload.marginUsed);
chart.on('accountChange', (e) => (e.payload.account?.marginLevel ?? 0) * 100);
chart.on('marginCall', (e) => {
  // @ts-expect-error A margin call closes nothing: it names no position.
  return e.payload.positionId;
});
// A bar may say what the buyers took of its volume.
chart.setData([{ time: 0, open: 1, high: 2, low: 1, close: 2, volume: 10, buyVolume: 6 }]);
// An order that fills in parts says how far it has got, and each part what it left working.
chart.on('ordersChange', (e) => e.payload.orders.map((o) => o.quantity - (o.filledQuantity ?? 0)));
chart.on('executionFill', (e) => e.payload.quantity + (e.payload.remaining ?? 0));
// A dragged take-profit level comes as all the position's levels.
chart.on('positionModify', (e) => e.payload.takeProfits?.map((level) => level.price + level.quantity));
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

// The footprint chart: its type, its settings and its data, as the published types take them.
{
  const footprintChart: import('@tradecanvas/chart').ChartOptions = {
    chartType: 'footprint',
    chartTypeOptions: { footprint: { rowSize: 0.5, cells: 'delta', imbalance: 3, collect: false } },
  };
  void footprintChart;
  const autoRows: import('@tradecanvas/chart').ChartOptions = { chartTypeOptions: { footprint: { rowSize: 'auto', cells: 'bidAsk' } } };
  void autoRows;
  // @ts-expect-error cells are 'bidAsk', 'delta' or 'volume'
  const wrongCells: import('@tradecanvas/chart').ChartOptions = { chartTypeOptions: { footprint: { cells: 'ask' } } };
  void wrongCells;
  const rows: import('@tradecanvas/chart').FootprintBar = { time: 0, levels: [{ price: 100, buy: 1, sell: 2 }] };
  void rows;
  // @ts-expect-error a row has its price and both sides
  const halfRow: import('@tradecanvas/chart').FootprintLevel = { price: 100, buy: 1 };
  void halfRow;
}

// The trades of the chart's symbol: followed from the feed, told as an event.
{
  const stop: () => void = chart.followTrades();
  stop();
  const lately: { time: number; price: number; volume: number; side?: 'buy' | 'sell' }[] = chart.getTrades();
  void lately;
  chart.on('trades', (e) => [e.payload.trades.map((trade) => [trade.time, trade.price, trade.volume, trade.side]), e.payload.recent]);
  chart.on('trades', (e) => {
    // @ts-expect-error The payload holds the trades, not a single trade.
    return e.payload.price;
  });
}
