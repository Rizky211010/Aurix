'use client';

import React, { useState, useEffect } from 'react';
import { SignalAnalysis, AnalysisStep, STATUS_COLORS, STEP_ICONS } from './analysisTypes';
import { generateSignalAnalysis, getEducationalNotes } from './signalAnalysisGenerator';

interface WhyThisSignalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  signalData?: {
    direction: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    currentPrice: number;
    trend: { h4: string; h1: string; m15: string };
    support?: number;
    resistance?: number;
    atr?: number;
    rsi?: number;
    candlePattern?: string;
    volumeConfirm?: boolean;
  };
}

// ============================================
// Visual Components
// ============================================

// Animated Flow Diagram
function AnalysisFlowDiagram({ steps, signal }: { steps: AnalysisStep[]; signal: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const signalColor = signal === 'BUY' ? '#10b981' : signal === 'SELL' ? '#ef4444' : '#6b7280';
  
  return (
    <div className="relative py-6">
      {/* Flow connection line */}
      <svg className="absolute left-6 top-0 bottom-0 w-1" style={{ height: '100%' }}>
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={signalColor} stopOpacity="0.2" />
            <stop offset="50%" stopColor={signalColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={signalColor} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="4" height="100%" fill="url(#flowGradient)" rx="2" />
      </svg>
      
      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <StepCard key={step.id} step={step} index={index} isLast={index === steps.length - 1} />
        ))}
      </div>
    </div>
  );
}

// Individual Step Card
function StepCard({ step, index, isLast }: { step: AnalysisStep; index: number; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(index < 3); // First 3 expanded by default
  const colors = STATUS_COLORS[step.status];
  const icon = step.icon ? STEP_ICONS[step.icon] : '📍';

  return (
    <div className="relative pl-12">
      {/* Step indicator */}
      <div 
        className={`absolute left-3 w-7 h-7 rounded-full flex items-center justify-center text-sm
          ${colors.bg} ${colors.border} border-2 z-10`}
      >
        <span>{icon}</span>
      </div>

      {/* Card */}
      <div 
        className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden transition-all duration-300`}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono ${colors.text}`}>STEP {step.id}</span>
            <h4 className="font-medium text-white text-left">{step.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            {step.value && (
              <span className={`text-xs font-mono ${colors.text}`}>{step.value}</span>
            )}
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-white/5">
            <p className="text-gray-300 text-sm leading-relaxed pt-3">
              {step.description}
            </p>
            
            {step.details && step.details.length > 0 && (
              <div className="space-y-1.5 bg-black/20 rounded-lg p-3">
                {step.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-gray-600 mt-0.5">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connector arrow (except for last) */}
      {!isLast && (
        <div className="absolute left-[22px] -bottom-3 text-gray-600">
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0v8M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Trade Setup Visual
function TradeSetupVisual({ 
  entry, 
  stopLoss, 
  takeProfits 
}: { 
  entry: number; 
  stopLoss: number; 
  takeProfits: number[];
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}) {
  const range = Math.max(...takeProfits, entry, stopLoss) - Math.min(...takeProfits, entry, stopLoss);
  const minPrice = Math.min(...takeProfits, entry, stopLoss);
  
  const getPosition = (price: number) => {
    return ((price - minPrice) / range) * 100;
  };

  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
      <h4 className="text-sm font-medium text-gray-400 mb-4">📐 Visualisasi Trade Setup</h4>
      
      <div className="relative h-48 flex">
        {/* Price scale */}
        <div className="w-24 flex flex-col justify-between text-right pr-3 text-xs font-mono">
          {takeProfits.slice().reverse().map((tp, i) => (
            <span key={`tp${i}`} className="text-emerald-400">
              TP{takeProfits.length - i}: {tp.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          ))}
          <span className="text-blue-400 font-bold">
            Entry: {entry.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span className="text-red-400">
            SL: {stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Visual bars */}
        <div className="flex-1 relative">
          {/* Background zones */}
          <div className="absolute inset-0 flex flex-col">
            {/* TP Zone */}
            <div 
              className="bg-emerald-500/10 border-l-2 border-emerald-500"
              style={{ height: `${100 - getPosition(entry)}%` }}
            />
            {/* Risk Zone */}
            <div 
              className="bg-red-500/10 border-l-2 border-red-500"
              style={{ height: `${getPosition(entry)}%` }}
            />
          </div>

          {/* Entry line */}
          <div 
            className="absolute left-0 right-0 h-0.5 bg-blue-500"
            style={{ bottom: `${getPosition(entry)}%` }}
          >
            <div className="absolute right-0 -top-2 px-2 py-0.5 bg-blue-500 rounded text-[10px] text-white font-medium">
              ENTRY
            </div>
          </div>

          {/* Stop Loss line */}
          <div 
            className="absolute left-0 right-0 h-0.5 bg-red-500 border-dashed"
            style={{ bottom: `${getPosition(stopLoss)}%` }}
          >
            <div className="absolute right-0 -top-2 px-2 py-0.5 bg-red-500 rounded text-[10px] text-white font-medium">
              STOP LOSS
            </div>
          </div>

          {/* TP lines */}
          {takeProfits.map((tp, i) => (
            <div 
              key={i}
              className="absolute left-0 right-0 h-0.5 bg-emerald-500"
              style={{ bottom: `${getPosition(tp)}%`, opacity: 1 - i * 0.2 }}
            >
              <div className="absolute left-0 -top-2 px-2 py-0.5 bg-emerald-500 rounded text-[10px] text-white font-medium">
                TP{i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk/Reward info */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="bg-red-500/10 rounded-lg p-2">
          <div className="text-red-400 text-lg font-bold font-mono">
            {Math.abs(entry - stopLoss).toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 uppercase">Risk</div>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-2">
          <div className="text-emerald-400 text-lg font-bold font-mono">
            {Math.abs(takeProfits[0] - entry).toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 uppercase">Reward (TP1)</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-2">
          <div className="text-blue-400 text-lg font-bold font-mono">
            1:{(Math.abs(takeProfits[0] - entry) / Math.abs(entry - stopLoss)).toFixed(1)}
          </div>
          <div className="text-[10px] text-gray-500 uppercase">R:R Ratio</div>
        </div>
      </div>
    </div>
  );
}

// Confidence Meter
function ConfidenceMeter({ confidence, signal }: { confidence: number; signal: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const color = signal === 'BUY' ? 'emerald' : signal === 'SELL' ? 'red' : 'gray';
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-${color}-500 transition-all duration-1000 ease-out`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className={`font-mono text-sm font-bold text-${color}-400`}>{confidence}%</span>
    </div>
  );
}

// Educational Tips Section
function EducationalTips() {
  const notes = getEducationalNotes();
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
        <span>💡</span> Tips Edukasi
      </h4>
      <div className="space-y-2">
        {notes.map((note, i) => (
          <div 
            key={i}
            className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
          >
            <h5 className="text-sm font-medium text-white mb-1">{note.title}</h5>
            <p className="text-xs text-gray-400 leading-relaxed">{note.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Drawer Component
// ============================================

export default function WhyThisSignalDrawer({
  isOpen,
  onClose,
  signalData,
}: WhyThisSignalDrawerProps) {
  const [analysis, setAnalysis] = useState<SignalAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'setup' | 'education'>('analysis');

  // Generate analysis when signal data changes
  useEffect(() => {
    if (signalData) {
      const generated = generateSignalAnalysis(signalData);
      setAnalysis(generated);
    }
  }, [signalData]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`
          fixed top-0 right-0 h-full w-full max-w-lg bg-gray-900 border-l border-gray-800
          shadow-2xl z-50 transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                ${analysis?.signal === 'BUY' ? 'bg-emerald-500/20' : 
                  analysis?.signal === 'SELL' ? 'bg-red-500/20' : 'bg-gray-500/20'}
              `}>
                <span className="text-2xl">
                  {analysis?.signal === 'BUY' ? '📈' : analysis?.signal === 'SELL' ? '📉' : '➡️'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Why This Signal?</h2>
                <p className="text-xs text-gray-500">Analisis langkah demi langkah</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Signal Summary */}
          {analysis && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`
                  px-3 py-1 rounded-full text-sm font-bold
                  ${analysis.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                    analysis.signal === 'SELL' ? 'bg-red-500/20 text-red-400' : 
                    'bg-gray-500/20 text-gray-400'}
                `}>
                  {analysis.signal}
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-400">{analysis.timeframe} Timeframe</span>
              </div>
              <ConfidenceMeter confidence={analysis.confidence} signal={analysis.signal} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-800/50 rounded-lg p-1">
            {[
              { id: 'analysis', label: '📊 Analisis', icon: '📊' },
              { id: 'setup', label: '🎯 Setup', icon: '🎯' },
              { id: 'education', label: '📚 Edukasi', icon: '📚' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors
                  ${activeTab === tab.id 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-white'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-220px)] px-6 py-4">
          {analysis && (
            <>
              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">📝 Ringkasan</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Step by Step Analysis */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">🔍 Analisis Detail</h4>
                    <AnalysisFlowDiagram steps={analysis.steps} signal={analysis.signal} />
                  </div>
                </div>
              )}

              {activeTab === 'setup' && (
                <div className="space-y-4">
                  <TradeSetupVisual
                    entry={analysis.keyLevels.entry}
                    stopLoss={analysis.keyLevels.stopLoss}
                    takeProfits={analysis.keyLevels.takeProfit}
                    signal={analysis.signal}
                  />

                  {/* Key Levels Table */}
                  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">📍 Level Kunci</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <span className="text-sm text-gray-400">Entry Price</span>
                        <span className="font-mono text-blue-400">
                          {analysis.keyLevels.entry.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <span className="text-sm text-gray-400">Stop Loss</span>
                        <span className="font-mono text-red-400">
                          {analysis.keyLevels.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {analysis.keyLevels.takeProfit.map((tp, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-0">
                          <span className="text-sm text-gray-400">Take Profit {i + 1}</span>
                          <span className="font-mono text-emerald-400">
                            {tp.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Warning */}
                  <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h4 className="text-sm font-medium text-amber-400 mb-1">Peringatan Risiko</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Trading memiliki risiko tinggi. Analisis ini bukan rekomendasi finansial. 
                          Selalu gunakan risk management yang tepat dan jangan invest lebih dari 
                          yang Anda sanggup untuk kehilangan.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'education' && (
                <div className="space-y-4">
                  <EducationalTips />
                  
                  {/* Learning Resources */}
                  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">📖 Pelajari Lebih Lanjut</h4>
                    <div className="space-y-2">
                      {[
                        { title: 'Cara Membaca Candlestick', icon: '🕯️' },
                        { title: 'Support & Resistance Basics', icon: '📊' },
                        { title: 'Risk Management 101', icon: '🛡️' },
                        { title: 'Multi-Timeframe Analysis', icon: '⏰' },
                      ].map((item, i) => (
                        <button
                          key={i}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-left"
                        >
                          <span>{item.icon}</span>
                          <span className="text-sm text-gray-300">{item.title}</span>
                          <svg className="w-4 h-4 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Terakhir diperbarui: {analysis ? new Date(analysis.timestamp).toLocaleTimeString() : '-'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Live Analysis
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
