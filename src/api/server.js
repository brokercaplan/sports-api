const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { query } = require('../db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/events
 * Get events with filters
 * Query params:
 *   - sport: filter by sport
 *   - level: filter by level (professional, college, high_school)
 *   - status: filter by status (scheduled, live, final)
 *   - date: filter by date (YYYY-MM-DD)
 *   - team: search team name
 *   - city: filter by city (venue location)
 *   - state: filter by state (venue location)
 *   - lat: latitude for proximity search
 *   - lng: longitude for proximity search
 *   - radius: radius in miles for proximity search (default 25)
 *   - limit: number of results (default 50, max 500)
 *   - offset: pagination offset
 */
app.get('/api/events', async (req, res) => {
  try {
    const {
      sport,
      level,
      status,
      date,
      team,
      city,
      state,
      lat,
      lng,
      radius = 25,
      limit = 50,
      offset = 0
    } = req.query;

    let whereClause = [];
    let params = [];
    let paramCount = 1;

    // Build WHERE clause dynamically
    if (sport) {
      whereClause.push(`e.sport = $${paramCount++}`);
      params.push(sport);
    }

    if (level) {
      whereClause.push(`e.level = $${paramCount++}`);
      params.push(level);
    }

    if (status) {
      whereClause.push(`e.status = $${paramCount++}`);
      params.push(status);
    }

    if (date) {
      whereClause.push(`DATE(e.event_date) = $${paramCount++}`);
      params.push(date);
    } else {
      // Default: only future/today events if no date specified
      whereClause.push(`DATE(e.event_date) >= CURRENT_DATE`);
    }

    if (team) {
      whereClause.push(`(
        ht.name ILIKE $${paramCount} OR 
        at.name ILIKE $${paramCount}
      )`);
      params.push(`%${team}%`);
      paramCount++;
    }

    // City search
    if (city) {
      whereClause.push(`(
        ht.location_city ILIKE $${paramCount} OR
        v.city ILIKE $${paramCount}
      )`);
      params.push(`%${city}%`);
      paramCount++;
    }

    // State search
    if (state) {
      whereClause.push(`(
        ht.location_state ILIKE $${paramCount} OR
        v.state ILIKE $${paramCount}
      )`);
      params.push(`%${state}%`);
      paramCount++;
    }

    // Proximity search (if lat/lng provided)
    if (lat && lng) {
      // Using Haversine formula for distance calculation
      // 3959 = Earth's radius in miles
      whereClause.push(`(
        3959 * acos(
          cos(radians($${paramCount})) * cos(radians(v.latitude)) * 
          cos(radians(v.longitude) - radians($${paramCount + 1})) + 
          sin(radians($${paramCount})) * sin(radians(v.latitude))
        ) <= $${paramCount + 2}
      )`);
      params.push(parseFloat(lat));
      params.push(parseFloat(lng));
      params.push(parseFloat(radius));
      paramCount += 3;
    }

    const whereSql = whereClause.length > 0 
      ? 'WHERE ' + whereClause.join(' AND ')
      : '';

    // Add limit and offset
    params.push(Math.min(parseInt(limit), 500));
    params.push(parseInt(offset));

    const sql = `
      SELECT 
        e.*,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.logo_url as home_team_logo,
        ht.location_city as home_team_city,
        ht.location_state as home_team_state,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.logo_url as away_team_logo,
        at.location_city as away_team_city,
        at.location_state as away_team_state,
        v.city as venue_city,
        v.state as venue_state,
        v.latitude as venue_latitude,
        v.longitude as venue_longitude
      FROM events e
      LEFT JOIN teams ht ON e.home_team_id = ht.id
      LEFT JOIN teams at ON e.away_team_id = at.id
      LEFT JOIN venues v ON e.venue_id = v.id
      ${whereSql}
      ORDER BY e.event_date ASC, e.id ASC
      LIMIT $${paramCount++}
      OFFSET $${paramCount++};
    `;

    const result = await query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/events/today
 * Get today's events (fast query using materialized view)
 */
app.get('/api/events/today', async (req, res) => {
  try {
    const { sport, level, status } = req.query;

    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (sport) {
      whereClause.push(`sport = $${paramCount++}`);
      params.push(sport);
    }

    if (level) {
      whereClause.push(`level = $${paramCount++}`);
      params.push(level);
    }

    if (status) {
      whereClause.push(`status = $${paramCount++}`);
      params.push(status);
    }

    const whereSql = whereClause.length > 0 
      ? 'WHERE ' + whereClause.join(' AND ')
      : '';

    const sql = `
      SELECT * FROM todays_events
      ${whereSql}
      ORDER BY event_date ASC;
    `;

    const result = await query(sql, params);

    res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/events/nearby
 * Get events near a location (perfect for map integration)
 * Query params:
 *   - lat: latitude (required)
 *   - lng: longitude (required)
 *   - radius: radius in miles (default 25)
 *   - sport: filter by sport (optional)
 *   - status: filter by status (optional)
 *   - limit: number of results (default 20)
 */
app.get('/api/events/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 25, sport, status, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng parameters are required'
      });
    }

    let whereClause = [];
    let params = [parseFloat(lat), parseFloat(lng), parseFloat(radius)];
    let paramCount = 4;

    if (sport) {
      whereClause.push(`e.sport = $${paramCount++}`);
      params.push(sport);
    }

    if (status) {
      whereClause.push(`e.status = $${paramCount++}`);
      params.push(status);
    } else {
      // Default: only future/today events
      whereClause.push(`DATE(e.event_date) >= CURRENT_DATE`);
    }

    const whereSql = whereClause.length > 0 
      ? 'WHERE ' + whereClause.join(' AND ')
      : '';

    params.push(Math.min(parseInt(limit), 100));

    const sql = `
      SELECT 
        e.*,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.logo_url as home_team_logo,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.logo_url as away_team_logo,
        v.city as venue_city,
        v.state as venue_state,
        v.latitude as venue_latitude,
        v.longitude as venue_longitude,
        ROUND(
          3959 * acos(
            cos(radians($1)) * cos(radians(v.latitude)) * 
            cos(radians(v.longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(v.latitude))
          )::numeric, 2
        ) as distance_miles
      FROM events e
      LEFT JOIN teams ht ON e.home_team_id = ht.id
      LEFT JOIN teams at ON e.away_team_id = at.id
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE v.latitude IS NOT NULL 
        AND v.longitude IS NOT NULL
        AND 3959 * acos(
          cos(radians($1)) * cos(radians(v.latitude)) * 
          cos(radians(v.longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(v.latitude))
        ) <= $3
        ${whereClause.length > 0 ? 'AND ' + whereClause.join(' AND ') : ''}
      ORDER BY distance_miles ASC, e.event_date ASC
      LIMIT $${paramCount};
    `;

    const result = await query(sql, params);

    res.json({
      success: true,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius: parseFloat(radius),
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/events/city/:cityname
 * Get all events in a specific city
 */
app.get('/api/events/city/:cityname', async (req, res) => {
  try {
    const { cityname } = req.params;
    const { sport, status, limit = 50 } = req.query;

    let whereClause = [`(
      ht.location_city ILIKE $1 OR
      v.city ILIKE $1
    )`];
    let params = [`%${cityname}%`];
    let paramCount = 2;

    if (sport) {
      whereClause.push(`e.sport = $${paramCount++}`);
      params.push(sport);
    }

    if (status) {
      whereClause.push(`e.status = $${paramCount++}`);
      params.push(status);
    } else {
      // Default: only future/today events
      whereClause.push(`DATE(e.event_date) >= CURRENT_DATE`);
    }

    params.push(Math.min(parseInt(limit), 500));

    const sql = `
      SELECT 
        e.*,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.logo_url as home_team_logo,
        ht.location_city as home_team_city,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.logo_url as away_team_logo,
        at.location_city as away_team_city,
        v.city as venue_city,
        v.state as venue_state,
        v.latitude as venue_latitude,
        v.longitude as venue_longitude
      FROM events e
      LEFT JOIN teams ht ON e.home_team_id = ht.id
      LEFT JOIN teams at ON e.away_team_id = at.id
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE ${whereClause.join(' AND ')}
      ORDER BY e.event_date ASC
      LIMIT $${paramCount};
    `;

    const result = await query(sql, params);

    res.json({
      success: true,
      city: cityname,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/events/live
 * Get currently live games
 */
app.get('/api/events/live', async (req, res) => {
  try {
    const sql = `
      SELECT 
        e.*,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.logo_url as home_team_logo,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.logo_url as away_team_logo
      FROM events e
      LEFT JOIN teams ht ON e.home_team_id = ht.id
      LEFT JOIN teams at ON e.away_team_id = at.id
      WHERE e.status = 'live'
      ORDER BY e.event_date ASC;
    `;

    const result = await query(sql);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/events/:id
 * Get single event by ID
 */
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        e.*,
        ht.name as home_team_name,
        ht.abbreviation as home_team_abbr,
        ht.logo_url as home_team_logo,
        ht.color_primary as home_team_color,
        at.name as away_team_name,
        at.abbreviation as away_team_abbr,
        at.logo_url as away_team_logo,
        at.color_primary as away_team_color
      FROM events e
      LEFT JOIN teams ht ON e.home_team_id = ht.id
      LEFT JOIN teams at ON e.away_team_id = at.id
      WHERE e.id = $1;
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/teams
 * Get teams with filters
 */
app.get('/api/teams', async (req, res) => {
  try {
    const { sport, level, search, limit = 50, offset = 0 } = req.query;

    let whereClause = [];
    let params = [];
    let paramCount = 1;

    if (sport) {
      whereClause.push(`sport = $${paramCount++}`);
      params.push(sport);
    }

    if (level) {
      whereClause.push(`level = $${paramCount++}`);
      params.push(level);
    }

    if (search) {
      whereClause.push(`name ILIKE $${paramCount}`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereSql = whereClause.length > 0 
      ? 'WHERE ' + whereClause.join(' AND ')
      : '';

    params.push(Math.min(parseInt(limit), 500));
    params.push(parseInt(offset));

    const sql = `
      SELECT * FROM teams
      ${whereSql}
      ORDER BY name ASC
      LIMIT $${paramCount++}
      OFFSET $${paramCount++};
    `;

    const result = await query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/stats
 * Get database statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {};

    // Count events by status
    const statusResult = await query(`
      SELECT status, COUNT(*) as count
      FROM events
      GROUP BY status;
    `);
    stats.events_by_status = statusResult.rows;

    // Count events by level
    const levelResult = await query(`
      SELECT level, COUNT(*) as count
      FROM events
      GROUP BY level;
    `);
    stats.events_by_level = levelResult.rows;

    // Total teams
    const teamsResult = await query('SELECT COUNT(*) as count FROM teams;');
    stats.total_teams = parseInt(teamsResult.rows[0].count);

    // Total events
    const eventsResult = await query('SELECT COUNT(*) as count FROM events;');
    stats.total_events = parseInt(eventsResult.rows[0].count);

    // Last scraper runs
    const scraperResult = await query(`
      SELECT scraper_name, completed_at, status, events_scraped
      FROM scraper_runs
      ORDER BY completed_at DESC
      LIMIT 10;
    `);
    stats.recent_scrapes = scraperResult.rows;

    res.json({
      success: true,
      data: stats
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 API Server running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`\n📚 Available endpoints:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /api/events`);
    console.log(`   GET  /api/events/today`);
    console.log(`   GET  /api/events/live`);
    console.log(`   GET  /api/events/nearby?lat=25.7617&lng=-80.1918&radius=25`);
    console.log(`   GET  /api/events/city/:cityname`);
    console.log(`   GET  /api/events/:id`);
    console.log(`   GET  /api/teams`);
    console.log(`   GET  /api/stats\n`);
  });
}

module.exports = app;
