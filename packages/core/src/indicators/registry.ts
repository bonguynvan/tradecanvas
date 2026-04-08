import type { IndicatorEngine } from './IndicatorEngine.js';
// Overlays
import { SMAIndicator } from './overlay/SMA.js';
import { EMAIndicator } from './overlay/EMA.js';
import { BollingerBandsIndicator } from './overlay/BollingerBands.js';
import { VWAPIndicator } from './overlay/VWAP.js';
import { IchimokuIndicator } from './overlay/Ichimoku.js';
import { ParabolicSARIndicator } from './overlay/ParabolicSAR.js';
import { SupertrendIndicator } from './overlay/Supertrend.js';
import { KeltnerChannelIndicator } from './overlay/KeltnerChannel.js';
import { DonchianChannelIndicator } from './overlay/DonchianChannel.js';
// Panels
import { RSIIndicator } from './panel/RSI.js';
import { MACDIndicator } from './panel/MACD.js';
import { StochasticIndicator } from './panel/Stochastic.js';
import { ATRIndicator } from './panel/ATR.js';
import { ADXIndicator } from './panel/ADX.js';
import { OBVIndicator } from './panel/OBV.js';
import { WilliamsRIndicator } from './panel/WilliamsR.js';
import { CCIIndicator } from './panel/CCI.js';
import { MFIIndicator } from './panel/MFI.js';
import { AroonIndicator } from './panel/Aroon.js';
import { ROCIndicator } from './panel/ROC.js';
import { TSIIndicator } from './panel/TSI.js';
import { CMFIndicator } from './panel/CMF.js';
import { StdDevIndicator } from './panel/StdDev.js';
import { VolumeProfileIndicator } from './panel/VolumeProfile.js';
import { AccumulationDistributionIndicator } from './panel/AccumulationDistribution.js';
import { VROCIndicator } from './panel/VROC.js';

export function registerBuiltInIndicators(engine: IndicatorEngine): void {
  // Overlays
  engine.register(new SMAIndicator());
  engine.register(new EMAIndicator());
  engine.register(new BollingerBandsIndicator());
  engine.register(new VWAPIndicator());
  engine.register(new IchimokuIndicator());
  engine.register(new ParabolicSARIndicator());
  engine.register(new SupertrendIndicator());
  engine.register(new KeltnerChannelIndicator());
  engine.register(new DonchianChannelIndicator());
  // Panels
  engine.register(new RSIIndicator());
  engine.register(new MACDIndicator());
  engine.register(new StochasticIndicator());
  engine.register(new ATRIndicator());
  engine.register(new ADXIndicator());
  engine.register(new OBVIndicator());
  engine.register(new WilliamsRIndicator());
  engine.register(new CCIIndicator());
  engine.register(new MFIIndicator());
  engine.register(new AroonIndicator());
  engine.register(new ROCIndicator());
  engine.register(new TSIIndicator());
  engine.register(new CMFIndicator());
  engine.register(new StdDevIndicator());
  engine.register(new VolumeProfileIndicator());
  engine.register(new AccumulationDistributionIndicator());
  engine.register(new VROCIndicator());
}
