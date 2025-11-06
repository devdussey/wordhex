# Production Deployment Checklist

This document outlines all the tasks and configurations needed to deploy WordHex Discord to production.

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Setup

#### Backend Environment Variables (Railway/Render/Fly.io)

**Required Variables:**
- [ ] `DATABASE_URL` - PostgreSQL connection string (Supabase or Railway)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001` (or platform default)
- [ ] `TRUST_PROXY=1` (for proper IP detection behind proxies)
- [ ] `ALLOWED_ORIGINS` - Comma-separated list of frontend origins
  - Example: `https://wordhex-discord-app.vercel.app,https://*.discordsays.com,https://discord.com`
- [ ] `DISCORD_CLIENT_ID` - Discord OAuth client ID
- [ ] `DISCORD_CLIENT_SECRET` - Discord OAuth client secret
- [ ] `DISCORD_SUCCESS_REDIRECT` (optional) - Redirect URL after OAuth success

**Database Configuration:**
- [ ] If using Supabase: Use Transaction Mode (Port 6543) for production
- [ ] If using Railway: Use provided `DATABASE_URL` from service
- [ ] Test database connection before deployment

#### Frontend Environment Variables (Vercel)

**Required Variables:**
- [ ] `VITE_DISCORD_CLIENT_ID` - Must match backend `DISCORD_CLIENT_ID`
- [ ] `VITE_API_URL` - Backend API URL (e.g., `https://wordhex-backend-production.up.railway.app/api`)
- [ ] `VITE_WS_URL` - WebSocket URL (e.g., `wss://wordhex-backend-production.up.railway.app/ws`)
- [ ] `VITE_SERVER_ID` (optional) - Default Discord server ID

**Configuration Files:**
- [ ] Update `vercel.json` rewrite destination to match backend URL
- [ ] Update `package.json` CSP headers to include backend URLs
- [ ] Run `npm run sync:vercel` to sync Vercel config

### 2. Database Setup

#### Initial Setup
- [ ] Create database (Supabase, Railway, or other PostgreSQL provider)
- [ ] Get connection string and test locally
- [ ] Run migrations: `npm run prisma:migrate`
- [ ] Generate Prisma client: `npm run prisma:generate`
- [ ] Seed database (optional): `npm run prisma:seed`

#### Production Database
- [ ] Set up database backups (automatic on Supabase, manual on Railway)
- [ ] Configure connection pooling (use Supabase Transaction Mode for production)
- [ ] Enable required PostgreSQL extensions if needed:
  - `uuid-ossp` (if not already enabled)
  - `pg_trgm` (if using text search)

### 3. Discord Application Configuration

#### Discord Developer Portal Setup
- [ ] Go to [Discord Developer Portal](https://discord.com/developers/applications)
- [ ] Add OAuth2 redirect URI: `https://your-backend-domain/api/auth/discord/callback`
- [ ] Add redirect URI for localhost (development): `http://localhost:3001/api/auth/discord/callback`
- [ ] Configure OAuth2 scopes: `identify`, `guilds`
- [ ] Set Activity root URL to frontend domain (e.g., `https://wordhex-discord-app.vercel.app/`)
- [ ] Add frontend domain to allowed origins in Discord app settings
- [ ] Verify Discord bot token if using bot features

### 4. Backend Deployment

#### Railway Deployment
- [ ] Connect GitHub repository to Railway
- [ ] Create new service from repository
- [ ] Add PostgreSQL service (or use external database)
- [ ] Set all required environment variables in Railway dashboard
- [ ] Verify `railway.json` configuration is correct
- [ ] Deploy and verify health check endpoint: `/api/leaderboard`
- [ ] Test WebSocket connection: `wss://your-backend-domain/ws`
- [ ] Monitor logs for errors

#### Alternative: Render Deployment
- [ ] Connect GitHub repository to Render
- [ ] Create new Web Service
- [ ] Verify `render.yaml` configuration
- [ ] Set environment variables in Render dashboard
- [ ] Deploy and test endpoints

#### Alternative: Fly.io Deployment
- [ ] Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [ ] Login: `fly auth login`
- [ ] Initialize: `fly launch`
- [ ] Set secrets: `fly secrets set DATABASE_URL="..."` (and other vars)
- [ ] Deploy: `fly deploy`

### 5. Frontend Deployment (Vercel)

#### Vercel Setup
- [ ] Import repository to Vercel
- [ ] Verify build settings:
  - Framework Preset: `Vite`
  - Build Command: `npm run build`
  - Install Command: `npm install --include=dev`
  - Output Directory: `dist`
  - Node.js Version: `20.x`
- [ ] Set all required environment variables in Vercel dashboard
- [ ] Configure custom domain (optional)
- [ ] Deploy and verify build succeeds
- [ ] Test Discord Activity embed loads correctly

#### Post-Deployment Frontend Checks
- [ ] Verify CSP headers allow Discord frames
- [ ] Test OAuth flow end-to-end
- [ ] Verify API rewrites work correctly
- [ ] Test WebSocket connections from frontend
- [ ] Check browser console for errors

### 6. Security Configuration

#### CORS Configuration
- [ ] Verify `ALLOWED_ORIGINS` includes all frontend domains
- [ ] Include Vercel preview URLs if needed: `https://*.vercel.app`
- [ ] Test CORS from browser DevTools

#### Security Headers
- [ ] Verify `X-Frame-Options: ALLOWALL` for Discord embedding
- [ ] Verify CSP allows Discord domains
- [ ] Verify COOP and COEP headers are set correctly
- [ ] Test security headers with: `curl -I https://your-frontend-domain.com`

#### Rate Limiting
- [ ] Verify rate limiting is active (already configured in server)
- [ ] Test rate limits with multiple rapid requests
- [ ] Monitor for false positives

#### Secrets Management
- [ ] Never commit `.env` files to Git
- [ ] Use platform secret management (Vercel, Railway, etc.)
- [ ] Rotate secrets periodically
- [ ] Use different secrets for staging/production

### 7. Monitoring & Logging

#### Error Tracking
- [ ] Set up error tracking (consider Sentry, LogRocket, or similar)
- [ ] Configure error logging in production
- [ ] Set up alerting for critical errors
- [ ] Monitor error rates

#### Performance Monitoring
- [ ] Set up Vercel Analytics (already configured)
- [ ] Monitor API response times
- [ ] Monitor WebSocket connection health
- [ ] Track database query performance (if using Supabase)

#### Logging
- [ ] Configure structured logging
- [ ] Set up log aggregation (if not using platform logs)
- [ ] Monitor application logs for errors
- [ ] Set up alerts for critical failures

### 8. Testing Production Environment

#### Functional Testing
- [ ] Test user registration/login (Discord OAuth)
- [ ] Test guest user creation
- [ ] Test lobby creation and joining
- [ ] Test matchmaking queue
- [ ] Test real-time gameplay with multiple users
- [ ] Test leaderboard functionality
- [ ] Test statistics tracking
- [ ] Test server records

#### Performance Testing
- [ ] Test with multiple concurrent users
- [ ] Test WebSocket connection stability
- [ ] Test database query performance
- [ ] Monitor memory usage
- [ ] Test under load (consider load testing)

#### Integration Testing
- [ ] Test Discord Activity embed loads in Discord
- [ ] Test OAuth callback flow
- [ ] Test WebSocket reconnection behavior
- [ ] Test error handling and recovery

### 9. Documentation & Maintenance

#### Documentation
- [ ] Update `README.md` with production URLs
- [ ] Document environment variable requirements
- [ ] Document deployment process
- [ ] Document rollback procedures
- [ ] Create runbook for common issues

#### Backup & Recovery
- [ ] Set up database backups (automatic or manual)
- [ ] Test database restore procedure
- [ ] Document recovery procedures
- [ ] Set up backup retention policy

#### Maintenance Plan
- [ ] Schedule regular dependency updates
- [ ] Plan for security patches
- [ ] Set up monitoring dashboards
- [ ] Create incident response plan

### 10. Post-Deployment Verification

#### Health Checks
- [ ] Backend health endpoint: `GET /api/leaderboard`
- [ ] Frontend loads without errors
- [ ] WebSocket connections establish
- [ ] Database queries succeed
- [ ] OAuth flow completes successfully

#### User Acceptance
- [ ] Test with real Discord users
- [ ] Verify all game features work
- [ ] Check for console errors
- [ ] Verify performance is acceptable

## 🔧 Configuration Files to Update

### Before Production Deployment

1. **`vercel.json`** - Update rewrite destination and CSP headers
2. **`package.json`** - Update CSP headers in `vercel` section
3. **`railway.json`** or **`render.yaml`** - Verify environment variables
4. **`.env`** (local) - Use as reference, never commit

### Example Updates

#### Update `vercel.json` rewrite:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-actual-backend-domain/api/:path*"
    }
  ]
}
```

#### Update CSP in `package.json`:
```json
{
  "vercel": {
    "headers": [{
      "headers": [{
        "key": "Content-Security-Policy",
        "value": "connect-src 'self' https://your-backend-domain wss://your-backend-domain ..."
      }]
    }]
  }
}
```

## 🚨 Common Issues & Solutions

### Database Connection Issues
- **Problem**: `ECONNREFUSED` or connection timeout
- **Solution**: Verify `DATABASE_URL` format, check port (6543 for Supabase Transaction Mode), verify credentials

### CORS Errors
- **Problem**: CORS errors in browser console
- **Solution**: Update `ALLOWED_ORIGINS` to include all frontend domains, verify backend is setting CORS headers

### WebSocket Connection Failures
- **Problem**: WebSocket fails to connect
- **Solution**: Verify backend URL is correct, check firewall/proxy settings, verify WebSocket path is `/ws`

### OAuth Callback Errors
- **Problem**: Discord OAuth redirect fails
- **Solution**: Verify callback URL is registered in Discord Developer Portal, check `DISCORD_CLIENT_SECRET` is correct

### Build Failures
- **Problem**: Vercel build fails
- **Solution**: Check Node.js version (must be 20.x), verify all dependencies are in `package.json`, check build logs

## 📝 Quick Reference

### Environment Variables Summary

**Backend:**
```bash
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3001
TRUST_PROXY=1
ALLOWED_ORIGINS=https://your-frontend.vercel.app,...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

**Frontend:**
```bash
VITE_DISCORD_CLIENT_ID=...
VITE_API_URL=https://your-backend-domain/api
VITE_WS_URL=wss://your-backend-domain/ws
```

### Deployment Commands

```bash
# Local database setup
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Sync Vercel config
npm run sync:vercel

# Build for production
npm run build

# Test locally
npm run dev        # Frontend
npm run server     # Backend
```

## ✅ Final Checklist

Before going live:
- [ ] All environment variables are set correctly
- [ ] Database is migrated and seeded
- [ ] Backend is deployed and health checks pass
- [ ] Frontend is deployed and loads correctly
- [ ] Discord OAuth is configured and tested
- [ ] WebSocket connections work
- [ ] All features are tested end-to-end
- [ ] Monitoring is set up
- [ ] Documentation is up to date
- [ ] Backup/recovery plan is in place

---

**Last Updated**: [Current Date]
**Maintained By**: Development Team

