# ggBoard — Step-by-Step Build Checklist
### Development Checkpoint Reference
---

> Use this as your build roadmap. Check off as you go. Each phase builds on the previous.

---

## 📌 Progress Log

> **Last reconciled:** 2026-07-06 · **Branch:** `beta` · **Anchor commits:** Supabase/Prisma migration committed (`6ac7c1c`); teams/profiles/UI work being committed separately by the owner
> Checkboxes below were verified against the **actual code**, not assumed. `[x]` = done & verified · `[ ]` = not done · **⚠️ note** = partial/caveat.

**This session:**
- ✅ Ran the full stack locally (backend `:3001` + frontend `:5173`), verified login + API end-to-end
- ✅ Documented the architecture → [ARCHITECTURE.md](ARCHITECTURE.md) + 4 validated diagrams in [docs/diagrams/](docs/diagrams/)
- ✅ Fixed both critical (P0) issues: enforced `JWT_SECRET` (no insecure fallback) + added `.env`/`.env.example`; made the frontend API URL config-driven (`VITE_API_URL`)
- ✅ Redesigned the **landing page** into an intro page (hero + features + how-it-works + footer); Sign Up → Create Team, Sign In → Team Leader login
- ✅ Implemented **multi-tenant organizers** (ADR-003): `games.organizer_id` + migration, organizer sign-up (`/auth/admin/register`) + AdminRegister page, all admin endpoints owner-scoped; isolation verified
- ✅ **Unified auth + self-registered players** (ADR-004): one `/auth` page (Sign In/Sign Up + Organizer/Player), accounts-first create/join, `players.user_id`, player hub (`/player`), landing "Get Started"; full flow verified (12/12)
- ✅ **Security hardening** (via Context7 MCP): `express-rate-limit` on `/auth` + global, Zod input validation on auth/game/score endpoints; verified
- ✅ **Two-step sign-up + mandatory role (ADR-005)** — `POST /auth/signup` creates the account on "Continue" (duplicate username shows on the sign-up form), then `/auth/role` (Organizer/Player cards) finalises via `POST /auth/select-role`. Pending accounts (`users.role_selected=0`, migration 003) are blocked from every role-gated route (`403`) and force-redirected to `/auth/role` — including on a later sign-in if the user closed the site before choosing. Verified: 11/11 tests.
- ✅ **Audit pass (Fable 5)** — fixed 6 flaws: team delete no longer destroys/strands accounts; player removal frees the linked account; leader-only powers (members can't rename team / kick teammates, self-leave allowed); 401-vs-403 semantics (403 no longer logs users out); stale-token membership guard reads DB; duplicate team names blocked per tournament. Plus: 15s live scoreboard polling, legacy routes redirected to `/auth`/`/player`, diagrams re-rendered. 12/12 regression tests pass.
- ✅ **Cloud database migration (ADR-006)** — moved off local SQLite to **Supabase Postgres 17** via **Prisma 6**, behind a **repository layer** ([repositories/index.js](backend/repositories/index.js)) so a future engine swap is one folder. Full async rewrite of all 6 routers + `config/prisma` + `asyncHandler` + Prisma error mapping (`P2002`/`P2003`/`P2025`). `round_scores` → `jsonb`; new **`submissions`** table (references to media in Supabase Storage — images now, gameplay-verification video later); RLS enabled deny-by-default. Verified end-to-end against the live DB: **34/34 regression checks**. Committed as `6ac7c1c`.
- ✅ **Player dashboard** — rebuilt as a sidebar hub (Overview / My Teams / Standings / Profile) with team rename, roster edit/remove, leave; live standings.
- ✅ **Decoupled teams from tournaments (ADR-007)** — a team belongs to a *game*, not a tournament; **registering** into a tournament is a `scores` row, so a team can enter many events; **game-first** create flow; admin "delete team" → **unregister**. Verified **19/19**.
- ✅ **Multi-team players, one per game (ADR-008)** — dropped `users.team_id`; membership = teams led (`leader_id`) ∪ rostered (`players.user_id`); create/join rejects a second team for the same game; *My Team* → **My Teams** with per-game switcher chips. Verified **16/16**.
- ✅ **Public event feed + profiles + per-game identities (ADR-009)** — games gained event metadata (dates, prize, description) + `GET /games/events` (ongoing/upcoming); player **Profile** (contact, DOB/age, country/city, gender, language, LFT, bio) and a **`games` jsonb** of per-game identities `{game,ign,uid,rank,role}` with game-specific formats (Riot ID, Activision ID, BattleTag, UID, Platform). Registering an event **requires** that game's IGN/UID (gate modal). Verified across suites.
- ✅ **UI/UX overhaul (ADR-010)** — in-code design-system pass: ambient layered background, glassmorphic cards, elevation scale, refined inputs/stat-cards/buttons (sheen + press), sidebar active-indicator, focus/selection/reduced-motion, shimmering landing hero, glassed auth/role pages.
- 📄 Pending items tracked in [PLAYER_DASHBOARD_PENDING.md](PLAYER_DASHBOARD_PENDING.md) (avatar/Storage, Discord/socials, role-selection questions, media upload, dead-page cleanup).
- 🔎 Reconciled this checklist with verified code state (below)

### Phase status at a glance
| Phase | Area | Status |
|---|---|---|
| 0 | Architecture & Hardening *(new)* | ✅ P0/P1 + multi-tenant + validation + rate-limit done; **deploy target decided → Supabase (ADR-006)** |
| 1 | Project Setup & Foundation | ✅ Complete |
| 2 | Authentication System | ✅ Complete |
| 3 | Landing Page | ✅ Complete |
| 4 | Registration Flows | ✅ Game-first team creation + register-into-events; one team per game |
| 5 | Admin Panel | 🟡 Games CRUD, teams (registrations + unregister), players, scores, export; no inline edit-player UI |
| 6 | **Player Panel** | ✅ My Teams (multi-team switcher), roster mgmt, register from feed, standings, profile *(media upload pending)* |
| 7 | Public Scoreboard | ✅ Complete (15s live polling; podium/medals styling) |
| 8 | Polish & Edge Cases | ✅ Rate-limit, validation, one-per-game guards, **UI/UX overhaul** |
| 9 | Testing | 🟡 Script-based regression suites per feature (19/19, 16/16, …); no CI yet |
| 10 | Deployment | 🟡 DB live on Supabase; API + frontend hosting still to do |

---

## 🧱 PHASE 0 — Architecture & Hardening *(added this session)*

- [x] Document system architecture (components, auth flow, ER, deployment) → `ARCHITECTURE.md`
- [x] Render + validate diagrams → `docs/diagrams/*.png`
- [x] **P0** — Enforce `JWT_SECRET` at startup; remove insecure `fallback_secret`
- [x] **P0** — Add `backend/.env` + `backend/.env.example`
- [x] **P0** — Frontend API URL via `VITE_API_URL` (+ `frontend/.env`/`.env.example`)
- [x] **P1** — Add a database migration system → idempotent runner (`npm run migrate`)
- [x] **Multi-tenant organizers** (ADR-003) — `games.organizer_id`, organizer sign-up, owner-scoped admin endpoints, AdminRegister UI
- [x] **P1** — Input-validation layer → Zod middleware ([validate.js](backend/middleware/validate.js) + [schemas.js](backend/validation/schemas.js))
- [x] **P2** — Rate limiting on `/auth/*` → express-rate-limit ([rateLimit.js](backend/middleware/rateLimit.js))
- [x] Decide target deployment architecture → **Supabase Postgres** chosen & implemented (ADR-002 → ADR-006)
- [x] **Migrate data layer** → Prisma 6 + repository layer + `submissions` table; 34/34 regression checks against the live DB

---

## ✅ PHASE 1 — Project Setup & Foundation

### 1.1 — Initialize Project
- [x] Choose tech stack (frontend framework, backend, database)
- [x] Set up project folder structure (client / server / database)
- [x] Initialize version control (Git repo)
- [x] Set up environment variables file (`.env`)  ✅ *added this session (`.env` + `.env.example`)*
- [x] Configure basic README

### 1.2 — Database Setup
- [x] Design and finalize database schema  ✅ *now Supabase Postgres 17, mirrored in [schema.prisma](backend/prisma/schema.prisma) (ADR-006)*
- [x] Create tables / collections:
  - [x] `games` — tournament/game entries
  - [x] `teams` — team info + unique code + linked game
  - [x] `players` — player details + linked team
  - [x] `scores` — per-round scores (`jsonb`) + total + linked team + linked game
  - [x] `users` — auth credentials + role (admin / team_leader) + `role_selected`
  - [x] `submissions` — references to uploaded media in Supabase Storage (image now, video later)
- [x] Set up database connection  ✅ *Prisma Client singleton over the Supabase pooler ([config/prisma.js](backend/config/prisma.js)); all access via the repository layer*
- [x] Seed admin account (super-admin credentials)  ✅ *Prisma-based idempotent [seed.js](backend/database/seed.js)*

### 1.3 — Backend / API Setup
- [x] Initialize backend server
- [x] Set up routing structure
- [x] Configure middleware (CORS, JSON parser, auth middleware)
- [x] Set up error handling globally
- [x] Test server is running correctly

---

## ✅ PHASE 2 — Authentication System

### 2.1 — Admin Auth
- [x] Create Admin login API endpoint (`POST /auth/admin/login`)
- [x] Password hashing (bcrypt or equivalent)
- [x] JWT or session token generation on login
- [x] Protect all admin routes with auth middleware
- [x] Admin logout endpoint

### 2.2 — Team Leader Auth
- [x] Create Team Leader login API endpoint (`POST /auth/leader/login`)
- [x] Team Leader credentials are **auto-generated at team creation** — no manual signup
- [x] Token generation on login
- [x] Protect team leader routes with role-check middleware
- [x] Team Leader logout endpoint

### 2.3 — General Auth Rules
- [x] Role-based access control (RBAC) middleware
  - [x] Admin → all routes
  - [x] Team Leader → scoped routes only
  - [x] Player / Public → read-only scoreboard only
- [x] Token expiry — 24h JWT  ⚠️ *expiry only; no refresh-token flow (stateless logout)*
- [x] Handle unauthorized access with proper error responses

---

## ✅ PHASE 3 — Landing Page (Frontend)

### 3.1 — Visual Design
- [x] Set up esports dark theme (colors, fonts, globals)
- [ ] Create fullscreen animated/GIF esports background  ⚠️ *uses a static themed grid/hero background instead of an animated GIF*
- [x] Add overlay so text is readable over the background
- [x] Ensure responsive layout (desktop + mobile)  ⚠️ *basic responsiveness; not exhaustively tested*

### 3.2 — Navigation Buttons
- [x] **Admin Login** button
  - [x] Clicking opens login form / redirects to login page
- [x] **Player / Team Login** button
  - [x] Sub-menu / dropdown options  ⚠️ *current: "Team Leader Login / Sign Up" + "Join a Team"; "Create a Team" now lives on the Leader Login page*
    - [x] Login as Team Leader
    - [x] Create a Team *(moved to Leader Login page link)*
    - [x] Join a Team
- [x] **Scoreboard** button
  - [x] Redirects to public scoreboard page

### 3.3 — Login Forms
- [x] Admin login form (username + password)
- [x] Team Leader login form (username + password)
- [x] Form validation (empty fields, wrong credentials feedback)
- [x] Loading state while authenticating
- [x] Redirect to correct dashboard on success

---

## ✅ PHASE 4 — Team & Player Registration Flows

### 4.1 — Create a Team Flow
- [x] Build "Create a Team" form:
  - [x] Team Name field
  - [x] Team Leader Name field
  - [x] Game/Tournament selector (dropdown — populated from active games)
  - [x] *(No password field — credentials are auto-generated)*
- [x] On submit:
  - [x] Create team entry in DB
  - [x] Auto-generate unique Team Code (6–8 alphanumeric chars)
  - [x] Auto-generate Team Leader login credentials:
    - [x] Username (based on team + leader name)
    - [x] Password (random generated string)
  - [x] Create team leader user account in DB with generated credentials
  - [x] Show a **credentials card** to the leader on success:
    - [x] Generated Username
    - [x] Generated Password
    - [x] Team Unique Code
    - [x] Copy button for each / copy all button
    - [x] Warning: *"Save these credentials, they won't be shown again"*
- [x] API endpoint: `POST /teams/create`

### 4.2 — Join a Team Flow
- [x] Build "Join a Team" form:
  - [x] Full Name field
  - [x] In-Game Username / ID field
  - [x] Extra fields (email, phone — optional)
  - [x] Team Unique Code field
- [x] On submit:
  - [x] Validate team code exists
  - [x] Add player to the matched team in DB
  - [x] Show success confirmation message
- [x] API endpoint: `POST /players/join`
- [x] Handle errors:
  - [x] Invalid team code
  - [x] Team doesn't exist
  - [x] Duplicate player entry (same IGN + same team)

---

## 🟡 PHASE 5 — Admin Panel

### 5.1 — Admin Dashboard Layout
- [x] Build admin sidebar/navbar with all sections
- [x] Dashboard home — quick stats overview:
  - [x] Total games active
  - [x] Total teams registered
  - [x] Total players registered
- [x] Protect entire admin panel behind auth check

### 5.2 — Game / Tournament Management
- [x] **Create Game** form (title, tournament name, rounds, status toggle)
- [x] On game creation:
  - [x] Add to DB
  - [x] Auto-appear in "Create a Team" game dropdown
  - [x] Scoreboard entry exists for teams  ⚠️ *score rows are created per-team at team creation (not at game creation)*
- [x] List of all created games with status
- [x] Edit / Delete game option
- [x] API endpoints: `POST /games/create`, `GET /games/all`, `PATCH /games/:id`, `DELETE /games/:id`

### 5.3 — Team Management
- [x] View all teams in a table (Name, Game, Code, Player Count, Leader)
- [x] **Add team manually** (with credentials card)
- [ ] **Edit team details**  ⚠️ *backend `PATCH /teams/:id` exists, but not exposed in the admin UI*
- [x] **Delete a team** (removes team + linked players + leader user)
- [x] API endpoints: `GET /teams/all`, `POST /teams/create`, `PATCH /teams/:id`, `DELETE /teams/:id`

### 5.4 — Player Data Management
- [x] View all players in flat table
- [x] Search/filter by team or player name
- [ ] **Edit any player's data**  ⚠️ *backend `PATCH /players/:id` exists, but not exposed in the admin UI*
- [x] **Delete any player**
- [x] **Add player manually** to any team
- [x] API endpoints: `GET /players/all`, `POST /players/add`, `PATCH /players/:id`, `DELETE /players/:id`

### 5.5 — Scoreboard Management (Admin Side)
- [x] Select a game/tournament to manage scores for
- [x] View all teams registered under that game
- [x] Input score per round per team (dynamic round columns)
- [x] Total auto-calculated from all round scores
- [x] Update/overwrite scores for a team
- [x] Scores reflect immediately on public scoreboard
- [x] API endpoints: `POST /scores/update`, `GET /scores/:gameId`

### 5.6 — Data Export
- [x] Export button visible in admin panel
- [x] Choose data type (Players / Scoreboard / Combined)
- [ ] Choose fields to include (custom field selection)  ⚠️ *backend `/export` accepts a `fields` array, but the UI doesn't expose a per-field picker yet*
- [x] Choose export format — CSV
- [x] Generate and download file on confirm
- [x] API endpoint: `POST /export`

---

## 🔴 PHASE 6 — Team Leader Panel  *(MAIN REMAINING FEATURE)*

> Backend is ready; the frontend `LeaderDashboard.jsx` is currently just a greeting card + logout.

### 6.1 — Team Leader Dashboard Layout
- [x] Build scoped dashboard — only shows their own team  ✅ *`/player` hub (PlayerHub.jsx)*
- [x] Display:
  - [x] Team Name
  - [x] Game/Tournament registered under
  - [x] Team Unique Code (with copy button)
  - [x] Full player roster table

### 6.2 — Team Leader Capabilities
- [ ] **Edit own profile / player data** (name, IGN, contact)
- [ ] **Edit team information** (team name — admin override rules TBD)
- [ ] **Remove a player** from their team (with confirmation prompt)
- [ ] Cannot view or modify other teams *(enforced on backend already)*
- [x] API endpoints exist:
  - [x] `GET /teams/my` *(own team only)*
  - [x] `PATCH /players/:id` *(scoped — own team players only)*
  - [x] `DELETE /players/:id` *(scoped)*
  - [ ] `PATCH /teams/my`  ⚠️ *not implemented; team update is `PATCH /teams/:id` with an ownership check*

---

## ✅ PHASE 7 — Public Scoreboard Page

### 7.1 — Game Selector
- [x] Page loads with a list of all **active** games/tournaments
- [x] Display as dropdown selector
- [x] Selecting a game loads its scoreboard

### 7.2 — Scoreboard Display
- [x] Fetch and display scores for selected game
- [x] Table columns: Rank, Team Name, dynamic Round columns, Total Score
- [x] Sorted descending by total score automatically
- [x] Styled with esports theme (top-3 highlight 🥇🥈🥉)
- [x] Refresh/live update — silent 15s polling on the public scoreboard
- [x] API endpoint: `GET /scores/:gameId`

---

## 🟡 PHASE 8 — Polish & Edge Cases

### 8.1 — Validation & Error Handling
- [x] Forms have validation  ⚠️ *client = HTML `required`; server = presence checks (no schema validation lib yet)*
- [x] Invalid team code → clear error message
- [x] Duplicate player in same team → rejected with message
- [x] Duplicate team name → blocked with 409, scoped per tournament (player + admin create paths)
- [x] Admin deletes game → linked teams/scores handled (cascade)
- [x] Empty scoreboard state → placeholder message

### 8.2 — UI/UX Polish
- [x] Loading spinners on async actions
- [x] Success/error toast notifications (admin)
- [x] Confirm dialogs before destructive actions
- [x] Empty state designs for tables
- [x] Smooth page transitions (fade/slide)

### 8.3 — Security Checks
- [x] All admin routes verified on backend (not just frontend-hidden)
- [x] Team leader cannot access other teams' data via direct API calls (ownership checks)
- [x] Input safety — parameterized SQL + **Zod validation** on key write endpoints
- [x] Rate limiting on auth endpoints  ✅ *express-rate-limit — 30/15min on `/auth`, 300/15min global*
- [x] Team code collision handling (unique generation with retry)

---

## 🟡 PHASE 9 — Testing

> Smoke-tested this session via API/curl: admin login, JWT enforcement (old token rejected), health, games/scores fetch, app boot. Systematic testing still pending.

- [ ] Test all auth flows (admin, leader, public)  ⚠️ *admin verified; leader/public pending*
- [ ] Test team creation + code generation
- [ ] Test player join via code (valid + invalid code cases)
- [ ] Test full admin CRUD on teams and players
- [ ] Test score upload + public scoreboard reflection
- [ ] Test export with all field/format combinations
- [ ] Test role isolation (leader can't access admin routes)
- [ ] Test mobile responsiveness across screen sizes
- [ ] Stress test with multiple teams + players

---

## ⬜ PHASE 10 — Deployment

- [ ] Choose hosting platform (TBD — see ADR-002 in ARCHITECTURE.md)
- [ ] Set up production environment variables  ⚠️ *groundwork laid: env-driven config + `.env.example` files*
- [ ] Deploy backend / API
- [ ] Deploy frontend
- [x] Connect to production database  ✅ *Supabase Postgres (cloud) is already the live DB*
- [ ] Test all flows on live deployment
- [ ] Set up domain (if applicable)
- [ ] Final review and go-live

---

## 📋 Pending / TBD Items

- [x] ~~Decide tech stack~~ → React + Vite · Node/Express · **Supabase Postgres via Prisma** (was SQLite/better-sqlite3; migrated in ADR-006)
- [x] ~~Define extra player fields~~ → email, phone (both optional)
- [ ] Decide on real-time strategy (polling vs WebSockets for scoreboard)
- [x] ~~Admin account creation flow~~ → seeded via `npm run seed` (`admin` / `admin123`)
- [ ] Rules around team leader editing team name (admin approval needed?)
- [x] ~~Rounds per game — fixed or dynamic?~~ → dynamic per game (`num_rounds`)
- [ ] More export formats beyond CSV (PDF, Excel?)
- [ ] Expose admin edit-team & edit-player in the UI (backend already supports both)
- [ ] Custom field selection in the export UI
- [ ] More phases to be added as scope expands...

---

*Cross off checkboxes as you build. Keep the Progress Log at the top current each session.*
