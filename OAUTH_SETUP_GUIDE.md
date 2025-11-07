# Discord OAuth Setup Guide for WordHex

## Quick Overview

To enable Discord login in your WordHex app, you need to:
1. Create a Discord Application
2. Configure Discord OAuth settings
3. Connect Discord to Supabase
4. Configure redirect URLs for development and production

---

## Step 1: Create Discord Application

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Create New Application**
   - Click "New Application" button
   - Name it "WordHex" (or your preferred name)
   - Click "Create"

3. **Note Your Application ID**
   - You'll see the Application ID on the General Information page
   - Keep this tab open

---

## Step 2: Get Discord OAuth Credentials

1. **Navigate to OAuth2 Settings**
   - In your Discord Application, click "OAuth2" in the left sidebar
   - Click "General"

2. **Copy Your Credentials**
   - **CLIENT ID**: Copy this (same as Application ID)
   - **CLIENT SECRET**: Click "Reset Secret" then copy the new secret
   - **⚠️ IMPORTANT**: Save these securely - you'll need them for Supabase

---

## Step 3: Configure Supabase Authentication

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your WordHex project

2. **Enable Discord Provider**
   - Navigate to: **Authentication → Providers**
   - Scroll down to find "Discord"
   - Toggle the switch to **ON**

3. **Enter Discord Credentials**
   - Paste your Discord **CLIENT ID**
   - Paste your Discord **CLIENT SECRET**
   - Click **Save**

4. **Get Your Supabase Callback URL**
   - In the Discord provider settings, you'll see:
     - **Callback URL (for OAuth)**: `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
   - Copy this exact URL - you'll need it for Discord

---

## Step 4: Add Redirect URLs to Discord

1. **Go Back to Discord Developer Portal**
   - OAuth2 → General → Redirects

2. **Add Redirect URLs** (Add ALL of these):

   **For Supabase OAuth (REQUIRED):**
   ```
   https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback
   ```

   **For Local Development:**
   ```
   http://localhost:5173/callback
   ```

   **For Production (Vercel):**
   ```
   https://your-app-name.vercel.app/callback
   ```

3. **Save Changes**
   - Click "Add Redirect" for each URL
   - Click "Save Changes" at the bottom

---

## Step 5: Configure Supabase URL Settings

1. **In Supabase Dashboard**
   - Navigate to: **Authentication → URL Configuration**

2. **Set Site URL**
   - For development: `http://localhost:5173`
   - For production: `https://your-app-name.vercel.app`

3. **Add Redirect URLs** (Add these in the "Redirect URLs" section):
   ```
   http://localhost:5173/**
   https://your-app-name.vercel.app/**
   ```

4. **Click Save**

---

## Step 6: Deploy to Vercel and Update URLs

### Before Deployment:
Your current redirect URLs use localhost. After deploying to Vercel:

1. **Get Your Vercel URL**
   - After deploying, Vercel will give you a URL like: `https://wordhex-xyz123.vercel.app`

2. **Update Discord Redirects**
   - Go to Discord Developer Portal → OAuth2 → Redirects
   - Add: `https://wordhex-xyz123.vercel.app/callback`
   - Save changes

3. **Update Supabase Site URL**
   - Go to Supabase → Authentication → URL Configuration
   - Update Site URL to: `https://wordhex-xyz123.vercel.app`
   - Add to Redirect URLs: `https://wordhex-xyz123.vercel.app/**`
   - Save changes

---

## Verification Checklist

### Discord Developer Portal ✓
- [ ] Discord Application created
- [ ] CLIENT ID copied
- [ ] CLIENT SECRET copied
- [ ] Redirect URL added: `https://<project>.supabase.co/auth/v1/callback`
- [ ] Redirect URL added: `http://localhost:5173/callback`
- [ ] Redirect URL added: `https://<your-vercel-app>.vercel.app/callback`

### Supabase Dashboard ✓
- [ ] Discord provider enabled
- [ ] Discord CLIENT ID configured
- [ ] Discord CLIENT SECRET configured
- [ ] Site URL set correctly
- [ ] Redirect URLs configured

### Environment Variables ✓
- [ ] `.env` file exists with correct Supabase URL
- [ ] `.env` file has correct Supabase anon key
- [ ] Vercel has environment variables set

---

## Testing OAuth Flow

### Local Development:
1. Run `npm run dev`
2. Visit `http://localhost:5173`
3. Click "Sign in with Discord"
4. Should redirect to Discord authorization
5. After authorizing, should redirect to `http://localhost:5173/callback`
6. Should then redirect to dashboard

### Production:
1. Visit your Vercel URL
2. Click "Sign in with Discord"
3. Should redirect to Discord authorization
4. After authorizing, should redirect to your Vercel URL + `/callback`
5. Should then redirect to dashboard

---

## Common Issues and Solutions

### "Invalid OAuth Redirect URI" Error
**Solution**: Make sure the redirect URI in Discord Developer Portal EXACTLY matches what Supabase is sending. Check for:
- Trailing slashes
- HTTP vs HTTPS
- Correct domain

### "OAuth Provider Not Found" Error
**Solution**:
- Verify Discord provider is enabled in Supabase
- Check that CLIENT ID and SECRET are correctly entered
- Try re-saving the Discord provider settings

### "Redirect URL Mismatch" Error
**Solution**:
- In Supabase, go to Authentication → URL Configuration
- Make sure your production URL is in the "Redirect URLs" list
- Add `https://your-app.vercel.app/**` (with wildcard)

### User Redirected to Wrong URL After Login
**Solution**:
- Update "Site URL" in Supabase to match your deployed app URL
- Clear browser cache and cookies
- Try logging in again

---

## Quick Reference: Important URLs

**Discord Developer Portal:**
- https://discord.com/developers/applications

**Supabase Dashboard:**
- https://app.supabase.com

**Your Supabase Project URL:**
- `https://<YOUR_PROJECT_REF>.supabase.co`

**Supabase Auth Callback:**
- `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`

**Local Development:**
- `http://localhost:5173`

**Production (Vercel):**
- `https://<your-app>.vercel.app`

---

## Need Help?

If you're still having issues:
1. Check the browser console for error messages
2. Check Supabase logs: Dashboard → Logs → Auth
3. Verify all URLs match exactly (no typos)
4. Try the Discord webhook test from the production checklist

---

**Last Updated**: 2025-11-07
**Status**: Ready for OAuth Setup
