# ggBoard — Architecture

> **Status:** Living document · **As-of branch:** `beta` (post Supabase/Prisma migration — ADR-006)
> **Scope:** Describes the system *as it actually exists in code today*. No code changes are implied by this document. All Mermaid diagrams below are syntax-validated.

ggBoard is a full-stack **esports tournament management** platform: an admin configures games/tournaments, the public registers teams and joins them, the admin records round scores, and a public leaderboard ranks teams live.

---

## 1. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19, React Router 7, Vite 8 | SPA, dark neon theme, vanilla CSS |
| HTTP client | Axios | Single instance, JWT request interceptor, 401/403 response interceptor |
| Backend | Node.js + Express 4 | REST, route-per-resource, **async handlers over a repository layer** |
| Database | **Supabase Postgres 17** via **Prisma 6** | Managed cloud Postgres (Tokyo); PgBouncer pooler at runtime, direct connection for migrations; RLS enabled |
| Data access | Prisma Client + repository layer ([`repositories/`](backend/repositories/index.js)) | Only module that touches the DB — keeps a future engine swap contained |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` | Stateless 24h tokens, RBAC middleware |
| Config | `dotenv` | `.env` holds `DATABASE_URL`/`DIRECT_URL`/`JWT_SECRET`; server refuses to boot without required secrets |

**Topology:** classic 2-tier client–server backed by a **managed cloud database** (Supabase Postgres, Tokyo region). The API reaches Postgres through Prisma over Supabase's transaction pooler (PgBouncer, IPv4-friendly); the direct connection is reserved for schema migrations. Because the API layer is now stateless over a network database, it can scale horizontally and is serverless/edge-friendly — the previous single-node `better-sqlite3` constraint is resolved (see ADR-006).

---

## 2. Component / container view

```mermaid
flowchart TB
    subgraph Client["Browser - React 19 SPA (Vite)"]
        direction TB
        Pages["Pages<br/>Landing - Logins - CreateTeam - JoinTeam<br/>Admin/Leader Dashboards - Scoreboard"]
        AuthCtx["AuthContext<br/>localStorage: token + user"]
        Axios["Axios instance<br/>JWT request interceptor<br/>401/403 response interceptor"]
        Pages --> AuthCtx
        Pages --> Axios
    end

    subgraph API["Express REST API :3001"]
        direction TB
        CORS["CORS + express.json()"]
        subgraph MW["Auth Middleware (RBAC)"]
            VT["verifyToken (JWT)"]
            Guards["requireAdmin - requireTeamLeader<br/>requireAdminOrLeader"]
        end
        subgraph Routes["Route Modules"]
            R1["auth"]
            R2["games"]
            R3["teams"]
            R4["players"]
            R5["scores"]
            R6["export"]
        end
        Repo["Repository layer<br/>repositories/* — only Prisma caller"]
        ERR["Global errorHandler<br/>Prisma P2002/P2003/P2025 to HTTP code"]
        CORS --> MW --> Routes --> Repo
        Routes --> ERR
    end

    DB[("Supabase Postgres 17<br/>Prisma - PgBouncer pooler - RLS on<br/>users - games - teams - players - scores - submissions")]

    Axios -- "HTTP/JSON Bearer JWT" --> CORS
    Repo -- "Prisma Client (async)" --> DB
```

**Backend entry point:** [`server.js`](backend/server.js) wires CORS → `express.json()` → rate limiting → route modules → 404 → global error handler. Persistence is delegated to a **repository layer** ([`repositories/index.js`](backend/repositories/index.js)) — the only module that imports Prisma — so handlers issue domain calls (`teams.createForPlayer(...)`) instead of SQL. Validation (Zod) and HTTP concerns stay in the handlers; async errors are forwarded to the error handler via an [`asyncHandler`](backend/utils/asyncHandler.js) wrapper.

---

## 3. Runtime: auth & RBAC request lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor U as Admin (Browser)
    participant SPA as React SPA
    participant AX as Axios (interceptor)
    participant API as Express API
    participant MW as Auth Middleware
    participant DB as SQLite

    U->>SPA: Enter username + password
    SPA->>AX: POST /auth/admin/login
    AX->>API: HTTP request (no token yet)
    API->>DB: SELECT user WHERE username and role=admin
    DB-->>API: user row (password_hash)
    API->>API: bcrypt.compareSync(password, hash)
    API->>API: jwt.sign id/username/role/teamId, 24h
    API-->>AX: 200 token + user
    AX-->>SPA: token
    SPA->>SPA: AuthContext.login to localStorage

    Note over SPA,DB: Subsequent protected request
    U->>SPA: Open Admin Dashboard
    SPA->>AX: GET /games/all
    AX->>AX: interceptor attaches Bearer token
    AX->>API: GET /games/all + Authorization header
    API->>MW: requireAdmin
    MW->>MW: jwt.verify(token)
    alt valid admin
        MW->>DB: SELECT games + team_count
        DB-->>API: rows
        API-->>AX: 200 games
    else invalid or not admin
        MW-->>AX: 401 / 403
        AX->>SPA: interceptor clears storage, redirect /
    end
```

### Authorization model
- **Token claims:** `{ id, username, role, teamId }`, signed with `JWT_SECRET`, 24h expiry ([`middleware/auth.js`](backend/middleware/auth.js)).
- **Role guards:** `requireAdmin`, `requireTeamLeader`, `requireAdminOrLeader` all wrap `verifyToken`.
- **Multi-tenant (organizers):** the `admin` role is per-organizer — admins self-register via `POST /auth/admin/register`, and every admin management query is filtered/guarded by `games.organizer_id = req.user.id`, isolating organizers from one another. The seeded `admin` is simply organizer #1.
- **Ownership checks (defense in depth):** for shared routes, handlers additionally compare `req.user.teamId` to the target resource — e.g. a team leader may only edit/delete players in their own team ([`players.js:156`](backend/routes/players.js#L156), [`players.js:193`](backend/routes/players.js#L193)) and only edit their own team ([`teams.js:202`](backend/routes/teams.js#L202)).
- **Logout is stateless** — the server simply 200s; the client discards the token. There is no revocation list, so a leaked token is valid until expiry.
- **Client guard:** `<ProtectedRoute requiredRole>` in [`App.jsx`](frontend/src/App.jsx) gates dashboard routes; auth state is restored from `localStorage` on mount **without re-validating the token** against the server.

### Team creation & joining (accounts-first)
`POST /teams/create` and `POST /players/join` are **protected** — a player must be signed in (unified `POST /auth/register` / `POST /auth/login`). A **player** who creates a team becomes its leader (their account is linked, one team per player); a player who joins with a code is linked to that team's roster. When an **admin** calls `POST /teams/create` (manual add), it still auto-generates a `team_leader` account and returns the generated credentials **once**. Creating/joining returns a **refreshed JWT** so the new `teamId` is reflected immediately.

---

## 4. Data model

```mermaid
erDiagram
    USERS ||--o{ GAMES : "organizes (organizer_id)"
    GAMES ||--o{ TEAMS : "hosts"
    GAMES ||--o{ SCORES : "scored in"
    USERS ||--o| TEAMS : "leads (leader_id)"
    USERS ||--o| PLAYERS : "is roster member (user_id)"
    TEAMS ||--o{ PLAYERS : "rosters"
    TEAMS ||--o{ SCORES : "earns"
    USERS ||--o{ SUBMISSIONS : "uploads (user_id)"
    USERS ||--o{ SUBMISSIONS : "reviews (reviewed_by)"
    GAMES ||--o{ SUBMISSIONS : "in"
    TEAMS ||--o{ SUBMISSIONS : "for"

    GAMES {
        INTEGER id PK
        TEXT game_title "NOT NULL"
        TEXT tournament_name "NOT NULL"
        TEXT status "active|inactive CHECK"
        INTEGER num_rounds "default 3"
        INTEGER organizer_id FK "owner - CASCADE"
        DATETIME created_at "default now"
    }
    USERS {
        INTEGER id PK
        TEXT username "UNIQUE NOT NULL"
        TEXT password_hash "bcrypt NOT NULL"
        TEXT role "admin|team_leader CHECK"
        BOOLEAN role_selected "true=chosen, false=pending signup"
        TEXT display_name "nullable"
        INTEGER team_id "soft link - NO FK"
        DATETIME created_at "default now"
    }
    TEAMS {
        INTEGER id PK
        TEXT team_name "NOT NULL"
        TEXT unique_code "UNIQUE NOT NULL"
        INTEGER game_id FK "NOT NULL CASCADE"
        INTEGER leader_id FK "nullable SET NULL"
        DATETIME created_at "default now"
    }
    PLAYERS {
        INTEGER id PK
        TEXT full_name "NOT NULL"
        TEXT in_game_name "NOT NULL"
        TEXT email "nullable"
        TEXT phone "nullable"
        INTEGER team_id FK "NOT NULL CASCADE"
        INTEGER user_id FK "account link, SET NULL"
        DATETIME created_at "default now"
    }
    SCORES {
        INTEGER id PK
        INTEGER team_id FK "NOT NULL CASCADE"
        INTEGER game_id FK "UNIQUE team_id+game_id CASCADE"
        JSONB round_scores "jsonb array default []"
        INTEGER total_score "default 0"
        TIMESTAMPTZ updated_at "default now"
    }
    SUBMISSIONS {
        INTEGER id PK
        INTEGER game_id FK "nullable CASCADE"
        INTEGER team_id FK "nullable CASCADE"
        INTEGER user_id FK "uploader, SET NULL"
        TEXT kind "image|video"
        TEXT purpose "default gameplay_verification"
        TEXT storage_path "Supabase Storage key"
        TEXT status "pending|approved|rejected"
        INTEGER reviewed_by FK "reviewer, SET NULL"
        TEXT note "nullable"
        TIMESTAMPTZ created_at "default now"
        TIMESTAMPTZ reviewed_at "nullable"
    }
```

Source of truth: the **Supabase Postgres** schema, mirrored in [`schema.prisma`](backend/prisma/schema.prisma). Notable design decisions and caveats:

- **`scores.round_scores` is a `jsonb` array** — Prisma returns/accepts it as a native JS array (no manual `JSON.parse`). Flexible (any number of rounds without a schema change) but per-round aggregation still happens in app code.
- **`scores.total_score` is denormalized** — it is recomputed and rewritten by the app on every `POST /scores/update` ([`scores.js:29`](backend/routes/scores.js#L29)). Nothing at the DB level keeps it consistent with `round_scores`.
- **`scores` has `UNIQUE(team_id, game_id)`** — one score row per team per game; the update route upserts against the compound key.
- **`users.team_id` has no `FK` constraint** — it is a soft back-pointer. The enforced FK is `teams.leader_id → users.id (ON DELETE SET NULL)`. The user→team link relies on app code to stay correct.
- **Cascades:** Postgres FKs cascade a game delete to its teams, players, scores, and submissions. Deleting a team cascades to its players/scores/submissions but **never deletes member accounts** — `teams.deleteAndUnlink` clears each member's `users.team_id` first, then deletes the team ([`repositories/index.js`](backend/repositories/index.js)).
- **`submissions`** stores **references** to uploaded media (images now, gameplay-verification video later) — the file bytes live in **Supabase Storage**, the row keeps `storage_path` + review `status`. This backs the planned upload feature without bloating the relational tables.
- **RLS is enabled** on every table (deny-by-default). The API connects as the Postgres role that owns the tables and bypasses RLS; the policies are the backstop if the anon/publishable key is ever used directly from the browser.
- Indexes cover the hot lookup paths (`unique_code`, `team_id`, `game_id`, `role`, composite `team_id+game_id`).

---

## 5. API surface

Base URL `http://localhost:3001` (hardcoded in [`frontend/src/utils/api.js`](frontend/src/utils/api.js#L8)). Auth levels: **Public**, **Admin**, **Leader**, **Admin/Leader** (role + ownership check).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |
| POST | `/auth/signup` | Public | Step 1 — create account (credentials only) → JWT, `rolePending` |
| POST | `/auth/select-role` | Auth (pending) | Step 2 — finalise role (organizer/player); required before any app access |
| POST | `/auth/register` | Public | Legacy one-shot sign-up with role (kept for compat) |
| POST | `/auth/login` | Public | Unified login — returns `rolePending` if role not yet chosen |
| POST | `/auth/admin/login` | Public | Admin/organizer login → JWT |
| POST | `/auth/admin/register` | Public | Organizer self sign-up → JWT (multi-tenant) |
| POST | `/auth/leader/login` | Public | Team-leader login → JWT |
| POST | `/auth/logout` | Public | Stateless (client discards token) |
| POST | `/games/create` | Admin | Create game/tournament |
| GET | `/games/all` | Admin | All games + team counts |
| GET | `/games/active` | Public | Active games (registration dropdowns) |
| PATCH | `/games/:id` | Admin | Update game (COALESCE partial) |
| DELETE | `/games/:id` | Admin | Delete game (cascades) |
| POST | `/teams/create` | Player/Admin | Player self-creates a team (becomes leader); admin manual-add auto-generates a leader account |
| GET | `/teams/all` | Admin | All teams + leader + player counts |
| GET | `/teams/my` | Leader | Own team + roster |
| PATCH | `/teams/:id` | Admin/Leader | Update team (leader: own only) |
| DELETE | `/teams/:id` | Admin | Delete team + leader user |
| POST | `/players/join` | Player | Signed-in player joins a team by `unique_code` (links account) |
| POST | `/players/add` | Admin | Add player to any team |
| GET | `/players/all` | Admin | All players (filters: `team_id`, `game_id`, `search`) |
| PATCH | `/players/:id` | Admin/Leader | Edit player (leader: own team only) |
| DELETE | `/players/:id` | Admin/Leader | Remove player (leader: own team only) |
| POST | `/scores/update` | Admin | Upsert `round_scores[]`, recompute total |
| GET | `/scores/:gameId` | Public | Ranked scoreboard for a game |
| POST | `/export` | Admin | CSV export (`players` \| `scores` \| `combined`), optional `game_id`, field selection |

> **Multi-tenant scoping (organizers):** every **Admin** management endpoint is owner-scoped via `games.organizer_id` — an organizer can only read/modify their **own** games, teams, players, scores, and exports (cross-org access returns `403`). **Public** read endpoints (`/games/active`, `/scores/:gameId`) stay global so visitors can browse tournaments and scoreboards across all organizers.

> **Auth status-code contract:** `401` always means "re-authenticate" (missing/expired/invalid token — the SPA clears the session and redirects to `/auth`); `403` always means "authenticated but not allowed" (wrong role, not the owner/leader) and never logs the user out.

---

## 6. Cross-cutting concerns

- **DB access:** a single Prisma Client singleton ([`config/prisma.js`](backend/config/prisma.js)) shared process-wide (cached on `globalThis` in dev to survive reloads); all queries go through the repository layer ([`repositories/index.js`](backend/repositories/index.js)).
- **Transactions:** multi-write operations are wrapped in `prisma.$transaction` (team creation, join, admin add-team, delete-and-unlink) so a partial failure can't leave orphaned rows.
- **Error handling:** a global [`errorHandler`](backend/middleware/errorHandler.js) maps Prisma error codes — `P2002` unique → `409`, `P2003` FK → `400`, `P2025` not-found → `404` — and hides internals when `NODE_ENV=production`. Async route errors reach it via the [`asyncHandler`](backend/utils/asyncHandler.js) wrapper.
- **SQL safety:** Prisma parameterizes every query — no string interpolation of user input.
- **Config:** `JWT_SECRET` and `DATABASE_URL` are **required** — the server exits at startup if either is missing ([`config/prisma.js`](backend/config/prisma.js), [`middleware/auth.js`](backend/middleware/auth.js)). `PORT`/`FRONTEND_URL`/`NODE_ENV` keep dev fallbacks.

---

## 7. Architectural risk register

| Sev | Issue | Location | Impact |
|---|---|---|---|
| ✅ ~~P0~~ | **Resolved** — `JWT_SECRET` enforced at startup (no fallback); `.env`/`.env.example` added | [`auth.js`](backend/middleware/auth.js) | Forged-token bypass closed |
| ✅ ~~P0~~ | **Resolved** — frontend API base URL now via `VITE_API_URL` | [`api.js:8`](frontend/src/utils/api.js#L8) | Deployable to any backend |
| ✅ ~~P1~~ | **Resolved** — idempotent migration runner added (`npm run migrate`) | [`migrate.js`](backend/database/migrate.js) | Schema changes apply safely to an existing DB |
| ✅ ~~P1~~ | **Resolved** — Zod validation middleware on auth register/login + game & score create | [`validate.js`](backend/middleware/validate.js) | Consistent, typed input enforcement |
| ✅ ~~P2~~ | **Resolved** — `express-rate-limit` (global 300/15m + auth 30/15m) | [`rateLimit.js`](backend/middleware/rateLimit.js) | Brute-force + flood protection |
| ✅ ~~P2~~ | **Resolved** — repository layer added; handlers no longer contain SQL | [`repositories/index.js`](backend/repositories/index.js) | Testable; a future DB swap is contained to one module |
| ✅ ~~P2~~ | **Resolved** — migrated to **Supabase Postgres via Prisma** (async, pooled) | [`config/prisma.js`](backend/config/prisma.js) | No longer single-node; serverless/edge-capable |
| 🟡 P2 | Token restored from `localStorage` without server re-validation | [`AuthContext.jsx`](frontend/src/context/AuthContext.jsx) | Expired token shows "authenticated" until first API 401 |
| 🟡 P2 | `users.team_id` has no FK constraint — **mitigated**: lifecycle code now clears it on team delete / player removal, and membership guards read the DB (not the token claim) | [`teams.js`](backend/routes/teams.js), [`players.js`](backend/routes/players.js) | Residual risk only if new write paths forget the unlink step |
| ✅ ~~P3~~ | **Resolved** — `teams.js` header comment updated to match registered routes | [`teams.js:1`](backend/routes/teams.js#L1) | — |

> The original **P0**s, the data-layer and single-node **P2**s, and the migration **P1** are now resolved (above). The remaining items (localStorage token restore, soft `team_id` link) are mitigated and not blockers.

---

## 8. Deployment — current state vs options

```mermaid
flowchart LR
    subgraph Now["Current - Dev API + cloud DB"]
        direction TB
        N1["Vite dev :5173"]
        N2["Express :3001"]
        N3[("Supabase Postgres<br/>(cloud, pooled)")]
        N1 --> N2 --> N3
    end

    subgraph A["Option A - Local-first (single node)"]
        direction TB
        A1["Static host<br/>Pages/Netlify"]
        A2["Node container + volume<br/>Fly/Render/Railway/VPS"]
        A3[("SQLite on volume")]
        A1 --> A2 --> A3
    end

    subgraph B["Option B - Supabase"]
        direction TB
        B1["Static host"]
        B2["Express container"]
        B3[("Supabase Postgres")]
        B1 --> B2 --> B3
    end

    subgraph C["Option C - Cloudflare edge"]
        direction TB
        C1["Cloudflare Pages"]
        C2["Workers (Hono)"]
        C3[("D1 SQLite")]
        C1 --> C2 --> C3
    end

    Now -.->|fall back to single-node| A
    Now -.->|host API + static frontend| B
    Now -.->|rewrite to Workers/D1| C
```

| Option | Effort | Rewrite scope | Best when |
|---|---|---|---|
| **A. Local-first** | Low | None | Ship/demo simply; keep all current code |
| **B. Supabase (Postgres)** | ✅ **Done** | Data layer migrated (`better-sqlite3` sync → Prisma async, ADR-006); remaining work is just hosting the API + static frontend | **Current target** — managed cloud DB, smallest delta from local |
| **C. Cloudflare edge** | High | Backend + auth + data (`bcryptjs` unsupported on Workers; Express → Hono; sync → async D1) | Want edge scale / modern serverless and accept a rewrite |

> **Clerk note:** managed auth is an awkward fit here because the admin *auto-generates* team-leader credentials server-side ([`teams.js:55`](backend/routes/teams.js#L55)); Clerk assumes user self-signup. Not recommended unless that flow is redesigned.

---

## 9. Architecture decision log

- **ADR-001 — Document the architecture before changing it.** *Accepted.* Before committing to a deployment/data target, capture the as-built system, data model, API surface, and risks (this document). Rationale: avoid premature migration; make the trade-offs in §8 explicit first.
- **ADR-002 — Target architecture.** *Resolved (→ ADR-006).* Option **B (Supabase Postgres)** was chosen and implemented. The `better-sqlite3` single-node constraint that gated this decision is gone.
- **ADR-003 — Multi-tenant organizer model.** *Accepted.* Each admin is an independent **organizer** scoped to their own tournaments via `games.organizer_id`, with self sign-up (`POST /auth/admin/register`). The `admin` role value is reused (no role-enum change); public browsing/registration/scoreboard stay global. A platform-wide super-admin is intentionally out of scope for now.
- **ADR-004 — Unified auth + self-registered players.** *Accepted.* A single `/auth` page handles Sign In + Sign Up. Players self-register (own credentials) and then create or join a team (`players.user_id` links the account; one team per player). The `team_leader` role is reused for player accounts (no enum change). Auto-generated leader credentials are **removed from the player flow** but retained for the **admin manual add-team** path (role-branched in `POST /teams/create`). Creating/joining returns a refreshed JWT. Old per-role endpoints are kept for backward compatibility.
- **ADR-005 — Two-step sign-up with mandatory role selection.** *Accepted.* Sign-up is split: `POST /auth/signup` creates the account from credentials only (so a duplicate username is reported on the sign-up form) and returns an authenticated but **pending** session (`users.role_selected = 0`, placeholder role). The user must then pick Organizer/Player on `/auth/role` → `POST /auth/select-role`. Enforcement is defense-in-depth: the JWT carries `roleSelected`, every role guard returns `403` for a pending token, and the SPA's `ProtectedRoute` + post-login routing force a pending user to `/auth/role` on every entry (including a later sign-in after abandoning the step). Role is chosen once and can't be re-selected (`409`). Chosen over a DB-nullable role to avoid a risky SQLite table rebuild.
- **ADR-006 — Migrate to Supabase Postgres behind Prisma + a repository layer.** *Accepted.* The database moved from local `better-sqlite3` (synchronous, single-file, single-node) to **Supabase Postgres 17** accessed via **Prisma 6** (`prisma-client-js`). Rationale: the app's data is inherently relational, and a managed cloud Postgres removes the serverless/edge blocker (ADR-002) while keeping SQL. A **repository layer** ([`repositories/index.js`](backend/repositories/index.js)) is the sole Prisma caller, so a later engine swap (e.g. Mongo) rewrites one folder, not every route — this was the deciding factor for the abstraction. Prisma **6** (not 7) is pinned because Prisma 7's `prisma-client` generator emits TypeScript, unusable in this CommonJS codebase without a build step; 6's `prisma-client-js` emits JS into `node_modules`. Field names stay **snake_case** so the JSON API contract and the frontend are unchanged. Runtime uses the **transaction pooler** (PgBouncer, `?pgbouncer=true`, IPv4-friendly); `DIRECT_URL` is reserved for CLI migrations. `round_scores` is now **`jsonb`**; a new **`submissions`** table holds references to media in **Supabase Storage** (images now, gameplay-verification video later — the original driver for choosing SQL + object storage over embedding blobs). **RLS** is enabled deny-by-default on all tables; the API connects as the table-owner role and bypasses it. Verified end-to-end against the live database (34/34 regression checks: two-step signup, pending-role guards, team lifecycle, scoring, multi-tenant isolation, export).

---

## 10. Open questions

1. What is the deployment goal — demo/portfolio, or a production tournament service? (Drives A vs B/C.)
2. Expected concurrency / number of simultaneous tournaments? (Supabase Postgres now handles multi-node; this drives pooler sizing / plan tier rather than an engine change.)
3. Should team-leader credentials remain admin-generated, or move to self-signup? (Drives whether managed auth like Clerk is viable.)
4. Is real-time scoreboard update (polling/WebSockets) in scope for the target architecture?