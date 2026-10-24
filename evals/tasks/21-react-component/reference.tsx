import { useMemo } from 'react';
import type { Chart, OHLCBar } from '@tradecanvas/chart';
import { TradeCanvas } from '@tradecanvas/react';

interface PriceChartProps {
  bars: OHLCBar[];
  showRsi: boolean;
  onReady?: (chart: Chart) => void;
}

export function PriceChart({ bars, showRsi, onReady }: PriceChartProps) {
  const indicators = useMemo(() => (showRsi ? [{ id: 'rsi', params: { period: 14 } }] : []), [showRsi]);
  return (
    <TradeCanvas
      data={bars}
      stream={false}
      chartType="candlestick"
      indicators={indicators}
      onReady={onReady}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
