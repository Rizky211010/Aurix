/**
 * PROFESSIONAL TRADING RULES ENGINE
 * 
 * Bertindak seperti DESK ANALISIS INSTITUSIONAL.
 * Bukan trader emosional, bukan spekulan, dan bukan penasihat keuangan.
 * 
 * Output: BUY | SELL | WAIT
 * WAIT adalah keputusan profesional.
 */

// ==================== TYPES ====================

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SwingPoint {
  type: 'HH' | 'HL' | 'LH' | 'LL';
  price: number;
  time: number;
}

export interface Indicators {
  ema9: number;
  ema21: number;
  ema200: number;
  atr: number;
  rsi?: number;
}

export interface MarketHealth {
  connectionStatus: 'OK' | 'DEGRADED' | 'DOWN';
  dataDelayMs: number;
  visibleCandles: number;
  totalCandles: number;
  tickRate?: number;
  candleComplete: boolean;
}

export interface Sentiment {
  bias: 'bullish' | 'bearish' | 'neutral';
  fearGreed?: number;
  whaleActivity?: 'BUYING' | 'SELLING' | 'NEUTRAL';
  volumeTrend?: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface TradingRulesInput {
  symbol: string;
  timeframe: string;
  mode: 'ANALYSIS' | 'DRY_RUN' | 'LIVE';
  candles: CandleData[];
  indicators: Indicators;
  swingHigh?: number;
  swingLow?: number;
  swingPoints?: SwingPoint[];
  marketHealth: MarketHealth;
  sentiment?: Sentiment;
}

export interface GateResult {
  ok: boolean;
  reason: string;
}

export interface TradingPlan {
  active: boolean;
  entry: number;
  sl: number;
  tp: [number, number];
}

export interface TradingRulesOutput {
  symbol: string;
  timeframe: string;
  marketHealth: MarketHealth;
  trend: {
    direction: 'bullish' | 'bearish' | 'sideways';
    reason: string;
  };
  levels: {
    support: Array<{ label: string; price: number }>;
    resistance: Array<{ label: string; price: number }>;
    position_now: 'near_support' | 'near_resistance' | 'mid_range';
  };
  gates: {
    data: GateResult;
    trend: GateResult;
    volatility: GateResult;
    setup: GateResult;
    riskRR: GateResult;
    sentiment: GateResult;
  };
  signal: {
    bias: 'BUY' | 'SELL' | 'WAIT';
    confidence: number;
    setup_type: 'trend_pullback' | 'breakout' | 'range' | 'none';
  };
  plan: {
    buy: TradingPlan;
    sell: TradingPlan;
  };
  riskNote: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate EMA
 */
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Simple average for ATR
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / recentTR.length;
}

/**
 * Calculate RSI
 */
function calculateRSI(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 50;
  
  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }
  
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
  
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0.0001;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Detect swing points (HH, HL, LH, LL)
 */
function detectSwingPoints(candles: CandleData[], lookback: number = 5): SwingPoint[] {
  const swings: SwingPoint[] = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    const leftCandles = candles.slice(i - lookback, i);
    const rightCandles = candles.slice(i + 1, i + lookback + 1);
    
    // Check for swing high
    const isSwingHigh = leftCandles.every(c => c.high < current.high) &&
                        rightCandles.every(c => c.high < current.high);
    
    // Check for swing low
    const isSwingLow = leftCandles.every(c => c.low > current.low) &&
                       rightCandles.every(c => c.low > current.low);
    
    if (isSwingHigh || isSwingLow) {
      // Determine type based on previous swing
      const prevSwing = swings[swings.length - 1];
      
      if (isSwingHigh) {
        const type: 'HH' | 'LH' = prevSwing && prevSwing.type.includes('H') 
          ? (current.high > prevSwing.price ? 'HH' : 'LH')
          : 'HH';
        swings.push({ type, price: current.high, time: current.time });
      } else if (isSwingLow) {
        const type: 'HL' | 'LL' = prevSwing && prevSwing.type.includes('L')
          ? (current.low > prevSwing.price ? 'HL' : 'LL')
          : 'HL';
        swings.push({ type, price: current.low, time: current.time });
      }
    }
  }
  
  return swings.slice(-10); // Last 10 swings
}

/**
 * Calculate Support and Resistance levels
 */
function calculateSR(candles: CandleData[], swingPoints: SwingPoint[]): {
  support: Array<{ label: string; price: number }>;
  resistance: Array<{ label: string; price: number }>;
} {
  const highs = swingPoints.filter(s => s.type === 'HH' || s.type === 'LH').map(s => s.price);
  const lows = swingPoints.filter(s => s.type === 'HL' || s.type === 'LL').map(s => s.price);
  
  // If no swings, use candle data
  if (highs.length === 0) {
    const recentCandles = candles.slice(-50);
    highs.push(Math.max(...recentCandles.map(c => c.high)));
  }
  if (lows.length === 0) {
    const recentCandles = candles.slice(-50);
    lows.push(Math.min(...recentCandles.map(c => c.low)));
  }
  
  // Sort and get top 2
  const sortedHighs = [...new Set(highs)].sort((a, b) => b - a);
  const sortedLows = [...new Set(lows)].sort((a, b) => a - b);
  
  return {
    resistance: [
      { label: 'R1', price: sortedHighs[0] || 0 },
      { label: 'R2', price: sortedHighs[1] || sortedHighs[0] || 0 },
    ],
    support: [
      { label: 'S1', price: sortedLows[0] || 0 },
      { label: 'S2', price: sortedLows[1] || sortedLows[0] || 0 },
    ],
  };
}

/**
 * Check if price is near a level (within threshold percentage)
 */
function isNearLevel(price: number, level: number, thresholdPercent: number = 0.5): boolean {
  const diff = Math.abs(price - level) / price * 100;
  return diff <= thresholdPercent;
}

/**
 * Check for bullish rejection candle
 */
function hasBullishRejection(candles: CandleData[]): boolean {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!last || !prev) return false;
  
  const body = Math.abs(last.close - last.open);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const range = last.high - last.low;
  
  // Pin bar / hammer pattern
  const isPinBar = lowerWick > body * 2 && lowerWick > range * 0.5;
  // Bullish engulfing
  const isEngulfing = last.close > last.open && 
                      last.close > prev.high && 
                      last.open < prev.low;
  
  return isPinBar || isEngulfing;
}

/**
 * Check for bearish rejection candle
 */
function hasBearishRejection(candles: CandleData[]): boolean {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!last || !prev) return false;
  
  const body = Math.abs(last.close - last.open);
  const upperWick = last.high - Math.max(last.open, last.close);
  const range = last.high - last.low;
  
  // Shooting star pattern
  const isShootingStar = upperWick > body * 2 && upperWick > range * 0.5;
  // Bearish engulfing
  const isEngulfing = last.close < last.open && 
                      last.close < prev.low && 
                      last.open > prev.high;
  
  return isShootingStar || isEngulfing;
}

// ==================== GATE FUNCTIONS ====================

/**
 * GATE 1: Data Reliability
 */
function checkDataGate(input: TradingRulesInput): GateResult {
  const { marketHealth, candles } = input;
  
  if (marketHealth.connectionStatus !== 'OK') {
    return { ok: false, reason: `Connection status: ${marketHealth.connectionStatus}` };
  }
  
  if (marketHealth.dataDelayMs > 1500) {
    return { ok: false, reason: `Data delay too high: ${marketHealth.dataDelayMs}ms` };
  }
  
  if (marketHealth.visibleCandles < 100) {
    return { ok: false, reason: `Insufficient visible candles: ${marketHealth.visibleCandles}` };
  }
  
  if (marketHealth.totalCandles < 200 || candles.length < 200) {
    return { ok: false, reason: `Insufficient total candles: ${Math.min(marketHealth.totalCandles, candles.length)}` };
  }
  
  // Check data consistency
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].time <= candles[i-1].time) {
      return { ok: false, reason: 'Inconsistent candle timestamps' };
    }
  }
  
  return { ok: true, reason: 'Data quality verified' };
}

/**
 * GATE 2: Trend Determination
 */
function checkTrendGate(
  candles: CandleData[], 
  indicators: Indicators,
  swingPoints: SwingPoint[]
): { gate: GateResult; trend: 'bullish' | 'bearish' | 'sideways'; trendReason: string } {
  
  const currentPrice = candles[candles.length - 1].close;
  const ema200 = indicators.ema200;
  
  // Count candles above/below EMA200 in last 50
  const last50 = candles.slice(-50);
  const aboveEMA = last50.filter(c => c.close > ema200).length;
  const belowEMA = last50.filter(c => c.close < ema200).length;
  
  // Check swing structure
  const recentSwings = swingPoints.slice(-4);
  const hasHHHL = recentSwings.filter(s => s.type === 'HH' || s.type === 'HL').length >= 2;
  const hasLHLL = recentSwings.filter(s => s.type === 'LH' || s.type === 'LL').length >= 2;
  
  let trend: 'bullish' | 'bearish' | 'sideways';
  let trendReason: string;
  
  if (aboveEMA >= 35 && currentPrice > ema200 && hasHHHL) {
    trend = 'bullish';
    trendReason = `Price above EMA200 (${aboveEMA}/50 candles), HH/HL structure`;
  } else if (belowEMA >= 35 && currentPrice < ema200 && hasLHLL) {
    trend = 'bearish';
    trendReason = `Price below EMA200 (${belowEMA}/50 candles), LH/LL structure`;
  } else {
    trend = 'sideways';
    trendReason = `Mixed signals: ${aboveEMA} above, ${belowEMA} below EMA200`;
  }
  
  // If sideways without clear range, WAIT
  if (trend === 'sideways') {
    return {
      gate: { ok: false, reason: 'Sideways market - no clear trend' },
      trend,
      trendReason,
    };
  }
  
  return {
    gate: { ok: true, reason: `Clear ${trend} trend identified` },
    trend,
    trendReason,
  };
}

/**
 * GATE 3: Volatility Check (ATR)
 */
function checkVolatilityGate(
  candles: CandleData[],
  atr: number,
  symbol: string
): GateResult {
  
  const currentPrice = candles[candles.length - 1].close;
  const atrPercent = (atr / currentPrice) * 100;
  
  // Define thresholds based on asset type
  const isGold = symbol === 'XAUUSD';
  const isCrypto = symbol.includes('USDT') || symbol.includes('BTC');
  
  let minATR: number, maxATR: number;
  
  if (isGold) {
    minATR = 0.1;  // 0.1% minimum for gold
    maxATR = 1.5;  // 1.5% maximum
  } else if (isCrypto) {
    minATR = 0.3;  // Crypto more volatile
    maxATR = 5.0;
  } else {
    minATR = 0.05; // Forex pairs
    maxATR = 1.0;
  }
  
  if (atrPercent < minATR) {
    return { ok: false, reason: `ATR too low (${atrPercent.toFixed(2)}%) - market lesu` };
  }
  
  if (atrPercent > maxATR) {
    return { ok: false, reason: `ATR too high (${atrPercent.toFixed(2)}%) - market terlalu volatile` };
  }
  
  return { ok: true, reason: `ATR normal: ${atrPercent.toFixed(2)}%` };
}

/**
 * GATE 4: Support & Resistance Position
 */
function checkSRPosition(
  currentPrice: number,
  support: Array<{ label: string; price: number }>,
  resistance: Array<{ label: string; price: number }>
): { position: 'near_support' | 'near_resistance' | 'mid_range'; gate: GateResult } {
  
  const s1 = support[0]?.price || 0;
  const r1 = resistance[0]?.price || 0;
  
  const nearSupport = isNearLevel(currentPrice, s1, 0.5);
  const nearResistance = isNearLevel(currentPrice, r1, 0.5);
  
  if (nearSupport) {
    return {
      position: 'near_support',
      gate: { ok: true, reason: `Price near support S1 (${s1.toFixed(2)})` },
    };
  }
  
  if (nearResistance) {
    return {
      position: 'near_resistance',
      gate: { ok: true, reason: `Price near resistance R1 (${r1.toFixed(2)})` },
    };
  }
  
  return {
    position: 'mid_range',
    gate: { ok: false, reason: 'Price in mid-range - no clear level' },
  };
}

/**
 * GATE 5: Setup Validation (Trend + Pullback)
 */
function checkSetupGate(
  trend: 'bullish' | 'bearish' | 'sideways',
  position: 'near_support' | 'near_resistance' | 'mid_range',
  candles: CandleData[],
  indicators: Indicators,
  rsi?: number
): { gate: GateResult; setupType: 'trend_pullback' | 'breakout' | 'range' | 'none' } {
  
  const currentPrice = candles[candles.length - 1].close;
  const { ema21 } = indicators;
  
  // BUY Setup Check
  if (trend === 'bullish' && position === 'near_support') {
    const pullbackToEMA = isNearLevel(currentPrice, ema21, 1.0);
    const hasRejection = hasBullishRejection(candles);
    const rsiOK = !rsi || rsi < 70;
    
    if ((pullbackToEMA || position === 'near_support') && hasRejection && rsiOK) {
      return {
        gate: { ok: true, reason: 'Valid BUY setup: bullish trend + pullback + rejection' },
        setupType: 'trend_pullback',
      };
    }
  }
  
  // SELL Setup Check
  if (trend === 'bearish' && position === 'near_resistance') {
    const pullbackToEMA = isNearLevel(currentPrice, ema21, 1.0);
    const hasRejection = hasBearishRejection(candles);
    const rsiOK = !rsi || rsi > 30;
    
    if ((pullbackToEMA || position === 'near_resistance') && hasRejection && rsiOK) {
      return {
        gate: { ok: true, reason: 'Valid SELL setup: bearish trend + pullback + rejection' },
        setupType: 'trend_pullback',
      };
    }
  }
  
  return {
    gate: { ok: false, reason: 'No valid setup - conditions not met' },
    setupType: 'none',
  };
}

/**
 * GATE 6: Risk Reward Validation
 */
function checkRiskRewardGate(
  bias: 'BUY' | 'SELL',
  entry: number,
  sl: number,
  tp1: number,
  symbol: string,
  mode: 'ANALYSIS' | 'DRY_RUN' | 'LIVE'
): { gate: GateResult; rr: number } {
  
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp1 - entry);
  const rr = risk > 0 ? reward / risk : 0;
  
  // Minimum RR requirements
  const isGold = symbol === 'XAUUSD';
  const isLive = mode === 'LIVE';
  
  let minRR = 2.0;
  if (isGold) minRR = 2.5;
  if (isLive) minRR = 2.5;
  
  if (rr < minRR) {
    return {
      gate: { ok: false, reason: `RR ${rr.toFixed(2)} below minimum ${minRR}` },
      rr,
    };
  }
  
  return {
    gate: { ok: true, reason: `RR ${rr.toFixed(2)} meets requirement (min ${minRR})` },
    rr,
  };
}

/**
 * GATE 7: Sentiment Check (Modifier only)
 */
function checkSentimentGate(
  trend: 'bullish' | 'bearish' | 'sideways',
  sentiment?: Sentiment
): { gate: GateResult; modifier: number } {
  
  if (!sentiment) {
    return {
      gate: { ok: true, reason: 'No sentiment data - skipped' },
      modifier: 0,
    };
  }
  
  let modifier = 0;
  
  // Sentiment alignment check
  if (trend === 'bullish' && sentiment.bias === 'bullish') modifier += 0.05;
  if (trend === 'bearish' && sentiment.bias === 'bearish') modifier += 0.05;
  if (trend === 'bullish' && sentiment.bias === 'bearish') modifier -= 0.05;
  if (trend === 'bearish' && sentiment.bias === 'bullish') modifier -= 0.05;
  
  // Volume trend
  if (sentiment.volumeTrend === 'INCREASING') modifier += 0.03;
  if (sentiment.volumeTrend === 'DECREASING') modifier -= 0.03;
  
  // Whale activity
  if (trend === 'bullish' && sentiment.whaleActivity === 'BUYING') modifier += 0.02;
  if (trend === 'bearish' && sentiment.whaleActivity === 'SELLING') modifier += 0.02;
  
  return {
    gate: { ok: true, reason: `Sentiment modifier: ${(modifier * 100).toFixed(1)}%` },
    modifier,
  };
}

// ==================== MAIN ENGINE ====================

/**
 * Professional Trading Rules Engine
 * 
 * Proses semua GATES secara berurutan dan hasilkan signal.
 */
export function runTradingRulesEngine(input: TradingRulesInput): TradingRulesOutput {
  const { symbol, timeframe, mode, candles, marketHealth, sentiment } = input;
  const isGold = symbol === 'XAUUSD';
  const isLive = mode === 'LIVE';
  
  // Calculate indicators if not provided
  const closes = candles.map(c => c.close);
  const indicators: Indicators = {
    ema9: input.indicators?.ema9 || calculateEMA(closes, 9),
    ema21: input.indicators?.ema21 || calculateEMA(closes, 21),
    ema200: input.indicators?.ema200 || calculateEMA(closes, 200),
    atr: input.indicators?.atr || calculateATR(candles, 14),
    rsi: input.indicators?.rsi || calculateRSI(candles, 14),
  };
  
  // Detect swing points
  const swingPoints = input.swingPoints || detectSwingPoints(candles, 5);
  
  // Calculate S/R
  const { support, resistance } = calculateSR(candles, swingPoints);
  
  const currentPrice = candles[candles.length - 1].close;
  
  // Initialize output
  const output: TradingRulesOutput = {
    symbol,
    timeframe,
    marketHealth,
    trend: { direction: 'sideways', reason: '' },
    levels: { support, resistance, position_now: 'mid_range' },
    gates: {
      data: { ok: false, reason: '' },
      trend: { ok: false, reason: '' },
      volatility: { ok: false, reason: '' },
      setup: { ok: false, reason: '' },
      riskRR: { ok: false, reason: '' },
      sentiment: { ok: false, reason: '' },
    },
    signal: { bias: 'WAIT', confidence: 0, setup_type: 'none' },
    plan: {
      buy: { active: false, entry: 0, sl: 0, tp: [0, 0] },
      sell: { active: false, entry: 0, sl: 0, tp: [0, 0] },
    },
    riskNote: 'Analisis probabilitas. Stop loss wajib. Risiko maksimal 1% per trade.',
  };
  
  // ===== GATE 1: DATA RELIABILITY =====
  output.gates.data = checkDataGate(input);
  if (!output.gates.data.ok) {
    return output; // WAIT
  }
  
  // ===== GATE 2: TREND DETERMINATION =====
  const trendResult = checkTrendGate(candles, indicators, swingPoints);
  output.gates.trend = trendResult.gate;
  output.trend = { direction: trendResult.trend, reason: trendResult.trendReason };
  
  if (!trendResult.gate.ok) {
    return output; // WAIT - sideways
  }
  
  // ===== GATE 3: VOLATILITY =====
  output.gates.volatility = checkVolatilityGate(candles, indicators.atr, symbol);
  if (!output.gates.volatility.ok) {
    return output; // WAIT - volatility issue
  }
  
  // ===== GATE 4: S/R POSITION =====
  const srResult = checkSRPosition(currentPrice, support, resistance);
  output.levels.position_now = srResult.position;
  
  if (srResult.position === 'mid_range') {
    output.gates.setup = { ok: false, reason: 'Price in mid-range - WAIT' };
    return output;
  }
  
  // ===== GATE 5: SETUP VALIDATION =====
  const setupResult = checkSetupGate(
    trendResult.trend,
    srResult.position,
    candles,
    indicators,
    indicators.rsi
  );
  output.gates.setup = setupResult.gate;
  output.signal.setup_type = setupResult.setupType;
  
  if (!setupResult.gate.ok) {
    return output; // WAIT - no setup
  }
  
  // Determine bias based on trend and position
  let bias: 'BUY' | 'SELL' = 'BUY';
  if (trendResult.trend === 'bullish' && srResult.position === 'near_support') {
    bias = 'BUY';
  } else if (trendResult.trend === 'bearish' && srResult.position === 'near_resistance') {
    bias = 'SELL';
  } else {
    output.signal.bias = 'WAIT';
    return output;
  }
  
  // Calculate entry, SL, TP
  const atr = indicators.atr;
  let entry: number, sl: number, tp1: number, tp2: number;
  
  if (bias === 'BUY') {
    entry = currentPrice;
    sl = Math.min(support[0].price, currentPrice - atr * 1.5);
    const risk = entry - sl;
    tp1 = entry + risk * 2;
    tp2 = entry + risk * 3;
  } else {
    entry = currentPrice;
    sl = Math.max(resistance[0].price, currentPrice + atr * 1.5);
    const risk = sl - entry;
    tp1 = entry - risk * 2;
    tp2 = entry - risk * 3;
  }
  
  // ===== GATE 6: RISK REWARD =====
  const rrResult = checkRiskRewardGate(bias, entry, sl, tp1, symbol, mode);
  output.gates.riskRR = rrResult.gate;
  
  if (!rrResult.gate.ok) {
    return output; // WAIT - bad RR
  }
  
  // ===== GATE 7: SENTIMENT =====
  const sentimentResult = checkSentimentGate(trendResult.trend, sentiment);
  output.gates.sentiment = sentimentResult.gate;
  
  // Calculate final confidence
  let confidence = 0.6; // Base confidence
  
  // Add confidence from gates
  if (output.gates.data.ok) confidence += 0.05;
  if (output.gates.trend.ok) confidence += 0.1;
  if (output.gates.volatility.ok) confidence += 0.05;
  if (output.gates.setup.ok) confidence += 0.1;
  if (rrResult.rr >= 2.5) confidence += 0.05;
  if (rrResult.rr >= 3) confidence += 0.05;
  
  // Add sentiment modifier
  confidence += sentimentResult.modifier;
  
  // Cap confidence
  if (isGold) confidence = Math.min(confidence, 0.75);
  confidence = Math.min(confidence, 0.95);
  confidence = Math.max(confidence, 0);
  
  // ===== LIVE BOT LOCK =====
  if (isLive) {
    if (confidence < 0.70) {
      output.signal = { bias: 'WAIT', confidence: 0, setup_type: 'none' };
      output.gates.setup = { ok: false, reason: 'LIVE MODE: Confidence below 70% threshold' };
      return output;
    }
    
    if (!marketHealth.candleComplete) {
      output.signal = { bias: 'WAIT', confidence: 0, setup_type: 'none' };
      output.gates.data = { ok: false, reason: 'LIVE MODE: Candle not complete' };
      return output;
    }
    
    // Sentiment conflict check in LIVE mode
    if (sentiment) {
      const trendBullish = trendResult.trend === 'bullish';
      const sentimentBearish = sentiment.bias === 'bearish';
      const trendBearish = trendResult.trend === 'bearish';
      const sentimentBullish = sentiment.bias === 'bullish';
      
      if ((trendBullish && sentimentBearish) || (trendBearish && sentimentBullish)) {
        output.signal = { bias: 'WAIT', confidence: 0, setup_type: 'none' };
        output.gates.sentiment = { ok: false, reason: 'LIVE MODE: Sentiment conflicts with trend' };
        return output;
      }
    }
  }
  
  // ===== FINAL OUTPUT =====
  output.signal = {
    bias,
    confidence: Math.round(confidence * 100) / 100,
    setup_type: setupResult.setupType,
  };
  
  if (bias === 'BUY') {
    output.plan.buy = {
      active: true,
      entry: Math.round(entry * 100) / 100,
      sl: Math.round(sl * 100) / 100,
      tp: [Math.round(tp1 * 100) / 100, Math.round(tp2 * 100) / 100],
    };
  } else {
    output.plan.sell = {
      active: true,
      entry: Math.round(entry * 100) / 100,
      sl: Math.round(sl * 100) / 100,
      tp: [Math.round(tp1 * 100) / 100, Math.round(tp2 * 100) / 100],
    };
  }
  
  return output;
}

/**
 * Helper to format output for AI prompt
 */
export function formatRulesOutputForAI(output: TradingRulesOutput): string {
  return JSON.stringify(output, null, 2);
}

/**
 * Quick analysis without full engine (for UI feedback)
 */
export function quickAnalysis(candles: CandleData[]): {
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number;
  ema200: number;
  atr: number;
  rsi: number;
} {
  const closes = candles.map(c => c.close);
  const ema200 = calculateEMA(closes, 200);
  const atr = calculateATR(candles, 14);
  const rsi = calculateRSI(candles, 14);
  const currentPrice = closes[closes.length - 1];
  
  let trend: 'bullish' | 'bearish' | 'sideways' = 'sideways';
  let strength = 50;
  
  if (currentPrice > ema200 * 1.01) {
    trend = 'bullish';
    strength = 50 + Math.min(40, ((currentPrice - ema200) / ema200) * 1000);
  } else if (currentPrice < ema200 * 0.99) {
    trend = 'bearish';
    strength = 50 - Math.min(40, ((ema200 - currentPrice) / ema200) * 1000);
  }
  
  return { trend, strength, ema200, atr, rsi };
}
