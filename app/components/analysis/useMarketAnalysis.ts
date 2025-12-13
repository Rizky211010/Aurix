'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketSentiment, TrendAnalysis, OnChainMetrics } from '@/app/lib/kolAPI';

interface MarketAnalysisData {
  symbol: string;
  sentiment: MarketSentiment | null;
  trend: TrendAnalysis | null;
  metrics: OnChainMetrics | null;
  timestamp: string;
}

interface UseMarketAnalysisOptions {
  symbol: string;
  refreshInterval?: number; // ms, default 60000
  autoRefresh?: boolean;
}

interface UseMarketAnalysisReturn {
  data: MarketAnalysisData | null;
  isLoading: boolean;
  error: string | null;
  fetchAnalysis: () => Promise<void>;
}

/**
 * Hook untuk fetch market sentiment dan analysis dari Kol API
 */
export function useMarketAnalysis({
  symbol,
  refreshInterval = 60000,
  autoRefresh = true,
}: UseMarketAnalysisOptions): UseMarketAnalysisReturn {
  const [data, setData] = useState<MarketAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await globalThis.fetch(
        `/api/analysis/market-sentiment?symbol=${symbol.toUpperCase()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: MarketAnalysisData = await response.json();
      setData(result);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      console.error('[useMarketAnalysis] Error:', err);
      setError(err.message || 'Failed to fetch market analysis');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  // Fetch on mount and when symbol changes
  useEffect(() => {
    fetchAnalysis();
  }, [symbol, fetchAnalysis]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchAnalysis();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchAnalysis]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { data, isLoading, error, fetchAnalysis };
}

export default useMarketAnalysis;
