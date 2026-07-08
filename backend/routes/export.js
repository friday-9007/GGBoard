/**
 * Export Routes (Prisma / Supabase)
 * POST /export — CSV export (players | scores | combined), scoped to the organizer.
 */

const express = require('express');
const router = express.Router();
const { prisma } = require('../repositories');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { data_type, fields, game_id } = req.body;
  if (!data_type) {
    return res.status(400).json({ error: 'data_type is required (players, scores, combined).' });
  }

  const me = req.user.id;
  const gid = game_id ? Number(game_id) : null;
  let rows = [];
  let headers = [];

  if (data_type === 'players') {
    // players on teams registered in the organizer's tournaments
    const some = gid ? { game_id: gid, game: { organizer_id: me } } : { game: { organizer_id: me } };
    const found = await prisma.teamMember.findMany({
      where: { team: { scores: { some } } },
      include: { team: { select: { team_name: true, game: true } } },
      orderBy: { created_at: 'desc' },
    });
    rows = found.map((p) => ({
      full_name: p.full_name, in_game_name: p.in_game_name, email: p.email, phone: p.phone,
      team_name: p.team?.team_name ?? null, game_title: p.team?.game ?? null,
    }));
    headers = fields || ['team_name', 'full_name', 'in_game_name', 'email', 'phone', 'game_title'];
  } else if (data_type === 'scores') {
    const where = { game: { organizer_id: me } };
    if (gid) where.game_id = gid;
    const found = await prisma.score.findMany({
      where,
      orderBy: { total_score: 'desc' },
      include: { team: { select: { team_name: true } }, game: { select: { game_title: true, tournament_name: true } } },
    });
    rows = found.map((s) => ({
      team_name: s.team?.team_name ?? null, round_scores: JSON.stringify(s.round_scores ?? []),
      total_score: s.total_score, game_title: s.game?.game_title ?? null, tournament_name: s.game?.tournament_name ?? null,
    }));
    headers = fields || ['team_name', 'round_scores', 'total_score', 'game_title'];
  } else if (data_type === 'combined') {
    // one row per (registered team's player) with that tournament's score
    const where = { game: { organizer_id: me } };
    if (gid) where.game_id = gid;
    const regs = await prisma.score.findMany({
      where,
      orderBy: { total_score: 'desc' },
      include: {
        game: { select: { game_title: true, tournament_name: true } },
        team: { select: { team_name: true, members: { select: { full_name: true, in_game_name: true } } } },
      },
    });
    rows = [];
    for (const r of regs) {
      const base = {
        team_name: r.team?.team_name ?? null, tournament_name: r.game?.tournament_name ?? null,
        game_title: r.game?.game_title ?? null, round_scores: JSON.stringify(r.round_scores ?? []), total_score: r.total_score,
      };
      const ps = r.team?.members || [];
      if (ps.length === 0) rows.push({ ...base, full_name: '', in_game_name: '' });
      else ps.forEach((p) => rows.push({ ...base, full_name: p.full_name, in_game_name: p.in_game_name }));
    }
    headers = fields || ['team_name', 'full_name', 'in_game_name', 'round_scores', 'total_score', 'game_title'];
  } else {
    return res.status(400).json({ error: 'Invalid data_type.' });
  }

  // Only include requested fields that exist on the rows
  const filteredHeaders = headers.filter((h) => rows.length === 0 || Object.prototype.hasOwnProperty.call(rows[0], h));

  let csv = filteredHeaders.join(',') + '\n';
  rows.forEach((row) => {
    const line = filteredHeaders.map((h) => {
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
}));

module.exports = router;
