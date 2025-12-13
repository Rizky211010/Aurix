import {
  SwingPoint,
  StructureBreak,
  MarketStructure,
  MarketStructureConfig,
  DEFAULT_STRUCTURE_CONFIG,
  TrendDirection,
} from './types';

interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Deteksi Swing High dari array OHLC data
 * Swing High: Candle dengan high tertinggi di antara N candle kiri dan N candle kanan
 */
export function detectSwingHighs(
  candles: OHLC[],
  lookback: number = 5
): SwingPoint[] {
  const swingHighs: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentHigh = candles[i].high;
    let isSwingHigh = true;

    // Cek apakah current high lebih tinggi dari semua candle di kiri dan kanan
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swingHighs.push({
        index: i,
        time: candles[i].time,
        price: currentHigh,
        type: 'high',
        confirmed: true,
      });
    }
  }

  return swingHighs;
}

/**
 * Deteksi Swing Low dari array OHLC data
 * Swing Low: Candle dengan low terendah di antara N candle kiri dan N candle kanan
 */
export function detectSwingLows(
  candles: OHLC[],
  lookback: number = 5
): SwingPoint[] {
  const swingLows: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentLow = candles[i].low;
    let isSwingLow = true;

    // Cek apakah current low lebih rendah dari semua candle di kiri dan kanan
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swingLows.push({
        index: i,
        time: candles[i].time,
        price: currentLow,
        type: 'low',
        confirmed: true,
      });
    }
  }

  return swingLows;
}

/**
 * Kombinasi dan sortir semua swing points berdasarkan waktu
 */
export function combineSwingPoints(
  highs: SwingPoint[],
  lows: SwingPoint[]
): SwingPoint[] {
  return [...highs, ...lows].sort((a, b) => a.time - b.time);
}

/**
 * Label swing points dengan HH, HL, LH, LL
 * HH (Higher High): High yang lebih tinggi dari high sebelumnya
 * HL (Higher Low): Low yang lebih tinggi dari low sebelumnya
 * LH (Lower High): High yang lebih rendah dari high sebelumnya
 * LL (Lower Low): Low yang lebih rendah dari low sebelumnya
 */
export function labelSwingPoints(swingPoints: SwingPoint[]): SwingPoint[] {
  const labeled: SwingPoint[] = [];
  let lastHigh: SwingPoint | null = null;
  let lastLow: SwingPoint | null = null;

  for (const point of swingPoints) {
    const labeledPoint = { ...point };

    if (point.type === 'high') {
      if (lastHigh) {
        labeledPoint.swingType = point.price > lastHigh.price ? 'HH' : 'LH';
      }
      lastHigh = labeledPoint;
    } else {
      if (lastLow) {
        labeledPoint.swingType = point.price > lastLow.price ? 'HL' : 'LL';
      }
      lastLow = labeledPoint;
    }

    labeled.push(labeledPoint);
  }

  return labeled;
}

/**
 * Deteksi Break of Structure (BOS) dan Change of Character (CHOCH)
 * 
 * BOS (Break of Structure): 
 * - Bullish BOS: Close di atas swing high sebelumnya dalam uptrend
 * - Bearish BOS: Close di bawah swing low sebelumnya dalam downtrend
 * 
 * CHOCH (Change of Character):
 * - Bullish CHOCH: Close di atas swing high dalam downtrend (reversal signal)
 * - Bearish CHOCH: Close di bawah swing low dalam uptrend (reversal signal)
 */
export function detectStructureBreaks(
  candles: OHLC[],
  swingPoints: SwingPoint[],
  config: MarketStructureConfig = DEFAULT_STRUCTURE_CONFIG
): StructureBreak[] {
  const structureBreaks: StructureBreak[] = [];
  let currentTrend: TrendDirection = 'neutral';

  // Tentukan trend awal dari beberapa swing pertama
  const highs = swingPoints.filter(p => p.type === 'high').slice(0, 3);
  const lows = swingPoints.filter(p => p.type === 'low').slice(0, 3);

  if (highs.length >= 2 && lows.length >= 2) {
    const hhCount = highs.filter((h, i) => i > 0 && h.price > highs[i - 1].price).length;
    const hlCount = lows.filter((l, i) => i > 0 && l.price > lows[i - 1].price).length;
    const lhCount = highs.filter((h, i) => i > 0 && h.price < highs[i - 1].price).length;
    const llCount = lows.filter((l, i) => i > 0 && l.price < lows[i - 1].price).length;

    if (hhCount + hlCount > lhCount + llCount) {
      currentTrend = 'bullish';
    } else if (lhCount + llCount > hhCount + hlCount) {
      currentTrend = 'bearish';
    }
  }

  // Scan candles untuk break structure
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    
    // Cari swing points yang sudah terbentuk sebelum candle ini
    const relevantSwings = swingPoints.filter(s => s.time < candle.time);
    if (relevantSwings.length < 2) continue;

    // Ambil swing high dan low terakhir
    const lastSwingHigh = [...relevantSwings].reverse().find(s => s.type === 'high');
    const lastSwingLow = [...relevantSwings].reverse().find(s => s.type === 'low');

    if (!lastSwingHigh || !lastSwingLow) continue;

    // Cek Bullish Break (close di atas swing high)
    const bullishBreak = config.bodyCloseOnly
      ? candle.close > lastSwingHigh.price
      : candle.high > lastSwingHigh.price;

    if (bullishBreak) {
      // Cek apakah sudah ada break di swing ini
      const alreadyBroken = structureBreaks.some(
        b => b.brokenSwing.time === lastSwingHigh.time && b.direction === 'bullish'
      );

      if (!alreadyBroken) {
        const breakType: 'BOS' | 'CHOCH' = currentTrend === 'bearish' ? 'CHOCH' : 'BOS';
        
        structureBreaks.push({
          index: i,
          time: candle.time,
          price: lastSwingHigh.price,
          type: breakType,
          direction: 'bullish',
          brokenSwing: lastSwingHigh,
          breakCandle: { ...candle },
        });

        // Update trend
        if (breakType === 'CHOCH') {
          currentTrend = 'bullish';
        }
      }
    }

    // Cek Bearish Break (close di bawah swing low)
    const bearishBreak = config.bodyCloseOnly
      ? candle.close < lastSwingLow.price
      : candle.low < lastSwingLow.price;

    if (bearishBreak) {
      // Cek apakah sudah ada break di swing ini
      const alreadyBroken = structureBreaks.some(
        b => b.brokenSwing.time === lastSwingLow.time && b.direction === 'bearish'
      );

      if (!alreadyBroken) {
        const breakType: 'BOS' | 'CHOCH' = currentTrend === 'bullish' ? 'CHOCH' : 'BOS';
        
        structureBreaks.push({
          index: i,
          time: candle.time,
          price: lastSwingLow.price,
          type: breakType,
          direction: 'bearish',
          brokenSwing: lastSwingLow,
          breakCandle: { ...candle },
        });

        // Update trend
        if (breakType === 'CHOCH') {
          currentTrend = 'bearish';
        }
      }
    }
  }

  return structureBreaks;
}

/**
 * Analisis lengkap Market Structure
 */
export function analyzeMarketStructure(
  candles: OHLC[],
  config: MarketStructureConfig = DEFAULT_STRUCTURE_CONFIG
): MarketStructure {
  if (candles.length < config.swingLookback * 2 + 1) {
    return {
      swingPoints: [],
      structureBreaks: [],
      currentTrend: 'neutral',
      lastHH: null,
      lastHL: null,
      lastLH: null,
      lastLL: null,
    };
  }

  // Deteksi swing highs dan lows
  const swingHighs = detectSwingHighs(candles, config.swingLookback);
  const swingLows = detectSwingLows(candles, config.swingLookback);

  // Kombinasi dan label
  const combinedSwings = combineSwingPoints(swingHighs, swingLows);
  const labeledSwings = labelSwingPoints(combinedSwings);

  // Deteksi structure breaks
  const structureBreaks = detectStructureBreaks(candles, labeledSwings, config);

  // Tentukan current trend
  let currentTrend: TrendDirection = 'neutral';
  const recentBreaks = structureBreaks.slice(-3);
  
  if (recentBreaks.length > 0) {
    const bullishBreaks = recentBreaks.filter(b => b.direction === 'bullish').length;
    const bearishBreaks = recentBreaks.filter(b => b.direction === 'bearish').length;
    
    if (bullishBreaks > bearishBreaks) {
      currentTrend = 'bullish';
    } else if (bearishBreaks > bullishBreaks) {
      currentTrend = 'bearish';
    }
  }

  // Ambil swing points terakhir untuk setiap tipe
  const lastHH = [...labeledSwings].reverse().find(s => s.swingType === 'HH') || null;
  const lastHL = [...labeledSwings].reverse().find(s => s.swingType === 'HL') || null;
  const lastLH = [...labeledSwings].reverse().find(s => s.swingType === 'LH') || null;
  const lastLL = [...labeledSwings].reverse().find(s => s.swingType === 'LL') || null;

  return {
    swingPoints: labeledSwings,
    structureBreaks,
    currentTrend,
    lastHH,
    lastHL,
    lastLH,
    lastLL,
  };
}

/**
 * ZigZag Algorithm untuk deteksi swing points
 * Alternatif yang lebih responsive dari fixed lookback
 */
export function zigZagSwings(
  candles: OHLC[],
  deviation: number = 0.5 // Persentase perubahan minimum
): SwingPoint[] {
  if (candles.length < 3) return [];

  const swingPoints: SwingPoint[] = [];
  let lastPivot: { type: 'high' | 'low'; price: number; index: number } | null = null;
  let currentHigh = candles[0].high;
  let currentLow = candles[0].low;
  let currentHighIndex = 0;
  let currentLowIndex = 0;

  const deviationMultiplier = deviation / 100;

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];

    // Update current extremes
    if (candle.high > currentHigh) {
      currentHigh = candle.high;
      currentHighIndex = i;
    }
    if (candle.low < currentLow) {
      currentLow = candle.low;
      currentLowIndex = i;
    }

    if (!lastPivot) {
      // Tentukan pivot pertama
      if (currentHigh - candle.low >= currentHigh * deviationMultiplier) {
        // High ditemukan
        lastPivot = { type: 'high', price: currentHigh, index: currentHighIndex };
        swingPoints.push({
          index: currentHighIndex,
          time: candles[currentHighIndex].time,
          price: currentHigh,
          type: 'high',
          confirmed: true,
        });
        currentLow = candle.low;
        currentLowIndex = i;
      } else if (candle.high - currentLow >= currentLow * deviationMultiplier) {
        // Low ditemukan
        lastPivot = { type: 'low', price: currentLow, index: currentLowIndex };
        swingPoints.push({
          index: currentLowIndex,
          time: candles[currentLowIndex].time,
          price: currentLow,
          type: 'low',
          confirmed: true,
        });
        currentHigh = candle.high;
        currentHighIndex = i;
      }
    } else if (lastPivot.type === 'high') {
      // Cari low berikutnya
      if (candle.high > currentHigh) {
        // Update high jika lebih tinggi
        currentHigh = candle.high;
        currentHighIndex = i;
        // Update last pivot
        lastPivot.price = currentHigh;
        lastPivot.index = currentHighIndex;
        swingPoints[swingPoints.length - 1] = {
          index: currentHighIndex,
          time: candles[currentHighIndex].time,
          price: currentHigh,
          type: 'high',
          confirmed: true,
        };
      } else if (currentHigh - candle.low >= currentHigh * deviationMultiplier) {
        // New low found
        lastPivot = { type: 'low', price: currentLow, index: currentLowIndex };
        swingPoints.push({
          index: currentLowIndex,
          time: candles[currentLowIndex].time,
          price: currentLow,
          type: 'low',
          confirmed: true,
        });
        currentHigh = candle.high;
        currentHighIndex = i;
      }
    } else {
      // Cari high berikutnya
      if (candle.low < currentLow) {
        // Update low jika lebih rendah
        currentLow = candle.low;
        currentLowIndex = i;
        // Update last pivot
        lastPivot.price = currentLow;
        lastPivot.index = currentLowIndex;
        swingPoints[swingPoints.length - 1] = {
          index: currentLowIndex,
          time: candles[currentLowIndex].time,
          price: currentLow,
          type: 'low',
          confirmed: true,
        };
      } else if (candle.high - currentLow >= currentLow * deviationMultiplier) {
        // New high found
        lastPivot = { type: 'high', price: currentHigh, index: currentHighIndex };
        swingPoints.push({
          index: currentHighIndex,
          time: candles[currentHighIndex].time,
          price: currentHigh,
          type: 'high',
          confirmed: true,
        });
        currentLow = candle.low;
        currentLowIndex = i;
      }
    }
  }

  return labelSwingPoints(swingPoints);
}
