"""
TradingBot - Main Bot Controller
================================
Menggabungkan StrategyEngine, RiskManager, dan TradeExecutor
untuk automated trading loop.

Features:
- Continuous market analysis
- Automatic signal detection
- Trade execution dengan risk management
- WebSocket untuk update ke frontend
- Comprehensive logging
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
import os

from strategy_engine import StrategyEngine, TradeSignal
from risk_manager import RiskManager
from trade_executor import TradeExecutor, OrderResult, OrderStatus

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class BotState(Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    ANALYZING = "analyzing"
    TRADING = "trading"
    STOPPING = "stopping"
    ERROR = "error"


@dataclass
class BotConfig:
    """Konfigurasi bot"""
    # Mode
    dry_run: bool = True
    
    # Symbol & Timeframe
    symbol: str = "BTCUSDT"
    timeframe: str = "1h"
    
    # Strategy params
    ema_fast: int = 9
    ema_medium: int = 21
    ema_slow: int = 200
    min_confidence: float = 60.0
    min_rrr: float = 1.5
    
    # Risk params
    equity: float = 10000.0
    leverage: int = 100
    risk_percent: float = 1.0
    max_risk_percent: float = 2.0
    
    # Execution
    exchange: str = "binance"
    api_key: str = ""
    api_secret: str = ""
    sandbox: bool = True
    
    # Loop settings
    analysis_interval: int = 60  # seconds
    max_open_positions: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BotLog:
    """Log entry untuk bot"""
    timestamp: datetime
    level: str
    message: str
    data: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'level': self.level,
            'message': self.message,
            'data': self.data
        }


@dataclass
class TradeRecord:
    """Record untuk trade history"""
    id: str
    symbol: str
    side: str
    entry_price: float
    exit_price: Optional[float]
    quantity: float
    stop_loss: float
    take_profit: float
    status: str  # 'open', 'closed', 'stopped_out', 'take_profit'
    pnl: float
    opened_at: datetime
    closed_at: Optional[datetime]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'symbol': self.symbol,
            'side': self.side,
            'entry_price': self.entry_price,
            'exit_price': self.exit_price,
            'quantity': self.quantity,
            'stop_loss': self.stop_loss,
            'take_profit': self.take_profit,
            'status': self.status,
            'pnl': round(self.pnl, 2),
            'opened_at': self.opened_at.isoformat(),
            'closed_at': self.closed_at.isoformat() if self.closed_at else None
        }


class DataFetcher:
    """Mengambil data OHLCV dari berbagai sumber"""
    
    def __init__(self, source: str = 'binance'):
        self.source = source
    
    async def fetch_ohlcv(
        self, 
        symbol: str, 
        timeframe: str, 
        limit: int = 300
    ) -> List[Dict[str, Any]]:
        """
        Fetch OHLCV data
        
        Args:
            symbol: Trading pair
            timeframe: Timeframe (1m, 5m, 15m, 1h, 4h, 1d)
            limit: Number of candles
            
        Returns:
            List of OHLCV dictionaries
        """
        if self.source == 'binance':
            return await self._fetch_binance(symbol, timeframe, limit)
        else:
            raise ValueError(f"Unsupported source: {self.source}")
    
    async def _fetch_binance(
        self, 
        symbol: str, 
        timeframe: str, 
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch dari Binance API"""
        import aiohttp
        
        # Map timeframe
        tf_map = {
            '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
            '1h': '1h', '4h': '4h', '1d': '1d'
        }
        interval = tf_map.get(timeframe, '1h')
        
        url = f"https://api.binance.com/api/v3/klines"
        params = {
            'symbol': symbol.upper(),
            'interval': interval,
            'limit': limit
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        ohlcv = []
                        for candle in data:
                            ohlcv.append({
                                'timestamp': candle[0],
                                'open': float(candle[1]),
                                'high': float(candle[2]),
                                'low': float(candle[3]),
                                'close': float(candle[4]),
                                'volume': float(candle[5])
                            })
                        
                        return ohlcv
                    else:
                        logger.error(f"Binance API error: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Failed to fetch data: {e}")
            return []


class TradingBot:
    """
    Main Trading Bot Class
    
    Alur:
    1. Start → Initialize components
    2. Loop: Fetch data → Analyze → Generate signal → Execute (if valid)
    3. Monitor positions → Update PnL
    4. Log semua aktivitas
    """
    
    def __init__(
        self, 
        config: BotConfig,
        on_log: Optional[Callable[[BotLog], None]] = None,
        on_state_change: Optional[Callable[[BotState], None]] = None,
        on_trade: Optional[Callable[[TradeRecord], None]] = None
    ):
        """
        Initialize Trading Bot
        
        Args:
            config: BotConfig object
            on_log: Callback untuk log messages (untuk WebSocket)
            on_state_change: Callback untuk state changes
            on_trade: Callback untuk trade events
        """
        self.config = config
        self.state = BotState.STOPPED
        self._running = False
        
        # Callbacks untuk frontend
        self.on_log = on_log
        self.on_state_change = on_state_change
        self.on_trade = on_trade
        
        # Components
        self.strategy: Optional[StrategyEngine] = None
        self.risk_manager: Optional[RiskManager] = None
        self.executor: Optional[TradeExecutor] = None
        self.data_fetcher: Optional[DataFetcher] = None
        
        # State tracking
        self.logs: List[BotLog] = []
        self.trade_history: List[TradeRecord] = []
        self.open_positions: List[TradeRecord] = []
        self.current_signal: Optional[TradeSignal] = None
        self.last_analysis: Optional[Dict[str, Any]] = None
        
        # Stats
        self.stats = {
            'total_signals': 0,
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'total_pnl': 0.0,
            'started_at': None,
            'last_signal_at': None
        }
        
        self._log('INFO', f"TradingBot initialized - {'DRY RUN' if config.dry_run else 'LIVE'} mode")
    
    def _log(self, level: str, message: str, data: Optional[Dict[str, Any]] = None):
        """Internal logging dengan callback"""
        log_entry = BotLog(
            timestamp=datetime.now(),
            level=level,
            message=message,
            data=data
        )
        
        self.logs.append(log_entry)
        
        # Keep last 1000 logs
        if len(self.logs) > 1000:
            self.logs = self.logs[-1000:]
        
        # Console log
        if level == 'ERROR':
            logger.error(message)
        elif level == 'WARNING':
            logger.warning(message)
        else:
            logger.info(message)
        
        # Callback to frontend
        if self.on_log:
            self.on_log(log_entry)
    
    def _set_state(self, new_state: BotState):
        """Update state dengan callback"""
        old_state = self.state
        self.state = new_state
        
        self._log('INFO', f"State changed: {old_state.value} → {new_state.value}")
        
        if self.on_state_change:
            self.on_state_change(new_state)
    
    async def initialize(self) -> bool:
        """Initialize semua components"""
        self._set_state(BotState.STARTING)
        
        try:
            # Initialize Strategy Engine
            self.strategy = StrategyEngine(
                ema_fast=self.config.ema_fast,
                ema_medium=self.config.ema_medium,
                ema_slow=self.config.ema_slow,
                min_rrr=self.config.min_rrr,
                min_confidence=self.config.min_confidence
            )
            self._log('INFO', '✅ Strategy Engine initialized')
            
            # Initialize Risk Manager
            self.risk_manager = RiskManager(
                equity=self.config.equity,
                leverage=self.config.leverage,
                max_risk_percent=self.config.max_risk_percent,
                default_risk_percent=self.config.risk_percent
            )
            self._log('INFO', '✅ Risk Manager initialized')
            
            # Initialize Trade Executor
            self.executor = TradeExecutor(
                dry_run=self.config.dry_run,
                executor_type='ccxt',
                config={
                    'initial_balance': self.config.equity,
                    'exchange': self.config.exchange,
                    'api_key': self.config.api_key,
                    'api_secret': self.config.api_secret,
                    'sandbox': self.config.sandbox
                }
            )
            await self.executor.initialize()
            self._log('INFO', '✅ Trade Executor initialized')
            
            # Initialize Data Fetcher
            self.data_fetcher = DataFetcher(source=self.config.exchange)
            self._log('INFO', '✅ Data Fetcher initialized')
            
            return True
            
        except Exception as e:
            self._log('ERROR', f'❌ Initialization failed: {e}')
            self._set_state(BotState.ERROR)
            return False
    
    async def start(self):
        """Start bot main loop"""
        if self.state == BotState.RUNNING:
            self._log('WARNING', 'Bot already running')
            return
        
        if not await self.initialize():
            return
        
        self._running = True
        self._set_state(BotState.RUNNING)
        self.stats['started_at'] = datetime.now().isoformat()
        
        self._log('INFO', f'🚀 Bot started - Trading {self.config.symbol} on {self.config.timeframe}')
        
        # Main loop
        while self._running:
            try:
                await self._analysis_cycle()
                await asyncio.sleep(self.config.analysis_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._log('ERROR', f'Error in main loop: {e}')
                await asyncio.sleep(5)  # Wait before retry
        
        self._log('INFO', '🛑 Bot stopped')
        self._set_state(BotState.STOPPED)
    
    async def stop(self):
        """Stop bot gracefully"""
        self._log('INFO', '⏹️ Stopping bot...')
        self._set_state(BotState.STOPPING)
        self._running = False
        
        if self.executor:
            await self.executor.shutdown()
    
    async def _analysis_cycle(self):
        """Single analysis cycle"""
        self._set_state(BotState.ANALYZING)
        
        # 1. Fetch data
        self._log('INFO', f'📊 Fetching {self.config.symbol} data...')
        ohlcv = await self.data_fetcher.fetch_ohlcv(
            self.config.symbol,
            self.config.timeframe,
            limit=300
        )
        
        if not ohlcv or len(ohlcv) < 250:
            self._log('WARNING', f'Insufficient data: {len(ohlcv)} candles')
            return
        
        # 2. Analyze market state
        market_state = self.strategy.analyze_market_state(ohlcv)
        self.last_analysis = market_state
        
        self._log('INFO', f'📈 Market: {market_state.get("trend")} | Price: {market_state.get("current_price")}', market_state)
        
        # 3. Check for signal
        signal = self.strategy.get_signal(ohlcv)
        
        if signal:
            self.stats['total_signals'] += 1
            self.stats['last_signal_at'] = datetime.now().isoformat()
            self.current_signal = signal
            
            self._log('INFO', f'🎯 SIGNAL DETECTED: {signal.action} @ {signal.entry_price}', signal.to_dict())
            
            # 4. Execute if conditions met
            await self._execute_signal(signal)
        else:
            self._log('INFO', '⏸️ No valid signal - waiting...')
    
    async def _execute_signal(self, signal: TradeSignal):
        """Execute trade signal"""
        # Check max positions
        if len(self.open_positions) >= self.config.max_open_positions:
            self._log('WARNING', f'Max positions reached ({self.config.max_open_positions}). Skipping signal.')
            return
        
        self._set_state(BotState.TRADING)
        
        # Calculate position size
        position = self.risk_manager.calculate_position_size(
            symbol=self.config.symbol,
            entry_price=signal.entry_price,
            stop_loss=signal.stop_loss,
            take_profit=signal.take_profit,
            risk_percent=self.config.risk_percent
        )
        
        if not position.is_valid:
            self._log('WARNING', f'Position size invalid: {position.warning}')
            return
        
        self._log('INFO', f'📊 Position: {position.lot_size:.4f} lots | Risk: ${position.risk_amount:.2f}', position.to_dict())
        
        # Execute trade
        signal_dict = signal.to_dict()
        signal_dict['symbol'] = self.config.symbol
        
        result = await self.executor.execute_signal(signal_dict, self.risk_manager)
        
        if result.status == OrderStatus.FILLED:
            self._log('INFO', f'✅ ORDER FILLED: {result.order_id}', result.to_dict())
            
            # Create trade record
            trade = TradeRecord(
                id=result.order_id,
                symbol=self.config.symbol,
                side=signal.action,
                entry_price=result.filled_price or signal.entry_price,
                exit_price=None,
                quantity=result.filled_quantity,
                stop_loss=signal.stop_loss,
                take_profit=signal.take_profit,
                status='open',
                pnl=0.0,
                opened_at=datetime.now(),
                closed_at=None
            )
            
            self.open_positions.append(trade)
            self.stats['total_trades'] += 1
            
            if self.on_trade:
                self.on_trade(trade)
        else:
            self._log('ERROR', f'❌ ORDER FAILED: {result.error_message}', result.to_dict())
    
    # ===========================
    # API Methods untuk Frontend
    # ===========================
    
    def get_status(self) -> Dict[str, Any]:
        """Get current bot status"""
        return {
            'state': self.state.value,
            'symbol': self.config.symbol,
            'timeframe': self.config.timeframe,
            'mode': 'DRY_RUN' if self.config.dry_run else 'LIVE',
            'equity': self.config.equity,
            'current_signal': self.current_signal.to_dict() if self.current_signal else None,
            'last_analysis': self.last_analysis,
            'open_positions': [p.to_dict() for p in self.open_positions],
            'stats': self.stats
        }
    
    def get_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent logs"""
        return [log.to_dict() for log in self.logs[-limit:]]
    
    def get_trade_history(self) -> List[Dict[str, Any]]:
        """Get trade history"""
        return [t.to_dict() for t in self.trade_history]
    
    def get_open_positions(self) -> List[Dict[str, Any]]:
        """Get open positions"""
        return [p.to_dict() for p in self.open_positions]
    
    def update_config(self, updates: Dict[str, Any]):
        """Update bot config"""
        for key, value in updates.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                self._log('INFO', f'Config updated: {key} = {value}')


# =======================
# CLI Interface
# =======================
async def main():
    """CLI interface untuk testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='AI Trading Bot')
    parser.add_argument('--symbol', default='BTCUSDT', help='Trading symbol')
    parser.add_argument('--timeframe', default='1h', help='Timeframe')
    parser.add_argument('--live', action='store_true', help='Enable live trading')
    parser.add_argument('--equity', type=float, default=10000, help='Initial equity')
    
    args = parser.parse_args()
    
    config = BotConfig(
        dry_run=not args.live,
        symbol=args.symbol,
        timeframe=args.timeframe,
        equity=args.equity
    )
    
    bot = TradingBot(config)
    
    try:
        await bot.start()
    except KeyboardInterrupt:
        await bot.stop()


if __name__ == "__main__":
    asyncio.run(main())
