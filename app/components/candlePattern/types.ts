// Candlestick Pattern Types

export type PatternSignal = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type PatternType =
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'HAMMER'
  | 'INVERTED_HAMMER'
  | 'HANGING_MAN'
  | 'SHOOTING_STAR'
  | 'DOJI'
  | 'DRAGONFLY_DOJI'
  | 'GRAVESTONE_DOJI'
  | 'MORNING_STAR'
  | 'EVENING_STAR'
  | 'THREE_WHITE_SOLDIERS'
  | 'THREE_BLACK_CROWS'
  | 'PIERCING_LINE'
  | 'DARK_CLOUD_COVER'
  | 'TWEEZER_TOP'
  | 'TWEEZER_BOTTOM';

export interface PatternResult {
  patternName?: string;
  patternType?: PatternType;
  type?: PatternType; // Alternative field name from API
  name?: string; // Alternative field name from API
  signal: PatternSignal;
  reliability: 'LOW' | 'MEDIUM' | 'HIGH';
  description?: string;
}

export interface DetectedPattern {
  time: number;
  index: number;
  pattern: PatternResult;
  candles: OHLC[];
}

export interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PatternMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
  size?: number;
}

// Pattern info for UI display
export const PATTERN_INFO: Record<PatternType, {
  name: string;
  signal: PatternSignal;
  emoji: string;
  color: string;
  description: string;
}> = {
  BULLISH_ENGULFING: {
    name: 'Bullish Engulfing',
    signal: 'BULLISH',
    emoji: '🟢',
    color: '#10b981',
    description: 'Strong bullish reversal pattern. Green candle completely engulfs previous red candle.',
  },
  BEARISH_ENGULFING: {
    name: 'Bearish Engulfing',
    signal: 'BEARISH',
    emoji: '🔴',
    color: '#ef4444',
    description: 'Strong bearish reversal pattern. Red candle completely engulfs previous green candle.',
  },
  HAMMER: {
    name: 'Hammer',
    signal: 'BULLISH',
    emoji: '🔨',
    color: '#10b981',
    description: 'Bullish reversal at bottom. Long lower wick, small body at top.',
  },
  INVERTED_HAMMER: {
    name: 'Inverted Hammer',
    signal: 'BULLISH',
    emoji: '⬆️',
    color: '#10b981',
    description: 'Potential bullish reversal. Long upper wick, small body at bottom.',
  },
  HANGING_MAN: {
    name: 'Hanging Man',
    signal: 'BEARISH',
    emoji: '👤',
    color: '#ef4444',
    description: 'Bearish reversal at top. Same shape as hammer but appears after uptrend.',
  },
  SHOOTING_STAR: {
    name: 'Shooting Star',
    signal: 'BEARISH',
    emoji: '⭐',
    color: '#ef4444',
    description: 'Bearish reversal pattern. Long upper wick, small body at bottom after uptrend.',
  },
  DOJI: {
    name: 'Doji',
    signal: 'NEUTRAL',
    emoji: '➕',
    color: '#f59e0b',
    description: 'Indecision pattern. Open and close are virtually equal.',
  },
  DRAGONFLY_DOJI: {
    name: 'Dragonfly Doji',
    signal: 'BULLISH',
    emoji: '🪰',
    color: '#10b981',
    description: 'Bullish doji. Long lower wick, no upper wick.',
  },
  GRAVESTONE_DOJI: {
    name: 'Gravestone Doji',
    signal: 'BEARISH',
    emoji: '🪦',
    color: '#ef4444',
    description: 'Bearish doji. Long upper wick, no lower wick.',
  },
  MORNING_STAR: {
    name: 'Morning Star',
    signal: 'BULLISH',
    emoji: '🌅',
    color: '#10b981',
    description: 'Strong bullish reversal. Three candle pattern at bottom.',
  },
  EVENING_STAR: {
    name: 'Evening Star',
    signal: 'BEARISH',
    emoji: '🌆',
    color: '#ef4444',
    description: 'Strong bearish reversal. Three candle pattern at top.',
  },
  THREE_WHITE_SOLDIERS: {
    name: 'Three White Soldiers',
    signal: 'BULLISH',
    emoji: '💪',
    color: '#10b981',
    description: 'Strong bullish continuation. Three consecutive bullish candles.',
  },
  THREE_BLACK_CROWS: {
    name: 'Three Black Crows',
    signal: 'BEARISH',
    emoji: '🦅',
    color: '#ef4444',
    description: 'Strong bearish continuation. Three consecutive bearish candles.',
  },
  PIERCING_LINE: {
    name: 'Piercing Line',
    signal: 'BULLISH',
    emoji: '📈',
    color: '#10b981',
    description: 'Bullish reversal. Second candle opens below and closes above midpoint of first.',
  },
  DARK_CLOUD_COVER: {
    name: 'Dark Cloud Cover',
    signal: 'BEARISH',
    emoji: '☁️',
    color: '#ef4444',
    description: 'Bearish reversal. Second candle opens above and closes below midpoint of first.',
  },
  TWEEZER_TOP: {
    name: 'Tweezer Top',
    signal: 'BEARISH',
    emoji: '🔝',
    color: '#ef4444',
    description: 'Bearish reversal at resistance. Two candles with matching highs.',
  },
  TWEEZER_BOTTOM: {
    name: 'Tweezer Bottom',
    signal: 'BULLISH',
    emoji: '🔻',
    color: '#10b981',
    description: 'Bullish reversal at support. Two candles with matching lows.',
  },
};
