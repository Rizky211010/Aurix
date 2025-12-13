'use client';

import React from 'react';

export interface TradingLevel {
  type: 'entry' | 'sl' | 'tp1' | 'tp2' | 'tp3';
  price: number;
  label: string;
}

interface TradingLevelsOverlayProps {
  levels: TradingLevel[];
  currentPrice: number;
  chartHeight: number;
  priceRange: { high: number; low: number };
}

// Color scheme for trading levels
const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  entry: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  sl: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  tp1: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400' },
  tp2: { bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-300' },
  tp3: { bg: 'bg-emerald-500/20', border: 'border-emerald-300', text: 'text-emerald-200' },
};

export function TradingLevelsPanel({ 
  signal,
  currentPrice,
}: {
  signal: {
    type: 'BUY' | 'SELL';
    entry_zone: { high: number; low: number };
    sl: number;
    tp1: number;
    tp2?: number;
    tp3?: number;
  } | null;
  currentPrice: number | null;
}) {
  if (!signal || !currentPrice) return null;

  const isBuy = signal.type === 'BUY';
  const entryMid = (signal.entry_zone.high + signal.entry_zone.low) / 2;
  
  // Calculate distances from current price
  const entryDist = ((entryMid - currentPrice) / currentPrice * 100).toFixed(2);
  const slDist = ((signal.sl - currentPrice) / currentPrice * 100).toFixed(2);
  const tp1Dist = ((signal.tp1 - currentPrice) / currentPrice * 100).toFixed(2);
  
  // Calculate RR ratio
  const risk = Math.abs(entryMid - signal.sl);
  const reward = Math.abs(signal.tp1 - entryMid);
  const rr = (reward / risk).toFixed(2);

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Trading Setup</h4>
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {signal.type}
        </span>
      </div>

      {/* Entry Zone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-blue-400 font-medium">ENTRY</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono text-blue-300">${entryMid.toFixed(2)}</span>
            <span className="text-xs text-gray-500 ml-2">({entryDist}%)</span>
          </div>
        </div>

        {/* Stop Loss */}
        <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-400 font-medium">STOP LOSS</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono text-red-300">${signal.sl.toFixed(2)}</span>
            <span className="text-xs text-gray-500 ml-2">({slDist}%)</span>
          </div>
        </div>

        {/* Take Profit 1 */}
        <div className="flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-400 font-medium">TAKE PROFIT 1</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono text-emerald-300">${signal.tp1.toFixed(2)}</span>
            <span className="text-xs text-gray-500 ml-2">({tp1Dist}%)</span>
          </div>
        </div>

        {/* Take Profit 2 */}
        {signal.tp2 && (
          <div className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">TAKE PROFIT 2</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono text-emerald-200">${signal.tp2.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Risk/Reward Summary */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <span className="text-xs text-gray-500">Risk/Reward</span>
        <span className={`text-sm font-bold ${parseFloat(rr) >= 2 ? 'text-emerald-400' : parseFloat(rr) >= 1.5 ? 'text-amber-400' : 'text-red-400'}`}>
          1:{rr}
        </span>
      </div>

      {/* Current Price */}
      <div className="flex items-center justify-between p-2 rounded bg-gray-800 border border-gray-700">
        <span className="text-xs text-gray-400">Current Price</span>
        <span className="text-sm font-mono text-white font-bold">${currentPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}

// Quick trade card for mobile/compact view
export function QuickTradeCard({
  type,
  entry,
  sl,
  tp,
  currentPrice,
}: {
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  currentPrice: number;
}) {
  const isBuy = type === 'BUY';
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rr = (reward / risk).toFixed(1);
  const pnlPips = Math.abs(currentPrice - entry);
  const isInProfit = isBuy ? currentPrice > entry : currentPrice < entry;

  return (
    <div className={`p-3 rounded-lg border ${
      isBuy ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-bold ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
          {type}
        </span>
        <span className="text-xs text-gray-400">RR 1:{rr}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="text-gray-500">Entry</div>
          <div className="font-mono text-blue-400">{entry.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">SL</div>
          <div className="font-mono text-red-400">{sl.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">TP</div>
          <div className="font-mono text-emerald-400">{tp.toFixed(2)}</div>
        </div>
      </div>

      <div className={`mt-2 pt-2 border-t border-gray-700 text-center text-xs ${
        isInProfit ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {isInProfit ? '✓ ' : '✗ '}{pnlPips.toFixed(2)} pips {isInProfit ? 'profit' : 'loss'}
      </div>
    </div>
  );
}

export default TradingLevelsPanel;
