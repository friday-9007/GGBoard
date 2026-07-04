/**
 * Team Routes (Prisma / Supabase)
 * POST   /teams/create — player self becomes leader; admin auto-generates a leader account
 * GET    /teams/all    — all teams in the organizer's tournaments (admin)
 * GET    /teams/my     — own team + roster (player)
 * PATCH  /teams/:id    — organizer of the tournament, or the team's leader
 * DELETE /teams/:id    — delete team; member accounts unlinked, never deleted (admin)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { teams, games, users } = require('../repositories');
const { requireAdmin, requireTeamLeader, requireAdminOrLeader, generateToken } = require('../middleware/auth');
const { generateUniqueCode } = require('../utils/generateCode');
const asyncHandler = require('../utils/asyncHandler');

function generateRandomPassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
}

async function generateLeaderUsername(teamName, leaderName) {
  const base = (teamName + '_' + leaderName).toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 15);
  let username = base || 'leader';
  let suffix = 1;
  while (await users.findByUsername(username)) {
    username = `${base || 'leader'}_${suffix}`;
    suffix++;
  }
  return username;
}

router.post('/create', requireAdminOrLeader, asyncHandler(async (req, res) => {
  // ─── Player self-service: caller becomes the leader ───
  if (req.user.role === 'team_leader') {
    const { team_name, game_id } = req.body;
    if (!team_name || !game_id) return res.status(400).json({ error: 'team_name and game_id are required.' });

    // Check membership against the DB, not the token claim (which can be stale).
    const me = await users.findById(req.user.id);
    if (me && me.team_id) return res.status(409).json({ error: 'You already belong to a team.' });

    const game = await games.findActiveById(Number(game_id));
    if (!game) return res.status(400).json({ error: 'Invalid or inactive game/tournament.' });
    if (await teams.existsNameInGame(team_name, game.id)) {
      return res.status(409).json({ error: 'A team with this name already exists in this tournament.' });
    }

    const uniqueCode = await generateUniqueCode();
    const { team, user } = await teams.createForPlayer({ team_name, unique_code: uniqueCode, game_id: game.id, leaderId: req.user.id });

    return res.status(201).json({
      message: 'Team created successfully!',
      team: { id: team.id, team_name, unique_code: uniqueCode, game: game.tournament_name },
      token: generateToken(user),
      user: { id: user.id, username: user.username, role: user.role, displayName: user.display_name, teamId: user.team_id },
    });
  }

  // ─── Organizer manual add: auto-generate a leader account ───
  const { team_name, leader_name, game_id } = req.body;
  if (!team_name || !leader_name || !game_id) {
    return res.status(400).json({ error: 'All fields are required: team_name, leader_name, game_id' });
  }

  const game = await games.findActiveById(Number(game_id));
  if (!game) return res.status(400).json({ error: 'Invalid or inactive game/tournament.' });
  if (game.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only add teams to your own tournaments.' });
  }
  if (await teams.existsNameInGame(team_name, game.id)) {
    return res.status(409).json({ error: 'A team with this name already exists in this tournament.' });
  }

  const leader_username = await generateLeaderUsername(team_name, leader_name);
  const password = generateRandomPassword();
  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const uniqueCode = await generateUniqueCode();

  const { team } = await teams.createByAdmin({
    team_name, unique_code: uniqueCode, game_id: game.id, leader_name, leader_username, password_hash: passwordHash,
  });

  res.status(201).json({
    message: 'Team created successfully!',
    team: { id: team.id, team_name, unique_code: uniqueCode, game: game.tournament_name },
    leader_username,
    leader_password: password,
  });
}));

router.get('/all', requireAdmin, asyncHandler(async (req, res) => {
  res.json({ teams: await teams.listByOrganizer(req.user.id) });
}));

router.get('/my', requireTeamLeader, asyncHandler(async (req, res) => {
  const teamId = req.user.teamId;
  if (!teamId) return res.status(404).json({ error: 'No team associated with your account.' });
  const result = await teams.getMyTeam(teamId);
  if (!result) return res.status(404).json({ error: 'Team not found.' });
  res.json(result); // { team, players }
}));

router.patch('/:id', requireAdminOrLeader, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { team_name } = req.body;

  const existing = await teams.findById(id);
  if (!existing) return res.status(404).json({ error: 'Team not found.' });

  // Every player carries the team_leader role — only the team's actual leader may edit it
  if (req.user.role === 'team_leader' && existing.leader_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team leader can edit the team.' });
  }
  // Organizer can only edit teams within their own tournaments
  if (req.user.role === 'admin') {
    const organizerId = await teams.organizerId(id);
    if (organizerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit teams in your own tournaments.' });
    }
  }

  const updated = team_name ? await teams.update(id, { team_name }) : existing;
  res.json({ message: 'Team updated successfully.', team: updated });
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await teams.findById(id);
  if (!existing) return res.status(404).json({ error: 'Team not found.' });

  const organizerId = await teams.organizerId(id);
  if (organizerId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete teams in your own tournaments.' });
  }

  // Accounts are real logins — never delete them; unlink every member instead.
  await teams.deleteAndUnlink(id);
  res.json({ message: 'Team and all linked data deleted successfully.' });
}));

module.exports = router;
