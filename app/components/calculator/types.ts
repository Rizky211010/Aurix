// Position Size Calculator Types

export interface AccountSettings {
  balance: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
  leverage: number;
  accountType: 'standard' | 'mini' | 'micro';
}

export interface TradeSettings {
  symbol: string;
  riskPercent: number;
  stopLossPips: number;
  stopLossPrice?: number;
  entryPrice?: number;
  takeProfitPips?: number;
}

export interface PositionSizeResult {
  lotSize: number;
  units: number;
  riskAmount: number;
  marginRequired: number;
  pipValue: number;
  maxLotSize: number;
  isOverLeveraged: boolean;
  leverageUsed: number;
  warnings: PositionWarning[];
}

export interface PositionWarning {
  type: 'danger' | 'warning' | 'info';
  message: string;
}

// Lot size multipliers
export const LOT_MULTIPLIERS = {
  standard: 100000,  // 1 lot = 100,000 units
  mini: 10000,       // 1 mini lot = 10,000 units
  micro: 1000,       // 1 micro lot = 1,000 units
};

// Pip values for common pairs (per standard lot in USD)
export const PIP_VALUES: Record<string, number> = {
  // Major pairs
  'EURUSD': 10,
  'GBPUSD': 10,
  'AUDUSD': 10,
  'NZDUSD': 10,
  'USDCHF': 10,
  'USDCAD': 10,
  'USDJPY': 9.1,  // Approximate, varies with USD/JPY rate
  
  // Cross pairs
  'EURJPY': 9.1,
  'GBPJPY': 9.1,
  'EURGBP': 12.5,
  'EURCAD': 10,
  'GBPCAD': 10,
  
  // Crypto (approximate)
  'BTCUSD': 1,
  'BTCUSDT': 1,
  'ETHUSD': 1,
  'ETHUSDT': 1,
  
  // Default
  'DEFAULT': 10,
};

// Common leverage options
export const LEVERAGE_OPTIONS = [
  { value: 10, label: '1:10' },
  { value: 20, label: '1:20' },
  { value: 30, label: '1:30' },
  { value: 50, label: '1:50' },
  { value: 100, label: '1:100' },
  { value: 200, label: '1:200' },
  { value: 500, label: '1:500' },
];

// Risk level classifications
export const RISK_LEVELS = {
  conservative: { min: 0.5, max: 1, label: 'Conservative', color: 'emerald' },
  moderate: { min: 1, max: 2, label: 'Moderate', color: 'blue' },
  aggressive: { min: 2, max: 5, label: 'Aggressive', color: 'amber' },
  extreme: { min: 5, max: 100, label: 'Extreme', color: 'red' },
};
