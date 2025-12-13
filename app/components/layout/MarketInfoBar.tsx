'use client';

import React, { useState, useEffect } from 'react';

interface MarketInfoBarProps {
  symbol: string;
  price: number | null;
  priceChange: number | null;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  spread?: number;
}

export function MarketInfoBar({
  symbol,
  price,
  priceChange,
  high24h,
  low24h,
  volume24h,
  spread,
}: MarketInfoBarProps) {
  const isPositive = (priceChange ?? 0) >= 0;
  
  // State for client-side time to avoid hydration mismatch
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');
  const [session, setSession] = useState<{ name: string; color: string }>({ name: '---', color: 'text-gray-400' });
  
  // Update time only on client side
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().slice(17, 25));
      
      // Update session based on UTC hour
      const hour = now.getUTCHours();
      if (hour >= 0 && hour < 8) {
        setSession({ name: 'Asia', color: 'text-yellow-400' });
      } else if (hour >= 8 && hour < 16) {
        setSession({ name: 'Europe', color: 'text-blue-400' });
      } else {
        setSession({ name: 'US', color: 'text-green-400' });
      }
    };
    
    // Initial update
    updateTime();
    
    // Update every second
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '---';
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2 
    });
  };

  const formatVolume = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '---';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 text-sm">
      {/* Symbol & Price */}
      <div className="flex items-center gap-6">
        {/* Symbol */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{symbol}</span>
          <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">Spot</span>
        </div>

        {/* Price */}
        <div className="flex flex-col">
          <span className={`text-xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            ${formatPrice(price)}
          </span>
        </div>

        {/* Change */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          <span>{isPositive ? '▲' : '▼'}</span>
          <span className="font-medium">
            {priceChange !== null ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%` : '---'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-gray-400">
        {/* 24h High */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500">24h High</span>
          <span className="text-emerald-400 font-medium">${formatPrice(high24h)}</span>
        </div>

        {/* 24h Low */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500">24h Low</span>
          <span className="text-red-400 font-medium">${formatPrice(low24h)}</span>
        </div>

        {/* Spread */}
        {spread !== undefined && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Spread</span>
            <span className="font-medium">{spread.toFixed(4)}%</span>
          </div>
        )}

        {/* 24h Volume */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500">24h Volume</span>
          <span className="font-medium">${formatVolume(volume24h)}</span>
        </div>

        {/* Session */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500">Session</span>
          <span className={`font-medium ${session.color}`}>{session.name}</span>
        </div>

        {/* Time */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500">UTC</span>
          <span className="font-mono text-xs">
            {currentTime}
          </span>
        </div>
      </div>
    </div>
  );
}
