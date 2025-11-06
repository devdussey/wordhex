# Supabase Backend Setup Guide

This guide will help you migrate from Railway to Supabase for the WordHex Discord game backend.

## Why Supabase?

Supabase provides:
- **PostgreSQL Database** - Fully managed, auto-scaling PostgreSQL
- **Better CORS handling** - Built-in CORS configuration
- **Realtime capabilities** - Database change subscriptions (alternative to WebSocket)
- **Authentication** - Built-in auth system (optional for future use)
- **Dashboard** - Easy database management UI
- **Free tier** - Generous free tier for development

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in with GitHub
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `wordhex-discord` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Start with **Free tier** (upgradable later)
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to provision

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon) → **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab (not the Session mode)
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the database password you set in Step 1

### Connection Pooling Options

Supabase provides two connection modes:

- **Session Mode** (Port 5432): Direct connection, better for migrations
  ```
  postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
  ```

- **Transaction Mode** (Port 6543): Connection pooling, better for production
  ```
  postgresql://postgres.xxxxxxxxxxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  ```

**Recommendation**: Use **Transaction Mode (Port 6543)** for production, **Session Mode (Port 5432)** for running migrations locally.

## Step 3: Configure Environment Variables

### Backend Environment Variables

Create or update your `.env` file with the following:

```bash
# Database Configuration
# Use Transaction Mode (Port 6543) for production
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# For local migrations, you may want to use Session Mode (Port 5432)
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Server Configuration
PORT=3001
NODE_ENV=production
TRUST_PROXY=1

# CORS Configuration
# Add your Vercel frontend URL and any other domains
ALLOWED_ORIGINS=https://your-app.vercel.app,https://preview-*.your-app.vercel.app,http://localhost:5173

# Discord OAuth
DISCORD_CLIENT_ID=1433031616262832239
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Optional: Discord Success Redirect
DISCORD_SUCCESS_REDIRECT=https://your-app.vercel.app/
```

### Frontend Environment Variables

Update your frontend `.env`:

```bash
# Frontend Configuration
VITE_DISCORD_CLIENT_ID=1433031616262832239

# Backend URLs (update after deploying to new hosting)
VITE_API_URL=https://your-backend-host/api
VITE_WS_URL=wss://your-backend-host/ws

# Discord Server ID (optional)
VITE_SERVER_ID=your-discord-server-id
```

## Step 4: Run Database Migrations

Once you have the `DATABASE_URL` configured:

### Option A: Using Prisma CLI (Recommended)

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations against Supabase database
npm run prisma:migrate

# Seed initial data (optional)
npm run prisma:seed
```

### Option B: Manual Migration

If you have an existing Railway database to migrate:

1. **Export from Railway**:
   ```bash
   # Connect to Railway database
   pg_dump $RAILWAY_DATABASE_URL > railway_backup.sql
   ```

2. **Import to Supabase**:
   ```bash
   # Connect to Supabase database
   psql $SUPABASE_DATABASE_URL < railway_backup.sql
   ```

## Step 5: Configure Supabase Database Settings

### Enable Required Extensions

In Supabase Dashboard → **Database** → **Extensions**, enable:
- ✅ `pg_trgm` - For text search (if needed)
- ✅ `uuid-ossp` - For UUID generation (if needed)

### Configure Connection Pooling

In Supabase Dashboard → **Settings** → **Database**:
- **Pool Mode**: `Transaction` (recommended for serverless)
- **Default Pool Size**: `15` (adjust based on your needs)
- **Connection Timeout**: `30 seconds`

### Set Up Database Backups

Supabase automatically backs up your database:
- **Free tier**: Daily backups, 7-day retention
- **Pro tier**: Point-in-time recovery available

## Step 6: Configure CORS in Supabase

Supabase API has built-in CORS support, but for your Express backend:

1. Your Express server already has CORS configured via `ALLOWED_ORIGINS` env var
2. Update `ALLOWED_ORIGINS` to include all your frontend domains
3. Supabase's PostgreSQL database doesn't need CORS configuration

## Step 7: Deploy Your Backend

### Option A: Keep Railway (Just Switch Database)

Keep your Railway deployment but point it to Supabase database:

1. Go to Railway project → **Variables**
2. Update `DATABASE_URL` to your Supabase connection string
3. Redeploy the service

### Option B: Deploy to Render

```yaml
# render.yaml already configured
services:
  - type: web
    name: wordhex-backend
    env: node
    buildCommand: npm install
    startCommand: npm run prisma:generate && npm run prisma:migrate && npm run server
    envVars:
      - key: DATABASE_URL
        sync: false  # Set manually in Render dashboard
      - key: NODE_ENV
        value: production
```

Deploy to Render:
```bash
# Push to GitHub
git push origin main

# Connect repository to Render via dashboard
# Set environment variables in Render dashboard
```

### Option C: Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Set secrets
fly secrets set DATABASE_URL="your-supabase-url"
fly secrets set DISCORD_CLIENT_SECRET="your-secret"
fly secrets set ALLOWED_ORIGINS="your-origins"

# Deploy
fly deploy
```

### Option D: Deploy to Vercel (Serverless)

**Note**: Vercel serverless functions have limitations for WebSocket servers. Consider using Vercel + separate WebSocket service.

## Step 8: Update Frontend Configuration

After deploying your backend to a new host:

1. Update `vercel.json` rewrite destination:
   ```json
   "rewrites": [
     {
       "source": "/api/:path*",
       "destination": "https://your-new-backend-host/api/:path*"
     }
   ]
   ```

2. Update `package.json` CSP header:
   ```json
   "Content-Security-Policy": "connect-src 'self' https://your-new-backend-host wss://your-new-backend-host ..."
   ```

3. Set Vercel environment variables:
   ```bash
   vercel env add VITE_API_URL
   # Enter: https://your-new-backend-host/api

   vercel env add VITE_WS_URL
   # Enter: wss://your-new-backend-host/ws
   ```

4. Redeploy frontend:
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

## Step 9: Test the Connection

### Test Database Connection

```bash
# Test Prisma connection
npx prisma db pull

# Check database status
npx prisma db push --preview-feature
```

### Test Backend API

```bash
# Start local server with Supabase DATABASE_URL
npm run server

# Test health endpoint
curl http://localhost:3001/api/leaderboard

# Test auth endpoint
curl http://localhost:3001/api/auth/guest -X POST -H "Content-Type: application/json"
```

### Test Production Deployment

```bash
# Test deployed backend
curl https://your-backend-host/api/leaderboard

# Test WebSocket (using wscat)
npm install -g wscat
wscat -c wss://your-backend-host/ws
```

## Step 10: Monitor and Optimize

### Supabase Dashboard Monitoring

- **Database** → **Reports**: View query performance
- **Database** → **Roles**: Manage database users
- **Database** → **Backups**: Configure backup retention
- **Logs** → **Postgres Logs**: Debug connection issues

### Performance Tips

1. **Enable connection pooling** - Use Transaction Mode (Port 6543)
2. **Add database indexes** - Already configured in Prisma schema
3. **Use prepared statements** - Prisma handles this automatically
4. **Monitor query performance** - Use Supabase dashboard
5. **Set up alerting** - Configure Supabase email alerts for errors

### Common Issues

**Issue**: `ECONNREFUSED` or connection timeout
- **Solution**: Check `DATABASE_URL` format, ensure correct port (6543 or 5432)

**Issue**: `SSL connection required`
- **Solution**: Add `?sslmode=require` to connection string if needed

**Issue**: `too many clients`
- **Solution**: Use Transaction Mode (Port 6543) for connection pooling

**Issue**: CORS errors
- **Solution**: Update `ALLOWED_ORIGINS` environment variable, include all frontend domains

## Rollback Plan

If you need to rollback to Railway:

1. Keep Railway database running during migration
2. Change `DATABASE_URL` back to Railway connection string
3. Redeploy backend
4. Update frontend `VITE_API_URL` and `VITE_WS_URL`

## Next Steps

- [ ] Set up Supabase database backups
- [ ] Configure monitoring/alerting
- [ ] Consider using Supabase Auth for Discord OAuth (optional)
- [ ] Explore Supabase Realtime as WebSocket alternative (optional)
- [ ] Set up staging environment with separate Supabase project

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Prisma Docs**: https://www.prisma.io/docs

## Cost Estimate

### Supabase Free Tier
- **Database**: 500 MB storage
- **Bandwidth**: 2 GB egress
- **API Requests**: Unlimited
- **Realtime**: 2 GB bandwidth
- **Cost**: **$0/month**

### Supabase Pro Tier (if needed)
- **Database**: 8 GB storage included
- **Bandwidth**: 50 GB egress
- **Additional storage**: $0.125/GB
- **Cost**: **$25/month**

**Recommended**: Start with Free tier, upgrade to Pro when you exceed limits.
