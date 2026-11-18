import { Chart } from '@tradecanvas/chart';
import type { ChartType, TimeFrame, FeaturesConfig, Theme, OHLCBar, SignalMarker, TradeZone, SignalMarkerStyle, TradeZoneStyle, DataAdapter } from '@tradecanvas/chart';
interface Props {
    symbol?: string;
    timeframe?: TimeFrame;
    theme?: 'dark' | 'light' | Theme;
    chartType?: ChartType;
    indicators?: string[];
    data?: OHLCBar[];
    adapter?: DataAdapter;
    historyLimit?: number;
    features?: FeaturesConfig;
    autoScale?: boolean;
    signalMarkers?: SignalMarker[];
    signalMarkerStyle?: SignalMarkerStyle;
    tradeZones?: TradeZone[];
    tradeZoneStyle?: TradeZoneStyle;
    watermarkText?: string;
    onReady?: (chart: Chart) => void;
    chart?: Chart | null;
}
declare const TradeCanvas: import("svelte").Component<Props, {}, "chart">;
type TradeCanvas = ReturnType<typeof TradeCanvas>;
export default TradeCanvas;
