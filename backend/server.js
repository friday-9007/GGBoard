/**
 * ggBoard — Backend Server Entry Point
 * Esports Event Management Platform
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const teamRoutes = require('./routes/teams');
const playerRoutes = require('./routes/players');
const scoreRoutes = require('./routes/scores');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ─── API Routes ──────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/games', gameRoutes);
app.use('/teams', teamRoutes);
app.use('/players', playerRoutes);
app.use('/scores', scoreRoutes);
app.use('/export', exportRoutes);

// ─── Health Check ────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '🎮 ggBoard API is running!', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// ─── Error Handler ───────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎮 ggBoard API Server`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/health`);
  console.log(`   Mode:       ${process.env.NODE_ENV || 'development'}\n`);
});
