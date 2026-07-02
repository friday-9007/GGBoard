/**
 * Game / Tournament Routes
 * POST   /games/create   — Create a new game (admin only)
 * GET    /games/all       — Get all games
 * GET    /games/active     — Get active games only (public)
 * PATCH  /games/:id       — Update a game (admin only)
 * DELETE /games/:id       — Delete a game (admin only)
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { gameCreateSchema } = require('../validation/schemas');

/**
 * POST /games/create
 * Create a new game/tournament
 */
router.post('/create', requireAdmin, validate(gameCreateSchema), (req, res) => {
  const { game_title, tournament_name, status, num_rounds } = req.body;

  if (!game_title || !tournament_name) {
    return res.status(400).json({ error: 'Game title and tournament name are required.' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO games (game_title, tournament_name, status, num_rounds, organizer_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    game_title,
    tournament_name,
    status || 'active',
    num_rounds || 3,
    req.user.id
  );

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    message: 'Game created successfully.',
    game
  });
});

/**
 * GET /games/all
 * Get all games (admin view)
 */
router.get('/all', requireAdmin, (req, res) => {
  const db = getDb();
  const games = db.prepare(`
    SELECT g.*,
           COUNT(DISTINCT t.id) as team_count
    FROM games g
    LEFT JOIN teams t ON t.game_id = g.id
    WHERE g.organizer_id = ?
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(req.user.id);

  res.json({ games });
});

/**
 * GET /games/active
 * Get active games only (for public dropdowns)
 */
router.get('/active', (req, res) => {
  const db = getDb();
  const games = db.prepare("SELECT * FROM games WHERE status = 'active' ORDER BY created_at DESC").all();
  res.json({ games });
});

/**
 * PATCH /games/:id
 * Update a game
 */
router.patch('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { game_title, tournament_name, status, num_rounds } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ error: 'Game not found.' });
  }

  if (existing.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own tournaments.' });
  }

  db.prepare(`
    UPDATE games SET
      game_title = COALESCE(?, game_title),
      tournament_name = COALESCE(?, tournament_name),
      status = COALESCE(?, status),
      num_rounds = COALESCE(?, num_rounds)
    WHERE id = ?
  `).run(
    game_title || null,
    tournament_name || null,
    status || null,
    num_rounds || null,
    id
  );

  const updated = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  res.json({ message: 'Game updated successfully.', game: updated });
});

/**
 * DELETE /games/:id
 * Delete a game and all linked data (cascades)
 */
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Game not found.' });
  }

  if (existing.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own tournaments.' });
  }

  db.prepare('DELETE FROM games WHERE id = ?').run(id);
  res.json({ message: 'Game deleted successfully.' });
});

module.exports = router;
