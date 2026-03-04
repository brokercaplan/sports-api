# 🚀 Deployment Guide

Complete deployment instructions for all free hosting platforms.

## Table of Contents
1. [Render.com (Recommended)](#rendercom-free-tier)
2. [Railway.app](#railwayapp)
3. [Docker on VPS](#docker-on-vps)
4. [Cloudflare Workers](#cloudflare-workers-advanced)

---

## Render.com (Free Tier)

**Best for:** Beginners, zero config needed

### Free Tier Limits
- ✅ 750 hours/month compute (enough for 24/7 operation)
- ✅ 90 days free PostgreSQL (then $7/month)
- ✅ Auto-scaling to zero when idle
- ✅ Automatic SSL certificates
- ❌ Spins down after 15 min of inactivity (cold starts ~30s)

### Step-by-Step Deployment

#### 1. Prepare Your Repo
```bash
# Fork this repo to your GitHub account
# Or create a new repo and push this code

git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sports-aggregator
git push -u origin main
```

#### 2. Connect to Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub account
4. Select your `sports-aggregator` repository
5. Render will detect `render.yaml` automatically

#### 3. Configure Environment Variables

Render will auto-create the database, but you can add optional keys:

- `SEATGEEK_CLIENT_ID` - Get from https://platform.seatgeek.com/
- `SCRAPE_INTERVAL_MINUTES` - Default is 15

#### 4. Deploy

Click **"Apply"** and Render will:
1. Create a PostgreSQL database
2. Deploy your application
3. Run database migrations
4. Start the cron scrapers

Your app will be live at: `https://your-app.onrender.com`

#### 5. Test Your Deployment

```bash
# Health check
curl https://your-app.onrender.com/health

# Get today's events
curl https://your-app.onrender.com/api/events/today
```

### Monitoring

- View logs: Dashboard → Your Service → Logs
- Check scraper runs: `GET /api/stats`
- Database queries: Dashboard → sports-db → Connect → Shell

### Costs After Free Tier

| Resource | Free Period | Paid Cost |
|----------|------------|-----------|
| Web Service | Forever (with limits) | $7/month for always-on |
| PostgreSQL | 90 days | $7/month |
| **Total** | 3 months free | **$7-14/month** |

---

## Railway.app

**Best for:** Simple deployment, good free tier

### Free Tier Limits
- ✅ $5/month free usage credit
- ✅ ~500 hours of execution time
- ✅ PostgreSQL included
- ✅ No cold starts
- ❌ Credit limit (need to monitor usage)

### Deployment

#### 1. Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

#### 2. Initialize Project

```bash
cd sports-aggregator
railway init
# Select "Create new project"
```

#### 3. Add PostgreSQL

```bash
railway add --plugin postgresql
```

#### 4. Deploy

```bash
railway up
```

Railway will:
- Build your application
- Set up PostgreSQL
- Configure DATABASE_URL automatically

#### 5. Run Database Setup

```bash
# Connect to your Railway environment
railway run npm run db:setup
```

#### 6. Configure Domain

```bash
railway domain
# Or use the Railway dashboard to add a custom domain
```

### Monitoring Usage

```bash
railway status
railway logs
```

---

## Docker on VPS

**Best for:** Full control, self-hosting

### Requirements
- VPS with 1GB+ RAM (DigitalOcean, Linode, Vultr)
- Docker and Docker Compose installed

### Step 1: Provision VPS

**Cheap VPS options:**
- DigitalOcean: $4/month
- Vultr: $2.50/month
- Contabo: $3.99/month
- Oracle Cloud: FREE tier (always free)

### Step 2: Install Docker

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install docker-compose
```

### Step 3: Clone and Deploy

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/sports-aggregator
cd sports-aggregator

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### Step 4: Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
apt-get install nginx

# Create config
cat > /etc/nginx/sites-available/sports-api << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/sports-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Install SSL (free)
apt-get install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### Updating Your Deployment

```bash
cd sports-aggregator
git pull
docker-compose down
docker-compose up -d --build
```

---

## Cloudflare Workers (Advanced)

**Best for:** Maximum free tier, global edge deployment

### Free Tier Limits
- ✅ 100,000 requests/day
- ✅ D1 Database: 5GB storage
- ✅ Cron Triggers: Unlimited
- ✅ Global CDN
- ✅ Zero cold starts

### Why Cloudflare?

This stack needs adaptation (PostgreSQL → D1 SQLite), but benefits:
- Serve from 275+ locations globally
- Automatic DDoS protection
- Incredible scale for free

### Conversion Process

Would require:
1. Rewrite scrapers for Workers environment
2. Convert PostgreSQL schema to D1 (SQLite)
3. Adapt Express API to Hono/itty-router
4. Set up Cron Triggers for scrapers

**Want this version?** Let me know and I'll build it!

---

## Database Hosting (If Separate)

### Free PostgreSQL Providers

#### Supabase (FREE forever)
- 500MB database
- 50,000 monthly active users
- Dashboard at [supabase.com](https://supabase.com)

```bash
# Get connection string from Supabase dashboard
# Add to .env:
DATABASE_URL=postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
```

#### Neon (FREE tier)
- 3GB storage
- Serverless PostgreSQL
- Dashboard at [neon.tech](https://neon.tech)

#### ElephantSQL (FREE tier)
- 20MB database (tight but usable for testing)
- Dashboard at [elephantsql.com](https://elephantsql.com)

---

## Performance Tuning

### Database Indexing

Indexes are already in `schema.sql`, but verify they exist:

```sql
-- Check indexes
\di

-- Should see:
-- idx_events_date
-- idx_events_level  
-- idx_events_sport
-- idx_events_status
-- idx_teams_search
```

### Caching Strategy

Add Redis for ultra-fast responses (optional):

```javascript
// Example: Cache today's events for 5 minutes
const redis = require('redis');
const client = redis.createClient();

app.get('/api/events/today', async (req, res) => {
  const cached = await client.get('today_events');
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Fetch from DB...
  const events = await query('SELECT * FROM todays_events');
  
  // Cache for 5 minutes
  await client.setEx('today_events', 300, JSON.stringify(events));
  res.json(events);
});
```

### Rate Limiting

Protect your free tier from abuse:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Monitoring & Alerts

### Free Monitoring Tools

**Uptime Robot** (uptimerobot.com)
- Free 50 monitors
- Check your `/health` endpoint every 5 minutes
- Email alerts when down

**Better Uptime** (betterstack.com/better-uptime)
- Free tier: 10 monitors
- Status page included

**Healthchecks.io**
- Monitor cron jobs
- Free 20 checks

### Setup Example

```bash
# Add to your scraper
const axios = require('axios');

async function pingHealthcheck() {
  await axios.get('https://hc-ping.com/YOUR-UUID-HERE');
}

// After successful scrape
await scrapeESPN();
await pingHealthcheck();
```

---

## Cost Breakdown

### Completely Free Option
```
Render.com (3 months) + Supabase (forever)
= $0 for 3 months, then migrate to Railway
```

### Recommended Long-Term
```
Render.com Web Service: $7/month
Supabase PostgreSQL: $0/month (free tier)
Total: $7/month
```

### Self-Hosted
```
Vultr VPS 1GB: $2.50/month
Cloudflare (DNS/SSL): $0/month
Total: $2.50/month
```

---

## Troubleshooting

### App won't start
```bash
# Check logs
railway logs  # or docker-compose logs -f app

# Common issues:
# 1. DATABASE_URL not set
# 2. Database schema not created
# 3. Port already in use
```

### Scrapers not running
```bash
# Check scraper_runs table
psql $DATABASE_URL -c "SELECT * FROM scraper_runs ORDER BY created_at DESC LIMIT 5;"

# Manual test
npm run scrape -- --once
```

### Out of memory
```bash
# Reduce scrape frequency
SCRAPE_INTERVAL_MINUTES=30  # Instead of 15

# Or deploy on larger instance (Render: $7/mo for more RAM)
```

---

## Next Steps

After deployment:
1. ✅ Monitor first scraper run (`/api/stats`)
2. ✅ Set up uptime monitoring
3. ✅ Add your API URL to your PWA
4. ✅ (Optional) Custom domain
5. ✅ (Optional) API authentication

Need help? Open an issue on GitHub!
