# ggBoard — Step-by-Step Build Checklist
### Development Checkpoint Reference
---

> Use this as your build roadmap. Check off as you go. Each phase builds on the previous.

---

## ✅ PHASE 1 — Project Setup & Foundation

### 1.1 — Initialize Project
- [x] Choose tech stack (frontend framework, backend, database)
- [x] Set up project folder structure (client / server / database)
- [x] Initialize version control (Git repo)
- [x] Set up environment variables file (`.env`)
- [x] Configure basic README

### 1.2 — Database Setup
- [x] Design and finalize database schema
- [x] Create tables / collections:
  - [x] `games` — tournament/game entries
  - [x] `teams` — team info + unique code + linked game
  - [x] `players` — player details + linked team
  - [x] `scores` — per-round scores + total + linked team + linked game
  - [x] `users` — auth credentials + role (admin / team_leader)
- [x] Set up database connection
- [x] Seed admin account (super-admin credentials)

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
- [x] Token expiry and refresh logic (if needed)
- [x] Handle unauthorized access with proper error responses

---

## ✅ PHASE 3 — Landing Page (Frontend)

### 3.1 — Visual Design
- [ ] Set up esports dark theme (colors, fonts, globals)
- [ ] Create fullscreen animated/GIF esports background
- [ ] Add overlay so text is readable over the background
- [ ] Ensure responsive layout (desktop + mobile)

### 3.2 — Navigation Buttons
- [ ] **Admin Login** button
  - [ ] Clicking opens login form / redirects to login page
- [ ] **Player / Team Login** button
  - [ ] Sub-menu or dropdown with 3 options:
    - [ ] Login as Team Leader
    - [ ] Create a Team
    - [ ] Join a Team
- [ ] **Scoreboard** button
  - [ ] Redirects to public scoreboard page

### 3.3 — Login Forms
- [ ] Admin login form (username + password)
- [ ] Team Leader login form (username + password)
- [ ] Form validation (empty fields, wrong credentials feedback)
- [ ] Loading state while authenticating
- [ ] Redirect to correct dashboard on success

---

## ✅ PHASE 4 — Team & Player Registration Flows

### 4.1 — Create a Team Flow
- [ ] Build "Create a Team" form:
  - [ ] Team Name field
  - [ ] Team Leader Name field
  - [ ] Game/Tournament selector (dropdown — populated from active games)
  - [ ] *(No password field — credentials are auto-generated)*
- [ ] On submit:
  - [ ] Create team entry in DB
  - [ ] Auto-generate unique Team Code (e.g., 6–8 alphanumeric chars)
  - [ ] Auto-generate Team Leader login credentials:
    - [ ] Username (e.g., based on team name or leader name)
    - [ ] Password (random generated string)
  - [ ] Create team leader user account in DB with generated credentials
  - [ ] Show a **credentials card** to the leader on success:
    - [ ] Generated Username
    - [ ] Generated Password
    - [ ] Team Unique Code
    - [ ] Copy button for each / copy all button
    - [ ] Warning: *"Save these credentials, they won't be shown again"*
- [ ] API endpoint: `POST /teams/create`

### 4.2 — Join a Team Flow
- [ ] Build "Join a Team" form:
  - [ ] Full Name field
  - [ ] In-Game Username / ID field
  - [ ] Any extra required fields (email, phone, rank — TBD)
  - [ ] Team Unique Code field
- [ ] On submit:
  - [ ] Validate team code exists
  - [ ] Add player to the matched team in DB
  - [ ] Show success confirmation message
- [ ] API endpoint: `POST /players/join`
- [ ] Handle errors:
  - [ ] Invalid team code
  - [ ] Team doesn't exist
  - [ ] Duplicate player entry (same name + same team)

---

## ✅ PHASE 5 — Admin Panel

### 5.1 — Admin Dashboard Layout
- [ ] Build admin sidebar/navbar with all sections
- [ ] Dashboard home — quick stats overview:
  - [ ] Total games active
  - [ ] Total teams registered
  - [ ] Total players registered
- [ ] Protect entire admin panel behind auth check

### 5.2 — Game / Tournament Management
- [ ] **Create Game** form:
  - [ ] Game title selector (PUBG, Valorant, CODM, CS2, etc.)
  - [ ] Tournament name / label
  - [ ] Status toggle (active / inactive)
- [ ] On game creation:
  - [ ] Add to DB
  - [ ] Auto-appear in "Create a Team" game dropdown
  - [ ] Auto-create scoreboard entry for that game
- [ ] List of all created games with status
- [ ] Edit / Delete game option
- [ ] API endpoints:
  - [ ] `POST /games/create`
  - [ ] `GET /games/all`
  - [ ] `PATCH /games/:id`
  - [ ] `DELETE /games/:id`

### 5.3 — Team Management
- [ ] View all teams in a table:
  - [ ] Team Name, Game, Team Code, Player Count, Team Leader
- [ ] **Add team manually** (bypass normal registration flow)
- [ ] **Edit team details**
- [ ] **Delete a team** (removes team + all linked players)
- [ ] API endpoints:
  - [ ] `GET /teams/all`
  - [ ] `POST /teams/create` *(shared with create flow)*
  - [ ] `PATCH /teams/:id`
  - [ ] `DELETE /teams/:id`

### 5.4 — Player Data Management
- [ ] View all players grouped by team OR in flat table
- [ ] Search/filter by team, game, or player name
- [ ] **Edit any player's data** (name, IGN, contact details, etc.)
- [ ] **Delete any player**
- [ ] **Add player manually** to any team
- [ ] API endpoints:
  - [ ] `GET /players/all`
  - [ ] `POST /players/add`
  - [ ] `PATCH /players/:id`
  - [ ] `DELETE /players/:id`

### 5.5 — Scoreboard Management (Admin Side)
- [ ] Select a game/tournament to manage scores for
- [ ] View all teams registered under that game
- [ ] Input score per round per team:
  - [ ] Round 1, Round 2, Round 3 ... (dynamic round columns)
  - [ ] Total auto-calculated from all round scores
- [ ] Update/overwrite scores for a team
- [ ] Scores reflect immediately on public scoreboard
- [ ] API endpoints:
  - [ ] `POST /scores/update`
  - [ ] `GET /scores/:gameId`

### 5.6 — Data Export
- [ ] Export button visible in admin panel
- [ ] Export configuration modal:

  **Step 1 — Choose data type:**
  - [ ] Player Data only
  - [ ] Scoreboard only
  - [ ] Combined (Players + Scores)

  **Step 2 — Choose fields to include:**
  - [ ] Team Name
  - [ ] Player Name(s)
  - [ ] In-Game Username
  - [ ] Per-Round Scores
  - [ ] Total Score
  - [ ] Game / Tournament
  - [ ] *(Custom field selection)*

  **Step 3 — Choose export format:**
  - [ ] CSV *(primary)*
  - [ ] *(More formats TBD)*

- [ ] Generate and download file on confirm
- [ ] API endpoint: `POST /export` *(with field config in body)*

---

## ✅ PHASE 6 — Team Leader Panel

### 6.1 — Team Leader Dashboard Layout
- [ ] Build scoped dashboard — only shows their own team
- [ ] Display:
  - [ ] Team Name
  - [ ] Game/Tournament registered under
  - [ ] Team Unique Code (with copy button)
  - [ ] Full player roster table

### 6.2 — Team Leader Capabilities
- [ ] **Edit own profile / player data**
  - [ ] Update name, IGN, contact details
- [ ] **Edit team information**
  - [ ] Update team name (admin override rules TBD)
- [ ] **Remove a player** from their team
  - [ ] Confirmation prompt before delete
- [ ] Cannot view or modify other teams
- [ ] API endpoints:
  - [ ] `GET /teams/my` *(own team only)*
  - [ ] `PATCH /players/:id` *(scoped — own team players only)*
  - [ ] `DELETE /players/:id` *(scoped)*
  - [ ] `PATCH /teams/my`

---

## ✅ PHASE 7 — Public Scoreboard Page

### 7.1 — Game Selector
- [ ] Page loads with a list of all **active** games/tournaments
- [ ] Display as cards or dropdown selector
- [ ] Clicking a game loads its scoreboard

### 7.2 — Scoreboard Display
- [ ] Fetch and display scores for selected game
- [ ] Table columns:
  - [ ] Rank (auto — 1st, 2nd, 3rd...)
  - [ ] Team Name
  - [ ] Round 1, Round 2, Round 3 ... (dynamic columns based on rounds played)
  - [ ] Total Score
- [ ] Sorted in **descending order** by total score automatically
- [ ] Styled with esports theme (highlight top 3 teams, etc.)
- [ ] Refresh/live update indicator (polling or websocket — TBD)
- [ ] API endpoint: `GET /scores/:gameId`

---

## ✅ PHASE 8 — Polish & Edge Cases

### 8.1 — Validation & Error Handling
- [ ] All forms have client-side + server-side validation
- [ ] Invalid team code → clear error message
- [ ] Duplicate player in same team → rejected with message
- [ ] Duplicate team name → warning or block
- [ ] Admin deletes game → handle linked teams/scores gracefully
- [ ] Empty scoreboard state (no scores yet) → show placeholder message

### 8.2 — UI/UX Polish
- [ ] Loading spinners on all async actions
- [ ] Success/error toast notifications
- [ ] Confirm dialogs before all destructive actions (delete, remove)
- [ ] Empty state designs for tables (no teams, no players yet)
- [ ] Smooth page transitions

### 8.3 — Security Checks
- [ ] All admin routes verified on backend (not just frontend-hidden)
- [ ] Team leader cannot access other teams' data via direct API calls
- [ ] Input sanitization on all form fields
- [ ] Rate limiting on auth endpoints
- [ ] Team code collision handling (ensure uniqueness on generation)

---

## ✅ PHASE 9 — Testing

- [ ] Test all auth flows (admin, leader, public)
- [ ] Test team creation + code generation
- [ ] Test player join via code (valid + invalid code cases)
- [ ] Test full admin CRUD on teams and players
- [ ] Test score upload + public scoreboard reflection
- [ ] Test export with all field/format combinations
- [ ] Test role isolation (leader can't access admin routes)
- [ ] Test mobile responsiveness across screen sizes
- [ ] Stress test with multiple teams + players

---

## ✅ PHASE 10 — Deployment

- [ ] Choose hosting platform (Vercel, Railway, Render, VPS — TBD)
- [ ] Set up production environment variables
- [ ] Deploy backend / API
- [ ] Deploy frontend
- [ ] Connect to production database
- [ ] Test all flows on live deployment
- [ ] Set up domain (if applicable)
- [ ] Final review and go-live

---

## 📋 Pending / TBD Items

- [ ] Decide tech stack (React? Next.js? Node/Express? Django? PostgreSQL? MongoDB?)
- [ ] Define all extra player fields (email, phone, rank, etc.)
- [ ] Decide on real-time strategy (polling vs WebSockets for scoreboard)
- [ ] Admin account creation flow (how is the first admin created?)
- [ ] Rules around team leader editing team name (admin approval needed?)
- [ ] Number of rounds per game — fixed or dynamic per tournament?
- [ ] More export formats beyond CSV (PDF, Excel?)
- [ ] More phases to be added as scope expands...

---

*Cross off checkboxes as you build. New phases will be appended at the bottom.*
