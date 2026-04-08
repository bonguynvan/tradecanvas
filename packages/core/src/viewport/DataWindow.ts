import type { DataSeries, ViewportState } from '@chart-lib/commons';
import { sliceVisibleData } from '@chart-lib/commons';

export function getVisibleData(data: DataSeries, viewport: ViewportState): DataSeries {
  return sliceVisibleData(data, viewport.visibleRange.from, viewport.visibleRange.to);
}
