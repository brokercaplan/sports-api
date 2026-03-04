# QUICK START - Render Deployment (5 Minutes)

## Step 1: Push to GitHub (2 min)
```bash
cd sports-api
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sports-api.git
git push -u origin main
```

## Step 2: Create Database (1 min)
1. Render dashboard → **New +** → **PostgreSQL**
2. Name: `sports-db`
3. Plan: **Free**
4. Click **Create Database**
5. **COPY THE INTERNAL DATABASE URL** (you need this!)

## Step 3: Create Web Service (2 min)
1. **New +** → **Web Service**
2. Connect your `sports-aggregator` repo
3. Settings:
   - **Name:** `sports-api`
   - **Build:** `npm install`
   - **Start:** `node src/index.js`
   - **Plan:** Free
4. **Environment Variables:**
   - `DATABASE_URL` = (paste Internal Database URL from Step 2)
   - `PORT` = `3000`
5. Click **Create Web Service**

## Step 4: Initialize Database (30 sec)
1. Wait for deploy to finish
2. Click **Shell** tab
3. Run:
```bash
psql $DATABASE_URL -f sql/schema.sql
```

## Done! ✅

Test it:
```bash
curl https://YOUR-APP.onrender.com/api/stats
```

Wait 15 min for data to populate, then:
```bash
curl https://YOUR-APP.onrender.com/api/events/today
```

---

## Troubleshooting

**Build fails?**
→ Make sure all files are pushed to GitHub

**Database connection fails?**  
→ Use **Internal** Database URL, not External

**No data?**
→ Wait 15-30 minutes for scrapers to run

**504 timeout?**
→ Free tier sleeps - first request wakes it (30 sec)

---

## Your Live API

Once deployed, your API is at:
```
https://YOUR-APP-NAME.onrender.com
```

Test endpoints:
- `/api/events/today` - Today's games
- `/api/events/live` - Live now
- `/api/events/city/miami` - Miami events
- `/api/stats` - API health
