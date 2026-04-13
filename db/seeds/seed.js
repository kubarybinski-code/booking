#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const seedPath = join(__dirname, 'seed.sql');
const sql = readFileSync(seedPath, 'utf8');

console.log('Seed SQL loaded from:', seedPath);
console.log('Run it with your preferred DB tool (example):');
console.log('  psql "$DATABASE_URL" -f db/migrations/001_initial_schema.sql');
console.log('  psql "$DATABASE_URL" -f db/migrations/002_booking_flow_extensions.sql');
console.log('  psql "$DATABASE_URL" -f db/migrations/003_admin_panel_extensions.sql');
console.log('  psql "$DATABASE_URL" -f db/migrations/004_email_extensions.sql');
console.log('  psql "$DATABASE_URL" -f db/migrations/005_self_service_management.sql');
console.log('  psql "$DATABASE_URL" -f db/seeds/seed.sql');
console.log('\nPreview (first 400 chars):\n');
console.log(sql.slice(0, 400));
