/// <reference lib="webworker" />
import type { IndicatorPlugin } from '@tradecanvas/commons';
import type {
  IndicatorWorkerRequest,
  IndicatorWorkerResponse,
} from './messages.js';

import { SMAIndicator } from '../overlay/SMA.js';
import { EMAIndicator } from '../overlay/EMA.js';
import { BollingerBandsIndicator } from '../overlay/BollingerBands.js';
import { VWAPIndicator } from '../overlay/VWAP.js';
import { IchimokuIndicator } from '../overlay/Ichimoku.js';
import { ParabolicSARIndicator } from '../overlay/ParabolicSAR.js';
import { SupertrendIndicator } from '../overlay/Supertrend.js';
import { KeltnerChannelIndicator } from '../overlay/KeltnerChannel.js';
import { DonchianChannelIndicator } from '../overlay/DonchianChannel.js';
import { PivotPointsIndicator } from '../overlay/PivotPoints.js';
import { AnchoredVWAPIndicator } from '../overlay/AnchoredVWAP.js';
import { ZigZagIndicator } from '../overlay/ZigZag.js';
import { LinearRegressionChannelIndicator } from '../overlay/LinearRegressionChannel.js';
import { HullMAIndicator } from '../overlay/HullMA.js';

import { RSIIndicator } from '../panel/RSI.js';
import { MACDIndicator } from '../panel/MACD.js';
import { StochasticIndicator } from '../panel/Stochastic.js';
import { ATRIndicator } from '../panel/ATR.js';
import { ADXIndicator } from '../panel/ADX.js';
import { OBVIndicator } from '../panel/OBV.js';
import { WilliamsRIndicator } from '../panel/WilliamsR.js';
import { CCIIndicator } from '../panel/CCI.js';
import { MFIIndicator } from '../panel/MFI.js';
import { AroonIndicator } from '../panel/Aroon.js';
import { ROCIndicator } from '../panel/ROC.js';
import { TSIIndicator } from '../panel/TSI.js';
import { CMFIndicator } from '../panel/CMF.js';
import { StdDevIndicator } from '../panel/StdDev.js';
import { VolumeProfileIndicator } from '../panel/VolumeProfile.js';
import { AccumulationDistributionIndicator } from '../panel/AccumulationDistribution.js';
import { VROCIndicator } from '../panel/VROC.js';
import { AwesomeOscillatorIndicator } from '../panel/AwesomeOscillator.js';
import { ChaikinOscillatorIndicator } from '../panel/ChaikinOscillator.js';

const registry = new Map<string, IndicatorPlugin>();
function register(plugin: IndicatorPlugin): void {
  registry.set(plugin.descriptor.id, plugin);
}

register(new SMAIndicator());
register(new EMAIndicator());
register(new BollingerBandsIndicator());
register(new VWAPIndicator());
register(new IchimokuIndicator());
register(new ParabolicSARIndicator());
register(new SupertrendIndicator());
register(new KeltnerChannelIndicator());
register(new DonchianChannelIndicator());
register(new PivotPointsIndicator());
register(new AnchoredVWAPIndicator());
register(new ZigZagIndicator());
register(new LinearRegressionChannelIndicator());
register(new HullMAIndicator());

register(new RSIIndicator());
register(new MACDIndicator());
register(new StochasticIndicator());
register(new ATRIndicator());
register(new ADXIndicator());
register(new OBVIndicator());
register(new WilliamsRIndicator());
register(new CCIIndicator());
register(new MFIIndicator());
register(new AroonIndicator());
register(new ROCIndicator());
register(new TSIIndicator());
register(new CMFIndicator());
register(new StdDevIndicator());
register(new VolumeProfileIndicator());
register(new AccumulationDistributionIndicator());
register(new VROCIndicator());
register(new AwesomeOscillatorIndicator());
register(new ChaikinOscillatorIndicator());

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (ev: MessageEvent<IndicatorWorkerRequest>) => {
  const req = ev.data;
  let res: IndicatorWorkerResponse;
  try {
    if (req.type === 'ping') {
      res = { type: 'pong', requestId: req.requestId };
    } else if (req.type === 'calculate') {
      const plugin = registry.get(req.indicatorId);
      if (!plugin) {
        res = { type: 'error', requestId: req.requestId, message: `Unknown indicator: ${req.indicatorId}` };
      } else {
        const output = plugin.calculate(req.data, req.config);
        res = { type: 'result', requestId: req.requestId, output };
      }
    } else {
      res = { type: 'error', requestId: (req as { requestId: number }).requestId, message: 'Unknown request type' };
    }
  } catch (err) {
    res = {
      type: 'error',
      requestId: (req as { requestId: number }).requestId,
      message: err instanceof Error ? err.message : 'Unknown worker error',
    };
  }
  ctx.postMessage(res);
});
