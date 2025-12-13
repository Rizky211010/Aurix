"""
TradeExecutor - Tangan yang Klik Tombol
=======================================
Eksekusi trade otomatis ke broker menggunakan CCXT (Crypto) atau MetaAPI (Forex MT4/MT5)

Features:
- Market Order execution
- Auto TP/SL bersamaan dengan entry
- Balance checking sebelum order
- Dry Run mode untuk simulasi
- Error handling lengkap
"""

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OrderStatus(Enum):
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    ERROR = "error"


class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


@dataclass
class OrderResult:
    """Data class untuk hasil eksekusi order"""
    order_id: str
    symbol: str
    side: str  # 'BUY' or 'SELL'
    order_type: str
    status: OrderStatus
    entry_price: float
    filled_price: Optional[float]
    quantity: float
    filled_quantity: float
    stop_loss: Optional[float]
    take_profit: Optional[float]
    timestamp: datetime
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'order_id': self.order_id,
            'symbol': self.symbol,
            'side': self.side,
            'order_type': self.order_type,
            'status': self.status.value,
            'entry_price': self.entry_price,
            'filled_price': self.filled_price,
            'quantity': self.quantity,
            'filled_quantity': self.filled_quantity,
            'stop_loss': self.stop_loss,
            'take_profit': self.take_profit,
            'timestamp': self.timestamp.isoformat(),
            'error_message': self.error_message
        }


class BaseExecutor(ABC):
    """Abstract base class untuk trade executors"""
    
    @abstractmethod
    async def connect(self) -> bool:
        """Connect ke broker/exchange"""
        pass
    
    @abstractmethod
    async def disconnect(self):
        """Disconnect dari broker/exchange"""
        pass
    
    @abstractmethod
    async def get_balance(self) -> Dict[str, float]:
        """Get account balance"""
        pass
    
    @abstractmethod
    async def execute_trade(
        self,
        symbol: str,
        side: str,
        quantity: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> OrderResult:
        """Execute trade"""
        pass
    
    @abstractmethod
    async def get_open_positions(self) -> List[Dict[str, Any]]:
        """Get open positions"""
        pass
    
    @abstractmethod
    async def close_position(self, position_id: str) -> OrderResult:
        """Close specific position"""
        pass


class DryRunExecutor(BaseExecutor):
    """
    Dry Run Executor untuk simulasi trading
    Tidak melakukan order asli, hanya logging
    """
    
    def __init__(self, initial_balance: float = 10000.0):
        self.balance = initial_balance
        self.positions: List[Dict[str, Any]] = []
        self.order_history: List[OrderResult] = []
        self.order_counter = 0
        self.is_connected = False
        
        logger.info("🔬 DryRunExecutor initialized (SIMULATION MODE)")
    
    async def connect(self) -> bool:
        self.is_connected = True
        logger.info("✅ [DRY RUN] Connected to simulated broker")
        return True
    
    async def disconnect(self):
        self.is_connected = False
        logger.info("🔌 [DRY RUN] Disconnected from simulated broker")
    
    async def get_balance(self) -> Dict[str, float]:
        return {
            'total': self.balance,
            'free': self.balance - sum(p.get('margin', 0) for p in self.positions),
            'used': sum(p.get('margin', 0) for p in self.positions)
        }
    
    async def execute_trade(
        self,
        symbol: str,
        side: str,
        quantity: float,
        entry_price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> OrderResult:
        self.order_counter += 1
        order_id = f"DRY_{self.order_counter:06d}"
        
        # Simulate execution
        logger.info(f"📤 [DRY RUN] Executing {side} {quantity} {symbol} @ {entry_price}")
        
        # Check balance (simplified)
        margin_required = quantity * entry_price * 0.01  # 1% margin
        balance = await self.get_balance()
        
        if margin_required > balance['free']:
            return OrderResult(
                order_id=order_id,
                symbol=symbol,
                side=side,
                order_type='MARKET',
                status=OrderStatus.REJECTED,
                entry_price=entry_price,
                filled_price=None,
                quantity=quantity,
                filled_quantity=0,
                stop_loss=stop_loss,
                take_profit=take_profit,
                timestamp=datetime.now(),
                error_message=f"Insufficient balance. Required: ${margin_required:.2f}, Available: ${balance['free']:.2f}"
            )
        
        # Simulate fill
        filled_price = entry_price  # In real market, might have slippage
        
        # Add to positions
        position = {
            'id': order_id,
            'symbol': symbol,
            'side': side,
            'quantity': quantity,
            'entry_price': filled_price,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'margin': margin_required,
            'opened_at': datetime.now().isoformat(),
            'pnl': 0.0
        }
        self.positions.append(position)
        
        result = OrderResult(
            order_id=order_id,
            symbol=symbol,
            side=side,
            order_type='MARKET',
            status=OrderStatus.FILLED,
            entry_price=entry_price,
            filled_price=filled_price,
            quantity=quantity,
            filled_quantity=quantity,
            stop_loss=stop_loss,
            take_profit=take_profit,
            timestamp=datetime.now()
        )
        
        self.order_history.append(result)
        
        logger.info(f"✅ [DRY RUN] Order filled: {order_id} | {side} {quantity} {symbol} @ {filled_price}")
        if stop_loss:
            logger.info(f"   SL set at: {stop_loss}")
        if take_profit:
            logger.info(f"   TP set at: {take_profit}")
        
        return result
    
    async def get_open_positions(self) -> List[Dict[str, Any]]:
        return self.positions.copy()
    
    async def close_position(self, position_id: str, exit_price: float) -> OrderResult:
        position = next((p for p in self.positions if p['id'] == position_id), None)
        
        if not position:
            return OrderResult(
                order_id=f"CLOSE_{position_id}",
                symbol="",
                side="",
                order_type='MARKET',
                status=OrderStatus.ERROR,
                entry_price=0,
                filled_price=None,
                quantity=0,
                filled_quantity=0,
                stop_loss=None,
                take_profit=None,
                timestamp=datetime.now(),
                error_message=f"Position {position_id} not found"
            )
        
        # Calculate PnL
        if position['side'] == 'BUY':
            pnl = (exit_price - position['entry_price']) * position['quantity']
        else:
            pnl = (position['entry_price'] - exit_price) * position['quantity']
        
        self.balance += pnl
        self.positions.remove(position)
        
        logger.info(f"✅ [DRY RUN] Position closed: {position_id} | PnL: ${pnl:.2f}")
        
        return OrderResult(
            order_id=f"CLOSE_{position_id}",
            symbol=position['symbol'],
            side='SELL' if position['side'] == 'BUY' else 'BUY',
            order_type='MARKET',
            status=OrderStatus.FILLED,
            entry_price=exit_price,
            filled_price=exit_price,
            quantity=position['quantity'],
            filled_quantity=position['quantity'],
            stop_loss=None,
            take_profit=None,
            timestamp=datetime.now()
        )
    
    def get_order_history(self) -> List[Dict[str, Any]]:
        return [o.to_dict() for o in self.order_history]
    
    def get_statistics(self) -> Dict[str, Any]:
        total_trades = len(self.order_history)
        filled_orders = [o for o in self.order_history if o.status == OrderStatus.FILLED]
        
        return {
            'total_orders': total_trades,
            'filled_orders': len(filled_orders),
            'open_positions': len(self.positions),
            'current_balance': self.balance,
            'mode': 'DRY_RUN'
        }


class CCXTExecutor(BaseExecutor):
    """
    Executor untuk Crypto exchanges menggunakan CCXT
    Supports: Binance, Bybit, OKX, etc.
    """
    
    def __init__(
        self,
        exchange_id: str,
        api_key: str,
        api_secret: str,
        sandbox: bool = True,
        options: Optional[Dict[str, Any]] = None
    ):
        self.exchange_id = exchange_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.sandbox = sandbox
        self.options = options or {}
        self.exchange = None
        self.is_connected = False
        
        logger.info(f"CCXTExecutor initialized for {exchange_id} ({'SANDBOX' if sandbox else 'LIVE'})")
    
    async def connect(self) -> bool:
        try:
            import ccxt.async_support as ccxt
            
            exchange_class = getattr(ccxt, self.exchange_id)
            
            config = {
                'apiKey': self.api_key,
                'secret': self.api_secret,
                'enableRateLimit': True,
                'options': self.options
            }
            
            if self.sandbox:
                config['sandbox'] = True
            
            self.exchange = exchange_class(config)
            
            # Test connection
            await self.exchange.load_markets()
            
            self.is_connected = True
            logger.info(f"✅ Connected to {self.exchange_id}")
            return True
            
        except ImportError:
            logger.error("CCXT tidak terinstall. Jalankan: pip install ccxt")
            return False
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    async def disconnect(self):
        if self.exchange:
            await self.exchange.close()
        self.is_connected = False
        logger.info(f"🔌 Disconnected from {self.exchange_id}")
    
    async def get_balance(self) -> Dict[str, float]:
        if not self.is_connected:
            raise Exception("Not connected to exchange")
        
        balance = await self.exchange.fetch_balance()
        
        return {
            'total': balance['total'].get('USDT', 0),
            'free': balance['free'].get('USDT', 0),
            'used': balance['used'].get('USDT', 0)
        }
    
    async def execute_trade(
        self,
        symbol: str,
        side: str,
        quantity: float,
        entry_price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> OrderResult:
        if not self.is_connected:
            raise Exception("Not connected to exchange")
        
        try:
            # Check balance first
            balance = await self.get_balance()
            required = quantity * entry_price
            
            if required > balance['free']:
                return OrderResult(
                    order_id="",
                    symbol=symbol,
                    side=side,
                    order_type='MARKET',
                    status=OrderStatus.REJECTED,
                    entry_price=entry_price,
                    filled_price=None,
                    quantity=quantity,
                    filled_quantity=0,
                    stop_loss=stop_loss,
                    take_profit=take_profit,
                    timestamp=datetime.now(),
                    error_message=f"Insufficient balance. Required: ${required:.2f}, Available: ${balance['free']:.2f}"
                )
            
            # Execute market order
            order = await self.exchange.create_market_order(
                symbol=symbol,
                side=side.lower(),
                amount=quantity
            )
            
            logger.info(f"✅ Order executed: {order['id']}")
            
            # Set SL/TP orders if provided
            if stop_loss:
                sl_side = 'sell' if side.upper() == 'BUY' else 'buy'
                await self.exchange.create_order(
                    symbol=symbol,
                    type='stop_market',
                    side=sl_side,
                    amount=quantity,
                    params={'stopPrice': stop_loss, 'reduceOnly': True}
                )
                logger.info(f"   SL order set at: {stop_loss}")
            
            if take_profit:
                tp_side = 'sell' if side.upper() == 'BUY' else 'buy'
                await self.exchange.create_order(
                    symbol=symbol,
                    type='take_profit_market',
                    side=tp_side,
                    amount=quantity,
                    params={'stopPrice': take_profit, 'reduceOnly': True}
                )
                logger.info(f"   TP order set at: {take_profit}")
            
            return OrderResult(
                order_id=order['id'],
                symbol=symbol,
                side=side,
                order_type='MARKET',
                status=OrderStatus.FILLED if order['status'] == 'closed' else OrderStatus.PENDING,
                entry_price=entry_price,
                filled_price=order.get('average', order.get('price')),
                quantity=quantity,
                filled_quantity=order.get('filled', 0),
                stop_loss=stop_loss,
                take_profit=take_profit,
                timestamp=datetime.now(),
                raw_response=order
            )
            
        except Exception as e:
            logger.error(f"Order execution failed: {e}")
            return OrderResult(
                order_id="",
                symbol=symbol,
                side=side,
                order_type='MARKET',
                status=OrderStatus.ERROR,
                entry_price=entry_price,
                filled_price=None,
                quantity=quantity,
                filled_quantity=0,
                stop_loss=stop_loss,
                take_profit=take_profit,
                timestamp=datetime.now(),
                error_message=str(e)
            )
    
    async def get_open_positions(self) -> List[Dict[str, Any]]:
        if not self.is_connected:
            return []
        
        try:
            positions = await self.exchange.fetch_positions()
            return [p for p in positions if float(p.get('contracts', 0)) != 0]
        except Exception as e:
            logger.error(f"Failed to fetch positions: {e}")
            return []
    
    async def close_position(self, position_id: str) -> OrderResult:
        # Implementation depends on exchange
        # For now, return not implemented
        return OrderResult(
            order_id="",
            symbol="",
            side="",
            order_type='MARKET',
            status=OrderStatus.ERROR,
            entry_price=0,
            filled_price=None,
            quantity=0,
            filled_quantity=0,
            stop_loss=None,
            take_profit=None,
            timestamp=datetime.now(),
            error_message="close_position not implemented for CCXT. Use manual close."
        )


class TradeExecutor:
    """
    Main Trade Executor class
    Wrapper yang menentukan executor mana yang digunakan
    """
    
    def __init__(
        self,
        dry_run: bool = True,
        executor_type: str = 'ccxt',
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize Trade Executor
        
        Args:
            dry_run: True untuk mode simulasi, False untuk trading real
            executor_type: 'ccxt' untuk crypto, 'metaapi' untuk forex
            config: Konfigurasi untuk executor
        """
        self.dry_run = dry_run
        self.executor_type = executor_type
        self.config = config or {}
        self.executor: Optional[BaseExecutor] = None
        
        if dry_run:
            logger.warning("⚠️ DRY RUN MODE AKTIF - Tidak ada order asli yang dikirim")
            self.executor = DryRunExecutor(
                initial_balance=config.get('initial_balance', 10000.0) if config else 10000.0
            )
        else:
            logger.warning("🔴 LIVE TRADING MODE - Order asli akan dikirim!")
            
            if executor_type == 'ccxt':
                self.executor = CCXTExecutor(
                    exchange_id=config.get('exchange', 'binance'),
                    api_key=config.get('api_key', ''),
                    api_secret=config.get('api_secret', ''),
                    sandbox=config.get('sandbox', True),
                    options=config.get('options', {})
                )
            else:
                raise ValueError(f"Unsupported executor type: {executor_type}")
    
    async def initialize(self) -> bool:
        """Initialize and connect executor"""
        return await self.executor.connect()
    
    async def shutdown(self):
        """Shutdown executor"""
        if self.executor:
            await self.executor.disconnect()
    
    async def execute_signal(
        self,
        signal: Dict[str, Any],
        risk_manager=None
    ) -> OrderResult:
        """
        Execute trade berdasarkan signal dari StrategyEngine
        
        Args:
            signal: Dict dari StrategyEngine.get_signal().to_dict()
            risk_manager: Optional RiskManager untuk kalkulasi lot size
            
        Returns:
            OrderResult dengan status eksekusi
        """
        action = signal.get('action')
        entry_price = signal.get('entry_price')
        stop_loss = signal.get('sl')
        take_profit = signal.get('tp')
        symbol = signal.get('symbol', 'BTCUSDT')
        
        # Calculate lot size if risk manager provided
        if risk_manager:
            position_size = risk_manager.calculate_position_size(
                symbol=symbol,
                entry_price=entry_price,
                stop_loss=stop_loss,
                take_profit=take_profit
            )
            
            if not position_size.is_valid:
                return OrderResult(
                    order_id="",
                    symbol=symbol,
                    side=action,
                    order_type='MARKET',
                    status=OrderStatus.REJECTED,
                    entry_price=entry_price,
                    filled_price=None,
                    quantity=0,
                    filled_quantity=0,
                    stop_loss=stop_loss,
                    take_profit=take_profit,
                    timestamp=datetime.now(),
                    error_message=f"Position size validation failed: {position_size.warning}"
                )
            
            quantity = position_size.lot_size
            logger.info(f"📊 Position size calculated: {quantity:.4f} lots (Risk: {position_size.risk_percent}%)")
        else:
            # Default small quantity for safety
            quantity = 0.001
            logger.warning("⚠️ No risk manager provided, using minimum quantity: 0.001")
        
        # Execute trade
        return await self.executor.execute_trade(
            symbol=symbol,
            side=action,
            quantity=quantity,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit=take_profit
        )
    
    async def get_balance(self) -> Dict[str, float]:
        """Get current account balance"""
        return await self.executor.get_balance()
    
    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get open positions"""
        return await self.executor.get_open_positions()
    
    def get_mode(self) -> str:
        """Get current execution mode"""
        return "DRY_RUN" if self.dry_run else "LIVE"
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get executor statistics (only for DryRun)"""
        if isinstance(self.executor, DryRunExecutor):
            return self.executor.get_statistics()
        return {'mode': 'LIVE', 'message': 'Statistics not available in live mode'}


# =======================
# USAGE EXAMPLE
# =======================
if __name__ == "__main__":
    async def main():
        # Initialize executor dalam dry run mode
        executor = TradeExecutor(
            dry_run=True,
            config={'initial_balance': 10000.0}
        )
        
        await executor.initialize()
        
        # Simulate signal dari StrategyEngine
        signal = {
            'action': 'BUY',
            'entry_price': 2050.00,
            'sl': 2040.00,
            'tp': 2065.00,
            'symbol': 'XAUUSD'
        }
        
        # Import RiskManager
        from risk_manager import RiskManager
        risk_mgr = RiskManager(equity=10000.0, leverage=100)
        
        # Execute trade
        result = await executor.execute_signal(signal, risk_mgr)
        
        print("\n📤 Order Result:")
        for key, value in result.to_dict().items():
            print(f"  {key}: {value}")
        
        # Get balance
        balance = await executor.get_balance()
        print(f"\n💰 Balance: {balance}")
        
        # Get positions
        positions = await executor.get_positions()
        print(f"\n📊 Open Positions: {len(positions)}")
        
        # Get statistics
        stats = executor.get_statistics()
        print(f"\n📈 Statistics: {stats}")
        
        await executor.shutdown()
    
    asyncio.run(main())
