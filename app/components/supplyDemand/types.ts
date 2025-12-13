// Supply & Demand Zone Types

export type ZoneType = 'supply' | 'demand';
export type ZoneStatus = 'fresh' | 'tested' | 'mitigated';
export type ZoneStrength = 'weak' | 'moderate' | 'strong' | 'extreme';

export interface PriceZone {
  id: string;
  type: ZoneType;
  status: ZoneStatus;
  strength: ZoneStrength;
  
  // Zone boundaries
  top: number;
  bottom: number;
  
  // Time boundaries
  startTime: number;
  endTime: number | null; // null means extends to current
  
  // Zone metadata
  baseCandle: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    index: number;
  };
  
  // Impulse move data
  impulseMove: {
    direction: 'up' | 'down';
    startPrice: number;
    endPrice: number;
    magnitude: number; // in percentage
    candles: number;   // number of candles in impulse
  };
  
  // Zone interaction tracking
  touchCount: number;
  lastTouchTime: number | null;
  mitigatedAt: number | null;
  
  // Quality metrics
  imbalanceRatio: number;  // How strong the imbalance was
  proximityScore: number;  // How close price came before reversing
}

export interface ZoneDetectionConfig {
  // Impulse detection
  minImpulseMagnitude: number;    // Minimum % move to consider impulsive (default: 0.5%)
  minImpulseCandles: number;      // Minimum candles for impulse (default: 2)
  maxImpulseCandles: number;      // Maximum candles for impulse (default: 5)
  
  // Zone formation
  maxBaseCandles: number;         // Max candles to look back for base (default: 3)
  minBodyRatio: number;           // Min body/range ratio for base candle (default: 0.5)
  
  // Zone management
  maxZones: number;               // Maximum zones to track (default: 20)
  zoneExtensionBars: number;      // Bars to extend zone visualization (default: 500)
  
  // Mitigation rules
  mitigationThreshold: number;    // % into zone to consider mitigated (default: 50%)
  bodyCloseMitigation: boolean;   // Require body close for mitigation (default: true)
}

export const DEFAULT_ZONE_CONFIG: ZoneDetectionConfig = {
  minImpulseMagnitude: 0.3,
  minImpulseCandles: 2,
  maxImpulseCandles: 5,
  maxBaseCandles: 3,
  minBodyRatio: 0.4,
  maxZones: 20,
  zoneExtensionBars: 500,
  mitigationThreshold: 50,
  bodyCloseMitigation: true,
};

// Visualization types
export interface ZoneRectangle {
  id: string;
  type: ZoneType;
  status: ZoneStatus;
  top: number;
  bottom: number;
  startTime: number;
  endTime: number;
  color: string;
  borderColor: string;
  opacity: number;
}

export interface ZoneVisualization {
  rectangles: ZoneRectangle[];
  labels: ZoneLabel[];
  freshZones: PriceZone[];
  mitigatedZones: PriceZone[];
}

export interface ZoneLabel {
  time: number;
  price: number;
  text: string;
  color: string;
  position: 'top' | 'bottom';
}

// Colors
export const ZONE_COLORS = {
  demand: {
    fresh: {
      fill: 'rgba(16, 185, 129, 0.2)',      // emerald-500 with 0.2 opacity
      border: 'rgba(16, 185, 129, 0.6)',
      text: '#10b981',
    },
    tested: {
      fill: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.4)',
      text: '#10b981',
    },
    mitigated: {
      fill: 'rgba(16, 185, 129, 0.05)',
      border: 'rgba(16, 185, 129, 0.2)',
      text: '#6b7280',
    },
  },
  supply: {
    fresh: {
      fill: 'rgba(244, 63, 94, 0.2)',       // rose-500 with 0.2 opacity
      border: 'rgba(244, 63, 94, 0.6)',
      text: '#f43f5e',
    },
    tested: {
      fill: 'rgba(244, 63, 94, 0.1)',
      border: 'rgba(244, 63, 94, 0.4)',
      text: '#f43f5e',
    },
    mitigated: {
      fill: 'rgba(244, 63, 94, 0.05)',
      border: 'rgba(244, 63, 94, 0.2)',
      text: '#6b7280',
    },
  },
};
