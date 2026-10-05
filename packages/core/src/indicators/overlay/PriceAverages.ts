import type { IndicatorDescriptor, DataSeries, IndicatorConfig, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { PointwiseIndicator } from '../PointwiseIndicator.js';

/** One price worked out of each bar, drawn as a line over the bars. */
abstract class BarPriceIndicator extends PointwiseIndicator<null> {
  protected abstract price(bar: OHLCBar): number;

  protected read(_config: IndicatorConfig): null {
    return null;
  }

  protected pointAt(data: DataSeries, i: number): IndicatorValue | null {
    return { value: this.price(data[i]) };
  }
}

/** Average Price: (open + high + low + close) / 4. */
export class AveragePriceIndicator extends BarPriceIndicator {
  descriptor: IndicatorDescriptor = {
    id: 'avgprice',
    name: 'Average Price',
    placement: 'overlay',
    defaultConfig: {},
    shortName: 'OHLC4',
    plots: [{ key: 'value', title: 'Average', color: 0 }],
  };

  protected price(b: OHLCBar): number {
    return (b.open + b.high + b.low + b.close) / 4;
  }
}

/** Median Price: (high + low) / 2. */
export class MedianPriceIndicator extends BarPriceIndicator {
  descriptor: IndicatorDescriptor = {
    id: 'medprice',
    name: 'Median Price',
    placement: 'overlay',
    defaultConfig: {},
    shortName: 'HL2',
    plots: [{ key: 'value', title: 'Median', color: 0 }],
  };

  protected price(b: OHLCBar): number {
    return (b.high + b.low) / 2;
  }
}

/** Typical Price: (high + low + close) / 3. */
export class TypicalPriceIndicator extends BarPriceIndicator {
  descriptor: IndicatorDescriptor = {
    id: 'typprice',
    name: 'Typical Price',
    placement: 'overlay',
    defaultConfig: {},
    shortName: 'HLC3',
    plots: [{ key: 'value', title: 'Typical', color: 0 }],
  };

  protected price(b: OHLCBar): number {
    return (b.high + b.low + b.close) / 3;
  }
}
