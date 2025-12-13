// Market Structure Types

export type SwingType = 'HH' | 'HL' | 'LH' | 'LL';
export type StructureType = 'BOS' | 'CHOCH';
export type TrendDirection = 'bullish' | 'bearish' | 'neutral';

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: 'high' | 'low';
  swingType?: SwingType; // HH, HL, LH, LL
  confirmed: boolean;
}

export interface StructureBreak {
  index: number;
  time: number;
  price: number;
  type: StructureType; // BOS or CHOCH
  direction: 'bullish' | 'bearish';
  brokenSwing: SwingPoint;
  breakCandle: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

export interface MarketStructure {
  swingPoints: SwingPoint[];
  structureBreaks: StructureBreak[];
  currentTrend: TrendDirection;
  lastHH: SwingPoint | null;
  lastHL: SwingPoint | null;
  lastLH: SwingPoint | null;
  lastLL: SwingPoint | null;
}

export interface MarketStructureConfig {
  swingLookback: number;      // Candles to look back for swing detection (default: 5)
  confirmationCandles: number; // Candles needed to confirm swing (default: 2)
  bodyCloseOnly: boolean;     // Only count body close breaks (default: true)
}

export const DEFAULT_STRUCTURE_CONFIG: MarketStructureConfig = {
  swingLookback: 5,
  confirmationCandles: 2,
  bodyCloseOnly: true,
};

// Chart visualization types
export interface StructureLine {
  time: number;
  value: number;
}

export interface StructureMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
  size?: number;
}

export interface MarketStructureVisualization {
  swingHighLines: StructureLine[][];
  swingLowLines: StructureLine[][];
  bosMarkers: StructureMarker[];
  chochMarkers: StructureMarker[];
  swingMarkers: StructureMarker[];
  trendZones: {
    startTime: number;
    endTime: number;
    trend: TrendDirection;
  }[];
}
