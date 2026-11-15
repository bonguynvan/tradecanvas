// The depth overlay's config is the chart package's to give: compiled with the skill's
// examples (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { Chart, type DepthOverlayConfig } from '@tradecanvas/chart';

declare const chart: Chart;

const look: DepthOverlayConfig = { mode: 'level', markBest: true, maxWidth: 140, rowSize: 1.25, rowOrigin: -0.125 };
chart.setDepthOverlay(look);
const now: DepthOverlayConfig = chart.getDepthOverlay();
// @ts-expect-error The mode is cumulative or level.
chart.setDepthOverlay({ mode: 'stacked' });
export { now };
