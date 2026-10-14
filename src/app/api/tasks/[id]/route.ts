import { NextRequest, NextResponse } from 'next/server';
import { query, mapRowToTask } from '@/lib/db';
import { validateUpdateTask } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const result = await query('SELECT * FROM tasks WHERE id = $1;', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Task with ID "${id}" was not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: mapRowToTask(result.rows[0]),
    });
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve task',
        details: { database: (error as Error).message },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdate(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  return handleUpdate(request, context);
}

async function handleUpdate(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Check if task exists first
    const existing = await query('SELECT * FROM tasks WHERE id = $1;', [id]);
    if (existing.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Task with ID "${id}" does not exist`,
        },
        { status: 404 }
      );
    }

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

    const validation = validateUpdateTask(body);
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

    const data = validation.sanitizedData;
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(data.title);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;
    }

    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(data.priority);
      paramIndex++;
    }

    if (data.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(data.dueDate ? new Date(data.dueDate) : null);
      paramIndex++;
    }

    // Always update updated_at timestamp
    updates.push(`updated_at = NOW()`);

    values.push(id);
    const updateSql = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await query(updateSql, values);
    const updatedTask = mapRowToTask(result.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error updating task in PostgreSQL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task in database',
        details: { database: (error as Error).message },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const result = await query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id, title;',
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Task with ID "${id}" does not exist`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
      deletedId: id,
      deletedTitle: result.rows[0].title,
    });
  } catch (error) {
    console.error('Error deleting task from PostgreSQL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete task from database',
        details: { database: (error as Error).message },
      },
      { status: 500 }
    );
  }
}
