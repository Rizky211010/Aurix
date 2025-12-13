import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:8000';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BOT_API_URL}/api/bot/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Bot config error:', error);
    return NextResponse.json(
      { error: 'Failed to update config', details: (error as Error).message },
      { status: 503 }
    );
  }
}
