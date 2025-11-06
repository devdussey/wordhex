# Discord OAuth Setup Checklist

## Current Error
```
GET /auth/v1/authorize?provider=discord 400 (Bad Request)
```

This means Discord provider is not enabled or configured in Supabase.

---

## Step-by-Step Setup

### Step 1: Create Discord Application
- [ ] Go to https://discord.com/developers/applications
- [ ] Click **New Application**
- [ ] Name it: `WordHex`
- [ ] Click **Create**
- [ ] Save your **Client ID** (copy and save it)
- [ ] Click **Reset Secret** and copy the **Client Secret**

### Step 2: Add Local Redirect URI in Discord
- [ ] In Discord Developer Portal, go to **OAuth2** → **URL Generator**
- [ ] Under **Redirects**, add:
  ```
  http://localhost:5173
  ```
- [ ] Click **Save Changes**

### Step 3: Enable Discord in Supabase
- [ ] Go to https://app.supabase.com
- [ ] Select project: `ztrvimioqaphkbbvzupo`
- [ ] Click **Authentication** (left sidebar)
- [ ] Click **Providers** tab
- [ ] Find **Discord** in the provider list
- [ ] Click the **Enable** toggle (should turn green/blue)

### Step 4: Add Discord Credentials to Supabase
- [ ] In the Discord provider settings (still in Supabase):
  - [ ] Paste your Discord **Client ID**
  - [ ] Paste your Discord **Client Secret**
- [ ] Click **Save**

### Step 5: Verify Configuration
- [ ] Go back to your app: http://localhost:5173
- [ ] **Hard refresh**: Ctrl+Shift+Delete (clear cache) then Ctrl+F5
- [ ] Click **Continue with Discord**
- [ ] You should be redirected to Discord to authorize

---

## If Still Getting 400 Error

### Check Supabase Dashboard Again:
1. Go to Authentication → Providers
2. Is Discord **enabled** (toggle ON)?
3. Do you see **Client ID** field filled?
4. Do you see **Client Secret** field filled?

If any are missing, the provider isn't properly configured.

### Check Discord Developer Portal:
1. Does your application have the **Client Secret**?
2. Is `http://localhost:5173` listed in **Redirects**?

### Check Browser Console:
1. Open DevTools (F12)
2. Go to **Console** tab
3. Try clicking the Discord button again
4. Look for detailed error messages

---

## Expected Redirect Flow

```
1. User clicks "Continue with Discord"
2. App redirects to:
   https://ztrvimioqaphkbbvzupo.supabase.co/auth/v1/authorize?provider=discord&redirect_to=http://localhost:5173

3. Supabase checks if Discord is enabled ✓
4. Supabase redirects to Discord login
5. User authorizes Discord app
6. Discord redirects back to:
   https://ztrvimioqaphkbbvzupo.supabase.co/auth/v1/callback?provider=discord&code=...

7. Supabase creates session
8. Supabase redirects back to:
   http://localhost:5173

9. User is logged in!
```

If you're getting 400 at step 3, Discord provider is not properly enabled.

---

## Critical Items to Verify

**In Supabase Dashboard (Authentication → Providers → Discord):**
- [ ] Toggle is **ON** (not OFF)
- [ ] Client ID field is **filled** (not empty)
- [ ] Client Secret field is **filled** (not empty)
- [ ] Click **Save** button (if you made changes)

**In Discord Developer Portal (OAuth2 → General):**
- [ ] Client ID: `XXXXXXXXXXXXXXXXXXXXXXXX` (has value)
- [ ] Client Secret: `XXXXXXXXXXXXXXXXXXXXXXXX` (has value)
- [ ] Redirects includes: `http://localhost:5173`

---

## Need Help?

If you're still stuck:
1. Take a screenshot of your Supabase Authentication → Providers page
2. Tell me what you see in the Discord provider section
3. I can guide you from there

Don't share your actual Client Secret in messages!
