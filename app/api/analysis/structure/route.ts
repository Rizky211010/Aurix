import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:8000';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: 'high' | 'low';
  confirmed: boolean;
  swingType?: 'HH' | 'HL' | 'LH' | 'LL';
}

interface StructureBreak {
  index: number;
  time: number;
  price: number;
  type: string;
  direction: 'bullish' | 'bearish';
  brokenSwing: SwingPoint;
}

// Local market structure detection
function detectLocalStructure(candles: Candle[]) {
  if (candles.length < 20) return null;

  const swingPoints: SwingPoint[] = [];
  const lookback = 5;

  // Find swing highs and lows
  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    const leftHighs = candles.slice(i - lookback, i).map((c) => c.high);
    const rightHighs = candles.slice(i + 1, i + lookback + 1).map((c) => c.high);
    const leftLows = candles.slice(i - lookback, i).map((c) => c.low);
    const rightLows = candles.slice(i + 1, i + lookback + 1).map((c) => c.low);

    // Swing High
    if (current.high > Math.max(...leftHighs) && current.high > Math.max(...rightHighs)) {
      swingPoints.push({
        index: i,
        time: current.time,
        price: current.high,
        type: 'high',
        confirmed: true,
      });
    }

    // Swing Low
    if (current.low < Math.min(...leftLows) && current.low < Math.min(...rightLows)) {
      swingPoints.push({
        index: i,
        time: current.time,
        price: current.low,
        type: 'low',
        confirmed: true,
      });
    }
  }

  // Label swing points (HH, HL, LH, LL)
  let lastHigh: SwingPoint | null = null;
  let lastLow: SwingPoint | null = null;

  for (const point of swingPoints) {
    if (point.type === 'high') {
      if (lastHigh) {
        point.swingType = point.price > lastHigh.price ? 'HH' : 'LH';
      }
      lastHigh = point;
    } else {
      if (lastLow) {
        point.swingType = point.price > lastLow.price ? 'HL' : 'LL';
      }
      lastLow = point;
    }
  }

  // Detect structure breaks
  const structureBreaks: StructureBreak[] = [];
  const highs = swingPoints.filter((p) => p.type === 'high');
  const lows = swingPoints.filter((p) => p.type === 'low');

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    
    // Check for bullish BOS (break above swing high)
    const recentHigh = highs.filter((h) => h.index < i).slice(-1)[0];
    if (recentHigh && candle.close > recentHigh.price) {
      structureBreaks.push({
        index: i,
        time: candle.time,
        price: recentHigh.price,
        type: 'BOS',
        direction: 'bullish',
        brokenSwing: recentHigh,
      });
    }

    // Check for bearish BOS (break below swing low)
    const recentLow = lows.filter((l) => l.index < i).slice(-1)[0];
    if (recentLow && candle.close < recentLow.price) {
      structureBreaks.push({
        index: i,
        time: candle.time,
        price: recentLow.price,
        type: 'BOS',
        direction: 'bearish',
        brokenSwing: recentLow,
      });
    }
  }

  // Determine current trend
  const recentBreaks = structureBreaks.slice(-3);
  let currentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (recentBreaks.length > 0) {
    const bullish = recentBreaks.filter((b) => b.direction === 'bullish').length;
    const bearish = recentBreaks.filter((b) => b.direction === 'bearish').length;
    currentTrend = bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral';
  }

  return {
    swingPoints,
    structureBreaks: structureBreaks.slice(-10),
    currentTrend,
    lastHH: [...swingPoints].reverse().find((p) => p.swingType === 'HH') || null,
    lastHL: [...swingPoints].reverse().find((p) => p.swingType === 'HL') || null,
    lastLH: [...swingPoints].reverse().find((p) => p.swingType === 'LH') || null,
    lastLL: [...swingPoints].reverse().find((p) => p.swingType === 'LL') || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, candles } = body;

    // Try backend first
    try {
      const response = await fetch(`${BOT_API_URL}/api/analysis/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, candles }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      console.log('Backend not available, using local structure detection');
    }

    // Fallback to local detection
    const structure = detectLocalStructure(candles || []);
    return NextResponse.json({ structure, source: 'local' });

  } catch (error) {
    console.error('Structure detection error:', error);
    return NextResponse.json(
      { structure: null, error: 'Failed to detect structure' },
      { status: 200 }
    );
  }
}
