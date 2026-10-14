# TaskFlow — PostgreSQL Task Management Dashboard 📋

A production-ready, full-stack **Task Management Dashboard** built with **Next.js (App Router)**, **React**, **TypeScript**, and **PostgreSQL**. Designed for engineering workflows with persistent storage, real-time filtering, parameterized SQL queries, form validation, and a sleek modern dashboard interface.

## 🔗 Live Deployment (Vercel)
**Production URL:** [https://task-dashboard-ecru-beta.vercel.app](https://task-dashboard-ecru-beta.vercel.app)

---

## 🌟 Key Features & Verification Highlights

1. **Complete RESTful CRUD Operations**:
   - `POST /api/tasks` — Create task with payload validation (Returns `201 Created`).
   - `GET /api/tasks` — Retrieve tasks with search, status filter, priority filter, and sorting (Returns `200 OK`).
   - `GET /api/tasks/:id` — Retrieve a single task by ID (Returns `200 OK` or `404 Not Found`).
   - `PUT /api/tasks/:id` / `PATCH /api/tasks/:id` — Update full task or quick status transitions (Returns `200 OK`).
   - `DELETE /api/tasks/:id` — Delete task from database with confirmation dialog (Returns `200 OK`).
   - `GET /api/stats` — Real-time aggregated statistics directly computed via SQL `COUNT` queries.
   - `GET /api/health` — Database connection health probe and latency monitor.

2. **Real PostgreSQL Database Persistence**:
   - Tasks are stored directly in PostgreSQL (`tasks` table) with composite indexes on `status`, `priority`, and `due_date`.
   - Zero mock data — all data shown in the browser is fetched live from PostgreSQL via the REST API.
   - Changes persist across page reloads and browser restarts.

3. **Multi-Faceted Search, Filters & Sorting**:
   - **Full-Text Search**: Case-insensitive search across task titles and descriptions.
   - **Status Filtering**: Tabs for *All Tasks*, *To Do*, *In Progress*, and *Completed* with live count indicators.
   - **Priority Filtering**: Filter by *Low*, *Medium*, *High*, and *Urgent*.
   - **Multi-Field Sorting**: Sort by *Created Date*, *Due Date (soonest)*, *Priority*, or *Alphabetical Title* (Ascending/Descending).
   - **Quick Reset**: One-click reset button when filters are active.

4. **Validation & Error Handling**:
   - Client-side validation: Required title (3–100 chars), max description length (1000 chars), valid dates.
   - Server-side validation: Re-validates every field and responds with structured `400 Bad Request` and field error messages.
   - Graceful API error banners and toast notifications for network issues or missing resources (`404 Not Found`).

5. **User Experience & Responsiveness**:
   - Delete confirmation modal preventing accidental data loss.
   - Quick one-click status transition dropdown and completion checkbox on every task card.
   - Glassmorphism design system with responsive CSS Grid/Flexbox for mobile and desktop viewports.

---

## 🏗️ Architecture & Tech Stack

* **Frontend**: Next.js 15, React 19, TypeScript, Vanilla CSS Design System with Glassmorphism and CSS Variables.
* **Backend**: Next.js App Router API Routes (`/api/tasks`, `/api/stats`, `/api/health`).
* **Database**: PostgreSQL 16+ / Neon Serverless PostgreSQL with `pg` connection pooling.
* **Data Layer**: Parameterized SQL queries to prevent SQL injection vulnerabilities.

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: `v18.18.0` or higher (Tested on Node `v24.15.0`)
* **npm** or **pnpm**
* **PostgreSQL Database**: Local PostgreSQL instance, Docker container, or cloud NeonDB / Supabase.

### 2. Environment Configuration
Create a `.env` file in the root directory (a pre-configured [.env.example](.env.example) is provided):

```env
# PostgreSQL connection string (supports local, Docker, or Cloud Neon/Supabase)
DATABASE_URL="postgresql://username:password@localhost:5432/taskdb"

# Application Port
PORT=3000

# Node Environment
NODE_ENV=development
```

> **Note:** A live, pre-configured Neon PostgreSQL connection is already set in `.env` for immediate testing.

### 3. Installation
```bash
npm install
```

### 4. Database Setup & Seeding
Initialize the database table and indexes:
```bash
npm run db:init
```

Seed initial sample engineering tasks:
```bash
npm run db:seed
```

### 5. Running the Application

#### Development Mode (with Hot Reloading):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build & Start:
```bash
npm run build
npm run start
```

---

## 🧪 Automated Testing & Verification

A comprehensive automated audit test suite is included in `scripts/test-api.mjs`. It verifies **48 critical assertions** covering API status codes, database storage, validation rejection, filter queries, sorting, and deletion:

```bash
npm run test:api
```

### Test Suite Coverage:
* Database connectivity & latency check
* Rejection of empty, short, or invalid payloads (`400 Bad Request`)
* Full task creation and returned schema (`201 Created`)
* Direct database row verification via `pg` query (`SELECT * FROM tasks WHERE id = ...`)
* Query string filtering (`?search=`, `?status=`, `?priority=`, `?sortBy=`)
* Single task retrieval & 404 verification for non-existent IDs
* Full update (`PUT`) and quick status transition (`PATCH`)
* Hard deletion (`DELETE`) and verification of row removal from PostgreSQL
* Metric aggregations (`GET /api/stats`)

---

## 🐳 Running PostgreSQL via Docker (Optional)

If you prefer to run PostgreSQL locally inside a Docker container:
```bash
docker-compose up -d
```
Then update your `.env`:
```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/taskdb"
```
And initialize the schema:
```bash
npm run db:init
```

---

## 📡 REST API Documentation

| Method | Endpoint | Description | Query Parameters / Body | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Database connection health | None | `200`, `503` |
| `GET` | `/api/stats` | Aggregated dashboard metrics | None | `200`, `500` |
| `GET` | `/api/tasks` | List tasks | `search`, `status`, `priority`, `sortBy`, `order` | `200`, `500` |
| `POST` | `/api/tasks` | Create a new task | `{ title, description?, status?, priority?, dueDate? }` | `201`, `400`, `500` |
| `GET` | `/api/tasks/:id` | Get task by ID | None | `200`, `404`, `500` |
| `PUT` | `/api/tasks/:id` | Update task details | `{ title?, description?, status?, priority?, dueDate? }` | `200`, `400`, `404`, `500` |
| `PATCH`| `/api/tasks/:id` | Partial / Quick status update | `{ status?: "TODO" \| "IN_PROGRESS" \| "COMPLETED" }` | `200`, `400`, `404`, `500` |
| `DELETE`| `/api/tasks/:id`| Permanently delete task | None | `200`, `404`, `500` |

### Sample JSON Payloads

#### Create Task Request (`POST /api/tasks`):
```json
{
  "title": "Implement PostgreSQL Connection Pooling",
  "description": "Configure maximum clients, idle timeouts, and SSL parameters.",
  "status": "TODO",
  "priority": "HIGH",
  "dueDate": "2026-10-30T12:00:00.000Z"
}
```

#### Validation Error Response (`400 Bad Request`):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "title": "Title must be at least 3 characters long.",
    "status": "Status must be one of: TODO, IN_PROGRESS, COMPLETED."
  }
}
```

---

## 📁 Project Structure

```
Task Dashboard/
├── scripts/
│   ├── init-db.mjs       # Database schema initialization script
│   ├── seed.mjs          # Database sample seeder script
│   └── test-api.mjs      # Automated 48-assertion test suite
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts   # Database healthcheck endpoint
│   │   │   ├── stats/route.ts    # Aggregated task stats endpoint
│   │   │   └── tasks/
│   │   │       ├── route.ts      # GET and POST /api/tasks
│   │   │       └── [id]/route.ts # GET, PUT, PATCH, DELETE /api/tasks/:id
│   │   ├── globals.css           # Design tokens, variables & glassmorphism utilities
│   │   ├── layout.tsx            # Root HTML layout & metadata
│   │   └── page.tsx              # Main Dashboard page
│   ├── components/
│   │   ├── DeleteConfirmModal.tsx # Accessible delete confirmation dialog
│   │   ├── FilterBar.tsx          # Search, status pills, priority, and sorting toolbar
│   │   ├── Navbar.tsx             # Brand header and database status indicator
│   │   ├── StatsCards.tsx         # Metric summary cards
│   │   ├── TaskCard.tsx           # Task card with badges, status toggles, and edit actions
│   │   ├── TaskModal.tsx          # Create/Edit task modal with form validation
│   │   └── Toast.tsx              # Toast feedback alerts
│   ├── lib/
│   │   ├── db.ts                  # PostgreSQL pool and query helper
│   │   └── validation.ts          # Request payload validators
│   └── types/
│       └── task.ts                # TypeScript interfaces and enum types
├── .env.example                   # Template environment variables
├── .eslintrc.json                 # ESLint configuration
├── docker-compose.yml             # Local PostgreSQL Docker service
├── next.config.ts                 # Next.js configuration
├── package.json                   # Dependencies and npm scripts
├── tsconfig.json                  # Strict TypeScript configuration
└── README.md                      # Project documentation
```
