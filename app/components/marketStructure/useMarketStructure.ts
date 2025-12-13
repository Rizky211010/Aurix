'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MarketStructure,
  MarketStructureConfig,
  DEFAULT_STRUCTURE_CONFIG,
  MarketStructureVisualization,
} from './types';
import { analyzeMarketStructure, zigZagSwings, labelSwingPoints, detectStructureBreaks } from './structureDetector';
import { generateVisualization } from './visualization';
import { AnalysisApi } from '@/app/services';

interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface UseMarketStructureOptions {
  symbol?: string;
  config?: Partial<MarketStructureConfig>;
  useZigZag?: boolean;
  zigZagDeviation?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  useBackend?: boolean;
}

interface UseMarketStructureReturn {
  structure: MarketStructure | null;
  visualization: MarketStructureVisualization | null;
  isLoading: boolean;
  error: string | null;
  source: 'backend' | 'local' | null;
  refresh: () => void;
}

export function useMarketStructure(
  candles: OHLC[],
  options: UseMarketStructureOptions = {}
): UseMarketStructureReturn {
  const {
    symbol = 'BTCUSDT',
    config: userConfig,
    useZigZag = false,
    zigZagDeviation = 0.5,
    autoRefresh = true,
    refreshInterval = 5000,
    useBackend = true,
  } = options;

  // Memoize config to prevent useCallback dependency changes
  const config: MarketStructureConfig = useMemo(() => ({
    ...DEFAULT_STRUCTURE_CONFIG,
    ...userConfig,
  }), [userConfig]);

  const [structure, setStructure] = useState<MarketStructure | null>(null);
  const [visualization, setVisualization] = useState<MarketStructureVisualization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'backend' | 'local' | null>(null);
  
  const lastCandleTimeRef = useRef<number>(0);

  // Local analysis function
  const analyzeLocal = useCallback(() => {
    if (!candles || candles.length < 20) {
      return null;
    }

    let result: MarketStructure;

    if (useZigZag) {
      // Use ZigZag algorithm
      const swingPoints = zigZagSwings(candles, zigZagDeviation);
      const labeledSwings = labelSwingPoints(swingPoints);
      const structureBreaks = detectStructureBreaks(candles, labeledSwings, config);

      // Determine current trend
      let currentTrend: MarketStructure['currentTrend'] = 'neutral';
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

      result = {
        swingPoints: labeledSwings,
        structureBreaks,
        currentTrend,
        lastHH: [...labeledSwings].reverse().find(s => s.swingType === 'HH') || null,
        lastHL: [...labeledSwings].reverse().find(s => s.swingType === 'HL') || null,
        lastLH: [...labeledSwings].reverse().find(s => s.swingType === 'LH') || null,
        lastLL: [...labeledSwings].reverse().find(s => s.swingType === 'LL') || null,
      };
    } else {
      // Use fixed lookback method
      result = analyzeMarketStructure(candles, config);
    }

    return result;
  }, [candles, config, useZigZag, zigZagDeviation]);

  const analyze = useCallback(async () => {
    if (!candles || candles.length < 20) {
      setStructure(null);
      setVisualization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let result: MarketStructure | null = null;

      // Try backend first if enabled
      if (useBackend) {
        const apiResult = await AnalysisApi.getStructure(symbol, candles);
        if (apiResult.data?.structure) {
          result = apiResult.data.structure as MarketStructure;
          setSource(apiResult.source || 'backend');
        }
      }

      // Fallback to local analysis
      if (!result) {
        result = analyzeLocal();
        setSource('local');
      }

      if (result) {
        setStructure(result);
        setVisualization(generateVisualization(result));
      }
      
      // Track last candle time
      if (candles.length > 0) {
        lastCandleTimeRef.current = candles[candles.length - 1].time;
      }
    } catch (err) {
      console.error('Market structure analysis error:', err);
      
      // Fallback to local on error
      const localResult = analyzeLocal();
      if (localResult) {
        setStructure(localResult);
        setVisualization(generateVisualization(localResult));
        setSource('local');
      } else {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      }
    } finally {
      setIsLoading(false);
    }
  }, [candles, symbol, useBackend, analyzeLocal]);

  // Initial analysis and on candle update
  useEffect(() => {
    const latestTime = candles.length > 0 ? candles[candles.length - 1].time : 0;
    
    // Only re-analyze if we have new candles
    if (latestTime !== lastCandleTimeRef.current || !structure) {
      analyze();
    }
  }, [candles, analyze, structure]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      analyze();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, analyze]);

  return {
    structure,
    visualization,
    isLoading,
    error,
    source,
    refresh: analyze,
  };
}
