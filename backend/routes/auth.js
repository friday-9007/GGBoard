/**
 * Auth Routes (Prisma / Supabase)
 * Unified:  POST /auth/signup, /auth/select-role, /auth/login
 * Legacy:   POST /auth/register, /auth/admin/login, /auth/leader/login, /auth/admin/register
 *           POST /auth/logout
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users } = require('../repositories');
const { generateToken, requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, signupSchema, selectRoleSchema } = require('../validation/schemas');
const asyncHandler = require('../utils/asyncHandler');

const publicUser = (u, overrides = {}) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  displayName: u.display_name,
  teamId: u.team_id || null,
  ...overrides,
});

/**
 * POST /auth/signup  (step 1 of 2)
 * Creates a pending account (role not yet chosen). Duplicate username -> 409 here.
 */
router.post('/signup', validate(signupSchema), asyncHandler(async (req, res) => {
  const { username, password, display_name } = req.body;
  const uname = String(username).trim();

  if (await users.findByUsername(uname)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const user = await users.create({
    username: uname,
    password_hash: passwordHash,
    role: 'team_leader',  // placeholder; finalised on /auth/select-role
    role_selected: false,
    display_name: String(display_name || uname).trim(),
  });

  res.status(201).json({
    message: 'Account created. Choose your role to continue.',
    token: generateToken(user),
    user: publicUser(user, { role: null, teamId: null, rolePending: true }),
  });
}));

/**
 * POST /auth/select-role  (step 2 of 2)
 * Finalises a pending account's role. Auth required; must still be pending.
 */
router.post('/select-role', requireAuth, validate(selectRoleSchema), asyncHandler(async (req, res) => {
  const dbRole = { organizer: 'admin', player: 'team_leader' }[req.body.role];

  const user = await users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  if (user.role_selected) return res.status(409).json({ error: 'Your account type is already set.' });

  const updated = await users.setRole(user.id, dbRole);
  res.json({
    message: 'Account type set.',
    token: generateToken(updated),
    user: publicUser(updated, { rolePending: false }),
  });
}));

/**
 * POST /auth/login  (unified) — any role; reports rolePending
 */
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await users.findByUsername(String(username).trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  const rolePending = !user.role_selected;
  res.json({
    message: 'Login successful.',
    token: generateToken(user),
    user: publicUser(user, { role: rolePending ? null : user.role, rolePending }),
  });
}));

/**
 * POST /auth/register  (legacy one-shot sign-up with role)
 */
router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { role, username, password, display_name } = req.body;
  const dbRole = { organizer: 'admin', player: 'team_leader' }[role];
  if (!dbRole) return res.status(400).json({ error: "role must be 'organizer' or 'player'." });

  const uname = String(username).trim();
  if (await users.findByUsername(uname)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const user = await users.create({
    username: uname,
    password_hash: passwordHash,
    role: dbRole,
    role_selected: true,
    display_name: String(display_name || uname).trim(),
  });

  res.status(201).json({ message: 'Account created.', token: generateToken(user), user: publicUser(user, { rolePending: false }) });
}));

/**
 * POST /auth/admin/login  (legacy)
 */
router.post('/admin/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

  const user = await users.findByUsernameAndRole(username, 'admin');
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
  res.json({ message: 'Admin login successful.', token: generateToken(user), user: publicUser(user) });
}));

/**
 * POST /auth/leader/login  (legacy)
 */
router.post('/leader/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

  const user = await users.findByUsernameAndRole(username, 'team_leader');
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid team leader credentials.' });
  }
  res.json({ message: 'Team Leader login successful.', token: generateToken(user), user: publicUser(user) });
}));

/**
 * POST /auth/admin/register  (legacy organizer sign-up)
 */
router.post('/admin/register', asyncHandler(async (req, res) => {
  const { username, password, display_name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
  if (String(username).trim().length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const uname = String(username).trim();
  if (await users.findByUsername(uname)) return res.status(409).json({ error: 'That username is already taken.' });

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const user = await users.create({
    username: uname, password_hash: passwordHash, role: 'admin', role_selected: true, display_name: display_name || uname,
  });
  res.status(201).json({ message: 'Organizer account created.', token: generateToken(user), user: publicUser(user) });
}));

/**
 * POST /auth/logout — stateless (client removes token)
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
