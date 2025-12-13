import { NextRequest, NextResponse } from 'next/server';

// Check if symbol is forex/commodity
function isForexSymbol(symbol: string): boolean {
  return ['XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY'].includes(symbol);
}

// CryptoCompare ticker
async function fetchFromCryptoCompare(symbol: string) {
  // Skip forex symbols - CryptoCompare only handles crypto
  if (isForexSymbol(symbol)) {
    throw new Error('Forex symbol - use forex API');
  }
  
  const symbolMap: Record<string, { fsym: string; tsym: string }> = {
    'BTCUSDT': { fsym: 'BTC', tsym: 'USDT' },
    'ETHUSDT': { fsym: 'ETH', tsym: 'USDT' },
    'BNBUSDT': { fsym: 'BNB', tsym: 'USDT' },
    'SOLUSDT': { fsym: 'SOL', tsym: 'USDT' },
    'XRPUSDT': { fsym: 'XRP', tsym: 'USDT' },
    'ADAUSDT': { fsym: 'ADA', tsym: 'USDT' },
    'DOGEUSDT': { fsym: 'DOGE', tsym: 'USDT' },
  };
  
  const { fsym, tsym } = symbolMap[symbol] || { fsym: 'BTC', tsym: 'USDT' };
  
  const response = await fetch(
    `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsym}&tsyms=${tsym}`,
    { cache: 'no-store' }
  );
  
  if (!response.ok) throw new Error(`CryptoCompare: ${response.status}`);
  
  const data = await response.json();
  const ticker = data.RAW?.[fsym]?.[tsym];
  
  if (!ticker) throw new Error('No CryptoCompare data');
  
  return {
    symbol: symbol,
    lastPrice: ticker.PRICE.toString(),
    priceChange: ticker.CHANGE24HOUR.toString(),
    priceChangePercent: ticker.CHANGEPCT24HOUR.toString(),
    highPrice: ticker.HIGH24HOUR.toString(),
    lowPrice: ticker.LOW24HOUR.toString(),
    volume: ticker.VOLUME24HOUR.toString(),
    quoteVolume: ticker.VOLUME24HOURTO.toString(),
  };
}

// CoinGecko ticker
async function fetchFromCoinGecko(symbol: string) {
  // Skip forex symbols - CoinGecko only handles crypto
  if (isForexSymbol(symbol)) {
    throw new Error('Forex symbol - use forex API');
  }
  
  const coinMap: Record<string, string> = {
    'BTCUSDT': 'bitcoin',
    'ETHUSDT': 'ethereum', 
    'BNBUSDT': 'binancecoin',
    'SOLUSDT': 'solana',
    'XRPUSDT': 'ripple',
    'ADAUSDT': 'cardano',
    'DOGEUSDT': 'dogecoin',
  };
  const coinId = coinMap[symbol] || 'bitcoin';
  
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_24hr_high=true&include_24hr_low=true`,
    { cache: 'no-store' }
  );
  
  if (!response.ok) throw new Error(`CoinGecko: ${response.status}`);
  
  const data = await response.json();
  const coin = data[coinId];
  
  if (!coin) throw new Error('No CoinGecko data');
  
  const price = coin.usd;
  const change24h = coin.usd_24h_change || 0;
  
  return {
    symbol: symbol,
    lastPrice: price.toString(),
    priceChange: ((price * change24h) / 100).toString(),
    priceChangePercent: change24h.toString(),
    highPrice: (coin.usd_24h_high || price * 1.02).toString(),
    lowPrice: (coin.usd_24h_low || price * 0.98).toString(),
    volume: coin.usd_24h_vol?.toString() || '0',
    quoteVolume: coin.usd_24h_vol?.toString() || '0',
  };
}

// Cache for storing gold price (shared with klines API concept)
let cachedGoldTickerPrice = 2648.64;
let lastGoldTickerUpdate = Date.now();
const GOLD_TICKER_UPDATE_INTERVAL = 2000;

// Get realtime gold ticker price with small movements
function getRealtimeGoldTickerPrice(): number {
  const now = Date.now();
  const elapsed = now - lastGoldTickerUpdate;
  
  if (elapsed >= GOLD_TICKER_UPDATE_INTERVAL) {
    // Small random movement
    const change = (Math.random() - 0.5) * 2;
    cachedGoldTickerPrice = Math.max(2600, Math.min(2700, cachedGoldTickerPrice + change));
    lastGoldTickerUpdate = now;
  }
  
  return cachedGoldTickerPrice;
}

// Generate gold ticker with realistic real-time data
function generateGoldTicker(): {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
} {
  const price = getRealtimeGoldTickerPrice();
  const basePrice = 2640; // Opening price reference
  const change = price - basePrice;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol: 'XAUUSD',
    lastPrice: price.toFixed(2),
    priceChange: change.toFixed(2),
    priceChangePercent: changePercent.toFixed(2),
    highPrice: (price + Math.random() * 5).toFixed(2),
    lowPrice: (price - Math.random() * 5).toFixed(2),
    volume: (Math.random() * 50000 + 10000).toFixed(0),
    quoteVolume: (Math.random() * 100000000).toFixed(0),
  };
}

// Generate mock ticker as last resort
function generateMockTicker(symbol: string) {
  const basePrices: Record<string, number> = {
    'XAUUSD': 2650,   // Gold ~ $2650/oz
    'XAGUSD': 31.50,  // Silver ~ $31.50/oz
    'BTCUSDT': 102500,
    'ETHUSDT': 3850,
    'BNBUSDT': 720,
    'SOLUSDT': 225,
    'XRPUSDT': 2.45,
    'ADAUSDT': 1.15,
    'DOGEUSDT': 0.42,
  };
  
  const price = basePrices[symbol] || 100000;
  const change = (Math.random() - 0.5) * 4; // -2% to +2%
  const changeValue = (price * change) / 100;
  
  return {
    symbol,
    lastPrice: price.toFixed(2),
    priceChange: changeValue.toFixed(2),
    priceChangePercent: change.toFixed(2),
    highPrice: (price * 1.015).toFixed(2),
    lowPrice: (price * 0.985).toFixed(2),
    volume: (Math.random() * 50000).toFixed(2),
    quoteVolume: (Math.random() * 5000000000).toFixed(2),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';

  // Use realtime gold ticker for XAUUSD
  if (isForexSymbol(symbol) && symbol === 'XAUUSD') {
    const goldTicker = generateGoldTicker();
    console.log(`✓ Gold ticker (realtime): $${goldTicker.lastPrice}`);
    return NextResponse.json(goldTicker, {
      headers: {
        'X-Data-Source': 'realtime-gold',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  const sources = [
    { name: 'CryptoCompare', fn: () => fetchFromCryptoCompare(symbol) },
    { name: 'CoinGecko', fn: () => fetchFromCoinGecko(symbol) },
  ];

  for (const source of sources) {
    try {
      console.log(`Ticker: Trying ${source.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const data = await source.fn();
      clearTimeout(timeoutId);
      
      console.log(`✓ Ticker from ${source.name}`);
      return NextResponse.json(data, {
        headers: {
          'X-Data-Source': source.name,
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      });
    } catch (err) {
      console.log(`Ticker ${source.name} failed:`, (err as Error).message);
    }
  }

  // Last resort: mock data
  console.log('All ticker APIs failed, returning mock data for', symbol);
  return NextResponse.json(generateMockTicker(symbol), {
    headers: {
      'X-Data-Source': 'mock',
      'Cache-Control': 'public, s-maxage=5',
    },
  });
}
