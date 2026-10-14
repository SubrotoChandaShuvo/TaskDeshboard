import { NextRequest, NextResponse } from 'next/server';
import { query, mapRowToTask } from '@/lib/db';
import { validateCreateTask } from '@/lib/validation';
import { Task } from '@/types/task';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const status = searchParams.get('status') || 'ALL';
    const priority = searchParams.get('priority') || 'ALL';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = (searchParams.get('order') || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Search filter
    if (search.trim()) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Status filter
    if (status !== 'ALL' && ['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Priority filter
    if (priority !== 'ALL' && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      conditions.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Safe column mapping for sort
    let sortColumn = 'created_at';
    if (sortBy === 'dueDate') {
      // Put NULL due dates at the end
      sortColumn = `due_date IS NULL, due_date`;
    } else if (sortBy === 'priority') {
      sortColumn = `CASE priority 
        WHEN 'URGENT' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
        ELSE 5 END`;
    } else if (sortBy === 'title') {
      sortColumn = 'LOWER(title)';
    } else {
      sortColumn = 'created_at';
    }

    const sql = `
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
    `;

    const result = await query(sql, values);
    const tasks: Task[] = result.rows.map(mapRowToTask);

    return NextResponse.json({
      success: true,
      tasks,
      total: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching tasks from PostgreSQL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks from database',
        details: { database: (error as Error).message },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload in request body',
        },
        { status: 400 }
      );
    }

    const validation = validateCreateTask(body);
    if (!validation.isValid || !validation.sanitizedData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const { title, description, status, priority, dueDate } = validation.sanitizedData;
    const id = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();

    const insertSql = `
      INSERT INTO tasks (id, title, description, status, priority, due_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      id,
      title,
      description || '',
      status,
      priority,
      dueDate ? new Date(dueDate) : null,
      now,
      now,
    ]);

    const createdTask = mapRowToTask(result.rows[0]);

    return NextResponse.json(
      {
        success: true,
        message: 'Task created successfully',
        task: createdTask,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating task in PostgreSQL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task in database',
        details: { database: (error as Error).message },
      },
      { status: 500 }
    );
  }
}
