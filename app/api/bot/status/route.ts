import { NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${BOT_API_URL}/api/bot/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Bot status error:', error);
    return NextResponse.json(
      { 
        state: 'OFFLINE',
        error: 'Bot server is not running',
        details: (error as Error).message 
      },
      { status: 200 } // Return 200 with offline status instead of error
    );
  }
}
