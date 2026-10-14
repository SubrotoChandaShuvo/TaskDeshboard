import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const startTime = Date.now();
    const result = await query('SELECT NOW() AS server_time, version();');
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latencyMs,
      serverTime: result.rows[0].server_time,
      dbVersion: result.rows[0].version,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: (error as Error).message,
      },
      { status: 503 }
    );
  }
}
