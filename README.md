# ggBoard 🎮
### Esports Event Management Web Platform

ggBoard is a full-stack, esports-first event management web platform that streamlines the complete lifecycle of esports tournaments — organizers publish tournaments with dates and prizes, players build lasting teams and register into events, admins post round scores, and a public live scoreboard ranks teams in real time.

## ✨ Features
- **Organizers (multi-tenant):** create tournaments with event details (start/end dates, registration deadline, prize pool, description), manage registered teams and players, post round scores, and export CSV — each organizer scoped to their own tournaments.
- **Players:** persistent teams — **one per game** (Valorant, BGMI, CS2, …) but **many games at once**; discover tournaments in a public **event feed** and register the matching team; live standings across every event you enter.
- **Profiles:** contact details, player info (DOB/age, country/city), a "looking for a team" flag, and **per-game identities** (Riot ID `Name#Tag`, Activision ID, BattleTag, UID, Platform) — required to register for that game's events.
- **Public:** a live scoreboard and an events feed browsable without an account.

---

## 🚀 Tech Stack

### Backend
- **Runtime / Framework**: Node.js + Express.js (REST)
- **Database**: **Supabase Postgres** via **Prisma** (behind a repository layer); `jsonb` for round scores + per-game identities
- **Auth & safety**: JWT (`jsonwebtoken`) + `bcryptjs`, Zod request validation, `express-rate-limit`

### Frontend
- **Framework**: Vite + React (SPA)
- **Styling**: Vanilla CSS design system — glassy dark neon esports theme
- **HTTP Client**: Axios with automatic JWT attach + 401/403 interception

---

## 📂 Project Structure

```
ggBoard/
├── backend/                  # Express REST API on Supabase Postgres (Prisma)
│   ├── config/               # Prisma client singleton
│   ├── prisma/               # schema.prisma (mirrors the Supabase schema)
│   ├── repositories/         # The ONLY layer that touches Prisma
│   ├── middleware/           # Auth/RBAC, Zod validation, rate limit, error handler
│   ├── routes/               # Auth, Games, Teams, Players, Scores, Export
│   ├── utils/                # Helpers (unique code, async handler, game profile)
│   └── server.js             # Entry point
│
└── frontend/                 # Vite + React client
    ├── src/
    │   ├── context/          # Global Auth context
    │   ├── pages/            # Landing, Auth/RoleSelect, PlayerHub, AdminDashboard, PublicScoreboard
    │   ├── utils/            # Axios API instance
    │   ├── index.css         # Design-system tokens + component classes
    │   └── main.jsx
    └── index.html
```

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Backend Setup
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `backend/.env` from `.env.example` with your Supabase connection + a JWT secret:
   ```env
   DATABASE_URL="postgresql://…pooler…:6543/postgres?pgbouncer=true"   # transaction pooler (runtime)
   DIRECT_URL="postgresql://…:5432/postgres"                           # direct (CLI migrations)
   JWT_SECRET="<a long random string>"
   ```
3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
4. *(Optional)* Seed the default admin account:
   ```bash
   npm run seed
   ```
5. Start the API (runs on `http://localhost:3001`):
   ```bash
   npm run dev
   ```

> 🛡️ **Default Admin Credentials**:
> - **Username**: `admin`
> - **Password**: `admin123`
> *(Make sure to update this password after first login!)*

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the local dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the provided Vite URL (usually `http://localhost:5173`).

---

## 🛡️ License
Proprietary. All rights reserved.
