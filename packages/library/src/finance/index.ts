export { SparklineChart } from './SparklineChart.js';
export { DepthChart } from './DepthChart.js';
export { EquityCurveChart } from './EquityCurveChart.js';
export { HeatmapChart } from './HeatmapChart.js';
export { WaterfallChart } from './WaterfallChart.js';
export { GaugeChart } from './GaugeChart.js';
export { PerformanceDashboard } from './PerformanceDashboard.js';
export type { PerformanceDashboardOptions, PerformanceResult } from './PerformanceDashboard.js';
export {
  toEquityPoints,
  computeDrawdownCurve,
  computeMonthlyReturns,
  selectKeyStats,
} from './performanceData.js';
export type { EquitySample, RiskMetricsLike, DashboardStat } from './performanceData.js';
