// Market Dashboard Types

export interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export interface SpreadData {
  symbol: string;
  spreadPips: number;
  spreadPercent: number;
}

export interface CurrencyStrength {
  currency: string;
  strength: number; // -100 to +100
  change: number;   // Change from previous period
}

export interface VolatilityData {
  symbol: string;
  atr: number;         // Average True Range
  atrPercent: number;  // ATR as percentage of price
  volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface MarketSession {
  name: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  timezone: string;
}

export interface DashboardData {
  price: PriceData;
  spread: SpreadData;
  currencyStrengths: CurrencyStrength[];
  volatility: VolatilityData;
  sessions: MarketSession[];
  lastUpdate: number;
}

// Color schemes for different states
export const DASHBOARD_COLORS = {
  positive: '#10b981',    // emerald-500
  negative: '#ef4444',    // red-500
  neutral: '#6b7280',     // gray-500
  warning: '#f59e0b',     // amber-500
  info: '#3b82f6',        // blue-500
  
  // Currency colors
  USD: '#22c55e',         // green
  EUR: '#3b82f6',         // blue
  GBP: '#a855f7',         // purple
  JPY: '#ef4444',         // red
  CHF: '#f97316',         // orange
  AUD: '#eab308',         // yellow
  CAD: '#ec4899',         // pink
  NZD: '#14b8a6',         // teal
  
  // Background
  cardBg: 'rgba(17, 24, 39, 0.8)',
  border: 'rgba(75, 85, 99, 0.3)',
};

// Volatility thresholds (ATR percentage)
export const VOLATILITY_THRESHOLDS = {
  LOW: 0.5,
  MEDIUM: 1.0,
  HIGH: 2.0,
  EXTREME: 3.0,
};
