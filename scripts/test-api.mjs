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

const BASE_URL = 'http://localhost:3000';
const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedChecks++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('   TASK MANAGEMENT DASHBOARD - SENIOR REVIEW AUDIT    ');
  console.log('======================================================\n');

  // 1. Health & DB connection
  console.log('>>> 1. Checking API Health & PostgreSQL Connectivity');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
  assert(health.status === 'healthy', 'Health status is "healthy"');
  assert(health.database === 'connected', 'Database reports "connected"');
  console.log(`       PostgreSQL Version: ${health.dbVersion.split('\n')[0]}`);

  // Clean test rows before running tests
  await pool.query("DELETE FROM tasks WHERE id LIKE 'test_%' OR title LIKE '[TEST]%';");

  // 2. Form Validation & Error Handling
  console.log('\n>>> 2. Verifying Form Validation & Error Handling');
  
  // Empty payload
  const emptyRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const emptyJson = await emptyRes.json();
  assert(emptyRes.status === 400, 'Empty POST /api/tasks returns HTTP 400');
  assert(emptyJson.success === false, 'Empty payload returns success: false');
  assert(Boolean(emptyJson.details?.title), 'Empty payload flags missing title error');

  // Title too short
  const shortTitleRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'ab' }),
  });
  const shortJson = await shortTitleRes.json();
  assert(shortTitleRes.status === 400, 'Title < 3 chars returns HTTP 400');
  assert(shortJson.details?.title.includes('at least 3'), 'Returns minimum length message');

  // Invalid status
  const invalidStatusRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Valid Task Title', status: 'NON_EXISTENT' }),
  });
  assert(invalidStatusRes.status === 400, 'Invalid status returns HTTP 400');

  // 3. CRUD: Create Operation
  console.log('\n>>> 3. Verifying CRUD: Create Operation (POST /api/tasks)');
  const task1Payload = {
    title: '[TEST] PostgreSQL Database Indexing',
    description: 'Add composite indexes for status, priority, and due dates',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: '2026-10-25T15:00:00.000Z',
  };
  const create1Res = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task1Payload),
  });
  const create1 = await create1Res.json();
  assert(create1Res.status === 201, 'POST /api/tasks returns HTTP 201 Created');
  assert(create1.success === true, 'Response contains success: true');
  assert(Boolean(create1.task?.id), 'Response returns generated task ID');
  assert(create1.task.title === task1Payload.title, 'Created task title matches');
  const task1Id = create1.task.id;

  const task2Payload = {
    title: '[TEST] Responsive Mobile Navigation Drawer',
    description: 'Ensure filter bar collapses gracefully on small viewport widths',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    dueDate: '2026-10-18T10:00:00.000Z',
  };
  const create2Res = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task2Payload),
  });
  const create2 = await create2Res.json();
  const task2Id = create2.task.id;
  assert(create2Res.status === 201, 'Created second test task');

  const task3Payload = {
    title: '[TEST] TypeScript Strict Compilation Review',
    description: 'Audit codebase for any implicit any types and ensure clean build',
    status: 'COMPLETED',
    priority: 'MEDIUM',
  };
  const create3Res = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task3Payload),
  });
  const create3 = await create3Res.json();
  const task3Id = create3.task.id;
  assert(create3Res.status === 201, 'Created third test task');

  // 4. PostgreSQL Direct Verification (Requirement 2)
  console.log('\n>>> 4. Verifying PostgreSQL Direct Database Storage');
  const dbCheck = await pool.query(
    'SELECT id, title, status, priority FROM tasks WHERE id = $1;',
    [task1Id]
  );
  assert(dbCheck.rowCount === 1, 'Task row verified directly inside PostgreSQL table');
  assert(dbCheck.rows[0].title === task1Payload.title, 'DB row title matches exactly');
  assert(dbCheck.rows[0].status === 'TODO', 'DB row status matches "TODO"');
  assert(dbCheck.rows[0].priority === 'HIGH', 'DB row priority matches "HIGH"');

  // 5. CRUD: Read Operation & Filters/Sorting (Requirement 5)
  console.log('\n>>> 5. Verifying CRUD: Read Operation, Search, Filters & Sorting');
  
  // List all
  const listAllRes = await fetch(`${BASE_URL}/api/tasks`);
  const listAll = await listAllRes.json();
  assert(listAllRes.status === 200, 'GET /api/tasks returns HTTP 200');
  assert(Array.isArray(listAll.tasks), 'Returns array of tasks');
  assert(listAll.tasks.some(t => t.id === task1Id), 'Task 1 present in task list');

  // Search filter
  const searchRes = await fetch(`${BASE_URL}/api/tasks?search=Indexing`);
  const searchData = await searchRes.json();
  assert(searchRes.status === 200, 'Search query returns HTTP 200');
  assert(searchData.tasks.some(t => t.id === task1Id), 'Search by keyword finds matching task');
  assert(!searchData.tasks.some(t => t.id === task2Id), 'Search correctly excludes non-matching tasks');

  // Status filter
  const statusRes = await fetch(`${BASE_URL}/api/tasks?status=IN_PROGRESS`);
  const statusData = await statusRes.json();
  assert(statusData.tasks.every(t => t.status === 'IN_PROGRESS'), 'Status filter returns only IN_PROGRESS tasks');
  assert(statusData.tasks.some(t => t.id === task2Id), 'Task 2 found in IN_PROGRESS filter');

  // Priority filter
  const priorityRes = await fetch(`${BASE_URL}/api/tasks?priority=URGENT`);
  const priorityData = await priorityRes.json();
  assert(priorityData.tasks.every(t => t.priority === 'URGENT'), 'Priority filter returns only URGENT tasks');
  assert(priorityData.tasks.some(t => t.id === task2Id), 'Task 2 found in URGENT filter');

  // Sorting
  const sortRes = await fetch(`${BASE_URL}/api/tasks?sortBy=title&order=asc`);
  const sortData = await sortRes.json();
  assert(sortRes.status === 200, 'Sort query returns HTTP 200');
  const testTitles = sortData.tasks.filter(t => t.title.startsWith('[TEST]')).map(t => t.title);
  const sortedTitles = [...testTitles].sort((a, b) => a.localeCompare(b));
  assert(JSON.stringify(testTitles) === JSON.stringify(sortedTitles), 'Tasks sorted alphabetically by title');

  // 6. CRUD: Read Single Task
  console.log('\n>>> 6. Verifying CRUD: Read Single Task (GET /api/tasks/:id)');
  const singleRes = await fetch(`${BASE_URL}/api/tasks/${task1Id}`);
  const singleData = await singleRes.json();
  assert(singleRes.status === 200, 'GET /api/tasks/:id returns HTTP 200');
  assert(singleData.task.id === task1Id, 'Single task ID matches');

  const notFoundRes = await fetch(`${BASE_URL}/api/tasks/non_existent_id_9999`);
  assert(notFoundRes.status === 404, 'GET with invalid ID returns HTTP 404');

  // 7. CRUD: Update Operation (PUT /api/tasks/:id) & Status Updates (Requirement 7)
  console.log('\n>>> 7. Verifying CRUD: Update Operation & Status Transitions');
  const updatePayload = {
    title: '[TEST] PostgreSQL Database Indexing (Audited)',
    description: 'Updated description after database performance inspection',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
  };
  const updateRes = await fetch(`${BASE_URL}/api/tasks/${task1Id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200, 'PUT /api/tasks/:id returns HTTP 200');
  assert(updateData.task.title === updatePayload.title, 'Updated title matches');
  assert(updateData.task.status === 'IN_PROGRESS', 'Updated status is IN_PROGRESS');

  // Quick Status change via PATCH
  const patchRes = await fetch(`${BASE_URL}/api/tasks/${task1Id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const patchData = await patchRes.json();
  assert(patchRes.status === 200, 'PATCH /api/tasks/:id returns HTTP 200');
  assert(patchData.task.status === 'COMPLETED', 'Status transitioned to COMPLETED');

  // Direct PostgreSQL check for updated state (Requirement 2 & 3)
  const dbUpdated = await pool.query('SELECT status, title FROM tasks WHERE id = $1;', [task1Id]);
  assert(dbUpdated.rows[0].status === 'COMPLETED', 'PostgreSQL DB shows status is COMPLETED');
  assert(dbUpdated.rows[0].title === updatePayload.title, 'PostgreSQL DB shows updated title');

  // 8. CRUD: Delete Operation (Requirement 7)
  console.log('\n>>> 8. Verifying CRUD: Delete Operation (DELETE /api/tasks/:id)');
  const deleteRes = await fetch(`${BASE_URL}/api/tasks/${task3Id}`, {
    method: 'DELETE',
  });
  const deleteData = await deleteRes.json();
  assert(deleteRes.status === 200, 'DELETE /api/tasks/:id returns HTTP 200');
  assert(deleteData.deletedId === task3Id, 'Response confirms deleted ID');

  // Verify deletion directly in PostgreSQL
  const dbDeleted = await pool.query('SELECT * FROM tasks WHERE id = $1;', [task3Id]);
  assert(dbDeleted.rowCount === 0, 'Row permanently deleted from PostgreSQL database');

  // Verify 404 after deletion
  const getDeletedRes = await fetch(`${BASE_URL}/api/tasks/${task3Id}`);
  assert(getDeletedRes.status === 404, 'Subsequent GET returns HTTP 404 Not Found');

  // 9. Stats Aggregation
  console.log('\n>>> 9. Verifying Statistics Aggregation API');
  const statsRes = await fetch(`${BASE_URL}/api/stats`);
  const statsData = await statsRes.json();
  assert(statsRes.status === 200, 'GET /api/stats returns HTTP 200');
  assert(typeof statsData.stats.total === 'number', 'Stats total is a number');
  assert(typeof statsData.stats.completed === 'number', 'Stats completed is a number');

  // Clean up remaining test tasks
  await pool.query("DELETE FROM tasks WHERE id LIKE 'test_%' OR title LIKE '[TEST]%';");
  console.log('\nCleaned up temporary test rows from PostgreSQL.');

  console.log('\n======================================================');
  console.log(` AUDIT SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log('======================================================\n');
}

runTests()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nAUDIT FAILED WITH ERROR:', err);
    await pool.end();
    process.exit(1);
  });
