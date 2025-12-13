'use client';

import React from 'react';
import { usePositionCalculator } from './usePositionCalculator';
import { PositionWarning } from './types';

interface PositionSizeCalculatorProps {
  symbol?: string;
  entryPrice?: number;
  onCalculate?: (lotSize: number, riskAmount: number) => void;
}

export default function PositionSizeCalculator({
  symbol = 'BTCUSDT',
  entryPrice = 0,
  onCalculate,
}: PositionSizeCalculatorProps) {
  const {
    account,
    trade,
    result,
    riskLevel,
    riskReward,
    potentialProfit,
    updateAccount,
    updateTrade,
    reset,
    applyPreset,
  } = usePositionCalculator({ initialSymbol: symbol });

  // Update entry price when prop changes
  React.useEffect(() => {
    if (entryPrice > 0) {
      updateTrade({ entryPrice });
    }
  }, [entryPrice, updateTrade]);

  // Callback when calculation changes
  React.useEffect(() => {
    if (onCalculate && result.lotSize > 0) {
      onCalculate(result.lotSize, result.riskAmount);
    }
  }, [result.lotSize, result.riskAmount, onCalculate]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Conservative': return 'text-emerald-400';
      case 'Moderate': return 'text-blue-400';
      case 'Aggressive': return 'text-amber-400';
      default: return 'text-red-400';
    }
  };

  const getWarningStyle = (type: PositionWarning['type']) => {
    switch (type) {
      case 'danger': return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'warning': return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
      default: return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
    }
  };

  const getWarningIcon = (type: PositionWarning['type']) => {
    switch (type) {
      case 'danger': return '⚠️';
      case 'warning': return '⚡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Position Size Calculator</h3>
              <p className="text-slate-400 text-sm">Smart risk management</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-sm bg-slate-700/50 hover:bg-slate-600/50 
              text-slate-300 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Preset Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => applyPreset('conservative')}
            className="flex-1 py-2 px-3 text-sm rounded-lg bg-emerald-500/10 
              border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            🐢 Conservative
          </button>
          <button
            onClick={() => applyPreset('moderate')}
            className="flex-1 py-2 px-3 text-sm rounded-lg bg-blue-500/10 
              border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            ⚖️ Moderate
          </button>
          <button
            onClick={() => applyPreset('aggressive')}
            className="flex-1 py-2 px-3 text-sm rounded-lg bg-amber-500/10 
              border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            🚀 Aggressive
          </button>
        </div>

        {/* Account Settings */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span className="text-blue-400">💼</span> Account Settings
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Balance */}
            <div className="space-y-1.5">
              <label className="text-slate-400 text-sm">Balance ({account.currency})</label>
              <input
                type="number"
                value={account.balance}
                onChange={(e) => updateAccount({ balance: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg
                  text-white font-mono text-right focus:border-violet-500 focus:ring-1 
                  focus:ring-violet-500 outline-none transition-colors"
              />
            </div>

            {/* Leverage */}
            <div className="space-y-1.5">
              <label className="text-slate-400 text-sm">Leverage</label>
              <select
                value={account.leverage}
                onChange={(e) => updateAccount({ leverage: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg
                  text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 
                  outline-none transition-colors"
              >
                <option value={10}>1:10</option>
                <option value={20}>1:20</option>
                <option value={50}>1:50</option>
                <option value={100}>1:100</option>
                <option value={200}>1:200</option>
                <option value={500}>1:500</option>
              </select>
            </div>

            {/* Account Type */}
            <div className="space-y-1.5 col-span-2">
              <label className="text-slate-400 text-sm">Account Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['standard', 'mini', 'micro'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateAccount({ accountType: type })}
                    className={`py-2 px-3 text-sm rounded-lg border transition-colors ${
                      account.accountType === type
                        ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trade Settings */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span className="text-amber-400">📊</span> Trade Settings
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Risk Percent */}
            <div className="space-y-1.5 col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 text-sm">Risk per Trade</label>
                <span className={`text-sm font-medium ${getRiskColor(riskLevel.label)}`}>
                  {riskLevel.label} ({trade.riskPercent}%)
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={trade.riskPercent}
                onChange={(e) => updateTrade({ riskPercent: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-violet-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0.1%</span>
                <span>2% (Recommended)</span>
                <span>10%</span>
              </div>
            </div>

            {/* Stop Loss Pips */}
            <div className="space-y-1.5">
              <label className="text-slate-400 text-sm">Stop Loss (Pips)</label>
              <input
                type="number"
                value={trade.stopLossPips || ''}
                onChange={(e) => updateTrade({ stopLossPips: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 50"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg
                  text-white font-mono text-right focus:border-violet-500 focus:ring-1 
                  focus:ring-violet-500 outline-none transition-colors"
              />
            </div>

            {/* Take Profit Pips */}
            <div className="space-y-1.5">
              <label className="text-slate-400 text-sm">Take Profit (Pips)</label>
              <input
                type="number"
                value={trade.takeProfitPips || ''}
                onChange={(e) => updateTrade({ takeProfitPips: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 100"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg
                  text-white font-mono text-right focus:border-violet-500 focus:ring-1 
                  focus:ring-violet-500 outline-none transition-colors"
              />
            </div>

            {/* Entry Price (Optional) */}
            <div className="space-y-1.5 col-span-2">
              <label className="text-slate-400 text-sm">Entry Price (Optional)</label>
              <input
                type="number"
                value={trade.entryPrice || ''}
                onChange={(e) => updateTrade({ entryPrice: parseFloat(e.target.value) || 0 })}
                placeholder="Current market price"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg
                  text-white font-mono text-right focus:border-violet-500 focus:ring-1 
                  focus:ring-violet-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span className="text-emerald-400">✨</span> Calculation Result
          </h4>

          {/* Main Result Card */}
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 
            border border-violet-500/30 rounded-xl p-4 space-y-4">
            
            {/* Lot Size - Main Display */}
            <div className="text-center py-3">
              <p className="text-slate-400 text-sm mb-1">Recommended Lot Size</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-white font-mono">
                  {result.lotSize.toFixed(2)}
                </span>
                <span className="text-slate-400">
                  {account.accountType} lot{result.lotSize !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-1">
                = {result.units.toLocaleString()} units
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Risk Amount</p>
                <p className="text-red-400 font-mono font-semibold">
                  -${result.riskAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Potential Profit</p>
                <p className="text-emerald-400 font-mono font-semibold">
                  +${potentialProfit.toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Margin Required</p>
                <p className="text-white font-mono font-semibold">
                  ${result.marginRequired.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Risk:Reward</p>
                <p className={`font-mono font-semibold ${
                  riskReward >= 2 ? 'text-emerald-400' : 
                  riskReward >= 1 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  1:{riskReward.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Leverage Used Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Leverage Used</span>
                <span className={`font-mono ${
                  result.leverageUsed > account.leverage * 0.8 ? 'text-red-400' :
                  result.leverageUsed > account.leverage * 0.5 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {result.leverageUsed.toFixed(1)}x / {account.leverage}x
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    result.leverageUsed > account.leverage * 0.8 ? 'bg-red-500' :
                    result.leverageUsed > account.leverage * 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((result.leverageUsed / account.leverage) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-3 rounded-lg border ${getWarningStyle(warning.type)}`}
                >
                  <span className="text-lg">{getWarningIcon(warning.type)}</span>
                  <p className="text-sm">{warning.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Risk Level Description */}
          <div className={`p-3 rounded-lg border ${
            riskLevel.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30' :
            riskLevel.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
            riskLevel.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <p className={`text-sm ${getRiskColor(riskLevel.label)}`}>
              💡 {riskLevel.description}
            </p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <p className="text-slate-400 text-xs leading-relaxed">
            <span className="text-violet-400 font-medium">Formula:</span> Lot Size = Risk Amount ÷ (SL Pips × Pip Value)
            <br />
            <span className="text-slate-500">
              Maximum lot size berdasarkan leverage: {result.maxLotSize.toFixed(2)} lots
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
