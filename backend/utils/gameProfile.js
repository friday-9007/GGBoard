/**
 * Helpers for a user's per-game identities.
 * users.games is jsonb: [{ game, ign, uid }]. ign/uid may be empty at profile
 * time, but must be filled to register for an event of that game.
 */

const norm = (s) => String(s || '').trim().toLowerCase();

// Coerce to a clean array of {game, ign, uid} (defensive against legacy string data).
function normalizeGames(games) {
  if (!Array.isArray(games)) return [];
  return games
    .map((g) => (typeof g === 'string' ? { game: g, ign: '', uid: '' } : g))
    .filter((g) => g && g.game)
    .map((g) => ({ game: String(g.game), ign: String(g.ign || ''), uid: String(g.uid || '') }));
}

function findGame(games, gameName) {
  return normalizeGames(games).find((g) => norm(g.game) === norm(gameName)) || null;
}

// True when the user has a complete (ign + uid) identity for gameName.
function hasCompleteGame(games, gameName) {
  const g = findGame(games, gameName);
  return !!(g && g.ign.trim() && g.uid.trim());
}

// Merge a single {game, ign, uid} into the list (update matching game, else append).
function upsertGame(games, entry) {
  const list = normalizeGames(games);
  const clean = { game: entry.game.trim(), ign: entry.ign.trim(), uid: entry.uid.trim() };
  const i = list.findIndex((g) => norm(g.game) === norm(clean.game));
  if (i >= 0) list[i] = clean;
  else list.push(clean);
  return list;
}

module.exports = { normalizeGames, findGame, hasCompleteGame, upsertGame };
