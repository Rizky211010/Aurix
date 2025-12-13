import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:8000';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PatternInfo {
  name: string;
  type?: string;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reliability: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface DetectedPattern {
  time: number;
  pattern: PatternInfo;
  index: number;
  price?: number;
}

// Pattern detection types
const PATTERNS: Record<string, PatternInfo> = {
  DOJI: { name: 'Doji', signal: 'NEUTRAL', reliability: 'MEDIUM' },
  HAMMER: { name: 'Hammer', signal: 'BULLISH', reliability: 'HIGH' },
  INVERTED_HAMMER: { name: 'Inverted Hammer', signal: 'BULLISH', reliability: 'MEDIUM' },
  SHOOTING_STAR: { name: 'Shooting Star', signal: 'BEARISH', reliability: 'HIGH' },
  HANGING_MAN: { name: 'Hanging Man', signal: 'BEARISH', reliability: 'MEDIUM' },
  ENGULFING_BULLISH: { name: 'Bullish Engulfing', signal: 'BULLISH', reliability: 'HIGH' },
  ENGULFING_BEARISH: { name: 'Bearish Engulfing', signal: 'BEARISH', reliability: 'HIGH' },
  MORNING_STAR: { name: 'Morning Star', signal: 'BULLISH', reliability: 'HIGH' },
  EVENING_STAR: { name: 'Evening Star', signal: 'BEARISH', reliability: 'HIGH' },
};

function detectPatterns(candles: Candle[]): DetectedPattern[] {
  if (candles.length < 3) return [];

  const patterns: DetectedPattern[] = [];

  for (let i = 2; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];

    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const isBullish = c.close > c.open;
    const isBearish = c.close < c.open;

    // Doji
    if (range > 0 && body / range < 0.1) {
      patterns.push({
        index: i,
        time: c.time,
        pattern: { type: 'DOJI', ...PATTERNS.DOJI },
        price: c.close,
      });
    }

    // Hammer (bullish reversal)
    if (lowerWick > body * 2 && upperWick < body * 0.5 && range > 0) {
      patterns.push({
        index: i,
        time: c.time,
        pattern: { type: 'HAMMER', ...PATTERNS.HAMMER },
        price: c.close,
      });
    }

    // Shooting Star (bearish reversal)
    if (upperWick > body * 2 && lowerWick < body * 0.5 && range > 0) {
      patterns.push({
        index: i,
        time: c.time,
        pattern: { type: 'SHOOTING_STAR', ...PATTERNS.SHOOTING_STAR },
        price: c.close,
      });
    }

    // Bullish Engulfing
    const prevBody = Math.abs(prev.close - prev.open);
    const prevBearish = prev.close < prev.open;
    if (isBullish && prevBearish && c.open < prev.close && c.close > prev.open && body > prevBody) {
      patterns.push({
        index: i,
        time: c.time,
        pattern: { type: 'ENGULFING_BULLISH', ...PATTERNS.ENGULFING_BULLISH },
        price: c.close,
      });
    }

    // Bearish Engulfing
    const prevBullish = prev.close > prev.open;
    if (isBearish && prevBullish && c.open > prev.close && c.close < prev.open && body > prevBody) {
      patterns.push({
        index: i,
        time: c.time,
        pattern: { type: 'ENGULFING_BEARISH', ...PATTERNS.ENGULFING_BEARISH },
        price: c.close,
      });
    }

    // Morning Star (3-candle bullish reversal)
    if (i >= 2) {
      const first = prev2;
      const middle = prev;
      const third = c;
      
      const firstBearish = first.close < first.open;
      const middleSmall = Math.abs(middle.close - middle.open) < Math.abs(first.close - first.open) * 0.3;
      const thirdBullish = third.close > third.open;
      const thirdCloseHigh = third.close > (first.open + first.close) / 2;

      if (firstBearish && middleSmall && thirdBullish && thirdCloseHigh) {
        patterns.push({
          index: i,
          time: c.time,
          pattern: { type: 'MORNING_STAR', ...PATTERNS.MORNING_STAR },
          price: c.close,
        });
      }
    }

    // Evening Star (3-candle bearish reversal)
    if (i >= 2) {
      const first = prev2;
      const middle = prev;
      const third = c;
      
      const firstBullish = first.close > first.open;
      const middleSmall = Math.abs(middle.close - middle.open) < Math.abs(first.close - first.open) * 0.3;
      const thirdBearish = third.close < third.open;
      const thirdCloseLow = third.close < (first.open + first.close) / 2;

      if (firstBullish && middleSmall && thirdBearish && thirdCloseLow) {
        patterns.push({
          index: i,
          time: c.time,
          pattern: { type: 'EVENING_STAR', ...PATTERNS.EVENING_STAR },
          price: c.close,
        });
      }
    }
  }

  return patterns.slice(-20); // Return last 20 patterns
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, candles, lookback = 50 } = body;

    // Try backend first
    try {
      const response = await fetch(`${BOT_API_URL}/api/analysis/patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, candles, lookback }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      console.log('Backend not available, using local pattern detection');
    }

    // Fallback to local detection
    const recentCandles = (candles || []).slice(-lookback);
    const patterns = detectPatterns(recentCandles);
    const latestPattern = patterns.length > 0 ? patterns[patterns.length - 1] : null;

    return NextResponse.json({
      patterns,
      latestPattern,
      source: 'local',
    });

  } catch (error) {
    console.error('Pattern detection error:', error);
    return NextResponse.json(
      { patterns: [], error: 'Failed to detect patterns' },
      { status: 200 }
    );
  }
}
