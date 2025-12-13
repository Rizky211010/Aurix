'use client';

import React from 'react';
import { PriceZone } from './types';
import { getZoneStats } from './visualization';

interface SupplyDemandPanelProps {
  zones: PriceZone[];
  currentPrice: number | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onZoneClick?: (zone: PriceZone) => void;
}

// Strength badge styles
const STRENGTH_STYLES = {
  extreme: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  strong: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  moderate: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  },
  weak: {
    bg: 'bg-gray-700/20',
    text: 'text-gray-500',
    border: 'border-gray-600/30',
  },
};

function ZoneCard({ zone, currentPrice, onClick }: { 
  zone: PriceZone; 
  currentPrice: number | null;
  onClick?: () => void;
}) {
  const strengthStyle = STRENGTH_STYLES[zone.strength];
  
  // Calculate distance from current price
  const distance = currentPrice 
    ? zone.type === 'demand'
      ? ((currentPrice - zone.top) / currentPrice) * 100
      : ((zone.bottom - currentPrice) / currentPrice) * 100
    : null;

  const zoneHeight = zone.top - zone.bottom;
  const midPrice = (zone.top + zone.bottom) / 2;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
        zone.type === 'demand'
          ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
          : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
      } ${zone.status === 'mitigated' ? 'opacity-50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Zone Type Icon */}
          <div className={`w-6 h-6 rounded flex items-center justify-center ${
            zone.type === 'demand' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
          }`}>
            {zone.type === 'demand' ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
          
          <span className={`text-sm font-medium ${
            zone.type === 'demand' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {zone.type === 'demand' ? 'Demand' : 'Supply'}
          </span>
        </div>

        {/* Status & Strength */}
        <div className="flex items-center gap-1">
          {zone.status === 'fresh' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
              🔥 FRESH
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${strengthStyle.bg} ${strengthStyle.text} border ${strengthStyle.border}`}>
            {zone.strength.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Price Levels */}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Top</span>
          <span className="font-mono text-gray-300">{zone.top.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Bottom</span>
          <span className="font-mono text-gray-300">{zone.bottom.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Height</span>
          <span className="font-mono text-gray-400">{zoneHeight.toFixed(2)} ({((zoneHeight / midPrice) * 100).toFixed(2)}%)</span>
        </div>
      </div>

      {/* Distance from current price */}
      {distance !== null && zone.status !== 'mitigated' && (
        <div className={`text-xs px-2 py-1 rounded ${
          Math.abs(distance) < 1 
            ? 'bg-amber-500/10 text-amber-400' 
            : 'bg-gray-800/50 text-gray-500'
        }`}>
          {distance > 0 
            ? `${distance.toFixed(2)}% above price` 
            : `${Math.abs(distance).toFixed(2)}% below price`}
          {Math.abs(distance) < 0.5 && ' ⚠️ Very close!'}
        </div>
      )}

      {/* Mitigated indicator */}
      {zone.status === 'mitigated' && (
        <div className="text-xs px-2 py-1 rounded bg-gray-800/50 text-gray-500">
          ❌ Mitigated
        </div>
      )}

      {/* Tested indicator */}
      {zone.status === 'tested' && (
        <div className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">
          👆 Tested {zone.touchCount}x
        </div>
      )}
    </div>
  );
}

export default function SupplyDemandPanel({
  zones,
  currentPrice,
  isLoading,
  error,
  onRefresh,
  onZoneClick,
}: SupplyDemandPanelProps) {
  const stats = zones.length > 0 ? getZoneStats(zones) : null;
  
  // Separate zones by type
  const demandZones = zones.filter(z => z.type === 'demand' && z.status !== 'mitigated');
  const supplyZones = zones.filter(z => z.type === 'supply' && z.status !== 'mitigated');

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-700 rounded w-1/2" />
          <div className="h-20 bg-gray-700 rounded" />
          <div className="h-20 bg-gray-700 rounded" />
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

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Supply & Demand</span>
          {stats && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
              {stats.freshZones} Fresh
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Refresh zones"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-700/30 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-400">{stats.demandZones}</div>
            <div className="text-[10px] text-gray-500">Demand</div>
          </div>
          <div>
            <div className="text-lg font-bold text-rose-400">{stats.supplyZones}</div>
            <div className="text-[10px] text-gray-500">Supply</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-400">{stats.freshZones}</div>
            <div className="text-[10px] text-gray-500">Fresh</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-400">{stats.testedZones}</div>
            <div className="text-[10px] text-gray-500">Tested</div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 max-h-[500px] overflow-y-auto space-y-4">
        {zones.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No zones detected
          </div>
        ) : (
          <>
            {/* Supply Zones (Above) */}
            {supplyZones.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  Supply Zones ({supplyZones.length})
                </div>
                {supplyZones.map(zone => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    currentPrice={currentPrice}
                    onClick={() => onZoneClick?.(zone)}
                  />
                ))}
              </div>
            )}

            {/* Current Price Indicator */}
            {currentPrice && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  Current: {currentPrice.toFixed(2)}
                </span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>
            )}

            {/* Demand Zones (Below) */}
            {demandZones.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Demand Zones ({demandZones.length})
                </div>
                {demandZones.map(zone => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    currentPrice={currentPrice}
                    onClick={() => onZoneClick?.(zone)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
