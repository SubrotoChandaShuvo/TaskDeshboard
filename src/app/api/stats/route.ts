import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { TaskStats } from '@/types/task';

export async function GET() {
  try {
    const statsSql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'TODO')::int AS todo,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE priority IN ('HIGH', 'URGENT') AND status != 'COMPLETED')::int AS high_priority,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'COMPLETED')::int AS overdue
      FROM tasks;
    `;

    const result = await query(statsSql);
    const row = result.rows[0];

    const stats: TaskStats = {
      total: row.total || 0,
      todo: row.todo || 0,
      inProgress: row.in_progress || 0,
      completed: row.completed || 0,
      highPriority: row.high_priority || 0,
      overdue: row.overdue || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching task stats from PostgreSQL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve task statistics',
        details: { database: (error as Error).message },
      },
      { status: 500 }
    );
  }
}
