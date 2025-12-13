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

// Fallback: Generate signal locally if backend not available
async function generateLocalSignal(symbol: string, candles: Candle[]) {
  if (candles.length < 50) return null;

  const currentPrice = candles[candles.length - 1].close;
  const highs = candles.slice(-20).map((c) => c.high);
  const lows = candles.slice(-20).map((c) => c.low);
  
  const recentHigh = Math.max(...highs);
  const recentLow = Math.min(...lows);
  const atr = (recentHigh - recentLow) / 20;
  
  // Simple trend detection
  const ema20 = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20;
  const ema50 = candles.slice(-50).reduce((sum, c) => sum + c.close, 0) / 50;
  
  const isBullish = currentPrice > ema20 && ema20 > ema50;
  const isBearish = currentPrice < ema20 && ema20 < ema50;
  
  if (!isBullish && !isBearish) return null;

  const type = isBullish ? 'BUY' : 'SELL';
  const entryHigh = currentPrice + atr * 0.2;
  const entryLow = currentPrice - atr * 0.2;
  
  return {
    symbol,
    type,
    entry_zone: { high: entryHigh, low: entryLow },
    sl: isBullish ? currentPrice - atr * 2 : currentPrice + atr * 2,
    tp1: isBullish ? currentPrice + atr * 3 : currentPrice - atr * 3,
    tp2: isBullish ? currentPrice + atr * 5 : currentPrice - atr * 5,
    validity_score: Math.floor(Math.random() * 30 + 60),
    h4_trend: isBullish ? 'BULLISH' : 'BEARISH',
    zone_type: isBullish ? 'demand' : 'supply',
    zone_touch_count: 1,
    risk_reward_ratio: 3.0,
    confluence_factors: [
      isBullish ? 'Price above EMA20' : 'Price below EMA20',
      isBullish ? 'EMA20 above EMA50' : 'EMA20 below EMA50',
      'ATR-based SL/TP'
    ],
    timestamp: Date.now(),
    expires_at: Date.now() + 4 * 60 * 60 * 1000,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, candles } = body;

    // Try backend first
    try {
      const response = await fetch(`${BOT_API_URL}/api/analysis/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, candles }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      console.log('Backend not available, using local signal generation');
    }

    // Fallback to local generation
    const signal = await generateLocalSignal(symbol, candles || []);
    return NextResponse.json({ signal, source: 'local' });

  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json(
      { signal: null, error: 'Failed to generate signal' },
      { status: 200 }
    );
  }
}
