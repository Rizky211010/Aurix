import {
  PriceZone,
  ZoneVisualization,
  ZoneRectangle,
  ZoneLabel,
  ZONE_COLORS,
  ZoneDetectionConfig,
  DEFAULT_ZONE_CONFIG,
} from './types';

/**
 * Generate rectangle data for zone visualization
 */
export function generateZoneRectangles(
  zones: PriceZone[],
  currentTime: number,
  config: ZoneDetectionConfig = DEFAULT_ZONE_CONFIG
): ZoneRectangle[] {
  return zones.map(zone => {
    const colors = ZONE_COLORS[zone.type][zone.status];
    
    // Calculate end time - extend to current or use mitigated time
    const endTime = zone.status === 'mitigated' && zone.mitigatedAt
      ? zone.mitigatedAt
      : currentTime + (config.zoneExtensionBars * 3600); // Extend into future
    
    return {
      id: zone.id,
      type: zone.type,
      status: zone.status,
      top: zone.top,
      bottom: zone.bottom,
      startTime: zone.startTime,
      endTime,
      color: colors.fill,
      borderColor: colors.border,
      opacity: zone.status === 'fresh' ? 0.2 : zone.status === 'tested' ? 0.1 : 0.05,
    };
  });
}

/**
 * Generate labels for zones
 */
export function generateZoneLabels(zones: PriceZone[]): ZoneLabel[] {
  return zones.map(zone => {
    const colors = ZONE_COLORS[zone.type][zone.status];
    const strengthLabel = zone.strength.charAt(0).toUpperCase() + zone.strength.slice(1);
    
    let statusEmoji = '';
    if (zone.status === 'fresh') statusEmoji = '🔥';
    else if (zone.status === 'tested') statusEmoji = '👆';
    else statusEmoji = '❌';
    
    const text = `${zone.type === 'demand' ? 'D' : 'S'} ${statusEmoji} ${strengthLabel}`;
    
    return {
      time: zone.startTime,
      price: zone.type === 'demand' ? zone.bottom : zone.top,
      text,
      color: colors.text,
      position: zone.type === 'demand' ? 'bottom' : 'top',
    };
  });
}

/**
 * Generate complete visualization data
 */
export function generateZoneVisualization(
  zones: PriceZone[],
  currentTime: number,
  config: ZoneDetectionConfig = DEFAULT_ZONE_CONFIG
): ZoneVisualization {
  const rectangles = generateZoneRectangles(zones, currentTime, config);
  const labels = generateZoneLabels(zones);
  
  const freshZones = zones.filter(z => z.status === 'fresh');
  const mitigatedZones = zones.filter(z => z.status === 'mitigated');
  
  return {
    rectangles,
    labels,
    freshZones,
    mitigatedZones,
  };
}

/**
 * Convert zone to lightweight-charts box annotation format
 * Note: This creates data for primitive rectangles
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toChartBoxes(rectangles: ZoneRectangle[]): any[] {
  return rectangles.map(rect => ({
    id: rect.id,
    lowPrice: rect.bottom,
    highPrice: rect.top,
    startTime: rect.startTime,
    endTime: rect.endTime,
    fillColor: rect.color,
    borderColor: rect.borderColor,
    borderWidth: 1,
    borderStyle: rect.status === 'mitigated' ? 2 : 0, // Dashed if mitigated
  }));
}

/**
 * Get zone summary text
 */
export function getZoneSummary(zones: PriceZone[]): string {
  const fresh = zones.filter(z => z.status === 'fresh');
  const tested = zones.filter(z => z.status === 'tested');
  const demand = zones.filter(z => z.type === 'demand' && z.status !== 'mitigated');
  const supply = zones.filter(z => z.type === 'supply' && z.status !== 'mitigated');
  
  return `Active: ${zones.length - zones.filter(z => z.status === 'mitigated').length} | ` +
         `Fresh: ${fresh.length} | Tested: ${tested.length} | ` +
         `Demand: ${demand.length} | Supply: ${supply.length}`;
}

/**
 * Calculate zone statistics
 */
export function getZoneStats(zones: PriceZone[]): {
  totalZones: number;
  freshZones: number;
  testedZones: number;
  mitigatedZones: number;
  demandZones: number;
  supplyZones: number;
  avgStrength: number;
} {
  const strengthValues = {
    weak: 1,
    moderate: 2,
    strong: 3,
    extreme: 4,
  };
  
  const activeZones = zones.filter(z => z.status !== 'mitigated');
  const avgStrength = activeZones.length > 0
    ? activeZones.reduce((sum, z) => sum + strengthValues[z.strength], 0) / activeZones.length
    : 0;
  
  return {
    totalZones: zones.length,
    freshZones: zones.filter(z => z.status === 'fresh').length,
    testedZones: zones.filter(z => z.status === 'tested').length,
    mitigatedZones: zones.filter(z => z.status === 'mitigated').length,
    demandZones: zones.filter(z => z.type === 'demand' && z.status !== 'mitigated').length,
    supplyZones: zones.filter(z => z.type === 'supply' && z.status !== 'mitigated').length,
    avgStrength,
  };
}
