'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { CandlestickData, Timeframe } from '../types';

interface UseWebSocketOptions {
  symbol: string;
  timeframe: Timeframe;
  onMessage: (data: CandlestickData) => void;
  onHistoricalData?: (data: CandlestickData[]) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

// Binance WebSocket URL mapping
const getTimeframeInterval = (tf: Timeframe): string => {
  const mapping: Record<Timeframe, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
  };
  return mapping[tf];
};

// Check if symbol is forex/commodity (not crypto)
const isForexSymbol = (symbol: string): boolean => {
  return ['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY'].includes(symbol.toUpperCase());
};

// Binance API endpoints to try (with fallbacks)
const BINANCE_ENDPOINTS = [
  '', // Local API proxy (primary)
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
];

interface BinanceKline {
  0: number;  // Open time
  1: string;  // Open
  2: string;  // High
  3: string;  // Low
  4: string;  // Close
  5: string;  // Volume
  6: number;  // Close time
}

// Try to fetch from multiple endpoints
async function fetchKlines(symbol: string, interval: string, limit: number): Promise<BinanceKline[]> {
  let lastError: Error | null = null;
  
  for (const baseUrl of BINANCE_ENDPOINTS) {
    try {
      let url: string;
      
      if (baseUrl === '') {
        // Use local API proxy
        url = `/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      } else {
        url = `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      lastError = err as Error;
      console.log(`Failed to fetch from ${baseUrl || 'local proxy'}, trying next...`);
    }
  }
  
  throw lastError || new Error('All endpoints failed');
}

export function useWebSocket({
  symbol,
  timeframe,
  onMessage,
  onHistoricalData,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const tickWsRef = useRef<WebSocket | null>(null); // Additional WebSocket for tick data
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCandleTimeRef = useRef<number>(0);
  const lastCandleRef = useRef<CandlestickData | null>(null); // Track last candle for tick updates
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePolling, setUsePolling] = useState(false);

  // Fetch historical data from Binance REST API
  const fetchHistoricalData = useCallback(async () => {
    try {
      const interval = getTimeframeInterval(timeframe);
      const data = await fetchKlines(symbol.toUpperCase(), interval, 500);
      
      const candles: CandlestickData[] = data.map((item) => ({
        time: Math.floor(item[0] / 1000),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));
      
      if (candles.length > 0) {
        lastCandleTimeRef.current = candles[candles.length - 1].time;
      }
      
      console.log(`[useWebSocket] Calling onHistoricalData callback with ${candles.length} candles for ${symbol}`);
      onHistoricalData?.(candles);
      return true;
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Failed to load historical data');
      return false;
    }
  }, [symbol, timeframe, onHistoricalData]);

  // Fetch latest candle for polling fallback
  const fetchLatestCandle = useCallback(async () => {
    try {
      const interval = getTimeframeInterval(timeframe);
      const data = await fetchKlines(symbol.toUpperCase(), interval, 2);
      
      if (data.length > 0) {
        // Get the current (incomplete) candle
        const item = data[data.length - 1];
        const candle: CandlestickData = {
          time: Math.floor(item[0] / 1000),
          open: parseFloat(String(item[1])),
          high: parseFloat(String(item[2])),
          low: parseFloat(String(item[3])),
          close: parseFloat(String(item[4])),
          volume: parseFloat(String(item[5])),
        };
        
        // Store for tick updates
        lastCandleRef.current = candle;
        onMessage(candle);
        lastCandleTimeRef.current = candle.time;
      }
    } catch (err) {
      console.error('Error fetching latest candle:', err);
    }
  }, [symbol, timeframe, onMessage]);

  /**
   * TICK WEBSOCKET - Real-time price updates like MT5/TradingView
   * Connects to Binance @aggTrade stream for every trade tick
   */
  const startTickWebSocket = useCallback(() => {
    if (tickWsRef.current) {
      tickWsRef.current.close();
    }

    // Don't start tick WS for forex symbols
    if (isForexSymbol(symbol)) return;

    const tickWsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@aggTrade`;
    
    try {
      const tickWs = new WebSocket(tickWsUrl);
      
      tickWs.onopen = () => {
        console.log(`[useWebSocket] 🎯 Tick WebSocket connected for ${symbol} - REALTIME MODE`);
      };
      
      tickWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const tickPrice = parseFloat(data.p);
          const tickVolume = parseFloat(data.q);
          
          // Update the current candle with new tick
          if (lastCandleRef.current) {
            const currentCandle = lastCandleRef.current;
            const updatedCandle: CandlestickData = {
              time: currentCandle.time,
              open: currentCandle.open,
              high: Math.max(currentCandle.high, tickPrice),
              low: Math.min(currentCandle.low, tickPrice),
              close: tickPrice, // Always update close to latest tick
              volume: (currentCandle.volume || 0) + tickVolume,
            };
            
            lastCandleRef.current = updatedCandle;
            onMessage(updatedCandle);
          }
        } catch {
          // Ignore parse errors on tick data
        }
      };
      
      tickWs.onerror = () => {
        console.log('[useWebSocket] Tick WebSocket error');
      };
      
      tickWs.onclose = () => {
        console.log('[useWebSocket] Tick WebSocket closed');
      };
      
      tickWsRef.current = tickWs;
    } catch (err) {
      console.error('[useWebSocket] Failed to create tick WebSocket:', err);
    }
  }, [symbol, onMessage]);

  // Start polling as fallback - FAST polling for realtime like TradingView/MT5
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // VERY FAST POLLING: 1 second for true realtime feel
    const FAST_POLL_INTERVAL = 1000; // 1 second - like TradingView
    
    console.log(`[useWebSocket] 🚀 REALTIME polling for ${symbol}/${timeframe}: ${FAST_POLL_INTERVAL}ms`);
    
    // Fetch immediately
    fetchLatestCandle().catch(err => console.error('[useWebSocket] Initial fetch:', err));
    
    // Then poll FAST for realtime updates
    pollingIntervalRef.current = setInterval(() => {
      fetchLatestCandle().then(() => {
        console.log(`[useWebSocket] ⚡ Tick update for ${symbol}`);
      });
    }, FAST_POLL_INTERVAL);
    
    setIsConnected(true);
    setError(null);
  }, [fetchLatestCandle, symbol, timeframe]);

  const connect = useCallback(async () => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear polling if exists
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // First, fetch historical data
    const historicalSuccess = await fetchHistoricalData();
    if (!historicalSuccess) {
      return;
    }

    // For forex symbols (XAUUSD, etc), always use polling
    if (isForexSymbol(symbol)) {
      console.log(`[useWebSocket] ${symbol} is forex/commodity - using REST API polling`);
      startPolling();
      return;
    }

    // ALWAYS use polling first for reliability - WebSocket often blocked by firewalls
    // Will try WebSocket in background for extra speed if available
    console.log(`[useWebSocket] Starting reliable polling for ${symbol}...`);
    startPolling();
    
    // If we already know WebSocket doesn't work, skip WS attempt
    if (usePolling) {
      return;
    }

    const interval = getTimeframeInterval(timeframe);
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;

    try {
      const ws = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout, switching to polling');
          ws.close();
          setUsePolling(true);
          startPolling();
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected to Binance');
        setIsConnected(true);
        setError(null);
        
        // Also start tick WebSocket for realtime price updates
        startTickWebSocket();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.k) {
            const kline = data.k;
            const candle: CandlestickData = {
              time: Math.floor(kline.t / 1000),
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
              volume: parseFloat(kline.v),
            };
            
            // Update last candle ref for tick updates
            lastCandleRef.current = candle;
            onMessage(candle);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket error, switching to REST API polling');
        setUsePolling(true);
        ws.close();
      };

      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket closed');
        setIsConnected(false);
        
        // If polling is enabled, start it
        if (usePolling) {
          startPolling();
        } else {
          // Try to reconnect via WebSocket after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket, using polling:', err);
      setUsePolling(true);
      startPolling();
    }
  }, [symbol, timeframe, onMessage, fetchHistoricalData, startPolling, startTickWebSocket, usePolling]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (tickWsRef.current) {
      tickWsRef.current.close();
      tickWsRef.current = null;
    }
    setUsePolling(false); // Reset to try WebSocket first
    connect();
  }, [connect]);

  // Re-connect when symbol or timeframe changes
  useEffect(() => {
    // Reset state for new symbol
    setIsConnected(false);
    setError(null);
    setUsePolling(false);
    lastCandleTimeRef.current = 0;
    lastCandleRef.current = null;
    
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (tickWsRef.current) {
        tickWsRef.current.close();
      }
    };
  }, [symbol, timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isConnected, error, reconnect };
}
