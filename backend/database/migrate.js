/**
 * ggBoard Database Migrations
 * Idempotent, ordered migrations for evolving an existing database.
 * Run: npm run migrate
 *
 * Each migration has an `id` and an `up(db)` that must be safe to run repeatedly.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getDb } = require('../config/db');

// Helper: does a column exist on a table?
function hasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

const migrations = [
  {
    id: '001_add_organizer_to_games',
    up(db) {
      if (!hasColumn(db, 'games', 'organizer_id')) {
        // Added column references users(id); SQLite requires the default to be NULL here.
        db.exec(`ALTER TABLE games ADD COLUMN organizer_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_games_organizer ON games(organizer_id)`);

        // Backfill existing games to the first admin (the seeded operator) so they stay manageable.
        const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get();
        if (admin) {
          const res = db.prepare('UPDATE games SET organizer_id = ? WHERE organizer_id IS NULL').run(admin.id);
          console.log(`   ↳ backfilled ${res.changes} existing game(s) to admin id=${admin.id}`);
        }
        return 'added games.organizer_id';
      }
      return 'skip (organizer_id already present)';
    },
  },
  {
    id: '002_add_user_id_to_players',
    up(db) {
      if (!hasColumn(db, 'players', 'user_id')) {
        // Links a roster player to a self-registered player account (nullable:
        // admin-added roster players may have no account).
        db.exec(`ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id)`);
        return 'added players.user_id';
      }
      return 'skip (user_id already present)';
    },
  },
];

function migrate() {
  const db = getDb();

  // Track applied migrations
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const applied = new Set(db.prepare('SELECT id FROM _migrations').all().map((r) => r.id));

  console.log('🔧 Running migrations...');
  let count = 0;
  for (const m of migrations) {
    if (applied.has(m.id)) {
      console.log(`   • ${m.id}: already applied`);
      continue;
    }
    const result = m.up(db);
    db.prepare('INSERT INTO _migrations (id) VALUES (?)').run(m.id);
    console.log(`   ✅ ${m.id}: ${result}`);
    count++;
  }

  console.log(count === 0 ? '\n✅ Database already up to date.' : `\n✅ Applied ${count} migration(s).`);
}

try {
  migrate();
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
