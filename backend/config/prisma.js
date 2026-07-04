/**
 * Prisma client singleton (Prisma 6).
 * Connects to Supabase Postgres through the transaction pooler (DATABASE_URL,
 * `?pgbouncer=true`). Migrations/schema are owned by Supabase.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  console.error('\n❌ FATAL: DATABASE_URL is not set. Add your Supabase pooler connection string to backend/.env.\n');
  process.exit(1);
}

// Reuse one client across the process (and across nodemon reloads in dev).
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__ggboardPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__ggboardPrisma = prisma;

module.exports = { prisma };
