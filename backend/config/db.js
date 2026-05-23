const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './database/ggboard.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    console.log(`✅ Connected to SQLite database at: ${dbPath}`);
  }
  return db;
}

module.exports = { getDb };
