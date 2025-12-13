// AI Smart Signal Types

export type SignalType = 'BUY' | 'SELL';

export interface PriceZone {
  high: number;
  low: number;
  type: 'supply' | 'demand';
  strength: number; // 0-100
}

export interface TrendAnalysis {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  timeframe: string;
}

export interface SmartSignal {
  type: SignalType;
  symbol: string;
  entry_zone: {
    high: number;
    low: number;
  };
  tp1: number;
  tp2: number;
  sl: number;
  reason: string;
  validity_score: number; // 0-100
  timestamp: number;
  risk_reward_ratio: number;
  trend_alignment: boolean;
  zone_confluence: boolean;
}

export interface SignalValidationParams {
  currentPrice: number;
  h4Trend: TrendAnalysis;
  supplyZones: PriceZone[];
  demandZones: PriceZone[];
  atr: number; // Average True Range for dynamic SL/TP
}

export interface SignalCardProps {
  signal: SmartSignal | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}
