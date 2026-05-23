/**
 * Export Routes
 * POST /export — Export data as CSV (admin only)
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

router.post('/', requireAdmin, (req, res) => {
  const { data_type, fields, game_id } = req.body;
  // data_type: 'players' | 'scores' | 'combined'
  // fields: array of field names to include
  // game_id: optional filter

  if (!data_type) {
    return res.status(400).json({ error: 'data_type is required (players, scores, combined).' });
  }

  const db = getDb();
  let rows = [];
  let headers = [];

  if (data_type === 'players') {
    let query = `SELECT p.full_name, p.in_game_name, p.email, p.phone, t.team_name, g.game_title, g.tournament_name
      FROM players p LEFT JOIN teams t ON t.id = p.team_id LEFT JOIN games g ON g.id = t.game_id WHERE 1=1`;
    const params = [];
    if (game_id) { query += ' AND t.game_id = ?'; params.push(game_id); }
    rows = db.prepare(query).all(...params);
    headers = fields || ['team_name', 'full_name', 'in_game_name', 'email', 'phone', 'game_title'];
  } else if (data_type === 'scores') {
    let query = `SELECT t.team_name, s.round_scores, s.total_score, g.game_title, g.tournament_name
      FROM scores s LEFT JOIN teams t ON t.id = s.team_id LEFT JOIN games g ON g.id = s.game_id WHERE 1=1`;
    const params = [];
    if (game_id) { query += ' AND s.game_id = ?'; params.push(game_id); }
    query += ' ORDER BY s.total_score DESC';
    rows = db.prepare(query).all(...params);
    headers = fields || ['team_name', 'round_scores', 'total_score', 'game_title'];
  } else if (data_type === 'combined') {
    let query = `SELECT t.team_name, p.full_name, p.in_game_name, s.round_scores, s.total_score, g.game_title
      FROM players p LEFT JOIN teams t ON t.id = p.team_id LEFT JOIN scores s ON s.team_id = t.id AND s.game_id = t.game_id
      LEFT JOIN games g ON g.id = t.game_id WHERE 1=1`;
    const params = [];
    if (game_id) { query += ' AND t.game_id = ?'; params.push(game_id); }
    rows = db.prepare(query).all(...params);
    headers = fields || ['team_name', 'full_name', 'in_game_name', 'round_scores', 'total_score', 'game_title'];
  } else {
    return res.status(400).json({ error: 'Invalid data_type.' });
  }

  // Filter to requested fields only
  const filteredHeaders = headers.filter(h => rows.length === 0 || rows[0].hasOwnProperty(h));

  // Build CSV
  let csv = filteredHeaders.join(',') + '\n';
  rows.forEach(row => {
    const line = filteredHeaders.map(h => {
      let val = row[h] != null ? String(row[h]) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',');
    csv += line + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="ggboard_export_${data_type}_${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = router;
