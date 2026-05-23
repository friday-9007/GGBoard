/**
 * Player Routes
 * POST   /players/join     — Player joins a team via unique code (public)
 * POST   /players/add      — Admin manually adds a player (admin only)
 * GET    /players/all       — Get all players (admin only)
 * PATCH  /players/:id      — Edit a player
 * DELETE /players/:id      — Delete a player
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { requireAdmin, requireAdminOrLeader } = require('../middleware/auth');

/**
 * POST /players/join
 * Player joins a team using a unique team code
 * Public endpoint
 */
router.post('/join', (req, res) => {
  const { full_name, in_game_name, email, phone, team_code } = req.body;

  if (!full_name || !in_game_name || !team_code) {
    return res.status(400).json({
      error: 'Required fields: full_name, in_game_name, team_code'
    });
  }

  const db = getDb();

  // Find team by code
  const team = db.prepare('SELECT * FROM teams WHERE unique_code = ?').get(team_code.toUpperCase());
  if (!team) {
    return res.status(404).json({ error: 'Invalid team code. No team found with this code.' });
  }

  // Check for duplicate player in same team
  const duplicate = db.prepare(
    'SELECT id FROM players WHERE in_game_name = ? AND team_id = ?'
  ).get(in_game_name, team.id);

  if (duplicate) {
    return res.status(409).json({
      error: 'A player with this in-game name already exists in this team.'
    });
  }

  const result = db.prepare(`
    INSERT INTO players (full_name, in_game_name, email, phone, team_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(full_name, in_game_name, email || null, phone || null, team.id);

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    message: `Successfully joined team "${team.team_name}"!`,
    player,
    team_name: team.team_name
  });
});

/**
 * POST /players/add
 * Admin manually adds a player to any team
 */
router.post('/add', requireAdmin, (req, res) => {
  const { full_name, in_game_name, email, phone, team_id } = req.body;

  if (!full_name || !in_game_name || !team_id) {
    return res.status(400).json({
      error: 'Required fields: full_name, in_game_name, team_id'
    });
  }

  const db = getDb();

  // Verify team exists
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const result = db.prepare(`
    INSERT INTO players (full_name, in_game_name, email, phone, team_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(full_name, in_game_name, email || null, phone || null, team_id);

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    message: 'Player added successfully.',
    player
  });
});

/**
 * GET /players/all
 * Get all players with team info (admin only)
 */
router.get('/all', requireAdmin, (req, res) => {
  const db = getDb();

  // Support optional filters
  const { team_id, game_id, search } = req.query;

  let query = `
    SELECT p.*, 
           t.team_name, 
           t.unique_code as team_code,
           g.game_title,
           g.tournament_name
    FROM players p
    LEFT JOIN teams t ON t.id = p.team_id
    LEFT JOIN games g ON g.id = t.game_id
    WHERE 1=1
  `;
  const params = [];

  if (team_id) {
    query += ' AND p.team_id = ?';
    params.push(team_id);
  }

  if (game_id) {
    query += ' AND t.game_id = ?';
    params.push(game_id);
  }

  if (search) {
    query += ' AND (p.full_name LIKE ? OR p.in_game_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY p.created_at DESC';

  const players = db.prepare(query).all(...params);
  res.json({ players });
});

/**
 * PATCH /players/:id
 * Edit a player's data
 */
router.patch('/:id', requireAdminOrLeader, (req, res) => {
  const { id } = req.params;
  const { full_name, in_game_name, email, phone } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ error: 'Player not found.' });
  }

  // Team leader can only edit players in their own team
  if (req.user.role === 'team_leader' && existing.team_id !== req.user.teamId) {
    return res.status(403).json({ error: 'You can only edit players in your own team.' });
  }

  db.prepare(`
    UPDATE players SET
      full_name = COALESCE(?, full_name),
      in_game_name = COALESCE(?, in_game_name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone)
    WHERE id = ?
  `).run(
    full_name || null,
    in_game_name || null,
    email || null,
    phone || null,
    id
  );

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  res.json({ message: 'Player updated successfully.', player: updated });
});

/**
 * DELETE /players/:id
 * Delete a player
 */
router.delete('/:id', requireAdminOrLeader, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Player not found.' });
  }

  // Team leader can only delete players in their own team
  if (req.user.role === 'team_leader' && existing.team_id !== req.user.teamId) {
    return res.status(403).json({ error: 'You can only remove players from your own team.' });
  }

  db.prepare('DELETE FROM players WHERE id = ?').run(id);
  res.json({ message: 'Player deleted successfully.' });
});

module.exports = router;
