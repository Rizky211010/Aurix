'use client';

import React from 'react';
import { Timeframe } from './types';

interface ChartToolbarProps {
  symbol?: string;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  currentPrice?: number;
  priceChange?: number;
  isConnected?: boolean;
  onRefresh?: () => void;
  onReconnect?: () => void;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

export function ChartToolbar({
  symbol,
  timeframe,
  onTimeframeChange,
  currentPrice,
  priceChange,
  isConnected = true,
  onRefresh,
  onReconnect,
}: ChartToolbarProps) {
  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-800">
      {/* Connection Status Indicator - Left Side */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-all ${
            isConnected
              ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
              : 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'
          }`}
          title={isConnected ? 'Connected to market data' : 'Disconnected from market data'}
        />
        <span className="text-xs text-gray-500 font-medium">
          {isConnected ? 'Live' : 'Offline'}
        </span>
        {!isConnected && onReconnect && (
          <button
            onClick={onReconnect}
            className="ml-1 px-2 py-0.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded border border-blue-500/30 transition-colors font-medium"
            title="Reconnect to data source"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Left: Symbol and Timeframe Buttons */}
      <div className="flex items-center gap-3">
        {symbol && (
          <span className="text-sm font-semibold text-white">{symbol}</span>
        )}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                timeframe === tf.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Price Info */}
      <div className="flex items-center gap-4">
        {currentPrice !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">
              ${currentPrice.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: currentPrice < 1 ? 6 : 2
              })}
            </span>
            {priceChange !== undefined && (
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                isPositive 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 rounded">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}

        {/* Reconnect Button - shows when disconnected */}
        {!isConnected && onReconnect && (
          <button
            onClick={onReconnect}
            className="px-2 py-1 text-xs font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 rounded transition-colors"
            title="Reconnect"
          >
            Reconnect
          </button>
        )}

        {/* Fullscreen Button */}
        <button
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          title="Fullscreen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
