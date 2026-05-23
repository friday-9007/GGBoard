/**
 * Unique Team Code Generator
 * Generates a random alphanumeric code (6-8 characters) for team join codes.
 */

const { getDb } = require('../config/db');

/**
 * Generate a random alphanumeric string of the given length.
 */
function randomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 to avoid confusion
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique team code that doesn't already exist in the database.
 * Retries up to maxRetries times to ensure uniqueness.
 */
function generateUniqueCode(length = 6, maxRetries = 10) {
  const db = getDb();
  const checkStmt = db.prepare('SELECT id FROM teams WHERE unique_code = ?');

  for (let i = 0; i < maxRetries; i++) {
    const code = randomCode(length);
    const existing = checkStmt.get(code);
    if (!existing) {
      return code;
    }
  }

  // If we exhausted retries, try with a longer code
  if (length < 8) {
    return generateUniqueCode(length + 1, maxRetries);
  }

  throw new Error('Failed to generate a unique team code after maximum retries.');
}

module.exports = { generateUniqueCode };
