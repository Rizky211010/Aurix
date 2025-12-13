// Signal Analysis Types

export interface AnalysisStep {
  id: number;
  title: string;
  description: string;
  status: 'bullish' | 'bearish' | 'neutral' | 'confirmed';
  details?: string[];
  value?: string | number;
  icon?: 'trend' | 'support' | 'resistance' | 'candle' | 'volume' | 'momentum' | 'confluence';
}

export interface SignalAnalysis {
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  summary: string;
  steps: AnalysisStep[];
  keyLevels: {
    entry: number;
    stopLoss: number;
    takeProfit: number[];
  };
  riskReward: number;
  timeframe: string;
  timestamp: number;
}

export interface EducationalNote {
  title: string;
  content: string;
  learnMore?: string;
}

// Step icon mappings
export const STEP_ICONS: Record<string, string> = {
  trend: '📈',
  support: '🛡️',
  resistance: '🚧',
  candle: '🕯️',
  volume: '📊',
  momentum: '⚡',
  confluence: '🎯',
};

// Status colors
export const STATUS_COLORS = {
  bullish: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    line: '#10b981',
  },
  bearish: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    text: 'text-red-400',
    line: '#ef4444',
  },
  neutral: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/40',
    text: 'text-gray-400',
    line: '#6b7280',
  },
  confirmed: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    line: '#3b82f6',
  },
};
