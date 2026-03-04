const axios = require('axios');
const { upsertTeam, upsertEvent, logScraperRun } = require('../db');

/**
 * ESPN Unofficial API Scraper
 * Free, no API key required
 * Covers: NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball
 */

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const SPORTS_CONFIG = [
  { sport: 'football', league: 'nfl', level: 'professional', name: 'NFL' },
  { sport: 'basketball', league: 'nba', level: 'professional', name: 'NBA' },
  { sport: 'baseball', league: 'mlb', level: 'professional', name: 'MLB' },
  { sport: 'hockey', league: 'nhl', level: 'professional', name: 'NHL' },
  { sport: 'football', league: 'college-football', level: 'college', name: 'NCAA Football' },
  { sport: 'basketball', league: 'mens-college-basketball', level: 'college', name: 'NCAA MBB' },
  { sport: 'basketball', league: 'womens-college-basketball', level: 'college', name: 'NCAA WBB' },
];

/**
 * Scrape scoreboard for a specific sport/league
 */
async function scrapeScoreboard(config) {
  const url = `${ESPN_BASE}/${config.sport}/${config.league}/scoreboard`;
  
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    
    if (!data.events || data.events.length === 0) {
      console.log(`  ℹ️  No events found for ${config.name}`);
      return { scraped: 0, created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;

    for (const event of data.events) {
      try {
        // Extract teams
        const competition = event.competitions[0];
        const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
        const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');

        // Upsert home team
        const homeTeamId = await upsertTeam({
          external_id: `espn_${homeCompetitor.team.id}`,
          name: homeCompetitor.team.displayName,
          short_name: homeCompetitor.team.shortDisplayName,
          abbreviation: homeCompetitor.team.abbreviation,
          sport: config.sport,
          level: config.level,
          conference: homeCompetitor.team.conferenceId || null,
          location_city: homeCompetitor.team.location || null,
          logo_url: homeCompetitor.team.logo || null,
          color_primary: homeCompetitor.team.color || null,
          data_source: 'espn'
        });

        // Upsert away team
        const awayTeamId = await upsertTeam({
          external_id: `espn_${awayCompetitor.team.id}`,
          name: awayCompetitor.team.displayName,
          short_name: awayCompetitor.team.shortDisplayName,
          abbreviation: awayCompetitor.team.abbreviation,
          sport: config.sport,
          level: config.level,
          conference: awayCompetitor.team.conferenceId || null,
          location_city: awayCompetitor.team.location || null,
          logo_url: awayCompetitor.team.logo || null,
          color_primary: awayCompetitor.team.color || null,
          data_source: 'espn'
        });

        // Parse scores by period
        const homeScorePeriods = {};
        const awayScorePeriods = {};
        
        if (competition.linescores) {
          competition.linescores.forEach((line, idx) => {
            const period = `period_${idx + 1}`;
            homeScorePeriods[period] = homeCompetitor.linescores?.[idx]?.value || 0;
            awayScorePeriods[period] = awayCompetitor.linescores?.[idx]?.value || 0;
          });
        }

        // Determine status
        let status = 'scheduled';
        if (competition.status.type.completed) {
          status = 'final';
        } else if (competition.status.type.state === 'in') {
          status = 'live';
        }

        // Extract broadcast info
        const broadcastInfo = {};
        if (competition.broadcasts && competition.broadcasts.length > 0) {
          broadcastInfo.tv = competition.broadcasts
            .filter(b => b.type?.id === '1')
            .map(b => b.market);
        }

        // Upsert event
        const eventId = await upsertEvent({
          external_id: `espn_${event.id}`,
          sport: config.sport,
          level: config.level,
          league: config.name,
          season_year: event.season?.year || new Date().getFullYear(),
          season_type: event.season?.type?.toString() || 'regular',
          week: competition.week || null,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          venue_id: null, // Could parse venue if needed
          venue_name: competition.venue?.fullName || null,
          event_date: new Date(event.date),
          event_time: null,
          status: status,
          period: competition.status?.period ? `Period ${competition.status.period}` : null,
          clock: competition.status?.displayClock || null,
          home_score: parseInt(homeCompetitor.score) || 0,
          away_score: parseInt(awayCompetitor.score) || 0,
          home_score_periods: homeScorePeriods,
          away_score_periods: awayScorePeriods,
          broadcast_info: broadcastInfo,
          highlight_url: event.links?.find(l => l.text === 'Highlights')?.href || null,
          ticket_url: event.links?.find(l => l.text === 'Tickets')?.href || null,
          attendance: competition.attendance || null,
          notes: competition.notes?.[0]?.headline || null,
          data_source: 'espn'
        });

        // Track if this was a new event or update
        // (simplified - you could check if the returned ID is new)
        updated++;

      } catch (err) {
        console.error(`  ❌ Error processing event ${event.id}:`, err.message);
      }
    }

    return {
      scraped: data.events.length,
      created: created,
      updated: updated
    };

  } catch (err) {
    console.error(`  ❌ Error scraping ${config.name}:`, err.message);
    return { scraped: 0, created: 0, updated: 0, error: err.message };
  }
}

/**
 * Run full ESPN scrape across all sports
 */
async function scrapeESPN() {
  console.log('\n📊 Starting ESPN scrape...');
  const startTime = new Date();
  
  let totalScraped = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  const errors = [];

  for (const config of SPORTS_CONFIG) {
    console.log(`  🏀 Scraping ${config.name}...`);
    const result = await scrapeScoreboard(config);
    
    totalScraped += result.scraped;
    totalCreated += result.created;
    totalUpdated += result.updated;
    
    if (result.error) {
      errors.push(`${config.name}: ${result.error}`);
    }

    // Small delay to be nice to ESPN's servers
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n✅ ESPN scrape complete in ${duration}s`);
  console.log(`   📥 Scraped: ${totalScraped} events`);
  console.log(`   ➕ Created: ${totalCreated} events`);
  console.log(`   🔄 Updated: ${totalUpdated} events`);

  // Log to database
  await logScraperRun('espn', errors.length > 0 ? 'partial' : 'success', {
    started_at: startTime,
    completed_at: endTime,
    events_scraped: totalScraped,
    events_created: totalCreated,
    events_updated: totalUpdated,
    error_message: errors.length > 0 ? errors.join('; ') : null
  });

  return {
    scraped: totalScraped,
    created: totalCreated,
    updated: totalUpdated,
    duration: duration,
    errors: errors
  };
}

module.exports = { scrapeESPN };
