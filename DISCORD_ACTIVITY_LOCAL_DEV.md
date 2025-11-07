# Discord Activity Local Development Setup

## Problem
Discord Activities require HTTPS and cannot directly access localhost. You're seeing:
- "The frame's scheme is insecure"
- Discord trying to load from https://localhost:8080

## Solution: Use Cloudflare Tunnel

### Step 1: Install Cloudflare Tunnel (cloudflared)

**Windows:**
```bash
# Download from: https://github.com/cloudflare/cloudflared/releases
# Or use winget:
winget install --id Cloudflare.cloudflared
```

**Mac:**
```bash
brew install cloudflared
```

**Linux:**
```bash
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Step 2: Start Your Dev Server

```bash
npm run dev
```

This starts Vite on http://localhost:5173

### Step 3: Create HTTPS Tunnel

In a new terminal:

```bash
cloudflared tunnel --url http://localhost:5173
```

You'll see output like:
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://random-words-1234.trycloudflare.com
```

**Copy this HTTPS URL!**

### Step 4: Update Discord Developer Portal

1. Go to: https://discord.com/developers/applications
2. Select your WordHex application (Client ID: 1433031616262832239)
3. Navigate to: **Activities** → **URL Mappings**
4. Update the mapping:
   - **Prefix**: `/`
   - **Target**: `https://random-words-1234.trycloudflare.com`
   - (Use your actual cloudflare tunnel URL)
5. Click **Save**

### Step 5: Test in Discord

1. In Discord Developer Portal → Activities
2. Click **"URL Mappings"**
3. Click the **"Copy Activity URL"** button
4. Paste the URL in any Discord channel
5. Click the link to launch your Activity

---

## Alternative: Use ngrok

### Step 1: Install ngrok

Visit: https://ngrok.com/download

### Step 2: Start Tunnel

```bash
# Start dev server
npm run dev

# In new terminal
ngrok http 5173
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 3: Update Discord

Same as Step 4 above, but use your ngrok URL

---

## Quick Fix for Current Issue

The error shows Discord is trying to load from `https://localhost:8080`. This means your Discord Activity URL Mapping is incorrect.

**Update it to:**
- Either use cloudflare/ngrok tunnel URL (for local dev)
- Or use your Vercel production URL: `https://wordhex.vercel.app`

---

## Production Setup

For production (not local testing):

1. **Discord Developer Portal** → Your App → **Activities** → **URL Mappings**
2. Set mapping to: `https://wordhex.vercel.app`
3. Make sure `VITE_DISCORD_CLIENT_ID` is set in Vercel environment variables
4. Test by sharing Activity URL in Discord

---

## Troubleshooting

**"Frame's scheme is insecure"**
- Discord requires HTTPS
- Use cloudflared or ngrok for local dev
- Use Vercel URL for production

**"Cannot connect to localhost"**
- Discord cannot access localhost directly
- Must use public tunnel (cloudflared/ngrok)

**"Activity not loading"**
- Check URL mapping matches your tunnel/deployment URL exactly
- Verify environment variables are set
- Check browser console for errors

---

## Environment Variables Needed

Make sure these are set:

```bash
VITE_DISCORD_CLIENT_ID=1433031616262832239  # Your app's client ID
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```

---

## Summary

**For Local Development:**
1. Run `npm run dev`
2. Run `cloudflared tunnel --url http://localhost:5173`
3. Update Discord URL Mapping with tunnel URL
4. Test Activity in Discord

**For Production:**
1. Deploy to Vercel (already done)
2. Update Discord URL Mapping to `https://wordhex.vercel.app`
3. Set environment variables in Vercel
4. Share Activity URL in Discord

---

**Need Help?**
- Cloudflare Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Discord Activities Docs: https://discord.com/developers/docs/activities/overview
- See also: `DISCORD_ACTIVITIES_SETUP.md`
