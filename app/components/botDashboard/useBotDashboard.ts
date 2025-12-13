'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BotStatus,
  BotLog,
  BotConfig,
  BotState,
  TradeRecord,
  WSMessage,
} from './types';
import { BotApi } from '@/app/services';

// WebSocket URL - direct to Python backend for real-time
const WS_URL = process.env.NEXT_PUBLIC_BOT_WS_URL || 'ws://localhost:8000/ws';

interface UseBotDashboardOptions {
  autoConnect?: boolean;
  onLog?: (log: BotLog) => void;
  onStateChange?: (state: BotState) => void;
  onTrade?: (trade: TradeRecord) => void;
}

export function useBotDashboard(options: UseBotDashboardOptions = {}) {
  const { autoConnect = true, onLog, onStateChange, onTrade } = options;

  // State
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);

        // Request initial status
        ws.send(JSON.stringify({ action: 'get_status' }));
        ws.send(JSON.stringify({ action: 'get_logs', limit: 100 }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'status':
              setStatus(message.data as BotStatus);
              break;

            case 'state':
              setStatus((prev) =>
                prev ? { ...prev, state: message.data as BotState } : null
              );
              if (onStateChange) {
                onStateChange(message.data as BotState);
              }
              break;

            case 'log':
              const log = message.data as BotLog;
              setLogs((prev) => [...prev.slice(-499), log]);
              if (onLog) {
                onLog(log);
              }
              break;

            case 'logs':
              setLogs(message.data as BotLog[]);
              break;

            case 'trade':
              const trade = message.data as TradeRecord;
              if (onTrade) {
                onTrade(trade);
              }
              // Update status to reflect new position
              ws.send(JSON.stringify({ action: 'get_status' }));
              break;

            case 'pong':
              // Heartbeat response
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);

        // Attempt reconnection after 3 seconds
        if (autoConnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection failed');
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setError('Failed to connect to bot server');
    }
  }, [autoConnect, onLog, onStateChange, onTrade]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [autoConnect, connectWebSocket, disconnectWebSocket]);

  // Start bot
  const startBot = useCallback(async (config: Partial<BotConfig>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await BotApi.start({
        symbol: config.symbol || 'BTCUSDT',
        timeframe: config.timeframe || '1h',
        dry_run: config.dry_run ?? true,
        equity: config.equity || 10000,
        risk_percent: config.risk_percent || 1,
        leverage: config.leverage || 100,
        api_key: config.api_key || '',
        api_secret: config.api_secret || '',
      });

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('Bot start result:', result.data);

      // Wait a moment then get status
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await fetchStatus();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to start bot';
      setError(message);
      console.error('Start bot error:', e);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop bot
  const stopBot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await BotApi.stop();

      if (result.error) {
        throw new Error(result.error);
      }

      await fetchStatus();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to stop bot';
      setError(message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const result = await BotApi.getStatus();
      if (result.data) {
        // Map API response to local BotStatus type
        setStatus(result.data as unknown as BotStatus);
      }
    } catch (e) {
      console.error('Failed to fetch status:', e);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (limit = 100) => {
    try {
      const result = await BotApi.getLogs(limit);
      if (result.data?.logs) {
        setLogs(result.data.logs as BotLog[]);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    }
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Send WebSocket message
  const sendWsMessage = useCallback((action: string, data?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...data }));
    }
  }, []);

  return {
    // State
    status,
    logs,
    isConnected,
    isLoading,
    error,

    // Actions
    startBot,
    stopBot,
    fetchStatus,
    fetchLogs,
    clearLogs,
    connectWebSocket,
    disconnectWebSocket,
    sendWsMessage,
  };
}
