# ⚡ Quick Start - 5 Minute Setup

The fastest way to get your sports data API running.

## Option 1: Docker (Recommended - Easiest!)

**Prerequisites:** Docker Desktop installed

```bash
# 1. Navigate to the project
cd sports-aggregator

# 2. Start everything
docker-compose up -d

# 3. Wait 30 seconds, then test
curl http://localhost:3000/health

# ✅ Done! Your API is running at http://localhost:3000
```

That's it! The database is created automatically and scrapers are running.

### View What's Happening

```bash
# See scraper logs
docker-compose logs -f app

# Check database
docker-compose exec db psql -U sports_user -d sports_aggregator
# Then: SELECT COUNT(*) FROM events;
```

### Stop Everything

```bash
docker-compose down
```

---

## Option 2: One-Click Cloud Deploy (Render.com)

**Prerequisites:** GitHub account

1. **Fork this repo** to your GitHub account

2. **Go to [render.com](https://render.com)** and sign up (free)

3. **Click "New +" → "Blueprint"**

4. **Select your forked repo**

5. **Click "Apply"**

That's it! Render will:
- Create a PostgreSQL database
- Deploy your app
- Give you a URL like `https://your-app.onrender.com`

**First scrape takes ~2 minutes.** Then check:
```bash
curl https://your-app.onrender.com/api/events/today
```

---

## Option 3: Local Development

**Prerequisites:** Node.js 18+, PostgreSQL 13+

```bash
# 1. Install dependencies
npm install

# 2. Create database
createdb sports_aggregator

# 3. Setup database schema
psql sports_aggregator -f sql/schema.sql

# 4. Configure environment
cp .env.example .env
nano .env  # Add: DATABASE_URL=postgresql://localhost/sports_aggregator

# 5. Start the system
npm start

# ✅ API running at http://localhost:3000
```

---

## What Just Happened?

Your system is now:

1. **Scraping ESPN** every 15 minutes for:
   - NFL, NBA, MLB, NHL scores
   - NCAA Football & Basketball
   - Live games, upcoming schedules

2. **Storing everything** in PostgreSQL so you can:
   - Query instantly (no API rate limits!)
   - Serve unlimited users
   - Build historical analytics

3. **Serving a REST API** at these endpoints:
   - `GET /api/events` - All events with filters
   - `GET /api/events/today` - Today's games (fast!)
   - `GET /api/events/live` - Live games right now
   - `GET /api/teams` - All teams
   - `GET /api/stats` - Database statistics

---

## Test Your API

### Get Today's Games
```bash
curl http://localhost:3000/api/events/today | jq
```

### Get Live NBA Games
```bash
curl http://localhost:3000/api/events?sport=basketball&level=professional&status=live | jq
```

### Search for a Team
```bash
curl http://localhost:3000/api/events?team=Lakers | jq
```

### See Statistics
```bash
curl http://localhost:3000/api/stats | jq
```

---

## Add Ticket Links (Optional)

Get a free SeatGeek API key to add ticket purchase links:

1. Go to https://platform.seatgeek.com/
2. Sign up (free)
3. Create an app → get Client ID
4. Add to your `.env`:
   ```bash
   SEATGEEK_CLIENT_ID=your_client_id_here
   ```
5. Restart: `docker-compose restart app`

Now events will have `ticket_url` fields!

---

## Use in Your PWA

```javascript
// Fetch today's sports events
async function getTodaysGames() {
  const response = await fetch('http://localhost:3000/api/events/today');
  const data = await response.json();
  
  return data.data.map(event => ({
    title: `${event.away_team_name} @ ${event.home_team_name}`,
    time: new Date(event.event_date),
    status: event.status,
    score: event.status === 'final' || event.status === 'live' 
      ? `${event.away_score}-${event.home_score}` 
      : 'Scheduled',
    ticketUrl: event.ticket_url,
    // Add to your map:
    latitude: event.venue_latitude,
    longitude: event.venue_longitude
  }));
}
```

---

## Next Steps

### For Development
- Read full docs: `README.md`
- Customize scrapers: `src/scrapers/`
- Modify API: `src/api/server.js`

### For Production
- Deploy guide: `DEPLOYMENT.md`
- Add monitoring: Uptime Robot (free)
- Custom domain: Cloudflare (free)
- Rate limiting: See `DEPLOYMENT.md`

### Add More Data
- High school sports: Integrate SerpAPI (100 free searches/month)
- More leagues: Copy `espn.js`, adapt for new sources
- Historical data: Enable TheSportsDB integration

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Check DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### "No events in database"
```bash
# Scraper hasn't run yet - wait 2 minutes or run manually:
npm run scrape -- --once

# Check scraper logs:
docker-compose logs app | grep "SCRAPER"
```

### "Port 3000 already in use"
```bash
# Change port in .env:
PORT=3001

# Restart
docker-compose restart app
```

---

## Cost: $0 to Start

- **Local development:** FREE forever
- **Render.com:** FREE for 90 days
- **After 3 months:** ~$7/month for production database
- **Alternative:** $2.50/month VPS (see DEPLOYMENT.md)

**You're serving data to unlimited users from YOUR database.**

Even with 100,000 users/day, your API costs = $0 (just database storage).

---

## Questions?

- Full README: `README.md`
- Deployment guide: `DEPLOYMENT.md`  
- Issues: GitHub Issues
- Need custom features: Just ask!

---

**🚀 You're ready to build! Your sports data API is live.**
