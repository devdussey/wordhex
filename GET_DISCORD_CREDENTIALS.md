# How to Get Your Discord OAuth Credentials for Supabase

## Quick Answer

You need **2 values** from Discord to configure Supabase:

1. **Discord Client ID**
2. **Discord Client Secret**

---

## Step-by-Step Guide

### Step 1: Go to Discord Developer Portal

Visit: **https://discord.com/developers/applications**

### Step 2: Create or Select Your Application

**If you DON'T have an application yet:**
1. Click the blue **"New Application"** button (top right)
2. Name it "WordHex" (or any name you prefer)
3. Click **"Create"**

**If you ALREADY have an application:**
1. Click on your application from the list

### Step 3: Get Your Client ID

1. You should be on the **"General Information"** page
2. Look for **"APPLICATION ID"** or **"CLIENT ID"**
3. Click the **Copy** button next to it
4. **Save this** - this is your `Discord Client ID`

```
Example: 123456789012345678
```

### Step 4: Get Your Client Secret

1. On the same **"General Information"** page
2. Scroll down to find **"CLIENT SECRET"**
3. Click **"Reset Secret"** (if you haven't generated one)
4. Click **"Yes, do it!"** to confirm
5. Click the **Copy** button to copy the secret
6. **⚠️ IMPORTANT**: Save this immediately - you can't view it again!

```
Example: AbCdEfGh1234567890IjKlMnOpQrStUvWxYz
```

### Step 5: Configure in Supabase

1. Go to: **https://app.supabase.com**
2. Select your WordHex project
3. Navigate to: **Authentication → Providers**
4. Scroll down and find **"Discord"**
5. Toggle it **ON**
6. Paste your values:
   - **Discord Client ID**: (paste the Application ID from Step 3)
   - **Discord Client Secret**: (paste the secret from Step 4)
7. Click **"Save"**

---

## Important Notes

### ⚠️ Security Warning

- **NEVER** commit your Client Secret to Git
- **NEVER** share your Client Secret publicly
- **NEVER** expose it in frontend code
- Store it securely in Supabase only

### 📋 Copy the Callback URL

After enabling Discord in Supabase, you'll see a **Callback URL** like:

```
https://abcdefghijk.supabase.co/auth/v1/callback
```

**Copy this URL** - you'll need it in the next step.

### Step 6: Add Callback URL to Discord

1. Go back to **Discord Developer Portal**
2. Click on your WordHex application
3. Click **"OAuth2"** in the left sidebar
4. Click **"General"**
5. Scroll to **"Redirects"** section
6. Click **"Add Redirect"**
7. Paste the Supabase callback URL from above
8. Also add these for local development:
   ```
   http://localhost:5173/callback
   ```
9. Click **"Save Changes"** (bottom of page)

---

## Quick Reference Card

Copy this and fill in your values:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DISCORD OAUTH CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Discord Application Name: WordHex

CLIENT ID (Application ID):
[Paste your Client ID here]

CLIENT SECRET:
[Paste your Client Secret here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUPABASE CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Supabase Callback URL:
https://YOUR-PROJECT.supabase.co/auth/v1/callback

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DISCORD REDIRECT URLS TO ADD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add these in Discord Developer Portal → OAuth2 → Redirects:

1. https://YOUR-PROJECT.supabase.co/auth/v1/callback
2. http://localhost:5173/callback
3. https://your-vercel-app.vercel.app/callback (after deployment)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Visual Guide

```
Discord Developer Portal
├── Applications
│   └── WordHex (your app)
│       ├── General Information
│       │   ├── APPLICATION ID ← Copy this (Client ID)
│       │   └── CLIENT SECRET ← Reset & copy this
│       └── OAuth2
│           └── General
│               └── Redirects ← Add Supabase callback URL here

Supabase Dashboard
├── Your Project
│   └── Authentication
│       └── Providers
│           └── Discord
│               ├── Enabled: ON
│               ├── Client ID: [paste from Discord]
│               └── Client Secret: [paste from Discord]
```

---

## Testing Your Configuration

After setting up:

1. Run your app locally: `npm run dev`
2. Visit: `http://localhost:5173`
3. Click "Sign in with Discord"
4. Should redirect to Discord authorization
5. After approving, should return to your app
6. You should be logged in!

---

## Troubleshooting

### "Invalid OAuth2 Redirect URI"
- Make sure the redirect URI in Discord EXACTLY matches the Supabase callback URL
- Check for typos and trailing slashes

### "Invalid Client"
- Double-check your Client ID and Client Secret in Supabase
- Try resetting the Client Secret in Discord and updating Supabase

### "Application Not Found"
- Make sure Discord provider is enabled in Supabase
- Verify you saved the configuration

---

## Need Help?

- Discord Developer Docs: https://discord.com/developers/docs/topics/oauth2
- Supabase Auth Docs: https://supabase.com/docs/guides/auth/social-login/auth-discord
- See also: `OAUTH_SETUP_GUIDE.md` for complete setup instructions
