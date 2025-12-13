'use client';

import { useState, useCallback } from 'react';
import { FullFeaturedChart } from './components/chart/FullFeaturedChart';
import { SmartSignalCard, useSmartSignal } from './components/signal';
import { PositionSizeCalculator } from './components/calculator';
import { BotStatusPanel } from './components/botStatus';
import { TradingLayout, Header, MarketInfoBar, Sidebar, SidebarSection, BottomPanel } from './components/layout';
import { CandlestickData } from './components/chart/types';

/**
 * AUTO TRADING EXECUTION PLATFORM
 * 
 * Fokus pada:
 * - Trading Levels (Entry/SL/TP)
 * - Bot Status & Control
 * - Position Management
 * - Execution Logs
 * 
 * TIDAK menampilkan:
 * - Candlestick Patterns (noise)
 * - Market Structure Visual (tidak perlu untuk bot)
 * - Supply/Demand Zones UI (bot butuh angka pasti, bukan area)
 * - Why This Signal / Edukasi (bot tidak butuh penjelasan)
 */
export default function TradingDashboard() {
  // State
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [symbol, setSymbol] = useState('XAUUSD');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('chart');
  const [high24h, setHigh24h] = useState<number | undefined>();
  const [low24h, setLow24h] = useState<number | undefined>();
  const [volume24h, setVolume24h] = useState<number | undefined>();

  // Bot State
  const [botRunning, setBotRunning] = useState(false);
  const [botMode, setBotMode] = useState<'live' | 'dry-run'>('dry-run');

  // Callback to receive historical data from ChartComponent
  const handleHistoricalData = useCallback((data: CandlestickData[]) => {
    setCandles(data);
    if (data.length > 0) {
      const firstPrice = data[0].close;
      const lastPrice = data[data.length - 1].close;
      setCurrentPrice(lastPrice);
      setPriceChange(((lastPrice - firstPrice) / firstPrice) * 100);
      
      // Calculate 24h stats
      const highs = data.map(d => d.high);
      const lows = data.map(d => d.low);
      const volumes = data.map(d => d.volume || 0);
      
      setHigh24h(Math.max(...highs));
      setLow24h(Math.min(...lows));
      setVolume24h(volumes.reduce((a, b) => a + b, 0));
    }
  }, []);

  // Callback to receive real-time updates
  const handleRealtimeUpdate = useCallback((candle: CandlestickData) => {
    setCurrentPrice(candle.close);
    setCandles(prev => {
      if (prev.length === 0) return prev;
      
      const lastCandle = prev[prev.length - 1];
      if (candle.time === lastCandle.time) {
        return [...prev.slice(0, -1), candle];
      } else if (candle.time > lastCandle.time) {
        return [...prev, candle];
      }
      return prev;
    });
  }, []);

  // Smart Signal Hook - Simplified for auto trading (no patterns/zones/structure needed for UI)
  const { 
    signal, 
    aiResponse, 
    isLoading: signalLoading, 
    source: signalSource, 
    refresh: refreshSignal,
    aiEnabled,
    setAiEnabled,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
  } = useSmartSignal({
    symbol,
    candles,
    timeframe: '1h',
    enabled: candles.length > 20,
  });

  // Bot Controls
  const handleStartBot = useCallback(async () => {
    try {
      const response = await fetch('/api/bot/start', { method: 'POST' });
      if (response.ok) {
        setBotRunning(true);
      }
    } catch (err) {
      console.error('Failed to start bot:', err);
    }
  }, []);

  const handleStopBot = useCallback(async () => {
    try {
      const response = await fetch('/api/bot/stop', { method: 'POST' });
      if (response.ok) {
        setBotRunning(false);
      }
    } catch (err) {
      console.error('Failed to stop bot:', err);
    }
  }, []);

  const handleToggleMode = useCallback(() => {
    setBotMode(prev => prev === 'live' ? 'dry-run' : 'live');
  }, []);

  // Demo execution logs
  const executionLogs = [
    { id: '1', time: Date.now() - 300000, type: 'INFO' as const, message: 'Bot initialized' },
    { id: '2', time: Date.now() - 240000, type: 'SIGNAL' as const, message: 'BUY signal detected @ 4292.50' },
    { id: '3', time: Date.now() - 180000, type: 'ENTRY' as const, message: 'Opened BUY 0.1 lot @ 4292.50, SL: 4280.00, TP: 4310.00' },
    { id: '4', time: Date.now() - 60000, type: 'INFO' as const, message: 'Monitoring position...' },
  ];

  // Bottom Panel - Only Bot Status (no analysis panels)
  const bottomTabs = [
    {
      id: 'bot',
      label: 'Bot Status',
      icon: '🤖',
      content: (
        <BotStatusPanel
          botStatus={{
            running: botRunning,
            mode: botMode,
            lastUpdate: Date.now(),
            totalTrades: 24,
            winRate: 67.5,
            todayPnl: 156.80,
            totalPnl: 2450.00,
            maxDrawdown: 3.2,
            riskPerTrade: 1,
          }}
          positions={[]}
          logs={executionLogs}
          onStartBot={handleStartBot}
          onStopBot={handleStopBot}
          onToggleMode={handleToggleMode}
        />
      ),
    },
  ];

  return (
    <TradingLayout
      header={
        <Header
          symbol={symbol}
          onSymbolChange={setSymbol}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      }
      marketInfo={
        <MarketInfoBar
          symbol={symbol}
          price={currentPrice}
          priceChange={priceChange}
          high24h={high24h}
          low24h={low24h}
          volume24h={volume24h}
        />
      }
      sidebar={
        <Sidebar>
          {/* Signal Card - Simplified for execution */}
          <SidebarSection title="Trading Signal" icon="📊" defaultOpen={true}>
            <SmartSignalCard
              signal={signal}
              aiResponse={aiResponse}
              source={signalSource}
              isLoading={signalLoading}
              onRefresh={refreshSignal}
              aiEnabled={aiEnabled}
              onAiToggle={setAiEnabled}
              autoRefreshEnabled={autoRefreshEnabled}
              onAutoRefreshToggle={setAutoRefreshEnabled}
            />
          </SidebarSection>
          
          {/* Position Calculator */}
          <SidebarSection title="Position Size" icon="🎯" defaultOpen={true}>
            <PositionSizeCalculator
              symbol={symbol}
              entryPrice={currentPrice || 0}
            />
          </SidebarSection>

          {/* Quick Bot Controls */}
          <SidebarSection title="Quick Control" icon="⚡" defaultOpen={true}>
            <div className="space-y-3">
              {/* Bot Status Indicator */}
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${botRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                  <span className="text-sm text-gray-300">
                    {botRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  botMode === 'live' 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {botMode.toUpperCase()}
                </span>
              </div>

              {/* Start/Stop Button */}
              <button
                onClick={botRunning ? handleStopBot : handleStartBot}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  botRunning
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {botRunning ? '⏹ Stop Bot' : '▶ Start Bot'}
              </button>

              {/* Signal Info */}
              {signal && (
                <div className={`p-3 rounded-lg border ${
                  signal.type === 'BUY'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${
                      signal.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {signal.type} Signal
                    </span>
                    <span className="text-xs text-gray-500">
                      {signal.validity_score}% conf
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="text-white font-mono">
                        {((signal.entry_zone.high + signal.entry_zone.low) / 2).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">SL</p>
                      <p className="text-red-400 font-mono">{signal.sl.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">TP</p>
                      <p className="text-emerald-400 font-mono">{signal.tp1.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SidebarSection>
        </Sidebar>
      }
      bottomPanel={
        <BottomPanel tabs={bottomTabs} defaultTab="bot" />
      }
    >
      {/* Main Chart - Clean, only Trading Levels */}
      <div className="h-full p-2">
        <FullFeaturedChart
          symbol={symbol}
          initialTimeframe="1h"
          height={450}
          showMarketStructure={false}  // ❌ Disabled - not needed for auto trading
          showSupplyDemand={false}     // ❌ Disabled - bot needs exact numbers
          showCandlePatterns={false}   // ❌ Disabled - noise for bot
          showTradingLevels={true}     // ✅ ONLY this matters for execution
          signal={signal}
          onHistoricalData={handleHistoricalData}
          onRealtimeUpdate={handleRealtimeUpdate}
        />
      </div>
    </TradingLayout>
  );
}
