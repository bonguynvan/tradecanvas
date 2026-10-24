// Wrong: makes the chart by hand once, never follows the props, and leaves it behind on unmount.
import { useEffect, useRef } from 'react';
import { Chart, type OHLCBar } from '@tradecanvas/chart';

interface PriceChartProps {
  bars: OHLCBar[];
  showRsi: boolean;
  onReady?: (chart: Chart) => void;
}

export function PriceChart({ bars, showRsi, onReady }: PriceChartProps) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const chart = new Chart(el.current!, { chartType: 'candlestick' });
    chart.setData(bars);
    if (showRsi) chart.addIndicator('rsi', { period: 14 }, 'bottom');
    onReady?.(chart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={el} style={{ width: '100%', height: '100%' }} />;
}
