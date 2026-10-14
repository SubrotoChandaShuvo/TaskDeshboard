import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Load .env
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

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sampleTasks = [
  {
    id: 'task_arch_001',
    title: 'Design PostgreSQL Schema with Composite Indexes',
    description: 'Structure tasks table with UUID primary key, status & priority indexes, and audit timestamps for high-throughput querying.',
    status: 'COMPLETED',
    priority: 'HIGH',
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    id: 'task_api_002',
    title: 'Implement RESTful CRUD Endpoints with Parameterized SQL',
    description: 'Create POST, GET, PUT, PATCH, and DELETE routes protected against SQL injection using pg parameterization.',
    status: 'COMPLETED',
    priority: 'URGENT',
    dueDate: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task_auth_003',
    title: 'Implement JWT Token Refresh Rotation & Rate Limiting',
    description: 'Add sliding window rate limiting on authentication routes and secure HTTP-only cookie handling.',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days ahead
  },
  {
    id: 'task_ui_004',
    title: 'Develop Glassmorphism Dashboard UI & Responsive Layout',
    description: 'Build responsive task cards, aggregate metric counters, and collapsible filter drawer for desktop and mobile viewports.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
  },
  {
    id: 'task_perf_005',
    title: 'Optimize Database Connection Pool Configuration',
    description: 'Configure max pool size, connection timeouts, and SSL parameters for resilient PostgreSQL serverless connectivity.',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  },
  {
    id: 'task_docs_006',
    title: 'Write Comprehensive Engineering README & Setup Guide',
    description: 'Document database schema DDL, environment variables (.env.example), REST API contract, and local testing instructions.',
    status: 'TODO',
    priority: 'LOW',
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Clearing existing sample tasks...');
    await client.query("DELETE FROM tasks WHERE id LIKE 'task_%' OR id LIKE 'test_%';");

    console.log('Inserting production-grade sample tasks...');
    for (const t of sampleTasks) {
      await client.query(
        `INSERT INTO tasks (id, title, description, status, priority, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE 
         SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, priority = EXCLUDED.priority, due_date = EXCLUDED.due_date;`,
        [t.id, t.title, t.description, t.status, t.priority, t.dueDate]
      );
      console.log(` - Inserted: ${t.title} [${t.status}] (${t.priority})`);
    }

    const countRes = await client.query('SELECT count(*) FROM tasks;');
    console.log(`\nSeed successful! Total tasks now in PostgreSQL: ${countRes.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
