# ggBoard — Project Synopsis
### Esports Event Management Web Platform
---

> **Document Status:** Original planning synopsis (the initial vision). For the **as-built** system, see [ARCHITECTURE.md](ARCHITECTURE.md) and [ggBoard_Checklist_updated.md](ggBoard_Checklist_updated.md).
> **Last Updated:** 2026-07-06

---

## 1. Project Overview

**ggBoard** is a full-stack web-based esports event management platform designed to handle the complete lifecycle of an esports tournament — from team registration and player management to live scoreboards and data export. It is built to serve three distinct user roles: **Admins**, **Team Leaders**, and **Players**, each with scoped access and permissions tailored to their responsibilities.

The platform removes the friction of manual tournament management by centralizing everything — game setup, team creation, player data, scoring, and reporting — into one streamlined interface.

> **📌 Implementation update (2026-07):** the build has evolved beyond this original draft. Now live:
> - **Cloud database** — runs on **Supabase Postgres** via **Prisma** (not local SQLite).
> - **Persistent teams + registration** — a team belongs to a **game** and **registers into tournaments**; a player has **one team per game but many games at once** (no longer one-team-per-tournament).
> - **Public event feed** — organizers set event dates/prize; players discover **ongoing/upcoming** tournaments and register the matching team.
> - **Player profiles** — contact info, player details, "looking for a team", and **per-game identities** (Riot ID / Activision ID / BattleTag / UID) that are required to register for that game.
> - **UI/UX** — a glassy dark-neon design system across all screens.
> The current data model, API surface, and decision log (ADR-001…010) live in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 2. Design Theme & Visual Identity

The platform follows an **esports-first visual design language**:

- Dark-themed UI with neon accent colors (electric blue, cyan, or purple — TBD)
- Animated or GIF-based esports background on the landing page (e.g., looping gameplay clips, particle effects, or animated arena visuals)
- Clean, bold typography suited to gaming aesthetics
- Responsive layout for both desktop and mobile use
- The overall feel should evoke a professional tournament stage / broadcast environment

---

## 3. Site Architecture & Page Structure

```
ggBoard
│
├── Landing Page  (Public)
│   ├── Admin Login
│   ├── Player / Team Login
│   │   ├── Login as Team Leader
│   │   ├── Create a Team
│   │   └── Join a Team
│   └── Scoreboard  (Public View)
│       └── Select Game → View Live Scoreboard
│
├── Admin Panel  (Admin Only)
│   ├── Create / Manage Games (Tournaments)
│   ├── View & Edit All Teams & Player Data
│   ├── Upload / Update Scores
│   ├── Manage Teams (Add / Remove Manually)
│   └── Export Data
│
├── Team Leader Panel  (Team Leaders Only)
│   ├── View Own Team & Players
│   ├── Edit Own Profile Data
│   ├── Edit Team Information
│   └── Remove Players from Team
│
└── Player Join Flow  (Players)
    └── Enter Details + Team Unique Code → Join Team
```

---

## 4. User Roles & Access Levels

| Role | Access Level | Key Capabilities |
|---|---|---|
| **Admin** | Full Access | Everything — games, teams, players, scores, exports |
| **Team Leader** | Scoped Access | Own team & player data, team management |
| **Player** | Minimal Access | Join a team via unique code, view scoreboard |
| **Public** | Read-Only | View scoreboard only |

---

## 5. Feature Breakdown by Module

---

### 5.1 — Landing Page

**Entry point of the platform. Publicly accessible.**

**Visual Elements:**
- Fullscreen esports-themed background with animated/GIF overlay
- Centered navigation card or sidebar with the following options

**Navigation Options:**

1. **Admin Login**
   - Redirects to admin credential login
   - On success → Admin Panel

2. **Player / Team Login** *(Dropdown or sub-menu with 3 options)*
   - **Login as Team Leader** → Credential-based login → Team Leader Panel
   - **Create a Team** → Team Leader fills in team info, generates a unique team code
   - **Join a Team** → Player enters their details + a team unique code → Gets added to that team

3. **Scoreboard**
   - Public access — no login required
   - Shows a list of active games/tournaments to select from
   - On selection → Displays the live scoreboard for that game

---

### 5.2 — Admin Panel

**The command center of ggBoard. Accessible only after admin authentication.**

---

#### 5.2.1 — Game / Tournament Management

- Admin can **create a new game/tournament** by selecting from supported game titles:
  - PUBG, Valorant, Call of Duty Mobile (CODM), CS2, and others (expandable list)
- Each created game/tournament:
  - Appears as a selectable option in the **Create a Team** flow (so teams can register under a specific game)
  - Automatically generates a **Scoreboard entry** visible in the public Scoreboard section

---

#### 5.2.2 — Team & Player Data Management

- Admin can view **all registered teams** and their complete player rosters
- Full **CRUD operations** on player data:
  - **Edit** any player's details across any team
  - **Delete** a player from any team
  - **Add** a player manually to any team
- Teams can be **added or removed** manually by the admin without going through the normal registration flow

---

#### 5.2.3 — Scoreboard Management

- Admin can **upload and update scores** for each game round
- Each team's score entry contains:
  - Team Name
  - Per-round points (Round 1, Round 2, Round 3, etc.)
  - Total aggregated score
- Scores are reflected **in real-time** (or near real-time) on the public-facing Scoreboard
- The scoreboard is always displayed in **descending order** (highest score first)

---

#### 5.2.4 — Data Export

Admin can export data in a flexible, configurable format:

**Export Categories:**
- Player Data
- Scoreboard Data
- Combined Data

**Format Options (admin selects what columns/fields to include):**

| Export Preset | Fields Included |
|---|---|
| Team + Score | Team Name, Total Score |
| Team + Players | Team Name, Player Names |
| Full Roster + Score | Team Name, Player Names, Total Score |
| Full Detail | Team Name, Player Names, Per-Round Scores, Total Score |
| Custom | Admin picks any combination of available fields |

**File Formats:**
- CSV (primary)
- More formats TBD

The export dialog/modal will walk the admin through selecting the data category, fields, and format before downloading.

---

### 5.3 — Team Leader Panel

**Scoped dashboard accessible only to authenticated team leaders.**

**Capabilities:**
- View their own team's full player roster
- **Edit their own profile/player data**
- **Edit team information** (team name, etc. — subject to admin override rules TBD)
- **Remove a player** from their team
- Cannot access other teams' data or admin-level features

---

### 5.4 — Create a Team Flow

**Accessible from the Landing Page → Player/Team Login → Create a Team**

Steps:
1. Team Leader fills in:
   - Team Name
   - Team Leader Name
   - Select the active Game/Tournament to register under
   - *(No password field — credentials are auto-generated by the system)*
2. On submission, the system automatically generates:
   - A **unique Team Code** (e.g., alphanumeric 6–8 characters) — used by players to join
   - A **Team Leader Username** (e.g., derived from team name or leader name)
   - A **Team Leader Password** (randomly generated)
3. A **credentials card** is shown immediately after creation containing:
   - Generated Username
   - Generated Password
   - Team Unique Code
   - Copy buttons for each field
   - ⚠️ Warning message: *"Save these credentials now — they will not be shown again"*
4. Team Leader uses these credentials to log in later via **Login as Team Leader**
5. Team Leader shares the Team Code with their players so they can join

---

### 5.5 — Join a Team Flow

**Accessible from the Landing Page → Player/Team Login → Join a Team**

Steps:
1. Player enters their personal details:
   - Full Name
   - In-game Username / ID
   - Any other required fields (TBD — e.g., phone, email, rank, etc.)
2. Player enters the **Team Unique Code** provided by their team leader
3. On successful validation → Player is added to the corresponding team's roster
4. Player data becomes visible to their Team Leader and the Admin

---

### 5.6 — Public Scoreboard

**Accessible without login from the Landing Page.**

Flow:
1. User clicks **Scoreboard** on the landing page
2. A list of **active games/tournaments** is displayed (auto-populated from admin-created games)
3. User selects a game → Scoreboard loads for that tournament
4. Scoreboard displays:
   - Teams ranked in **descending order** by total score
   - Each team's score broken down **per round**
   - Clean, readable table layout with esports-themed styling

---

## 6. Data Model (High-Level)

> *(Full schema to be defined in a later revision)*

**Core Entities:**
- `Game / Tournament` — name, game title, status (active/inactive), created date
- `Team` — team name, unique code, linked game, team leader reference
- `Player` — name, IGN, contact details, linked team
- `Score Entry` — team reference, game reference, round scores array, total score
- `User / Auth` — role (admin / team\_leader), credentials

---

## 7. Key Functional Requirements Summary

| # | Requirement | Priority |
|---|---|---|
| 1 | Role-based access control (Admin, Team Leader, Player) | High |
| 2 | Game/Tournament creation by Admin | High |
| 3 | Team creation with unique join code generation | High |
| 4 | Player self-registration via join code | High |
| 5 | Admin CRUD on all player & team data | High |
| 6 | Scoreboard auto-sorted descending with per-round breakdown | High |
| 7 | Flexible CSV/data export with configurable fields | High |
| 8 | Esports-themed animated landing page | Medium |
| 9 | Real-time or near-real-time scoreboard updates | Medium |
| 10 | Mobile responsiveness | Medium |

---

## 8. Out of Scope (Phase 1)

- Live game data API integration (e.g., PUBG/Riot APIs)
- In-app chat or communication features
- Match bracket system / elimination draws
- Player statistics and performance analytics
- Spectator or streaming integration

*(These may be considered for future phases)*

---

## 9. Sections Pending (To Be Added)

- [ ] Tech Stack & Architecture decisions
- [ ] Authentication & Security approach
- [ ] Database design / full schema
- [ ] API endpoint planning
- [ ] UI wireframe descriptions / mockup references
- [ ] Deployment & hosting plan
- [ ] Admin account creation / super-admin flow
- [ ] Edge cases & validation rules (e.g., duplicate team names, invalid codes)

---

*This is a living document. More sections will be appended as the project scope is finalized.*
