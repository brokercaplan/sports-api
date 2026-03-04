const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

/**
 * Auto-setup database tables on first run
 */
async function setupDatabase() {
  try {
    console.log('🔧 Setting up database tables...');
    
    const schemaPath = path.join(__dirname, '../sql/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database setup complete!');
    return true;
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    return false;
  }
}

module.exports = { setupDatabase };
