'use client';

import React, { useState } from 'react';

interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  openTime: number;
}

interface BotStatus {
  running: boolean;
  mode: 'live' | 'dry-run';
  lastUpdate: number;
  totalTrades: number;
  winRate: number;
  todayPnl: number;
  totalPnl: number;
  maxDrawdown: number;
  riskPerTrade: number;
}

interface ExecutionLog {
  id: string;
  time: number;
  type: 'SIGNAL' | 'ENTRY' | 'EXIT' | 'SL_HIT' | 'TP_HIT' | 'ERROR' | 'INFO';
  message: string;
}

interface BotStatusPanelProps {
  botStatus?: BotStatus;
  positions?: Position[];
  logs?: ExecutionLog[];
  onStartBot?: () => void;
  onStopBot?: () => void;
  onToggleMode?: () => void;
}

export function BotStatusPanel({
  botStatus,
  positions = [],
  logs = [],
  onStartBot,
  onStopBot,
  onToggleMode,
}: BotStatusPanelProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'positions' | 'logs'>('status');
  
  // Default bot status for demo
  const status: BotStatus = botStatus || {
    running: false,
    mode: 'dry-run',
    lastUpdate: Date.now(),
    totalTrades: 0,
    winRate: 0,
    todayPnl: 0,
    totalPnl: 0,
    maxDrawdown: 0,
    riskPerTrade: 1,
  };

  // Format currency
  const formatPnl = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  // Format time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get log type color
  const getLogColor = (type: ExecutionLog['type']) => {
    switch (type) {
      case 'ENTRY': return 'text-blue-400';
      case 'EXIT': return 'text-purple-400';
      case 'SL_HIT': return 'text-red-400';
      case 'TP_HIT': return 'text-emerald-400';
      case 'SIGNAL': return 'text-yellow-400';
      case 'ERROR': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-800">
        {[
          { id: 'status', label: '📊 Status', count: null },
          { id: 'positions', label: '📈 Positions', count: positions.length },
          { id: 'logs', label: '📋 Logs', count: logs.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500 bg-gray-800/50'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Bot Control */}
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${status.running ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                <div>
                  <p className="text-white font-semibold">
                    {status.running ? 'Bot Running' : 'Bot Stopped'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Mode: <span className={status.mode === 'live' ? 'text-red-400' : 'text-yellow-400'}>
                      {status.mode.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {onToggleMode && (
                  <button
                    onClick={onToggleMode}
                    className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                  >
                    {status.mode === 'live' ? 'Switch to Dry' : 'Switch to Live'}
                  </button>
                )}
                {status.running ? (
                  <button
                    onClick={onStopBot}
                    className="px-4 py-1.5 text-sm rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                  >
                    ⏹ Stop
                  </button>
                ) : (
                  <button
                    onClick={onStartBot}
                    className="px-4 py-1.5 text-sm rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                  >
                    ▶ Start
                  </button>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Today P&L</p>
                <p className={`text-lg font-bold ${status.todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPnl(status.todayPnl)}
                </p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total P&L</p>
                <p className={`text-lg font-bold ${status.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPnl(status.totalPnl)}
                </p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Win Rate</p>
                <p className="text-lg font-bold text-white">
                  {status.winRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total Trades</p>
                <p className="text-lg font-bold text-white">
                  {status.totalTrades}
                </p>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Max Drawdown</p>
                <p className="text-lg font-bold text-red-400">
                  {status.maxDrawdown.toFixed(2)}%
                </p>
                <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(status.maxDrawdown, 100)}%` }}
                  />
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Risk Per Trade</p>
                <p className="text-lg font-bold text-yellow-400">
                  {status.riskPerTrade}%
                </p>
                <p className="text-xs text-gray-600 mt-1">of account balance</p>
              </div>
            </div>

            {/* Last Update */}
            <div className="text-center text-xs text-gray-600">
              Last update: {formatTime(status.lastUpdate)}
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="space-y-3">
            {positions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">📭</p>
                <p>No open positions</p>
              </div>
            ) : (
              positions.map(pos => (
                <div 
                  key={pos.id}
                  className={`p-4 rounded-lg border ${
                    pos.type === 'BUY' 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                        pos.type === 'BUY' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {pos.type}
                      </span>
                      <span className="text-white font-medium">{pos.symbol}</span>
                    </div>
                    <span className={`text-lg font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatPnl(pos.pnl)} ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="text-white font-mono">{pos.entry.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">SL</p>
                      <p className="text-red-400 font-mono">{pos.sl.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">TP</p>
                      <p className="text-emerald-400 font-mono">{pos.tp.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Size</p>
                      <p className="text-white font-mono">{pos.size}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">📋</p>
                <p>No execution logs yet</p>
              </div>
            ) : (
              logs.map(log => (
                <div 
                  key={log.id}
                  className="flex items-start gap-2 py-1 px-2 hover:bg-gray-800/30 rounded"
                >
                  <span className="text-gray-600 shrink-0">{formatTime(log.time)}</span>
                  <span className={`shrink-0 ${getLogColor(log.type)}`}>[{log.type}]</span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BotStatusPanel;
