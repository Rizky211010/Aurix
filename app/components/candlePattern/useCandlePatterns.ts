'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OHLC,
  DetectedPattern,
  PatternMarker,
  PATTERN_INFO,
} from './types';
import {
  getRecentPatterns,
  checkLatestPattern,
} from './patternDetector';
import { AnalysisApi } from '@/app/services';

interface UseCandlePatternsOptions {
  symbol?: string;
  lookback?: number;           // How many candles to scan (default: 50)
  autoScan?: boolean;          // Auto scan on candle update
  minReliability?: 'LOW' | 'MEDIUM' | 'HIGH'; // Minimum reliability to include
  useBackend?: boolean;
}

interface UseCandlePatternsReturn {
  patterns: DetectedPattern[];
  latestPattern: DetectedPattern | null;
  markers: PatternMarker[];
  isScanning: boolean;
  source: 'backend' | 'local' | null;
  scan: () => void;
}

const RELIABILITY_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;

export function useCandlePatterns(
  candles: OHLC[],
  options: UseCandlePatternsOptions = {}
): UseCandlePatternsReturn {
  const {
    symbol = 'BTCUSDT',
    lookback = 50,
    autoScan = true,
    minReliability = 'LOW',
    useBackend = true,
  } = options;

  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [latestPattern, setLatestPattern] = useState<DetectedPattern | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [source, setSource] = useState<'backend' | 'local' | null>(null);
  
  const lastCandleTimeRef = useRef<number>(0);

  // Local scan function
  const scanLocal = useCallback(() => {
    if (candles.length < 2) {
      return { patterns: [], latest: null };
    }

    // Get recent patterns
    const detected = getRecentPatterns(candles, lookback);
    
    // Filter by minimum reliability
    const filtered = detected.filter(
      p => RELIABILITY_ORDER[p.pattern.reliability] >= RELIABILITY_ORDER[minReliability]
    );

    // Check latest pattern
    const latest = checkLatestPattern(candles);
    const filteredLatest = latest && RELIABILITY_ORDER[latest.pattern.reliability] >= RELIABILITY_ORDER[minReliability]
      ? latest
      : null;

    return { patterns: filtered, latest: filteredLatest };
  }, [candles, lookback, minReliability]);

  const scan = useCallback(async () => {
    if (candles.length < 2) {
      setPatterns([]);
      setLatestPattern(null);
      return;
    }

    setIsScanning(true);

    try {
      let detected: DetectedPattern[] | null = null;
      let latest: DetectedPattern | null = null;

      // Try backend first if enabled
      if (useBackend) {
        const result = await AnalysisApi.getPatterns(symbol, candles, lookback);
        if (result.data?.patterns) {
          detected = (result.data.patterns as DetectedPattern[]).filter(
            p => RELIABILITY_ORDER[p.pattern.reliability] >= RELIABILITY_ORDER[minReliability]
          );
          latest = result.data.latestPattern as DetectedPattern | null;
          if (latest && RELIABILITY_ORDER[latest.pattern.reliability] < RELIABILITY_ORDER[minReliability]) {
            latest = null;
          }
          setSource(result.source || 'backend');
        }
      }

      // Fallback to local scan
      if (!detected) {
        const localResult = scanLocal();
        detected = localResult.patterns;
        latest = localResult.latest;
        setSource('local');
      }

      setPatterns(detected || []);
      setLatestPattern(latest);
    } catch (err) {
      console.error('Pattern scan error:', err);
      // Fallback to local on error
      const localResult = scanLocal();
      setPatterns(localResult.patterns);
      setLatestPattern(localResult.latest);
      setSource('local');
    } finally {
      setIsScanning(false);
    }
  }, [candles, symbol, lookback, minReliability, useBackend, scanLocal]);

  // Auto scan when candles update
  useEffect(() => {
    if (!autoScan || candles.length === 0) return;

    const latestTime = candles[candles.length - 1].time;
    if (latestTime !== lastCandleTimeRef.current) {
      lastCandleTimeRef.current = latestTime;
      scan();
    }
  }, [candles, autoScan, scan]);

  // Generate chart markers
  const markers: PatternMarker[] = patterns.map(p => {
    // Get pattern type - handle both 'patternType' and 'type' from different sources
    const patternType = p.pattern.patternType || (p.pattern as { type?: string }).type;
    const info = patternType ? PATTERN_INFO[patternType as keyof typeof PATTERN_INFO] : null;
    
    // Fallback colors if pattern info not found
    const defaultColor = p.pattern.signal === 'BULLISH' ? '#10b981' : 
                         p.pattern.signal === 'BEARISH' ? '#ef4444' : '#6b7280';
    const defaultEmoji = p.pattern.signal === 'BULLISH' ? '🟢' : 
                         p.pattern.signal === 'BEARISH' ? '🔴' : '⚪';
    
    return {
      time: p.time,
      position: p.pattern.signal === 'BULLISH' ? 'belowBar' : 
                p.pattern.signal === 'BEARISH' ? 'aboveBar' : 'aboveBar',
      color: info?.color || defaultColor,
      shape: p.pattern.signal === 'BULLISH' ? 'arrowUp' : 
             p.pattern.signal === 'BEARISH' ? 'arrowDown' : 'circle',
      text: info?.emoji || defaultEmoji,
      size: p.pattern.reliability === 'HIGH' ? 2 : 1,
    };
  });

  return {
    patterns,
    latestPattern,
    markers,
    isScanning,
    source,
    scan,
  };
}
