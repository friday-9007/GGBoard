/**
 * Repository layer — the ONLY place that talks to Prisma.
 * Routes call these methods instead of writing queries, so swapping the database
 * later (e.g. to MongoDB) means rewriting this folder, not every route.
 * Methods return plain objects in the API's snake_case shape.
 */

const { prisma } = require('../config/prisma');

// ─────────────────────────── users ───────────────────────────
const users = {
  findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
  findByUsernameAndRole: (username, role) => prisma.user.findFirst({ where: { username, role } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  create: (data) => prisma.user.create({ data }),
  setRole: (id, role) => prisma.user.update({ where: { id }, data: { role, role_selected: true } }),
};

// ─────────────────────────── games ───────────────────────────
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
      include: { _count: { select: { teams: true } } },
    });
    return rows.map(({ _count, ...g }) => ({ ...g, team_count: _count.teams }));
  },
};

// ─────────────────────────── teams ───────────────────────────
const teams = {
  findById: (id) => prisma.team.findUnique({ where: { id } }),
  findByCode: (unique_code) => prisma.team.findUnique({ where: { unique_code } }),
  update: (id, data) => prisma.team.update({ where: { id }, data }),

  existsNameInGame: async (team_name, game_id) =>
    !!(await prisma.team.findFirst({ where: { team_name, game_id }, select: { id: true } })),

  // organizer_id of the tournament a team belongs to (for ownership checks)
  async organizerId(teamId) {
    const t = await prisma.team.findUnique({ where: { id: teamId }, select: { game: { select: { organizer_id: true } } } });
    return t?.game?.organizer_id ?? null;
  },

  async listByOrganizer(organizer_id) {
    const rows = await prisma.team.findMany({
      where: { game: { organizer_id } },
      orderBy: { created_at: 'desc' },
      include: {
        game: { select: { game_title: true, tournament_name: true } },
        leader: { select: { display_name: true, username: true } },
        _count: { select: { players: true } },
      },
    });
    return rows.map(({ game, leader, _count, ...t }) => ({
      ...t,
      game_title: game?.game_title ?? null,
      tournament_name: game?.tournament_name ?? null,
      leader_name: leader?.display_name ?? null,
      leader_username: leader?.username ?? null,
      player_count: _count.players,
    }));
  },

  async getMyTeam(teamId) {
    const t = await prisma.team.findUnique({
      where: { id: teamId },
      include: { game: { select: { game_title: true, tournament_name: true } } },
    });
    if (!t) return null;
    const { game, ...rest } = t;
    const team = { ...rest, game_title: game?.game_title ?? null, tournament_name: game?.tournament_name ?? null };
    const players = await prisma.player.findMany({ where: { team_id: teamId }, orderBy: { created_at: 'asc' } });
    return { team, players };
  },

  // Player self-service: caller becomes the leader. Returns { team, user }.
  createForPlayer: ({ team_name, unique_code, game_id, leaderId }) =>
    prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { team_name, unique_code, game_id, leader_id: leaderId } });
      const user = await tx.user.update({ where: { id: leaderId }, data: { team_id: team.id } });
      await tx.score.create({ data: { team_id: team.id, game_id, round_scores: [], total_score: 0 } });
      return { team, user };
    }),

  // Organizer manual add: auto-generate a leader account. Returns { team }.
  createByAdmin: ({ team_name, unique_code, game_id, leader_name, leader_username, password_hash }) =>
    prisma.$transaction(async (tx) => {
      const leader = await tx.user.create({
        data: { username: leader_username, password_hash, role: 'team_leader', role_selected: true, display_name: leader_name },
      });
      const team = await tx.team.create({ data: { team_name, unique_code, game_id, leader_id: leader.id } });
      await tx.user.update({ where: { id: leader.id }, data: { team_id: team.id } });
      await tx.score.create({ data: { team_id: team.id, game_id, round_scores: [], total_score: 0 } });
      return { team };
    }),

  // Delete team; unlink member accounts (never delete accounts). Players/scores cascade.
  deleteAndUnlink: (id) =>
    prisma.$transaction([
      prisma.user.updateMany({ where: { team_id: id }, data: { team_id: null } }),
      prisma.team.delete({ where: { id } }),
    ]),
};

// ─────────────────────────── players ───────────────────────────
const players = {
  findById: (id) => prisma.player.findUnique({ where: { id } }),
  create: (data) => prisma.player.create({ data }),
  update: (id, data) => prisma.player.update({ where: { id }, data }),

  existsIgnInTeam: async (in_game_name, team_id) =>
    !!(await prisma.player.findFirst({ where: { in_game_name, team_id }, select: { id: true } })),

  // Player joins a team: roster row + link account + set user.team_id.
  joinTeam: ({ full_name, in_game_name, email, phone, team_id, userId }) =>
    prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: { full_name, in_game_name, email, phone, team_id, user_id: userId },
      });
      await tx.user.update({ where: { id: userId }, data: { team_id } });
      return player;
    }),

  // Remove a roster player and free their linked account.
  removeAndFree: (id, user_id) =>
    prisma.$transaction(async (tx) => {
      if (user_id) await tx.user.update({ where: { id: user_id }, data: { team_id: null } });
      await tx.player.delete({ where: { id } });
    }),

  async listAll({ organizer_id, team_id, game_id, search }) {
    const where = { team: { game: { organizer_id } } };
    if (team_id) where.team_id = Number(team_id);
    if (game_id) where.team = { ...where.team, game_id: Number(game_id) };
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { in_game_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const rows = await prisma.player.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { team: { select: { team_name: true, unique_code: true, game: { select: { game_title: true, tournament_name: true } } } } },
    });
    return rows.map(({ team, ...p }) => ({
      ...p,
      team_name: team?.team_name ?? null,
      team_code: team?.unique_code ?? null,
      game_title: team?.game?.game_title ?? null,
      tournament_name: team?.game?.tournament_name ?? null,
    }));
  },
};

// ─────────────────────────── scores ───────────────────────────
const scores = {
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

module.exports = { prisma, users, games, teams, players, scores };
