import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Load .env manually for standalone scripts
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...values] = trimmed.split('=');
    let val = values.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = val;
    }
  }
}

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password123@localhost:5432/taskdb';

console.log('Connecting to PostgreSQL database...');

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('PostgreSQL connected successfully.');
    
    console.log('Creating tasks table if not exists...');
    await client.query(`
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
    `);

    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tasks'
      ORDER BY ordinal_position;
    `);

    console.log('Table "tasks" verified with columns:');
    res.rows.forEach(col => {
      console.log(` - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    const countRes = await client.query('SELECT count(*) FROM tasks;');
    console.log(`Current task row count: ${countRes.rows[0].count}`);

    console.log('Database initialization complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
