# Autonomous Airport Operations Platform (iTrax / C3)

An intelligent operations console and dependency-graph propagation engine that reassigns gates, flight crews, and baggage routing dynamically as flight delays occur.

The system enforces a **hard invariant** guaranteeing zero double-booking across both the database and application layers, and surfaces the cascading knock-on impact of delays before they compound.

---

## Key Highlights

- **Dual-Layer Double-Booking Invariant**:
  - **Database Layer**: PostgreSQL 17 `EXCLUDE USING gist (resource_id WITH =, time_range WITH &&)` constraint enabled by `btree_gist`. Overlapping assignments are physically rejected at the database engine level (SQLSTATE `23P01`).
  - **Application Layer**: Pure-TypeScript `@c3/core` engine detects temporal interval overlaps before writes and selects candidate resources with terminal proximity heuristics and aircraft compatibility checks.
- **Dependency-Graph BFS Propagation**:
  - Models flights, gates, crews, and baggage routes as an interconnected dependency graph.
  - Multi-hop cascading reassignments (e.g., Flight A delay bumps Flight B, which displaces Flight C) resolve cleanly with cycle-detection visited sets.
- **Dry-Run Simulation Before Commit**:
  - Delay reports compute an end-to-end `ImpactEvent[]` preview without persisting changes.
  - Dispatchers inspect the exact knock-on impact chain and confirm via idempotent change-set tokens.
- **Distributed Concurrency Lock**:
  - Redis Redlock pattern serializes concurrent allocation commits scoped to touched resource IDs.
- **Real-Time Ops Console**:
  - Next.js 15+ App Router, React 19, and Tailwind CSS.
  - Interactive Gantt board with live occupancy, delay simulation drawer, and real-time WebSocket event stream (`/live`).

---

## Monorepo Architecture

```
C3/
├── apps/
│   ├── api/                   # NestJS 11+ (REST + WebSocket Gateway + Redlock)
│   └── web/                   # Next.js 15+ App Router (Ops Console + React 19 + Tailwind)
├── packages/
│   ├── core/                  # Framework-free pure TypeScript propagation engine (Vitest)
│   ├── db/                    # Drizzle ORM schema, PostgreSQL 17 exclusion migrations
│   ├── shared/                # Zod schemas, domain types, and event definitions
│   └── config/                # Base tsconfig and lint configurations
├── infra/
│   ├── docker-compose.yml     # PostgreSQL 17 + Redis 7 + API + Web
│   └── sql/
│       └── 001_init_schema_and_constraints.sql
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v24.x` (Active LTS)
- **pnpm**: `v11.x`
- **Docker & Docker Compose** (optional for containerized deployment)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build All Packages

```bash
pnpm turbo build
```

### 3. Run Test Suites

```bash
pnpm turbo test
```

Runs 19 automated tests spanning:
- **Core Engine (`@c3/core`)**: Zero double-booking assertion, multi-hop propagation, cycle prevention, capacity saturation handling, and concurrency race load testing.
- **Database Layer (`@c3/db`)**: Schema validation and PostgreSQL exclusion constraint rejection tests.
- **API E2E (`@c3/api`)**: End-to-end delay simulation, locked commit, and live WebSocket broadcast validation.

---

## Local Development

### Option A: Standalone In-Memory Mode

Run the API and frontend simultaneously using Turborepo:

```bash
pnpm dev
```

- **Ops Console**: `http://localhost:3000`
- **API Server**: `http://localhost:3001`
- **WebSocket Gateway**: `ws://localhost:3001/live`

### Option B: Docker Compose (PostgreSQL 17 + Redis 7)

```bash
docker compose -f infra/docker-compose.yml up -d
```

Starts:
1. PostgreSQL 17 on `localhost:5432` with `btree_gist` and exclusion constraints pre-loaded.
2. Redis 7 on `localhost:6379` for distributed locking.
3. API server and Web console.

---

## API Surface

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/board` | Returns current operational snapshot of flights, gates, crews, and baggage |
| `POST` | `/flights/:id/delay` | Simulates delay and returns dry-run knock-on impact chain |
| `POST` | `/assignments/preview` | Hypothetical what-if simulation endpoint |
| `POST` | `/assignments/commit` | Commits changeSet under Redlock; broadcasts updates via WebSocket |
| `GET` | `/events/history` | Audit log of all automated reassignments |
| `WS` | `/live` | Real-time WebSocket stream for `IMPACT_ALERT` and `BOARD_STATE` |

---

## Git Workflow Record

This repository treats Git history as an append-only log. Every distinct configuration, schema, domain logic, controller, and UI component was committed atomically with descriptive imperative messages.
