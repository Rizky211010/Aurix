"""
Bot API - Integration dengan Kol API untuk market sentiment
"""

import asyncio
from typing import Optional
import aiohttp

# Kol API Configuration
KOL_API_KEY = 'kol_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTliZTM5OGItY2MwNS00MTljLWJhNmYtYjkyYzMzYTZkNmY1Iiwia2V5X2lkIjoiZjQyMzg2ZmUtYmFhNS00MmI3LWIzMjEtOTUxYmQ1NzdkZjk5Iiwia2V5X25hbWUiOiJGb3JleCIsImVtYWlsIjoicml6a3ltZW1hMTA2QHN0dWRlbnQudW5zcmF0LmFjLmlkIiwicmF0ZV9saW1pdF9ycHMiOm51bGwsIm1heF9jcmVkaXRfdXNlIjoyMCwiY3JlYXRlZF9hdCI6MTc2NTYwMzgzMiwiZXhwaXJlc19hdCI6MTc5NzEzOTgzMiwiaWF0IjoxNzY1NjAzODMyfQ.M5gDhW3VN6OVy_Lgs24uTOPN76dE3XvwOqii2bbpF_Q'
KOL_API_BASE = 'https://api.kolhub.io/v1'


class KolMarketAnalyzer:
    """Analyzer untuk market sentiment dari Kol API"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def init(self):
        """Initialize session"""
        self.session = aiohttp.ClientSession()
    
    async def close(self):
        """Close session"""
        if self.session:
            await self.session.close()
    
    async def get_market_sentiment(self, symbol: str) -> dict:
        """Get market sentiment from Kol API"""
        try:
            if not self.session:
                await self.init()
            
            headers = {
                'Authorization': f'Bearer {KOL_API_KEY}',
                'Content-Type': 'application/json',
            }
            
            url = f'{KOL_API_BASE}/sentiment/{symbol.upper()}'
            async with self.session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    print(f'[KolAPI] Sentiment error: {resp.status}')
                    return None
        except Exception as e:
            print(f'[KolAPI] Error: {e}')
            return None
    
    async def get_trend_analysis(self, symbol: str) -> dict:
        """Get trend analysis from Kol API"""
        try:
            if not self.session:
                await self.init()
            
            headers = {
                'Authorization': f'Bearer {KOL_API_KEY}',
                'Content-Type': 'application/json',
            }
            
            url = f'{KOL_API_BASE}/trend/{symbol.upper()}'
            async with self.session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    print(f'[KolAPI] Trend error: {resp.status}')
                    return None
        except Exception as e:
            print(f'[KolAPI] Error: {e}')
            return None
    
    async def get_full_analysis(self, symbol: str) -> dict:
        """Get full market analysis"""
        sentiment, trend = await asyncio.gather(
            self.get_market_sentiment(symbol),
            self.get_trend_analysis(symbol)
        )
        
        return {
            'symbol': symbol.upper(),
            'sentiment': sentiment,
            'trend': trend,
            'timestamp': __import__('datetime').datetime.now().isoformat()
        }
    
    def is_market_favorable(self, sentiment: dict, trend: dict) -> bool:
        """Check if market conditions are favorable for trading"""
        
        # Extreme fear - avoid trading
        if sentiment and 'fear_greed_index' in sentiment:
            if sentiment['fear_greed_index'] < 20 or sentiment['fear_greed_index'] > 80:
                return False
        
        # Sideways market - not favorable
        if trend:
            if trend.get('short_term') == 'SIDEWAYS' and trend.get('mid_term') == 'SIDEWAYS':
                return False
        
        return True
    
    def get_confidence_boost(self, signal_direction: str, sentiment: dict, trend: dict) -> float:
        """Calculate confidence boost from market data"""
        boost = 0.0
        
        # Sentiment boost
        if sentiment:
            if signal_direction == 'BUY' and sentiment.get('sentiment') == 'BULLISH':
                boost += sentiment.get('confidence', 0) * 0.1
            elif signal_direction == 'SELL' and sentiment.get('sentiment') == 'BEARISH':
                boost += sentiment.get('confidence', 0) * 0.1
            else:
                boost -= 10  # Penalty for opposite sentiment
        
        # Trend boost
        if trend:
            if signal_direction == 'BUY' and trend.get('short_term') == 'UP':
                boost += 10
            elif signal_direction == 'SELL' and trend.get('short_term') == 'DOWN':
                boost += 10
            else:
                boost -= 5  # Slight penalty for opposite trend
        
        return max(-20, min(20, boost))  # Cap boost between -20 and +20


# Global analyzer instance
kol_analyzer = KolMarketAnalyzer()


async def initialize_kol():
    """Initialize Kol API analyzer"""
    await kol_analyzer.init()


async def shutdown_kol():
    """Shutdown Kol API analyzer"""
    await kol_analyzer.close()
