const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return res;
  } catch (err) {
    console.error('Database query error:', err.message);
    console.error('Query:', text);
    throw err;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise}
 */
const getClient = () => {
  return pool.connect();
};

/**
 * Upsert a team (insert or update if exists)
 */
const upsertTeam = async (teamData) => {
  const {
    external_id,
    name,
    short_name,
    abbreviation,
    sport,
    level,
    conference,
    division,
    location_city,
    location_state,
    location_country,
    logo_url,
    color_primary,
    color_secondary,
    data_source
  } = teamData;

  const text = `
    INSERT INTO teams (
      external_id, name, short_name, abbreviation, sport, level,
      conference, division, location_city, location_state, location_country,
      logo_url, color_primary, color_secondary, data_source, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    ON CONFLICT (external_id) DO UPDATE SET
      name = EXCLUDED.name,
      short_name = EXCLUDED.short_name,
      abbreviation = EXCLUDED.abbreviation,
      logo_url = COALESCE(EXCLUDED.logo_url, teams.logo_url),
      color_primary = COALESCE(EXCLUDED.color_primary, teams.color_primary),
      color_secondary = COALESCE(EXCLUDED.color_secondary, teams.color_secondary),
      updated_at = NOW()
    RETURNING id;
  `;

  const values = [
    external_id, name, short_name, abbreviation, sport, level,
    conference, division, location_city, location_state, location_country || 'USA',
    logo_url, color_primary, color_secondary, data_source
  ];

  const result = await query(text, values);
  return result.rows[0].id;
};

/**
 * Upsert an event
 */
const upsertEvent = async (eventData) => {
  const {
    external_id,
    sport,
    level,
    league,
    season_year,
    season_type,
    week,
    home_team_id,
    away_team_id,
    venue_id,
    venue_name,
    event_date,
    event_time,
    status,
    period,
    clock,
    home_score,
    away_score,
    home_score_periods,
    away_score_periods,
    broadcast_info,
    highlight_url,
    ticket_url,
    ticket_price_min,
    ticket_price_max,
    attendance,
    notes,
    data_source
  } = eventData;

  const text = `
    INSERT INTO events (
      external_id, sport, level, league, season_year, season_type, week,
      home_team_id, away_team_id, venue_id, venue_name,
      event_date, event_time, status, period, clock,
      home_score, away_score, home_score_periods, away_score_periods,
      broadcast_info, highlight_url, ticket_url, ticket_price_min, ticket_price_max,
      attendance, notes, data_source, last_updated
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW()
    )
    ON CONFLICT (external_id) DO UPDATE SET
      status = EXCLUDED.status,
      period = EXCLUDED.period,
      clock = EXCLUDED.clock,
      home_score = EXCLUDED.home_score,
      away_score = EXCLUDED.away_score,
      home_score_periods = EXCLUDED.home_score_periods,
      away_score_periods = EXCLUDED.away_score_periods,
      broadcast_info = COALESCE(EXCLUDED.broadcast_info, events.broadcast_info),
      highlight_url = COALESCE(EXCLUDED.highlight_url, events.highlight_url),
      ticket_url = COALESCE(EXCLUDED.ticket_url, events.ticket_url),
      ticket_price_min = COALESCE(EXCLUDED.ticket_price_min, events.ticket_price_min),
      ticket_price_max = COALESCE(EXCLUDED.ticket_price_max, events.ticket_price_max),
      attendance = COALESCE(EXCLUDED.attendance, events.attendance),
      last_updated = NOW()
    RETURNING id;
  `;

  const values = [
    external_id, sport, level, league, season_year, season_type, week,
    home_team_id, away_team_id, venue_id, venue_name,
    event_date, event_time, status, period, clock,
    home_score, away_score,
    home_score_periods ? JSON.stringify(home_score_periods) : null,
    away_score_periods ? JSON.stringify(away_score_periods) : null,
    broadcast_info ? JSON.stringify(broadcast_info) : null,
    highlight_url, ticket_url, ticket_price_min, ticket_price_max,
    attendance, notes, data_source
  ];

  const result = await query(text, values);
  return result.rows[0].id;
};

/**
 * Log scraper run
 */
const logScraperRun = async (scraperName, status, stats = {}) => {
  const text = `
    INSERT INTO scraper_runs (
      scraper_name, started_at, completed_at, status,
      events_scraped, events_updated, events_created, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id;
  `;

  const values = [
    scraperName,
    stats.started_at || new Date(),
    stats.completed_at || new Date(),
    status,
    stats.events_scraped || 0,
    stats.events_updated || 0,
    stats.events_created || 0,
    stats.error_message || null
  ];

  const result = await query(text, values);
  return result.rows[0].id;
};

module.exports = {
  query,
  getClient,
  pool,
  upsertTeam,
  upsertEvent,
  logScraperRun
};
