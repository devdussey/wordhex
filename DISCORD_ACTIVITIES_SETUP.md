# Discord Activities Setup Guide

This guide explains how to set up WordHex as a Discord Activity (embedded app within Discord).

## What are Discord Activities?

Discord Activities are interactive apps that run inside Discord channels. Users can launch them directly from Discord and play together in voice channels or text channels.

---

## Prerequisites

- Discord Developer Account
- Discord Application created (same one used for OAuth)
- WordHex deployed and accessible via HTTPS URL

---

## Step 1: Configure Discord Application

### 1.1 Enable Activity in Developer Portal

1. Go to: https://discord.com/developers/applications
2. Select your WordHex application
3. Navigate to **"Activities"** in the left sidebar
4. Click **"Enable Activity"**

### 1.2 Set Activity URL Mappings

In the Activities settings:

1. **Add URL Mapping**:
   - **Prefix**: `/`
   - **Target**: `https://your-vercel-app.vercel.app`
   - Replace with your actual deployed URL

2. **Save Changes**

### 1.3 Get Your Application ID

1. Go to **"General Information"**
2. Copy your **Application ID** (same as Client ID)
3. You'll need this for the environment variable

---

## Step 2: Configure Environment Variables

### Add to `.env` file:

```bash
VITE_DISCORD_CLIENT_ID=your-application-id-here
```

### Add to Vercel Environment Variables:

1. Go to Vercel Dashboard → Your Project
2. Navigate to **Settings → Environment Variables**
3. Add:
   - **Name**: `VITE_DISCORD_CLIENT_ID`
   - **Value**: Your Discord Application ID
   - **Environment**: Production, Preview, Development
4. Click **"Save"**
5. **Redeploy** your app for changes to take effect

---

## Step 3: Test the Activity

### 3.1 Test in Discord Developer Portal

1. In your app's **Activities** settings
2. Click **"Test in Discord"**
3. Select a server and channel
4. Launch the activity

### 3.2 Test with Share Link

1. In your app's **Activities** settings
2. Find **"Activity URL"** or **"Share Link"**
3. Share this link in a Discord server
4. Click the link to launch the activity

---

## Step 4: Usage in the App

### Using Discord SDK in Components

The Discord SDK is automatically initialized. Use the `useDiscordSdk` hook:

```typescript
import { useDiscordSdk } from '../hooks';

function MyComponent() {
  const { isEmbedded, user, setActivity, openShareDialog } = useDiscordSdk();

  // Check if running in Discord
  if (isEmbedded) {
    console.log('Running as Discord Activity!');
    console.log('Discord User:', user);
  }

  // Update activity status
  const updateActivity = async () => {
    await setActivity('Playing WordHex', 'Finding words...');
  };

  // Share with friends
  const shareGame = async () => {
    await openShareDialog();
  };

  return (
    <div>
      {isEmbedded && <button onClick={shareGame}>Share Game</button>}
    </div>
  );
}
```

### Automatic Activity Updates

The app automatically updates Discord activity when:
- User starts a game
- User completes a game
- User views leaderboard

---

## Step 5: Features Available in Discord Activities

### Automatically Enabled:

✅ **Rich Presence**: Shows what the user is doing
✅ **Voice Channel Integration**: Works in voice channels
✅ **User Authentication**: Automatic Discord user identification
✅ **Share Moments**: Users can share game results

### Available SDK Methods:

```typescript
// Get Discord SDK instance
const { sdk } = useDiscordSdk();

// Check if embedded
if (sdk.isRunningInDiscord()) {
  // Running in Discord Activity
}

// Update activity
await sdk.setActivity({
  details: 'Playing WordHex',
  state: 'Score: 1500',
  timestamps: { start: Date.now() },
});

// Open share dialog
await sdk.openShareDialog();

// Get guild information
const guild = await sdk.getGuild();
```

---

## Step 6: Publish Your Activity

### Before Publishing:

- [ ] Test activity thoroughly in Discord
- [ ] Verify all features work in embedded mode
- [ ] Add activity assets (icon, screenshots)
- [ ] Write activity description
- [ ] Set age rating and content ratings

### Publishing Steps:

1. Go to Discord Developer Portal → Your App → Activities
2. Click **"Submit for Review"**
3. Fill out required information:
   - **Name**: WordHex
   - **Description**: Word puzzle game for Discord
   - **Category**: Games
   - **Tags**: word-game, puzzle, multiplayer
4. Upload **Screenshots** (at least 3)
5. Upload **Activity Icon** (512x512 PNG)
6. Submit for review

### Review Timeline:

- Review typically takes 1-2 weeks
- Discord will notify you via email
- Make any requested changes
- Once approved, your activity is public!

---

## Troubleshooting

### Activity Not Loading

**Problem**: White screen or error when launching

**Solutions**:
1. Check CORS settings - Discord requires proper CORS headers
2. Verify HTTPS - Discord Activities require HTTPS
3. Check console for errors
4. Verify environment variables are set

### Authentication Failing

**Problem**: Cannot authenticate Discord user

**Solutions**:
1. Check `VITE_DISCORD_CLIENT_ID` is set correctly
2. Verify OAuth2 redirect URIs include your domain
3. Check Discord Developer Portal for any errors
4. Ensure Activity is enabled in Developer Portal

### SDK Not Initializing

**Problem**: `isEmbedded` is always false

**Solutions**:
1. Make sure you're launching from Discord, not a browser
2. Check URL includes Discord frame parameters
3. Verify SDK is imported correctly
4. Check browser console for SDK errors

---

## Best Practices

### 1. Detect Embedded Mode

Always check if running as a Discord Activity:

```typescript
const { isEmbedded } = useDiscordSdk();

if (isEmbedded) {
  // Show Discord-specific features
  // Hide external login options
} else {
  // Show normal web app features
}
```

### 2. Update Activity Status

Keep users informed about what's happening:

```typescript
// Starting game
await setActivity('Starting game', 'Finding words...');

// During game
await setActivity('Playing', `Score: ${score}`);

// After game
await setActivity('Game completed', `Final score: ${score}`);
```

### 3. Encourage Sharing

Make it easy for users to share:

```typescript
// After completing a game
const handleGameComplete = async (score: number) => {
  // Show share button
  if (isEmbedded) {
    await openShareDialog();
  }
};
```

### 4. Handle Permissions

Request only necessary permissions:

```typescript
// Current permissions:
// - identify: Get user info
// - guilds: Get server info
// - guilds.members.read: Get member info

// Don't request additional permissions unless needed
```

---

## Activity Configuration Reference

### Required Files:

- ✅ `src/lib/discordSdk.ts` - SDK manager
- ✅ `src/hooks/useDiscordSdk.ts` - React hook
- ✅ `.env` - Environment configuration

### Required Environment Variables:

```bash
VITE_DISCORD_CLIENT_ID=your-application-id
```

### Required Discord Settings:

- **Activities**: Enabled
- **URL Mapping**: Configured with your domain
- **OAuth2 Scopes**: identify, guilds, guilds.members.read

---

## Additional Resources

- **Discord Activities Docs**: https://discord.com/developers/docs/activities/overview
- **Embedded App SDK**: https://github.com/discord/embedded-app-sdk
- **Discord Developer Portal**: https://discord.com/developers/applications
- **Activities Examples**: https://github.com/discord/embedded-app-sdk/tree/main/examples

---

## Summary

Your WordHex app now supports Discord Activities! Users can:

✅ Launch the game directly from Discord
✅ Play together in voice/text channels
✅ See real-time activity updates
✅ Share game moments with friends
✅ Automatic Discord authentication

**Next Steps**:
1. Set `VITE_DISCORD_CLIENT_ID` in environment variables
2. Enable Activities in Discord Developer Portal
3. Test the activity in Discord
4. Submit for review (optional, for public listing)

---

**Last Updated**: 2025-11-07
**SDK Version**: @discord/embedded-app-sdk latest
