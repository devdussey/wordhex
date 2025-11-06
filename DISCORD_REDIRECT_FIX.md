# Discord OAuth Redirect Loop Fix

## Error
```
ERR_TOO_MANY_REDIRECTS on ztrvimioqaphkbbvzupo.supabase.co
```

This happens when Discord OAuth is misconfigured.

---

## Critical Fix: Update Discord Redirect URIs

**In Discord Developer Portal** (https://discord.com/developers/applications):

1. Select your **WordHex** application
2. Go to **OAuth2** → **URL Generator**
3. Under **Redirects**, you need **TWO** URLs:

   - `http://localhost:5174`
   - `https://ztrvimioqaphkbbvzupo.supabase.co/auth/v1/callback?provider=discord`

4. Make sure both are added
5. Click **Save Changes**

---

## Why Both URLs?

- **`http://localhost:5174`** - Where your local app redirects to after Discord login
- **`https://ztrvimioqaphkbbvzupo.supabase.co/auth/v1/callback?provider=discord`** - Where Discord redirects after user authorizes

Both need to be registered in Discord!

---

## Steps to Fix:

1. Go to https://discord.com/developers/applications
2. Click your **WordHex** app
3. Click **OAuth2** → **General**
4. Scroll to **Redirects**
5. Add BOTH URLs:
   - `http://localhost:5174`
   - `https://ztrvimioqaphkbbvzupo.supabase.co/auth/v1/callback?provider=discord`
6. **Save Changes**
7. Clear browser cookies (Ctrl+Shift+Delete)
8. Try logging in again at http://localhost:5174

---

## If Still Not Working:

Check these in Supabase (https://app.supabase.com → Authentication → Providers → Discord):

- [ ] Discord is **Enabled** (toggle ON)
- [ ] **Client ID** is filled (from Discord Developer Portal)
- [ ] **Client Secret** is filled (from Discord Developer Portal)
- [ ] You clicked **Save**

If all are correct, the issue is likely missing the Supabase callback URL in Discord's redirect URIs.
