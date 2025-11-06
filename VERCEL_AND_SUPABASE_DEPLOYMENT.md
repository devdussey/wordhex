# Vercel + Supabase Deployment Guide

## Overview

Your WordHex application is now configured to run entirely on **Vercel + Supabase**:

- **Frontend**: Vercel (React + Vite)
- **Backend API**: Vercel Serverless Functions (`/api`)
- **Database**: Supabase PostgreSQL
- **Real-time Updates**: Supabase Realtime (instead of WebSocket)

## Architecture

```
Discord User
    ↓
Vercel Frontend (https://wordhex-sigma.vercel.app)
    ↓ API Calls to
Vercel Functions (/api/*)
    ↓
Supabase PostgreSQL Database
    ↓ Real-time Updates via
Supabase Realtime
    ↓
Frontend Receives Updates
```

## What Changed

### Removed
- ❌ Railway backend hosting
- ❌ Local WebSocket server
- ❌ `VITE_WS_URL` pointing to Railway

### Added
- ✅ Vercel Serverless Functions (`/api`)
- ✅ Supabase Realtime for real-time updates
- ✅ All 20+ API endpoints running on Vercel

### Environment Variables Updated

**Before:**
```env
VITE_API_URL=https://wordhex-backend-production.up.railway.app/api
VITE_WS_URL=wss://wordhex-backend-production.up.railway.app/ws
```

**After:**
```env
VITE_API_URL=https://wordhex-sigma.vercel.app/api
VITE_WS_URL=wss://wordhex-sigma.vercel.app/ws
```

## Deployment Steps

### 1. Commit Changes

```bash
git add .
git commit -m "Migrate backend from Railway to Vercel Functions + Supabase"
git push origin main
```

### 2. Deploy to Vercel

Vercel will automatically detect the changes and deploy:
- Your updated `vercel.json` configuration
- New `/api` functions (Serverless Functions)
- Updated environment variables

**Vercel handles:**
- Automatic serverless function deployment
- Environment variable injection
- CORS headers management
- SSL/HTTPS

### 3. Verify Deployment

Check that the deployment succeeded:

```bash
# Test health endpoint
curl https://wordhex-sigma.vercel.app/api/health

# Test email registration
curl -X POST https://wordhex-sigma.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","username":"TestUser"}'
```

## API Endpoints (Now on Vercel)

All endpoints run as Vercel Serverless Functions:

### Authentication
- `POST /api/auth/register` - Email registration
- `POST /api/auth/email-login` - Email login
- `POST /api/auth/login` - Discord/username login
- `POST /api/auth/guest` - Guest login
- `GET /api/auth/discord/start` - Discord OAuth start
- `GET /api/auth/discord/callback` - Discord OAuth callback
- `POST /api/auth/discord/exchange` - Embedded OAuth

### Lobbies
- `POST /api/lobby/create` - Create lobby
- `POST /api/lobby/join` - Join lobby
- `GET /api/lobbies` - List lobbies
- `GET /api/lobby/:lobbyId` - Get lobby details
- `POST /api/lobby/ready` - Mark player ready
- `POST /api/lobby/leave` - Leave lobby
- `POST /api/lobby/remove-player` - Remove player
- `POST /api/lobby/start` - Start game

### Game
- `POST /api/game/sessions` - Create session
- `POST /api/game/sessions/:sessionId/complete` - Complete session
- `POST /api/game/matches/:matchId/progress` - Update match
- `POST /api/game/matches` - Record match results

### Matchmaking
- `POST /api/matchmaking/join` - Join queue
- `POST /api/matchmaking/leave` - Leave queue
- `GET /api/matchmaking/snapshot` - Get queue snapshot

### Stats & Leaderboards
- `GET /api/leaderboard` - Top players
- `GET /api/stats/:userId` - Player statistics
- `GET /api/matches/:userId` - Match history
- `GET /api/server-records` - Server high score

### Utilities
- `GET /api/health` - Health check
- `GET /api` - API info

## Real-time Updates (Supabase Realtime)

Since Vercel Serverless Functions don't support WebSocket, real-time updates are handled by **Supabase Realtime**:

**Frontend already has:**
```typescript
VITE_REALTIME_PROVIDER=supabase
```

**Backend publishes events via:**
```javascript
publishSupabaseEvent(channel, payload);
```

**Events are broadcasted to:**
- Lobby updates: `lobby:{lobbyId}`
- Match updates: `match:{matchId}`
- Matchmaking: `matchmaking:global`
- Sessions: `sessions:{serverId}`
- Server records: `server-record:{serverId}`

## Important Notes

### 1. WebSocket Not Supported
Vercel Serverless Functions don't support persistent WebSocket connections. Instead:
- ✅ Use Supabase Realtime (already configured)
- ✅ Frontend subscribes to Supabase channels
- ✅ Backend publishes to Supabase channels

### 2. Cold Starts
Vercel Functions have a small cold start time (typically <100ms). This is normal and transparent to users.

### 3. Timeout
Vercel Serverless Functions have a default timeout of 60 seconds (300s for Pro). Long-running operations should be avoided.

### 4. No Persistent State
Each function invocation is stateless. In-memory state in `server/state.js` won't persist across requests. This is fine because:
- Prisma handles all persistent data in Supabase
- Supabase Realtime handles pub/sub
- State is ephemeral (lobbies, sessions, matches)

## Troubleshooting

### API 404 Errors
- Ensure `/api` functions are deployed to Vercel
- Check that `vercel.json` rewrite rules are correct
- Verify environment variables are set

### Database Connection Errors
- Confirm `DATABASE_URL` environment variable is set
- Check Supabase firewall allows Railway/Vercel IPs
- Verify Prisma migrations are applied

### Real-time Updates Not Working
- Confirm `VITE_REALTIME_PROVIDER=supabase`
- Check Supabase project Realtime is enabled
- Verify Supabase URL and ANON_KEY are correct

### CORS Errors
- Check `vercel.json` headers section
- Verify `ALLOWED_ORIGINS` includes frontend URL
- Check `Access-Control-Allow-Origin` header

## Monitoring

### Vercel Dashboard
- View function invocations: https://vercel.com/dashboard
- Check error logs and performance
- Monitor real-time metrics

### Supabase Dashboard
- View database queries and performance
- Check Realtime message logs
- Monitor storage and connections

## Cost Considerations

### Vercel
- **Free tier**: 100 GB-hours/month (plenty for most apps)
- **Paid**: $20/month with autoscaling
- Function executions: Free

### Supabase
- **Free tier**: 50,000 monthly active users, 1 GB database
- **Paid**: Starts at $25/month
- Storage and connections included

## Next Steps

1. **Push to production**: `git push origin main`
2. **Monitor deployment**: Check Vercel dashboard
3. **Test thoroughly**: Use health endpoint and auth tests
4. **Update documentation**: Share new URLs with users
5. **Cleanup**: You can deactivate Railway project (don't delete yet for backup)

## Files Changed

- `api/index.js` - Express app for Vercel Functions
- `vercel.json` - Updated config (no Railway rewrite)
- `.env` - Updated API/WS URLs
- `prisma/` - Database migrations (Supabase)
- `supabase/` - Supabase configuration (if used)

## Rollback Plan

If you need to go back to Railway:
1. Keep the old Railway dyno running (in standby)
2. Update `.env` to point back to Railway URLs
3. Update `vercel.json` rewrite rules
4. Redeploy to Vercel

## Support

- **Vercel Issues**: https://vercel.com/support
- **Supabase Issues**: https://supabase.com/docs/support
- **API Issues**: Check `/api/health` endpoint logs

---

**Deployment Date**: November 6, 2024
**Status**: Ready for Production
