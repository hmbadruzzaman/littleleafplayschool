# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

Two-app monorepo (no workspace tooling — each app has its own `package.json` and `node_modules`):

- `server/` — Express REST API (Node.js)
- `client/` — React 18 SPA (Create React App)

The many `*.md` files at the repo root (DEPLOYMENT_*, GALLERY_*, QUICKSTART_*, etc.) are historical setup notes — they overlap and sometimes contradict each other. Treat code (`.env*`, `package.json`, `server.js`, `config/`) as the source of truth and prefer reading docs only when the user references a specific one.

## Commands

Run from each app's directory. There is no root-level `package.json`.

### Server (`cd server`)

| Command | Purpose |
|---|---|
| `npm run local` | Local dev: nodemon + in-memory DB (no AWS). Reads `.env`. |
| `npm run dev` | Dev against AWS DynamoDB. Requires AWS creds in `.env`. |
| `npm start` | Production start (`node server.js`). |
| `npm run create-tables` | Provision DynamoDB tables in the configured AWS account. |
| `npm run seed-admin` | Create the default `ADM001` admin user. |
| `npm run setup` | `create-tables` + `seed-admin`. |

There are no server tests and no lint script.

**Known broken scripts:** `seed-dummy`, `seed-dummy:local`, and `setup-with-data` all reference `scripts/seed-dummy-data.js`, which does not exist in the repo (only `seed-admin.js` and `seed-initial-data.js` do). The README's `npm run local` claim that dummy data is auto-seeded is also stale — `utils/initLocalDB.js` was explicitly disabled, so a fresh `npm run local` starts with an empty in-memory DB. Use `seed-initial-data.js` if you need data, or add it through the UI/API.

### Client (`cd client`)

| Command | Purpose |
|---|---|
| `npm start` | CRA dev server on `:3000`. |
| `npm run build` | Production build to `client/build/`. |
| `npm test` | CRA/Jest runner (no tests are currently written). |

Lint uses CRA's built-in `eslint-config-react-app` — no separate `lint` script.

### Ports — important

- Server `.env` sets `PORT=5001`. `server.js` defaults to `5000` only if `PORT` is unset.
- The client hardcodes its API base in `client/src/services/api.js`:
  - `localhost` → `http://localhost:5001/api`
  - otherwise → `https://welittleleaf.com/api`
- The hardcoded `:5001` is **not** configurable via env var. If you change the server port, change `api.js` to match. The `.env.example` showing `PORT=5000` is misleading — the working local config is `5001`.

## Architecture

### Database abstraction (the most important thing to understand)

`server/config/dynamodb.js` is a switch driven by `USE_LOCAL_DB`:

- `USE_LOCAL_DB=true` → exports `server/config/local-db.js`, an in-memory shim backed by `Map`s that mimics the AWS SDK v2 `DocumentClient` API (`put/get/query/scan/update/delete`, each returning `{ promise(): ... }`).
- otherwise → real `AWS.DynamoDB.DocumentClient` against the configured region.

Every model in `server/models/` consumes `docClient` and `TABLES` from this module, so the same model code runs against either backend. **Do not import `aws-sdk` directly from models or controllers** — go through `config/dynamodb.js` so local mode keeps working. The local shim only implements the operations listed above; if you add code that uses other DocumentClient methods (e.g. `batchWrite`, `transactWrite`), extend `local-db.js` too or local mode will break silently.

Table set is canonical in `dynamodb.js` `TABLES` and mirrored in `local-db.js`: USERS, STUDENTS, TEACHERS, FEES, FEE_STRUCTURE, EXAMS, EXAM_RESULTS, HOLIDAYS, MEDIA, SCHOOL_INFO, NOTIFICATIONS, EXPENDITURES, INQUIRIES. Schema details are in `DATABASE_SCHEMA.md`.

### Auth & role gating

JWT-only, no sessions. Pattern is the same on both ends:

- Server: `middleware/auth.js` exports `verifyToken` plus four role guards (`isAdmin`, `isTeacher`, `isStudent`, `isAdminOrTeacher`). Routes compose them, e.g. `router.post('/students', verifyToken, isAdmin, ...)`. The decoded payload lives on `req.user` with `userType` ∈ `{ ADMIN, TEACHER, STUDENT }`.
- Client: `context/AuthContext.js` stores the token in `localStorage`; `services/api.js` attaches it as `Authorization: Bearer ...` and force-redirects to `/login` on any 401. `App.js`'s `ProtectedRoute` enforces `allowedRoles` against `user.userType`, gating `/student/*`, `/teacher/*`, `/admin/*`.

When adding an endpoint, mirror this layering — controller + role-guarded route on the server, and a method in the appropriate `*API` export in `client/src/services/api.js` rather than calling `axios` ad hoc from a component.

### Request flow

`routes/<role>.js` → controller in `controllers/<role>Controller.js` → model in `models/`. Controllers own request/response shape (the project uses `{ success, message, data? }` everywhere); models own DocumentClient calls. Preserve that split when extending.

### Frontend structure

- `pages/` — one top-level page per role dashboard (`AdminDashboard.js`, `TeacherDashboard.js`, `StudentDashboard.js`) plus public `LandingPage`/`LoginPage`.
- `pages/admin/` — section components rendered inside `AdminDashboard` (Students, Teachers, Fees, Expenditure, Inquiries, Reports, Dashboard).
- `components/forms/` and `components/modals/` — reusable admin CRUD UI.
- Styling is plain CSS files colocated with components — there is no CSS-in-JS, Tailwind, or component library.

### CORS

`server/server.js` hardcodes its allowed origin list to `localhost:3000`, `welittleleaf.com`, and `www.welittleleaf.com`. If you add a new client origin (preview deploy, etc.), edit the array — it does not read from `FRONTEND_URL`.

## Conventions

- Server uses CommonJS (`require`) throughout. Client uses ES modules (`import`).
- IDs are role-prefixed strings: admin `ADM###`, teacher `TCH###`, student `STU{YEAR}###`. Login uses the role-specific ID + password, not email.
- API responses uniformly use `{ success: boolean, message?: string, data?: ... }`. Match this when adding endpoints.
- The default seeded admin is `ADM001 / password123` in local mode, and the README mentions `admin123` for AWS-seeded admin — verify against `scripts/seed-admin.js` before quoting either.

## User preferences (auto-memory)

- **Never commit to git unless the user explicitly asks.** Make code changes freely, but do not run `git commit` / `git add && commit` on your own.
