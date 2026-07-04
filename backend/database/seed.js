/**
 * ggBoard Seeder (Prisma / Supabase).
 * Idempotently ensures the default admin exists. Schema is managed by Supabase.
 * Run: npm run seed
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { prisma } = require('../config/prisma');

async function seed() {
  const username = 'admin';
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    console.log('ℹ️  Admin account already exists. Skipping seed.');
  } else {
    const passwordHash = bcrypt.hashSync('admin123', bcrypt.genSaltSync(10));
    await prisma.user.create({
      data: { username, password_hash: passwordHash, role: 'admin', role_selected: true, display_name: 'Super Admin' },
    });
    console.log('✅ Admin account seeded.');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Change this password after first login!');
  }

  const count = await prisma.user.count();
  console.log(`\n📊 users in database: ${count}`);
  console.log('🎮 ggBoard database is ready!');
}

seed()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  });
