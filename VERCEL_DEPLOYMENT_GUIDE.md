# Vercel Deployment Guide for WordHex

## 🚀 Step-by-Step Deployment Checklist

### Prerequisites Checklist

Before deploying, make sure you have:

- [ ] GitHub repository pushed with latest changes
- [ ] Supabase project created and configured
- [ ] Discord OAuth credentials configured in Supabase
- [ ] Production build tested locally (`npm run build`)

---

## Step 1: Access Vercel Dashboard

1. **Visit Vercel**:
   - Go to: **https://vercel.com/new**
   - Or visit: **https://vercel.com** and click "Add New" → "Project"

2. **Sign In**:
   - Click "Sign In" or "Continue with GitHub"
   - Authorize Vercel to access your GitHub account

---

## Step 2: Import Your Repository

1. **Import Git Repository**:
   - You'll see a list of your GitHub repositories
   - Search for: **`wordhex`** or **`devdussey/wordhex`**
   - Click **"Import"** next to the WordHex repository

2. **If Repository Not Listed**:
   - Click "Adjust GitHub App Permissions"
   - Grant Vercel access to your repositories
   - Return and refresh the page

---

## Step 3: Configure Project Settings

Vercel should auto-detect your settings, but verify these:

### Framework Settings:
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Root Directory:
```
Root Directory: ./
```

**✓ Don't change these unless you know what you're doing**

---

## Step 4: Add Environment Variables

This is the most important step! Click **"Environment Variables"** section.

### Required Variables:

Add these **3 environment variables**:

#### 1. VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Value: https://YOUR_PROJECT_REF.supabase.co
```
- Get this from: Supabase Dashboard → Project Settings → API → Project URL

#### 2. VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Value: your-supabase-anon-key-here
```
- Get this from: Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`
- **Note**: This is the PUBLIC anon key, not the service role key!

#### 3. VITE_DISCORD_WEBHOOK_URL (Optional)
```
Name: VITE_DISCORD_WEBHOOK_URL
Value: https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```
- Optional: Only if you want error logging to Discord
- Get this from: Discord Server → Settings → Integrations → Webhooks

### Environment Settings:

For each variable, select which environments:
- ✓ Production
- ✓ Preview
- ✓ Development

**Click "Add" for each variable**

---

## Step 5: Deploy!

1. **Review Settings**:
   - Double-check all environment variables are added
   - Verify build settings are correct

2. **Click "Deploy"**:
   - Click the big blue **"Deploy"** button
   - Vercel will start building your project

3. **Wait for Build**:
   - This takes 2-5 minutes
   - You'll see real-time build logs
   - Watch for any errors

---

## Step 6: Get Your Deployment URL

After successful deployment:

1. **Copy Your URL**:
   - Vercel will show your deployment URL
   - It looks like: `https://wordhex-abc123.vercel.app`
   - Or custom domain if configured

2. **Visit Your Site**:
   - Click "Visit" or open the URL
   - Your WordHex app should load!

---

## Step 7: Update OAuth Redirect URLs

**IMPORTANT**: Now that you have a production URL, update your OAuth settings:

### A. Update Discord Developer Portal

1. Go to: https://discord.com/developers/applications
2. Select your WordHex application
3. Go to: **OAuth2 → General → Redirects**
4. Add this new redirect URL:
   ```
   https://your-vercel-app.vercel.app/callback
   ```
   (Replace with your actual Vercel URL)
5. Click **"Save Changes"**

### B. Update Supabase Site URL

1. Go to: https://app.supabase.com
2. Select your project
3. Go to: **Authentication → URL Configuration**
4. Update **Site URL** to:
   ```
   https://your-vercel-app.vercel.app
   ```
5. Add to **Redirect URLs**:
   ```
   https://your-vercel-app.vercel.app/**
   ```
6. Click **"Save"**

---

## Step 8: Test Your Deployment

### Test Checklist:

- [ ] Visit your Vercel URL
- [ ] App loads without errors (check browser console)
- [ ] Click "Sign in with Discord"
- [ ] Discord OAuth flow works
- [ ] Redirects back to your app after auth
- [ ] Dashboard shows your user info
- [ ] Navigation works (Game, Leaderboard)
- [ ] No console errors

### Common First-Time Issues:

**Issue**: White screen or blank page
- **Solution**: Check browser console for errors
- **Fix**: Verify environment variables are set correctly

**Issue**: "Invalid OAuth Redirect URI"
- **Solution**: Discord redirect URLs don't match
- **Fix**: Make sure you added the exact Vercel URL to Discord

**Issue**: "Supabase connection error"
- **Solution**: Environment variables not set
- **Fix**: Go to Vercel → Project Settings → Environment Variables

---

## Step 9: Configure Custom Domain (Optional)

Want a custom domain instead of `.vercel.app`?

1. **In Vercel Dashboard**:
   - Go to your project → Settings → Domains
   - Click "Add Domain"
   - Enter your domain (e.g., `wordhex.com`)
   - Follow DNS configuration instructions

2. **Update OAuth URLs Again**:
   - Add new domain to Discord redirects
   - Update Supabase Site URL to custom domain

---

## Troubleshooting Guide

### Build Failed

**Check build logs for errors:**

1. Common issues:
   - Missing dependencies: Run `npm install` locally first
   - TypeScript errors: Run `npm run build` locally
   - Environment variables: Make sure all required vars are set

2. **Fix locally first**:
   ```bash
   npm install
   npm run build
   git add .
   git commit -m "Fix build issues"
   git push
   ```

3. **Redeploy**:
   - Vercel auto-deploys on git push
   - Or click "Redeploy" in Vercel dashboard

### Deployment Succeeded but App Doesn't Work

1. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

2. **Verify Environment Variables**:
   - Vercel Dashboard → Project Settings → Environment Variables
   - Make sure all variables are set for "Production"
   - Redeploy after changing variables

3. **Check Supabase Logs**:
   - Supabase Dashboard → Logs → Auth
   - Look for failed authentication attempts

### OAuth Not Working

1. **Verify Redirect URLs Match**:
   - Discord: Must include `https://your-app.vercel.app/callback`
   - Supabase Site URL: Must be `https://your-app.vercel.app`

2. **Test in Incognito Mode**:
   - Clear cookies/cache
   - Try authentication again

---

## Quick Reference: Important URLs

**Vercel Dashboard**:
- https://vercel.com/dashboard

**Your Deployment**:
- https://your-app-name.vercel.app (after deployment)

**Supabase Dashboard**:
- https://app.supabase.com

**Discord Developer Portal**:
- https://discord.com/developers/applications

---

## Environment Variables Quick Copy

```bash
# Copy these to Vercel Environment Variables section

VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK
```

---

## Post-Deployment Checklist

After deploying:

- [ ] Deployment successful (green checkmark)
- [ ] App accessible at Vercel URL
- [ ] Environment variables set correctly
- [ ] Discord OAuth redirect updated
- [ ] Supabase Site URL updated
- [ ] Authentication flow tested
- [ ] Game functionality works
- [ ] Leaderboard loads
- [ ] No console errors
- [ ] Monitored Discord webhook for errors (if configured)

---

## Continuous Deployment

Good news! Vercel automatically redeploys when you push to GitHub:

1. **Make changes locally**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. **Vercel auto-deploys** - check dashboard for status

---

## Performance Optimization (Optional)

After deployment, consider:

- **Analytics**: Add Vercel Analytics in project settings
- **Speed Insights**: Enable Vercel Speed Insights
- **Custom Domain**: Add your own domain
- **Edge Functions**: Optimize with Edge Runtime

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Supabase with Vercel**: https://supabase.com/docs/guides/hosting/vercel

---

## Summary

Your deployment workflow:

1. ✅ Push code to GitHub
2. ✅ Import to Vercel
3. ✅ Add environment variables
4. ✅ Deploy
5. ✅ Update OAuth URLs
6. ✅ Test

**Estimated Time**: 10-15 minutes

---

**Last Updated**: 2025-11-07
**Ready to Deploy**: ✓ Yes
