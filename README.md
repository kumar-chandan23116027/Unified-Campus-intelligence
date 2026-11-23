# Campus Intel

Campus Intel is a full-stack campus information dashboard for the fictional **Northstar Institute of Technology**. It combines library, cafeteria, event, academic, and hostel data behind MCP-style source adapters and a rule-based campus assistant.

**Demo repository:**https://github.com/kumar-chandan23116027/Unified-Campus-intelligence

**Render URL:** https://mars-web-d-project-1.onrender.com

> The Render URL must be considered unverified until an HTTP health check succeeds. Campus records are synthetic demo data unless `CAMPUS_DATA_API_URL` is configured.

## Features

- Library availability, copies, locations, and checked-out dates
- Cafeteria menus, prices, dietary labels, calories, allergens, and wait estimates
- Upcoming campus events, venues, clubs, registration, and seat counts
- Academic policies, notices, and deadlines
- Hostel occupancy, facilities, wardens, and notices
- Rule-based assistant routing with source tool traces
- MCP-style JSON-RPC tools and source overviews
- SQLite-backed demo storage with JSON fixture fallback
- Authenticated admin CRUD for campus records
- Health, readiness, rate-limit, body-size, and centralized error handling

## Assistant behavior

The assistant is not an AI/LLM. It uses intent keyword matching and record retrieval. Set `LLM_PROVIDER` and `LLM_API_KEY` only after implementing and selecting a provider integration; the current fallback deliberately remains rule-based.

## Architecture

```text
Browser
  -> Node HTTP server
     -> Dashboard and assistant routes
     -> MCP runtime
        -> Library / Cafeteria / Events / Academics / Hostel source
           -> Campus data adapter
              -> SQLite document store
              -> JSON demo fixtures
              -> Optional external HTTP adapter
```

The data status is labeled as `mock`, `live`, or `mock-fallback`. External integrations are never simulated as verified live data.

## Directory structure

```text
public/                 Frontend HTML, CSS, and JavaScript
src/assistant/          Intent detection and assistant modules
src/data/              Demo fixtures and SQLite adapter/storage
src/mcp/               Campus MCP-style source adapters
src/server/            HTTP, validation, auth, MCP, and error modules
src/server.js          Application entry point
tests/                 Unit, API, frontend, and smoke tests
.github/workflows/      GitHub Actions CI
render.yaml            Render deployment configuration
```

## Requirements

- Node.js 22 or newer
- npm

## Local setup

```bash
git clone https://github.com/kumar-chandan23116027/mars-web-D-project.git
cd mars-web-D-project
npm ci
cp .env.example .env
npm start
```

Open `http://localhost:4173`.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4173` | HTTP port |
| `CAMPUS_NAME` | `Northstar Institute of Technology` | Display name |
| `DATABASE_PATH` | `./data/campus.db` | SQLite document store |
| `DATA_MODE` | `mock` | Data provenance label |
| `ADMIN_API_KEY` | unset | Bearer key for admin CRUD |
| `BODY_LIMIT_BYTES` | `65536` | Maximum request body |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Requests per window per IP |
| `INTEGRATION_TIMEOUT_MS` | `5000` | External adapter timeout |
| `CAMPUS_DATA_API_URL` | unset | Optional external campus API base URL |
| `CAMPUS_DATA_API_TOKEN` | unset | Optional bearer token for external API |
| `LLM_PROVIDER` | unset | Reserved for future provider integration |
| `LLM_API_KEY` | unset | Reserved secret; never commit it |

Do not commit `.env` or real credentials.

## Public API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/ready` | Readiness and source count |
| `GET` | `/api/dashboard` | Unified source snapshot |
| `POST` | `/api/assistant` | Rule-based campus query |
| `GET/POST` | `/mcp/:source` | Source metadata or JSON-RPC request |
| `GET/POST/PATCH/DELETE` | `/api/admin/:source[/id]` | Authorized record CRUD |

Example:

```bash
curl -X POST http://localhost:4173/api/assistant \
  -H "content-type: application/json" \
  -d '{"message":"Is an AI book available?"}'
```

Admin example:

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:4173/api/admin/events
```

## MCP JSON-RPC

```bash
curl -X POST http://localhost:4173/mcp/library \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Supported methods are `tools/list`, `tools/call`, and `source/overview`.

## Data storage

SQLite is created automatically at `DATABASE_PATH`. JSON files under `src/data/` seed it on first use. The first process can replace demo records through authorized admin APIs. Without a Render persistent disk, Render storage is ephemeral and demo edits should not be treated as durable.

## Testing

```bash
npm test
npm run test:unit
npm run test:smoke
```

Tests cover health/readiness, dashboard state, assistant intent, malformed JSON, body limits, wrong methods, unknown routes/source, unknown MCP source, unknown queries, admin authentication and duplicates, rate limiting, and frontend structure.

## Render deployment

The checked-in `render.yaml` configures Node 22, `npm ci`, `npm start`, and `/api/health`. Set a persistent disk if SQLite edits must survive restarts.

Manual setup:

1. Create a Render Web Service from this repository.
2. Use branch `main`, build `npm ci`, and start `npm start`.
3. Set `CAMPUS_NAME`, `ADMIN_API_KEY`, and `DATABASE_PATH`.
4. Deploy and verify `/api/health`, `/api/ready`, and `/api/dashboard`.
5. Use a persistent disk or external database for durable admin changes.

## Limitations

- Data is synthetic until a real institutional API is configured.
- Assistant retrieval is rule-based.
- SQLite storage on ephemeral hosting is not durable.
- Admin UI has bearer-key access and is intended for controlled demo use.
- External LMS/library/cafeteria/event/hostel credentials are not included.
- No screenshots are bundled yet.

## Future work

- Real LMS and student-authentication integration
- Live library, cafeteria, event, timetable, and hostel APIs
- Persistent PostgreSQL storage and migrations
- Provider-approved LLM integration
- Expanded role-based admin permissions
- Browser end-to-end tests and screenshot artifacts

## License

MIT. See `LICENSE`.
