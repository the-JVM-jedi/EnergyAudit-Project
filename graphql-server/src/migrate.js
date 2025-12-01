const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
  const sqlPath = path.join(__dirname, '..', 'migrations', 'create_tables.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration file not found:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('Running migration...');
    await db.query(sql);
    console.log('Migration executed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  }
}

runMigration();
