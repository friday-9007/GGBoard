/**
 * ggBoard Database Seeder
 * Creates all tables and seeds the default admin account.
 * Run: npm run seed
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getDb } = require('../config/db');

function seed() {
  const db = getDb();

  console.log('🔧 Running database schema...');

  // Read and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  console.log('✅ All tables created successfully.');

  // Seed admin account
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  const adminRole = 'admin';
  const adminDisplayName = 'Super Admin';

  // Check if admin already exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);

  if (existingAdmin) {
    console.log('ℹ️  Admin account already exists. Skipping seed.');
  } else {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(adminPassword, salt);

    db.prepare(`
      INSERT INTO users (username, password_hash, role, display_name)
      VALUES (?, ?, ?, ?)
    `).run(adminUsername, passwordHash, adminRole, adminDisplayName);

    console.log('✅ Admin account seeded successfully.');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ⚠️  Change this password after first login!');
  }

  // Print summary
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  console.log(`\n📊 Database contains ${tables.length} tables:`);
  tables.forEach(t => console.log(`   • ${t.name}`));

  console.log('\n🎮 ggBoard database is ready!');
}

try {
  seed();
} catch (error) {
  console.error('❌ Seed failed:', error.message);
  process.exit(1);
}
