# Root URL vs Proxy Mapping Explained

## Quick Answer

| Concept | What It Does | Your Value |
|---------|-------------|-----------|
| **Root URL** | Where Discord loads your game when opened as an Activity | `https://wordhex.vercel.app/` |
| **Proxy Mapping** | Routes API requests from frontend to backend | `/api/*` → `https://wordhex-backend...` |

---

## Root URL (Discord Developer Portal)

### What It Is
The **entry point URL** that Discord loads when someone opens your Activity in Discord.

### Where to Set It
Discord Developer Portal → Your App → General Information → **Activities → Root URL**

### Your Value Should Be
```
https://wordhex.vercel.app/
```

### How It Works

```
User opens WordHex Activity in Discord
         ↓
Discord loads: https://wordhex.vercel.app/
         ↓
Your React frontend starts at index.html
         ↓
React Router handles all navigation from there
         ↓
User can navigate to /game, /leaderboard, etc. (client-side routing)
```

### Example Values for Different Deployments

```
Development:  http://localhost:5173/
Staging:      https://wordhex-staging.vercel.app/
Production:   https://wordhex.vercel.app/
```

### Important Notes
- Must end with a trailing slash `/`
- Must be HTTPS in production (Discord requires it)
- Should point to your **frontend** (Vercel), not your backend
- This is what users see when opening the Activity

---

## Proxy Mapping (vercel.json)

### What It Is
**Routing rules** that tell Vercel how to handle requests to your API. This creates a "proxy" so your frontend can call `/api/...` instead of `https://wordhex-backend.up.railway.app/...`

### Your Configuration

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://wordhex-backend-production.up.railway.app/api/:path*"
    },
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

### How It Works

```
Frontend request: POST /api/auth/register
         ↓
Vercel sees the "/api" pattern
         ↓
Matches rule: source="/api/:path*"
         ↓
Forwards to: https://wordhex-backend-production.up.railway.app/api/register
         ↓
Backend responds
         ↓
Vercel returns response to frontend
```

### Before Proxy Mapping (Without Rewrite)
```javascript
// Frontend code (CORS issues without proxy)
const response = await fetch(
  'https://wordhex-backend-production.up.railway.app/api/auth/register',
  { credentials: 'include' }
);
```

### After Proxy Mapping (With Rewrite)
```javascript
// Frontend code (clean, uses same domain)
const response = await fetch(
  '/api/auth/register',
  { credentials: 'include' }
);
```

**Benefits:**
- ✅ No CORS issues (same domain)
- ✅ Cleaner code
- ✅ Easier to change backend URL later
- ✅ Works with cookies/credentials

---

## Visual Architecture Diagram

```
Discord App Store
       ↓
User clicks "Open Activity"
       ↓
Discord loads Root URL:
https://wordhex.vercel.app/
       ↓
┌─────────────────────────────────┐
│  Vercel (Frontend)              │
│  https://wordhex.vercel.app     │
│                                 │
│  User Login →  POST /api/auth   │
│  (via Proxy)        ↓           │
│       ┌──────────────────────────────────┐
│       │ Proxy Rewrite Rule               │
│       │ /api/* → backend/api/*           │
│       └──────────────────────────────────┘
│                     ↓                     │
└────────────────────┼────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │  Railway (Backend)         │
        │  .up.railway.app           │
        │                            │
        │  /api/auth/register        │
        │  /api/game/sessions        │
        │  /api/leaderboard          │
        └────────────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │  Supabase (Database)       │
        │  PostgreSQL                │
        └────────────────────────────┘
```

---

## Your Current Setup

### Root URL (Discord Portal)
```
https://wordhex.vercel.app/
```
- Points to Vercel frontend
- Where Discord loads your Activity
- User-facing URL

### API Proxy Mapping (vercel.json)
```json
{
  "source": "/api/:path*",
  "destination": "https://wordhex-backend-production.up.railway.app/api/:path*"
}
```
- Intercepts `/api` requests
- Routes to Railway backend
- Invisible to user

### Where Each Server Is Hosted

```
Frontend:  Vercel (vercel.app domain)
Backend:   Railway (.up.railway.app domain)
Database:  Supabase (supabase.co domain)
```

---

## Common Mistakes

### ❌ Wrong Root URL
```
❌ https://wordhex-backend-production.up.railway.app  (This is your backend!)
❌ http://localhost:5173/  (Local dev URL)
❌ https://wordhex.vercel.app (missing trailing slash)

✅ https://wordhex.vercel.app/  (Correct)
```

**Why:** Users need to load your React frontend, not the API backend.

### ❌ Wrong Proxy Mapping
```json
❌ {
  "source": "/api/:path*",
  "destination": "http://localhost:3001/api/:path*"  (localhost doesn't work in production!)
}

✅ {
  "source": "/api/:path*",
  "destination": "https://wordhex-backend-production.up.railway.app/api/:path*"
}
```

**Why:** Production Vercel servers can't reach your local machine.

### ❌ Forgetting SPA Rewrite
```json
❌ Only has API proxy, no SPA fallback

✅ Should also have:
{
  "source": "/((?!api).*)",
  "destination": "/index.html"
}
```

**Why:** React Router needs index.html for client-side routing (e.g., `/game`, `/leaderboard`).

---

## Testing Your Configuration

### Test Root URL
1. Go to Discord
2. Open your Activity
3. Should load from `https://wordhex.vercel.app/`
4. Check browser DevTools Network tab to confirm

### Test Proxy Mapping
In your frontend, test an API call:
```javascript
// This should work
const response = await fetch('/api/leaderboard');
console.log(response);

// Check Network tab in DevTools
// Request URL should show: https://wordhex.vercel.app/api/leaderboard
// But it's actually proxied to: https://wordhex-backend-production.up.railway.app/api/leaderboard
```

### Test SPA Routing
1. Load your Activity
2. Click to go to `/game` page
3. Refresh the page (F5)
4. Should still be on `/game` (not 404)
5. This confirms the SPA rewrite is working

---

## Environment Variables Relationship

```env
# Frontend uses this to make API calls
VITE_API_URL=https://wordhex.vercel.app/api
# Actually gets proxied to the backend!

# Backend uses this for its own server
VITE_BACKEND_URL=https://wordhex-backend-production.up.railway.app

# Backend OAuth callback (must be frontend URL due to proxy)
CALLBACK_URL=https://wordhex.vercel.app/api/auth/discord/callback
```

---

## Summary

| Aspect | Root URL | Proxy Mapping |
|--------|----------|---------------|
| **Set in** | Discord Developer Portal | vercel.json |
| **What it is** | Entry point for Activity | Routes for API requests |
| **Your value** | `https://wordhex.vercel.app/` | `/api/:path*` → backend |
| **Points to** | Frontend (Vercel) | Frontend (which proxies to backend) |
| **User sees** | Yes (in browser) | No (transparent) |
| **Purpose** | Where Discord loads game | How frontend talks to API |

**Remember:** Root URL is where the user enters, Proxy Mapping is how requests are routed internally.
