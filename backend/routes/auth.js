/**
 * Auth Routes
 * POST /auth/admin/login   — Admin login
 * POST /auth/leader/login   — Team Leader login
 * POST /auth/logout          — Logout (client-side token removal)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { generateToken } = require('../middleware/auth');

/**
 * POST /auth/admin/login
 * Admin login with username & password
 */
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?').get(username, 'admin');

  if (!user) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const token = generateToken(user);

  res.json({
    message: 'Admin login successful.',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name
    }
  });
});

/**
 * POST /auth/leader/login
 * Team Leader login with username & password
 */
router.post('/leader/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?').get(username, 'team_leader');

  if (!user) {
    return res.status(401).json({ error: 'Invalid team leader credentials.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid team leader credentials.' });
  }

  const token = generateToken(user);

  res.json({
    message: 'Team Leader login successful.',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
      teamId: user.team_id
    }
  });
});

/**
 * POST /auth/logout
 * Logout — stateless (client removes token)
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
