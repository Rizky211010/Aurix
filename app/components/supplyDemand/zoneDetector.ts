import {
  PriceZone,
  ZoneType,
  ZoneStrength,
  ZoneDetectionConfig,
  DEFAULT_ZONE_CONFIG,
} from './types';

interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Generate unique zone ID
 */
function generateZoneId(type: ZoneType, time: number): string {
  return `${type}-${time}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate candle body size
 */
function getCandleBody(candle: OHLC): number {
  return Math.abs(candle.close - candle.open);
}

/**
 * Calculate candle range (high - low)
 */
function getCandleRange(candle: OHLC): number {
  return candle.high - candle.low;
}

/**
 * Check if candle is bullish
 */
function isBullish(candle: OHLC): boolean {
  return candle.close > candle.open;
}

/**
 * Check if candle is bearish
 */
function isBearish(candle: OHLC): boolean {
  return candle.close < candle.open;
}

/**
 * Calculate body to range ratio
 */
function getBodyRatio(candle: OHLC): number {
  const range = getCandleRange(candle);
  if (range === 0) return 0;
  return getCandleBody(candle) / range;
}

/**
 * Detect impulsive move (strong directional candles)
 */
function detectImpulseMove(
  candles: OHLC[],
  startIndex: number,
  direction: 'up' | 'down',
  config: ZoneDetectionConfig
): { endIndex: number; magnitude: number } | null {
  if (startIndex >= candles.length - 1) return null;

  let endIndex = startIndex;
  let impulseCandles = 0;
  const startPrice = direction === 'up' ? candles[startIndex].low : candles[startIndex].high;
  let endPrice = startPrice;

  for (let i = startIndex + 1; i < candles.length && impulseCandles < config.maxImpulseCandles; i++) {
    const candle = candles[i];
    
    if (direction === 'up') {
      // For bullish impulse, look for strong bullish candles
      if (isBullish(candle) && getBodyRatio(candle) > 0.5) {
        impulseCandles++;
        endIndex = i;
        endPrice = candle.high;
      } else if (isBearish(candle) && impulseCandles >= config.minImpulseCandles) {
        // Impulse ended with reversal
        break;
      } else if (isBearish(candle)) {
        // Weak impulse, reset
        break;
      }
    } else {
      // For bearish impulse, look for strong bearish candles
      if (isBearish(candle) && getBodyRatio(candle) > 0.5) {
        impulseCandles++;
        endIndex = i;
        endPrice = candle.low;
      } else if (isBullish(candle) && impulseCandles >= config.minImpulseCandles) {
        // Impulse ended with reversal
        break;
      } else if (isBullish(candle)) {
        // Weak impulse, reset
        break;
      }
    }
  }

  if (impulseCandles < config.minImpulseCandles) return null;

  const magnitude = Math.abs((endPrice - startPrice) / startPrice) * 100;
  
  if (magnitude < config.minImpulseMagnitude) return null;

  return { endIndex, magnitude };
}

/**
 * Find the base candle(s) before an impulsive move
 * This is where the zone is formed
 */
function findBaseCandles(
  candles: OHLC[],
  impulseStartIndex: number,
  direction: 'up' | 'down',
  config: ZoneDetectionConfig
): { startIndex: number; endIndex: number } | null {
  const lookbackStart = Math.max(0, impulseStartIndex - config.maxBaseCandles);
  
  // For demand zone (before bullish impulse), look for consolidation or bearish candle
  // For supply zone (before bearish impulse), look for consolidation or bullish candle
  
  let bestBaseStart = impulseStartIndex;
  const bestBaseEnd = impulseStartIndex;
  
  for (let i = impulseStartIndex; i >= lookbackStart; i--) {
    const candle = candles[i];
    const bodyRatio = getBodyRatio(candle);
    
    // Good base candle characteristics:
    // 1. Small body (consolidation) or
    // 2. Opposite direction candle (last sellers before demand, last buyers before supply)
    
    if (direction === 'up') {
      // For demand zone: look for bearish or small candle
      if (isBearish(candle) || bodyRatio < config.minBodyRatio) {
        bestBaseStart = i;
      }
    } else {
      // For supply zone: look for bullish or small candle
      if (isBullish(candle) || bodyRatio < config.minBodyRatio) {
        bestBaseStart = i;
      }
    }
  }

  if (bestBaseStart === impulseStartIndex && impulseStartIndex > 0) {
    // Use the candle just before impulse if no clear base found
    bestBaseStart = impulseStartIndex - 1;
  }

  return { startIndex: bestBaseStart, endIndex: bestBaseEnd };
}

/**
 * Calculate zone boundaries from base candles
 */
function calculateZoneBoundaries(
  candles: OHLC[],
  startIndex: number,
  endIndex: number
): { top: number; bottom: number } {
  let highest = -Infinity;
  let lowest = Infinity;

  for (let i = startIndex; i <= endIndex; i++) {
    highest = Math.max(highest, candles[i].high);
    lowest = Math.min(lowest, candles[i].low);
  }

  return { top: highest, bottom: lowest };
}

/**
 * Calculate imbalance ratio - how strong was the departure from zone
 */
function calculateImbalanceRatio(
  impulse: { magnitude: number; endIndex: number },
  zoneBoundaries: { top: number; bottom: number }
): number {
  const zoneSize = zoneBoundaries.top - zoneBoundaries.bottom;
  if (zoneSize === 0) return 0;
  
  // Ratio of impulse move to zone size
  const ratio = impulse.magnitude / (zoneSize / zoneBoundaries.bottom * 100);
  return Math.min(ratio, 10); // Cap at 10x
}

/**
 * Determine zone strength based on multiple factors
 */
function calculateZoneStrength(
  imbalanceRatio: number,
  impulseMagnitude: number,
  impulseCandles: number
): ZoneStrength {
  let score = 0;
  
  // Imbalance ratio contribution (0-3 points)
  if (imbalanceRatio > 3) score += 3;
  else if (imbalanceRatio > 2) score += 2;
  else if (imbalanceRatio > 1) score += 1;
  
  // Impulse magnitude contribution (0-3 points)
  if (impulseMagnitude > 2) score += 3;
  else if (impulseMagnitude > 1) score += 2;
  else if (impulseMagnitude > 0.5) score += 1;
  
  // Impulse speed (fewer candles = faster = stronger) (0-2 points)
  if (impulseCandles <= 2) score += 2;
  else if (impulseCandles <= 3) score += 1;
  
  if (score >= 7) return 'extreme';
  if (score >= 5) return 'strong';
  if (score >= 3) return 'moderate';
  return 'weak';
}

/**
 * Detect all Supply & Demand zones from candle data
 */
export function detectZones(
  candles: OHLC[],
  config: ZoneDetectionConfig = DEFAULT_ZONE_CONFIG
): PriceZone[] {
  const zones: PriceZone[] = [];
  
  if (candles.length < 10) return zones;

  for (let i = 2; i < candles.length - config.minImpulseCandles; i++) {
    // Look for potential zone formation
    // Demand zone: price makes a low, then strong move up
    // Supply zone: price makes a high, then strong move down
    
    // Check for potential demand zone (bullish impulse after)
    const bullishImpulse = detectImpulseMove(candles, i, 'up', config);
    if (bullishImpulse && bullishImpulse.magnitude >= config.minImpulseMagnitude) {
      const base = findBaseCandles(candles, i, 'up', config);
      if (base) {
        const boundaries = calculateZoneBoundaries(candles, base.startIndex, base.endIndex);
        const imbalanceRatio = calculateImbalanceRatio(bullishImpulse, boundaries);
        const strength = calculateZoneStrength(
          imbalanceRatio,
          bullishImpulse.magnitude,
          bullishImpulse.endIndex - i
        );
        
        const zone: PriceZone = {
          id: generateZoneId('demand', candles[base.startIndex].time),
          type: 'demand',
          status: 'fresh',
          strength,
          top: boundaries.top,
          bottom: boundaries.bottom,
          startTime: candles[base.startIndex].time,
          endTime: null,
          baseCandle: {
            ...candles[base.startIndex],
            index: base.startIndex,
          },
          impulseMove: {
            direction: 'up',
            startPrice: boundaries.bottom,
            endPrice: candles[bullishImpulse.endIndex].high,
            magnitude: bullishImpulse.magnitude,
            candles: bullishImpulse.endIndex - i,
          },
          touchCount: 0,
          lastTouchTime: null,
          mitigatedAt: null,
          imbalanceRatio,
          proximityScore: 0,
        };
        
        zones.push(zone);
      }
    }
    
    // Check for potential supply zone (bearish impulse after)
    const bearishImpulse = detectImpulseMove(candles, i, 'down', config);
    if (bearishImpulse && bearishImpulse.magnitude >= config.minImpulseMagnitude) {
      const base = findBaseCandles(candles, i, 'down', config);
      if (base) {
        const boundaries = calculateZoneBoundaries(candles, base.startIndex, base.endIndex);
        const imbalanceRatio = calculateImbalanceRatio(bearishImpulse, boundaries);
        const strength = calculateZoneStrength(
          imbalanceRatio,
          bearishImpulse.magnitude,
          bearishImpulse.endIndex - i
        );
        
        const zone: PriceZone = {
          id: generateZoneId('supply', candles[base.startIndex].time),
          type: 'supply',
          status: 'fresh',
          strength,
          top: boundaries.top,
          bottom: boundaries.bottom,
          startTime: candles[base.startIndex].time,
          endTime: null,
          baseCandle: {
            ...candles[base.startIndex],
            index: base.startIndex,
          },
          impulseMove: {
            direction: 'down',
            startPrice: boundaries.top,
            endPrice: candles[bearishImpulse.endIndex].low,
            magnitude: bearishImpulse.magnitude,
            candles: bearishImpulse.endIndex - i,
          },
          touchCount: 0,
          lastTouchTime: null,
          mitigatedAt: null,
          imbalanceRatio,
          proximityScore: 0,
        };
        
        zones.push(zone);
      }
    }
  }

  // Remove duplicate/overlapping zones, keeping stronger ones
  const filteredZones = filterOverlappingZones(zones);
  
  // Sort by time (newest first) and limit
  return filteredZones
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, config.maxZones);
}

/**
 * Filter overlapping zones, keeping the stronger one
 */
function filterOverlappingZones(zones: PriceZone[]): PriceZone[] {
  const strengthOrder: ZoneStrength[] = ['extreme', 'strong', 'moderate', 'weak'];
  
  // Sort by strength (strongest first)
  const sorted = [...zones].sort((a, b) => {
    return strengthOrder.indexOf(a.strength) - strengthOrder.indexOf(b.strength);
  });
  
  const kept: PriceZone[] = [];
  
  for (const zone of sorted) {
    // Check if this zone overlaps with any already kept zone of same type
    const overlaps = kept.some(k => 
      k.type === zone.type &&
      Math.abs(k.startTime - zone.startTime) < 10 * 3600 * 1000 && // Within 10 hours
      ((zone.bottom <= k.top && zone.top >= k.bottom)) // Price overlap
    );
    
    if (!overlaps) {
      kept.push(zone);
    }
  }
  
  return kept;
}

/**
 * Update zone status based on price action
 * Returns updated zones with fresh/tested/mitigated status
 */
export function updateZoneStatus(
  zones: PriceZone[],
  candles: OHLC[],
  config: ZoneDetectionConfig = DEFAULT_ZONE_CONFIG
): PriceZone[] {
  if (candles.length === 0) return zones;
  
  return zones.map(zone => {
    const updatedZone = { ...zone };
    
    // Only check candles after zone formation
    const zoneFormationIndex = candles.findIndex(c => c.time > zone.startTime);
    if (zoneFormationIndex === -1) return updatedZone;
    
    const relevantCandles = candles.slice(zoneFormationIndex);
    const zoneHeight = zone.top - zone.bottom;
    const mitigationLevel = zone.type === 'demand'
      ? zone.bottom + (zoneHeight * (config.mitigationThreshold / 100))
      : zone.top - (zoneHeight * (config.mitigationThreshold / 100));
    
    for (const candle of relevantCandles) {
      if (updatedZone.status === 'mitigated') break;
      
      // Check for zone touch
      const touchedZone = (candle.low <= zone.top && candle.high >= zone.bottom);
      
      if (touchedZone) {
        // Check for mitigation
        if (zone.type === 'demand') {
          // Demand zone mitigated when price closes below mitigation level
          const mitigated = config.bodyCloseMitigation
            ? candle.close < mitigationLevel
            : candle.low < mitigationLevel;
          
          if (mitigated) {
            updatedZone.status = 'mitigated';
            updatedZone.mitigatedAt = candle.time;
          } else if (updatedZone.status === 'fresh') {
            updatedZone.status = 'tested';
            updatedZone.touchCount++;
            updatedZone.lastTouchTime = candle.time;
          }
        } else {
          // Supply zone mitigated when price closes above mitigation level
          const mitigated = config.bodyCloseMitigation
            ? candle.close > mitigationLevel
            : candle.high > mitigationLevel;
          
          if (mitigated) {
            updatedZone.status = 'mitigated';
            updatedZone.mitigatedAt = candle.time;
          } else if (updatedZone.status === 'fresh') {
            updatedZone.status = 'tested';
            updatedZone.touchCount++;
            updatedZone.lastTouchTime = candle.time;
          }
        }
      }
    }
    
    return updatedZone;
  });
}

/**
 * Filter to get only fresh (untouched) zones
 */
export function getFreshZones(zones: PriceZone[]): PriceZone[] {
  return zones.filter(zone => zone.status === 'fresh');
}

/**
 * Filter to get tested but not mitigated zones
 */
export function getTestedZones(zones: PriceZone[]): PriceZone[] {
  return zones.filter(zone => zone.status === 'tested');
}

/**
 * Filter to get active (non-mitigated) zones
 */
export function getActiveZones(zones: PriceZone[]): PriceZone[] {
  return zones.filter(zone => zone.status !== 'mitigated');
}

/**
 * Get zones near current price
 */
export function getNearbyZones(
  zones: PriceZone[],
  currentPrice: number,
  proximityPercent: number = 2
): PriceZone[] {
  const threshold = currentPrice * (proximityPercent / 100);
  
  return zones.filter(zone => {
    const distanceToTop = Math.abs(zone.top - currentPrice);
    const distanceToBottom = Math.abs(zone.bottom - currentPrice);
    const minDistance = Math.min(distanceToTop, distanceToBottom);
    return minDistance <= threshold;
  });
}

/**
 * Get demand zones below current price (potential support)
 */
export function getDemandZonesBelow(zones: PriceZone[], currentPrice: number): PriceZone[] {
  return zones.filter(zone => 
    zone.type === 'demand' && 
    zone.status !== 'mitigated' &&
    zone.top < currentPrice
  ).sort((a, b) => b.top - a.top); // Closest first
}

/**
 * Get supply zones above current price (potential resistance)
 */
export function getSupplyZonesAbove(zones: PriceZone[], currentPrice: number): PriceZone[] {
  return zones.filter(zone => 
    zone.type === 'supply' && 
    zone.status !== 'mitigated' &&
    zone.bottom > currentPrice
  ).sort((a, b) => a.bottom - b.bottom); // Closest first
}
