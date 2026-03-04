-- Sports Data Aggregation Database Schema
-- Optimized for high-performance queries and cron updates

-- Teams table - stores all teams across levels
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL, -- ESPN ID, NCAA ID, etc.
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    abbreviation VARCHAR(10),
    sport VARCHAR(50) NOT NULL, -- 'basketball', 'football', 'baseball', etc.
    level VARCHAR(20) NOT NULL, -- 'high_school', 'college', 'professional'
    conference VARCHAR(100), -- For college sports
    division VARCHAR(50), -- NFL, NBA divisions, NCAA divisions
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    location_country VARCHAR(50) DEFAULT 'USA',
    logo_url TEXT,
    color_primary VARCHAR(7), -- Hex color
    color_secondary VARCHAR(7),
    data_source VARCHAR(50) NOT NULL, -- 'espn', 'ncaa', 'seatgeek'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'USA',
    capacity INTEGER,
    surface VARCHAR(50), -- 'grass', 'turf', 'hardwood', etc.
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Events table - core table for all games/matches
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    sport VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,
    league VARCHAR(100), -- 'NFL', 'NBA', 'NCAA Football', etc.
    season_year INTEGER,
    season_type VARCHAR(20), -- 'regular', 'playoffs', 'preseason'
    week INTEGER, -- For football
    
    -- Teams
    home_team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Venue
    venue_id INTEGER REFERENCES venues(id),
    venue_name VARCHAR(255), -- Fallback if venue not in DB
    
    -- Timing
    event_date TIMESTAMP NOT NULL,
    event_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'final', 'postponed', 'cancelled'
    period VARCHAR(50), -- 'Q1', '1st Half', 'Top 9th', etc.
    clock VARCHAR(20), -- '12:34', 'Final', etc.
    
    -- Scores
    home_score INTEGER,
    away_score INTEGER,
    home_score_periods JSONB, -- {q1: 21, q2: 14, ...}
    away_score_periods JSONB,
    
    -- Media & Tickets
    broadcast_info JSONB, -- {tv: ['ESPN', 'ABC'], stream: ['ESPN+'], radio: ['WFAN']}
    highlight_url TEXT,
    ticket_url TEXT, -- SeatGeek, Ticketmaster, etc.
    ticket_price_min DECIMAL(10, 2),
    ticket_price_max DECIMAL(10, 2),
    
    -- Metadata
    attendance INTEGER,
    notes TEXT,
    data_source VARCHAR(50) NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Event stats table - for detailed game statistics
CREATE TABLE IF NOT EXISTS event_stats (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    stats JSONB NOT NULL, -- Sport-specific stats
    created_at TIMESTAMP DEFAULT NOW()
);

-- Player stats (optional, for future expansion)
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    jersey_number VARCHAR(10),
    position VARCHAR(50),
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    height VARCHAR(20),
    weight VARCHAR(20),
    birthdate DATE,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Scraper run log - track scraper health
CREATE TABLE IF NOT EXISTS scraper_runs (
    id SERIAL PRIMARY KEY,
    scraper_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed'
    events_scraped INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_level ON events(level);
CREATE INDEX IF NOT EXISTS idx_events_sport ON events(sport);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_teams ON events(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_events_search ON events(sport, level, event_date);
CREATE INDEX IF NOT EXISTS idx_teams_search ON teams(sport, level, location_state);
CREATE INDEX IF NOT EXISTS idx_teams_external ON teams(external_id, data_source);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(status, event_date) WHERE status IN ('scheduled', 'live');

-- Full-text search on team names (optional but useful)
CREATE INDEX IF NOT EXISTS idx_teams_name_search ON teams USING gin(to_tsvector('english', name));

-- Materialized view for today's games (fast queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS todays_events AS
SELECT 
    e.*,
    ht.name as home_team_name,
    ht.abbreviation as home_team_abbr,
    ht.logo_url as home_team_logo,
    at.name as away_team_name,
    at.abbreviation as away_team_abbr,
    at.logo_url as away_team_logo,
    v.name as venue_full_name
FROM events e
LEFT JOIN teams ht ON e.home_team_id = ht.id
LEFT JOIN teams at ON e.away_team_id = at.id
LEFT JOIN venues v ON e.venue_id = v.id
WHERE DATE(e.event_date) = CURRENT_DATE;

-- Refresh this view every hour via cron
CREATE UNIQUE INDEX ON todays_events (id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_todays_events()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY todays_events;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE events IS 'Core table storing all sporting events across levels';
COMMENT ON TABLE teams IS 'Teams from high school, college, and professional levels';
COMMENT ON COLUMN events.status IS 'scheduled, live, final, postponed, cancelled';
COMMENT ON COLUMN events.home_score_periods IS 'JSON object with period-by-period scores';
