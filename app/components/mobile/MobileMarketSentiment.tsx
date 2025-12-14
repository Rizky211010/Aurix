'use client';

import React from 'react';

interface SentimentData {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  fearGreed: number;
  volume: 'INCREASING' | 'DECREASING' | 'STABLE';
  whales: 'BUYING' | 'SELLING' | 'NEUTRAL';
  shortTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
  midTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
  longTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
}

interface MobileMarketSentimentProps {
  data: SentimentData;
}

export default function MobileMarketSentiment({ data }: MobileMarketSentimentProps) {
  const sentimentColor = data.sentiment === 'BULLISH' ? 'text-green-400' :
                         data.sentiment === 'BEARISH' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="space-y-4">
      {/* Main Sentiment Card */}
      <div className="bg-[#21262D] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400">Sentiment</span>
          <span className={`text-xl font-bold ${sentimentColor}`}>
            {data.sentiment}
          </span>
        </div>

        {/* Confidence Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Confidence</span>
            <span className="text-white">{data.confidence}%</span>
          </div>
          <div className="h-2 bg-[#30363D] rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${data.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard 
          label="Fear/Greed" 
          value={data.fearGreed.toString()} 
          color={data.fearGreed > 50 ? 'green' : 'red'}
        />
        <MetricCard 
          label="Volume" 
          value={data.volume} 
          color={data.volume === 'INCREASING' ? 'green' : 'red'}
        />
        <MetricCard 
          label="Whales" 
          value={data.whales} 
          color={data.whales === 'BUYING' ? 'green' : data.whales === 'SELLING' ? 'red' : 'gray'}
        />
        <MetricCard 
          label="Short-term" 
          value={data.shortTerm} 
          color={data.shortTerm === 'UP' ? 'green' : data.shortTerm === 'DOWN' ? 'red' : 'gray'}
        />
      </div>

      {/* Trend Analysis */}
      <div className="bg-[#21262D] rounded-xl p-4">
        <h3 className="text-gray-400 text-sm mb-3">Trend Analysis</h3>
        <div className="space-y-2">
          <TrendRow label="Short-term" direction={data.shortTerm} />
          <TrendRow label="Mid-term" direction={data.midTerm} />
          <TrendRow label="Long-term" direction={data.longTerm} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: 'green' | 'red' | 'gray' }) {
  const colorClass = color === 'green' ? 'text-green-400' : 
                     color === 'red' ? 'text-red-400' : 'text-gray-400';
  
  return (
    <div className="bg-[#21262D] rounded-xl p-3">
      <span className="text-gray-500 text-xs">{label}</span>
      <div className={`font-bold mt-1 ${colorClass}`}>{value}</div>
    </div>
  );
}

function TrendRow({ label, direction }: { label: string; direction: 'UP' | 'DOWN' | 'SIDEWAYS' }) {
  const icon = direction === 'UP' ? '📈' : direction === 'DOWN' ? '📉' : '➡️';
  const color = direction === 'UP' ? 'text-green-400' : 
                direction === 'DOWN' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-medium ${color}`}>{icon} {direction}</span>
    </div>
  );
}
