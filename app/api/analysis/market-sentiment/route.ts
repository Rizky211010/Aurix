/**
 * API Endpoint: Market Sentiment & Analysis
 * GET /api/analysis/market-sentiment
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMarketSentiment,
  getOnChainMetrics,
  getTrendAnalysis,
  MarketSentiment,
  OnChainMetrics,
  TrendAnalysis,
} from '@/app/lib/kolAPI';

interface MarketAnalysisResponse {
  symbol: string;
  sentiment: MarketSentiment | null;
  trend: TrendAnalysis | null;
  metrics: OnChainMetrics | null;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';

  try {
    // Fetch all market data in parallel
    const [sentiment, trend, metrics] = await Promise.all([
      getMarketSentiment(symbol),
      getTrendAnalysis(symbol),
      getOnChainMetrics(symbol),
    ]);

    const response: MarketAnalysisResponse = {
      symbol: symbol.toUpperCase(),
      sentiment,
      trend,
      metrics,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Market Analysis API] Error:', error);
    return NextResponse.json(
      {
        symbol: symbol.toUpperCase(),
        sentiment: null,
        trend: null,
        metrics: null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
