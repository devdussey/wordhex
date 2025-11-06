# Discord Activity Setup Guide

This guide will help you set up WordHex as a Discord Activity (Embedded App).

## Prerequisites

- A Discord Application (create at https://discord.com/developers/applications)
- A Vercel account for hosting
- A Supabase project with proper database tables

## Step 1: Discord Developer Portal Configuration

### 1.1 Create/Configure Your Discord Application

1. Go to https://discord.com/developers/applications
2. Create a new application or select your existing one
3. Note your **Application ID** (Client ID)

### 1.2 Enable Discord Activity

1. Navigate to **Activities** in the left sidebar
2. Click **Enable Activities**
3. Configure URL Mappings:
   - **Root Mapping**: `https://your-app.vercel.app` (your Vercel deployment URL)
   - Add any additional API endpoints you need to proxy

### 1.3 Configure OAuth2 Settings

1. Go to **OAuth2** in the left sidebar
2. Enable **Public Client** (important for embedded apps)
3. Add Redirect URLs:
   - Development: `http://127.0.0.1:5173`
   - Production: `https://your-app.vercel.app`
4. Note your **Client Secret** (keep this secure!)

### 1.4 Set OAuth2 Scopes

Required scopes for WordHex:
- `identify` - Get user information
- `guilds` - See servers user is in
- `applications.commands` (optional) - For slash commands

## Step 2: Environment Variables

### 2.1 Local Development (.env)

Update your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://ztrvimioqaphkbbvzupo.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Discord Activity Configuration
VITE_DISCORD_CLIENT_ID="your-discord-application-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
```

### 2.2 Vercel Environment Variables

Add these in your Vercel project settings (Settings → Environment Variables):

**Production & Preview:**
- `VITE_SUPABASE_URL` = Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
- `VITE_DISCORD_CLIENT_ID` = Your Discord Application ID
- `DISCORD_CLIENT_SECRET` = Your Discord Client Secret (mark as secret!)

## Step 3: Vercel Deployment

### 3.1 Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### 3.2 Deployment Configuration

The project includes `vercel.json` with:
- CSP headers configured for Discord
- Proxy rewrites for API calls (`/.proxy/*`)
- Proper frame-ancestors settings

Build settings (auto-detected):
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3 Update Discord Activity URL

Once deployed:
1. Go back to Discord Developer Portal → Activities
2. Update Root Mapping to your Vercel URL: `https://your-app.vercel.app`

## Step 4: Testing Your Activity

### 4.1 Enable Developer Mode in Discord

1. Open Discord
2. Go to User Settings → Advanced
3. Enable **Developer Mode**

### 4.2 Test Your Activity

1. In Discord Developer Portal, go to Activities
2. Click **URL Mappings** and use the test feature
3. Or create a test server and enable your activity

### 4.3 Local Testing with Discord SDK Mock

The app includes `DiscordSDKMock` for local testing:

```bash
npm run dev
```

The mock will be used automatically when not running inside Discord.

## Architecture Overview

### Authentication Flow

1. **Discord SDK Initialization**: App loads and initializes Discord SDK
2. **Authorization**: SDK requests authorization with required scopes
3. **Token Exchange**: Authorization code is sent to `/api/proxy/token`
4. **Backend Exchange**: Serverless function exchanges code for access token
5. **Authentication**: SDK authenticates using access token
6. **Supabase Integration**: User data synced with Supabase database

### CSP Compliance

All external API calls must go through `/.proxy/*` paths to comply with Discord's CSP:

```typescript
// ✅ Correct - Uses proxy
fetch('/.proxy/api/token', { ... })

// ❌ Wrong - Will be blocked by CSP
fetch('/api/token', { ... })
```

### Files Added for Discord Activities

- `src/lib/discordSdk.ts` - Discord SDK wrapper and utilities
- `api/proxy/token.ts` - Token exchange endpoint (Vercel serverless)
- `vercel.json` - Vercel configuration with CSP headers
- `DISCORD_SETUP.md` - This setup guide

## Required Discord Developer Portal Settings Summary

| Setting | Location | Value |
|---------|----------|-------|
| Public Client | OAuth2 | ✅ Enabled |
| Root Mapping | Activities → URL Mappings | `https://your-app.vercel.app` |
| Redirect URL | OAuth2 | `https://your-app.vercel.app` |
| Scopes | OAuth2 | `identify`, `guilds` |

## Troubleshooting

### Issue: "Failed to exchange code for token"

- Check that `DISCORD_CLIENT_SECRET` is set in Vercel
- Verify the secret matches your Discord application
- Check Vercel function logs

### Issue: CSP Errors in Console

- Ensure all API calls use `/.proxy/` prefix
- Check `vercel.json` CSP headers are correct
- Verify Discord URL Mappings are configured

### Issue: "Discord SDK not ready"

- Make sure you're testing in Discord or using the mock
- Check that `VITE_DISCORD_CLIENT_ID` is set correctly
- Verify your app is enabled as an Activity in Discord Developer Portal

### Issue: Authentication Loop

- Clear browser cache and Discord cache
- Verify redirect URLs match exactly (including trailing slashes)
- Check OAuth2 settings in Discord Developer Portal

## Additional Resources

- [Discord Embedded App SDK Docs](https://discord.com/developers/docs/developer-tools/embedded-app-sdk)
- [Discord Activities Examples](https://github.com/discord/embedded-app-sdk-examples)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Supabase Documentation](https://supabase.com/docs)

## Support

For issues specific to:
- **Discord SDK**: https://github.com/discord/embedded-app-sdk/issues
- **Vercel Deployment**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
