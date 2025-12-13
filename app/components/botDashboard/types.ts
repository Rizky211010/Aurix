// Bot Dashboard Types

export type BotState = 'stopped' | 'starting' | 'running' | 'analyzing' | 'trading' | 'stopping' | 'error';

export interface BotLog {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  data?: Record<string, unknown>;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  stop_loss: number;
  take_profit: number;
  status: 'open' | 'closed' | 'stopped_out' | 'take_profit';
  pnl: number;
  opened_at: string;
  closed_at: string | null;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  quantity: number;
  stop_loss: number;
  take_profit: number;
  current_price?: number;
  unrealized_pnl?: number;
  opened_at: string;
}

export interface BotStats {
  total_signals: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  started_at: string | null;
  last_signal_at: string | null;
}

export interface MarketAnalysis {
  current_price: number;
  ema_9: number;
  ema_21: number;
  ema_200: number;
  trend: string;
  swing_low: number;
  swing_high: number;
  price_vs_ema200: number;
  ema9_vs_ema21: 'ABOVE' | 'BELOW';
  ready_for_buy: boolean;
  ready_for_sell: boolean;
}

export interface TradeSignal {
  action: 'BUY' | 'SELL';
  entry_price: number;
  sl: number;
  tp: number;
  swing_point: number;
  ema_9: number;
  ema_21: number;
  ema_200: number;
  risk_reward_ratio: number;
  confidence: number;
  timestamp: string;
  reason: string;
}

export interface BotStatus {
  state: BotState;
  symbol: string;
  timeframe: string;
  mode: 'DRY_RUN' | 'LIVE';
  equity: number;
  current_signal: TradeSignal | null;
  last_analysis: MarketAnalysis | null;
  open_positions: Position[];
  stats: BotStats;
}

export interface BotConfig {
  symbol: string;
  timeframe: string;
  dry_run: boolean;
  equity: number;
  risk_percent: number;
  leverage: number;
  api_key: string;
  api_secret: string;
}

// WebSocket message types
export interface WSMessage {
  type: 'log' | 'state' | 'trade' | 'status' | 'logs' | 'pong';
  data: unknown;
}
