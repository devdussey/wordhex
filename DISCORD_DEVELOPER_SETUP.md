# Discord Developer Portal Setup Guide

## Overview

WordHex requires Discord OAuth2 credentials to enable Discord login for your game. This guide walks you through setting up your Discord application in the Discord Developer Portal.

## Step 1: Create or Open Your Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** button (top right)
3. Enter application name: **WordHex** (or your preferred name)
4. Accept the ToS and click **"Create"**

## Step 2: Get Your Client ID & Client Secret

1. Go to the **"General Information"** tab
2. Copy your **Client ID** - you'll need this for `VITE_DISCORD_CLIENT_ID` and `DISCORD_CLIENT_ID`
3. Click **"Reset Secret"** under the Client Secret section
4. Copy the new **Client Secret** - you'll need this for `DISCORD_CLIENT_SECRET`

⚠️ **IMPORTANT**: Keep your Client Secret private! Never commit it to GitHub.

## Step 3: Configure OAuth2 Redirects

1. Go to the **"OAuth2"** tab
2. Under **"Redirects"**, click **"Add Redirect"**

### For Development (Local Testing):
Add both:
```
http://localhost:3001/api/auth/discord/callback
http://localhost:5173
```

### For Production (Railway/Vercel):
Add your actual backend URL:
```
https://wordhex-backend-production.up.railway.app/api/auth/discord/callback
https://your-frontend-domain.com
```

> You can add multiple redirects. Add one for each environment (dev, staging, production).

## Step 4: Configure Default Authorization Link

1. Still in **"OAuth2"** tab
2. Scroll to **"Default Authorization Link"**
3. Under **"Scopes"**, select:
   - ✅ `identify` (read user profile info)
   - ✅ `guilds` (read user's Discord servers)
4. Copy the generated link (you don't need it for WordHex, but it's useful for testing)

## Step 5: Set Up Discord Activity (Optional but Recommended)

If you want WordHex to work as a Discord Activity:

1. Go to **"General Information"** tab
2. Scroll to **"Application Type"**
3. Ensure it says **"Application Type: Game"** (if available)
4. Under **"Activities"**, click **"Add Activity"**
5. Configure:
   - **Activity Type**: Select appropriate type
   - **Root URL**: `https://your-frontend-domain.com/` (for production)
   - **Activity Instance URL**: Leave blank or set to root URL

## Step 6: Enable Developer Mode (For Testing)

1. Open Discord desktop/web app
2. Go to **User Settings → Advanced**
3. Enable **"Developer Mode"**
4. Now you can right-click on servers/channels to see their IDs

## Environment Variables to Add

After getting your credentials, update your `.env` file:

```env
# Frontend - Required for Discord auth
VITE_DISCORD_CLIENT_ID=1435795762050236536

# Backend - Required for OAuth code exchange
DISCORD_CLIENT_ID=1435795762050236536
DISCORD_CLIENT_SECRET=jmsepjRMfiP6xAhQlKkfm8xNnr6n4C5k

# Optional - If hosting bot separately
DISCORD_BOT_TOKEN=your-bot-token-here
```

### Current Configuration:
Your `.env` file already has:
```
VITE_DISCORD_CLIENT_ID=1435795762050236536
DISCORD_CLIENT_ID=1435795762050236536
DISCORD_CLIENT_SECRET=jmsepjRMfiP6xAhQlKkfm8xNnr6n4C5k
```

## What Each Variable Does

| Variable | Where It's Used | Purpose |
|----------|-----------------|---------|
| `VITE_DISCORD_CLIENT_ID` | Frontend (Vite) | Initiates Discord OAuth flow in the browser |
| `DISCORD_CLIENT_ID` | Backend (Express) | Fallback if VITE version not set; used in OAuth |
| `DISCORD_CLIENT_SECRET` | Backend (Express) | Exchanges OAuth code for access token securely |
| `DISCORD_BOT_TOKEN` | Bot (optional) | For Discord bot commands and automations |

## Testing OAuth Flow

### Test Locally:

1. Start your backend:
   ```bash
   npm run server
   ```

2. Start your frontend:
   ```bash
   npm run dev
   ```

3. In your browser, go to `http://localhost:5173`

4. Click the Discord login button

5. You should be redirected to Discord to authorize the app

6. After authorization, you should be logged in to WordHex

### Test Redirect URL:

The OAuth callback happens at:
```
http://localhost:3001/api/auth/discord/callback?code=xxxxx&state=xxxxx
```

If you see errors like **"invalid_redirect_uri"**, it means the redirect URL in Discord Developer Portal doesn't match what your backend is using.

## Troubleshooting

### Error: "Invalid redirect URI"
- Go back to Discord Developer Portal
- Check that your redirect URL matches exactly (including http/https and trailing slashes)
- Common issues:
  - Using `http://localhost` instead of `http://localhost:3001/api/auth/discord/callback`
  - Missing or extra slashes
  - Wrong port number

### Error: "Invalid client secret"
- Verify you copied the secret correctly (it's long and random)
- Make sure you used **"Reset Secret"** not just copied an old one
- Don't share this with anyone!

### Error: "Unauthorized" or "403"
- Verify both `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correct
- Restart your backend after changing `.env`
- Check that your app is still in the Developer Portal (sometimes they get deleted)

### OAuth Flow Not Starting
- Verify `VITE_DISCORD_CLIENT_ID` is set in frontend
- Check browser console for JavaScript errors
- Ensure you're using the exact Client ID from Discord Developer Portal

## Security Best Practices

1. ✅ **Never commit secrets** - Use `.env` with `.gitignore`
2. ✅ **Use HTTPS in production** - Discord requires `https://` for production URLs
3. ✅ **Rotate secrets regularly** - Use "Reset Secret" if you think it's compromised
4. ✅ **Limit scopes** - Only request `identify` and `guilds`, nothing else
5. ✅ **Validate all tokens** - Backend always verifies the code exchange
6. ✅ **Use rate limiting** - Your backend already has rate limiting on `/api/auth/`

## Advanced: Adding More OAuth Scopes

If you need additional data from Discord users:

1. In Discord Developer Portal, go to **OAuth2 → Default Authorization Link**
2. Under **Scopes**, additional options include:
   - `email` - Read user's email address
   - `gdm.join` - Create group DMs
   - `rpc.notifications.read` - Read notifications
   - See [Discord Scopes Documentation](https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes) for full list

3. Update `server/index.js` to request new scopes:
   ```javascript
   const DISCORD_OAUTH_SCOPES = ['identify', 'guilds', 'email']; // Add 'email' here
   ```

## Resources

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Discord API Reference](https://discord.com/developers/docs/intro)
- [Discord Support Server](https://discord.gg/discord-developers)

## Current Setup Status

✅ **Client ID configured**: 1435795762050236536
✅ **Client Secret configured**: ••••••••••••••••••••
✅ **OAuth endpoints enabled**: `/api/auth/discord/start` and `/api/auth/discord/callback`
✅ **Email/Password auth added**: `/api/auth/register` and `/api/auth/email-login`
✅ **Rate limiting enabled**: On all `/api/auth/` endpoints

**Your Discord OAuth is fully configured and ready to use!**
