const axios = require('axios');
const { query } = require('../db');

/**
 * SeatGeek API Scraper
 * Free tier: 500 searches/month with client_id
 * Use for ticket links and pricing data
 */

const SEATGEEK_BASE = 'https://api.seatgeek.com/2';

/**
 * Scrape sports events from SeatGeek and update ticket links
 */
async function scrapeSeatGeek() {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  
  if (!clientId) {
    console.log('⚠️  SeatGeek client ID not configured, skipping...');
    return { updated: 0 };
  }

  console.log('\n🎟️  Starting SeatGeek ticket scrape...');
  const startTime = new Date();

  try {
    // Get events with sports taxonomy
    const response = await axios.get(`${SEATGEEK_BASE}/events`, {
      params: {
        'taxonomies.name': 'sports',
        per_page: 100,
        client_id: clientId,
        // Only get upcoming events
        'datetime_utc.gte': new Date().toISOString()
      },
      timeout: 10000
    });

    const events = response.data.events;
    let updated = 0;

    for (const event of events) {
      try {
        // Try to match this SeatGeek event to our database events
        // Match by team names and date (fuzzy matching)
        const eventDate = new Date(event.datetime_utc);
        const dateStr = eventDate.toISOString().split('T')[0];

        // Extract team names from SeatGeek event
        const performers = event.performers || [];
        const teamNames = performers.map(p => p.name);

        if (teamNames.length >= 2) {
          // Try to find matching event in our database
          const matchQuery = `
            SELECT e.id 
            FROM events e
            JOIN teams ht ON e.home_team_id = ht.id
            JOIN teams at ON e.away_team_id = at.id
            WHERE DATE(e.event_date) = $1
            AND (
              (ht.name ILIKE $2 AND at.name ILIKE $3)
              OR (ht.name ILIKE $3 AND at.name ILIKE $2)
            )
            LIMIT 1;
          `;

          const result = await query(matchQuery, [
            dateStr,
            `%${teamNames[0]}%`,
            `%${teamNames[1]}%`
          ]);

          if (result.rows.length > 0) {
            // Update event with SeatGeek ticket info
            const updateQuery = `
              UPDATE events 
              SET 
                ticket_url = $1,
                ticket_price_min = $2,
                ticket_price_max = $3,
                last_updated = NOW()
              WHERE id = $4;
            `;

            await query(updateQuery, [
              event.url,
              event.stats?.lowest_price || null,
              event.stats?.highest_price || null,
              result.rows[0].id
            ]);

            updated++;
          }
        }

      } catch (err) {
        console.error(`  ❌ Error processing SeatGeek event:`, err.message);
      }
    }

    const duration = ((new Date() - startTime) / 1000).toFixed(2);
    console.log(`✅ SeatGeek scrape complete in ${duration}s`);
    console.log(`   🎟️  Updated ${updated} events with ticket links`);

    return { updated };

  } catch (err) {
    console.error('❌ SeatGeek scrape failed:', err.message);
    return { updated: 0, error: err.message };
  }
}

module.exports = { scrapeSeatGeek };
