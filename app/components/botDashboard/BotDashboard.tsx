'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBotDashboard } from './useBotDashboard';
import { BotLog, BotState, Position, TradeRecord, BotConfig } from './types';

// ============================================
// Sub Components
// ============================================

// Bot Control Panel
function BotControlPanel({
  state,
  mode,
  isLoading,
  onStart,
  onStop,
}: {
  state: BotState;
  mode: 'DRY_RUN' | 'LIVE';
  isLoading: boolean;
  onStart: (config: Partial<BotConfig>) => void;
  onStop: () => void;
}) {
  const [config, setConfig] = useState<Partial<BotConfig>>({
    symbol: 'BTCUSDT',
    timeframe: '1h',
    dry_run: true,
    equity: 10000,
    risk_percent: 1,
    leverage: 100,
  });
  const [showConfig, setShowConfig] = useState(false);

  const isRunning = state === 'running' || state === 'analyzing' || state === 'trading';

  const getStateColor = () => {
    switch (state) {
      case 'running':
      case 'analyzing':
        return 'bg-emerald-500';
      case 'trading':
        return 'bg-blue-500 animate-pulse';
      case 'starting':
      case 'stopping':
        return 'bg-amber-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStateColor()}`} />
          <div>
            <h3 className="font-semibold text-white">Bot Control</h3>
            <p className="text-xs text-slate-400 capitalize">{state} • {mode}</p>
          </div>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Config Panel */}
      {showConfig && !isRunning && (
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Symbol</label>
              <select
                value={config.symbol}
                onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="BTCUSDT">BTCUSDT</option>
                <option value="ETHUSDT">ETHUSDT</option>
                <option value="BNBUSDT">BNBUSDT</option>
                <option value="XAUUSD">XAUUSD</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Timeframe</label>
              <select
                value={config.timeframe}
                onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Equity ($)</label>
              <input
                type="number"
                value={config.equity}
                onChange={(e) => setConfig({ ...config, equity: Number(e.target.value) })}
                className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Risk %</label>
              <input
                type="number"
                value={config.risk_percent}
                onChange={(e) => setConfig({ ...config, risk_percent: Number(e.target.value) })}
                min={0.1}
                max={5}
                step={0.1}
                className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.dry_run}
              onChange={(e) => setConfig({ ...config, dry_run: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600"
            />
            <span className="text-sm text-slate-300">Dry Run Mode (Simulation)</span>
          </label>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={() => onStart(config)}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 
              text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                <span className="text-lg">▶️</span>
                START BOT
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onStop}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-700
              text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Stopping...
              </>
            ) : (
              <>
                <span className="text-lg">⏹️</span>
                STOP BOT
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Active Position Card
function ActivePositionCard({ position }: { position: Position }) {
  const isBuy = position.side === 'BUY';
  const pnl = position.unrealized_pnl || 0;

  return (
    <div className={`p-3 rounded-lg border ${
      isBuy ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {position.side}
          </span>
          <span className="text-white font-medium">{position.symbol}</span>
        </div>
        <span className={`font-mono text-sm ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} USD
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Entry</span>
          <p className="text-white font-mono">{position.entry_price.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-slate-500">SL</span>
          <p className="text-red-400 font-mono">{position.stop_loss.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-slate-500">TP</span>
          <p className="text-emerald-400 font-mono">{position.take_profit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// Trade History Row
function TradeHistoryRow({ trade }: { trade: TradeRecord }) {
  const isBuy = trade.side === 'BUY';
  const isProfit = trade.pnl >= 0;

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/50">
      <td className="py-2 px-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {trade.side}
        </span>
      </td>
      <td className="py-2 px-3 font-mono text-sm text-white">{trade.entry_price.toLocaleString()}</td>
      <td className="py-2 px-3 font-mono text-sm text-white">{trade.exit_price?.toLocaleString() || '-'}</td>
      <td className={`py-2 px-3 font-mono text-sm ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
        {isProfit ? '+' : ''}{trade.pnl.toFixed(2)}
      </td>
      <td className="py-2 px-3">
        <span className={`px-2 py-0.5 rounded text-xs ${
          trade.status === 'take_profit' ? 'bg-emerald-500/20 text-emerald-400' :
          trade.status === 'stopped_out' ? 'bg-red-500/20 text-red-400' :
          'bg-slate-500/20 text-slate-400'
        }`}>
          {trade.status}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-slate-500">
        {new Date(trade.opened_at).toLocaleString()}
      </td>
    </tr>
  );
}

// Log Terminal
function LogTerminal({ logs, onClear }: { logs: BotLog[]; onClear: () => void }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-400';
      case 'WARNING':
        return 'text-amber-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-sm text-slate-400 ml-2">Bot Terminal</span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>

      <div
        ref={terminalRef}
        className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-1"
      >
        {logs.length === 0 ? (
          <p className="text-slate-600">Waiting for logs...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-600 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 w-14 ${getLogColor(log.level)}`}>
                [{log.level}]
              </span>
              <span className={getLogColor(log.level)}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Stats Card
function StatsCard({ 
  label, 
  value, 
  change, 
  icon 
}: { 
  label: string; 
  value: string | number; 
  change?: number;
  icon: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white font-mono">{value}</p>
      {change !== undefined && (
        <p className={`text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export default function BotDashboard() {
  const {
    status,
    logs,
    isConnected,
    isLoading,
    error,
    startBot,
    stopBot,
    clearLogs,
  } = useBotDashboard();

  const state = status?.state || 'stopped';
  const mode = status?.mode || 'DRY_RUN';
  const stats = status?.stats;
  const positions = status?.open_positions || [];

  // Mock trade history (in production, fetch from API)
  const tradeHistory: TradeRecord[] = [];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🤖</span>
            AI Trading Bot Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Automated trading with risk management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {mode === 'DRY_RUN' && (
            <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
              🔬 SIMULATION MODE
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Control & Positions */}
        <div className="space-y-6">
          <BotControlPanel
            state={state}
            mode={mode}
            isLoading={isLoading}
            onStart={startBot}
            onStop={stopBot}
          />

          {/* Active Positions */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span>📊</span>
              Active Positions
              {positions.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                  {positions.length}
                </span>
              )}
            </h3>

            {positions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                No active positions
              </p>
            ) : (
              <div className="space-y-2">
                {positions.map((position) => (
                  <ActivePositionCard key={position.id} position={position} />
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatsCard
              icon="📈"
              label="Total Trades"
              value={stats?.total_trades || 0}
            />
            <StatsCard
              icon="💰"
              label="Total PnL"
              value={`$${(stats?.total_pnl || 0).toFixed(2)}`}
              change={stats?.total_pnl ? (stats.total_pnl / 10000) * 100 : 0}
            />
            <StatsCard
              icon="✅"
              label="Win Rate"
              value={stats?.total_trades ? 
                `${((stats.winning_trades / stats.total_trades) * 100).toFixed(0)}%` : '0%'}
            />
            <StatsCard
              icon="🎯"
              label="Signals"
              value={stats?.total_signals || 0}
            />
          </div>
        </div>

        {/* Right Column - Terminal & History */}
        <div className="lg:col-span-3 space-y-6">
          {/* Current Signal */}
          {status?.current_signal && (
            <div className={`p-4 rounded-xl border ${
              status.current_signal.action === 'BUY'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span>🎯</span>
                  Current Signal
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  status.current_signal.action === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {status.current_signal.action}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Entry</span>
                  <p className="text-white font-mono">{status.current_signal.entry_price}</p>
                </div>
                <div>
                  <span className="text-slate-400">Stop Loss</span>
                  <p className="text-red-400 font-mono">{status.current_signal.sl}</p>
                </div>
                <div>
                  <span className="text-slate-400">Take Profit</span>
                  <p className="text-emerald-400 font-mono">{status.current_signal.tp}</p>
                </div>
                <div>
                  <span className="text-slate-400">Confidence</span>
                  <p className="text-blue-400 font-mono">{status.current_signal.confidence}%</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                {status.current_signal.reason}
              </p>
            </div>
          )}

          {/* Log Terminal */}
          <LogTerminal logs={logs} onClear={clearLogs} />

          {/* Trade History */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>📜</span>
                Trade History
              </h3>
            </div>

            {tradeHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No trade history yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/50 text-xs text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Side</th>
                      <th className="py-2 px-3">Entry</th>
                      <th className="py-2 px-3">Exit</th>
                      <th className="py-2 px-3">PnL</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((trade) => (
                      <TradeHistoryRow key={trade.id} trade={trade} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
