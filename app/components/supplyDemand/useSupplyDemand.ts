'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  PriceZone,
  ZoneVisualization,
  ZoneDetectionConfig,
  DEFAULT_ZONE_CONFIG,
} from './types';
import {
  detectZones,
  updateZoneStatus,
  getFreshZones,
  getActiveZones,
  getDemandZonesBelow,
  getSupplyZonesAbove,
} from './zoneDetector';
import { generateZoneVisualization, getZoneStats } from './visualization';
import { AnalysisApi } from '@/app/services';

interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface UseSupplyDemandOptions {
  symbol?: string;
  config?: Partial<ZoneDetectionConfig>;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showMitigated?: boolean;
  useBackend?: boolean;
}

interface UseSupplyDemandReturn {
  zones: PriceZone[];
  freshZones: PriceZone[];
  activeZones: PriceZone[];
  visualization: ZoneVisualization | null;
  demandBelow: PriceZone[];
  supplyAbove: PriceZone[];
  stats: ReturnType<typeof getZoneStats> | null;
  isLoading: boolean;
  error: string | null;
  source: 'backend' | 'local' | null;
  refresh: () => void;
}

export function useSupplyDemand(
  candles: OHLC[],
  currentPrice: number | null,
  options: UseSupplyDemandOptions = {}
): UseSupplyDemandReturn {
  const {
    symbol = 'BTCUSDT',
    config: userConfig,
    autoRefresh = true,
    refreshInterval = 10000,
    showMitigated = false,
    useBackend = true,
  } = options;

  // Memoize config to prevent recreation on every render
  const config = useMemo<ZoneDetectionConfig>(() => ({
    ...DEFAULT_ZONE_CONFIG,
    ...userConfig,
  }), [userConfig]);

  const [zones, setZones] = useState<PriceZone[]>([]);
  const [visualization, setVisualization] = useState<ZoneVisualization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'backend' | 'local' | null>(null);

  const lastCandleCountRef = useRef<number>(0);

  // Local analysis function
  const analyzeLocal = useCallback(() => {
    if (!candles || candles.length < 20) {
      return null;
    }

    // Detect zones
    let detectedZones = detectZones(candles, config);

    // Update zone status based on price action
    detectedZones = updateZoneStatus(detectedZones, candles, config);

    // Filter out mitigated if not showing them
    if (!showMitigated) {
      detectedZones = detectedZones.filter(z => z.status !== 'mitigated');
    }

    return detectedZones;
  }, [candles, config, showMitigated]);

  const analyze = useCallback(async () => {
    if (!candles || candles.length < 20) {
      setZones([]);
      setVisualization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let detectedZones: PriceZone[] | null = null;

      // Try backend first if enabled
      if (useBackend && currentPrice) {
        const result = await AnalysisApi.getZones(symbol, candles, currentPrice);
        if (result.data?.zones) {
          detectedZones = result.data.zones as PriceZone[];
          setSource(result.source || 'backend');
        }
      }

      // Fallback to local analysis
      if (!detectedZones) {
        detectedZones = analyzeLocal();
        setSource('local');
      }

      if (detectedZones) {
        setZones(detectedZones);

        // Generate visualization
        const currentTime = candles.length > 0 ? candles[candles.length - 1].time : Date.now() / 1000;
        const viz = generateZoneVisualization(detectedZones, currentTime, config);
        setVisualization(viz);
      }

      lastCandleCountRef.current = candles.length;
    } catch (err) {
      console.error('Supply/Demand analysis error:', err);
      
      // Fallback to local on error
      const localZones = analyzeLocal();
      if (localZones) {
        setZones(localZones);
        const currentTime = candles.length > 0 ? candles[candles.length - 1].time : Date.now() / 1000;
        setVisualization(generateZoneVisualization(localZones, currentTime, config));
        setSource('local');
      } else {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles.length, currentPrice, symbol, useBackend, analyzeLocal, config]);

  // Initial analysis and on candle update
  useEffect(() => {
    // Only analyze if candle count changed
    if (candles.length > 0 && candles.length !== lastCandleCountRef.current) {
      analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles.length]); // Only depend on candles.length, not analyze

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      analyze();
    }, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]); // Remove analyze from deps

  // Derived data
  const freshZones = getFreshZones(zones);
  const activeZones = getActiveZones(zones);
  const demandBelow = currentPrice ? getDemandZonesBelow(zones, currentPrice) : [];
  const supplyAbove = currentPrice ? getSupplyZonesAbove(zones, currentPrice) : [];
  const stats = zones.length > 0 ? getZoneStats(zones) : null;

  return {
    zones,
    freshZones,
    activeZones,
    visualization,
    demandBelow,
    supplyAbove,
    stats,
    isLoading,
    error,
    source,
    refresh: analyze,
  };
}
