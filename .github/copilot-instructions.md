# Copilot Instructions - Forex Trading Dashboard

## Project Overview

This is a **Next.js + React + TypeScript** trading dashboard integrating real-time forex/crypto price data (Binance WebSocket), AI-powered technical analysis, and an optional Python trading bot backend.

**Key Architecture**: 
- **Frontend**: Next.js 15 (app router) + Tailwind CSS + lightweight-charts v5
- **Backend**: FastAPI Python bot (strategy engine, risk manager, trade executor)
- **Data Flow**: Binance WebSocket → Chart → Signal Analysis → Trading Levels
- **State Management**: React hooks (useWebSocket, useChartResize, custom hooks per module)

---

## File Structure & Responsibilities

### Core Chart System (`app/components/chart/`)
- **FullFeaturedChart.tsx** (1027 lines) - Main chart container with all overlays (market structure, supply/demand, candle patterns, trading levels). Integrates multiple analysis modules.
- **ChartComponent.tsx** - Lightweight base chart with WebSocket integration and historical data loading. Entry point for simple charts.
- **types.ts** - Type definitions (CandlestickData, Timeframe, CHART_COLORS) and professional color palette for clean UI.
- **ChartToolbar.tsx** - Timeframe selector and zoom controls.
- **TradingLevels.tsx** - Renders entry, SL, TP1, TP2 levels on chart.
- **hooks/useWebSocket.ts** - Binance REST API fallback + WebSocket polling logic. Handles both crypto (WebSocket) and forex (REST polling).
- **hooks/useChartResize.ts** - Window resize observer for responsive chart.

### Market Analysis Modules
- **supplyDemand/** - Zone detection (zoneDetector.ts), zone visualization, and colored zone rendering.
- **marketStructure/** - Swing High/Low detection, BOS/CHOCH line rendering.
- **candlePattern/** - Pattern recognition (inside bar, engulfing, etc.).
- **signal/** - Signal generation combining trend + zone + RRR validation. Smart signal card UI.

### Services (`app/services/`)
- **tradingApi.ts** - Centralized API client for bot endpoints (/api/bot/*). Used by bot dashboard.
- **websocketService.ts** - Generic WebSocket handler with reconnection logic (not currently used in chart; hooks handle Binance data).

### Bot Backend (`bot/`)
- **trading_bot.py** - Main bot loop controlling strategy, risk, execution.
- **strategy_engine.py** - EMA 200/9/21 filters, trend detection, entry signals.
- **risk_manager.py** - 1% risk per trade, auto lot size calculation.
- **trade_executor.py** - CCXT integration, dry-run mode, order execution.
- **bot_api.py** - FastAPI server exposing bot control endpoints.

---

## Critical Data Flows

### 1. Real-time Candlestick Update
```
Binance WebSocket/REST → useWebSocket hook → CandlestickData object 
→ ChartComponent.handleRealtimeData() → candlestickSeries.update() 
+ volumeSeries.update() → Visual update on screen
```
**Key Issue**: useWebSocket polls Binance REST API every 5 sec as fallback; should sync with timeframe close times.

### 2. Signal Generation Pipeline
```
Candle close → onRealtimeUpdate callback → Signal analysis (trend + zone + RRR) 
→ SmartSignal object → UI display with "Why This Signal" explanation
```
Signals validate:
- Trend alignment with H4 (candle direction matches 4h trend)
- Price in/near Supply/Demand zone
- RRR ≥ 2 (stop loss pips vs take profit pips)

### 3. Bot Control Flow
```
User clicks START in BotDashboard → tradingApi.post(/api/bot/start) 
→ Python bot_api.py receives → trading_bot.py loop starts 
→ Strategy generates signals → Risk manager validates → Trade executor places orders 
→ Updates broadcast back to dashboard via WebSocket
```

---

## Key Development Patterns & Conventions

### Component Composition Pattern
Each analysis module (supply/demand, market structure, etc.) follows:
```
├── use[Module].ts         // React hook managing state + logic
├── [Module]Panel.tsx      // UI panel for controls/display
├── [name]Detector.ts      // Core algorithm (stateless)
├── visualization.ts       // Canvas/chart rendering helpers
├── types.ts              // Module-specific types
└── index.ts              // Clean exports
```
Example: `supplyDemand/` exposes `useSupplyDemand` hook + `SupplyDemandPanel` component.

### WebSocket/Async Pattern
```typescript
// Example from useWebSocket.ts - try multiple endpoints with fallback
async function fetchKlines(symbol, interval, limit) {
  for (const baseUrl of BINANCE_ENDPOINTS) {
    try {
      // Try local proxy first, then Binance directly
      const response = await fetch(url);
      if (response.ok) return data;
    } catch (err) {
      // Continue to next endpoint
    }
  }
}
```
**Why**: Binance blocks browser requests; app can proxy via local /api/binance/ endpoint or fail gracefully.

### Chart Color Palette
Defined in `types.ts` as `CHART_COLORS` constant:
- **Bullish**: `#26A65B` (emerald, solid body; darker wick)
- **Bearish**: `#E85C5C` (soft red, no neon)
- **Grid**: Very subtle (`#21262D` for horizontal, `#161B22` for vertical)
- **Background**: `#0D1117` (dark, easy on eyes)

All colors have rationale: emerald > neon green, soft red > bright red, muted grid > bright.

### lightweight-charts v5 API
Using dynamic import pattern:
```typescript
const lwc = await import('lightweight-charts');
const { createChart, CandlestickSeries, HistogramSeries } = lwc;
```
**Never use v4 syntax** (e.g., `createCandlestickSeries()`); v5 uses `CandlestickSeries` class.

### Types are Explicit
- `CandlestickData`: `{ time: number, open: number, high: number, low: number, close: number, volume?: number }`
- `time` is **Unix timestamp in seconds** (not milliseconds)
- `Timeframe`: literal union `'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'`

### Forex vs Crypto Symbol Handling
```typescript
const isForexSymbol = (symbol: string): boolean => {
  return ['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY'].includes(symbol.toUpperCase());
};
// For forex: use REST polling (5 sec intervals)
// For crypto: use WebSocket stream
```

---

## Critical Warnings & Gotchas

1. **WebSocket Timestamps**: Binance sends open time in milliseconds; divide by 1000 before passing to chart.
   ```typescript
   time: Math.floor(item[0] / 1000)  // Convert ms to seconds
   ```

2. **Chart Updates Must Check `isChartReady`**: Calling methods on uninitialized series crashes silently.
   ```typescript
   if (candlestickSeriesRef.current && isChartReady) {
     candlestickSeriesRef.current.update(...);
   }
   ```

3. **Supply/Demand Zone Colors**: Zones have `type` (supply/demand) + `status` (active/broken). UI uses:
   ```typescript
   const colors = ZONE_COLORS[zone.type][zone.status];
   ```

4. **Signal Validity Score**: Ranges 0-100 based on trend + zone + RRR. Score < 50 = low confidence, highlight in UI differently.

5. **Binance API Rate Limits**: 1200 requests per minute. Polling every 5 sec = 720 requests/min (safe). Avoid sub-second updates.

6. **XAUUSD Special Case**: Gold Spot prices should come from commodity data source, not Binance crypto feed. Requires separate API integration.

---

## Build, Test, Debug Commands

### Development
```bash
npm run dev        # Start Next.js dev server (Turbopack, port 3000)
npm run build      # Build for production
npm run lint       # Run ESLint on TypeScript/JSX
```

### Python Bot Backend
```bash
cd bot
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python bot_api.py        # Start FastAPI server (port 8000)
```

### Common Debugging
- **Chart not updating?** Check console for `[useWebSocket]` logs; verify Binance endpoint is reachable.
- **Signal not generating?** Check if zone detection is working (SupplyDemandPanel shows zones) + trend is aligned.
- **Bot not responding?** Ensure bot_api.py is running on port 8000; check `.env.local` for correct `NEXT_PUBLIC_BOT_API_URL`.

---

## When Adding Features

1. **New overlay on chart?** Create module folder under `components/` following the pattern above. Export via `index.ts`.
2. **New API endpoint?** Add route in `app/api/[service]/[action]/route.ts`. Import in `tradingApi.ts`.
3. **New signal logic?** Modify `signalGenerator.ts` or `analysisTypes.ts`. Test with SupplyDemandPanel + signal hook.
4. **New timeframe or symbol?** Update `TIMEFRAMES` array in `types.ts`. Handle in `useWebSocket.ts` Binance mapping.

---

## Performance Considerations

- **Chart renders**: Lightweight-charts is optimized for 500+ candles without lag. Don't pre-load 10,000+.
- **Zone rendering**: Canvas-based; keep active zones < 50 (older zones fade).
- **Bot polling**: Every 5 sec is safe for crypto; forex may need 15-30 sec (less liquidity).
- **Signal generation**: Runs on each candle close; validation checks (trend, zone, RRR) are all O(n) or O(1).

---

## Common Next Steps

- **Realtime Gold (XAUUSD)**: Integrate a forex data provider (Oanda, FXCM) or commodity API (Alpha Vantage).
- **Bot Dashboard Polish**: Add position P&L meter, trade history table with filters.
- **Signal Explanation**: Expand "Why This Signal?" drawer with more detail (zone strength score, trend multi-timeframe).
- **Mobile Responsiveness**: Test chart on tablet; consider horizontal scroll for candles on small screens.
