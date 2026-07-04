/**
 * Player Routes (Prisma / Supabase)
 * POST   /players/join — a logged-in player joins a team by code
 * POST   /players/add  — organizer manually adds a roster player
 * GET    /players/all  — players in the organizer's tournaments (admin)
 * PATCH  /players/:id  — leader/self/organizer
 * DELETE /players/:id  — leader/self/organizer; frees the linked account
 */

const express = require('express');
const router = express.Router();
const { players, teams, users } = require('../repositories');
const { requireAdmin, requireTeamLeader, requireAdminOrLeader, generateToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/join', requireTeamLeader, asyncHandler(async (req, res) => {
  const { full_name, in_game_name, email, phone, team_code } = req.body;
  if (!in_game_name || !team_code) return res.status(400).json({ error: 'Required fields: in_game_name, team_code' });

  const me = await users.findById(req.user.id);
  if (me.team_id) return res.status(409).json({ error: 'You already belong to a team.' });

  const team = await teams.findByCode(String(team_code).toUpperCase());
  if (!team) return res.status(404).json({ error: 'Invalid team code. No team found with this code.' });

  if (await players.existsIgnInTeam(in_game_name, team.id)) {
    return res.status(409).json({ error: 'A player with this in-game name already exists in this team.' });
  }

  const fullName = full_name || me.display_name || me.username;
  const player = await players.joinTeam({
    full_name: fullName, in_game_name, email: email || null, phone: phone || null, team_id: team.id, userId: me.id,
  });

  const updated = await users.findById(me.id);
  res.status(201).json({
    message: `Successfully joined team "${team.team_name}"!`,
    player,
    team_name: team.team_name,
    token: generateToken(updated),
    user: { id: updated.id, username: updated.username, role: updated.role, displayName: updated.display_name, teamId: updated.team_id },
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

  const player = await players.create({ full_name, in_game_name, email: email || null, phone: phone || null, team_id: team.id });
  res.status(201).json({ message: 'Player added successfully.', player });
}));

router.get('/all', requireAdmin, asyncHandler(async (req, res) => {
  const { team_id, game_id, search } = req.query;
  res.json({ players: await players.listAll({ organizer_id: req.user.id, team_id, game_id, search }) });
}));

router.patch('/:id', requireAdminOrLeader, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { full_name, in_game_name, email, phone } = req.body;

  const existing = await players.findById(id);
  if (!existing) return res.status(404).json({ error: 'Player not found.' });

  if (req.user.role === 'team_leader') {
    if (existing.team_id !== req.user.teamId) return res.status(403).json({ error: 'You can only edit players in your own team.' });
    const team = await teams.findById(existing.team_id);
    const isLeader = team && team.leader_id === req.user.id;
    const isSelf = existing.user_id === req.user.id;
    if (!isLeader && !isSelf) return res.status(403).json({ error: 'Only the team leader can edit other players.' });
  }
  if (req.user.role === 'admin') {
    if (!(await teams.registeredWithOrganizer(existing.team_id, req.user.id))) {
      return res.status(403).json({ error: 'You can only edit players on teams registered in your tournaments.' });
    }
  }

  // Only overwrite provided (truthy) fields — matches the previous COALESCE behaviour
  const data = {};
  if (full_name) data.full_name = full_name;
  if (in_game_name) data.in_game_name = in_game_name;
  if (email) data.email = email;
  if (phone) data.phone = phone;

  const updated = Object.keys(data).length ? await players.update(id, data) : existing;
  res.json({ message: 'Player updated successfully.', player: updated });
}));

router.delete('/:id', requireAdminOrLeader, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await players.findById(id);
  if (!existing) return res.status(404).json({ error: 'Player not found.' });

  if (req.user.role === 'team_leader') {
    if (existing.team_id !== req.user.teamId) return res.status(403).json({ error: 'You can only remove players from your own team.' });
    const team = await teams.findById(existing.team_id);
    const isLeader = team && team.leader_id === req.user.id;
    const isSelf = existing.user_id === req.user.id;
    if (!isLeader && !isSelf) return res.status(403).json({ error: 'Only the team leader can remove other players.' });
  }
  if (req.user.role === 'admin') {
    if (!(await teams.registeredWithOrganizer(existing.team_id, req.user.id))) {
      return res.status(403).json({ error: 'You can only remove players on teams registered in your tournaments.' });
    }
  }

  await players.removeAndFree(id, existing.user_id);
  res.json({ message: 'Player deleted successfully.' });
}));

module.exports = router;
