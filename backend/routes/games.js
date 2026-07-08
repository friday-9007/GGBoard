/**
 * Game / Tournament Routes (Prisma / Supabase)
 * POST   /games/create — Create (admin/organizer)
 * GET    /games/all     — Own games + team counts (admin)
 * GET    /games/active  — Active games (public)
 * PATCH  /games/:id     — Update own game (admin)
 * DELETE /games/:id     — Delete own game (admin, cascades)
 */

const express = require('express');
const router = express.Router();
const { games } = require('../repositories');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { gameCreateSchema } = require('../validation/schemas');
const asyncHandler = require('../utils/asyncHandler');

router.post('/create', requireAdmin, validate(gameCreateSchema), asyncHandler(async (req, res) => {
  const { game_title, tournament_name, status, description, start_date, end_date, registration_start, registration_deadline, team_limit, is_paid, entry_fee, prize_pool, prize_type } = req.body;
  const game = await games.create({
    game_title,
    tournament_name,
    status: status || 'active',
    num_rounds: 3, // rounds are set later, once registration closes
    description: description || null,
    start_date: start_date || null,
    end_date: end_date || null,
    registration_start: registration_start || null,
    registration_deadline: registration_deadline || null,
    team_limit: team_limit ?? null,
    is_paid: !!is_paid,
    entry_fee: is_paid ? (entry_fee ?? null) : null,
    prize_pool: prize_pool || null,
    prize_type: prize_type || null,
    organizer_id: req.user.id,
  });
  res.status(201).json({ message: 'Tournament created successfully.', game });
}));

router.get('/all', requireAdmin, asyncHandler(async (req, res) => {
  res.json({ games: await games.listByOrganizer(req.user.id) });
}));

router.get('/active', asyncHandler(async (req, res) => {
  res.json({ games: await games.listActive() });
}));

// Public event feed for players: active tournaments split into ongoing/upcoming.
router.get('/events', asyncHandler(async (req, res) => {
  const now = Date.now();
  const all = await games.listPublicEvents();

  const ongoing = [];
  const upcoming = [];
  for (const g of all) {
    // Hide finished events (end date passed)
    if (g.end_date && new Date(g.end_date).getTime() < now) continue;

    const started = !g.start_date || new Date(g.start_date).getTime() <= now;
    const notYetOpen = !!(g.registration_start && new Date(g.registration_start).getTime() > now);
    const pastDeadline = !!(g.registration_deadline && new Date(g.registration_deadline).getTime() < now);
    const full = g.team_limit != null && (g.registered_teams || 0) >= g.team_limit;
    const registration_open = !notYetOpen && !pastDeadline && !full;

    const item = { ...g, registration_open, registration_not_open_yet: notYetOpen, registration_full: full };
    (started ? ongoing : upcoming).push(item);
  }

  res.json({ ongoing, upcoming });
}));

router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { game_title, tournament_name, status, num_rounds, description, start_date, end_date,
    registration_start, registration_deadline, team_limit, is_paid, entry_fee, prize_pool, prize_type } = req.body;

  const existing = await games.findById(id);
  if (!existing) return res.status(404).json({ error: 'Game not found.' });
  if (existing.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own tournaments.' });
  }

  // parse a date-ish input; returns Date, null (explicit clear), or undefined (leave alone)
  const parseDate = (v) => {
    if (v === undefined) return undefined;
    if (v === '' || v === null) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  };
  // number-ish: '' / null → null (clear), undefined → leave alone
  const parseNum = (v) => (v === undefined ? undefined : (v === '' || v === null ? null : Number(v)));

  // Only overwrite fields that were actually provided (COALESCE semantics)
  const data = {};
  if (game_title) data.game_title = game_title;
  if (tournament_name) data.tournament_name = tournament_name;
  if (status) data.status = status;
  if (num_rounds) data.num_rounds = Number(num_rounds);
  if (description !== undefined) data.description = description || null;
  if (prize_pool !== undefined) data.prize_pool = prize_pool || null;
  if (prize_type !== undefined) data.prize_type = prize_type || null;
  if (is_paid !== undefined) data.is_paid = !!is_paid;
  const sd = parseDate(start_date); if (sd !== undefined) data.start_date = sd;
  const ed = parseDate(end_date); if (ed !== undefined) data.end_date = ed;
  const rs = parseDate(registration_start); if (rs !== undefined) data.registration_start = rs;
  const rd = parseDate(registration_deadline); if (rd !== undefined) data.registration_deadline = rd;
  const tl = parseNum(team_limit); if (tl !== undefined) data.team_limit = tl; // '' → null = unlimited
  const ef = parseNum(entry_fee); if (ef !== undefined) data.entry_fee = ef;

  const updated = Object.keys(data).length ? await games.update(id, data) : existing;
  res.json({ message: 'Game updated successfully.', game: updated });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await games.findById(id);
  if (!existing) return res.status(404).json({ error: 'Game not found.' });
  if (existing.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own tournaments.' });
  }
  await games.delete(id);
  res.json({ message: 'Game deleted successfully.' });
}));

module.exports = router;
