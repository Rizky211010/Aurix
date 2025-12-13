import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:8000';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Zone {
  id: string;
  type: 'demand' | 'supply';
  top: number;
  bottom: number;
  startTime: number;
  status: 'fresh' | 'tested' | 'mitigated';
  strength: 'strong' | 'moderate' | 'weak';
  touchCount: number;
  createdAt: number;
  mitigatedAt?: number;
}

// Local zone detection
function detectLocalZones(candles: Candle[]): Zone[] {
  if (candles.length < 20) return [];

  const zones: Zone[] = [];

  for (let i = 3; i < candles.length - 1; i++) {
    const current = candles[i];
    const next = candles[i + 1];
    
    // Detect strong bullish move (demand zone)
    const bullishMove = (next.close - current.open) / current.open;
    if (bullishMove > 0.01) { // 1% move
      zones.push({
        id: `demand-${i}`,
        type: 'demand',
        top: current.open,
        bottom: current.low,
        startTime: current.time,
        status: 'fresh',
        strength: bullishMove > 0.02 ? 'strong' : 'moderate',
        touchCount: 0,
        createdAt: current.time,
      });
    }

    // Detect strong bearish move (supply zone)
    const bearishMove = (current.open - next.close) / current.open;
    if (bearishMove > 0.01) { // 1% move
      zones.push({
        id: `supply-${i}`,
        type: 'supply',
        top: current.high,
        bottom: current.open,
        startTime: current.time,
        status: 'fresh',
        strength: bearishMove > 0.02 ? 'strong' : 'moderate',
        touchCount: 0,
        createdAt: current.time,
      });
    }
  }

  // Update zone status based on price returning to zone
  for (const zone of zones) {
    // Check if price has returned to zone
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      if (!candle || candle.time <= zone.startTime) continue;
      
      const inZone = candle.low <= zone.top && candle.high >= zone.bottom;
      if (inZone) {
        zone.touchCount++;
        zone.status = 'tested';
        
        // Check if zone is mitigated (broken through)
        if (zone.type === 'demand' && candle.close < zone.bottom) {
          zone.status = 'mitigated';
          zone.mitigatedAt = candle.time;
        }
        if (zone.type === 'supply' && candle.close > zone.top) {
          zone.status = 'mitigated';
          zone.mitigatedAt = candle.time;
        }
      }
    }
  }

  // Return only recent active zones
  return zones
    .filter(z => z.status !== 'mitigated')
    .slice(-10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, candles, currentPrice: reqCurrentPrice } = body;

    // Try backend first
    try {
      const response = await fetch(`${BOT_API_URL}/api/analysis/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, candles, currentPrice: reqCurrentPrice }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      console.log('Backend not available, using local zone detection');
    }

    // Fallback to local detection
    const zones = detectLocalZones(candles || []);
    const price = reqCurrentPrice || (candles?.length > 0 ? candles[candles.length - 1].close : 0);
    
    return NextResponse.json({
      zones,
      activeZones: zones.filter((z) => z.status !== 'mitigated'),
      freshZones: zones.filter((z) => z.status === 'fresh'),
      demandBelow: zones.filter((z) => z.type === 'demand' && z.top < price),
      supplyAbove: zones.filter((z) => z.type === 'supply' && z.bottom > price),
      source: 'local',
    });

  } catch (error) {
    console.error('Zone detection error:', error);
    return NextResponse.json(
      { zones: [], error: 'Failed to detect zones' },
      { status: 200 }
    );
  }
}
