import {
  OHLC,
  PatternResult,
  DetectedPattern,
  PATTERN_INFO,
} from './types';

// ============================================
// Helper Functions
// ============================================

/**
 * Check if candle is bullish (close > open)
 */
export function isBullish(candle: OHLC): boolean {
  return candle.close > candle.open;
}

/**
 * Check if candle is bearish (close < open)
 */
export function isBearish(candle: OHLC): boolean {
  return candle.close < candle.open;
}

/**
 * Get candle body size (absolute)
 */
export function getBody(candle: OHLC): number {
  return Math.abs(candle.close - candle.open);
}

/**
 * Get candle total range (high - low)
 */
export function getRange(candle: OHLC): number {
  return candle.high - candle.low;
}

/**
 * Get upper wick size
 */
export function getUpperWick(candle: OHLC): number {
  return candle.high - Math.max(candle.open, candle.close);
}

/**
 * Get lower wick size
 */
export function getLowerWick(candle: OHLC): number {
  return Math.min(candle.open, candle.close) - candle.low;
}

/**
 * Get body to range ratio
 */
export function getBodyRatio(candle: OHLC): number {
  const range = getRange(candle);
  if (range === 0) return 0;
  return getBody(candle) / range;
}

/**
 * Get candle midpoint
 */
export function getMidpoint(candle: OHLC): number {
  return (candle.open + candle.close) / 2;
}

/**
 * Check if candle is a doji (very small body)
 */
export function isDoji(candle: OHLC, threshold: number = 0.1): boolean {
  return getBodyRatio(candle) < threshold;
}

/**
 * Check if current candle engulfs previous candle
 */
export function engulfs(current: OHLC, previous: OHLC): boolean {
  const currentBody = { high: Math.max(current.open, current.close), low: Math.min(current.open, current.close) };
  const prevBody = { high: Math.max(previous.open, previous.close), low: Math.min(previous.open, previous.close) };
  
  return currentBody.high > prevBody.high && currentBody.low < prevBody.low;
}

// ============================================
// Single Candle Pattern Detection
// ============================================

/**
 * Detect Doji patterns
 */
export function detectDoji(candle: OHLC): PatternResult | null {
  const bodyRatio = getBodyRatio(candle);
  const upperWick = getUpperWick(candle);
  const lowerWick = getLowerWick(candle);
  const range = getRange(candle);
  
  if (range === 0) return null;
  
  // Standard Doji - very small body
  if (bodyRatio < 0.1) {
    const upperWickRatio = upperWick / range;
    const lowerWickRatio = lowerWick / range;
    
    // Dragonfly Doji - long lower wick, no upper wick
    if (lowerWickRatio > 0.6 && upperWickRatio < 0.1) {
      return {
        patternName: PATTERN_INFO.DRAGONFLY_DOJI.name,
        patternType: 'DRAGONFLY_DOJI',
        signal: 'BULLISH',
        reliability: 'MEDIUM',
        description: PATTERN_INFO.DRAGONFLY_DOJI.description,
      };
    }
    
    // Gravestone Doji - long upper wick, no lower wick
    if (upperWickRatio > 0.6 && lowerWickRatio < 0.1) {
      return {
        patternName: PATTERN_INFO.GRAVESTONE_DOJI.name,
        patternType: 'GRAVESTONE_DOJI',
        signal: 'BEARISH',
        reliability: 'MEDIUM',
        description: PATTERN_INFO.GRAVESTONE_DOJI.description,
      };
    }
    
    // Standard Doji
    return {
      patternName: PATTERN_INFO.DOJI.name,
      patternType: 'DOJI',
      signal: 'NEUTRAL',
      reliability: 'LOW',
      description: PATTERN_INFO.DOJI.description,
    };
  }
  
  return null;
}

/**
 * Detect Hammer/Hanging Man patterns (context determines which)
 */
export function detectHammer(candle: OHLC): PatternResult | null {
  const body = getBody(candle);
  const range = getRange(candle);
  const lowerWick = getLowerWick(candle);
  const upperWick = getUpperWick(candle);
  
  if (range === 0) return null;
  
  const bodyRatio = body / range;
  const lowerWickRatio = lowerWick / range;
  const upperWickRatio = upperWick / range;
  
  // Hammer: small body at top, long lower wick, small/no upper wick
  if (bodyRatio < 0.35 && lowerWickRatio > 0.6 && upperWickRatio < 0.1) {
    return {
      patternName: PATTERN_INFO.HAMMER.name,
      patternType: 'HAMMER',
      signal: 'BULLISH',
      reliability: 'HIGH',
      description: PATTERN_INFO.HAMMER.description,
    };
  }
  
  // Inverted Hammer / Shooting Star: small body at bottom, long upper wick
  if (bodyRatio < 0.35 && upperWickRatio > 0.6 && lowerWickRatio < 0.1) {
    return {
      patternName: PATTERN_INFO.SHOOTING_STAR.name,
      patternType: 'SHOOTING_STAR',
      signal: 'BEARISH',
      reliability: 'HIGH',
      description: PATTERN_INFO.SHOOTING_STAR.description,
    };
  }
  
  return null;
}

// ============================================
// Two Candle Pattern Detection
// ============================================

/**
 * Detect Engulfing patterns
 */
export function detectEngulfing(current: OHLC, previous: OHLC): PatternResult | null {
  if (!engulfs(current, previous)) return null;
  
  const currentBody = getBody(current);
  const prevBody = getBody(previous);
  
  // Current candle should have meaningful body
  if (currentBody < prevBody * 0.5) return null;
  
  // Bullish Engulfing: previous bearish, current bullish
  if (isBearish(previous) && isBullish(current)) {
    return {
      patternName: PATTERN_INFO.BULLISH_ENGULFING.name,
      patternType: 'BULLISH_ENGULFING',
      signal: 'BULLISH',
      reliability: 'HIGH',
      description: PATTERN_INFO.BULLISH_ENGULFING.description,
    };
  }
  
  // Bearish Engulfing: previous bullish, current bearish
  if (isBullish(previous) && isBearish(current)) {
    return {
      patternName: PATTERN_INFO.BEARISH_ENGULFING.name,
      patternType: 'BEARISH_ENGULFING',
      signal: 'BEARISH',
      reliability: 'HIGH',
      description: PATTERN_INFO.BEARISH_ENGULFING.description,
    };
  }
  
  return null;
}

/**
 * Detect Piercing Line / Dark Cloud Cover
 */
export function detectPiercingDarkCloud(current: OHLC, previous: OHLC): PatternResult | null {
  const prevMidpoint = getMidpoint(previous);
  const prevBody = getBody(previous);
  const currentBody = getBody(current);
  
  // Need meaningful bodies
  if (prevBody === 0 || currentBody < prevBody * 0.3) return null;
  
  // Piercing Line: prev bearish, current opens below prev low, closes above prev midpoint
  if (isBearish(previous) && isBullish(current)) {
    if (current.open < previous.low && current.close > prevMidpoint && current.close < previous.open) {
      return {
        patternName: PATTERN_INFO.PIERCING_LINE.name,
        patternType: 'PIERCING_LINE',
        signal: 'BULLISH',
        reliability: 'MEDIUM',
        description: PATTERN_INFO.PIERCING_LINE.description,
      };
    }
  }
  
  // Dark Cloud Cover: prev bullish, current opens above prev high, closes below prev midpoint
  if (isBullish(previous) && isBearish(current)) {
    if (current.open > previous.high && current.close < prevMidpoint && current.close > previous.open) {
      return {
        patternName: PATTERN_INFO.DARK_CLOUD_COVER.name,
        patternType: 'DARK_CLOUD_COVER',
        signal: 'BEARISH',
        reliability: 'MEDIUM',
        description: PATTERN_INFO.DARK_CLOUD_COVER.description,
      };
    }
  }
  
  return null;
}

/**
 * Detect Tweezer patterns
 */
export function detectTweezer(current: OHLC, previous: OHLC): PatternResult | null {
  const tolerance = getRange(current) * 0.05; // 5% tolerance for matching
  
  // Tweezer Top: matching highs, first bullish, second bearish
  if (Math.abs(current.high - previous.high) <= tolerance) {
    if (isBullish(previous) && isBearish(current)) {
      return {
        patternName: PATTERN_INFO.TWEEZER_TOP.name,
        patternType: 'TWEEZER_TOP',
        signal: 'BEARISH',
        reliability: 'MEDIUM',
        description: PATTERN_INFO.TWEEZER_TOP.description,
      };
    }
  }
  
  // Tweezer Bottom: matching lows, first bearish, second bullish
  if (Math.abs(current.low - previous.low) <= tolerance) {
    if (isBearish(previous) && isBullish(current)) {
      return {
        patternName: PATTERN_INFO.TWEEZER_BOTTOM.name,
        patternType: 'TWEEZER_BOTTOM',
        signal: 'BULLISH',
        reliability: 'MEDIUM',
        description: PATTERN_INFO.TWEEZER_BOTTOM.description,
      };
    }
  }
  
  return null;
}

// ============================================
// Three Candle Pattern Detection
// ============================================

/**
 * Detect Morning Star / Evening Star
 */
export function detectStar(
  candle1: OHLC,
  candle2: OHLC,
  candle3: OHLC
): PatternResult | null {
  const body1 = getBody(candle1);
  const body2 = getBody(candle2);
  const body3 = getBody(candle3);
  
  // Middle candle should be small (star)
  if (body2 > body1 * 0.5 || body2 > body3 * 0.5) return null;
  
  // Morning Star: bearish, small, bullish
  if (isBearish(candle1) && isBullish(candle3)) {
    // Star gaps down from first candle (optional strict check)
    const hasGap = Math.min(candle1.open, candle1.close) > Math.max(candle2.open, candle2.close);
    // Third candle closes above midpoint of first
    const closeAboveMid = candle3.close > getMidpoint(candle1);
    
    if (closeAboveMid) {
      return {
        patternName: PATTERN_INFO.MORNING_STAR.name,
        patternType: 'MORNING_STAR',
        signal: 'BULLISH',
        reliability: hasGap ? 'HIGH' : 'MEDIUM',
        description: PATTERN_INFO.MORNING_STAR.description,
      };
    }
  }
  
  // Evening Star: bullish, small, bearish
  if (isBullish(candle1) && isBearish(candle3)) {
    // Star gaps up from first candle (optional strict check)
    const hasGap = Math.max(candle1.open, candle1.close) < Math.min(candle2.open, candle2.close);
    // Third candle closes below midpoint of first
    const closeBelowMid = candle3.close < getMidpoint(candle1);
    
    if (closeBelowMid) {
      return {
        patternName: PATTERN_INFO.EVENING_STAR.name,
        patternType: 'EVENING_STAR',
        signal: 'BEARISH',
        reliability: hasGap ? 'HIGH' : 'MEDIUM',
        description: PATTERN_INFO.EVENING_STAR.description,
      };
    }
  }
  
  return null;
}

/**
 * Detect Three White Soldiers / Three Black Crows
 */
export function detectThreeSoldiersCrows(
  candle1: OHLC,
  candle2: OHLC,
  candle3: OHLC
): PatternResult | null {
  const body1 = getBody(candle1);
  const body2 = getBody(candle2);
  const body3 = getBody(candle3);
  
  // All candles should have meaningful bodies
  const avgRange = (getRange(candle1) + getRange(candle2) + getRange(candle3)) / 3;
  if (body1 < avgRange * 0.3 || body2 < avgRange * 0.3 || body3 < avgRange * 0.3) return null;
  
  // Three White Soldiers: three consecutive bullish candles, each closing higher
  if (isBullish(candle1) && isBullish(candle2) && isBullish(candle3)) {
    if (candle2.close > candle1.close && candle3.close > candle2.close) {
      // Each opens within previous body
      if (candle2.open > candle1.open && candle2.open < candle1.close &&
          candle3.open > candle2.open && candle3.open < candle2.close) {
        return {
          patternName: PATTERN_INFO.THREE_WHITE_SOLDIERS.name,
          patternType: 'THREE_WHITE_SOLDIERS',
          signal: 'BULLISH',
          reliability: 'HIGH',
          description: PATTERN_INFO.THREE_WHITE_SOLDIERS.description,
        };
      }
    }
  }
  
  // Three Black Crows: three consecutive bearish candles, each closing lower
  if (isBearish(candle1) && isBearish(candle2) && isBearish(candle3)) {
    if (candle2.close < candle1.close && candle3.close < candle2.close) {
      // Each opens within previous body
      if (candle2.open < candle1.open && candle2.open > candle1.close &&
          candle3.open < candle2.open && candle3.open > candle2.close) {
        return {
          patternName: PATTERN_INFO.THREE_BLACK_CROWS.name,
          patternType: 'THREE_BLACK_CROWS',
          signal: 'BEARISH',
          reliability: 'HIGH',
          description: PATTERN_INFO.THREE_BLACK_CROWS.description,
        };
      }
    }
  }
  
  return null;
}

// ============================================
// Main Detection Functions
// ============================================

/**
 * Detect pattern from current and previous candle
 * Primary function for real-time detection
 */
export function detectPattern(
  currentCandle: OHLC,
  previousCandle: OHLC
): PatternResult | null {
  // Check single candle patterns first (on current candle)
  let pattern = detectDoji(currentCandle);
  if (pattern) return pattern;
  
  pattern = detectHammer(currentCandle);
  if (pattern) return pattern;
  
  // Check two candle patterns
  pattern = detectEngulfing(currentCandle, previousCandle);
  if (pattern) return pattern;
  
  pattern = detectPiercingDarkCloud(currentCandle, previousCandle);
  if (pattern) return pattern;
  
  pattern = detectTweezer(currentCandle, previousCandle);
  if (pattern) return pattern;
  
  return null;
}

/**
 * Detect all patterns in candle array
 * Returns array of detected patterns with their positions
 */
export function scanAllPatterns(candles: OHLC[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  if (candles.length < 2) return patterns;
  
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    // Two candle patterns
    let pattern = detectPattern(current, previous);
    if (pattern) {
      patterns.push({
        time: current.time,
        index: i,
        pattern,
        candles: [previous, current],
      });
      continue; // Skip to next to avoid duplicate detection
    }
    
    // Three candle patterns (need at least 3 candles)
    if (i >= 2) {
      const candle1 = candles[i - 2];
      const candle2 = candles[i - 1];
      const candle3 = candles[i];
      
      pattern = detectStar(candle1, candle2, candle3);
      if (pattern) {
        patterns.push({
          time: candle3.time,
          index: i,
          pattern,
          candles: [candle1, candle2, candle3],
        });
        continue;
      }
      
      pattern = detectThreeSoldiersCrows(candle1, candle2, candle3);
      if (pattern) {
        patterns.push({
          time: candle3.time,
          index: i,
          pattern,
          candles: [candle1, candle2, candle3],
        });
      }
    }
  }
  
  return patterns;
}

/**
 * Get recent patterns (last N candles)
 */
export function getRecentPatterns(
  candles: OHLC[],
  lookback: number = 20
): DetectedPattern[] {
  const startIndex = Math.max(0, candles.length - lookback);
  const recentCandles = candles.slice(startIndex);
  
  const patterns = scanAllPatterns(recentCandles);
  
  // Adjust indices to match original array
  return patterns.map(p => ({
    ...p,
    index: p.index + startIndex,
  }));
}

/**
 * Check if latest candle forms a pattern
 */
export function checkLatestPattern(candles: OHLC[]): DetectedPattern | null {
  if (candles.length < 2) return null;
  
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  
  // Two candle patterns
  let pattern = detectPattern(current, previous);
  if (pattern) {
    return {
      time: current.time,
      index: candles.length - 1,
      pattern,
      candles: [previous, current],
    };
  }
  
  // Three candle patterns
  if (candles.length >= 3) {
    const candle1 = candles[candles.length - 3];
    const candle2 = candles[candles.length - 2];
    const candle3 = candles[candles.length - 1];
    
    pattern = detectStar(candle1, candle2, candle3);
    if (pattern) {
      return {
        time: candle3.time,
        index: candles.length - 1,
        pattern,
        candles: [candle1, candle2, candle3],
      };
    }
    
    pattern = detectThreeSoldiersCrows(candle1, candle2, candle3);
    if (pattern) {
      return {
        time: candle3.time,
        index: candles.length - 1,
        pattern,
        candles: [candle1, candle2, candle3],
      };
    }
  }
  
  return null;
}
