import {
  AccountSettings,
  TradeSettings,
  PositionSizeResult,
  PositionWarning,
  LOT_MULTIPLIERS,
  PIP_VALUES,
} from './types';

/**
 * Get pip value for a symbol
 */
export function getPipValue(symbol: string, accountType: 'standard' | 'mini' | 'micro' = 'standard'): number {
  const basePipValue = PIP_VALUES[symbol.toUpperCase()] || PIP_VALUES['DEFAULT'];
  const multiplier = LOT_MULTIPLIERS[accountType] / LOT_MULTIPLIERS['standard'];
  return basePipValue * multiplier;
}

/**
 * Calculate position size based on risk parameters
 */
export function calculatePositionSize(
  account: AccountSettings,
  trade: TradeSettings
): PositionSizeResult {
  const warnings: PositionWarning[] = [];
  
  // Calculate risk amount in account currency
  const riskAmount = account.balance * (trade.riskPercent / 100);
  
  // Get pip value for the symbol
  const pipValuePerLot = getPipValue(trade.symbol, account.accountType);
  
  // Calculate lot size based on risk
  // Formula: Lot Size = Risk Amount / (Stop Loss Pips × Pip Value per Lot)
  const stopLossPips = trade.stopLossPips || calculatePipsFromPrice(trade);
  
  if (stopLossPips <= 0) {
    return {
      lotSize: 0,
      units: 0,
      riskAmount,
      marginRequired: 0,
      pipValue: pipValuePerLot,
      maxLotSize: 0,
      isOverLeveraged: false,
      leverageUsed: 0,
      warnings: [{ type: 'danger', message: 'Stop loss pips must be greater than 0' }],
    };
  }
  
  const lotSize = riskAmount / (stopLossPips * pipValuePerLot);
  
  // Calculate units based on account type
  const lotMultiplier = LOT_MULTIPLIERS[account.accountType];
  const units = lotSize * lotMultiplier;
  
  // Calculate margin required
  // Margin = (Units × Price) / Leverage
  const price = trade.entryPrice || 1; // Default to 1 if no entry price
  const marginRequired = (units * price) / account.leverage;
  
  // Calculate max lot size based on available margin
  const maxUnits = (account.balance * account.leverage) / price;
  const maxLotSize = maxUnits / lotMultiplier;
  
  // Calculate actual leverage used
  const positionValue = units * price;
  const leverageUsed = positionValue / account.balance;
  
  // Check if over-leveraged
  const isOverLeveraged = lotSize > maxLotSize;
  
  // Generate warnings
  if (isOverLeveraged) {
    warnings.push({
      type: 'danger',
      message: `Lot size melebihi maksimum (${maxLotSize.toFixed(2)} lots) berdasarkan leverage ${account.leverage}:1`,
    });
  }
  
  if (trade.riskPercent > 5) {
    warnings.push({
      type: 'danger',
      message: 'Risiko >5% per trade sangat berbahaya! Disarankan maksimal 1-2%.',
    });
  } else if (trade.riskPercent > 2) {
    warnings.push({
      type: 'warning',
      message: 'Risiko >2% termasuk agresif. Pertimbangkan menurunkan risiko.',
    });
  }
  
  if (marginRequired > account.balance * 0.5) {
    warnings.push({
      type: 'warning',
      message: 'Margin yang dibutuhkan >50% balance. Pertimbangkan lot lebih kecil.',
    });
  }
  
  if (stopLossPips < 5) {
    warnings.push({
      type: 'info',
      message: 'Stop loss sangat ketat. Pastikan spread tidak memicu SL prematur.',
    });
  }
  
  return {
    lotSize: Math.round(lotSize * 100) / 100,
    units: Math.round(units),
    riskAmount: Math.round(riskAmount * 100) / 100,
    marginRequired: Math.round(marginRequired * 100) / 100,
    pipValue: pipValuePerLot,
    maxLotSize: Math.round(maxLotSize * 100) / 100,
    isOverLeveraged,
    leverageUsed: Math.round(leverageUsed * 10) / 10,
    warnings,
  };
}

/**
 * Calculate pips from entry and stop loss price
 */
function calculatePipsFromPrice(trade: TradeSettings): number {
  if (!trade.entryPrice || !trade.stopLossPrice) {
    return trade.stopLossPips || 0;
  }
  
  const priceDiff = Math.abs(trade.entryPrice - trade.stopLossPrice);
  
  // Determine pip size based on symbol
  const symbol = trade.symbol.toUpperCase();
  let pipSize = 0.0001; // Default for most pairs
  
  if (symbol.includes('JPY')) {
    pipSize = 0.01;
  } else if (symbol.includes('XAU')) {
    pipSize = 0.1; // Gold: 0.1 = 1 pip ($0.10 per pip per 0.01 lot)
  } else if (symbol.includes('XAG')) {
    pipSize = 0.01; // Silver: 0.01 = 1 pip
  } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
    pipSize = 1; // $1 = 1 pip for crypto
  }
  
  return priceDiff / pipSize;
}

/**
 * Get risk level classification
 */
export function getRiskLevel(riskPercent: number): {
  label: string;
  color: string;
  description: string;
} {
  if (riskPercent <= 1) {
    return {
      label: 'Conservative',
      color: 'emerald',
      description: 'Risiko rendah, cocok untuk trader pemula atau strategi jangka panjang.',
    };
  } else if (riskPercent <= 2) {
    return {
      label: 'Moderate',
      color: 'blue',
      description: 'Risiko seimbang, umum digunakan trader berpengalaman.',
    };
  } else if (riskPercent <= 5) {
    return {
      label: 'Aggressive',
      color: 'amber',
      description: 'Risiko tinggi, hanya untuk trader dengan toleransi risiko tinggi.',
    };
  } else {
    return {
      label: 'Extreme',
      color: 'red',
      description: 'Sangat berbahaya! Berpotensi margin call dalam beberapa trade.',
    };
  }
}

/**
 * Format lot size for display
 */
export function formatLotSize(lots: number, accountType: 'standard' | 'mini' | 'micro'): string {
  const typeLabel = accountType === 'standard' ? '' : accountType === 'mini' ? ' mini' : ' micro';
  return `${lots.toFixed(2)}${typeLabel} lot${lots !== 1 ? 's' : ''}`;
}

/**
 * Calculate potential profit at take profit
 */
export function calculatePotentialProfit(
  lotSize: number,
  takeProfitPips: number,
  pipValue: number
): number {
  return lotSize * takeProfitPips * pipValue;
}

/**
 * Calculate risk-reward ratio
 */
export function calculateRiskReward(
  stopLossPips: number,
  takeProfitPips: number
): number {
  if (stopLossPips <= 0) return 0;
  return Math.round((takeProfitPips / stopLossPips) * 100) / 100;
}
