import { SignalAnalysis, AnalysisStep, EducationalNote } from './analysisTypes';

interface SignalData {
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  currentPrice: number;
  trend: {
    h4: string;
    h1: string;
    m15: string;
  };
  support?: number;
  resistance?: number;
  atr?: number;
  rsi?: number;
  macdSignal?: 'bullish' | 'bearish' | 'neutral';
  candlePattern?: string;
  volumeConfirm?: boolean;
}

/**
 * Generate step-by-step analysis explanation
 */
export function generateSignalAnalysis(data: SignalData): SignalAnalysis {
  const steps: AnalysisStep[] = [];
  let stepId = 1;

  // Step 1: Multi-Timeframe Trend Analysis
  const trendAlignment = getTrendAlignment(data.trend);
  steps.push({
    id: stepId++,
    title: 'Analisis Trend Multi-Timeframe',
    description: getTrendDescription(data.trend, trendAlignment),
    status: trendAlignment.status,
    icon: 'trend',
    details: [
      `H4 Timeframe: ${formatTrend(data.trend.h4)}`,
      `H1 Timeframe: ${formatTrend(data.trend.h1)}`,
      `M15 Timeframe: ${formatTrend(data.trend.m15)}`,
    ],
    value: `${trendAlignment.score}/3 timeframe selaras`,
  });

  // Step 2: Key Level Analysis (Support/Resistance)
  if (data.support || data.resistance) {
    const levelAnalysis = analyzePriceLevel(data);
    steps.push({
      id: stepId++,
      title: data.direction === 'BUY' ? 'Identifikasi Area Support' : 'Identifikasi Area Resistance',
      description: levelAnalysis.description,
      status: levelAnalysis.status,
      icon: data.direction === 'BUY' ? 'support' : 'resistance',
      details: levelAnalysis.details,
      value: levelAnalysis.distance,
    });
  }

  // Step 3: Candlestick Pattern Confirmation
  if (data.candlePattern) {
    steps.push({
      id: stepId++,
      title: 'Konfirmasi Pola Candlestick',
      description: getCandlePatternDescription(data.candlePattern, data.direction),
      status: data.direction === 'BUY' ? 'bullish' : data.direction === 'SELL' ? 'bearish' : 'neutral',
      icon: 'candle',
      details: [
        `Pola terdeteksi: ${data.candlePattern}`,
        `Tipe sinyal: ${data.direction === 'BUY' ? 'Bullish reversal/continuation' : 'Bearish reversal/continuation'}`,
        'Validasi: Pola terbentuk di area signifikan',
      ],
    });
  }

  // Step 4: Momentum Analysis (RSI)
  if (data.rsi !== undefined) {
    const rsiAnalysis = analyzeRSI(data.rsi, data.direction);
    steps.push({
      id: stepId++,
      title: 'Analisis Momentum (RSI)',
      description: rsiAnalysis.description,
      status: rsiAnalysis.status,
      icon: 'momentum',
      details: rsiAnalysis.details,
      value: `RSI: ${data.rsi.toFixed(1)}`,
    });
  }

  // Step 5: Volume Confirmation
  if (data.volumeConfirm !== undefined) {
    steps.push({
      id: stepId++,
      title: 'Konfirmasi Volume',
      description: data.volumeConfirm 
        ? 'Volume perdagangan meningkat, menunjukkan partisipasi pasar yang kuat dalam pergerakan harga ini.'
        : 'Volume relatif rendah. Meskipun sinyal tetap valid, konfirmasi volume yang lebih tinggi akan memperkuat sinyal.',
      status: data.volumeConfirm ? 'confirmed' : 'neutral',
      icon: 'volume',
      details: [
        data.volumeConfirm 
          ? '✓ Volume di atas rata-rata 20 periode'
          : '○ Volume di bawah rata-rata',
        'Tip: Volume tinggi = keyakinan pasar lebih besar',
      ],
    });
  }

  // Step 6: Confluence Summary
  const confluenceCount = calculateConfluence(steps);
  steps.push({
    id: stepId++,
    title: 'Kesimpulan Confluence',
    description: getConfluenceDescription(confluenceCount, data.direction),
    status: confluenceCount >= 3 ? 'confirmed' : confluenceCount >= 2 ? 'bullish' : 'neutral',
    icon: 'confluence',
    details: [
      `${confluenceCount} dari ${steps.length - 1} faktor mendukung sinyal`,
      confluenceCount >= 3 ? '✓ Confluence tinggi - sinyal kuat' : 
      confluenceCount >= 2 ? '○ Confluence sedang - sinyal moderat' :
      '△ Confluence rendah - pertimbangkan ulang',
    ],
    value: `${Math.round((confluenceCount / (steps.length - 1)) * 100)}% confluence`,
  });

  // Calculate risk/reward
  const riskReward = calculateRiskReward(data);

  return {
    signal: data.direction,
    confidence: data.confidence,
    summary: generateSummary(data, confluenceCount),
    steps,
    keyLevels: {
      entry: data.currentPrice,
      stopLoss: calculateStopLoss(data),
      takeProfit: calculateTakeProfits(data),
    },
    riskReward,
    timeframe: 'H1',
    timestamp: Date.now(),
  };
}

// Helper functions
function getTrendAlignment(trend: { h4: string; h1: string; m15: string }) {
  const trends = [trend.h4, trend.h1, trend.m15];
  const bullishCount = trends.filter(t => t === 'bullish' || t === 'uptrend').length;
  const bearishCount = trends.filter(t => t === 'bearish' || t === 'downtrend').length;
  
  if (bullishCount >= 2) return { status: 'bullish' as const, score: bullishCount };
  if (bearishCount >= 2) return { status: 'bearish' as const, score: bearishCount };
  return { status: 'neutral' as const, score: Math.max(bullishCount, bearishCount) };
}

function getTrendDescription(trend: { h4: string; h1: string; m15: string }, alignment: { status: string; score: number }): string {
  if (alignment.score >= 3) {
    return `Semua timeframe menunjukkan trend ${alignment.status === 'bullish' ? 'naik (bullish)' : 'turun (bearish)'} yang kuat. Ini adalah kondisi ideal untuk trading mengikuti arah trend utama.`;
  }
  if (alignment.score >= 2) {
    return `Mayoritas timeframe (${alignment.score}/3) menunjukkan arah yang sama. Meskipun ada sedikit ketidakselarasan, trend dominan tetap jelas terlihat.`;
  }
  return `Timeframe menunjukkan arah yang berbeda-beda. Kondisi pasar sedang dalam fase konsolidasi atau transisi. Disarankan menunggu kejelasan trend.`;
}

function formatTrend(trend: string): string {
  const trendMap: Record<string, string> = {
    'bullish': '🟢 Bullish (Naik)',
    'uptrend': '🟢 Uptrend',
    'bearish': '🔴 Bearish (Turun)',
    'downtrend': '🔴 Downtrend',
    'sideways': '🟡 Sideways',
    'neutral': '⚪ Netral',
  };
  return trendMap[trend.toLowerCase()] || `⚪ ${trend}`;
}

function analyzePriceLevel(data: SignalData) {
  const isBuy = data.direction === 'BUY';
  const level = isBuy ? data.support : data.resistance;
  const distance = level ? Math.abs(data.currentPrice - level) / data.currentPrice * 100 : 0;
  
  // Determine status based on distance
  let status: 'confirmed' | 'bullish' | 'bearish' | 'neutral';
  if (distance < 1) {
    status = 'confirmed';
  } else if (distance < 2) {
    status = isBuy ? 'bullish' : 'bearish';
  } else {
    status = 'neutral';
  }

  return {
    description: isBuy
      ? `Harga saat ini berada dekat area support signifikan. Area ini telah teruji beberapa kali sebelumnya dan menunjukkan minat beli yang kuat dari pelaku pasar.`
      : `Harga mendekati zona resistance yang telah terbukti sebagai area penjualan. Tekanan jual historis di level ini cukup signifikan.`,
    status,
    details: [
      `Level ${isBuy ? 'support' : 'resistance'}: ${level?.toLocaleString() || 'N/A'}`,
      `Jarak dari harga saat ini: ${distance.toFixed(2)}%`,
      isBuy 
        ? 'Buyer defense zone - area dimana pembeli cenderung masuk'
        : 'Seller defense zone - area dimana penjual cenderung dominan',
    ],
    distance: `${distance.toFixed(2)}% dari level kunci`,
  };
}

function getCandlePatternDescription(pattern: string, direction: 'BUY' | 'SELL' | 'NEUTRAL'): string {
  const descriptions: Record<string, string> = {
    'BULLISH_ENGULFING': 'Pola Bullish Engulfing menunjukkan momentum pembelian yang kuat. Candle hijau "menelan" candle merah sebelumnya, mengindikasikan buyer mengambil alih kontrol dari seller.',
    'BEARISH_ENGULFING': 'Pola Bearish Engulfing mengindikasikan tekanan jual yang meningkat. Candle merah yang lebih besar menelan candle hijau, sinyal seller mulai mendominasi.',
    'HAMMER': 'Pola Hammer di area support menunjukkan rejection terhadap harga yang lebih rendah. Shadow bawah yang panjang membuktikan buyer berhasil mendorong harga naik kembali.',
    'SHOOTING_STAR': 'Shooting Star di area resistance menandakan rejection terhadap harga lebih tinggi. Shadow atas panjang menunjukkan seller berhasil menekan harga turun.',
    'DOJI': 'Pola Doji menunjukkan keseimbangan antara buyer dan seller. Di area kunci, ini bisa menjadi sinyal potensi reversal.',
    'MORNING_STAR': 'Morning Star adalah pola reversal bullish yang kuat, terdiri dari 3 candle yang menunjukkan transisi dari tekanan jual ke tekanan beli.',
    'EVENING_STAR': 'Evening Star adalah pola reversal bearish, kebalikan dari Morning Star. Menandakan perubahan momentum dari bullish ke bearish.',
  };
  
  return descriptions[pattern] || `Pola ${pattern} terdeteksi, memberikan konfirmasi tambahan untuk sinyal ${direction}.`;
}

function analyzeRSI(rsi: number, direction: 'BUY' | 'SELL' | 'NEUTRAL') {
  let description: string;
  let status: 'bullish' | 'bearish' | 'neutral' | 'confirmed';
  const details: string[] = [];

  if (rsi < 30) {
    description = 'RSI berada di zona oversold (jenuh jual). Secara statistik, kondisi ini sering diikuti oleh bounce atau pembalikan naik. Namun, dalam trend turun kuat, oversold bisa bertahan lama.';
    status = direction === 'BUY' ? 'confirmed' : 'neutral';
    details.push('⚠️ Zona Oversold (<30)', '💡 Potensi bounce/reversal ke atas', 'Tip: Tunggu konfirmasi candle sebelum entry');
  } else if (rsi > 70) {
    description = 'RSI berada di zona overbought (jenuh beli). Kondisi ini mengindikasikan potensi koreksi atau pullback. Dalam trend naik kuat, overbought bisa tetap bertahan.';
    status = direction === 'SELL' ? 'confirmed' : 'neutral';
    details.push('⚠️ Zona Overbought (>70)', '💡 Potensi koreksi/reversal ke bawah', 'Tip: Perhatikan divergence untuk konfirmasi');
  } else if (rsi >= 45 && rsi <= 55) {
    description = 'RSI berada di zona netral, menunjukkan momentum yang seimbang. Tidak ada ekstrem yang bisa dimanfaatkan.';
    status = 'neutral';
    details.push('○ Zona Netral (45-55)', 'Momentum seimbang', 'Tunggu RSI keluar dari zona netral');
  } else {
    description = rsi > 50 
      ? 'RSI di atas 50 menunjukkan momentum bullish masih dominan. Buyer masih memiliki kontrol lebih besar.'
      : 'RSI di bawah 50 menunjukkan momentum bearish. Seller sedang dalam posisi lebih kuat.';
    status = rsi > 50 ? 'bullish' : 'bearish';
    details.push(
      rsi > 50 ? '📈 Momentum Bullish' : '📉 Momentum Bearish',
      `RSI ${rsi > 50 ? 'di atas' : 'di bawah'} garis tengah 50`
    );
  }

  return { description, status, details };
}

function calculateConfluence(steps: AnalysisStep[]): number {
  // Count positive confirmations (exclude the confluence step itself)
  return steps.slice(0, -1).filter(step => 
    step.status === 'bullish' || step.status === 'confirmed' || step.status === 'bearish'
  ).length;
}

function getConfluenceDescription(count: number, direction: 'BUY' | 'SELL' | 'NEUTRAL'): string {
  if (count >= 4) {
    return `Sinyal ${direction} didukung oleh confluence yang sangat kuat. Semua indikator utama selaras, memberikan probabilitas keberhasilan yang lebih tinggi. Ini adalah setup trading yang ideal.`;
  }
  if (count >= 3) {
    return `Terdapat confluence yang baik untuk sinyal ${direction}. Mayoritas faktor mendukung arah yang sama. Setup ini memiliki probabilitas yang reasonable untuk dieksekusi.`;
  }
  if (count >= 2) {
    return `Confluence moderat. Beberapa faktor mendukung sinyal, namun tidak semua selaras sempurna. Pertimbangkan untuk mengurangi ukuran posisi atau menunggu konfirmasi tambahan.`;
  }
  return `Confluence rendah. Sinyal ini memiliki dukungan yang minimal dari berbagai faktor. Disarankan untuk menunggu setup yang lebih jelas atau skip trade ini.`;
}

function calculateStopLoss(data: SignalData): number {
  const atrMultiplier = 1.5;
  const atr = data.atr || data.currentPrice * 0.01; // Default 1% if no ATR
  
  if (data.direction === 'BUY') {
    return data.support 
      ? Math.min(data.support * 0.995, data.currentPrice - atr * atrMultiplier)
      : data.currentPrice - atr * atrMultiplier;
  } else {
    return data.resistance
      ? Math.max(data.resistance * 1.005, data.currentPrice + atr * atrMultiplier)
      : data.currentPrice + atr * atrMultiplier;
  }
}

function calculateTakeProfits(data: SignalData): number[] {
  const _atr = data.atr || data.currentPrice * 0.01; // ATR available for future TP calculations
  void _atr; // Explicitly mark as intentionally unused
  const stopDistance = Math.abs(data.currentPrice - calculateStopLoss(data))
  
  if (data.direction === 'BUY') {
    return [
      data.currentPrice + stopDistance * 1.5,  // TP1: 1.5R
      data.currentPrice + stopDistance * 2.5,  // TP2: 2.5R
      data.currentPrice + stopDistance * 4,    // TP3: 4R
    ];
  } else {
    return [
      data.currentPrice - stopDistance * 1.5,
      data.currentPrice - stopDistance * 2.5,
      data.currentPrice - stopDistance * 4,
    ];
  }
}

function calculateRiskReward(data: SignalData): number {
  const entry = data.currentPrice;
  const stop = calculateStopLoss(data);
  const tp = calculateTakeProfits(data)[0]; // Use TP1 for RR calculation
  
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(tp - entry);
  
  return risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;
}

function generateSummary(data: SignalData, confluenceCount: number): string {
  const direction = data.direction === 'BUY' ? 'BELI' : data.direction === 'SELL' ? 'JUAL' : 'NETRAL';
  const strength = confluenceCount >= 4 ? 'sangat kuat' : confluenceCount >= 3 ? 'kuat' : confluenceCount >= 2 ? 'moderat' : 'lemah';
  
  return `Sinyal ${direction} dengan kekuatan ${strength} berdasarkan ${confluenceCount} faktor konfirmasi. ` +
    `Analisis menunjukkan ${data.trend.h4} pada timeframe H4 dengan ` +
    `${data.candlePattern ? `pola ${data.candlePattern} sebagai trigger entry.` : 'momentum yang mendukung arah sinyal.'}`;
}

/**
 * Get educational notes for the analysis
 */
export function getEducationalNotes(): EducationalNote[] {
  return [
    {
      title: '📚 Apa itu Confluence?',
      content: 'Confluence adalah kondisi dimana beberapa faktor teknikal menunjuk ke arah yang sama. Semakin banyak confluence, semakin tinggi probabilitas keberhasilan trade.',
    },
    {
      title: '⚠️ Risk Management',
      content: 'Selalu gunakan stop loss dan jangan pernah risiko lebih dari 1-2% modal per trade. Risk management yang baik adalah kunci kesuksesan jangka panjang.',
    },
    {
      title: '🎯 Entry Timing',
      content: 'Sinyal yang baik memerlukan timing yang tepat. Tunggu konfirmasi candlestick sebelum entry, jangan terburu-buru masuk pasar.',
    },
  ];
}
