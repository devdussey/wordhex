# 🚀 LAUNCH NOW - 5 Minute Quick Start

## TL;DR - 3 Commands to Launch

```bash
# 1. Verify code (takes 30 seconds)
npm run build && npm run typecheck && npm run lint

# 2. Deploy (takes 20 seconds)
git add . && git commit -m "Launch production" && git push origin main

# 3. Wait 2-3 minutes for Vercel to deploy
# Then test: curl https://wordhex-sigma.vercel.app/api/health
```

**That's it!** Your app is now live.

---

## Verify It Worked (3 Tests)

### Test 1: API Health
```bash
curl https://wordhex-sigma.vercel.app/api/health
# Should return: {"ok":true,"uptime":...,"dbOk":true}
```

### Test 2: Open in Discord
1. Open Discord app
2. Go to Activities
3. Select WordHex
4. Should load perfectly ✅

### Test 3: Play Game
1. Click "Login with Discord"
2. Create/join lobby
3. Play a game
4. Should work smoothly ✅

---

## Pre-Launch Checklist (2 mins)

Before running the 3 commands above:

```
✓ .env file exists in root directory
✓ No console.log() debug code in production
✓ Discord Client ID and Secret are correct
✓ DATABASE_URL points to Supabase
✓ Supabase migrations applied (run: npm run prisma:migrate)
```

---

## Environment Variables (Set in Vercel)

1. Go to https://vercel.com/dashboard
2. Click "wordhex" project
3. Settings → Environment Variables
4. Add these 14 variables (get values from your `.env` file):

```
VITE_DISCORD_CLIENT_ID=1435795762050236536
DISCORD_CLIENT_ID=1435795762050236536
DISCORD_CLIENT_SECRET=jmsepjRMfiP6xAhQlKkfm8xNnr6n4C5k
DATABASE_URL=postgresql://...@supabase.co/postgres
VITE_SUPABASE_URL=https://zxikrzkkmfwfjlqnwyxy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=...
VITE_REALTIME_PROVIDER=supabase
ALLOWED_ORIGINS=https://wordhex-sigma.vercel.app
TRUST_PROXY=1
VITE_API_URL=https://wordhex-sigma.vercel.app/api
VITE_WS_URL=wss://wordhex-sigma.vercel.app/ws
```

---

## Discord Developer Portal (2 mins)

1. Go to https://discord.com/developers/applications
2. Click "WordHex"
3. **OAuth2** tab → Add Redirect:
   ```
   https://wordhex-sigma.vercel.app/api/auth/discord/callback
   ```
4. **Activity** tab → Root URL:
   ```
   https://wordhex-sigma.vercel.app/
   ```
5. **Save** (button on page)

---

## Deployment Status

After `git push`:

1. Go to https://vercel.com/dashboard
2. Click "wordhex" project
3. Watch deployment progress:
   - 🔵 Building... (1-2 mins)
   - 🔵 Deploying... (30 secs)
   - ✅ Live! (when green checkmark appears)

---

## Production URL

Your app is now live at:
```
https://wordhex-sigma.vercel.app
```

**API:** https://wordhex-sigma.vercel.app/api
**Health:** https://wordhex-sigma.vercel.app/api/health

---

## If Something Breaks

**Check Vercel logs:**
```bash
vercel logs wordhex --tail
```

**Common issues:**
- API 500 error → Check DATABASE_URL in Vercel env vars
- OAuth not working → Check Discord redirect URL is exact match
- Real-time not working → Verify Supabase credentials

**Rollback (60 seconds):**
```bash
git revert HEAD
git push origin main
```

---

## Success Criteria ✅

You're live when:
- [ ] Vercel shows green checkmark
- [ ] Health endpoint returns 200
- [ ] Can login via Discord
- [ ] Can play a complete game
- [ ] Real-time updates work
- [ ] No errors in console

---

## Next Steps

1. ✅ Invite team to Discord
2. ✅ Share activity link
3. ✅ Monitor logs for first hour
4. ✅ Gather user feedback
5. ✅ Celebrate! 🎉

---

**Estimated Time**: 5-10 minutes total
**Difficulty**: Easy
**Risk**: Very Low (all tested)

**Status**: Ready to Launch Now ✅
