# Kol API Integration - Auto Trading Platform

## Overview

Platform ini sekarang terintegrasi dengan **Kol API** untuk market sentiment analysis dan on-chain data. Ini melengkapi **Gemini AI** untuk decision making yang lebih komprehensif.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AUTO TRADING PLATFORM                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend Dashboard                                          │
│  ├─ Chart (Binance WebSocket realtime)                      │
│  ├─ Trading Signal (AI Decision Engine)                     │
│  └─ Market Sentiment Panel (Kol API)                        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                       │
│  ├─ /api/bot/signal       → Signal generation               │
│  ├─ /api/analysis/market-sentiment → Kol data              │
│  └─ /api/bot/execute      → Trade execution                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                  Data Sources                               │
│  ├─ Binance WebSocket     → Candlestick realtime           │
│  ├─ Gemini AI             → Chart analysis (optional)       │
│  └─ Kol API               → Market sentiment + on-chain     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│               Python Bot Backend (FastAPI)                   │
│  ├─ Trade Executor        → CCXT orders                     │
│  ├─ Risk Manager          → Position sizing                 │
│  └─ Kol Market Analyzer   → Sentiment-based risk            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Kol API Features

### 1. Market Sentiment
```typescript
interface MarketSentiment {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;        // 0-100
  fear_greed_index?: number; // 0-100
  volume_trend?: string;     // INCREASING/DECREASING/STABLE
  whale_activity?: string;   // BUYING/SELLING/NEUTRAL
  social_sentiment?: string; // POSITIVE/NEGATIVE/NEUTRAL
}
```

### 2. Trend Analysis
```typescript
interface TrendAnalysis {
  short_term: 'UP' | 'DOWN' | 'SIDEWAYS';
  mid_term: 'UP' | 'DOWN' | 'SIDEWAYS';
  long_term: 'UP' | 'DOWN' | 'SIDEWAYS';
  momentum: number;   // -100 to 100
  volatility: number; // 0-100
}
```

### 3. On-Chain Metrics
```typescript
interface OnChainMetrics {
  active_addresses: number;
  transaction_volume: number;
  whale_wallets: number;
  exchange_inflow: number;
  exchange_outflow: number;
}
```

---

## Signal Generation Flow

### Step 1: Base Signal (Technical Analysis)
```
Candlestick Data → EMA/ATR/Swing → Signal (BUY/SELL/WAIT)
```

### Step 2: Market Validation (Kol API)
```
Market Sentiment + Trend → Confidence Adjustment
```

**Rules:**
- ✅ BUY signal + BULLISH sentiment → Confidence +10%
- ✅ SELL signal + BEARISH sentiment → Confidence +10%
- ⚠️ Opposite sentiment → Confidence -10%
- ❌ Extreme fear (< 20) → Skip trade
- ❌ Extreme greed (> 80) → Skip trade

### Step 3: Execution (Bot)
```
Final Signal → Execute Trade (LIVE) or Simulate (DRY-RUN)
```

---

## Frontend Components

### Market Sentiment Panel
**Location:** `app/components/analysis/MarketSentimentPanel.tsx`

Displays:
- Current sentiment (BULLISH/BEARISH/NEUTRAL)
- Confidence percentage (visual bar)
- Fear/Greed index
- Volume trend
- Whale activity
- Multi-timeframe trend analysis

### useMarketAnalysis Hook
**Location:** `app/components/analysis/useMarketAnalysis.ts`

```typescript
const { data, isLoading, error } = useMarketAnalysis({
  symbol: 'BTCUSDT',
  autoRefresh: true,
  refreshInterval: 60000 // 1 minute
});
```

---

## Backend Integration

### Python Kol Market Analyzer
**Location:** `bot/kol_market_analyzer.py`

```python
analyzer = KolMarketAnalyzer()
await analyzer.init()

sentiment = await analyzer.get_market_sentiment('BTCUSDT')
trend = await analyzer.get_trend_analysis('BTCUSDT')
full = await analyzer.get_full_analysis('BTCUSDT')

# Check if conditions are favorable
is_favorable = analyzer.is_market_favorable(sentiment, trend)

# Calculate confidence boost
boost = analyzer.get_confidence_boost('BUY', sentiment, trend)
```

---

## API Endpoints

### 1. GET `/api/analysis/market-sentiment?symbol=BTCUSDT`
Returns market sentiment and trend analysis from Kol API.

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "sentiment": {
    "sentiment": "BULLISH",
    "confidence": 75,
    "fear_greed_index": 65,
    "volume_trend": "INCREASING",
    "whale_activity": "BUYING"
  },
  "trend": {
    "short_term": "UP",
    "mid_term": "UP",
    "long_term": "UP",
    "momentum": 45,
    "volatility": 42
  },
  "metrics": {
    "active_addresses": 450000,
    "whale_wallets": 2500
  },
  "timestamp": "2025-12-13T10:30:00Z"
}
```

### 2. POST `/api/bot/signal`
Generate trading signal dengan market sentiment validation.

**Request:**
```json
{
  "candles": [...],
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "botMode": "DRY_RUN",
  "aiEnabled": true
}
```

**Response:**
```json
{
  "signal": "BUY",
  "entry": 104500.00,
  "stop_loss": 103200.00,
  "take_profit_1": 107100.00,
  "take_profit_2": 109000.00,
  "confidence": 82,
  "reason": "Bullish trend, EMA... | Market: BULLISH (75% conf)",
  "risk_reward": 2.0
}
```

---

## Configuration

### Kol API Key
```
kol_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTliZTM5OGItY2MwNS00MTljLWJhNmYtYjkyYzMzYTZkNmY1Iiwia2V5X2lkIjoiZjQyMzg2ZmUtYmFhNS00MmI3LWIzMjEtOTUxYmQ1NzdkZjk5Iiwia2V5X25hbWUiOiJGb3JleCIsImVtYWlsIjoicml6a3ltZW1hMTA2QHN0dWRlbnQudW5zcmF0LmFjLmlkIiwicmF0ZV9saW1pdF9ycHMiOm51bGwsIm1heF9jcmVkaXRfdXNlIjoyMCwiY3JlYXRlZF9hdCI6MTc2NTYwMzgzMiwiZXhwaXJlc19hdCI6MTc5NzEzOTgzMiwiaWF0IjoxNzY1NjAzODMyfQ.M5gDhW3VN6OVy_Lgs24uTOPN76dE3XvwOqii2bbpF_Q
```

**Max Credit:** 20 credits/day
**Rate Limit:** None specified

---

## Usage Example

### Frontend - Display Market Sentiment
```tsx
import { MarketSentimentPanel } from '@/components/analysis';

export default function Dashboard() {
  return (
    <div>
      <MarketSentimentPanel symbol="BTCUSDT" />
    </div>
  );
}
```

### Frontend - Custom Hook
```tsx
import { useMarketAnalysis } from '@/components/analysis';

const { data, isLoading } = useMarketAnalysis({
  symbol: 'BTCUSDT',
  autoRefresh: true,
  refreshInterval: 60000
});

if (data?.sentiment?.sentiment === 'BULLISH') {
  // Display bullish indicator
}
```

### Backend - Risk Management with Kol Data
```python
from kol_market_analyzer import kol_analyzer

async def execute_trade(signal):
    market_analysis = await kol_analyzer.get_full_analysis('BTCUSDT')
    
    # Check if market is favorable
    if not kol_analyzer.is_market_favorable(
        market_analysis['sentiment'],
        market_analysis['trend']
    ):
        # Reduce position size or skip trade
        position_size *= 0.5
    
    # Boost confidence if sentiment aligns
    confidence_boost = kol_analyzer.get_confidence_boost(
        signal['direction'],
        market_analysis['sentiment'],
        market_analysis['trend']
    )
```

---

## Features

✅ **Dual AI System:**
- Gemini AI for technical analysis (optional toggle)
- Kol API for market sentiment + on-chain metrics

✅ **Market Sentiment Validation:**
- Confidence adjustment based on sentiment
- Fear/Greed index safety checks
- Whale activity monitoring

✅ **Real-time Dashboard:**
- Live market sentiment panel
- Multi-timeframe trend display
- Confidence scoring with boost

✅ **Risk Management:**
- Extreme emotion detection (avoid over-trading)
- Sentiment-aligned signal filtering
- Position sizing based on market conditions

---

## Error Handling

If Kol API fails:
- Signal generation continues with base technical analysis
- Dashboard shows "Market data unavailable"
- No signal rejection due to API outage

---

## Future Enhancements

1. **WebSocket Market Updates** - Real-time sentiment streaming
2. **Custom Sentiment Thresholds** - User-configurable fear/greed limits
3. **Multi-Asset Correlation** - BTC/ETH sentiment correlation
4. **Historical Sentiment** - Track sentiment vs price performance
5. **Alert System** - Notify when sentiment reversal detected

---

Sekarang platform memiliki **dual intelligence**:
- Technical: Candlestick + EMA + ATR
- Sentiment: Market + On-chain + Whale activity
- AI: Gemini (optional) + Kol (always active)
