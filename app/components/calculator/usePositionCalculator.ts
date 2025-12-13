'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  AccountSettings,
  TradeSettings,
  PositionSizeResult,
} from './types';
import {
  calculatePositionSize,
  getRiskLevel,
  calculateRiskReward,
  calculatePotentialProfit,
} from './positionCalculator';

interface UsePositionCalculatorProps {
  initialSymbol?: string;
}

interface CalculatorState {
  account: AccountSettings;
  trade: TradeSettings;
}

export function usePositionCalculator({ initialSymbol = 'BTCUSDT' }: UsePositionCalculatorProps = {}) {
  const [state, setState] = useState<CalculatorState>({
    account: {
      balance: 10000,
      currency: 'USD',
      leverage: 100,
      accountType: 'standard',
    },
    trade: {
      symbol: initialSymbol,
      riskPercent: 1,
      stopLossPips: 50,
      entryPrice: 0,
      stopLossPrice: undefined,
      takeProfitPips: 100,
    },
  });

  // Update account settings
  const updateAccount = useCallback((updates: Partial<AccountSettings>) => {
    setState(prev => ({
      ...prev,
      account: { ...prev.account, ...updates },
    }));
  }, []);

  // Update trade settings
  const updateTrade = useCallback((updates: Partial<TradeSettings>) => {
    setState(prev => ({
      ...prev,
      trade: { ...prev.trade, ...updates },
    }));
  }, []);

  // Calculate position size
  const result: PositionSizeResult = useMemo(() => {
    return calculatePositionSize(state.account, state.trade);
  }, [state.account, state.trade]);

  // Get risk level
  const riskLevel = useMemo(() => {
    return getRiskLevel(state.trade.riskPercent);
  }, [state.trade.riskPercent]);

  // Calculate risk-reward ratio
  const riskReward = useMemo(() => {
    const slPips = state.trade.stopLossPips || 0;
    const tpPips = state.trade.takeProfitPips || 0;
    return calculateRiskReward(slPips, tpPips);
  }, [state.trade.stopLossPips, state.trade.takeProfitPips]);

  // Calculate potential profit
  const potentialProfit = useMemo(() => {
    const tpPips = state.trade.takeProfitPips || 0;
    return calculatePotentialProfit(result.lotSize, tpPips, result.pipValue);
  }, [result.lotSize, result.pipValue, state.trade.takeProfitPips]);

  // Reset to defaults
  const reset = useCallback(() => {
    setState({
      account: {
        balance: 10000,
        currency: 'USD',
        leverage: 100,
        accountType: 'standard',
      },
      trade: {
        symbol: initialSymbol,
        riskPercent: 1,
        stopLossPips: 50,
        entryPrice: 0,
        stopLossPrice: undefined,
        takeProfitPips: 100,
      },
    });
  }, [initialSymbol]);

  // Preset risk profiles
  const applyPreset = useCallback((preset: 'conservative' | 'moderate' | 'aggressive') => {
    const presets = {
      conservative: { riskPercent: 0.5, leverage: 50 },
      moderate: { riskPercent: 1, leverage: 100 },
      aggressive: { riskPercent: 2, leverage: 200 },
    };
    
    const settings = presets[preset];
    setState(prev => ({
      ...prev,
      account: { ...prev.account, leverage: settings.leverage },
      trade: { ...prev.trade, riskPercent: settings.riskPercent },
    }));
  }, []);

  return {
    // State
    account: state.account,
    trade: state.trade,
    
    // Calculated values
    result,
    riskLevel,
    riskReward,
    potentialProfit,
    
    // Actions
    updateAccount,
    updateTrade,
    reset,
    applyPreset,
  };
}
