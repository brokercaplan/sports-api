# 🏈 Sports API

A **free, open-source** sports data API that scrapes live scores, schedules, and ticket information from multiple sources and serves them via REST endpoints.

## ✨ Features

- **Free data sources** - Uses ESPN's unofficial API, SeatGeek's free tier, and other no-cost sources
- **Cron-based scraping** - Automatically updates every 15 minutes (configurable)
- **Smart caching** - Store data in PostgreSQL, serve millions of requests without API costs
- **Multi-level coverage** - Professional, college, and (with expansion) high school sports
- **REST API** - Clean, documented endpoints for your apps
- **Zero vendor lock-in** - Deploy anywhere (Render, Railway, Docker, VPS)

### Supported Sports

**Professional:**
- NFL, NBA, MLB, NHL

**College:**
- NCAA Football (FBS/FCS)
- NCAA Men's Basketball
- NCAA Women's Basketball

**Coming Soon:**
- High school sports (via optional SerpAPI integration)
- More pro leagues (MLS, WNBA, UFC)

## 🚀 Quick Start

### Option 1: Docker (Easiest)

```bash
# Clone the repo
git clone <your-repo-url>
cd sports-aggregator

# Start everything
docker-compose up -d

# Database schema is auto-created
# API available at http://localhost:3000
```

### Option 2: Local Development

```bash
# Prerequisites: Node.js 18+, PostgreSQL 13+

# Install dependencies
npm install

# Setup database
createdb sports_aggregator
npm run db:setup

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Start the system
npm start
```

## 📦 Free Deployment Options

### Deploy to Render.com (FREE)

Render offers **750 hours/month free** compute and **90 days free PostgreSQL**.

1. **Fork this repo to your GitHub**

2. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml`

3. **Configure:**
   - Database will be created automatically
   - Optionally add `SEATGEEK_CLIENT_ID` for ticket links

4. **Deploy:**
   - Render automatically deploys and runs scrapers
   - Your API will be live at `https://your-app.onrender.com`

**Cost:** FREE for ~720 hours/month

### Deploy to Railway.app (FREE $5/month credit)

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy:**
   ```bash
   railway init
   railway up
   ```

3. **Add PostgreSQL:**
   ```bash
   railway add --plugin postgresql
   ```

4. **Configure:**
   ```bash
   railway variables set DATABASE_URL=<postgres-url>
   railway run npm run db:setup
   ```

**Cost:** FREE with $5/month credit (covers light usage)

### Deploy to Cloudflare Workers + D1 (Advanced)

For maximum free tier benefits, you can adapt this to use:
- **Cloudflare Workers** - Free 100k requests/day
- **D1 Database** - Free 5GB SQLite
- **Cron Triggers** - Free scheduled jobs

*Contact me if you want a Cloudflare-specific version*

## 🔌 API Documentation

Base URL: `http://localhost:3000` (or your deployment URL)

### Endpoints

#### Get Events
```http
GET /api/events

Query Parameters:
  ?sport=basketball           # Filter by sport
  &level=professional         # professional | college | high_school
  &status=live                # scheduled | live | final
  &date=2026-03-03           # YYYY-MM-DD
  &team=Lakers               # Search team name
  &limit=50                  # Results per page (max 500)
  &offset=0                  # Pagination offset
```

**Example Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "sport": "basketball",
      "level": "professional",
      "league": "NBA",
      "home_team_name": "Los Angeles Lakers",
      "away_team_name": "Boston Celtics",
      "event_date": "2026-03-03T19:30:00Z",
      "status": "live",
      "home_score": 98,
      "away_score": 95,
      "period": "Q4",
      "clock": "3:24",
      "ticket_url": "https://seatgeek.com/...",
      "home_team_logo": "https://...",
      "away_team_logo": "https://..."
    }
  ]
}
```

#### Get Today's Events (Fast)
```http
GET /api/events/today
```
Uses materialized view for instant response.

#### Get Live Games
```http
GET /api/events/live
```
Returns only currently in-progress games.

#### Get Single Event
```http
GET /api/events/:id
```

#### Get Teams
```http
GET /api/teams?sport=football&level=college&search=michigan
```

#### Get Statistics
```http
GET /api/stats
```
Database stats, recent scraper runs, event counts.

## ⚙️ Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Optional
SEATGEEK_CLIENT_ID=your_client_id     # Free at developer.seatgeek.com
SERPAPI_KEY=your_key                  # For high school (100 free/month)
SCRAPE_INTERVAL_MINUTES=15            # How often to scrape
PORT=3000                             # API port
```

### Get Free API Keys

**SeatGeek (500 free searches/month):**
1. Go to https://platform.seatgeek.com/
2. Sign up for free developer account
3. Create app → get Client ID
4. Add to `.env` as `SEATGEEK_CLIENT_ID`

**SerpAPI (100 free searches/month - optional for HS sports):**
1. Go to https://serpapi.com/
2. Sign up for free account
3. Copy API key
4. Add to `.env` as `SERPAPI_KEY`

## 📊 Data Sources

| Source | Coverage | Cost | Rate Limit |
|--------|----------|------|------------|
| ESPN Unofficial API | NFL, NBA, MLB, NHL, NCAA | FREE | None (be reasonable) |
| SeatGeek API | Tickets for all events | FREE | 500 searches/month |
| TheSportsDB | Historical data | FREE | 2 req/sec |
| SerpAPI (optional) | High school via Google | FREE | 100 searches/month |

## 🔧 Development

### Project Structure
```
sports-aggregator/
├── src/
│   ├── index.js              # Main entry point
│   ├── db.js                 # Database module
│   ├── api/
│   │   └── server.js         # Express API server
│   └── scrapers/
│       ├── run-scrapers.js   # Cron orchestrator
│       ├── espn.js           # ESPN scraper
│       └── seatgeek.js       # SeatGeek scraper
├── sql/
│   └── schema.sql            # Database schema
└── config/
```

### Adding a New Scraper

1. Create `src/scrapers/your-source.js`
2. Export a `scrapeYourSource()` function
3. Import in `src/scrapers/run-scrapers.js`
4. Call in `runAllScrapers()`

Example:
```javascript
// src/scrapers/my-scraper.js
async function scrapeMySource() {
  // Fetch data
  // Upsert teams with upsertTeam()
  // Upsert events with upsertEvent()
  return { scraped: count };
}

module.exports = { scrapeMySource };
```

## 📈 Scaling

### Free Tier Limits

**What you can handle for FREE:**
- **100k+ users/day** reading from your database
- **10k events** updated every 15 minutes
- **Unlimited API requests** (you're serving from your DB)

**What costs money:**
- 500+ SeatGeek ticket lookups/month ($49/mo for more)
- 100+ high school searches/month via SerpAPI ($75/mo for more)
- PostgreSQL after 90 days on Render ($7/mo)

### Cost Optimization

1. **Lengthen scrape interval** for less popular sports
   ```javascript
   // In run-scrapers.js
   cron.schedule('*/30 * * * *', scrapeMLB);  // Every 30 min instead of 15
   ```

2. **Use materialized views** for common queries
   - `todays_events` view is already setup
   - Refreshes hourly automatically

3. **Rate limit your API** to prevent abuse
   ```javascript
   // Add to server.js
   const rateLimit = require('express-rate-limit');
   app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
   ```

## 🎯 Use Cases

### Your PWA "Help Wanted"
```javascript
// Fetch all jobs in Miami area
fetch('https://your-api.com/api/events?level=professional&city=Miami')
  .then(res => res.json())
  .then(data => {
    // Display on map with ticket purchase links
  });
```

### Real Estate App Integration
- Show nearby sports venues
- Property value boost from stadium proximity
- Event calendar for neighborhood activity

### Betting / Fantasy Apps
- Live score updates every 15 minutes
- Historical performance data
- Upcoming matchups

## 🤝 Contributing

Want to add more sports or data sources?

1. Fork the repo
2. Add your scraper
3. Test locally
4. Submit PR

**Most wanted:**
- High school sports scrapers (state-by-state)
- International leagues (EPL, La Liga, etc.)
- Minor leagues (G-League, AHL, etc.)

## 📝 License

MIT License - use however you want!

## ⚠️ Legal Notes

This project scrapes publicly available data. ESPN's unofficial API has no published ToS forbidding scraping. SeatGeek's API is used within their free tier terms.

**For production:** Consider:
1. Respecting rate limits
2. Adding User-Agent headers
3. Caching aggressively
4. Running your own instance (don't abuse shared resources)

## 🆘 Support

**Issues?**
- Database connection: Check `DATABASE_URL` format
- Scrapers failing: Check logs in `scraper_runs` table
- API slow: Indexes are in schema, verify they were created

**Questions?**
- Open a GitHub issue
- Check the [Wiki](link-to-wiki)

## 🚀 Roadmap

- [ ] High school sports integration (SerpAPI + MaxPreps)
- [ ] WebSocket support for live score streaming
- [ ] GraphQL endpoint
- [ ] Mobile app SDKs (iOS/Android)
- [ ] Betting odds integration
- [ ] Player stats and headshots
- [ ] Email/SMS alerts for favorite teams
- [ ] Admin dashboard

---

**Built for Jenifer's "Help Wanted" PWA and the community** 🏈
