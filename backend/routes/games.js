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
  const { game_title, tournament_name, status, num_rounds } = req.body;
  const game = await games.create({
    game_title,
    tournament_name,
    status: status || 'active',
    num_rounds: num_rounds || 3,
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

router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { game_title, tournament_name, status, num_rounds } = req.body;

  const existing = await games.findById(id);
  if (!existing) return res.status(404).json({ error: 'Game not found.' });
  if (existing.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own tournaments.' });
  }

  // Only overwrite fields that were actually provided (COALESCE semantics)
  const data = {};
  if (game_title) data.game_title = game_title;
  if (tournament_name) data.tournament_name = tournament_name;
  if (status) data.status = status;
  if (num_rounds) data.num_rounds = num_rounds;

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
