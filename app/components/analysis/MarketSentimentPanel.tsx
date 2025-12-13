/**
 * Market Sentiment Panel Component
 * Menampilkan market sentiment dari Kol API
 */

'use client';

import { useMarketAnalysis } from './useMarketAnalysis';

interface MarketSentimentPanelProps {
  symbol: string;
}

export function MarketSentimentPanel({ symbol }: MarketSentimentPanelProps) {
  const { data, isLoading } = useMarketAnalysis({ symbol, autoRefresh: true });

  if (!data) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">🌍 Market Sentiment</h3>
        <div className="text-center text-gray-500 text-xs">
          {isLoading ? 'Loading...' : 'No data'}
        </div>
      </div>
    );
  }

  const sentiment = data.sentiment;
  const trend = data.trend;

  const getSentimentColor = (sent: string) => {
    switch (sent) {
      case 'BULLISH':
        return 'text-emerald-400';
      case 'BEARISH':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'UP':
        return '📈';
      case 'DOWN':
        return '📉';
      default:
        return '↔️';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">🌍 Market Sentiment</h3>
        {isLoading && <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />}
      </div>

      {/* Sentiment Section */}
      {sentiment && (
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Sentiment</span>
            <span className={`text-sm font-bold ${getSentimentColor(sentiment.sentiment)}`}>
              {sentiment.sentiment}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    sentiment.confidence > 70
                      ? 'bg-emerald-500'
                      : sentiment.confidence > 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${sentiment.confidence}%` }}
                />
              </div>
              <span className="text-xs font-mono">{sentiment.confidence}%</span>
            </div>
          </div>

          {sentiment.fear_greed_index !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Fear/Greed</span>
              <span className="text-xs font-mono">{sentiment.fear_greed_index}</span>
            </div>
          )}

          {sentiment.volume_trend && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Volume</span>
              <span className="text-xs text-blue-400">{sentiment.volume_trend}</span>
            </div>
          )}

          {sentiment.whale_activity && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Whales</span>
              <span
                className={`text-xs ${
                  sentiment.whale_activity === 'BUYING'
                    ? 'text-emerald-400'
                    : sentiment.whale_activity === 'SELLING'
                    ? 'text-red-400'
                    : 'text-gray-400'
                }`}
              >
                {sentiment.whale_activity}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Trend Section */}
      {trend && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-2">Trend Analysis</div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Short-term</span>
            <span className="text-sm">
              {getTrendIcon(trend.short_term)} {trend.short_term}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Mid-term</span>
            <span className="text-sm">
              {getTrendIcon(trend.mid_term)} {trend.mid_term}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Long-term</span>
            <span className="text-sm">
              {getTrendIcon(trend.long_term)} {trend.long_term}
            </span>
          </div>

          {trend.momentum && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
              <span className="text-xs text-gray-500">Momentum</span>
              <span className={`text-xs font-mono ${trend.momentum > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend.momentum > 0 ? '+' : ''}{trend.momentum}
              </span>
            </div>
          )}
        </div>
      )}

      {!sentiment && !trend && (
        <div className="text-center text-gray-500 text-xs py-2">
          Market data unavailable
        </div>
      )}
    </div>
  );
}

export default MarketSentimentPanel;
