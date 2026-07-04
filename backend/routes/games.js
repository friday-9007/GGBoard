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
  const { game_title, tournament_name, status, num_rounds, description, start_date, end_date, registration_deadline, prize_pool } = req.body;
  const game = await games.create({
    game_title,
    tournament_name,
    status: status || 'active',
    num_rounds: num_rounds || 3,
    description: description || null,
    start_date: start_date || null,
    end_date: end_date || null,
    registration_deadline: registration_deadline || null,
    prize_pool: prize_pool || null,
    organizer_id: req.user.id,
  });
  res.status(201).json({ message: 'Game created successfully.', game });
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
    const registration_open = !g.registration_deadline || new Date(g.registration_deadline).getTime() >= now;
    const item = { ...g, registration_open };
    (started ? ongoing : upcoming).push(item);
  }

  res.json({ ongoing, upcoming });
}));

router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { game_title, tournament_name, status, num_rounds, description, start_date, end_date, registration_deadline, prize_pool } = req.body;

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

  // Only overwrite fields that were actually provided (COALESCE semantics)
  const data = {};
  if (game_title) data.game_title = game_title;
  if (tournament_name) data.tournament_name = tournament_name;
  if (status) data.status = status;
  if (num_rounds) data.num_rounds = num_rounds;
  if (description !== undefined) data.description = description || null;
  if (prize_pool !== undefined) data.prize_pool = prize_pool || null;
  const sd = parseDate(start_date); if (sd !== undefined) data.start_date = sd;
  const ed = parseDate(end_date); if (ed !== undefined) data.end_date = ed;
  const rd = parseDate(registration_deadline); if (rd !== undefined) data.registration_deadline = rd;

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
