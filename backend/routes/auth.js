/**
 * Auth Routes (Prisma / Supabase) — separate organizer & player account tables.
 *   POST /auth/signup   (role-first: organizer | player)
 *   POST /auth/login    (checks both account tables)
 *   POST /auth/logout
 *   GET  /auth/me        · PATCH /auth/profile · POST /auth/profile/game  (player profile)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { organizers, players, accounts } = require('../repositories');
const { generateToken, requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { signupSchema, loginSchema, profileSchema, gameProfileSchema } = require('../validation/schemas');
const { upsertGame } = require('../utils/gameProfile');
const asyncHandler = require('../utils/asyncHandler');

// JWT role: 'admin' = organizer account, 'team_leader' = player account.
const publicUser = (id, username, role, displayName) => ({ id, username, role, displayName: displayName || null });

// Full player profile view (never exposes password_hash).
const profileView = (u) => ({
  id: u.id,
  username: u.username,
  role: 'team_leader',
  displayName: u.display_name,
  email: u.email || '',
  phone: u.phone || '',
  games: u.games || [],
  dateOfBirth: u.date_of_birth ? new Date(u.date_of_birth).toISOString().slice(0, 10) : '',
  country: u.country || '',
  city: u.city || '',
  gender: u.gender || '',
  language: u.language || '',
  lookingForTeam: !!u.looking_for_team,
  preferredRole: u.preferred_role || '',
  bio: u.bio || '',
});

/**
 * POST /auth/signup — role-first. Creates the account in organizers or players.
 */
router.post('/signup', validate(signupSchema), asyncHandler(async (req, res) => {
  const { role, username, password, display_name } = req.body;
  const uname = String(username).trim();

  if (await accounts.usernameTaken(uname)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const password_hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const display = String(display_name || uname).trim();

  if (role === 'organizer') {
    const org = await organizers.create({ username: uname, password_hash, display_name: display });
    return res.status(201).json({
      message: 'Organizer account created.',
      token: generateToken({ id: org.id, username: org.username, role: 'admin' }),
      user: publicUser(org.id, org.username, 'admin', org.display_name),
    });
  }

  const pl = await players.create({ username: uname, password_hash, display_name: display });
  res.status(201).json({
    message: 'Player account created.',
    token: generateToken({ id: pl.id, username: pl.username, role: 'team_leader' }),
    user: publicUser(pl.id, pl.username, 'team_leader', pl.display_name),
  });
}));

/**
 * POST /auth/login — one login for both account types.
 */
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const found = await accounts.findByUsername(String(username).trim());
  if (!found || !bcrypt.compareSync(password, found.account.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  const { role, account } = found;
  res.json({
    message: 'Login successful.',
    token: generateToken({ id: account.id, username: account.username, role }),
    user: publicUser(account.id, account.username, role, account.display_name),
  });
}));

router.post('/logout', (req, res) => res.json({ message: 'Logged out successfully.' }));

/**
 * GET /auth/username-available?username=... — used by the sign-up step so a
 * duplicate is reported before the visitor picks a role on the next page.
 */
router.get('/username-available', asyncHandler(async (req, res) => {
  const username = String(req.query.username || '').trim();
  if (username.length < 3) return res.json({ available: false });
  res.json({ available: !(await accounts.usernameTaken(username)) });
}));

/**
 * GET /auth/me — full profile for players; basics for organizers.
 */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const org = await organizers.findById(req.user.id);
    if (!org) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ user: { id: org.id, username: org.username, role: 'admin', displayName: org.display_name } });
  }
  const p = await players.findById(req.user.id);
  if (!p) return res.status(404).json({ error: 'Account not found.' });
  res.json({ user: profileView(p) });
}));

/**
 * PATCH /auth/profile — player accounts only.
 */
router.patch('/profile', requireAuth, validate(profileSchema), asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') return res.status(403).json({ error: 'Only player accounts have a profile.' });

  const { display_name, email, phone, games, date_of_birth, country, city, gender, language, looking_for_team, preferred_role, bio } = req.body;
  const data = {};
  if (display_name !== undefined) data.display_name = display_name || null;
  if (email !== undefined) data.email = email || null;
  if (phone !== undefined) data.phone = phone || null;
  if (games !== undefined) data.games = games;
  if (date_of_birth !== undefined) data.date_of_birth = date_of_birth || null;
  if (country !== undefined) data.country = country || null;
  if (city !== undefined) data.city = city || null;
  if (gender !== undefined) data.gender = gender || null;
  if (language !== undefined) data.language = language || null;
  if (looking_for_team !== undefined) data.looking_for_team = !!looking_for_team;
  if (preferred_role !== undefined) data.preferred_role = preferred_role || null;
  if (bio !== undefined) data.bio = bio || null;

  const updated = Object.keys(data).length ? await players.updateProfile(req.user.id, data) : await players.findById(req.user.id);
  res.json({ message: 'Profile updated.', user: profileView(updated) });
}));

/**
 * POST /auth/profile/game — upsert one game's identity (player accounts).
 */
router.post('/profile/game', requireAuth, validate(gameProfileSchema), asyncHandler(async (req, res) => {
  if (req.user.role !== 'team_leader') return res.status(403).json({ error: 'Only player accounts have game profiles.' });

  const { game, ign, uid } = req.body;
  const p = await players.findById(req.user.id);
  if (!p) return res.status(404).json({ error: 'Account not found.' });

  const games = upsertGame(p.games, { game, ign, uid });
  const updated = await players.updateProfile(req.user.id, { games });
  res.json({ message: 'Game profile saved.', user: profileView(updated) });
}));

module.exports = router;
