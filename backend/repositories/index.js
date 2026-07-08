/**
 * Repository layer — the ONLY place that talks to Prisma.
 *
 * Accounts are split into two tables:
 *   organizers — organizer accounts (role 'admin')
 *   players    — player accounts (role 'team_leader') + profile
 * Team rosters live in `team_members` (exposed to the API as `members`).
 * A `scores` row = a team's registration into a tournament (+ its score).
 */

const { prisma } = require('../config/prisma');

// ─────────────────────────── organizer accounts ───────────────────────────
const organizers = {
  findByUsername: (username) => prisma.organizer.findUnique({ where: { username } }),
  findById: (id) => prisma.organizer.findUnique({ where: { id } }),
  create: (data) => prisma.organizer.create({ data }),
  update: (id, data) => prisma.organizer.update({ where: { id }, data }),
};

// ─────────────────────────── player accounts (login + profile) ───────────────────────────
const players = {
  findByUsername: (username) => prisma.player.findUnique({ where: { username } }),
  findById: (id) => prisma.player.findUnique({ where: { id } }),
  create: (data) => prisma.player.create({ data }),
  updateProfile: (id, data) => prisma.player.update({ where: { id }, data }),
};

// ─────────────────────────── cross-table account lookup ───────────────────────────
// Usernames must be unique across BOTH account tables.
const accounts = {
  // → { role: 'admin'|'team_leader', account } or null
  async findByUsername(username) {
    const org = await prisma.organizer.findUnique({ where: { username } });
    if (org) return { role: 'admin', account: org };
    const pl = await prisma.player.findUnique({ where: { username } });
    if (pl) return { role: 'team_leader', account: pl };
    return null;
  },
  async usernameTaken(username) {
    const [o, p] = await Promise.all([
      prisma.organizer.findUnique({ where: { username }, select: { id: true } }),
      prisma.player.findUnique({ where: { username }, select: { id: true } }),
    ]);
    return !!(o || p);
  },
};

// ─────────────────────────── team roster (team_members) ───────────────────────────
const members = {
  findById: (id) => prisma.teamMember.findUnique({ where: { id } }),
  create: (data) => prisma.teamMember.create({ data }),
  update: (id, data) => prisma.teamMember.update({ where: { id }, data }),
  remove: (id) => prisma.teamMember.delete({ where: { id } }),

  existsIgnInTeam: async (in_game_name, team_id) =>
    !!(await prisma.teamMember.findFirst({ where: { in_game_name, team_id }, select: { id: true } })),

  // A player joins a team → roster row linked to their account.
  joinTeam: ({ full_name, in_game_name, email, phone, team_id, playerId }) =>
    prisma.teamMember.create({ data: { full_name, in_game_name, email, phone, team_id, player_id: playerId } }),

  // Roster members on teams registered in the organizer's tournaments.
  async listAll({ organizer_id, team_id, game_id, search }) {
    const where = { team: { scores: { some: { game: { organizer_id } } } } };
    if (team_id) where.team_id = Number(team_id);
    if (game_id) where.team = { scores: { some: { game_id: Number(game_id), game: { organizer_id } } } };
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { in_game_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const rows = await prisma.teamMember.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { team: { select: { team_name: true, unique_code: true, game: true } } },
    });
    return rows.map(({ team, player_id, ...m }) => ({
      ...m,
      user_id: player_id, // API keeps `user_id` for the roster shape
      team_name: team?.team_name ?? null,
      team_code: team?.unique_code ?? null,
      game_title: team?.game ?? null,
    }));
  },
};

// ─────────────────────────── games (tournaments) ───────────────────────────
const games = {
  create: (data) => prisma.game.create({ data }),
  findById: (id) => prisma.game.findUnique({ where: { id } }),
  findActiveById: (id) => prisma.game.findFirst({ where: { id, status: 'active' } }),
  listActive: () => prisma.game.findMany({ where: { status: 'active' }, orderBy: { created_at: 'desc' } }),
  update: (id, data) => prisma.game.update({ where: { id }, data }),
  delete: (id) => prisma.game.delete({ where: { id } }),

  async listByOrganizer(organizer_id) {
    const rows = await prisma.game.findMany({
      where: { organizer_id },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { scores: true } } },
    });
    return rows.map(({ _count, ...g }) => ({ ...g, team_count: _count.scores }));
  },

  async listPublicEvents() {
    const rows = await prisma.game.findMany({
      where: { status: 'active' },
      orderBy: [{ start_date: 'asc' }, { created_at: 'desc' }],
      include: {
        organizer: { select: { display_name: true, username: true } },
        _count: { select: { scores: true } },
      },
    });
    return rows.map(({ organizer, _count, ...g }) => ({
      ...g,
      organizer_name: organizer?.display_name || organizer?.username || 'Organizer',
      registered_teams: _count.scores,
    }));
  },
};

// ─────────────────────────── teams ───────────────────────────
const teams = {
  findById: (id) => prisma.team.findUnique({ where: { id } }),
  findByCode: (unique_code) => prisma.team.findUnique({ where: { unique_code } }),
  update: (id, data) => prisma.team.update({ where: { id }, data }),

  existsNameInTournament: async (team_name, game_id, exceptTeamId = 0) =>
    !!(await prisma.score.findFirst({
      where: { game_id, team_id: { not: exceptTeamId }, team: { team_name } },
      select: { id: true },
    })),

  registeredWithOrganizer: async (teamId, organizerId) =>
    !!(await prisma.score.findFirst({
      where: { team_id: teamId, game: { organizer_id: organizerId } },
      select: { id: true },
    })),

  async isMember(playerId, teamId) {
    const t = await prisma.team.findFirst({
      where: { id: teamId, OR: [{ leader_id: playerId }, { members: { some: { player_id: playerId } } }] },
      select: { id: true },
    });
    return !!t;
  },

  // The player's team for a given game, if any (one-team-per-game rule).
  async userTeamForGame(playerId, game) {
    const g = String(game || '').trim().toLowerCase();
    const list = await prisma.team.findMany({
      where: { OR: [{ leader_id: playerId }, { members: { some: { player_id: playerId } } }] },
      select: { id: true, team_name: true, game: true, leader_id: true },
    });
    return list.find((t) => String(t.game).trim().toLowerCase() === g) || null;
  },

  // All of a player's teams (led or rostered), each with roster + registered events.
  async myTeamsDetailed(playerId) {
    const list = await prisma.team.findMany({
      where: { OR: [{ leader_id: playerId }, { members: { some: { player_id: playerId } } }] },
      orderBy: { created_at: 'asc' },
      include: { members: { orderBy: { created_at: 'asc' } } },
    });
    const out = [];
    for (const t of list) {
      const { members: roster, ...team } = t;
      out.push({
        ...team,
        is_leader: team.leader_id === playerId,
        players: roster.map(({ player_id, ...m }) => ({ ...m, user_id: player_id })),
        events: await teams.myEvents(team.id),
      });
    }
    return out;
  },

  async myEvents(teamId) {
    const regs = await prisma.score.findMany({
      where: { team_id: teamId },
      include: { game: { select: { id: true, game_title: true, tournament_name: true, num_rounds: true, status: true, start_date: true } } },
      orderBy: { updated_at: 'desc' },
    });
    const out = [];
    for (const r of regs) {
      const board = await prisma.score.findMany({ where: { game_id: r.game_id }, orderBy: { total_score: 'desc' }, select: { team_id: true } });
      out.push({
        game_id: r.game_id,
        tournament_name: r.game?.tournament_name ?? null,
        game_title: r.game?.game_title ?? null,
        num_rounds: r.game?.num_rounds ?? 0,
        status: r.game?.status ?? null,
        start_date: r.game?.start_date ?? null,
        round_scores: Array.isArray(r.round_scores) ? r.round_scores : [],
        total_score: r.total_score,
        rank: board.findIndex((b) => b.team_id === teamId) + 1,
        total_teams: board.length,
      });
    }
    return out;
  },

  // Admin view: one row per registration in the organizer's tournaments.
  async listByOrganizer(organizer_id) {
    const regs = await prisma.score.findMany({
      where: { game: { organizer_id } },
      orderBy: { updated_at: 'desc' },
      include: {
        game: { select: { id: true, game_title: true, tournament_name: true } },
        team: { include: { leader: { select: { display_name: true, username: true } }, _count: { select: { members: true } } } },
      },
    });
    return regs.map((r) => ({
      registration_id: r.id,
      team_id: r.team_id,
      team_name: r.team?.team_name ?? null,
      unique_code: r.team?.unique_code ?? null,
      game: r.team?.game ?? null,
      leader_name: r.team?.leader?.display_name ?? null,
      leader_username: r.team?.leader?.username ?? null,
      player_count: r.team?._count?.members ?? 0,
      game_id: r.game_id,
      game_title: r.game?.game_title ?? null,
      tournament_name: r.game?.tournament_name ?? null,
      total_score: r.total_score,
    }));
  },

  createForPlayer: ({ team_name, unique_code, game, leaderId }) =>
    prisma.team.create({ data: { team_name, unique_code, game, leader_id: leaderId } }),

  // Organizer manual add: creates a leader PLAYER account + team + registration.
  createByAdmin: ({ team_name, unique_code, game, game_id, leader_name, leader_username, password_hash }) =>
    prisma.$transaction(async (tx) => {
      const leader = await tx.player.create({ data: { username: leader_username, password_hash, display_name: leader_name } });
      const team = await tx.team.create({ data: { team_name, unique_code, game, leader_id: leader.id } });
      await tx.score.create({ data: { team_id: team.id, game_id, round_scores: [], total_score: 0 } });
      return { team };
    }),

  register: ({ teamId, gameId }) =>
    prisma.score.create({ data: { team_id: teamId, game_id: gameId, round_scores: [], total_score: 0 } }),

  unregister: (teamId, gameId) => prisma.score.deleteMany({ where: { team_id: teamId, game_id: gameId } }),

  remove: (id) => prisma.team.delete({ where: { id } }),
};

// ─────────────────────────── scores ───────────────────────────
const scores = {
  isRegistered: async (team_id, game_id) =>
    !!(await prisma.score.findUnique({ where: { team_id_game_id: { team_id, game_id } }, select: { id: true } })),

  countForGame: (game_id) => prisma.score.count({ where: { game_id } }),

  upsert: ({ team_id, game_id, round_scores, total_score }) =>
    prisma.score.upsert({
      where: { team_id_game_id: { team_id, game_id } },
      create: { team_id, game_id, round_scores, total_score },
      update: { round_scores, total_score, updated_at: new Date() },
    }),

  async scoreboard(game_id) {
    const rows = await prisma.score.findMany({
      where: { game_id },
      orderBy: { total_score: 'desc' },
      include: { team: { select: { team_name: true } } },
    });
    return rows.map((s, i) => ({
      rank: i + 1,
      team_name: s.team?.team_name ?? null,
      team_id: s.team_id,
      round_scores: Array.isArray(s.round_scores) ? s.round_scores : [],
      total_score: s.total_score,
      updated_at: s.updated_at,
    }));
  },
};

module.exports = { prisma, organizers, players, accounts, members, teams, games, scores };
