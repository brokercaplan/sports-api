# High School Sports - Integration Guide

## Current Status

**The FREE version I built does NOT include high school sports yet.**

Here's why and how to add it:

---

## Why High School Isn't Free

Unlike professional/college sports, high school data is **not freely available**:

| Source | Has HS Data? | Cost | Coverage |
|--------|-------------|------|----------|
| ESPN Unofficial API | ❌ No | Free | Pro/College only |
| NCAA API | ❌ No | Free | College only |
| TheSportsDB | ❌ No | Free | Pro/College only |
| MaxPreps | ✅ Yes | No API | All US high schools |
| ScoreStream | ✅ Yes | $500-1000/mo | 10-15k games/week |
| SerpAPI (Google) | ✅ Yes | 100 free/mo | Limited |

---

## Option 1: SerpAPI (Limited Free)

**Best for:** Testing, small scale

### How It Works

Google shows high school scores in search results. SerpAPI scrapes Google for you.

**Free Tier:**
- 100 searches per month
- Can get ~100 high school games
- Good for testing

**Example:**
```javascript
// Search Google for high school basketball scores
const response = await fetch('https://serpapi.com/search', {
  params: {
    api_key: 'YOUR_KEY',
    q: 'high school basketball scores miami',
    engine: 'google'
  }
});
```

**Cost:**
- Free: 100 searches/month
- $75/month: 5,000 searches/month
- $150/month: 15,000 searches/month

**Coverage:**
- Variable - depends on what Google has
- Good for major metro areas
- Missing many rural/small schools

### Integration Steps

1. **Get SerpAPI key** (free at serpapi.com)

2. **Create scraper** (`src/scrapers/highschool-serp.js`):

```javascript
const axios = require('axios');
const { upsertTeam, upsertEvent } = require('../db');

async function scrapeHighSchoolGames(city, state) {
  const response = await axios.get('https://serpapi.com/search', {
    params: {
      api_key: process.env.SERPAPI_KEY,
      q: `high school football scores ${city} ${state}`,
      engine: 'google'
    }
  });

  const games = parseGoogleSportsResults(response.data);
  
  for (const game of games) {
    // Save to database
    await upsertEvent({
      external_id: `hs_${game.id}`,
      sport: game.sport,
      level: 'high_school',
      home_team_id: await findOrCreateTeam(game.home_team),
      away_team_id: await findOrCreateTeam(game.away_team),
      // ... rest of data
    });
  }
}
```

3. **Schedule scraping** for key cities:

```javascript
// In run-scrapers.js
cron.schedule('0 */6 * * *', async () => {
  // Scrape major cities (uses 50 searches/day)
  await scrapeHighSchoolGames('Miami', 'FL');
  await scrapeHighSchoolGames('Orlando', 'FL');
  await scrapeHighSchoolGames('Tampa', 'FL');
  // etc...
});
```

**Pros:**
- ✅ Free tier available
- ✅ Easy to implement
- ✅ No scraping ToS violations

**Cons:**
- ❌ Limited to 100 searches/month (free)
- ❌ Incomplete coverage
- ❌ Data quality varies

---

## Option 2: MaxPreps Scraping (Advanced)

**Best for:** Comprehensive coverage, technical users

### How It Works

MaxPreps has **every high school game** but no API. You'd need to scrape their website.

**Coverage:**
- ✅ 50,000+ high schools
- ✅ All sports
- ✅ Schedules, scores, rankings

**Example:**
```javascript
// Scrape MaxPreps (NOT in free version - you'd build this)
async function scrapeMaxPreps() {
  // Would need:
  // 1. Proxy rotation to avoid IP bans
  // 2. Browser automation (Puppeteer)
  // 3. Rate limiting
  // 4. Error handling
  
  const schools = await getSchoolList(); // 50k+ schools
  
  for (const school of schools) {
    const url = `https://www.maxpreps.com/schools/${school.id}/`;
    const data = await scrapePage(url);
    // Parse and save
  }
}
```

**Challenges:**
- ⚠️ Against MaxPreps ToS
- ⚠️ Requires proxy services ($50-200/mo)
- ⚠️ Gets blocked frequently
- ⚠️ HTML structure changes break scraper

**Cost:**
- Proxy service: $50-200/month
- Development time: ~40 hours
- Maintenance: Ongoing

**Legal Risk:**
- MaxPreps could send cease & desist
- Scraping violates their ToS
- Could face legal action

---

## Option 3: ScoreStream API (Commercial)

**Best for:** Production apps, businesses

### How It Works

ScoreStream has an official API with high school data.

**Coverage:**
- ✅ 10,000-15,000 games/week
- ✅ Validated, accurate data
- ✅ Real-time updates
- ✅ Associated Press syndication

**Example:**
```javascript
async function scrapeScoreStream() {
  const response = await fetch('https://api.scorestream.com/v1/games', {
    headers: {
      'Authorization': `Bearer ${process.env.SCORESTREAM_API_KEY}`
    },
    params: {
      level: 'high_school',
      state: 'FL',
      date: '2026-03-03'
    }
  });
  
  const games = await response.json();
  // Save to database
}
```

**Cost:**
- Pricing: Custom (contact sales)
- Estimated: $500-1,000/month
- Enterprise: $2,000+/month

**Contact:**
- Email: partner@scorestream.com
- Website: scorestream.com/api

**Pros:**
- ✅ Official API
- ✅ Comprehensive data
- ✅ No legal issues
- ✅ Reliable updates

**Cons:**
- ❌ Expensive
- ❌ Requires commercial license

---

## Option 4: Crowd-Sourcing (Smart Free Option)

**Best for:** Community-driven apps, long-term growth

### How It Works

Let users submit high school scores, similar to how ScoreStream started.

**Example:**
```javascript
// Add endpoint for users to submit scores
POST /api/events/submit

{
  "home_team": "Miami Beach High",
  "away_team": "Coral Gables High",
  "sport": "football",
  "home_score": 28,
  "away_score": 21,
  "date": "2026-03-03T19:00:00Z",
  "submitted_by": "user@example.com"
}
```

**Validation:**
- Require 2-3 users to confirm score
- Auto-approve if user has good history
- Flag suspicious submissions

**Pros:**
- ✅ Completely free
- ✅ Community engagement
- ✅ Scales naturally
- ✅ No legal issues

**Cons:**
- ❌ Slow initial growth
- ❌ Requires moderation
- ❌ Incomplete coverage at first

---

## Option 5: State Athletic Associations

**Best for:** State-specific apps

### How It Works

Many state athletic associations publish scores:

**Florida (FHSAA):**
- Website: fhsaa.org
- Has schedules and scores
- No official API
- Could scrape (gray area legally)

**Texas (UIL):**
- Website: uiltexas.org
- Comprehensive data
- No API

**California (CIF):**
- Multiple sections, each with own site
- Fragmented data

**Example:**
```javascript
async function scrapeFHSAA() {
  // Scrape Florida High School Athletic Association
  const url = 'https://www.fhsaa.org/scores';
  // Parse HTML, extract scores
}
```

**Pros:**
- ✅ Official source
- ✅ Free data
- ✅ State-specific accuracy

**Cons:**
- ❌ No unified API
- ❌ Scraping may violate ToS
- ❌ Different structure per state
- ❌ Need 50+ scrapers for all states

---

## Recommended Approach

### For Testing / MVP
1. **Start with SerpAPI free tier** (100 searches/month)
2. Focus on 1-2 cities (Miami, Orlando)
3. Get ~50-100 games to prove concept

### For Production / Scale
1. **Combine approaches:**
   - SerpAPI for major cities (100 games/month)
   - Crowd-sourcing for growth
   - Add ScoreStream API when revenue justifies cost

2. **Phase it in:**
   - Month 1-3: SerpAPI only (free)
   - Month 4-6: Add crowd-sourcing
   - Month 7+: Add ScoreStream if you have $500/mo budget

---

## How to Add SerpAPI (Quick Start)

### 1. Get API Key

Sign up at serpapi.com (free tier: 100 searches/month)

### 2. Add to Environment

```bash
# .env
SERPAPI_KEY=your_api_key_here
```

### 3. Create Scraper

I can build you a SerpAPI high school scraper in ~30 minutes. Want me to add it to the project?

### 4. Schedule It

```javascript
// Run once per day for key cities (uses 10 searches/day)
cron.schedule('0 3 * * *', async () => {
  await scrapeHighSchoolGames('Miami', 'FL');
  await scrapeHighSchoolGames('Fort Lauderdale', 'FL');
  // ... 8 more cities
});
```

---

## Bottom Line

**High school sports are NOT in the free version because there's no free comprehensive source.**

**Your options:**
1. ✅ **SerpAPI** - Free but limited (100 games/month)
2. ⚠️ **MaxPreps scraping** - Free but risky/difficult  
3. 💰 **ScoreStream API** - Best but costs $500-1000/month
4. ✅ **Crowd-source** - Free, slow growth
5. ⚠️ **State associations** - Free, fragmented, gray area

**My recommendation:**
Start with professional/college (free), add SerpAPI for limited high school, then add crowd-sourcing or upgrade to ScoreStream when you have budget.

**Want me to add SerpAPI integration to your project?** I can do it in 30 minutes and you'll get ~100 high school games/month for free to test! 🏈
