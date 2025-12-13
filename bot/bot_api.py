"""
Bot API Server
==============
FastAPI server untuk komunikasi antara Trading Bot dan Next.js frontend.

Features:
- REST API untuk control bot
- WebSocket untuk real-time updates
- CORS support untuk Next.js
"""

import asyncio
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from trading_bot import TradingBot, BotConfig, BotState, BotLog, TradeRecord


# =======================
# Pydantic Models
# =======================

class ConfigUpdate(BaseModel):
    symbol: Optional[str] = None
    timeframe: Optional[str] = None
    dry_run: Optional[bool] = None
    equity: Optional[float] = None
    risk_percent: Optional[float] = None
    leverage: Optional[int] = None
    analysis_interval: Optional[int] = None


class StartBotRequest(BaseModel):
    symbol: str = "BTCUSDT"
    timeframe: str = "1h"
    dry_run: bool = True
    equity: float = 10000.0
    risk_percent: float = 1.0
    leverage: int = 100
    api_key: str = ""
    api_secret: str = ""


# =======================
# Connection Manager (WebSocket)
# =======================

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ WebSocket connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"🔌 WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)


# =======================
# Global State
# =======================

manager = ConnectionManager()
bot: Optional[TradingBot] = None
bot_task: Optional[asyncio.Task] = None


# =======================
# Bot Callbacks
# =======================

async def on_log_callback(log: BotLog):
    """Callback saat ada log baru"""
    await manager.broadcast({
        'type': 'log',
        'data': log.to_dict()
    })


async def on_state_change_callback(state: BotState):
    """Callback saat state berubah"""
    await manager.broadcast({
        'type': 'state',
        'data': state.value
    })


async def on_trade_callback(trade: TradeRecord):
    """Callback saat ada trade baru"""
    await manager.broadcast({
        'type': 'trade',
        'data': trade.to_dict()
    })


# Wrapper untuk async callbacks
def create_log_callback():
    def callback(log: BotLog):
        asyncio.create_task(on_log_callback(log))
    return callback


def create_state_callback():
    def callback(state: BotState):
        asyncio.create_task(on_state_change_callback(state))
    return callback


def create_trade_callback():
    def callback(trade: TradeRecord):
        asyncio.create_task(on_trade_callback(trade))
    return callback


# =======================
# FastAPI App
# =======================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager"""
    print("🚀 Bot API Server starting...")
    yield
    # Cleanup
    global bot, bot_task
    if bot:
        await bot.stop()
    if bot_task:
        bot_task.cancel()
    print("🛑 Bot API Server stopped")


app = FastAPI(
    title="AI Trading Bot API",
    description="API untuk kontrol dan monitoring trading bot",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware untuk Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =======================
# REST API Endpoints
# =======================

@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "ok",
        "service": "AI Trading Bot API",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/bot/status")
async def get_bot_status():
    """Get current bot status"""
    global bot
    
    if not bot:
        return {
            "state": "stopped",
            "message": "Bot not initialized"
        }
    
    return bot.get_status()


@app.post("/api/bot/start")
async def start_bot(request: StartBotRequest):
    """Start the trading bot"""
    global bot, bot_task
    
    if bot and bot.state == BotState.RUNNING:
        raise HTTPException(status_code=400, detail="Bot already running")
    
    # Create config
    config = BotConfig(
        dry_run=request.dry_run,
        symbol=request.symbol,
        timeframe=request.timeframe,
        equity=request.equity,
        risk_percent=request.risk_percent,
        leverage=request.leverage,
        api_key=request.api_key,
        api_secret=request.api_secret
    )
    
    # Create bot with callbacks
    bot = TradingBot(
        config=config,
        on_log=create_log_callback(),
        on_state_change=create_state_callback(),
        on_trade=create_trade_callback()
    )
    
    # Start bot in background task
    bot_task = asyncio.create_task(bot.start())
    
    return {
        "status": "starting",
        "message": f"Bot starting for {request.symbol}",
        "mode": "DRY_RUN" if request.dry_run else "LIVE"
    }


@app.post("/api/bot/stop")
async def stop_bot():
    """Stop the trading bot"""
    global bot, bot_task
    
    if not bot:
        raise HTTPException(status_code=400, detail="Bot not initialized")
    
    if bot.state == BotState.STOPPED:
        return {"status": "already_stopped"}
    
    await bot.stop()
    
    if bot_task:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass
    
    return {
        "status": "stopped",
        "message": "Bot stopped successfully"
    }


@app.get("/api/bot/logs")
async def get_logs(limit: int = 100):
    """Get bot logs"""
    global bot
    
    if not bot:
        return {"logs": []}
    
    return {"logs": bot.get_logs(limit)}


@app.get("/api/bot/positions")
async def get_positions():
    """Get open positions"""
    global bot
    
    if not bot:
        return {"positions": []}
    
    return {"positions": bot.get_open_positions()}


@app.get("/api/bot/history")
async def get_trade_history():
    """Get trade history"""
    global bot
    
    if not bot:
        return {"trades": []}
    
    return {"trades": bot.get_trade_history()}


@app.patch("/api/bot/config")
async def update_config(update: ConfigUpdate):
    """Update bot configuration"""
    global bot
    
    if not bot:
        raise HTTPException(status_code=400, detail="Bot not initialized")
    
    updates = update.model_dump(exclude_none=True)
    bot.update_config(updates)
    
    return {
        "status": "updated",
        "config": updates
    }


# =======================
# Signal Execution Endpoint
# =======================

class TradingSignal(BaseModel):
    """Trading signal from AI Decision Engine"""
    market: str
    timeframe: str
    signal: str  # 'BUY', 'SELL', 'WAIT'
    entry: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit_1: Optional[float] = None
    take_profit_2: Optional[float] = None
    bot_mode: str = "DRY_RUN"
    risk_reward: Optional[float] = None
    confidence: int = 0
    reason: str = ""


@app.post("/api/bot/execute")
async def execute_signal(signal: TradingSignal):
    """
    Receive signal from AI Decision Engine and execute trade
    
    This is the main integration point between:
    - Frontend Signal Generator API (/api/bot/signal)
    - Python Trading Bot Backend
    """
    global bot
    
    # Validate signal
    if signal.signal == 'WAIT':
        return {
            "status": "skipped",
            "reason": signal.reason or "Signal is WAIT"
        }
    
    if signal.signal not in ['BUY', 'SELL']:
        raise HTTPException(status_code=400, detail=f"Invalid signal: {signal.signal}")
    
    if not signal.entry or not signal.stop_loss or not signal.take_profit_1:
        raise HTTPException(status_code=400, detail="Missing required levels (entry, stop_loss, take_profit_1)")
    
    # Check confidence threshold
    if signal.confidence < 50:
        return {
            "status": "skipped",
            "reason": f"Confidence too low: {signal.confidence}%"
        }
    
    # Check if bot is running
    if not bot or bot.state != BotState.RUNNING:
        return {
            "status": "queued",
            "message": "Bot not running, signal stored for manual review",
            "signal": {
                "action": signal.signal,
                "entry": signal.entry,
                "sl": signal.stop_loss,
                "tp1": signal.take_profit_1,
                "tp2": signal.take_profit_2,
            }
        }
    
    # Execute trade via bot
    try:
        # Broadcast signal to WebSocket clients
        await manager.broadcast({
            'type': 'signal',
            'data': {
                'action': signal.signal,
                'entry': signal.entry,
                'stop_loss': signal.stop_loss,
                'take_profit_1': signal.take_profit_1,
                'take_profit_2': signal.take_profit_2,
                'confidence': signal.confidence,
                'reason': signal.reason,
                'timestamp': datetime.now().isoformat()
            }
        })
        
        # If in LIVE mode, execute the trade
        if signal.bot_mode == "LIVE" and not bot.config.dry_run:
            # Call trade executor
            result = await bot.execute_trade(
                action=signal.signal,
                entry=signal.entry,
                stop_loss=signal.stop_loss,
                take_profit=signal.take_profit_1
            )
            
            return {
                "status": "executed",
                "trade_id": result.get('trade_id'),
                "message": f"{signal.signal} order placed at {signal.entry}"
            }
        else:
            # Dry run - simulate trade
            return {
                "status": "simulated",
                "mode": "DRY_RUN",
                "message": f"[DRY-RUN] {signal.signal} @ {signal.entry} | SL: {signal.stop_loss} | TP: {signal.take_profit_1}",
                "signal": {
                    "action": signal.signal,
                    "entry": signal.entry,
                    "sl": signal.stop_loss,
                    "tp1": signal.take_profit_1,
                    "tp2": signal.take_profit_2,
                }
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")


# =======================
# WebSocket Endpoint
# =======================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket untuk real-time updates"""
    await manager.connect(websocket)
    
    # Send initial status
    if bot:
        await manager.send_personal(websocket, {
            'type': 'status',
            'data': bot.get_status()
        })
    else:
        await manager.send_personal(websocket, {
            'type': 'status',
            'data': {'state': 'stopped'}
        })
    
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle client commands
            if message.get('action') == 'get_status':
                if bot:
                    await manager.send_personal(websocket, {
                        'type': 'status',
                        'data': bot.get_status()
                    })
            
            elif message.get('action') == 'get_logs':
                if bot:
                    await manager.send_personal(websocket, {
                        'type': 'logs',
                        'data': bot.get_logs(message.get('limit', 100))
                    })
            
            elif message.get('action') == 'ping':
                await manager.send_personal(websocket, {
                    'type': 'pong',
                    'timestamp': datetime.now().isoformat()
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# =======================
# Run Server
# =======================

if __name__ == "__main__":
    uvicorn.run(
        "bot_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
