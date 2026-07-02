/**
 * Team Routes
 * POST   /teams/create — Create a team (player: self becomes leader; organizer: auto-gen leader account)
 * GET    /teams/all    — All teams in the organizer's tournaments (admin only)
 * GET    /teams/my     — Own team + roster (player)
 * PATCH  /teams/:id    — Update a team (organizer of the tournament, or the team's leader)
 * DELETE /teams/:id    — Delete a team; member accounts are unlinked, never deleted (admin only)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { requireAdmin, requireTeamLeader, requireAdminOrLeader, generateToken } = require('../middleware/auth');
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
 * Protected. Behaviour depends on the caller's role:
 *  - team_leader (player): the caller becomes the team's leader (self-service).
 *  - admin (organizer): manually creates a team + auto-generated leader account.
 */
router.post('/create', requireAdminOrLeader, (req, res) => {
  const db = getDb();

  // ─── Player self-service: caller becomes the leader ───
  if (req.user.role === 'team_leader') {
    const { team_name, game_id } = req.body;

    if (!team_name || !game_id) {
      return res.status(400).json({ error: 'team_name and game_id are required.' });
    }
    // Check membership against the DB, not the token claim — the claim can be
    // stale (e.g. the player's previous team was deleted after the token was issued).
    const me = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (me && me.team_id) {
      return res.status(409).json({ error: 'You already belong to a team.' });
    }

    const game = db.prepare("SELECT * FROM games WHERE id = ? AND status = 'active'").get(game_id);
    if (!game) {
      return res.status(400).json({ error: 'Invalid or inactive game/tournament.' });
    }
    const dupName = db.prepare('SELECT id FROM teams WHERE team_name = ? AND game_id = ?').get(team_name, game_id);
    if (dupName) {
      return res.status(409).json({ error: 'A team with this name already exists in this tournament.' });
    }

    const uniqueCode = generateUniqueCode();
    let teamId;
    try {
      teamId = db.transaction(() => {
        const teamResult = db.prepare(`
          INSERT INTO teams (team_name, unique_code, game_id, leader_id)
          VALUES (?, ?, ?, ?)
        `).run(team_name, uniqueCode, game_id, req.user.id);
        const tId = teamResult.lastInsertRowid;

        db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(tId, req.user.id);
        db.prepare(`INSERT INTO scores (team_id, game_id, round_scores, total_score) VALUES (?, ?, '[]', 0)`).run(tId, game_id);
        return tId;
      })();
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'Team name or code already exists.' });
      }
      throw err;
    }

    // Refresh token so it now carries the new teamId
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Team created successfully!',
      team: { id: teamId, team_name, unique_code: uniqueCode, game: game.tournament_name },
      token,
      user: {
        id: user.id, username: user.username, role: user.role,
        displayName: user.display_name, teamId: user.team_id,
      },
    });
  }

  // ─── Organizer manual add: auto-generate a leader account ───
  const { team_name, leader_name, game_id } = req.body;

  if (!team_name || !leader_name || !game_id) {
    return res.status(400).json({ error: 'All fields are required: team_name, leader_name, game_id' });
  }

  const game = db.prepare("SELECT * FROM games WHERE id = ? AND status = 'active'").get(game_id);
  if (!game) {
    return res.status(400).json({ error: 'Invalid or inactive game/tournament.' });
  }
  if (game.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only add teams to your own tournaments.' });
  }
  const dupTeamName = db.prepare('SELECT id FROM teams WHERE team_name = ? AND game_id = ?').get(team_name, game_id);
  if (dupTeamName) {
    return res.status(409).json({ error: 'A team with this name already exists in this tournament.' });
  }

  const username = generateLeaderUsername(team_name, leader_name, db);
  const password = generateRandomPassword();
  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const uniqueCode = generateUniqueCode();

  const createTeam = db.transaction(() => {
    const userResult = db.prepare(`
      INSERT INTO users (username, password_hash, role, display_name)
      VALUES (?, ?, 'team_leader', ?)
    `).run(username, passwordHash, leader_name);
    const leaderId = userResult.lastInsertRowid;

    const teamResult = db.prepare(`
      INSERT INTO teams (team_name, unique_code, game_id, leader_id)
      VALUES (?, ?, ?, ?)
    `).run(team_name, uniqueCode, game_id, leaderId);
    const teamId = teamResult.lastInsertRowid;

    db.prepare('UPDATE users SET team_id = ? WHERE id = ?').run(teamId, leaderId);
    db.prepare(`INSERT INTO scores (team_id, game_id, round_scores, total_score) VALUES (?, ?, '[]', 0)`).run(teamId, game_id);
    return teamId;
  });

  try {
    const teamId = createTeam();
    res.status(201).json({
      message: 'Team created successfully!',
      team: { id: teamId, team_name, unique_code: uniqueCode, game: game.tournament_name },
      leader_username: username,
      leader_password: password,
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
    WHERE g.organizer_id = ?
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all(req.user.id);

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

  const existing = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  // Every player carries the team_leader role — only the team's actual leader may edit it
  if (req.user.role === 'team_leader' && existing.leader_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team leader can edit the team.' });
  }

  // Organizer can only edit teams within their own tournaments
  if (req.user.role === 'admin') {
    const game = db.prepare('SELECT organizer_id FROM games WHERE id = ?').get(existing.game_id);
    if (!game || game.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit teams in your own tournaments.' });
    }
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

  // Organizer can only delete teams within their own tournaments
  const game = db.prepare('SELECT organizer_id FROM games WHERE id = ?').get(existing.game_id);
  if (!game || game.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete teams in your own tournaments.' });
  }

  // Accounts are real user logins now — never delete them. Instead unlink every
  // member (leader + joiners) so they can create or join another team.
  db.transaction(() => {
    db.prepare('UPDATE users SET team_id = NULL WHERE team_id = ?').run(id);
    db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  })();

  res.json({ message: 'Team and all linked data deleted successfully.' });
});

module.exports = router;
