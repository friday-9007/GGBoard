/**
 * Team Routes
 * POST   /teams/create   — Create a new team (public — generates team leader account)
 * GET    /teams/all       — Get all teams (admin only)
 * GET    /teams/my        — Get own team (team leader only)
 * PATCH  /teams/:id       — Update a team
 * PATCH  /teams/my        — Update own team (team leader)
 * DELETE /teams/:id       — Delete a team (admin only)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { requireAdmin, requireTeamLeader, requireAdminOrLeader } = require('../middleware/auth');
const { generateUniqueCode } = require('../utils/generateCode');

// Helper to generate unique team leader username
function generateLeaderUsername(teamName, leaderName, db) {
  const base = (teamName + '_' + leaderName)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '') // keep alphanumeric and underscore
    .substring(0, 15); // limit length
  
  let username = base;
  if (!username) {
    username = 'leader';
  }
  let suffix = 1;
  while (true) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!exists) {
      return username;
    }
    username = `${base || 'leader'}_${suffix}`;
    suffix++;
  }
}

// Helper to generate a random password
function generateRandomPassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * POST /teams/create
 * Create a new team + team leader account
 * Public endpoint (used during registration)
 */
router.post('/create', (req, res) => {
  const { team_name, leader_name, game_id } = req.body;

  if (!team_name || !leader_name || !game_id) {
    return res.status(400).json({
      error: 'All fields are required: team_name, leader_name, game_id'
    });
  }

  const db = getDb();

  // Check if game exists and is active
  const game = db.prepare("SELECT * FROM games WHERE id = ? AND status = 'active'").get(game_id);
  if (!game) {
    return res.status(400).json({ error: 'Invalid or inactive game/tournament.' });
  }

  // Generate unique username
  const username = generateLeaderUsername(team_name, leader_name, db);

  // Generate random password
  const password = generateRandomPassword();

  // Generate unique team code
  const uniqueCode = generateUniqueCode();

  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  // Use a transaction to create both team and user atomically
  const createTeam = db.transaction(() => {
    // Create team leader user
    const userResult = db.prepare(`
      INSERT INTO users (username, password_hash, role, display_name)
      VALUES (?, ?, 'team_leader', ?)
    `).run(username, passwordHash, leader_name);

    const leaderId = userResult.lastInsertRowid;

    // Create team
    const teamResult = db.prepare(`
      INSERT INTO teams (team_name, unique_code, game_id, leader_id)
      VALUES (?, ?, ?, ?)
    `).run(team_name, uniqueCode, game_id, leaderId);

    const teamId = teamResult.lastInsertRowid;

    // Link user to team
    db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(teamId, leaderId);

    // Create a score entry for this team in this game
    db.prepare(`
      INSERT INTO scores (team_id, game_id, round_scores, total_score)
      VALUES (?, ?, '[]', 0)
    `).run(teamId, game_id);

    return { teamId, leaderId, uniqueCode };
  });

  try {
    const result = createTeam();

    res.status(201).json({
      message: 'Team created successfully!',
      team: {
        id: result.teamId,
        team_name,
        unique_code: result.uniqueCode,
        game: game.tournament_name
      },
      leader_username: username,
      leader_password: password
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Team name or code already exists.' });
    }
    throw err;
  }
});

/**
 * GET /teams/all
 * Get all teams with player counts (admin only)
 */
router.get('/all', requireAdmin, (req, res) => {
  const db = getDb();
  const teams = db.prepare(`
    SELECT t.*, 
           g.game_title, 
           g.tournament_name,
           u.display_name as leader_name,
           u.username as leader_username,
           COUNT(p.id) as player_count
    FROM teams t
    LEFT JOIN games g ON g.id = t.game_id
    LEFT JOIN users u ON u.id = t.leader_id
    LEFT JOIN players p ON p.team_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();

  res.json({ teams });
});

/**
 * GET /teams/my
 * Get own team details (team leader only)
 */
router.get('/my', requireTeamLeader, (req, res) => {
  const db = getDb();
  const teamId = req.user.teamId;

  if (!teamId) {
    return res.status(404).json({ error: 'No team associated with your account.' });
  }

  const team = db.prepare(`
    SELECT t.*, 
           g.game_title, 
           g.tournament_name
    FROM teams t
    LEFT JOIN games g ON g.id = t.game_id
    WHERE t.id = ?
  `).get(teamId);

  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const players = db.prepare('SELECT * FROM players WHERE team_id = ? ORDER BY created_at ASC').all(teamId);

  res.json({ team, players });
});

/**
 * PATCH /teams/:id
 * Update team details (admin or own team leader)
 */
router.patch('/:id', requireAdminOrLeader, (req, res) => {
  const { id } = req.params;
  const { team_name } = req.body;

  const db = getDb();

  // Team leader can only edit their own team
  if (req.user.role === 'team_leader' && req.user.teamId !== parseInt(id)) {
    return res.status(403).json({ error: 'You can only edit your own team.' });
  }

  const existing = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  if (team_name) {
    db.prepare('UPDATE teams SET team_name = ? WHERE id = ?').run(team_name, id);
  }

  const updated = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  res.json({ message: 'Team updated successfully.', team: updated });
});

/**
 * DELETE /teams/:id
 * Delete a team and all linked data (admin only)
 */
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  // Delete the team leader user account too
  if (existing.leader_id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(existing.leader_id);
  }

  db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  res.json({ message: 'Team and all linked data deleted successfully.' });
});

module.exports = router;
