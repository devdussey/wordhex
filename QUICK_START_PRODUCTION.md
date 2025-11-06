# Production Deployment - Quick Start

## ⚡ Deploy Right Now

### 1. Commit Changes
```bash
git add .
git commit -m "Migrate from Railway to Vercel + Supabase"
git push origin main
```

Vercel automatically deploys on push. Check: https://vercel.com/dashboard

### 2. Verify Deployment
```bash
# Health check
curl https://wordhex-sigma.vercel.app/api/health

# Response should be:
# {"ok":true,"uptime":123.456,"dbOk":true}
```

### 3. Test Auth
```bash
# Register new user
curl -X POST https://wordhex-sigma.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "username": "TestUser"
  }'

# Login with email
curl -X POST https://wordhex-sigma.vercel.app/api/auth/email-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

## 🏗️ Architecture

```
Frontend → API → Database → Realtime
(Vercel)   (Vercel)  (Supabase)  (Supabase)
```

## 🔑 Key URLs

- **Frontend**: https://wordhex-sigma.vercel.app
- **API**: https://wordhex-sigma.vercel.app/api
- **Health**: https://wordhex-sigma.vercel.app/api/health
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime

## ✅ What Works

✅ All 20+ API endpoints
✅ Email & Discord authentication
✅ Database queries via Prisma
✅ Real-time updates via Supabase
✅ File uploads
✅ Rate limiting
✅ CORS handling

## ⚠️ What Changed

⚠️ No local WebSocket (use Supabase Realtime)
⚠️ 60-second function timeout
⚠️ No in-memory persistence (use Supabase)

## 📊 Monitoring

### Vercel Dashboard
- https://vercel.com/dashboard
- View logs, errors, metrics

### Supabase Dashboard
- https://app.supabase.com
- View database, realtime, analytics

## 🆘 Troubleshooting

### API Not Found (404)
```bash
# Check deployment
vercel logs

# Check vercel.json is correct
cat vercel.json
```

### Database Connection Failed
```bash
# Check DATABASE_URL in Vercel env vars
# Check Supabase firewall allows Vercel IPs
# Verify Prisma migrations applied
npm run prisma:migrate
```

### Real-time Not Working
```bash
# Ensure VITE_REALTIME_PROVIDER=supabase
# Check Supabase Realtime is enabled
# Verify frontend subscribes to channels
```

## 💰 Cost

- **Vercel**: Free tier = 100 GB-hours/month
- **Supabase**: Free tier = 50k monthly active users

Both have generous free tiers for development/small apps.

## 🔄 Rollback (If Needed)

Can't rollback? Railway project still exists for 30 days:

```bash
# Update .env to Railway URLs
VITE_API_URL=https://wordhex-backend-production.up.railway.app/api
VITE_WS_URL=wss://wordhex-backend-production.up.railway.app/ws

# Redeploy
git push origin main
```

## 📝 Important Files

- `api/index.js` - Express server for Vercel
- `vercel.json` - Vercel config
- `.env` - Environment variables
- `VERCEL_AND_SUPABASE_DEPLOYMENT.md` - Full guide
- `MIGRATION_COMPLETE.md` - What changed

## 🚀 Ready for Production?

✅ Yes! Everything is configured and deployed.

**Next steps:**
1. Monitor performance
2. Gather user feedback
3. Scale as needed

---

**Status**: ✅ Production Ready
**Last Updated**: November 6, 2024
