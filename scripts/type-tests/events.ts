// What the types say about chart events' payloads: compiled with the skill's
// examples (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { Chart } from '@tradecanvas/chart';

declare const chart: Chart;

// The legend's new foot, as getLegendBottom() gives it.
chart.on('legendResize', (e) => {
  const bottom: number = e.payload.bottom;
  // @ts-expect-error The payload holds only `bottom`.
  const top: number = e.payload.top;
  return [bottom, top];
});
