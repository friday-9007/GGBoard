/**
 * Unique Team Code Generator (Prisma / Postgres).
 * Generates a random alphanumeric join code that doesn't already exist.
 */

const { prisma } = require('../config/prisma');

function randomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 (avoids confusion)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueCode(length = 6, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const code = randomCode(length);
    const existing = await prisma.team.findUnique({ where: { unique_code: code }, select: { id: true } });
    if (!existing) return code;
  }
  if (length < 8) return generateUniqueCode(length + 1, maxRetries);
  throw new Error('Failed to generate a unique team code after maximum retries.');
}

module.exports = { generateUniqueCode };
