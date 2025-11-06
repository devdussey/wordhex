# Supabase Quick Start Guide

**TL;DR**: Migrate from Railway to Supabase in 5 steps

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js 20+ installed
- Git repository access

## Quick Setup (5 Steps)

### 1. Create Supabase Project

```bash
# Go to https://supabase.com and create a new project
# - Name: wordhex-discord
# - Password: Choose a strong password (SAVE THIS!)
# - Region: us-east-1 (or closest to your users)
# - Plan: Free tier
```

### 2. Get Database URL

1. In Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Connection string** → Select **URI** tab
3. Copy the **Transaction mode** connection string (Port 6543)
4. Replace `[YOUR-PASSWORD]` with your actual password

Example:
```
postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 3. Update Environment Variables

Create or update `.env` file:

```bash
# Copy example if you don't have .env yet
cp .env.example .env

# Edit .env and update DATABASE_URL
# Replace with your Supabase connection string from Step 2
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Also set these:
DISCORD_CLIENT_ID=1433031616262832239
DISCORD_CLIENT_SECRET=your-secret-from-discord-dev-portal
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

### 4. Run Setup Script

```bash
# This will test connection, run migrations, and seed data
npm run setup:supabase
```

If successful, you'll see:
```
✓ Database connection successful!
✓ Prisma Client generated successfully!
✓ Migrations applied successfully!
✓ Database seeded successfully!
✓ Supabase setup completed successfully!
```

### 5. Deploy Backend

**Option A: Keep Railway (just switch database)**

```bash
# In Railway dashboard:
# 1. Go to your project → Variables
# 2. Update DATABASE_URL with Supabase connection string
# 3. Click "Redeploy"
```

**Option B: Deploy to Render**

```bash
# 1. Connect your GitHub repo to Render
# 2. Create new Web Service
# 3. Set environment variables in Render dashboard
# 4. Deploy
```

**Option C: Deploy to Fly.io**

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch
fly secrets set DATABASE_URL="your-supabase-url"
fly deploy
```

## Update Frontend (After Backend Deployed)

### Update Vercel Environment Variables

```bash
# Set in Vercel Dashboard or via CLI:
vercel env add VITE_API_URL
# Enter: https://your-new-backend-host/api

vercel env add VITE_WS_URL
# Enter: wss://your-new-backend-host/ws
```

### Update Configuration Files

**1. Update `vercel.json` rewrite:**

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-new-backend-host/api/:path*"
    }
  ]
}
```

**2. Update `package.json` CSP header:**

Find the CSP header and replace Railway URL:

```json
"connect-src 'self' ... https://your-new-backend-host wss://your-new-backend-host ..."
```

**3. Commit and push:**

```bash
git add .
git commit -m "Migrate to Supabase backend"
git push origin main
```

## Verify Everything Works

### Test Backend

```bash
# Test health endpoint
curl https://your-backend-host/api/leaderboard

# Should return: {"leaderboard": [...]}
```

### Test Frontend

1. Visit your Vercel app URL
2. Click "Sign in with Discord"
3. Create a lobby
4. Join with another user
5. Start a game

## Troubleshooting

### Connection Issues

```bash
# Test database connection
npx prisma db pull

# If fails, check:
# 1. DATABASE_URL format is correct
# 2. Password has no special chars that need encoding
# 3. Using correct port (6543 for production, 5432 for migrations)
```

### CORS Errors

```bash
# Ensure ALLOWED_ORIGINS includes all your domains:
ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app,http://localhost:5173
```

### Migration Errors

```bash
# If migrations fail, try Session Mode (Port 5432) for running migrations:
# Temporarily change DATABASE_URL to use port 5432
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Run migrations
npm run prisma:migrate

# Then switch back to port 6543 for production
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Need Help?

- **Detailed guide**: See `SUPABASE_SETUP.md`
- **Supabase docs**: https://supabase.com/docs
- **Prisma docs**: https://www.prisma.io/docs

## Cost

- **Free tier**: 500 MB database, unlimited API requests
- **Pro tier**: $25/month (8 GB database, more bandwidth)
- **Start with free tier**, upgrade when needed

## Rollback to Railway

If you need to rollback:

```bash
# Change DATABASE_URL back to Railway
DATABASE_URL=your-railway-database-url

# Redeploy backend
# Update frontend environment variables
```

Keep Railway database running for a few days as backup before deleting!
