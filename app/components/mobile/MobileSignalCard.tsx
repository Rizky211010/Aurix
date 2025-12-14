'use client';

import React from 'react';

interface Signal {
  type: 'BUY' | 'SELL' | 'HOLD';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  confidence: number;
  reason: string;
  riskReward: number;
}

interface MobileSignalCardProps {
  signal: Signal | null;
  symbol: string;
  onExpand?: () => void;
}

export default function MobileSignalCard({ signal, symbol, onExpand }: MobileSignalCardProps) {
  if (!signal) {
    return (
      <div className="bg-[#21262D] rounded-xl p-6 text-center">
        <div className="text-gray-500 text-4xl mb-2">📊</div>
        <p className="text-gray-400">No active signal</p>
        <p className="text-gray-500 text-sm mt-1">Waiting for market conditions...</p>
      </div>
    );
  }

  const typeColor = signal.type === 'BUY' ? 'bg-green-600' : 
                    signal.type === 'SELL' ? 'bg-red-600' : 'bg-gray-600';

  return (
    <div className="space-y-4">
      {/* Signal Header */}
      <div className="bg-[#21262D] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={`${typeColor} px-3 py-1.5 rounded-lg font-bold text-white`}>
              {signal.type}
            </span>
            <span className="text-white font-medium">{symbol}</span>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-xs">Confidence</div>
            <div className={`font-bold ${signal.confidence >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
              {signal.confidence}%
            </div>
          </div>
        </div>

        {/* Price Levels */}
        <div className="grid grid-cols-2 gap-3">
          <PriceLevel label="Entry" value={signal.entry} color="blue" />
          <PriceLevel label="Stop Loss" value={signal.stopLoss} color="red" />
          <PriceLevel label="TP1" value={signal.takeProfit1} color="green" />
          {signal.takeProfit2 && (
            <PriceLevel label="TP2" value={signal.takeProfit2} color="green" />
          )}
        </div>
      </div>

      {/* Risk/Reward */}
      <div className="bg-[#21262D] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Risk/Reward Ratio</span>
          <span className={`font-bold ${signal.riskReward >= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
            1:{signal.riskReward.toFixed(1)}
          </span>
        </div>
        <div className="mt-2 h-2 bg-[#30363D] rounded-full overflow-hidden flex">
          <div className="bg-red-500 h-full" style={{ width: '33%' }} />
          <div className="bg-green-500 h-full" style={{ width: `${Math.min(signal.riskReward * 33, 67)}%` }} />
        </div>
      </div>

      {/* Reason */}
      <div className="bg-[#21262D] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Why This Signal?</span>
          {onExpand && (
            <button onClick={onExpand} className="text-blue-400 text-sm">
              See More
            </button>
          )}
        </div>
        <p className="text-gray-300 text-sm">{signal.reason}</p>
      </div>
    </div>
  );
}

function PriceLevel({ label, value, color }: { label: string; value: number; color: 'blue' | 'red' | 'green' }) {
  const colorClass = color === 'blue' ? 'text-blue-400' : 
                     color === 'red' ? 'text-red-400' : 'text-green-400';
  
  const bgClass = color === 'blue' ? 'bg-blue-900/30' : 
                  color === 'red' ? 'bg-red-900/30' : 'bg-green-900/30';

  return (
    <div className={`${bgClass} rounded-lg p-2`}>
      <div className="text-gray-500 text-xs">{label}</div>
      <div className={`font-bold ${colorClass}`}>{value.toFixed(2)}</div>
    </div>
  );
}
