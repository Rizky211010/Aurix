"""
RiskManager - Pengaman Modal Trading
====================================
Menghitung Lot Size otomatis berdasarkan risiko per trade.

Aturan:
- Risiko per Trade: Maksimal 1% dari total ekuitas akun
- Rumus: Volume = (Equity * Risk%) / Jarak_SL_dalam_Uang
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PositionSize:
    """Data class untuk hasil kalkulasi position size"""
    lot_size: float
    units: int
    risk_amount: float
    risk_percent: float
    stop_loss_pips: float
    potential_loss: float
    potential_profit: float
    margin_required: float
    is_valid: bool
    warning: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'lot_size': round(self.lot_size, 4),
            'units': self.units,
            'risk_amount': round(self.risk_amount, 2),
            'risk_percent': round(self.risk_percent, 2),
            'stop_loss_pips': round(self.stop_loss_pips, 1),
            'potential_loss': round(self.potential_loss, 2),
            'potential_profit': round(self.potential_profit, 2),
            'margin_required': round(self.margin_required, 2),
            'is_valid': self.is_valid,
            'warning': self.warning
        }


class RiskManager:
    """
    Risk Manager untuk perhitungan lot size dan validasi trade
    
    Features:
    - Kalkulasi lot size berdasarkan % risiko
    - Validasi margin requirement
    - Pengecekan maximum lot size
    - Support berbagai jenis akun (Standard, Mini, Micro)
    """
    
    # Lot size multipliers
    LOT_SIZES = {
        'standard': 100000,  # 1 lot = 100,000 units
        'mini': 10000,       # 1 mini lot = 10,000 units
        'micro': 1000,       # 1 micro lot = 1,000 units
    }
    
    # Pip values untuk common pairs (per standard lot dalam USD)
    PIP_VALUES = {
        'EURUSD': 10.0,
        'GBPUSD': 10.0,
        'AUDUSD': 10.0,
        'NZDUSD': 10.0,
        'USDCHF': 10.0,
        'USDCAD': 10.0,
        'USDJPY': 9.1,  # Varies dengan rate
        'EURJPY': 9.1,
        'GBPJPY': 9.1,
        'XAUUSD': 10.0,  # Gold
        'BTCUSD': 1.0,   # Bitcoin (1 pip = $1)
        'BTCUSDT': 1.0,
        'ETHUSD': 1.0,
        'ETHUSDT': 1.0,
    }
    
    def __init__(
        self,
        equity: float,
        leverage: int = 100,
        account_type: str = 'standard',
        max_risk_percent: float = 2.0,
        default_risk_percent: float = 1.0,
        account_currency: str = 'USD'
    ):
        """
        Initialize Risk Manager
        
        Args:
            equity: Total balance akun
            leverage: Leverage akun (default: 1:100)
            account_type: 'standard', 'mini', atau 'micro'
            max_risk_percent: Maksimum risiko per trade (default: 2%)
            default_risk_percent: Default risiko per trade (default: 1%)
            account_currency: Mata uang akun (default: USD)
        """
        self.equity = equity
        self.leverage = leverage
        self.account_type = account_type.lower()
        self.max_risk_percent = max_risk_percent
        self.default_risk_percent = default_risk_percent
        self.account_currency = account_currency
        
        self.lot_multiplier = self.LOT_SIZES.get(self.account_type, 100000)
        
        logger.info(f"RiskManager initialized: Equity=${equity}, Leverage=1:{leverage}, Type={account_type}")
    
    def update_equity(self, new_equity: float):
        """Update equity (dipanggil setelah trade selesai)"""
        self.equity = new_equity
        logger.info(f"Equity updated to ${new_equity}")
    
    def get_pip_value(self, symbol: str, lot_size: float = 1.0) -> float:
        """
        Mendapatkan pip value untuk symbol tertentu
        
        Args:
            symbol: Trading pair (e.g., 'EURUSD')
            lot_size: Ukuran lot
            
        Returns:
            Pip value dalam account currency
        """
        symbol_upper = symbol.upper().replace('/', '')
        base_pip_value = self.PIP_VALUES.get(symbol_upper, 10.0)
        
        # Adjust untuk account type
        type_multiplier = self.lot_multiplier / self.LOT_SIZES['standard']
        
        return base_pip_value * lot_size * type_multiplier
    
    def calculate_pips(
        self, 
        symbol: str, 
        entry_price: float, 
        stop_loss: float
    ) -> float:
        """
        Menghitung jarak dalam pips
        
        Args:
            symbol: Trading pair
            entry_price: Harga entry
            stop_loss: Harga stop loss
            
        Returns:
            Jarak dalam pips
        """
        price_diff = abs(entry_price - stop_loss)
        
        # Determine pip size based on symbol
        symbol_upper = symbol.upper()
        
        if 'JPY' in symbol_upper:
            pip_size = 0.01
        elif 'BTC' in symbol_upper or 'ETH' in symbol_upper:
            pip_size = 1.0  # $1 = 1 pip untuk crypto
        elif 'XAU' in symbol_upper:
            pip_size = 0.1  # Gold
        else:
            pip_size = 0.0001  # Default forex pairs
        
        return price_diff / pip_size
    
    def calculate_position_size(
        self,
        symbol: str,
        entry_price: float,
        stop_loss: float,
        take_profit: float,
        risk_percent: Optional[float] = None
    ) -> PositionSize:
        """
        Menghitung ukuran posisi berdasarkan risiko
        
        Formula: Lot Size = Risk Amount / (SL Pips × Pip Value per Lot)
        
        Args:
            symbol: Trading pair
            entry_price: Harga entry
            stop_loss: Harga stop loss
            take_profit: Harga take profit
            risk_percent: Persentase risiko (default: default_risk_percent)
            
        Returns:
            PositionSize object dengan detail kalkulasi
        """
        # Use default if not specified
        if risk_percent is None:
            risk_percent = self.default_risk_percent
        
        # Validate risk percent
        warning = None
        if risk_percent > self.max_risk_percent:
            warning = f"Risk {risk_percent}% melebihi maksimum {self.max_risk_percent}%. Disesuaikan."
            risk_percent = self.max_risk_percent
            logger.warning(warning)
        
        # Calculate risk amount
        risk_amount = self.equity * (risk_percent / 100)
        
        # Calculate SL distance in pips
        sl_pips = self.calculate_pips(symbol, entry_price, stop_loss)
        
        if sl_pips <= 0:
            return PositionSize(
                lot_size=0,
                units=0,
                risk_amount=risk_amount,
                risk_percent=risk_percent,
                stop_loss_pips=0,
                potential_loss=0,
                potential_profit=0,
                margin_required=0,
                is_valid=False,
                warning="Invalid stop loss distance"
            )
        
        # Get pip value per standard lot
        pip_value_per_lot = self.get_pip_value(symbol, 1.0)
        
        # Calculate lot size
        # Lot Size = Risk Amount / (SL Pips × Pip Value per Lot)
        lot_size = risk_amount / (sl_pips * pip_value_per_lot)
        
        # Calculate units
        units = int(lot_size * self.lot_multiplier)
        
        # Calculate margin required
        margin_required = (units * entry_price) / self.leverage
        
        # Calculate potential loss (should equal risk_amount)
        potential_loss = sl_pips * pip_value_per_lot * lot_size
        
        # Calculate potential profit
        tp_pips = self.calculate_pips(symbol, entry_price, take_profit)
        potential_profit = tp_pips * pip_value_per_lot * lot_size
        
        # Validate margin
        is_valid = True
        if margin_required > self.equity:
            is_valid = False
            warning = f"Margin required (${margin_required:.2f}) melebihi equity (${self.equity:.2f})"
            logger.error(warning)
        
        # Check for very small lot size
        if lot_size < 0.01:
            if warning:
                warning += " | "
            else:
                warning = ""
            warning += f"Lot size sangat kecil ({lot_size:.4f}). Pertimbangkan akun micro."
        
        return PositionSize(
            lot_size=lot_size,
            units=units,
            risk_amount=risk_amount,
            risk_percent=risk_percent,
            stop_loss_pips=sl_pips,
            potential_loss=potential_loss,
            potential_profit=potential_profit,
            margin_required=margin_required,
            is_valid=is_valid,
            warning=warning
        )
    
    def validate_trade(
        self,
        symbol: str,
        entry_price: float,
        stop_loss: float,
        take_profit: float,
        lot_size: float
    ) -> Dict[str, Any]:
        """
        Validasi trade sebelum eksekusi
        
        Returns:
            Dict dengan status validasi dan pesan
        """
        errors = []
        warnings = []
        
        # 1. Check margin
        units = int(lot_size * self.lot_multiplier)
        margin_required = (units * entry_price) / self.leverage
        
        if margin_required > self.equity * 0.9:  # Max 90% margin usage
            errors.append(f"Margin ({margin_required:.2f}) melebihi 90% equity")
        elif margin_required > self.equity * 0.5:
            warnings.append(f"Margin usage tinggi: {(margin_required/self.equity*100):.1f}%")
        
        # 2. Check SL distance
        sl_pips = self.calculate_pips(symbol, entry_price, stop_loss)
        if sl_pips < 5:
            warnings.append(f"SL sangat dekat ({sl_pips:.1f} pips). Hati-hati dengan spread.")
        
        # 3. Check risk amount
        pip_value = self.get_pip_value(symbol, lot_size)
        risk_amount = sl_pips * pip_value
        risk_percent = (risk_amount / self.equity) * 100
        
        if risk_percent > self.max_risk_percent:
            errors.append(f"Risk ({risk_percent:.2f}%) melebihi maksimum ({self.max_risk_percent}%)")
        
        # 4. Check RRR
        tp_pips = self.calculate_pips(symbol, entry_price, take_profit)
        rrr = tp_pips / sl_pips if sl_pips > 0 else 0
        
        if rrr < 1:
            warnings.append(f"RRR rendah ({rrr:.2f}). Pertimbangkan TP lebih jauh.")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'margin_required': margin_required,
            'margin_percent': (margin_required / self.equity) * 100,
            'risk_percent': risk_percent,
            'rrr': rrr
        }
    
    def get_account_summary(self) -> Dict[str, Any]:
        """Get ringkasan akun"""
        return {
            'equity': self.equity,
            'leverage': f"1:{self.leverage}",
            'account_type': self.account_type,
            'max_risk_percent': self.max_risk_percent,
            'default_risk_percent': self.default_risk_percent,
            'account_currency': self.account_currency,
            'lot_multiplier': self.lot_multiplier,
            'max_risk_amount': self.equity * (self.max_risk_percent / 100)
        }


# =======================
# USAGE EXAMPLE
# =======================
if __name__ == "__main__":
    # Initialize Risk Manager
    risk_mgr = RiskManager(
        equity=10000.0,
        leverage=100,
        account_type='standard',
        max_risk_percent=2.0,
        default_risk_percent=1.0
    )
    
    print("\n📊 Account Summary:")
    summary = risk_mgr.get_account_summary()
    for key, value in summary.items():
        print(f"  {key}: {value}")
    
    # Calculate position size untuk trade
    print("\n🎯 Position Size Calculation:")
    position = risk_mgr.calculate_position_size(
        symbol='XAUUSD',
        entry_price=2050.00,
        stop_loss=2040.00,
        take_profit=2065.00,
        risk_percent=1.0
    )
    
    result = position.to_dict()
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    # Validate trade
    print("\n✅ Trade Validation:")
    validation = risk_mgr.validate_trade(
        symbol='XAUUSD',
        entry_price=2050.00,
        stop_loss=2040.00,
        take_profit=2065.00,
        lot_size=position.lot_size
    )
    
    for key, value in validation.items():
        print(f"  {key}: {value}")
