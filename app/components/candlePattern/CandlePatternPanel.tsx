'use client';

import React, { useState } from 'react';
import { DetectedPattern, PATTERN_INFO, PatternSignal } from './types';

interface PatternPanelProps {
  patterns: DetectedPattern[];
  latestPattern: DetectedPattern | null;
  isScanning: boolean;
  onScan?: () => void;
  onPatternClick?: (pattern: DetectedPattern) => void;
}

// Signal badge colors
const SIGNAL_STYLES: Record<PatternSignal, { bg: string; text: string; border: string }> = {
  BULLISH: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  BEARISH: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  NEUTRAL: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
};

// Reliability styles
const RELIABILITY_STYLES = {
  HIGH: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  LOW: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

function PatternCard({ 
  pattern, 
  isLatest,
  onClick 
}: { 
  pattern: DetectedPattern; 
  isLatest?: boolean;
  onClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Get pattern type - support both patternType and type
  const patternType = pattern.pattern.patternType || pattern.pattern.type;
  const patternName = pattern.pattern.patternName || pattern.pattern.name || patternType || 'Unknown';
  
  // Get info with fallback for unknown patterns
  const info = patternType ? PATTERN_INFO[patternType] : null;
  const fallbackInfo = {
    emoji: pattern.pattern.signal === 'BULLISH' ? '🟢' : pattern.pattern.signal === 'BEARISH' ? '🔴' : '⚪',
    name: patternName,
    description: pattern.pattern.description || 'Pattern detected',
  };
  
  const signalStyle = SIGNAL_STYLES[pattern.pattern.signal];
  const reliabilityStyle = RELIABILITY_STYLES[pattern.pattern.reliability];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
        signalStyle.bg
      } ${signalStyle.border} ${isLatest ? 'ring-2 ring-blue-500/50' : ''}`}
    >
      {/* Latest badge */}
      {isLatest && (
        <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">
          NEW
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{info?.emoji || fallbackInfo.emoji}</span>
          <span className={`text-sm font-medium ${signalStyle.text}`}>
            {patternName}
          </span>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${signalStyle.bg} ${signalStyle.text} border ${signalStyle.border}`}>
          {pattern.pattern.signal}
        </span>
      </div>

      {/* Reliability */}
      <div className="flex items-center justify-between text-xs">
        <span className={`px-1.5 py-0.5 rounded ${reliabilityStyle.bg} ${reliabilityStyle.text}`}>
          {pattern.pattern.reliability} Reliability
        </span>
        <span className="text-gray-500">
          {new Date(pattern.time * 1000).toLocaleTimeString()}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-64">
          <p className="text-xs text-gray-300">{info?.description || fallbackInfo.description}</p>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-[10px] text-gray-500">
              Formed with {pattern.candles.length} candle{pattern.candles.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandlePatternPanel({
  patterns,
  latestPattern,
  isScanning,
  onScan,
  onPatternClick,
}: PatternPanelProps) {
  const [filterSignal, setFilterSignal] = useState<PatternSignal | 'ALL'>('ALL');

  // Filter patterns
  const filteredPatterns = filterSignal === 'ALL' 
    ? patterns 
    : patterns.filter(p => p.pattern.signal === filterSignal);

  // Count by signal
  const bullishCount = patterns.filter(p => p.pattern.signal === 'BULLISH').length;
  const bearishCount = patterns.filter(p => p.pattern.signal === 'BEARISH').length;
  const neutralCount = patterns.filter(p => p.pattern.signal === 'NEUTRAL').length;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Candle Patterns</span>
          {isScanning && (
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        {onScan && (
          <button
            onClick={onScan}
            disabled={isScanning}
            className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            title="Rescan patterns"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">Found: {patterns.length}</span>
          <span className="text-emerald-400">↑ {bullishCount}</span>
          <span className="text-red-400">↓ {bearishCount}</span>
          <span className="text-amber-400">→ {neutralCount}</span>
        </div>
        
        {/* Filter buttons */}
        <div className="flex items-center gap-1">
          {(['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'] as const).map(signal => (
            <button
              key={signal}
              onClick={() => setFilterSignal(signal)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                filterSignal === signal
                  ? signal === 'ALL' ? 'bg-gray-600 text-white' :
                    signal === 'BULLISH' ? 'bg-emerald-500/30 text-emerald-400' :
                    signal === 'BEARISH' ? 'bg-red-500/30 text-red-400' :
                    'bg-amber-500/30 text-amber-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {signal === 'ALL' ? 'All' : signal.charAt(0)}
            </button>
          ))}
        </div>
      </div>

      {/* Latest Pattern Alert */}
      {latestPattern && (
        <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-xs font-medium">🔔 Latest Detection</span>
          </div>
          <PatternCard
            pattern={latestPattern}
            isLatest={true}
            onClick={() => onPatternClick?.(latestPattern)}
          />
        </div>
      )}

      {/* Pattern List */}
      <div className="p-3 max-h-[400px] overflow-y-auto space-y-2">
        {filteredPatterns.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {patterns.length === 0 
              ? 'No patterns detected yet'
              : 'No patterns match filter'}
          </div>
        ) : (
          filteredPatterns
            .filter(p => p !== latestPattern)
            .slice(0, 10)
            .map((pattern, idx) => (
              <PatternCard
                key={`${pattern.time}-${idx}`}
                pattern={pattern}
                onClick={() => onPatternClick?.(pattern)}
              />
            ))
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700/30">
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
          <span>🟢 Bullish</span>
          <span>🔴 Bearish</span>
          <span>➕ Neutral</span>
          <span>|</span>
          <span className="text-purple-400">High</span>
          <span className="text-blue-400">Med</span>
          <span className="text-gray-400">Low</span>
        </div>
      </div>
    </div>
  );
}
