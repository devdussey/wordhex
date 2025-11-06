# WordHex Discord OAuth Setup Guide

## Error
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

This means Discord OAuth is not enabled in your Supabase project yet.

---

## Step 1: Enable Discord Provider in Supabase

1. Go to https://app.supabase.com
2. Select your project: `ztrvimioqaphkbbvzupo`
3. Click **Authentication** in the left sidebar
4. Click **Providers** tab
5. Find **Discord** in the list
6. Click the toggle to **Enable Discord**
7. Keep this page open - you'll need to paste credentials here

---

## Step 2: Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click **New Application**
3. Give it a name: `WordHex` (or similar)
4. Click **Create**

### In the Discord Application Page:

1. Go to **OAuth2** section in the left sidebar
2. Click **General** under OAuth2
3. You'll see your **Client ID** and **Client Secret**
4. Copy both - you'll need them

---

## Step 3: Add Redirect URI to Discord

Still in Discord Developer Portal:

1. Under **OAuth2 → General**, scroll down to **Redirects**
2. Click **Add Redirect**
3. Paste this URL:
   ```
   https://ztrvimioqaphkbbvzupo.supabase.co/auth/v1/callback?provider=discord
   ```
4. Click **Save Changes**

---

## Step 4: Add Credentials to Supabase

Back in Supabase (the page you left open):

1. In the Discord provider settings, you should see fields for:
   - **Client ID**
   - **Client Secret**

2. Paste your Discord credentials:
   - **Client ID**: (from Discord Developer Portal)
   - **Client Secret**: (from Discord Developer Portal)

3. Click **Save**

---

## Step 5: Test the Login

1. Go back to your app: http://localhost:5173
2. Refresh the page (Ctrl+F5)
3. Click **Sign in with Discord**
4. You should be redirected to Discord to authorize
5. After authorizing, you should be logged in!

---

## If It Still Doesn't Work

### Check your redirect URI
- Make sure it exactly matches: `https://ztrvimioqaphkbbvzupo.supabase.co/auth/v1/callback?provider=discord`
- No extra spaces or typos

### Clear browser cache
- Press Ctrl+Shift+Delete
- Clear all cache
- Refresh the page

### Check the app's Login component
- The OAuth button should use the correct provider: `discord`
- Make sure your Supabase credentials in `.env` are correct

---

## Environment Variables Check

Your `.env` file should have:
```
VITE_SUPABASE_URL="https://ztrvimioqaphkbbvzupo.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

These look correct based on your setup.

---

## Need Help?

- **Discord OAuth Docs**: https://discord.com/developers/docs/topics/oauth2
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-discord
- **Discord Developer Portal**: https://discord.com/developers/applications

---

**Status**: Ready for Discord OAuth configuration
**Time to complete**: ~10 minutes
