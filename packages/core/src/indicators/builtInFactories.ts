import type { IndicatorPlugin } from '@tradecanvas/commons';
import { SMAIndicator } from './overlay/SMA.js';
import { EMAIndicator } from './overlay/EMA.js';
import { BollingerBandsIndicator } from './overlay/BollingerBands.js';
import { VWAPIndicator } from './overlay/VWAP.js';
import { IchimokuIndicator } from './overlay/Ichimoku.js';
import { ParabolicSARIndicator } from './overlay/ParabolicSAR.js';
import { SupertrendIndicator } from './overlay/Supertrend.js';
import { KeltnerChannelIndicator } from './overlay/KeltnerChannel.js';
import { DonchianChannelIndicator } from './overlay/DonchianChannel.js';
import { PivotPointsIndicator } from './overlay/PivotPoints.js';
import { AnchoredVWAPIndicator } from './overlay/AnchoredVWAP.js';
import { ZigZagIndicator } from './overlay/ZigZag.js';
import { LinearRegressionChannelIndicator } from './overlay/LinearRegressionChannel.js';
import { HullMAIndicator } from './overlay/HullMA.js';
import { MTFMovingAverageIndicator } from './overlay/MTFMovingAverage.js';
import { SessionVWAPIndicator } from './overlay/SessionVWAP.js';
import { ChandelierExitIndicator } from './overlay/ChandelierExit.js';
import { AlligatorIndicator } from './overlay/Alligator.js';
import { VWMAIndicator } from './overlay/VWMA.js';
import { WMAIndicator } from './overlay/WMA.js';
import { EnvelopeIndicator } from './overlay/Envelope.js';
import { TEMAIndicator } from './overlay/TEMA.js';
import { AwesomeOscillatorIndicator } from './panel/AwesomeOscillator.js';
import { ChaikinOscillatorIndicator } from './panel/ChaikinOscillator.js';
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
import { VolumeDeltaIndicator } from './panel/VolumeDelta.js';
import { VortexIndicator } from './panel/Vortex.js';
import { ChoppinessIndexIndicator } from './panel/ChoppinessIndex.js';
import { UltimateOscillatorIndicator } from './panel/UltimateOscillator.js';
import { ForceIndexIndicator } from './panel/ForceIndex.js';
import { ConnorsRSIIndicator } from './panel/ConnorsRSI.js';
import { CoppockIndicator } from './panel/Coppock.js';
import { KSTIndicator } from './panel/KST.js';
import { ElderRayIndicator } from './panel/ElderRay.js';
import { SchaffTrendCycleIndicator } from './panel/SchaffTrendCycle.js';
import { KlingerIndicator } from './panel/Klinger.js';
import { FisherTransformIndicator } from './panel/FisherTransform.js';
import { DetrendedPriceOscillatorIndicator } from './panel/DetrendedPriceOscillator.js';
import { BalanceOfPowerIndicator } from './panel/BalanceOfPower.js';
import { MassIndexIndicator } from './panel/MassIndex.js';
import { ChandeMomentumIndicator } from './panel/ChandeMomentum.js';
import { TRIXIndicator } from './panel/TRIX.js';
import { EaseOfMovementIndicator } from './panel/EaseOfMovement.js';
import { PriceVolumeTrendIndicator } from './panel/PriceVolumeTrend.js';
import { WilliamsADIndicator } from './panel/WilliamsAD.js';
import { ChaikinVolatilityIndicator } from './panel/ChaikinVolatility.js';
import { RelativeVigorIndicator } from './panel/RelativeVigor.js';
import { StochasticRSIIndicator } from './panel/StochasticRSI.js';
import { PercentagePriceOscillatorIndicator } from './panel/PercentagePriceOscillator.js';
import { AcceleratorOscillatorIndicator } from './panel/AcceleratorOscillator.js';
import { RelativeMomentumIndexIndicator } from './panel/RelativeMomentumIndex.js';
import { DisparityIndexIndicator } from './panel/DisparityIndex.js';
import { QstickIndicator } from './panel/Qstick.js';
import { PrettyGoodOscillatorIndicator } from './panel/PrettyGoodOscillator.js';
import { StdDevIndicator } from './panel/StdDev.js';
import { VolumeProfileIndicator } from './panel/VolumeProfile.js';
import { AccumulationDistributionIndicator } from './panel/AccumulationDistribution.js';
import { VROCIndicator } from './panel/VROC.js';
import { DEMAIndicator } from './overlay/DEMA.js';
import { SMMAIndicator } from './overlay/SMMA.js';
import { ALMAIndicator } from './overlay/ALMA.js';
import { KAMAIndicator } from './overlay/KAMA.js';
import { LSMAIndicator } from './overlay/LSMA.js';
import { McGinleyDynamicIndicator } from './overlay/McGinleyDynamic.js';
import { MACrossIndicator } from './overlay/MACross.js';
import { WilliamsFractalsIndicator } from './overlay/WilliamsFractals.js';
import { ChandeKrollStopIndicator } from './overlay/ChandeKrollStop.js';
import { BollingerPercentBIndicator } from './panel/BollingerPercentB.js';
import { BollingerBandWidthIndicator } from './panel/BollingerBandWidth.js';
import { MomentumIndicator } from './panel/Momentum.js';
import { HistoricalVolatilityIndicator } from './panel/HistoricalVolatility.js';
import { VolumeOscillatorIndicator } from './panel/VolumeOscillator.js';
import { UlcerIndexIndicator } from './panel/UlcerIndex.js';
import { StochasticMomentumIndexIndicator } from './panel/StochasticMomentumIndex.js';
import { RelativeVolatilityIndexIndicator } from './panel/RelativeVolatilityIndex.js';
import { TrendStrengthIndexIndicator } from './panel/TrendStrengthIndex.js';
import { LinearRegressionSlopeIndicator } from './panel/LinearRegressionSlope.js';
import { StandardErrorIndicator } from './panel/StandardError.js';
import { AverageDayRangeIndicator } from './panel/AverageDayRange.js';
import { NetVolumeIndicator } from './panel/NetVolume.js';
import { StandardErrorBandsIndicator } from './overlay/StandardErrorBands.js';
import { GuppyMMAIndicator } from './overlay/GuppyMMA.js';
import { MARibbonIndicator } from './overlay/MARibbon.js';
import { AveragePriceIndicator, MedianPriceIndicator, TypicalPriceIndicator, WeightedCloseIndicator } from './overlay/PriceAverages.js';
import { PsychologicalLineIndicator, NewPsychologicalLineIndicator } from './panel/PsychologicalLine.js';
import { VolumeRatioIndicator } from './panel/VolumeRatio.js';
import { ABRatioIndicator } from './panel/ABRatio.js';
import { SonarIndicator } from './panel/Sonar.js';
import { SigmaIndicator } from './panel/Sigma.js';
import { VerticalHorizontalFilterIndicator } from './panel/VerticalHorizontalFilter.js';
import { RSquaredIndicator } from './panel/RSquared.js';
import { RandomWalkIndexIndicator } from './panel/RandomWalkIndex.js';
import { NegativeVolumeIndexIndicator, PositiveVolumeIndexIndicator } from './panel/VolumeIndexes.js';
import { TrueRangeIndicator } from './panel/TrueRange.js';
import { IntradayIntensityIndicator } from './panel/IntradayIntensity.js';
import { VolumeVsAverageIndicator, VolumeChangeIndicator, TradeValueIndicator } from './panel/VolumeComparisons.js';
import { BinaryWaveIndicator } from './panel/BinaryWave.js';
import { SmoothedROCIndicator } from './panel/SmoothedROC.js';
import { TimeSeriesForecastIndicator } from './overlay/TimeSeriesForecast.js';
import { DeMarkRangeIndicator } from './overlay/DeMarkRange.js';
import { MARainbowIndicator } from './overlay/MARainbow.js';
import { CandlePatternsIndicator } from './overlay/CandlePatterns.js';
import { MAChannelIndicator } from './overlay/MAChannel.js';
import { HammingMAIndicator } from './overlay/HammingMA.js';
import { MADoubleIndicator, MATripleIndicator } from './overlay/MovingAverageSets.js';
import { VolatilityIndexIndicator } from './overlay/VolatilityIndex.js';
import { AccumulativeSwingIndexIndicator } from './panel/AccumulativeSwingIndex.js';
import { AdvanceDeclineIndicator } from './panel/AdvanceDecline.js';
import { MajorityRuleIndicator } from './panel/MajorityRule.js';
import { ChopZoneIndicator } from './panel/ChopZone.js';
import { SMIErgodicIndicator } from './panel/SMIErgodic.js';
import { PriceOscillatorIndicator } from './panel/PriceOscillator.js';
import { VolatilityOHLCIndicator, VolatilityZeroTrendIndicator } from './panel/VolatilityEstimators.js';

/**
 * A new instance of each built-in indicator, in the order the chart lists
 * them. The chart's registry and the indicator worker both make theirs from
 * this one list, so the worker can compute every built-in the chart has.
 */
export const BUILT_IN_FACTORIES: readonly (() => IndicatorPlugin)[] = [
  () => new SMAIndicator(),
  () => new EMAIndicator(),
  () => new BollingerBandsIndicator(),
  () => new VWAPIndicator(),
  () => new IchimokuIndicator(),
  () => new ParabolicSARIndicator(),
  () => new SupertrendIndicator(),
  () => new KeltnerChannelIndicator(),
  () => new DonchianChannelIndicator(),
  () => new PivotPointsIndicator(),
  () => new AnchoredVWAPIndicator(),
  () => new ZigZagIndicator(),
  () => new LinearRegressionChannelIndicator(),
  () => new HullMAIndicator(),
  () => new MTFMovingAverageIndicator(),
  () => new SessionVWAPIndicator(),
  () => new ChandelierExitIndicator(),
  () => new AlligatorIndicator(),
  () => new VWMAIndicator(),
  () => new WMAIndicator(),
  () => new EnvelopeIndicator(),
  () => new TEMAIndicator(),
  () => new RSIIndicator(),
  () => new MACDIndicator(),
  () => new StochasticIndicator(),
  () => new ATRIndicator(),
  () => new ADXIndicator(),
  () => new OBVIndicator(),
  () => new WilliamsRIndicator(),
  () => new CCIIndicator(),
  () => new MFIIndicator(),
  () => new AroonIndicator(),
  () => new ROCIndicator(),
  () => new TSIIndicator(),
  () => new CMFIndicator(),
  () => new StdDevIndicator(),
  () => new VolumeProfileIndicator(),
  () => new AccumulationDistributionIndicator(),
  () => new VROCIndicator(),
  () => new AwesomeOscillatorIndicator(),
  () => new ChaikinOscillatorIndicator(),
  () => new VolumeDeltaIndicator(),
  () => new VortexIndicator(),
  () => new ChoppinessIndexIndicator(),
  () => new UltimateOscillatorIndicator(),
  () => new ForceIndexIndicator(),
  () => new ConnorsRSIIndicator(),
  () => new CoppockIndicator(),
  () => new KSTIndicator(),
  () => new ElderRayIndicator(),
  () => new SchaffTrendCycleIndicator(),
  () => new KlingerIndicator(),
  () => new FisherTransformIndicator(),
  () => new DetrendedPriceOscillatorIndicator(),
  () => new BalanceOfPowerIndicator(),
  () => new MassIndexIndicator(),
  () => new ChandeMomentumIndicator(),
  () => new TRIXIndicator(),
  () => new EaseOfMovementIndicator(),
  () => new PriceVolumeTrendIndicator(),
  () => new WilliamsADIndicator(),
  () => new ChaikinVolatilityIndicator(),
  () => new RelativeVigorIndicator(),
  () => new StochasticRSIIndicator(),
  () => new PercentagePriceOscillatorIndicator(),
  () => new AcceleratorOscillatorIndicator(),
  () => new RelativeMomentumIndexIndicator(),
  () => new DisparityIndexIndicator(),
  () => new QstickIndicator(),
  () => new PrettyGoodOscillatorIndicator(),
  () => new DEMAIndicator(),
  () => new SMMAIndicator(),
  () => new ALMAIndicator(),
  () => new KAMAIndicator(),
  () => new LSMAIndicator(),
  () => new McGinleyDynamicIndicator(),
  () => new MACrossIndicator(),
  () => new WilliamsFractalsIndicator(),
  () => new ChandeKrollStopIndicator(),
  () => new BollingerPercentBIndicator(),
  () => new BollingerBandWidthIndicator(),
  () => new MomentumIndicator(),
  () => new HistoricalVolatilityIndicator(),
  () => new VolumeOscillatorIndicator(),
  () => new UlcerIndexIndicator(),
  () => new StochasticMomentumIndexIndicator(),
  () => new RelativeVolatilityIndexIndicator(),
  () => new TrendStrengthIndexIndicator(),
  () => new LinearRegressionSlopeIndicator(),
  () => new StandardErrorIndicator(),
  () => new AverageDayRangeIndicator(),
  () => new NetVolumeIndicator(),
  () => new StandardErrorBandsIndicator(),
  () => new GuppyMMAIndicator(),
  () => new MARibbonIndicator(),
  () => new AveragePriceIndicator(),
  () => new MedianPriceIndicator(),
  () => new TypicalPriceIndicator(),
  () => new MAChannelIndicator(),
  () => new HammingMAIndicator(),
  () => new MADoubleIndicator(),
  () => new MATripleIndicator(),
  () => new VolatilityIndexIndicator(),
  () => new AccumulativeSwingIndexIndicator(),
  () => new AdvanceDeclineIndicator(),
  () => new MajorityRuleIndicator(),
  () => new ChopZoneIndicator(),
  () => new SMIErgodicIndicator(),
  () => new PriceOscillatorIndicator(),
  () => new VolatilityOHLCIndicator(),
  () => new VolatilityZeroTrendIndicator(),
  () => new PsychologicalLineIndicator(),
  () => new NewPsychologicalLineIndicator(),
  () => new VolumeRatioIndicator(),
  () => new ABRatioIndicator(),
  () => new SonarIndicator(),
  () => new SigmaIndicator(),
  () => new VerticalHorizontalFilterIndicator(),
  () => new RSquaredIndicator(),
  () => new RandomWalkIndexIndicator(),
  () => new NegativeVolumeIndexIndicator(),
  () => new PositiveVolumeIndexIndicator(),
  () => new TrueRangeIndicator(),
  () => new IntradayIntensityIndicator(),
  () => new VolumeVsAverageIndicator(),
  () => new VolumeChangeIndicator(),
  () => new TradeValueIndicator(),
  () => new BinaryWaveIndicator(),
  () => new SmoothedROCIndicator(),
  () => new TimeSeriesForecastIndicator(),
  () => new WeightedCloseIndicator(),
  () => new DeMarkRangeIndicator(),
  () => new MARainbowIndicator(),
  () => new CandlePatternsIndicator(),
];
