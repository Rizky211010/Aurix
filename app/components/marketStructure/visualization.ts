import {
  MarketStructure,
  MarketStructureVisualization,
  StructureMarker,
  StructureLine,
  SwingPoint,
  StructureBreak,
} from './types';

// Colors for visualization
const COLORS = {
  swingHigh: '#ef4444',      // red-500
  swingLow: '#22c55e',       // green-500
  bos: '#3b82f6',            // blue-500
  choch: '#f59e0b',          // amber-500
  hh: '#10b981',             // emerald-500
  hl: '#14b8a6',             // teal-500
  lh: '#f97316',             // orange-500
  ll: '#ef4444',             // red-500
  bullishZone: 'rgba(34, 197, 94, 0.1)',
  bearishZone: 'rgba(239, 68, 68, 0.1)',
};

/**
 * Generate markers untuk swing points (HH, HL, LH, LL)
 */
export function generateSwingMarkers(swingPoints: SwingPoint[]): StructureMarker[] {
  return swingPoints
    .filter(point => point.swingType)
    .map(point => {
      const isHigh = point.type === 'high';
      let color = isHigh ? COLORS.swingHigh : COLORS.swingLow;
      
      // Color based on swing type
      switch (point.swingType) {
        case 'HH':
          color = COLORS.hh;
          break;
        case 'HL':
          color = COLORS.hl;
          break;
        case 'LH':
          color = COLORS.lh;
          break;
        case 'LL':
          color = COLORS.ll;
          break;
      }

      return {
        time: point.time,
        position: isHigh ? 'aboveBar' : 'belowBar',
        color,
        shape: 'circle',
        text: point.swingType || '',
        size: 1,
      } as StructureMarker;
    });
}

/**
 * Generate markers untuk BOS dan CHOCH
 */
export function generateStructureMarkers(breaks: StructureBreak[]): {
  bosMarkers: StructureMarker[];
  chochMarkers: StructureMarker[];
} {
  const bosMarkers: StructureMarker[] = [];
  const chochMarkers: StructureMarker[] = [];

  for (const brk of breaks) {
    const marker: StructureMarker = {
      time: brk.time,
      position: brk.direction === 'bullish' ? 'belowBar' : 'aboveBar',
      color: brk.type === 'BOS' ? COLORS.bos : COLORS.choch,
      shape: brk.direction === 'bullish' ? 'arrowUp' : 'arrowDown',
      text: `${brk.type}`,
      size: 2,
    };

    if (brk.type === 'BOS') {
      bosMarkers.push(marker);
    } else {
      chochMarkers.push(marker);
    }
  }

  return { bosMarkers, chochMarkers };
}

/**
 * Generate horizontal lines dari swing highs
 */
export function generateSwingHighLines(swingPoints: SwingPoint[]): StructureLine[][] {
  const lines: StructureLine[][] = [];
  const highs = swingPoints.filter(p => p.type === 'high');

  for (let i = 0; i < highs.length; i++) {
    const current = highs[i];
    const next = highs[i + 1];
    
    // Line extends to next swing high or a fixed extension
    const endTime = next ? next.time : current.time + 50 * 3600; // 50 hours extension
    
    lines.push([
      { time: current.time, value: current.price },
      { time: endTime, value: current.price },
    ]);
  }

  return lines;
}

/**
 * Generate horizontal lines dari swing lows
 */
export function generateSwingLowLines(swingPoints: SwingPoint[]): StructureLine[][] {
  const lines: StructureLine[][] = [];
  const lows = swingPoints.filter(p => p.type === 'low');

  for (let i = 0; i < lows.length; i++) {
    const current = lows[i];
    const next = lows[i + 1];
    
    // Line extends to next swing low or a fixed extension
    const endTime = next ? next.time : current.time + 50 * 3600; // 50 hours extension
    
    lines.push([
      { time: current.time, value: current.price },
      { time: endTime, value: current.price },
    ]);
  }

  return lines;
}

/**
 * Generate complete visualization data dari market structure
 */
export function generateVisualization(
  structure: MarketStructure
): MarketStructureVisualization {
  const swingMarkers = generateSwingMarkers(structure.swingPoints);
  const { bosMarkers, chochMarkers } = generateStructureMarkers(structure.structureBreaks);
  const swingHighLines = generateSwingHighLines(structure.swingPoints);
  const swingLowLines = generateSwingLowLines(structure.swingPoints);

  // Generate trend zones
  const trendZones: MarketStructureVisualization['trendZones'] = [];
  let currentTrend = structure.currentTrend;
  let zoneStart = structure.swingPoints[0]?.time || 0;

  for (const brk of structure.structureBreaks) {
    if (brk.type === 'CHOCH') {
      // End current zone
      trendZones.push({
        startTime: zoneStart,
        endTime: brk.time,
        trend: currentTrend,
      });
      
      // Start new zone with opposite trend
      currentTrend = brk.direction === 'bullish' ? 'bullish' : 'bearish';
      zoneStart = brk.time;
    }
  }

  // Add final zone
  if (structure.swingPoints.length > 0) {
    const lastTime = structure.swingPoints[structure.swingPoints.length - 1].time;
    trendZones.push({
      startTime: zoneStart,
      endTime: lastTime + 50 * 3600,
      trend: currentTrend,
    });
  }

  return {
    swingHighLines,
    swingLowLines,
    bosMarkers,
    chochMarkers,
    swingMarkers,
    trendZones,
  };
}

/**
 * Convert markers ke format lightweight-charts SeriesMarker
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toLightweightChartMarkers(markers: StructureMarker[]): any[] {
  return markers.map(m => ({
    time: m.time, // UTCTimestamp
    position: m.position,
    color: m.color,
    shape: m.shape,
    text: m.text,
    size: m.size || 1,
  }));
}

/**
 * Get summary text untuk current market structure
 */
export function getStructureSummary(structure: MarketStructure): string {
  const parts: string[] = [];

  // Trend
  parts.push(`Trend: ${structure.currentTrend.toUpperCase()}`);

  // Recent structure
  if (structure.lastHH) {
    parts.push(`Last HH: ${structure.lastHH.price.toFixed(2)}`);
  }
  if (structure.lastHL) {
    parts.push(`Last HL: ${structure.lastHL.price.toFixed(2)}`);
  }
  if (structure.lastLH) {
    parts.push(`Last LH: ${structure.lastLH.price.toFixed(2)}`);
  }
  if (structure.lastLL) {
    parts.push(`Last LL: ${structure.lastLL.price.toFixed(2)}`);
  }

  // Recent breaks
  const recentBreaks = structure.structureBreaks.slice(-3);
  if (recentBreaks.length > 0) {
    const breakTexts = recentBreaks.map(b => 
      `${b.type} ${b.direction} @ ${b.price.toFixed(2)}`
    );
    parts.push(`Recent: ${breakTexts.join(', ')}`);
  }

  return parts.join(' | ');
}
