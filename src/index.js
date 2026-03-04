require('dotenv').config();
const { scheduleSrapers } = require('./scrapers/run-scrapers');
const { setupDatabase } = require('./setup-db');
const app = require('./api/server');

const PORT = process.env.PORT || 3000;

/**
 * Main entry point - runs both API server and scrapers
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🏈 SPORTS DATA AGGREGATOR');
  console.log('='.repeat(60));
  console.log('   Environment:', process.env.NODE_ENV || 'development');
  console.log('   Database:', process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured');
  console.log('   SeatGeek API:', process.env.SEATGEEK_CLIENT_ID ? '✅ Configured' : '⚠️  Optional');
  console.log('='.repeat(60) + '\n');

  // Auto-setup database tables
  await setupDatabase();

  // Start API server
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}\n`);
  });

  // Start cron scrapers
  scheduleSrapers();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = main;
