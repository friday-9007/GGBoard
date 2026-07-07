/**
 * Repository layer — the ONLY place that talks to Prisma.
 *
 * Model note: a Team belongs to a GAME (title) and is a lasting roster.
 * "Registering" a team into a tournament is a row in `scores` (team_id, game_id) —
 * so a team can enter many tournaments, and a tournament's registered teams are its
 * score rows.
 */

const { prisma } = require('../config/prisma');

// ─────────────────────────── users ───────────────────────────
const users = {
  findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
  findByUsernameAndRole: (username, role) => prisma.user.findFirst({ where: { username, role } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  create: (data) => prisma.user.create({ data }),
  setRole: (id, role) => prisma.user.update({ where: { id }, data: { role, role_selected: true } }),
  updateProfile: (id, data) => prisma.user.update({ where: { id }, data }),
};

// ─────────────────────────── games (tournaments) ───────────────────────────
const games = {
  create: (data) => prisma.game.create({ data }),
  findById: (id) => prisma.game.findUnique({ where: { id } }),
  findActiveById: (id) => prisma.game.findFirst({ where: { id, status: 'active' } }),
  listActive: () => prisma.game.findMany({ where: { status: 'active' }, orderBy: { created_at: 'desc' } }),
  update: (id, data) => prisma.game.update({ where: { id }, data }),
  delete: (id) => prisma.game.delete({ where: { id } }),

  // registered-team count = number of score rows for the tournament
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

  // Another (different) team with the same name already registered in this tournament?
  existsNameInTournament: async (team_name, game_id, exceptTeamId = 0) =>
    !!(await prisma.score.findFirst({
      where: { game_id, team_id: { not: exceptTeamId }, team: { team_name } },
      select: { id: true },
    })),

  // Is this team registered in any tournament owned by organizerId? (ownership check)
  registeredWithOrganizer: async (teamId, organizerId) =>
    !!(await prisma.score.findFirst({
      where: { team_id: teamId, game: { organizer_id: organizerId } },
      select: { id: true },
    })),

  // Every team a user belongs to (leads or is rostered in) — one per game.
  membershipWhere: (userId) => ({ OR: [{ leader_id: userId }, { players: { some: { user_id: userId } } }] }),

  // Is the user a member (leader or roster) of this team?
  async isMember(userId, teamId) {
    const t = await prisma.team.findFirst({ where: { id: teamId, OR: [{ leader_id: userId }, { players: { some: { user_id: userId } } }] }, select: { id: true } });
    return !!t;
  },

  // The user's team for a given game, if any (enforces one-team-per-game).
  async userTeamForGame(userId, game) {
    const g = String(game || '').trim().toLowerCase();
    const list = await prisma.team.findMany({
      where: { OR: [{ leader_id: userId }, { players: { some: { user_id: userId } } }] },
      select: { id: true, team_name: true, game: true, leader_id: true },
    });
    return list.find((t) => String(t.game).trim().toLowerCase() === g) || null;
  },

  // All of a user's teams, each with roster + registered events (for the My Teams switcher).
  async myTeamsDetailed(userId) {
    const list = await prisma.team.findMany({
      where: { OR: [{ leader_id: userId }, { players: { some: { user_id: userId } } }] },
      orderBy: { created_at: 'asc' },
      include: { players: { orderBy: { created_at: 'asc' } } },
    });
    const out = [];
    for (const t of list) {
      const { players, ...team } = t;
      out.push({ ...team, is_leader: team.leader_id === userId, players, events: await teams.myEvents(team.id) });
    }
    return out;
  },

  // Tournaments this team is registered in, each with its live standing.
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

  // Admin view: one row per (team registered in one of the organizer's tournaments).
  async listByOrganizer(organizer_id) {
    const regs = await prisma.score.findMany({
      where: { game: { organizer_id } },
      orderBy: { updated_at: 'desc' },
      include: {
        game: { select: { id: true, game_title: true, tournament_name: true } },
        team: {
          include: {
            leader: { select: { display_name: true, username: true } },
            _count: { select: { players: true } },
          },
        },
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
      player_count: r.team?._count?.players ?? 0,
      game_id: r.game_id,
      game_title: r.game?.game_title ?? null,
      tournament_name: r.game?.tournament_name ?? null,
      total_score: r.total_score,
    }));
  },

  // Player self-service: caller becomes leader. Creates the team only (not registered yet).
  createForPlayer: ({ team_name, unique_code, game, leaderId }) =>
    prisma.team.create({ data: { team_name, unique_code, game, leader_id: leaderId } }),

  // Organizer manual add: leader account + team + registration into the given tournament.
  createByAdmin: ({ team_name, unique_code, game, game_id, leader_name, leader_username, password_hash }) =>
    prisma.$transaction(async (tx) => {
      const leader = await tx.user.create({
        data: { username: leader_username, password_hash, role: 'team_leader', role_selected: true, display_name: leader_name },
      });
      const team = await tx.team.create({ data: { team_name, unique_code, game, leader_id: leader.id } });
      await tx.score.create({ data: { team_id: team.id, game_id, round_scores: [], total_score: 0 } });
      return { team };
    }),

  // Register an existing team into a tournament (create its score row).
  register: ({ teamId, gameId }) =>
    prisma.score.create({ data: { team_id: teamId, game_id: gameId, round_scores: [], total_score: 0 } }),

  // Admin: remove a team from one of their tournaments (delete that registration only).
  unregister: (teamId, gameId) => prisma.score.deleteMany({ where: { team_id: teamId, game_id: gameId } }),

  // Delete a team. Players/scores/submissions cascade; member accounts are untouched.
  remove: (id) => prisma.team.delete({ where: { id } }),
};

// ─────────────────────────── players ───────────────────────────
const players = {
  findById: (id) => prisma.player.findUnique({ where: { id } }),
  create: (data) => prisma.player.create({ data }),
  update: (id, data) => prisma.player.update({ where: { id }, data }),

  existsIgnInTeam: async (in_game_name, team_id) =>
    !!(await prisma.player.findFirst({ where: { in_game_name, team_id }, select: { id: true } })),

  joinTeam: ({ full_name, in_game_name, email, phone, team_id, userId }) =>
    prisma.player.create({ data: { full_name, in_game_name, email, phone, team_id, user_id: userId } }),

  remove: (id) => prisma.player.delete({ where: { id } }),

  // Players on teams registered in the organizer's tournaments.
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
    const rows = await prisma.player.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { team: { select: { team_name: true, unique_code: true, game: true } } },
    });
    return rows.map(({ team, ...p }) => ({
      ...p,
      team_name: team?.team_name ?? null,
      team_code: team?.unique_code ?? null,
      game_title: team?.game ?? null,
    }));
  },
};

// ─────────────────────────── scores ───────────────────────────
const scores = {
  isRegistered: async (team_id, game_id) =>
    !!(await prisma.score.findUnique({ where: { team_id_game_id: { team_id, game_id } }, select: { id: true } })),

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
