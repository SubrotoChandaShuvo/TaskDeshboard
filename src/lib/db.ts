import { Pool, QueryResult, QueryResultRow } from 'pg';
import { Task } from '@/types/task';

// Parse DATABASE_URL or use fallback
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password123@localhost:5432/taskdb';

// Ensure single pool instance across Next.js hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool =
  global.__pgPool ||
  new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool;
}

let isInitialized = false;

/**
 * Initializes the database schema if the table does not exist yet.
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) return;

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      description TEXT DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'TODO',
      priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
      due_date TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
  `;

  try {
    const client = await pool.connect();
    try {
      await client.query(createTableQuery);
      isInitialized = true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
    throw err;
  }
}

/**
 * Executes a parameterized query on the PostgreSQL pool.
 */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> {
  await initDatabase();
  return pool.query<R>(text, params);
}

/**
 * Helper to map a raw database row to a clean TypeScript Task interface.
 */
export function mapRowToTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description || ''),
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    dueDate: row.due_date ? new Date(row.due_date as string | Date).toISOString() : null,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  };
}

export default pool;
