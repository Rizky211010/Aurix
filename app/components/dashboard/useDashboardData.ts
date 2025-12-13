'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CurrencyStrength,
  DashboardData,
  VOLATILITY_THRESHOLDS,
} from './types';

interface UseDashboardDataOptions {
  symbol?: string;
  refreshInterval?: number;
  currencies?: string[];
}

interface UseDashboardDataReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// Calculate ATR from kline data
function calculateATR(klines: number[][], period: number = 14): number {
  if (klines.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < klines.length; i++) {
    const high = parseFloat(String(klines[i][2]));
    const low = parseFloat(String(klines[i][3]));
    const prevClose = parseFloat(String(klines[i - 1][4]));
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Calculate average of last 'period' true ranges
  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
}

// Determine volatility level based on ATR percentage
function getVolatilityLevel(atrPercent: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
  if (atrPercent >= VOLATILITY_THRESHOLDS.EXTREME) return 'EXTREME';
  if (atrPercent >= VOLATILITY_THRESHOLDS.HIGH) return 'HIGH';
  if (atrPercent >= VOLATILITY_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

// Calculate simple currency strength based on price changes - currently unused but kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _calculateCurrencyStrength(
  priceChanges: Record<string, number>
): CurrencyStrength[] {
  const currencies = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'];
  const strengths: Record<string, { total: number; count: number }> = {};
  
  currencies.forEach(c => {
    strengths[c] = { total: 0, count: 0 };
  });
  
  // Pair mappings (base/quote)
  const pairMappings: Record<string, [string, string]> = {
    'EURUSD': ['EUR', 'USD'],
    'USDJPY': ['USD', 'JPY'],
    'GBPUSD': ['GBP', 'USD'],
    'USDCHF': ['USD', 'CHF'],
    'AUDUSD': ['AUD', 'USD'],
    'USDCAD': ['USD', 'CAD'],
    'NZDUSD': ['NZD', 'USD'],
    'EURJPY': ['EUR', 'JPY'],
    'GBPJPY': ['GBP', 'JPY'],
    'EURGBP': ['EUR', 'GBP'],
  };
  
  Object.entries(priceChanges).forEach(([pair, change]) => {
    const mapping = pairMappings[pair];
    if (mapping) {
      const [base, quote] = mapping;
      // Positive change = base stronger, quote weaker
      strengths[base].total += change;
      strengths[base].count += 1;
      strengths[quote].total -= change;
      strengths[quote].count += 1;
    }
  });
  
  return currencies.map(currency => ({
    currency,
    strength: strengths[currency].count > 0 
      ? Math.round((strengths[currency].total / strengths[currency].count) * 100) / 100
      : 0,
    change: 0, // Would need historical data
  })).sort((a, b) => b.strength - a.strength);
}

// Fetch ticker data from Binance
async function fetchTickerData(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  bid: number;
  ask: number;
} | null> {
  try {
    // Fetch 24hr ticker
    const tickerRes = await fetch(`/api/binance/ticker?symbol=${symbol}`);
    if (!tickerRes.ok) {
      // Fallback to direct API
      const directRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      if (!directRes.ok) return null;
      const data = await directRes.json();
      return {
        price: parseFloat(data.lastPrice),
        change: parseFloat(data.priceChange),
        changePercent: parseFloat(data.priceChangePercent),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
        bid: parseFloat(data.bidPrice),
        ask: parseFloat(data.askPrice),
      };
    }
    const data = await tickerRes.json();
    return {
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChange),
      changePercent: parseFloat(data.priceChangePercent),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      bid: parseFloat(data.bidPrice),
      ask: parseFloat(data.askPrice),
    };
  } catch {
    return null;
  }
}

// Fetch klines for ATR calculation
async function fetchKlinesForATR(symbol: string): Promise<number[][] | null> {
  try {
    const res = await fetch(`/api/binance/klines?symbol=${symbol}&interval=1h&limit=50`);
    if (!res.ok) {
      const directRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=50`);
      if (!directRes.ok) return null;
      return await directRes.json();
    }
    return await res.json();
  } catch {
    return null;
  }
}

export function useDashboardData(
  options: UseDashboardDataOptions = {}
): UseDashboardDataReturn {
  const {
    symbol = 'BTCUSDT',
    refreshInterval = 2000,
    currencies = ['USD', 'EUR', 'JPY'],
  } = options;

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch main symbol data
      const tickerData = await fetchTickerData(symbol);
      if (!tickerData) {
        throw new Error('Failed to fetch ticker data');
      }

      // Fetch klines for ATR
      const klines = await fetchKlinesForATR(symbol);
      const atr = klines ? calculateATR(klines, 14) : 0;
      const atrPercent = tickerData.price > 0 ? (atr / tickerData.price) * 100 : 0;

      // Calculate spread
      const spreadValue = tickerData.ask - tickerData.bid;
      const spreadPercent = tickerData.price > 0 ? (spreadValue / tickerData.price) * 100 : 0;
      
      // For crypto, spread is usually in price units, convert to "pips" equivalent
      // For BTC, 1 pip = $1, for other pairs adjust accordingly
      const pipSize = symbol.includes('BTC') ? 1 : 0.0001;
      const spreadPips = spreadValue / pipSize;

      // Simulate currency strength (in real app, fetch multiple pairs)
      const mockStrengths: CurrencyStrength[] = currencies.map((currency, i) => ({
        currency,
        strength: Math.sin(Date.now() / 10000 + i) * 50 + (Math.random() - 0.5) * 10,
        change: (Math.random() - 0.5) * 5,
      }));

      const dashboardData: DashboardData = {
        price: {
          symbol,
          bid: tickerData.bid,
          ask: tickerData.ask,
          last: tickerData.price,
          change: tickerData.change,
          changePercent: tickerData.changePercent,
          high24h: tickerData.high,
          low24h: tickerData.low,
          volume24h: tickerData.volume,
          timestamp: Date.now(),
        },
        spread: {
          symbol,
          spreadPips: Math.round(spreadPips * 10) / 10,
          spreadPercent: Math.round(spreadPercent * 10000) / 10000,
        },
        currencyStrengths: mockStrengths,
        volatility: {
          symbol,
          atr: Math.round(atr * 100) / 100,
          atrPercent: Math.round(atrPercent * 100) / 100,
          volatilityLevel: getVolatilityLevel(atrPercent),
        },
        sessions: [
          { name: 'Tokyo', isOpen: isSessionOpen('Tokyo'), openTime: '00:00', closeTime: '09:00', timezone: 'JST' },
          { name: 'London', isOpen: isSessionOpen('London'), openTime: '08:00', closeTime: '17:00', timezone: 'GMT' },
          { name: 'New York', isOpen: isSessionOpen('New York'), openTime: '08:00', closeTime: '17:00', timezone: 'EST' },
        ],
        lastUpdate: Date.now(),
      };

      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, currencies]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  // Initial fetch and interval
  useEffect(() => {
    fetchData();

    intervalRef.current = setInterval(fetchData, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval]);

  return { data, isLoading, error, refresh };
}

// Helper to check if trading session is open
function isSessionOpen(session: string): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  switch (session) {
    case 'Tokyo':
      return utcHour >= 0 && utcHour < 9; // Approximate
    case 'London':
      return utcHour >= 8 && utcHour < 17;
    case 'New York':
      return utcHour >= 13 && utcHour < 22;
    default:
      return false;
  }
}
