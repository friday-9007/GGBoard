# ggBoard 🎮
### Esports Event Management Web Platform

ggBoard is a full-stack, esports-first event management web platform designed to streamline the complete lifecycle of esports tournaments — from game/tournament setup, team registrations, and player join flows, to real-time public scoreboards and administrative data exports.

---

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via `better-sqlite3` for high-performance WAL-mode reads)
- **Authentication**: JWT (JSON Web Tokens) & password hashing using `bcryptjs`

### Frontend
- **Framework**: Vite + React
- **Styling**: Modern Vanilla CSS with glowing neon dark theme matching professional broadcast stage aesthetics
- **HTTP Client**: Axios with automatic JWT attach/interception

---

## 📂 Project Structure

```
ggBoard/
├── backend/                  # Express REST API & SQLite DB
│   ├── config/               # Database connection settings
│   ├── database/             # Schema definitions and database seeding
│   ├── middleware/           # Role-based access control & global error handling
│   ├── routes/               # API endpoints (Auth, Games, Teams, Players, Scores, Export)
│   ├── utils/                # Helper utilities (unique code generation)
│   └── server.js             # Entry point
│
└── frontend/                 # Vite + React Client
    ├── src/
    │   ├── context/          # Global Auth context
    │   ├── pages/            # View components (Landing, Login, Register, Join)
    │   ├── utils/            # Axios API configurations
    │   ├── index.css         # Theme globals and styling tokens
    │   └── main.jsx
    └── index.html
```

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the local dependencies:
   ```bash
   npm install
   ```
3. Initialize the database and seed the default administrator account:
   ```bash
   npm run seed
   ```
4. Start the development server (runs on `http://localhost:3001`):
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
