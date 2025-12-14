'use client';

import React, { useState } from 'react';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import BottomSheet from './BottomSheet';
import MobileBotControl from './MobileBotControl';
import MobileMarketSentiment from './MobileMarketSentiment';
import MobileSignalCard from './MobileSignalCard';
import MobileSettings from './MobileSettings';

type ActivePanel = 'chart' | 'signals' | 'bot' | 'settings' | null;

interface MobileLayoutProps {
  children: React.ReactNode;
  symbol: string;
  price: number;
  priceDirection: 'up' | 'down' | 'neutral';
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  onSymbolChange: (symbol: string) => void;
  // Bot props
  botStatus?: 'running' | 'stopped' | 'error';
  botMode?: 'dry-run' | 'live';
  onBotStart?: () => void;
  onBotStop?: () => void;
  onBotModeChange?: (mode: 'dry-run' | 'live') => void;
  aiEnabled?: boolean;
  onAiToggle?: (enabled: boolean) => void;
  // Signal props
  signal?: {
    type: 'BUY' | 'SELL' | 'HOLD';
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2?: number;
    confidence: number;
    reason: string;
    riskReward: number;
  } | null;
  // Market Sentiment props
  sentimentData?: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    fearGreed: number;
    volume: 'INCREASING' | 'DECREASING' | 'STABLE';
    whales: 'BUYING' | 'SELLING' | 'NEUTRAL';
    shortTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
    midTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
    longTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
  };
}

export default function MobileLayout({
  children,
  symbol,
  price,
  priceDirection,
  timeframe,
  onTimeframeChange,
  onSymbolChange,
  botStatus = 'stopped',
  botMode = 'dry-run',
  onBotStart = () => {},
  onBotStop = () => {},
  onBotModeChange = () => {},
  aiEnabled = true,
  onAiToggle = () => {},
  signal = null,
  sentimentData = {
    sentiment: 'NEUTRAL',
    confidence: 50,
    fearGreed: 50,
    volume: 'STABLE',
    whales: 'NEUTRAL',
    shortTerm: 'SIDEWAYS',
    midTerm: 'SIDEWAYS',
    longTerm: 'SIDEWAYS'
  }
}: MobileLayoutProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [sheetHeight, setSheetHeight] = useState<'collapsed' | 'half' | 'full'>('collapsed');

  const handleNavClick = (panel: ActivePanel) => {
    if (panel === 'chart') {
      setActivePanel(null);
      setSheetHeight('collapsed');
    } else if (activePanel === panel) {
      // Toggle between half and collapsed
      setSheetHeight(sheetHeight === 'collapsed' ? 'half' : 'collapsed');
      if (sheetHeight !== 'collapsed') {
        setActivePanel(null);
      }
    } else {
      setActivePanel(panel);
      setSheetHeight('half');
    }
  };

  const getPanelContent = () => {
    switch (activePanel) {
      case 'bot':
        return (
          <MobileBotControl
            status={botStatus}
            mode={botMode}
            onStart={onBotStart}
            onStop={onBotStop}
            onModeChange={onBotModeChange}
            aiEnabled={aiEnabled}
            onAiToggle={onAiToggle}
          />
        );
      case 'signals':
        return (
          <div className="space-y-4">
            <MobileSignalCard signal={signal} symbol={symbol} />
            <MobileMarketSentiment data={sentimentData} />
          </div>
        );
      case 'settings':
        return <MobileSettings />;
      default:
        return null;
    }
  };

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'bot':
        return '🤖 Bot Control';
      case 'signals':
        return '⚡ Signals & Analysis';
      case 'settings':
        return '⚙️ Settings';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] md:hidden overflow-hidden">
      {/* Fixed Header */}
      <MobileHeader
        symbol={symbol}
        price={price}
        priceDirection={priceDirection}
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        onSymbolChange={onSymbolChange}
      />

      {/* Chart Area - Takes remaining space */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Sheet for Panels */}
      <BottomSheet
        isOpen={activePanel !== null && sheetHeight !== 'collapsed'}
        height={sheetHeight}
        onHeightChange={setSheetHeight}
        onClose={() => {
          setActivePanel(null);
          setSheetHeight('collapsed');
        }}
        title={getPanelTitle()}
      >
        {getPanelContent()}
      </BottomSheet>

      {/* Fixed Bottom Navigation */}
      <MobileNav
        activeTab={activePanel || 'chart'}
        onTabChange={handleNavClick}
      />
    </div>
  );
}
