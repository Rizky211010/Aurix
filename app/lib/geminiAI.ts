/**
 * Gemini AI Engine for Trading Analysis
 * 
 * Menggunakan Google Gemini API sebagai otak analisis trading.
 * AI HANYA menganalisis data yang dikirim dari frontend (chart realtime).
 */

const GEMINI_API_KEY = 'AIzaSyDtuKH8iGAnRE-cXr1d5xbgn6vEyX8hOCA';
// Using gemini-2.0-flash-exp model (confirmed working, has free tier)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Types for AI Analysis
export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketStructure {
  swings: Array<{
    type: 'HH' | 'HL' | 'LH' | 'LL';
    price: number;
    time: number;
  }>;
  breaks: Array<{
    type: 'BOS' | 'CHOCH';
    direction: 'bullish' | 'bearish';
    price: number;
    time: number;
  }>;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface ZoneData {
  type: 'supply' | 'demand';
  top: number;
  bottom: number;
  strength: number;
  status: 'fresh' | 'tested' | 'mitigated';
}

export interface PatternData {
  name: string;
  type: 'bullish' | 'bearish';
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  time: number;
}

export interface AIAnalysisRequest {
  symbol: string;
  timeframe: string;
  candles: CandleData[];
  currentPrice: number;
  structure?: MarketStructure;
  zones?: ZoneData[];
  patterns?: PatternData[];
}

export interface AIAnalysisResponse {
  signal: 'BUY' | 'SELL' | 'WAIT';
  validity_score: number;
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  entry: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  rrr: string;
  reason: string[];
  risk_warning: string;
  structure_valid: boolean;
  zone_quality: 'Weak' | 'Moderate' | 'Strong' | 'Extreme';
  pattern_reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  analysis: {
    trend: string;
    support_resistance: string;
    pattern: string;
    momentum: string;
    volume: string;
    confluence: string;
  };
}

/**
 * Build the prompt for Gemini AI
 */
function buildAnalysisPrompt(data: AIAnalysisRequest): string {
  const lastCandles = data.candles.slice(-20);
  const currentCandle = lastCandles[lastCandles.length - 1];
  
  // Format candle data
  const candleText = lastCandles.map((c, i) => 
    `[${i + 1}] O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)} V:${c.volume?.toFixed(0) || 'N/A'}`
  ).join('\n');

  // Format structure
  const structureText = data.structure ? `
Swing Points: ${data.structure.swings.map(s => `${s.type}@${s.price.toFixed(2)}`).join(', ')}
Breaks: ${data.structure.breaks.map(b => `${b.type} ${b.direction}@${b.price.toFixed(2)}`).join(', ')}
Current Trend: ${data.structure.trend}
` : 'No structure data';

  // Format zones
  const zonesText = data.zones && data.zones.length > 0 ? data.zones.map(z => 
    `${z.type.toUpperCase()}: ${z.bottom.toFixed(2)}-${z.top.toFixed(2)} (${z.status}, strength:${z.strength})`
  ).join('\n') : 'No zones detected';

  // Format patterns
  const patternsText = data.patterns && data.patterns.length > 0 ? data.patterns.map(p =>
    `${p.name} (${p.type}, ${p.reliability})`
  ).join(', ') : 'No patterns detected';

  return `You are an expert trading analyst AI. Analyze the following market data and provide a trading signal.

=== MARKET DATA ===
Symbol: ${data.symbol}
Timeframe: ${data.timeframe}
Current Price: ${data.currentPrice.toFixed(2)}

=== LAST 20 CANDLES (OHLCV) ===
${candleText}

=== MARKET STRUCTURE ===
${structureText}

=== SUPPLY & DEMAND ZONES ===
${zonesText}

=== DETECTED PATTERNS ===
${patternsText}

=== ANALYSIS RULES ===
1. Only use the provided data - DO NOT make up prices
2. Signal must be based on CLOSED candles only
3. Entry must be near current price (within 0.5% for crypto, 0.2% for forex/gold)
4. Stop loss must be at logical structure levels
5. Take profit must have minimum 1:1.5 RRR
6. If no clear setup, return WAIT signal
7. Validity score: 0-100 based on confluence factors

=== REQUIRED OUTPUT FORMAT (JSON ONLY) ===
{
  "signal": "BUY" | "SELL" | "WAIT",
  "validity_score": <number 0-100>,
  "trend": "Bullish" | "Bearish" | "Neutral",
  "entry": <number - exact price>,
  "stop_loss": <number - exact price>,
  "take_profit_1": <number - exact price>,
  "take_profit_2": <number - exact price>,
  "rrr": "<string like '1:2.5'>",
  "reason": [
    "<string - reason 1>",
    "<string - reason 2>",
    "<string - reason 3>"
  ],
  "risk_warning": "<string - risk warning message>",
  "structure_valid": <boolean>,
  "zone_quality": "Weak" | "Moderate" | "Strong" | "Extreme",
  "pattern_reliability": "HIGH" | "MEDIUM" | "LOW",
  "analysis": {
    "trend": "<detailed trend analysis>",
    "support_resistance": "<S/R levels analysis>",
    "pattern": "<pattern analysis>",
    "momentum": "<momentum/RSI analysis>",
    "volume": "<volume analysis>",
    "confluence": "<confluence score explanation>"
  }
}

RESPOND WITH VALID JSON ONLY. NO MARKDOWN, NO EXPLANATION BEFORE OR AFTER.`;
}

/**
 * Call Gemini AI API
 */
export async function analyzeWithGemini(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const prompt = buildAnalysisPrompt(data);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract text from response
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse JSON
    let cleanJson = textContent.trim();
    
    // Remove markdown code blocks if present
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const aiResponse: AIAnalysisResponse = JSON.parse(cleanJson);
    
    // Validate response
    if (!aiResponse.signal || !['BUY', 'SELL', 'WAIT'].includes(aiResponse.signal)) {
      throw new Error('Invalid signal in AI response');
    }

    return aiResponse;

  } catch (error) {
    console.error('Gemini analysis error:', error);
    
    // Return WAIT signal on error with explanation
    return {
      signal: 'WAIT',
      validity_score: 0,
      trend: 'Neutral',
      entry: data.currentPrice,
      stop_loss: data.currentPrice * 0.99,
      take_profit_1: data.currentPrice * 1.01,
      take_profit_2: data.currentPrice * 1.02,
      rrr: '1:1',
      reason: ['AI analysis temporarily unavailable', 'Using conservative WAIT signal'],
      risk_warning: 'Do not trade - AI analysis failed. Wait for next candle.',
      structure_valid: false,
      zone_quality: 'Weak',
      pattern_reliability: 'LOW',
      analysis: {
        trend: 'Unable to analyze - AI error',
        support_resistance: 'Unable to analyze',
        pattern: 'Unable to analyze',
        momentum: 'Unable to analyze',
        volume: 'Unable to analyze',
        confluence: 'Unable to analyze',
      },
    };
  }
}

/**
 * Quick validation of zones using AI
 */
export async function validateZonesWithAI(
  zones: ZoneData[],
  currentPrice: number,
  candles: CandleData[]
): Promise<{ validZones: ZoneData[]; analysis: string }> {
  const prompt = `Analyze these Supply/Demand zones for ${currentPrice.toFixed(2)}:
${zones.map(z => `${z.type}: ${z.bottom}-${z.top} (${z.status})`).join('\n')}

Last 5 candles: ${candles.slice(-5).map(c => `${c.close.toFixed(2)}`).join(', ')}

Rate each zone 1-10 and explain. Return JSON: { "ratings": [{"index": 0, "score": 8, "valid": true}], "analysis": "..." }`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    const validZones = zones.filter((_, i) => 
      parsed.ratings?.find((r: { index: number; valid: boolean }) => r.index === i)?.valid
    );

    return { validZones, analysis: parsed.analysis || 'No analysis' };
  } catch {
    return { validZones: zones, analysis: 'AI validation unavailable' };
  }
}

/**
 * Validate market structure with AI
 */
export async function validateStructureWithAI(
  structure: MarketStructure,
  candles: CandleData[]
): Promise<{ valid: boolean; confidence: number; analysis: string }> {
  const prompt = `Validate this market structure:
Trend: ${structure.trend}
Swings: ${structure.swings.map(s => `${s.type}@${s.price}`).join(', ')}
Breaks: ${structure.breaks.map(b => `${b.type}(${b.direction})`).join(', ')}

Is this structure valid for trading? Return JSON: { "valid": boolean, "confidence": 0-100, "analysis": "..." }`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    });

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { valid: true, confidence: 50, analysis: 'AI validation unavailable' };
  }
}
