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
const { generateToken, requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, signupSchema, selectRoleSchema } = require('../validation/schemas');

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
 * POST /auth/admin/register
 * Organizer (admin) self sign-up. Each organizer manages only their own events.
 * Returns a token so the new organizer is logged in immediately.
 */
router.post('/admin/register', (req, res) => {
  const { username, password, display_name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (String(username).trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, display_name)
    VALUES (?, ?, 'admin', ?)
  `).run(username, passwordHash, display_name || username);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  res.status(201).json({
    message: 'Organizer account created.',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
    },
  });
});

/**
 * POST /auth/register  (unified)
 * Self sign-up for an organizer (admin) or a player (team-side account).
 * body: { role: 'organizer' | 'player', username, password, display_name }
 */
router.post('/register', validate(registerSchema), (req, res) => {
  const { role, username, password, display_name } = req.body;

  const roleMap = { organizer: 'admin', player: 'team_leader' };
  const dbRole = roleMap[role];
  if (!dbRole) {
    return res.status(400).json({ error: "role must be 'organizer' or 'player'." });
  }
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (String(username).trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = getDb();
  const uname = String(username).trim();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(uname);
  if (existing) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, display_name)
    VALUES (?, ?, ?, ?)
  `).run(uname, passwordHash, dbRole, String(display_name || uname).trim());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  res.status(201).json({
    message: 'Account created.',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
      teamId: user.team_id || null,
    },
  });
});

/**
 * POST /auth/signup  (step 1 of 2)
 * Creates the account from credentials only; the role is chosen next on
 * /auth/select-role. A pending account has role_selected = 0 and a placeholder
 * role, and is blocked from every role-gated route until the role is chosen.
 */
router.post('/signup', validate(signupSchema), (req, res) => {
  const { username, password, display_name } = req.body;
  const db = getDb();

  const uname = String(username).trim();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(uname);
  if (existing) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  // Placeholder role satisfies the NOT NULL + CHECK constraint; role_selected = 0
  // marks it pending, so guards deny access until the real role is chosen.
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, role_selected, display_name)
    VALUES (?, ?, 'team_leader', 0, ?)
  `).run(uname, passwordHash, String(display_name || uname).trim());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);

  res.status(201).json({
    message: 'Account created. Choose your role to continue.',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: null, // not chosen yet
      displayName: user.display_name,
      teamId: null,
      rolePending: true,
    },
  });
});

/**
 * POST /auth/select-role  (step 2 of 2)
 * Finalises a pending account's role. Auth required; must still be pending.
 */
router.post('/select-role', requireAuth, validate(selectRoleSchema), (req, res) => {
  const { role } = req.body;
  const dbRole = { organizer: 'admin', player: 'team_leader' }[role];
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Account not found.' });
  }
  if (user.role_selected) {
    return res.status(409).json({ error: 'Your account type is already set.' });
  }

  db.prepare('UPDATE users SET role = ?, role_selected = 1 WHERE id = ?').run(dbRole, user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const token = generateToken(updated);

  res.json({
    message: 'Account type set.',
    token,
    user: {
      id: updated.id,
      username: updated.username,
      role: updated.role,
      displayName: updated.display_name,
      teamId: updated.team_id || null,
      rolePending: false,
    },
  });
});

/**
 * POST /auth/login  (unified)
 * Logs in any user (organizer/admin or player/team_leader) by username.
 */
router.post('/login', validate(loginSchema), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = generateToken(user);
  const rolePending = !user.role_selected;
  res.json({
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: rolePending ? null : user.role,
      displayName: user.display_name,
      teamId: user.team_id || null,
      rolePending,
    },
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
