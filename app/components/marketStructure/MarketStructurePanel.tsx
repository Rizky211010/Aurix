'use client';

import React from 'react';
import { MarketStructure } from './types';

interface MarketStructurePanelProps {
  structure: MarketStructure | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

// Trend badge colors
const TREND_COLORS = {
  bullish: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: '↑',
  },
  bearish: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: '↓',
  },
  neutral: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    icon: '→',
  },
};

// Swing type colors
const SWING_COLORS = {
  HH: 'text-emerald-400',
  HL: 'text-teal-400',
  LH: 'text-orange-400',
  LL: 'text-red-400',
};

export default function MarketStructurePanel({
  structure,
  isLoading,
  error,
  onRefresh,
}: MarketStructurePanelProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-red-500/30 p-4">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
        <div className="text-gray-500 text-sm text-center">
          Insufficient data for structure analysis
        </div>
      </div>
    );
  }

  const trendStyle = TREND_COLORS[structure.currentTrend];
  const recentBreaks = structure.structureBreaks.slice(-5).reverse();
  const recentSwings = structure.swingPoints.slice(-8).reverse();

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Market Structure</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${trendStyle.bg} ${trendStyle.text} ${trendStyle.border} border`}>
            {trendStyle.icon} {structure.currentTrend.toUpperCase()}
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Refresh analysis"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Key Levels Grid */}
        <div className="grid grid-cols-2 gap-2">
          {structure.lastHH && (
            <div className="bg-gray-900/50 rounded-lg p-2">
              <div className="text-xs text-gray-500">Last HH</div>
              <div className={`text-sm font-mono ${SWING_COLORS.HH}`}>
                {structure.lastHH.price.toFixed(2)}
              </div>
            </div>
          )}
          {structure.lastHL && (
            <div className="bg-gray-900/50 rounded-lg p-2">
              <div className="text-xs text-gray-500">Last HL</div>
              <div className={`text-sm font-mono ${SWING_COLORS.HL}`}>
                {structure.lastHL.price.toFixed(2)}
              </div>
            </div>
          )}
          {structure.lastLH && (
            <div className="bg-gray-900/50 rounded-lg p-2">
              <div className="text-xs text-gray-500">Last LH</div>
              <div className={`text-sm font-mono ${SWING_COLORS.LH}`}>
                {structure.lastLH.price.toFixed(2)}
              </div>
            </div>
          )}
          {structure.lastLL && (
            <div className="bg-gray-900/50 rounded-lg p-2">
              <div className="text-xs text-gray-500">Last LL</div>
              <div className={`text-sm font-mono ${SWING_COLORS.LL}`}>
                {structure.lastLL.price.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Structure Breaks */}
        {recentBreaks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Recent Breaks</div>
            <div className="space-y-1">
              {recentBreaks.map((brk, idx) => (
                <div
                  key={`${brk.time}-${idx}`}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${
                    brk.type === 'CHOCH'
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'bg-blue-500/10 border border-blue-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        brk.type === 'CHOCH' ? 'text-amber-400' : 'text-blue-400'
                      }`}
                    >
                      {brk.type}
                    </span>
                    <span
                      className={`text-xs ${
                        brk.direction === 'bullish' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {brk.direction === 'bullish' ? '↑' : '↓'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-gray-400">
                    {brk.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Swing Points Timeline */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Swing Points</div>
          <div className="flex flex-wrap gap-1">
            {recentSwings.map((swing, idx) => (
              <span
                key={`${swing.time}-${idx}`}
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  swing.swingType
                    ? `${SWING_COLORS[swing.swingType]} bg-gray-900/50`
                    : 'text-gray-500'
                }`}
              >
                {swing.swingType || (swing.type === 'high' ? 'SH' : 'SL')}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700/50">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-300">
              {structure.swingPoints.length}
            </div>
            <div className="text-xs text-gray-500">Swings</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">
              {structure.structureBreaks.filter(b => b.type === 'BOS').length}
            </div>
            <div className="text-xs text-gray-500">BOS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-400">
              {structure.structureBreaks.filter(b => b.type === 'CHOCH').length}
            </div>
            <div className="text-xs text-gray-500">CHOCH</div>
          </div>
        </div>
      </div>
    </div>
  );
}
