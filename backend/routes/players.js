/**
 * Roster Routes (Prisma / Supabase) — manage team_members.
 * POST   /players/join — a logged-in player joins a team by code
 * POST   /players/add  — organizer manually adds a roster entry
 * GET    /players/all  — roster members in the organizer's tournaments (admin)
 * PATCH  /players/:id  — leader / self / organizer
 * DELETE /players/:id  — leader / self / organizer
 */

const express = require('express');
const router = express.Router();
const { members, teams, players } = require('../repositories');
const { requireAdmin, requireTeamLeader, requireAdminOrLeader } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/join', requireTeamLeader, asyncHandler(async (req, res) => {
  const { full_name, in_game_name, email, phone, team_code } = req.body;
  if (!in_game_name || !team_code) return res.status(400).json({ error: 'Required fields: in_game_name, team_code' });

  const me = await players.findById(req.user.id);
  const team = await teams.findByCode(String(team_code).toUpperCase());
  if (!team) return res.status(404).json({ error: 'Invalid team code. No team found with this code.' });

  // One team per game — you may already have a team for a different game, but not this one.
  const existing = await teams.userTeamForGame(req.user.id, team.game);
  if (existing) {
    return res.status(409).json({ error: `You already have a ${team.game} team ("${existing.team_name}").` });
  }
  if (await members.existsIgnInTeam(in_game_name, team.id)) {
    return res.status(409).json({ error: 'A player with this in-game name already exists in this team.' });
  }

  const fullName = full_name || me.display_name || me.username;
  const player = await members.joinTeam({
    full_name: fullName, in_game_name, email: email || null, phone: phone || null, team_id: team.id, playerId: me.id,
  });

  res.status(201).json({
    message: `Successfully joined team "${team.team_name}"!`,
    player,
    team_name: team.team_name,
  });
}));

router.post('/add', requireAdmin, asyncHandler(async (req, res) => {
  const { full_name, in_game_name, email, phone, team_id } = req.body;
  if (!full_name || !in_game_name || !team_id) {
    return res.status(400).json({ error: 'Required fields: full_name, in_game_name, team_id' });
  }

  const team = await teams.findById(Number(team_id));
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  if (!(await teams.registeredWithOrganizer(team.id, req.user.id))) {
    return res.status(403).json({ error: 'You can only add players to teams registered in your tournaments.' });
  }

  const player = await members.create({ full_name, in_game_name, email: email || null, phone: phone || null, team_id: team.id });
  res.status(201).json({ message: 'Player added successfully.', player });
}));

router.get('/all', requireAdmin, asyncHandler(async (req, res) => {
  const { team_id, game_id, search } = req.query;
  res.json({ players: await members.listAll({ organizer_id: req.user.id, team_id, game_id, search }) });
}));

router.patch('/:id', requireAdminOrLeader, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { full_name, in_game_name, email, phone } = req.body;

  const existing = await members.findById(id);
  if (!existing) return res.status(404).json({ error: 'Player not found.' });

  if (req.user.role === 'team_leader') {
    const team = await teams.findById(existing.team_id);
    const isLeader = team && team.leader_id === req.user.id;
    const isSelf = existing.player_id === req.user.id;
    if (!isLeader && !isSelf) return res.status(403).json({ error: 'You can only edit players on a team you lead, or your own entry.' });
  }
  if (req.user.role === 'admin') {
    if (!(await teams.registeredWithOrganizer(existing.team_id, req.user.id))) {
      return res.status(403).json({ error: 'You can only edit players on teams registered in your tournaments.' });
    }
  }

  const data = {};
  if (full_name) data.full_name = full_name;
  if (in_game_name) data.in_game_name = in_game_name;
  if (email) data.email = email;
  if (phone) data.phone = phone;

  const updated = Object.keys(data).length ? await members.update(id, data) : existing;
  res.json({ message: 'Player updated successfully.', player: updated });
}));

router.delete('/:id', requireAdminOrLeader, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await members.findById(id);
  if (!existing) return res.status(404).json({ error: 'Player not found.' });

  if (req.user.role === 'team_leader') {
    const team = await teams.findById(existing.team_id);
    const isLeader = team && team.leader_id === req.user.id;
    const isSelf = existing.player_id === req.user.id;
    if (!isLeader && !isSelf) return res.status(403).json({ error: 'You can only remove players on a team you lead, or leave yourself.' });
  }
  if (req.user.role === 'admin') {
    if (!(await teams.registeredWithOrganizer(existing.team_id, req.user.id))) {
      return res.status(403).json({ error: 'You can only remove players on teams registered in your tournaments.' });
    }
  }

  await members.remove(id);
  res.json({ message: 'Player deleted successfully.' });
}));

module.exports = router;
