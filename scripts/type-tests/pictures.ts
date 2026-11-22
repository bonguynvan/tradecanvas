// Pictures at a size of their own, and of a grid: compiled with the skill's examples
// (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { Chart } from '@tradecanvas/chart';
import { ChartWidgetGrid } from '@tradecanvas/chart/widget';

declare const chart: Chart;
declare const grid: ChartWidgetGrid;

const slide: HTMLCanvasElement | null = chart.toCanvas({ width: 1920, height: 1080, pixelRatio: 2, theme: 'light' });
const printed: boolean = chart.print({ width: 1123, height: 794 });
const sheet: Promise<Blob | null> = grid.toPdf({ pageSize: 'a3', title: 'Majors', width: 1600 });
const picture: HTMLCanvasElement | null = grid.toCanvas({ pixelRatio: 2 });
const bytes: Promise<Blob | null> = grid.screenshotBlob({ type: 'webp', quality: 0.8 });
grid.screenshot('majors', { type: 'jpeg' });
const asked: boolean = grid.print({ title: 'Majors' });
const copied: Promise<boolean> = grid.copyScreenshot({ pixelRatio: 2 });
new ChartWidgetGrid(document.body, { picture: false });
// @ts-expect-error The clipboard takes a PNG: a copy has no format to choose.
void grid.copyScreenshot({ type: 'jpeg' });
// @ts-expect-error A size is a number of CSS pixels.
chart.toCanvas({ width: '1920px' });
// @ts-expect-error Paper has no picture format: a PDF keeps the pixels as they are.
void grid.toPdf({ type: 'jpeg' });
export { slide, printed, sheet, picture, bytes, asked, copied };
