/**
 * Team Routes (Prisma / Supabase)
 * A team is a lasting roster for one GAME. Registering it into a tournament is a
 * separate action (a scores row).
 *
 * POST   /teams/create      — player creates a team (name + game); admin adds a team to a tournament
 * POST   /teams/register    — leader registers their team into a tournament
 * GET    /teams/all         — teams registered in the organizer's tournaments (admin)
 * GET    /teams/my          — own team + roster (player)
 * GET    /teams/my/events   — tournaments my team is registered in, with standings (player)
 * PATCH  /teams/:id         — rename (leader) or organizer of a tournament it's in
 * DELETE /teams/:id         — leader disbands their own team
 * DELETE /teams/:teamId/registration/:gameId — organizer removes a team from their tournament
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { teams, games, users, scores } = require('../repositories');
const { requireAdmin, requireTeamLeader, requireAdminOrLeader, generateToken } = require('../middleware/auth');
const { generateUniqueCode } = require('../utils/generateCode');
const { hasCompleteGame } = require('../utils/gameProfile');
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
  // ─── Player self-service: create a lasting team for a game (no tournament yet) ───
  if (req.user.role === 'team_leader') {
    const { team_name, game } = req.body;
    if (!team_name || !game) return res.status(400).json({ error: 'team_name and game are required.' });

    const me = await users.findById(req.user.id);
    if (me && me.team_id) return res.status(409).json({ error: 'You already belong to a team.' });

    const uniqueCode = await generateUniqueCode();
    const { team, user } = await teams.createForPlayer({
      team_name: String(team_name).trim(), unique_code: uniqueCode, game: String(game).trim(), leaderId: req.user.id,
    });

    return res.status(201).json({
      message: 'Team created! Register it for events from your dashboard.',
      team: { id: team.id, team_name: team.team_name, unique_code: team.unique_code, game: team.game },
      token: generateToken(user),
      user: { id: user.id, username: user.username, role: user.role, displayName: user.display_name, teamId: user.team_id },
    });
  }

  // ─── Organizer manual add: create a leader + team, registered into the chosen tournament ───
  const { team_name, leader_name, game_id } = req.body;
  if (!team_name || !leader_name || !game_id) {
    return res.status(400).json({ error: 'All fields are required: team_name, leader_name, game_id' });
  }

  const game = await games.findActiveById(Number(game_id));
  if (!game) return res.status(400).json({ error: 'Invalid or inactive game/tournament.' });
  if (game.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only add teams to your own tournaments.' });
  }
  if (await teams.existsNameInTournament(team_name, game.id)) {
    return res.status(409).json({ error: 'A team with this name already exists in this tournament.' });
  }

  const leader_username = await generateLeaderUsername(team_name, leader_name);
  const password = generateRandomPassword();
  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  const uniqueCode = await generateUniqueCode();

  const { team } = await teams.createByAdmin({
    team_name, unique_code: uniqueCode, game: game.game_title, game_id: game.id, leader_name, leader_username, password_hash: passwordHash,
  });

  res.status(201).json({
    message: 'Team created and registered!',
    team: { id: team.id, team_name, unique_code: uniqueCode, game: game.game_title, tournament: game.tournament_name },
    leader_username,
    leader_password: password,
  });
}));

router.post('/register', requireTeamLeader, asyncHandler(async (req, res) => {
  const gameId = Number(req.body.game_id);
  if (!gameId) return res.status(400).json({ error: 'game_id is required.' });

  const me = await users.findById(req.user.id);
  if (!me?.team_id) return res.status(400).json({ error: 'Create a team first before registering for events.' });

  const team = await teams.findById(me.team_id);
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  if (team.leader_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team leader can register the team for events.' });
  }

  const game = await games.findActiveById(gameId);
  if (!game) return res.status(400).json({ error: 'Invalid or inactive tournament.' });

  if (game.game_title.trim().toLowerCase() !== team.game.trim().toLowerCase()) {
    return res.status(400).json({ error: `Your team plays ${team.game}, but this event is for ${game.game_title}.` });
  }
  if (!hasCompleteGame(me.games, team.game)) {
    return res.status(400).json({
      error: `Add your ${team.game} in-game name and UID to register for this event.`,
      code: 'GAME_PROFILE_REQUIRED',
      game: team.game,
    });
  }
  if (await scores.isRegistered(team.id, gameId)) {
    return res.status(409).json({ error: 'Your team is already registered for this event.' });
  }
  if (await teams.existsNameInTournament(team.team_name, gameId, team.id)) {
    return res.status(409).json({ error: 'A team with your name is already registered in this tournament.' });
  }

  await teams.register({ teamId: team.id, gameId });
  res.status(201).json({ message: `Registered "${team.team_name}" for ${game.tournament_name}!` });
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

router.get('/my/events', requireTeamLeader, asyncHandler(async (req, res) => {
  const teamId = req.user.teamId;
  if (!teamId) return res.json({ events: [] });
  res.json({ events: await teams.myEvents(teamId) });
}));

router.patch('/:id', requireAdminOrLeader, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { team_name } = req.body;

  const existing = await teams.findById(id);
  if (!existing) return res.status(404).json({ error: 'Team not found.' });

  if (req.user.role === 'team_leader' && existing.leader_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team leader can edit the team.' });
  }
  if (req.user.role === 'admin' && !(await teams.registeredWithOrganizer(id, req.user.id))) {
    return res.status(403).json({ error: 'You can only edit teams registered in your tournaments.' });
  }

  const updated = team_name ? await teams.update(id, { team_name }) : existing;
  res.json({ message: 'Team updated successfully.', team: updated });
}));

router.delete('/:id', requireTeamLeader, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await teams.findById(id);
  if (!existing) return res.status(404).json({ error: 'Team not found.' });
  if (existing.leader_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the team leader can delete the team.' });
  }
  await teams.deleteAndUnlink(id);
  res.json({ message: 'Team disbanded.' });
}));

// Organizer removes a team from one of their tournaments (unregister only).
router.delete('/:teamId/registration/:gameId', requireAdmin, asyncHandler(async (req, res) => {
  const teamId = Number(req.params.teamId);
  const gameId = Number(req.params.gameId);
  const game = await games.findById(gameId);
  if (!game) return res.status(404).json({ error: 'Tournament not found.' });
  if (game.organizer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only manage your own tournaments.' });
  }
  await teams.unregister(teamId, gameId);
  res.json({ message: 'Team removed from the tournament.' });
}));

module.exports = router;
