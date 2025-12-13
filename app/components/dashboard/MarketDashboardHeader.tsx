'use client';

import React, { useState, useEffect } from 'react';
import { useDashboardData } from './useDashboardData';
import { DASHBOARD_COLORS, CurrencyStrength } from './types';

interface MarketDashboardHeaderProps {
  symbol?: string;
  currencies?: string[];
  refreshInterval?: number;
  compact?: boolean;
}

// ============================================
// Sub-Components
// ============================================

// Live Price Display
function LivePriceCell({
  label,
  value,
  change,
  changePercent,
  decimals = 2,
  showChange = true,
}: {
  label: string;
  value: number;
  change?: number;
  changePercent?: number;
  decimals?: number;
  showChange?: boolean;
}) {
  const isPositive = (change ?? 0) >= 0;
  const changeColor = isPositive ? DASHBOARD_COLORS.positive : DASHBOARD_COLORS.negative;

  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-lg font-semibold text-white tabular-nums">
        {value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </span>
      {showChange && change !== undefined && (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs tabular-nums" style={{ color: changeColor }}>
            {isPositive ? '+' : ''}{change.toFixed(decimals)}
          </span>
          {changePercent !== undefined && (
            <span className="font-mono text-xs tabular-nums" style={{ color: changeColor }}>
              ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Bid/Ask Display
function BidAskCell({
  bid,
  ask,
  decimals = 2,
}: {
  bid: number;
  ask: number;
  decimals?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Bid / Ask</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm tabular-nums text-emerald-400">
          {bid.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        </span>
        <span className="text-gray-600">/</span>
        <span className="font-mono text-sm tabular-nums text-red-400">
          {ask.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        </span>
      </div>
    </div>
  );
}

// Spread Display
function SpreadCell({
  spreadPips,
  spreadPercent,
}: {
  spreadPips: number;
  spreadPercent: number;
}) {
  const spreadColor = spreadPips < 5 ? DASHBOARD_COLORS.positive : 
                      spreadPips < 20 ? DASHBOARD_COLORS.warning : 
                      DASHBOARD_COLORS.negative;

  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Spread</span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold tabular-nums" style={{ color: spreadColor }}>
          {spreadPips.toFixed(1)}
        </span>
        <span className="text-xs text-gray-500">pips</span>
      </div>
      <span className="font-mono text-xs text-gray-500 tabular-nums">
        {(spreadPercent * 100).toFixed(4)}%
      </span>
    </div>
  );
}

// Currency Strength Meter
function CurrencyStrengthMeter({
  strengths,
}: {
  strengths: CurrencyStrength[];
}) {
  // Normalize strengths to -100 to +100 range
  const maxStrength = Math.max(...strengths.map(s => Math.abs(s.strength)), 1);
  
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Currency Strength</span>
      <div className="flex flex-col gap-1">
        {strengths.slice(0, 5).map((item) => {
          const normalizedStrength = (item.strength / maxStrength) * 100;
          const isPositive = normalizedStrength >= 0;
          const barWidth = Math.min(Math.abs(normalizedStrength), 100);
          const color = (DASHBOARD_COLORS as Record<string, string>)[item.currency] || DASHBOARD_COLORS.neutral;
          
          return (
            <div key={item.currency} className="flex items-center gap-2">
              <span className="font-mono text-xs w-8 text-gray-400">{item.currency}</span>
              <div className="flex-1 h-3 bg-gray-800 rounded-sm overflow-hidden relative">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />
                {/* Bar */}
                <div
                  className="absolute top-0 bottom-0 transition-all duration-300"
                  style={{
                    width: `${barWidth / 2}%`,
                    left: isPositive ? '50%' : `${50 - barWidth / 2}%`,
                    backgroundColor: color,
                    opacity: 0.8,
                  }}
                />
              </div>
              <span 
                className="font-mono text-xs w-12 text-right tabular-nums"
                style={{ color: isPositive ? DASHBOARD_COLORS.positive : DASHBOARD_COLORS.negative }}
              >
                {isPositive ? '+' : ''}{item.strength.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Volatility (ATR) Display
function VolatilityCell({
  atr,
  atrPercent,
  volatilityLevel,
}: {
  atr: number;
  atrPercent: number;
  volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}) {
  const levelColors = {
    LOW: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    HIGH: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    EXTREME: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  };

  const style = levelColors[volatilityLevel];

  // Visual bars for volatility level
  const bars = [1, 2, 3, 4];
  const activeBars = volatilityLevel === 'LOW' ? 1 : 
                     volatilityLevel === 'MEDIUM' ? 2 :
                     volatilityLevel === 'HIGH' ? 3 : 4;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Volatility (ATR)</span>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-lg font-semibold text-white tabular-nums">
            {atr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-xs text-gray-500 tabular-nums">
            {atrPercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          {/* Volatility bars */}
          <div className="flex items-end gap-0.5 h-5">
            {bars.map((bar) => (
              <div
                key={bar}
                className={`w-1.5 rounded-sm transition-all ${
                  bar <= activeBars ? style.bg : 'bg-gray-700'
                }`}
                style={{ height: `${bar * 5}px` }}
              />
            ))}
          </div>
          {/* Level badge */}
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${style.bg} ${style.text} border ${style.border}`}>
            {volatilityLevel}
          </span>
        </div>
      </div>
    </div>
  );
}

// High/Low Range
function RangeCell({
  high,
  low,
  current,
  decimals = 2,
}: {
  high: number;
  low: number;
  current: number;
  decimals?: number;
}) {
  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">24H Range</span>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-red-400 tabular-nums">
          {low.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        </span>
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full relative">
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border-2 border-blue-500"
            style={{ left: `calc(${Math.min(Math.max(position, 0), 100)}% - 4px)` }}
          />
        </div>
        <span className="font-mono text-emerald-400 tabular-nums">
          {high.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        </span>
      </div>
    </div>
  );
}

// Session Indicator
function SessionIndicator({
  sessions,
}: {
  sessions: { name: string; isOpen: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sessions</span>
      <div className="flex items-center gap-2">
        {sessions.map((session) => (
          <div key={session.name} className="flex items-center gap-1">
            <div 
              className={`w-2 h-2 rounded-full ${
                session.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'
              }`}
            />
            <span className={`text-xs ${session.isOpen ? 'text-white' : 'text-gray-500'}`}>
              {session.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function MarketDashboardHeader({
  symbol = 'BTCUSDT',
  currencies = ['USD', 'EUR', 'JPY', 'GBP', 'CHF'],
  refreshInterval = 2000,
  compact = false,
}: MarketDashboardHeaderProps) {
  const { data, isLoading, error } = useDashboardData({
    symbol,
    currencies,
    refreshInterval,
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine decimal places based on symbol
  const decimals = symbol.includes('BTC') || symbol.includes('ETH') ? 2 : 
                   symbol.includes('JPY') ? 3 : 5;

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <span className="text-red-400 text-sm">Error: {error}</span>
      </div>
    );
  }

  return (
    <div 
      className={`
        bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-lg
        ${compact ? 'p-2' : 'p-3'}
      `}
    >
      {/* Top Bar - Symbol & Time */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
            <span className="font-mono text-lg font-bold text-white">{symbol}</span>
          </div>
          {data && (
            <span className={`font-mono text-sm ${
              data.price.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {data.price.changePercent >= 0 ? '▲' : '▼'} {Math.abs(data.price.changePercent).toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="font-mono tabular-nums">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span className="font-mono tabular-nums">
            UTC {currentTime.toISOString().slice(11, 19)}
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div 
        className={`
          grid gap-4
          ${compact 
            ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6' 
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7'
          }
        `}
      >
        {/* Live Price */}
        <div className="col-span-1">
          {data ? (
            <LivePriceCell
              label="Last Price"
              value={data.price.last}
              change={data.price.change}
              changePercent={data.price.changePercent}
              decimals={decimals}
            />
          ) : (
            <LoadingCell label="Last Price" />
          )}
        </div>

        {/* Bid/Ask */}
        <div className="col-span-1">
          {data ? (
            <BidAskCell
              bid={data.price.bid}
              ask={data.price.ask}
              decimals={decimals}
            />
          ) : (
            <LoadingCell label="Bid / Ask" />
          )}
        </div>

        {/* Spread */}
        <div className="col-span-1">
          {data ? (
            <SpreadCell
              spreadPips={data.spread.spreadPips}
              spreadPercent={data.spread.spreadPercent}
            />
          ) : (
            <LoadingCell label="Spread" />
          )}
        </div>

        {/* Volatility (ATR) */}
        <div className="col-span-1">
          {data ? (
            <VolatilityCell
              atr={data.volatility.atr}
              atrPercent={data.volatility.atrPercent}
              volatilityLevel={data.volatility.volatilityLevel}
            />
          ) : (
            <LoadingCell label="Volatility" />
          )}
        </div>

        {/* 24H Range */}
        <div className="col-span-1 lg:col-span-1">
          {data ? (
            <RangeCell
              high={data.price.high24h}
              low={data.price.low24h}
              current={data.price.last}
              decimals={decimals}
            />
          ) : (
            <LoadingCell label="24H Range" />
          )}
        </div>

        {/* Currency Strength */}
        <div className={`${compact ? 'col-span-2' : 'col-span-2 lg:col-span-2 xl:col-span-1 row-span-1'}`}>
          {data ? (
            <CurrencyStrengthMeter strengths={data.currencyStrengths} />
          ) : (
            <LoadingCell label="Currency Strength" />
          )}
        </div>

        {/* Volume */}
        {!compact && (
          <div className="col-span-1">
            {data ? (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">24H Volume</span>
                <span className="font-mono text-sm font-semibold text-white tabular-nums">
                  {formatVolume(data.price.volume24h)}
                </span>
                <span className="font-mono text-xs text-gray-500">
                  ${formatVolume(data.price.volume24h * data.price.last)}
                </span>
              </div>
            ) : (
              <LoadingCell label="Volume" />
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar - Sessions */}
      {!compact && data && (
        <div className="mt-3 pt-2 border-t border-gray-800">
          <SessionIndicator sessions={data.sessions} />
        </div>
      )}
    </div>
  );
}

// Loading placeholder
function LoadingCell({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="h-6 w-24 bg-gray-800 rounded animate-pulse" />
      <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
    </div>
  );
}

// Format large numbers
function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}
