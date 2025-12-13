import { NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:8000';

export async function POST() {
  try {
    const response = await fetch(`${BOT_API_URL}/api/bot/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Bot stop error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to bot server', details: (error as Error).message },
      { status: 503 }
    );
  }
}
