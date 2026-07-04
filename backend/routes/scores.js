/**
 * Score Routes (Prisma / Supabase)
 * POST /scores/update  — upsert a team's round scores (admin, owner-scoped)
 * GET  /scores/:gameId — public ranked scoreboard
 */

const express = require('express');
const router = express.Router();
const { games, teams, scores } = require('../repositories');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { scoreUpdateSchema } = require('../validation/schemas');
const asyncHandler = require('../utils/asyncHandler');

router.post('/update', requireAdmin, validate(scoreUpdateSchema), asyncHandler(async (req, res) => {
  const team_id = Number(req.body.team_id);
  const game_id = Number(req.body.game_id);
  const { round_scores } = req.body;

  const team = await teams.findById(team_id);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const game = await games.findById(game_id);
  if (!game) return res.status(404).json({ error: 'Game not found.' });
  if (game.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only update scores for your own tournaments.' });
  }

  const total_score = round_scores.reduce((sum, s) => sum + s, 0);
  await scores.upsert({ team_id, game_id, round_scores, total_score });

  res.json({ message: 'Scores updated.', score: { team_id, game_id, round_scores, total_score } });
}));

router.get('/:gameId', asyncHandler(async (req, res) => {
  const gameId = Number(req.params.gameId);
  const game = await games.findById(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found.' });

  res.json({
    game: { id: game.id, game_title: game.game_title, tournament_name: game.tournament_name, num_rounds: game.num_rounds },
    scoreboard: await scores.scoreboard(gameId),
  });
}));

module.exports = router;
