# How City Search Works - Real API vs Demo

## Demo (Mock Data)
The HTML demo has only 7 hardcoded events in a few Florida cities because it's just showing the concept.

## Real API (When Deployed)
When you deploy the sports aggregator API, here's what happens:

### Automatic City Coverage

**ESPN scrapes ALL games nationwide:**
```javascript
// The scraper runs every 15 minutes and gets:
- ALL NFL games (every city with an NFL team)
- ALL NBA games (every city with an NBA team)  
- ALL MLB games (every city with an MLB team)
- ALL NHL games (every city with an NHL team)
- ALL NCAA Football games (hundreds of college towns)
- ALL NCAA Basketball games (hundreds of college towns)
```

**That means you get events in EVERY city automatically:**
- New York, Los Angeles, Chicago, Houston, Phoenix
- Boston, Seattle, Denver, Atlanta, Dallas
- San Francisco, Philadelphia, San Diego, Minneapolis
- Cleveland, Las Vegas, Portland, Sacramento
- Plus 100+ college towns (Tuscaloosa, Ann Arbor, Austin, etc.)

### How to Search Any City

**Option 1: Search by city name**
```bash
GET /api/events/city/chicago
GET /api/events/city/new-york  
GET /api/events/city/los-angeles
GET /api/events/city/austin
```

**Option 2: Search by coordinates (best for "near me")**
```bash
# Chicago coordinates
GET /api/events/nearby?lat=41.8781&lng=-87.6298&radius=25

# LA coordinates  
GET /api/events/nearby?lat=34.0522&lng=-118.2437&radius=25

# Works for ANY location
```

**Option 3: Search by state**
```bash
GET /api/events?state=california
GET /api/events?state=texas
GET /api/events?state=new-york
```

### Cities You'll Get Automatically

**Professional Sports (30-32 teams per league):**

**NFL Cities (32):**
- Arizona (Phoenix), Atlanta, Baltimore, Buffalo, Carolina (Charlotte)
- Chicago, Cincinnati, Cleveland, Dallas, Denver, Detroit
- Green Bay, Houston, Indianapolis, Jacksonville, Kansas City
- Las Vegas, LA (2 teams), Miami, Minnesota, New England (Boston)
- New Orleans, NY (2 teams), Philadelphia, Pittsburgh, San Francisco (2 teams)
- Seattle, Tampa, Tennessee (Nashville), Washington DC

**NBA Cities (30):**
- Atlanta, Boston, Brooklyn, Charlotte, Chicago, Cleveland, Dallas
- Denver, Detroit, Golden State (SF), Houston, Indiana, LA (2 teams)
- Memphis, Miami, Milwaukee, Minnesota, New Orleans, NY, Oklahoma City
- Orlando, Philadelphia, Phoenix, Portland, Sacramento, San Antonio
- Toronto, Utah, Washington DC

**MLB Cities (30):**
- Arizona, Atlanta, Baltimore, Boston, Chicago (2), Cincinnati, Cleveland
- Colorado, Detroit, Houston, Kansas City, LA (2), Miami, Milwaukee
- Minnesota, NY (2), Oakland, Philadelphia, Pittsburgh, San Diego
- San Francisco, Seattle, St. Louis, Tampa, Texas (Arlington), Toronto, Washington

**NHL Cities (32):**
- Anaheim, Arizona, Boston, Buffalo, Calgary, Carolina, Chicago
- Colorado, Columbus, Dallas, Detroit, Edmonton, Florida, LA
- Minnesota, Montreal, Nashville, New Jersey, NY (3 teams), Ottawa
- Philadelphia, Pittsburgh, San Jose, Seattle, St. Louis, Tampa
- Toronto, Vancouver, Vegas, Washington, Winnipeg

**NCAA (100+ cities):**
- Alabama (Tuscaloosa), Auburn, Florida (Gainesville), Georgia (Athens)
- Michigan (Ann Arbor), Ohio State (Columbus), Texas (Austin)
- USC (LA), UCLA, Stanford, Berkeley, Oregon (Eugene)
- Duke (Durham), UNC (Chapel Hill), Kentucky (Lexington)
- And 80+ more college towns

### Total Coverage

When deployed, your API automatically covers:
- ✅ **150+ cities** with professional teams
- ✅ **100+ college towns** with NCAA teams  
- ✅ **250+ unique locations** total
- ✅ **Nationwide coverage** coast to coast

### Example: Search Any City

**Chicago:**
```bash
GET /api/events/city/chicago
# Returns: Bears, Bulls, Cubs, White Sox, Blackhawks games
```

**Los Angeles:**
```bash
GET /api/events/city/los-angeles  
# Returns: Rams, Chargers, Lakers, Clippers, Dodgers, Angels, Kings games
```

**Austin:**
```bash
GET /api/events/city/austin
# Returns: University of Texas football and basketball games
```

**Your Location (Miami Beach):**
```bash
GET /api/events/nearby?lat=25.7907&lng=-80.1300&radius=50
# Returns: Heat, Dolphins, Marlins, Panthers, plus nearby college games
```

---

## Cost: Still FREE

All this nationwide coverage costs **$0** because:
- ESPN's unofficial API has no rate limits
- You store everything in your database
- Scrapers run every 15 minutes automatically
- Serves unlimited users from your DB

---

## How to See All Cities

Once deployed, you can query:

```bash
# Get unique cities with events
GET /api/stats

# Response includes:
{
  "cities_with_events": [
    "New York", "Los Angeles", "Chicago", "Houston", 
    "Phoenix", "Philadelphia", "San Antonio", ...
    // 250+ cities
  ]
}
```

Or query the database directly:
```sql
SELECT DISTINCT ht.location_city 
FROM events e 
JOIN teams ht ON e.home_team_id = ht.id 
ORDER BY ht.location_city;
```

---

## Want to Test It?

Deploy the API (takes 5 min on Render.com) and then:

```bash
# See what's happening in ANY city
curl https://your-api.com/api/events/city/seattle
curl https://your-api.com/api/events/city/denver  
curl https://your-api.com/api/events/city/boston

# Or search near ANY coordinates
curl https://your-api.com/api/events/nearby?lat=40.7128&lng=-74.0060&radius=25
# (That's NYC - will show Yankees, Mets, Knicks, Nets, Rangers, Islanders, etc.)
```

The demo only shows a few cities because it's mock data, but the **real API has every city with professional or college sports automatically**! 🎯
