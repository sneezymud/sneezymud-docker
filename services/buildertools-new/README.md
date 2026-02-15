# SneezyMUD Builder Tools

Web app for SneezyMUD builders to create and edit game content — rooms, mobs (NPCs), objects (items), and their scripted behaviors.

## Stack

**Frontend:** React 19, Vite 7, TanStack Router + Query, Zustand, Tailwind 4, Zod 4

**Backend:** Hono on Bun, MariaDB (via mysql2), session-based auth

## Setup

Requires [Bun](https://bun.sh) and a running MariaDB instance (the `sneezy-db` container from the parent compose stack).

```bash
bun install
cp .env.example .env   # edit DB_HOST, DB_PASS, SESSION_SECRET
```

## Development

```bash
bun run dev          # starts both Vite (HMR) and Hono API server
bun run dev:web      # Vite dev server only
bun run dev:api      # Hono API server only (with --watch)
```

Vite proxies `/api` requests to the Hono server (default port 3001).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite + API server concurrently |
| `bun run build` | Vite production build |
| `bun run start` | Production server (serves built assets + API) |
| `bun run check` | Typecheck + lint + format check |
| `bun run check:fix` | Typecheck, then auto-fix lint + format |
| `bun run test` | Bun test runner |

## Production

The Dockerfile builds a single container that serves both the Hono API and the Vite-built static frontend on port 5000.

```bash
docker build -t sneezymud-buildertools .
docker run -p 5000:5000 --env-file .env sneezymud-buildertools
```

## Architecture

```
Browser ──→ Hono server (Bun)
              ├── /api/* ──→ MariaDB (immortal + sneezy databases)
              └── /* ──→ static assets (Vite build output)
```

- **Shared schemas** (`src/shared/`) — Zod schemas used by both API validation and frontend types
- **API server** (`src/server/`) — Hono routes, database queries, session auth
- **Frontend routes** (`src/routes/`) — TanStack Router file-based routing
- **Components** (`src/components/`) — Reusable React components
- **State** (`src/state/`) — Zustand stores for client-side state

### Authentication

Session cookies with passwords verified against legacy DES crypt hashes in the `account` table. The `_authenticated` layout route gates all entity editors behind login.

### Database

Queries target two databases: **`immortal`** (builder workspace, read-write) and **`sneezy`** (production game data, read-only). Builder access is scoped to assigned vnum ranges.
