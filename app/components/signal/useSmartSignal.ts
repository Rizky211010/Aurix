'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CandlestickData } from '../chart/types';
import { SmartSignal } from './types';
import {
  generateSmartSignal,
  analyzeH4Trend,
  detectZones,
  calculateATR,
} from './signalGenerator';

interface AIAnalysisResponse {
  signal: 'BUY' | 'SELL' | 'WAIT';
  validity_score: number;
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  entry: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  rrr: string;
  reason: string[];
  risk_warning: string;
  structure_valid: boolean;
  zone_quality: string;
  pattern_reliability: string;
  analysis: {
    trend: string;
    support_resistance: string;
    pattern: string;
    momentum: string;
    volume: string;
    confluence: string;
  };
}

interface UseSmartSignalOptions {
  symbol: string;
  candles: CandlestickData[];
  timeframe?: string;
  structure?: {
    swings: Array<{ type: string; price: number; time: number }>;
    breaks: Array<{ type: string; direction: string; price: number; time: number }>;
    trend: string;
  };
  zones?: Array<{
    type: 'supply' | 'demand';
    top: number;
    bottom: number;
    strength: number;
    status: string;
  }>;
  patterns?: Array<{
    name: string;
    type: string;
    reliability: string;
    time: number;
  }>;
  enabled?: boolean;
}

interface UseSmartSignalReturn {
  signal: SmartSignal | null;
  aiResponse: AIAnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  source: 'ai' | 'local' | null;
  refresh: () => void;
  // New: AI toggle controls
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
}

export function useSmartSignal({
  symbol,
  candles,
  timeframe = '1h',
  structure,
  zones,
  patterns,
  enabled = true,
}: UseSmartSignalOptions): UseSmartSignalReturn {
  const [signal, setSignal] = useState<SmartSignal | null>(null);
  const [aiResponse, setAiResponse] = useState<AIAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'local' | null>(null);
  const lastCandleTimeRef = useRef<number>(0);
  const lastAnalysisRef = useRef<number>(0);
  
  // AI toggle controls - default OFF to save API quota
  const [aiEnabled, setAiEnabled] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  
  // Rate limit tracking (must match server-side: 60s per symbol)
  const MIN_AI_INTERVAL = 65000; // 65s (slightly more than server's 60s to be safe)
  const rateLimitedUntilRef = useRef<number>(0);

  // Local signal generation (fallback)
  const generateLocalSignal = useCallback((): SmartSignal | null => {
    if (candles.length < 50) {
      return null;
    }

    const currentPrice = candles[candles.length - 1].close;
    const atr = calculateATR(candles);
    const h4Trend = analyzeH4Trend(candles);
    const { supplyZones, demandZones } = detectZones(candles, atr);

    return generateSmartSignal(symbol, {
      currentPrice,
      h4Trend,
      supplyZones,
      demandZones,
      atr,
    });
  }, [symbol, candles]);

  // Convert AI response to SmartSignal format
  const aiResponseToSignal = useCallback((ai: AIAnalysisResponse, currentPrice: number): SmartSignal | null => {
    if (ai.signal === 'WAIT') {
      return null;
    }

    return {
      type: ai.signal as 'BUY' | 'SELL',
      symbol,
      entry_zone: {
        high: ai.entry * 1.002,
        low: ai.entry * 0.998,
      },
      tp1: ai.take_profit_1,
      tp2: ai.take_profit_2,
      sl: ai.stop_loss,
      reason: ai.reason.join('. '),
      validity_score: ai.validity_score,
      timestamp: Date.now(),
      risk_reward_ratio: parseFloat(ai.rrr.split(':')[1]) || 2,
      trend_alignment: ai.trend !== 'Neutral',
      zone_confluence: ai.zone_quality !== 'Weak',
    };
  }, [symbol]);

  // Call AI API for analysis
  const analyzeWithAI = useCallback(async (): Promise<AIAnalysisResponse | null> => {
    if (candles.length < 20) {
      return null;
    }

    const currentPrice = candles[candles.length - 1].close;

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          candles: candles.slice(-50).map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
          })),
          currentPrice,
          structure: structure ? {
            swings: structure.swings || [],
            breaks: structure.breaks || [],
            trend: structure.trend || 'neutral',
          } : undefined,
          zones: zones?.map(z => ({
            type: z.type,
            top: z.top,
            bottom: z.bottom,
            strength: z.strength,
            status: z.status,
          })),
          patterns: patterns?.map(p => ({
            name: p.name,
            type: p.type,
            reliability: p.reliability,
            time: p.time,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Throw rate limit errors so they can be handled specially
        if (response.status === 429) {
          throw new Error(errorData.error || 'Rate limited');
        }
        throw new Error(errorData.error || 'AI analysis failed');
      }

      const result = await response.json();
      return result.data as AIAnalysisResponse;
    } catch (err) {
      // Re-throw rate limit errors
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Rate limited')) {
        throw err;
      }
      console.error('AI analysis error:', err);
      return null;
    }
  }, [symbol, timeframe, candles, structure, zones, patterns]);

  // Main signal generation
  const generateSignal = useCallback(async (forceAI: boolean = false) => {
    if (!enabled || candles.length < 20) {
      setSignal(null);
      setAiResponse(null);
      return;
    }

    const lastCandle = candles[candles.length - 1];
    const now = Date.now();
    
    // Skip if same candle and analyzed recently (use MIN_AI_INTERVAL to match server)
    // But allow if forceAI is true (manual refresh)
    if (!forceAI && lastCandle.time === lastCandleTimeRef.current && 
        now - lastAnalysisRef.current < MIN_AI_INTERVAL) {
      return;
    }

    // If AI is disabled, only use local analysis
    if (!aiEnabled && !forceAI) {
      console.log(`[SmartSignal] AI disabled, using local analysis only...`);
      const localSignal = generateLocalSignal();
      setSignal(localSignal);
      setAiResponse(null);
      setSource('local');
      lastCandleTimeRef.current = lastCandle.time;
      return;
    }

    // Check if we're still rate-limited
    if (now < rateLimitedUntilRef.current) {
      const waitTime = Math.ceil((rateLimitedUntilRef.current - now) / 1000);
      console.log(`[SmartSignal] Rate limited, wait ${waitTime}s. Using local analysis...`);
      
      // Use local analysis during rate limit
      const localSignal = generateLocalSignal();
      if (localSignal) {
        setSignal(localSignal);
        setSource('local');
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try AI analysis first (only if aiEnabled or forceAI)
      console.log(`[SmartSignal] Requesting AI analysis for ${symbol}...`);
      const ai = await analyzeWithAI();
      
      if (ai) {
        setAiResponse(ai);
        lastCandleTimeRef.current = lastCandle.time;
        lastAnalysisRef.current = now;
        
        if (ai.signal !== 'WAIT') {
          const smartSignal = aiResponseToSignal(ai, lastCandle.close);
          setSignal(smartSignal);
          setSource('ai');
          console.log(`[SmartSignal] AI Signal: ${ai.signal} (${ai.validity_score}%)`);
        } else {
          setSignal(null);
          setSource('ai');
          console.log(`[SmartSignal] AI says WAIT - No trade setup`);
        }
        return;
      }

      // Fallback to local generation
      console.log(`[SmartSignal] AI unavailable, using local analysis...`);
      const localSignal = generateLocalSignal();
      setSignal(localSignal);
      setAiResponse(null);
      setSource('local');
      
    } catch (err) {
      console.error('Signal generation error:', err);
      
      // Check if it's a rate limit error (from API response)
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Rate limited')) {
        // Set rate limit until time
        rateLimitedUntilRef.current = now + MIN_AI_INTERVAL;
        console.log(`[SmartSignal] Rate limited by server, will retry in ${MIN_AI_INTERVAL / 1000}s`);
      }
      
      // Fallback to local on error
      const localSignal = generateLocalSignal();
      if (localSignal) {
        setSignal(localSignal);
        setSource('local');
      } else {
        setError('Failed to generate signal');
        setSignal(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [symbol, candles, enabled, aiEnabled, analyzeWithAI, aiResponseToSignal, generateLocalSignal]);

  // Generate signal when candle closes (new candle time) - only if AI or auto-refresh is enabled
  useEffect(() => {
    if (candles.length > 0 && (aiEnabled || autoRefreshEnabled)) {
      const lastCandle = candles[candles.length - 1];
      
      // Trigger on new candle or first load
      if (lastCandle.time !== lastCandleTimeRef.current) {
        generateSignal();
      }
    }
  }, [candles, generateSignal, aiEnabled, autoRefreshEnabled]);

  // Initial load - use local analysis by default
  useEffect(() => {
    if (enabled && candles.length >= 20 && !signal && !isLoading) {
      generateSignal();
    }
  }, [enabled, candles.length, signal, isLoading, generateSignal]);

  // Auto-refresh every 2 minutes - ONLY if autoRefreshEnabled
  useEffect(() => {
    if (!enabled || !autoRefreshEnabled || !aiEnabled) return;

    console.log(`[SmartSignal] Auto-refresh enabled, interval: 2 minutes`);
    const interval = setInterval(() => {
      generateSignal();
    }, 120000);

    return () => clearInterval(interval);
  }, [enabled, autoRefreshEnabled, aiEnabled, generateSignal]);

  // Manual refresh handler (always allows AI call)
  const manualRefresh = useCallback(() => {
    generateSignal(true);
  }, [generateSignal]);

  return {
    signal,
    aiResponse,
    isLoading,
    error,
    source,
    refresh: manualRefresh,
    // AI toggle controls
    aiEnabled,
    setAiEnabled,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
  };
}
