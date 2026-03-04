const cron = require('node-cron');
const { scrapeESPN } = require('./espn');
const { scrapeSeatGeek } = require('./seatgeek');
const { query } = require('../db');

/**
 * Run all scrapers once
 */
async function runAllScrapers() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 RUNNING ALL SCRAPERS');
  console.log('   Time:', new Date().toISOString());
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Run ESPN scraper (main source)
    const espnResult = await scrapeESPN();

    // Run SeatGeek scraper (ticket data)
    const seatgeekResult = await scrapeSeatGeek();

    // Refresh materialized view for today's events
    await query('SELECT refresh_todays_events();');
    console.log('✅ Refreshed today\'s events view');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ALL SCRAPERS COMPLETE (${duration}s)`);
    console.log('   ESPN:', espnResult.scraped, 'events');
    console.log('   SeatGeek:', seatgeekResult.updated, 'tickets updated');
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      espn: espnResult,
      seatgeek: seatgeekResult,
      duration
    };

  } catch (err) {
    console.error('❌ Scraper run failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Schedule scrapers with cron
 */
function scheduleSrapers() {
  const scrapeInterval = process.env.SCRAPE_INTERVAL_MINUTES || 15;
  
  console.log('⏰ Scheduling scrapers...');
  console.log(`   Main scrape: every ${scrapeInterval} minutes`);
  console.log(`   Ticket scrape: daily at 3:00 AM`);

  // Main scraper - every X minutes
  const mainSchedule = `*/${scrapeInterval} * * * *`;
  cron.schedule(mainSchedule, async () => {
    await runAllScrapers();
  });

  // Ticket scraper - daily at 3 AM (conserve API quota)
  cron.schedule('0 3 * * *', async () => {
    console.log('🎟️  Running daily ticket update...');
    await scrapeSeatGeek();
  });

  // Materialized view refresh - every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Refreshing materialized views...');
    await query('SELECT refresh_todays_events();');
  });

  console.log('✅ Scrapers scheduled');
  console.log('   Press Ctrl+C to stop\n');

  // Run immediately on startup
  runAllScrapers();
}

// If run directly
if (require.main === module) {
  require('dotenv').config();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    // Run once and exit
    runAllScrapers()
      .then(() => {
        console.log('✅ Done');
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ Failed:', err);
        process.exit(1);
      });
  } else {
    // Run on schedule
    scheduleSrapers();
  }
}

module.exports = { runAllScrapers, scheduleSrapers };
