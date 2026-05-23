/**
 * Score Routes
 * POST /scores/update      — Update scores for a team (admin only)
 * GET  /scores/:gameId     — Get scoreboard for a game (public)
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

/**
 * POST /scores/update
 */
router.post('/update', requireAdmin, (req, res) => {
  const { team_id, game_id, round_scores } = req.body;

  if (!team_id || !game_id || !round_scores) {
    return res.status(400).json({ error: 'Required: team_id, game_id, round_scores (array)' });
  }
  if (!Array.isArray(round_scores) || !round_scores.every(s => typeof s === 'number')) {
    return res.status(400).json({ error: 'round_scores must be an array of numbers.' });
  }

  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(game_id);
  if (!game) return res.status(404).json({ error: 'Game not found.' });

  const totalScore = round_scores.reduce((sum, s) => sum + s, 0);
  const roundScoresJson = JSON.stringify(round_scores);

  const existing = db.prepare('SELECT * FROM scores WHERE team_id = ? AND game_id = ?').get(team_id, game_id);
  if (existing) {
    db.prepare('UPDATE scores SET round_scores = ?, total_score = ?, updated_at = CURRENT_TIMESTAMP WHERE team_id = ? AND game_id = ?')
      .run(roundScoresJson, totalScore, team_id, game_id);
  } else {
    db.prepare('INSERT INTO scores (team_id, game_id, round_scores, total_score) VALUES (?, ?, ?, ?)')
      .run(team_id, game_id, roundScoresJson, totalScore);
  }

  res.json({ message: 'Scores updated.', score: { team_id, game_id, round_scores, total_score: totalScore } });
});

/**
 * GET /scores/:gameId
 */
router.get('/:gameId', (req, res) => {
  const { gameId } = req.params;
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found.' });

  const scores = db.prepare(`
    SELECT s.*, t.team_name FROM scores s
    LEFT JOIN teams t ON t.id = s.team_id
    WHERE s.game_id = ? ORDER BY s.total_score DESC
  `).all(gameId);

  const scoreboard = scores.map((s, i) => ({
    rank: i + 1, team_name: s.team_name, team_id: s.team_id,
    round_scores: JSON.parse(s.round_scores || '[]'),
    total_score: s.total_score, updated_at: s.updated_at
  }));

  res.json({
    game: { id: game.id, game_title: game.game_title, tournament_name: game.tournament_name, num_rounds: game.num_rounds },
    scoreboard
  });
});

module.exports = router;
